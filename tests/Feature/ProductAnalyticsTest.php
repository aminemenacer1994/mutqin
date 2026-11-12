<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Analytics\ProductEventRecorder;
use App\Services\Analytics\SessionProductEvents;
use App\Support\Analytics\ProductEventName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Tests\TestCase;

class ProductAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Carbon::setTestNow('2026-11-12 12:00:00');
        config()->set('mutqin.admin_emails', ['admin@example.com']);
        config()->set('mutqin.teacher_features_enabled', false);
    }

    protected function tearDown(): void
    {
        Carbon::setTestNow();
        parent::tearDown();
    }

    public function test_browser_cannot_record_server_only_completion_events(): void
    {
        $this->postJson('/api/product-events', [
            'event' => ProductEventName::SIGNUP_COMPLETED,
            'idempotency_key' => 'forged',
        ])->assertStatus(422);

        $this->assertDatabaseCount('product_events', 0);
    }

    public function test_browser_event_drops_private_fields_and_is_idempotent(): void
    {
        $payload = [
            'event' => ProductEventName::LANDING_PAGE_VIEWED,
            'anonymous_id' => '11111111-1111-4111-8111-111111111111',
            'idempotency_key' => 'landing:test',
            'utm_source' => 'newsletter',
            'utm_medium' => 'email',
            'utm_campaign' => 'launch',
            'properties' => [
                'session_type' => 'new',
                'transcript' => 'بسم الله',
                'email' => 'learner@example.com',
                'surah_id' => 1,
            ],
        ];

        $this->postJson('/api/product-events', $payload)->assertCreated();
        $this->postJson('/api/product-events', $payload)->assertOk();

        $event = ProductEvent::query()->firstOrFail();
        $this->assertSame('newsletter', $event->utm_source);
        $this->assertEqualsCanonicalizing(['session_type' => 'new', 'surah_id' => 1], $event->properties);
        $this->assertDatabaseCount('product_events', 1);
    }

    public function test_browser_may_record_daily_mutqin_events(): void
    {
        $this->assertContains(ProductEventName::DAILY_MUTQIN_STARTED, ProductEventName::clientEvents());
        $this->assertContains(ProductEventName::DAILY_MUTQIN_STEP_VIEWED, ProductEventName::clientEvents());
        $this->assertContains(ProductEventName::DAILY_MUTQIN_COMPLETED, ProductEventName::clientEvents());

        $payload = [
            'event' => ProductEventName::DAILY_MUTQIN_STEP_VIEWED,
            'anonymous_id' => '66666666-6666-4666-8666-666666666666',
            'idempotency_key' => 'daily-mutqin-step:hide',
            'properties' => [
                'feature_id' => 'hide',
                'transcript' => 'secret ayah',
            ],
        ];

        $this->postJson('/api/product-events', $payload)->assertCreated();
        $this->postJson('/api/product-events', [
            'event' => ProductEventName::DAILY_MUTQIN_STARTED,
            'anonymous_id' => '66666666-6666-4666-8666-666666666666',
            'idempotency_key' => 'daily-mutqin-start',
            'properties' => ['feature_id' => 'daily-mutqin'],
        ])->assertCreated();
        $this->postJson('/api/product-events', [
            'event' => ProductEventName::DAILY_MUTQIN_COMPLETED,
            'anonymous_id' => '66666666-6666-4666-8666-666666666666',
            'idempotency_key' => 'daily-mutqin-complete:1',
            'properties' => ['feature_id' => 'daily-mutqin'],
        ])->assertCreated();

        $step = ProductEvent::query()
            ->where('event_name', ProductEventName::DAILY_MUTQIN_STEP_VIEWED)
            ->firstOrFail();
        $this->assertEqualsCanonicalizing(['feature_id' => 'hide'], $step->properties);
    }

    public function test_browser_may_record_onboarding_step_events(): void
    {
        $payload = [
            'event' => ProductEventName::ONBOARDING_STEP_VIEWED,
            'anonymous_id' => '22222222-2222-4222-8222-222222222222',
            'idempotency_key' => 'onboarding-step-view:goal',
            'properties' => [
                'feature_id' => 'goal',
                'transcript' => 'secret ayah',
                'stage' => 'discarded',
            ],
        ];

        $this->postJson('/api/product-events', $payload)->assertCreated();

        $event = ProductEvent::query()->where('event_name', ProductEventName::ONBOARDING_STEP_VIEWED)->firstOrFail();
        $this->assertEqualsCanonicalizing([
            'feature_id' => 'goal',
            'stage' => 'discarded',
        ], $event->properties);

        $this->postJson('/api/product-events', [
            'event' => ProductEventName::ONBOARDING_ABANDONED,
            'anonymous_id' => '22222222-2222-4222-8222-222222222222',
            'idempotency_key' => 'onboarding-abandon:goal',
            'properties' => [
                'feature_id' => 'goal',
                'stage' => 'abandoned',
            ],
        ])->assertCreated();

        $this->assertDatabaseCount('product_events', 2);
    }

    public function test_registration_stores_attribution_and_links_the_anonymous_visit(): void
    {
        ProductEvent::query()->create([
            'event_name' => ProductEventName::LANDING_PAGE_VIEWED,
            'anonymous_id' => '22222222-2222-4222-8222-222222222222',
            'idempotency_key' => 'landing:anon',
            'occurred_at' => now()->subHour(),
        ]);

        $this->post('/register', [
            'name' => 'New Learner',
            'email' => 'new-learner@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'utm_source' => 'newsletter',
            'utm_medium' => 'email',
            'utm_campaign' => 'launch',
            'ref' => 'halaqa',
            'analytics_anonymous_id' => '22222222-2222-4222-8222-222222222222',
        ])->assertRedirect();

        $user = User::query()->where('email', 'new-learner@example.com')->firstOrFail();
        $this->assertSame('newsletter', $user->signup_utm_source);
        $this->assertSame('email', $user->signup_utm_medium);
        $this->assertSame('launch', $user->signup_utm_campaign);
        $this->assertSame('halaqa', $user->signup_referral_code);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::SIGNUP_COMPLETED,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::REFERRAL_SIGNUP_COMPLETED,
            'user_id' => $user->id,
        ]);
        $this->assertSame(
            $user->id,
            ProductEvent::query()->where('idempotency_key', 'landing:anon')->value('user_id')
        );
    }

    public function test_session_events_record_completion_revision_and_return_once(): void
    {
        $user = User::factory()->create();
        $first = UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'memorisation_mode' => 'revision',
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'started_at' => now()->subDay(),
            'last_activity_at' => now()->subDay(),
            'metadata' => ['blurModeEnabled' => true],
        ]);

        $events = app(SessionProductEvents::class);
        $events->started($user, $first);
        $events->started($user, $first);

        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::SESSION_STARTED,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::REVISION_STARTED,
        ]);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::PROGRESSIVE_HIDING_USED,
        ]);
        $this->assertSame(1, ProductEvent::query()->where('event_name', ProductEventName::SESSION_STARTED)->count());

        $second = UserSession::query()->create([
            'user_id' => $user->id,
            'surah_number' => 2,
            'status' => UserSessionStatus::Active,
            'is_onboarding_example' => false,
            'started_at' => now(),
            'last_activity_at' => now(),
        ]);
        $events->started($user, $second);
        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::USER_RETURNED,
            'user_id' => $user->id,
        ]);

        $second->forceFill([
            'status' => UserSessionStatus::EndedEarly,
            'ended_at' => now(),
            'session_duration_seconds' => 40,
        ])->save();
        $events->ended($user, $second->fresh());

        $this->assertDatabaseHas('product_events', [
            'event_name' => ProductEventName::SESSION_ABANDONED,
            'user_id' => $user->id,
        ]);
        $this->assertDatabaseMissing('product_events', [
            'event_name' => ProductEventName::SESSION_COMPLETED,
            'idempotency_key' => 'session:'.$second->id.':completed',
        ]);
    }

    public function test_recorder_rejects_recitation_text(): void
    {
        $user = User::factory()->create();
        $event = app(ProductEventRecorder::class)->record(
            ProductEventName::AI_RECITE_COMPLETED,
            $user,
            null,
            'assessment:9:ai-recite',
            [
                'assessment_id' => 9,
                'surah_id' => 1,
                'transcript' => 'private recitation',
                'email' => 'learner@example.com',
            ],
        );

        $this->assertEqualsCanonicalizing([
            'assessment_id' => 9,
            'surah_id' => 1,
        ], $event?->properties);
    }

    public function test_growth_dashboard_is_admin_only_and_uses_cohort_math(): void
    {
        $this->getJson('/api/admin/growth')->assertUnauthorized();

        $learner = User::factory()->create([
            'email' => 'learner@example.com',
            'created_at' => '2026-01-02 00:00:00',
        ]);
        $this->actingAs($learner)->getJson('/api/admin/growth')->assertForbidden();
        $this->actingAs($learner)->get('/admin/growth')->assertForbidden();

        $activated = User::factory()->create([
            'created_at' => '2026-11-01 09:00:00',
            'signup_utm_source' => 'newsletter',
            'signup_referral_code' => 'halaqa',
        ]);
        UserSession::query()->create([
            'user_id' => $activated->id,
            'surah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'started_at' => '2026-11-02 09:00:00',
            'ended_at' => '2026-11-02 09:20:00',
            'last_activity_at' => '2026-11-02 09:20:00',
        ]);
        User::factory()->create([
            'created_at' => '2026-11-11 09:00:00',
            'signup_utm_source' => null,
        ]);

        ProductEvent::query()->create([
            'event_name' => ProductEventName::SIGNUP_STARTED,
            'anonymous_id' => '33333333-3333-4333-8333-333333333333',
            'idempotency_key' => 'signup:anon',
            'occurred_at' => '2026-11-10 10:00:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::PROGRESSIVE_HIDING_USED,
            'user_id' => $activated->id,
            'idempotency_key' => 'blur:1',
            'occurred_at' => '2026-11-02 09:05:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::REFERRAL_LINK_OPENED,
            'anonymous_id' => '44444444-4444-4444-8444-444444444444',
            'idempotency_key' => 'ref:1',
            'occurred_at' => '2026-11-01 08:00:00',
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::REFERRAL_LINK_OPENED,
            'anonymous_id' => '55555555-5555-4555-8555-555555555555',
            'idempotency_key' => 'ref:2',
            'occurred_at' => '2026-11-03 08:00:00',
        ]);

        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'created_at' => '2026-01-01 00:00:00',
        ]);

        $response = $this->actingAs($admin)->getJson('/api/admin/growth?from=2026-11-01&to=2026-11-12');
        $response->assertOk();
        $response->assertJsonPath('overview.0.value', 4);
        $response->assertJsonPath('overview.0.key', 'total_registered_users');
        $response->assertJsonPath('overview.1.value', 2);
        $response->assertJsonPath('overview.1.key', 'new_registrations');
        $response->assertJsonPath('overview.2.value', 1);
        $response->assertJsonPath('funnel.stages.1.users', 1);
        $response->assertJsonPath('funnel.stages.2.users', 1);
        $response->assertJsonPath('funnel.stages.2.conversion', 1);
        $response->assertJsonPath('retention.cards.day_1.retained', 1);
        $response->assertJsonPath('retention.cards.day_1.eligible', 2);
        $response->assertJsonPath('retention.cards.day_1.status', 'ready');
        $response->assertJsonPath('retention.cards.day_30.eligible', 0);
        $response->assertJsonPath('retention.cards.day_30.rate', null);
        $response->assertJsonPath('retention.cards.day_30.status', 'immature');
        $response->assertJsonPath('engagement.features.0.key', 'progressive_hiding');
        $response->assertJsonPath('engagement.features.0.uses', 1);
        $response->assertJsonPath('engagement.features.0.users', 1);
        $response->assertJsonPath('engagement.features.4.key', 'saved_sessions');
        $response->assertJsonPath('engagement.features.4.collected', false);
        $response->assertJsonPath('engagement.features.4.uses', null);
        $response->assertJsonPath('acquisition.referral.link_opens', 2);
        $response->assertJsonPath('acquisition.referral.signups', 1);
        $response->assertJsonPath('acquisition.referral.rate', 0.5);
        $response->assertJsonFragment(['key' => 'unattributed', 'count' => 1]);
        $response->assertJsonFragment(['key' => 'referrals', 'count' => 1]);
        $response->assertJsonPath('consistency.posthog.status', 'unconfigured');
        $response->assertJsonPath('consistency.posthog.registration_events', null);
        $this->assertStringNotContainsString('phx_', $response->getContent());
        $this->assertStringNotContainsString('learner@example.com', $response->getContent());

        $this->actingAs($admin)->get('/admin/growth')
            ->assertOk()
            ->assertSee('admin-growth', false);
    }
}
