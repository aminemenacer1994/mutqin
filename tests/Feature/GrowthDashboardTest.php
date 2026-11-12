<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\User;
use App\Models\UserSession;
use App\Support\Analytics\ProductEventName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class GrowthDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-12 12:00:00');
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        config()->set('services.posthog.personal_api_key', '');
        config()->set('services.posthog.project_id', '347076');
        Http::preventStrayRequests();
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_totals_ignore_deleted_accounts_and_keep_period_registrations_separate(): void
    {
        $admin = $this->admin();
        User::factory()->create(['created_at' => '2026-11-05 10:00:00']);
        $deleted = User::factory()->create(['created_at' => '2026-11-05 11:00:00']);
        $deleted->delete();

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');

        $response->assertOk();
        $response->assertJsonPath('consistency.database_total_users', 2);
        $response->assertJsonPath('consistency.database_period_registrations', 1);
        $response->assertJsonPath('overview.0.comparison', null);
    }

    public function test_london_day_boundary_decides_the_registration_period(): void
    {
        Carbon::setTestNow('2026-07-15 12:00:00');
        $admin = $this->admin();
        User::factory()->create(['created_at' => '2026-06-30 23:30:00']);
        User::factory()->create(['created_at' => '2026-07-01 23:30:00']);

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-07-01&to=2026-07-01');

        $response->assertOk();
        $response->assertJsonPath('consistency.database_period_registrations', 1);
        $response->assertJsonPath('consistency.database_total_users', 3);
        $response->assertJsonPath('timezone', 'Europe/London');
    }

    public function test_completion_counts_unique_learners_separately_from_sessions(): void
    {
        $admin = $this->admin();
        $learner = User::factory()->create(['created_at' => '2026-11-03 09:00:00']);
        $this->practiceSession($learner, UserSessionStatus::Completed, '2026-11-04 09:00:00');
        $this->practiceSession($learner, UserSessionStatus::Abandoned, '2026-11-05 09:00:00');
        ProductEvent::query()->create([
            'event_name' => ProductEventName::PROGRESSIVE_HIDING_USED,
            'user_id' => $learner->id,
            'idempotency_key' => 'blur:1',
            'occurred_at' => '2026-11-04 09:05:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::PROGRESSIVE_HIDING_USED,
            'user_id' => $learner->id,
            'idempotency_key' => 'blur:2',
            'occurred_at' => '2026-11-05 09:05:00',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');

        $response->assertOk();
        $response->assertJsonPath('overview.4.value', 0.5);
        $response->assertJsonPath('overview.4.display', '50%');
        $response->assertJsonPath('overview.3.value', 1);
        $response->assertJsonPath('engagement.features.0.users', 1);
        $response->assertJsonPath('engagement.features.0.uses', 2);
        $response->assertJsonPath('engagement.practice.points.3.started', 1);
    }

    public function test_signup_event_gaps_are_reported_without_backfill(): void
    {
        $admin = $this->admin();
        $learner = User::factory()->create(['created_at' => '2026-11-04 09:00:00']);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::SIGNUP_COMPLETED,
            'user_id' => $learner->id,
            'idempotency_key' => 'user:'.$learner->id.':signup',
            'occurred_at' => '2026-11-04 09:00:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::SIGNUP_COMPLETED,
            'user_id' => $learner->id,
            'idempotency_key' => 'user:'.$learner->id.':signup-again',
            'occurred_at' => '2026-11-04 09:01:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::SIGNUP_COMPLETED,
            'user_id' => null,
            'anonymous_id' => '66666666-6666-4666-8666-666666666666',
            'idempotency_key' => 'anon:signup',
            'occurred_at' => '2026-11-04 10:00:00',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');

        $response->assertOk();
        $response->assertJsonPath('consistency.duplicate_signup_events', 1);
        $response->assertJsonPath('consistency.signup_events_missing_user', 1);
        $response->assertJsonPath('consistency.accounts_before_first_signup_event', 1);
        $notes = implode(' ', $response->json('consistency.notes'));
        $this->assertStringContainsString('duplicate signup events', $notes);
        $this->assertStringContainsString('were not backfilled', $notes);
    }

    public function test_posthog_query_is_server_side_and_a_failure_keeps_database_counts(): void
    {
        config()->set('services.posthog.personal_api_key', 'phx_test_personal_key_123456');
        Http::fake([
            'https://eu.posthog.com/*' => Http::sequence()
                ->push(['detail' => 'nope'], 503)
                ->push([
                    'columns' => ['events', 'people', 'production_events', 'non_production_events'],
                    'results' => [[4, 3, 4, 0]],
                ], 200),
        ]);
        $admin = $this->admin();
        User::factory()->create(['created_at' => '2026-11-06 09:00:00']);

        $failed = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');

        $failed->assertOk();
        $failed->assertJsonPath('consistency.database_period_registrations', 1);
        $failed->assertJsonPath('consistency.posthog.status', 'error');
        $failed->assertJsonPath('consistency.posthog.registration_events', null);
        $failed->assertJsonPath('freshness.status', 'partial');
        $this->assertStringNotContainsString('phx_test_personal_key_123456', $failed->getContent());

        $live = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12&refresh=1');
        $live->assertOk();
        $live->assertJsonPath('consistency.posthog.status', 'ok');
        $live->assertJsonPath('consistency.posthog.registration_events', 4);
        $live->assertJsonPath('consistency.posthog.registration_people', 3);
        $live->assertJsonPath('consistency.database_period_registrations', 1);
        $live->assertJsonPath('freshness.cached', false);
        Http::assertSent(function ($request) {
            $query = (string) data_get($request->data(), 'query.query');

            return str_contains($request->url(), '/api/projects/347076/query')
                && $request->hasHeader('Authorization', 'Bearer phx_test_personal_key_123456')
                && str_contains($query, "event = 'registration_completed'")
                && ! str_contains($query, 'phx_test_personal_key_123456');
        });

        Http::assertSentCount(2);

        $cached = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');
        $cached->assertOk();
        $cached->assertJsonPath('freshness.cached', true);
        $cached->assertJsonPath('consistency.posthog.registration_events', 4);
        Http::assertSentCount(2);
    }

    public function test_project_token_is_not_used_as_a_read_credential(): void
    {
        config()->set('services.posthog.personal_api_key', 'phc_testtoken12345678');
        Http::fake();
        $admin = $this->admin();

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');

        $response->assertOk();
        $response->assertJsonPath('consistency.posthog.status', 'misconfigured');
        $response->assertJsonPath('consistency.posthog.registration_events', null);
        Http::assertNothingSent();
        $this->assertStringNotContainsString('phc_testtoken12345678', $response->getContent());
    }

    public function test_personal_api_key_never_reaches_the_admin_page(): void
    {
        config()->set('services.posthog.personal_api_key', 'phx_page_secret_should_not_leak');
        $admin = $this->admin();

        $this->actingAs($admin)->get('/admin/growth')
            ->assertOk()
            ->assertDontSee('phx_page_secret_should_not_leak', false)
            ->assertDontSee('POSTHOG_PERSONAL_API_KEY', false);
    }

    public function test_invalid_ranges_are_rejected(): void
    {
        $admin = $this->admin();

        $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-12&to=2026-11-01')->assertStatus(422);
        $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-13')->assertStatus(422);
        $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-01-01&to=2026-11-12')->assertStatus(422);
    }

    private function admin(): User
    {
        return User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'created_at' => '2026-01-01 00:00:00',
        ]);
    }

    private function practiceSession(User $user, UserSessionStatus $status, string $startedAt): void
    {
        UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'status' => $status,
            'is_onboarding_example' => false,
            'started_at' => $startedAt,
            'ended_at' => $startedAt,
            'last_activity_at' => $startedAt,
        ]);
    }
}
