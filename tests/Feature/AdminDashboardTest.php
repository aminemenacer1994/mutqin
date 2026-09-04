<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\AiReciteAttempt;
use App\Models\AyahNote;
use App\Models\ContactSubmission;
use App\Models\LearningAnalytic;
use App\Models\MemorisationProgress;
use App\Models\User;
use App\Models\UserLastPosition;
use App\Models\UserSession;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AdminDashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.admin_emails', ['admin@example.com']);
    }

    public function test_guests_are_redirected_from_admin_dashboard(): void
    {
        $this->get(route('admin.dashboard'))
            ->assertRedirect(route('login'));
    }

    public function test_non_admin_cannot_view_admin_dashboard(): void
    {
        $user = User::factory()->create(['email' => 'learner@example.com']);

        $this->actingAs($user)
            ->get(route('admin.dashboard'))
            ->assertForbidden();
    }

    public function test_admin_can_view_admin_dashboard_page(): void
    {
        $admin = User::factory()->admin()->create([
            'name' => 'Admin User',
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertSee('admin-dashboard', false)
            ->assertSee('Assalamu alaikum, Admin', false);
    }

    public function test_admin_api_requires_admin_privileges(): void
    {
        $this->getJson('/api/admin/dashboard')->assertUnauthorized();

        $learner = User::factory()->create(['email' => 'learner@example.com']);
        $this->actingAs($learner)
            ->getJson('/api/admin/dashboard')
            ->assertForbidden();
    }

    public function test_admin_dashboard_api_returns_aggregates_and_respects_chart_days(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);
        $learner = User::factory()->create([
            'email' => 'learner@example.com',
            'locale' => 'ar',
            'google_id' => 'google-1',
            'subscription_status' => 'active',
        ]);

        ContactSubmission::create([
            'name' => 'Amina',
            'email' => 'amina@example.com',
            'subject' => 'Help with session',
            'message' => 'I cannot resume.',
            'status' => 'pending',
        ]);

        $at = now()->subDays(2)->setTime(10, 0);
        UserSession::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => $at,
            'last_activity_at' => $at,
            'metadata' => ['completed' => true],
        ]);

        LearningAnalytic::create([
            'user_id' => $learner->id,
            'session_date' => $at->toDateString(),
            'sessions_completed' => 1,
            'total_minutes' => 10,
            'ayahs_memorised' => 3,
            'ayahs_reviewed' => 0,
            'streak_day' => 1,
        ]);

        AiReciteAttempt::create([
            'user_id' => $learner->id,
            'attempt_number' => 1,
            'accuracy_percent' => 88,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 4],
        ]);

        AyahNote::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'body' => 'Admin note check',
        ]);

        MemorisationProgress::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 80,
            'repetitions' => 3,
            'completed_at' => now()->subDay(),
        ]);

        UserLastPosition::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'last_opened_at' => now()->subHour(),
        ]);

        $seven = $this->actingAs($admin)
            ->getJson('/api/admin/dashboard?days=7')
            ->assertOk()
            ->assertJsonPath('data.meta.role', 'super_admin')
            ->assertJsonPath('data.chart.days', 7)
            ->assertJsonPath('data.snapshot.pending_contacts.value', 1)
            ->assertJsonPath('data.snapshot.memorised_ayahs.value', 1)
            ->assertJsonPath('data.learning.memorised_ayahs', 1)
            ->assertJsonPath('data.ai_health.total', 1)
            ->assertJsonPath('data.ai_health.complaints', 0)
            ->assertJsonPath('data.ai_health.valid_scored_checks', 1)
            ->assertJsonPath('data.ai_health.complaint_rate_percent', 0)
            ->assertJsonPath('data.contacts.items.0.subject', 'Help with session');

        $this->assertGreaterThanOrEqual(2, $seven->json('data.snapshot.users_total.value'));
        $this->assertSame(1, $seven->json('data.snapshot.active_users.value'));
        $this->assertArrayHasKey('trend_percent', $seven->json('data.snapshot.users_total'));
        $this->assertArrayHasKey('feedback_open', $seven->json('data.snapshot'));
        $this->assertSame(0, $seven->json('data.snapshot.feedback_open.value'));
        $this->assertSame(1, $seven->json('data.snapshot.ai_recite_attempts.value'));
        $this->assertNotEmpty($seven->json('data.chart.points'));
        $this->assertCount(7, $seven->json('data.chart.points'));
        $this->assertSame(1, $seven->json('data.chart.totals.sessions'));
        $this->assertSame(1, $seven->json('data.chart.totals.ai_checks'));
        $this->assertLessThanOrEqual(5, count($seven->json('data.activity')));
        $this->assertNotEmpty($seven->json('data.learners'));
        $this->assertNotEmpty($seven->json('data.top_learners'));
        $this->assertSame('learner@example.com', collect($seven->json('data.learners'))->firstWhere('email', 'learner@example.com')['email'] ?? null);

        $this->actingAs($admin)
            ->getJson('/api/admin/dashboard?days=30')
            ->assertOk()
            ->assertJsonPath('data.chart.days', 30)
            ->assertJsonPath('data.chart.totals.sessions', 1);
    }

    public function test_admin_can_list_users_and_resolve_contact_via_api(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);
        User::factory()->create(['name' => 'Zayd', 'email' => 'zayd@example.com']);

        $contact = ContactSubmission::create([
            'name' => 'Omar',
            'email' => 'omar@example.com',
            'subject' => 'Billing',
            'message' => 'Question',
            'status' => 'pending',
        ]);

        $this->actingAs($admin)
            ->getJson('/api/admin/users?q=zayd')
            ->assertOk()
            ->assertJsonPath('users.0.email', 'zayd@example.com')
            ->assertJsonPath('total', 1);

        $this->actingAs($admin)
            ->patchJson("/api/admin/contacts/{$contact->id}/resolve")
            ->assertOk()
            ->assertJsonPath('contact.status', 'resolved');

        $this->assertDatabaseHas('contact_submissions', [
            'id' => $contact->id,
            'status' => 'resolved',
        ]);
    }

    public function test_admin_can_filter_sort_and_bulk_update_users(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);
        $active = User::factory()->create([
            'email' => 'active@example.com',
            'subscription_status' => 'active',
        ]);
        $trial = User::factory()->create([
            'email' => 'trial@example.com',
            'subscription_status' => 'trialing',
        ]);
        $idle = User::factory()->create([
            'email' => 'idle@example.com',
            'subscription_status' => 'none',
        ]);

        UserSession::create([
            'user_id' => $active->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subDay(),
            'last_activity_at' => now()->subDay(),
            'metadata' => [],
        ]);

        MemorisationProgress::create([
            'user_id' => $active->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 80,
            'repetitions' => 2,
            'completed_at' => now()->subDay(),
        ]);

        AiReciteAttempt::create([
            'user_id' => $active->id,
            'attempt_number' => 1,
            'accuracy_percent' => 84,
            'band' => 'strong',
            'ayah_range' => ['surah' => 1, 'from' => 1, 'to' => 1],
            'created_at' => now()->subHours(2),
            'updated_at' => now()->subHours(2),
        ]);

        $filtered = $this->actingAs($admin)
            ->getJson('/api/admin/users?status=active&activity=active_7d&progress=has&sort=memorised&dir=desc&page=1&per_page=20')
            ->assertOk()
            ->assertJsonPath('page', 1)
            ->assertJsonPath('per_page', 20);

        $emails = collect($filtered->json('users'))->pluck('email')->all();
        $this->assertContains('active@example.com', $emails);
        $this->assertNotContains('trial@example.com', $emails);
        $this->assertNotContains('idle@example.com', $emails);
        $this->assertGreaterThanOrEqual(1, $filtered->json('total'));
        $this->assertGreaterThanOrEqual(1, $filtered->json('total_pages'));

        $withSessions = $this->actingAs($admin)
            ->getJson('/api/admin/users?sessions=gt0&sort=accuracy&dir=desc')
            ->assertOk();
        $sessionEmails = collect($withSessions->json('users'))->pluck('email')->all();
        $this->assertContains('active@example.com', $sessionEmails);
        $this->assertNotContains('idle@example.com', $sessionEmails);

        $activeRow = collect($withSessions->json('users'))->firstWhere('email', 'active@example.com');
        $this->assertSame(84, $activeRow['avg_ai_accuracy']);
        $this->assertNotEmpty($activeRow['last_ai_check_at']);

        $today = $this->actingAs($admin)
            ->getJson('/api/admin/users?activity=today')
            ->assertOk();
        $this->assertNotContains('idle@example.com', collect($today->json('users'))->pluck('email')->all());

        $this->actingAs($admin)
            ->postJson('/api/admin/users/bulk', [
                'action' => 'update_status',
                'user_ids' => [$trial->id, $idle->id],
                'subscription_status' => 'active',
            ])
            ->assertOk()
            ->assertJsonPath('updated', 2);

        $this->assertDatabaseHas('users', ['id' => $trial->id, 'subscription_status' => 'active']);
        $this->assertDatabaseHas('users', ['id' => $idle->id, 'subscription_status' => 'active']);

        $this->actingAs($admin)
            ->postJson('/api/admin/users/bulk', [
                'action' => 'delete',
                'user_ids' => [$admin->id, $idle->id],
            ])
            ->assertOk()
            ->assertJsonPath('deleted', 1)
            ->assertJsonPath('skipped', 1);

        $this->assertDatabaseHas('users', ['id' => $admin->id]);
        $this->assertSoftDeleted('users', ['id' => $idle->id]);
    }

    public function test_admin_can_view_user_detail(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);
        $learner = User::factory()->create([
            'name' => 'Fatima',
            'email' => 'fatima@example.com',
            'locale' => 'ar',
            'subscription_status' => 'trialing',
        ]);

        MemorisationProgress::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => 'memorised',
            'mastery_level' => 70,
            'repetitions' => 2,
            'completed_at' => now()->subDay(),
        ]);

        UserSession::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'ended_at' => now()->subHours(3),
            'last_activity_at' => now()->subHours(3),
            'metadata' => ['config' => ['chapterId' => 112, 'rangeStart' => 1, 'rangeEnd' => 3]],
        ]);

        AiReciteAttempt::create([
            'user_id' => $learner->id,
            'attempt_number' => 1,
            'accuracy_percent' => 91,
            'band' => 'strong',
            'ayah_range' => ['surah' => 112, 'from' => 1, 'to' => 3],
        ]);

        AyahNote::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'body' => 'Needs review on madd',
        ]);

        UserLastPosition::create([
            'user_id' => $learner->id,
            'surah_number' => 112,
            'ayah_number' => 2,
            'last_opened_at' => now()->subHour(),
        ]);

        $list = $this->actingAs($admin)
            ->getJson('/api/admin/users?q=fatima@example.com')
            ->assertOk();
        $listRow = collect($list->json('users'))->firstWhere('email', 'fatima@example.com');
        $this->assertNotNull($listRow);

        $detail = $this->actingAs($admin)
            ->getJson("/api/admin/users/{$learner->id}")
            ->assertOk()
            ->assertJsonPath('user.email', 'fatima@example.com')
            ->assertJsonPath('stats.memorised_ayahs', 1)
            ->assertJsonPath('stats.sessions_completed', 1)
            ->assertJsonPath('stats.ai_checks', 1)
            ->assertJsonPath('stats.notes', 1)
            ->assertJsonPath('stats.avg_ai_accuracy', 91)
            ->assertJsonPath('surah_progress.0.surah_number', 112)
            ->assertJsonPath('surah_progress.0.practised', 1)
            ->assertJsonPath('surah_progress.0.total_ayahs', 4)
            ->assertJsonPath('surah_progress.0.percent', 25)
            ->assertJsonPath('recent_sessions.0.status', 'completed')
            ->assertJsonPath('recent_ai_checks.0.accuracy_percent', 91)
            ->assertJsonPath('recent_notes.0.snippet', 'Needs review on madd');

        $this->assertSame($listRow['memorised_ayahs'], $detail->json('stats.memorised_ayahs'));
        $this->assertSame($listRow['sessions_completed'], $detail->json('stats.sessions_completed'));
        $this->assertSame($listRow['avg_ai_accuracy'], $detail->json('stats.avg_ai_accuracy'));
    }

    public function test_admin_can_create_update_and_delete_users(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $created = $this->actingAs($admin)
            ->postJson('/api/admin/users', [
                'name' => 'New Learner',
                'email' => 'new.learner@example.com',
                'password' => 'password123',
                'locale' => 'fr',
                'subscription_status' => 'trialing',
            ])
            ->assertCreated()
            ->assertJsonPath('user.email', 'new.learner@example.com')
            ->assertJsonPath('user.locale', 'fr')
            ->assertJsonPath('user.subscription_status', 'trialing');

        $userId = (int) $created->json('user.id');
        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'email' => 'new.learner@example.com',
        ]);

        $this->actingAs($admin)
            ->patchJson("/api/admin/users/{$userId}", [
                'name' => 'Updated Learner',
                'subscription_status' => 'active',
                'locale' => 'ar',
            ])
            ->assertOk()
            ->assertJsonPath('user.name', 'Updated Learner')
            ->assertJsonPath('user.subscription_status', 'active')
            ->assertJsonPath('detail.user.locale', 'ar');

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$admin->id}")
            ->assertStatus(422);

        $this->actingAs($admin)
            ->deleteJson("/api/admin/users/{$userId}")
            ->assertOk()
            ->assertJsonPath('deleted', true);

        $this->assertSoftDeleted('users', ['id' => $userId]);

        $deletedList = $this->actingAs($admin)
            ->getJson('/api/admin/users?account=deleted')
            ->assertOk();
        $deletedRow = collect($deletedList->json('users'))->firstWhere('id', $userId);
        $this->assertNotNull($deletedRow);
        $this->assertTrue($deletedRow['is_deleted']);
        $this->assertSame('new.learner@example.com', $deletedRow['email']);

        $this->actingAs($admin)
            ->getJson("/api/admin/users/{$userId}")
            ->assertOk()
            ->assertJsonPath('user.is_deleted', true);

        $this->actingAs($admin)
            ->postJson("/api/admin/users/{$userId}/restore")
            ->assertOk()
            ->assertJsonPath('restored', true);

        $this->assertNull(User::withTrashed()->find($userId)?->deleted_at);
        $this->assertDatabaseHas('users', [
            'id' => $userId,
            'email' => 'new.learner@example.com',
        ]);
    }

    public function test_admin_dashboard_nav_replaces_user_dashboard_for_admins(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('admin.dashboard'))
            ->assertOk()
            ->assertSee(route('admin.dashboard'), false)
            ->assertDontSee('href="'.route('dashboard').'"', false);
    }

    public function test_non_admin_cannot_hit_admin_list_endpoints(): void
    {
        $learner = User::factory()->create(['email' => 'learner@example.com']);

        $this->actingAs($learner)->getJson('/api/admin/users')->assertForbidden();
        $this->actingAs($learner)->postJson('/api/admin/users', [])->assertForbidden();
        $this->actingAs($learner)->postJson('/api/admin/users/bulk', [
            'action' => 'delete',
            'user_ids' => [$learner->id],
        ])->assertForbidden();
        $this->actingAs($learner)->getJson("/api/admin/users/{$learner->id}")->assertForbidden();
        $this->actingAs($learner)->getJson('/api/admin/activity')->assertForbidden();
        $this->actingAs($learner)->getJson('/api/admin/sessions')->assertForbidden();
        $this->actingAs($learner)->getJson('/api/admin/ai-checks')->assertForbidden();
        $this->actingAs($learner)->getJson('/api/admin/notes')->assertForbidden();
        $this->actingAs($learner)->getJson('/api/admin/contacts')->assertForbidden();
    }

    public function test_admin_login_redirects_to_memorisation(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->post(route('login'), [
            'email' => 'admin@example.com',
            'password' => 'secret12',
        ])->assertRedirect(route('memorisation'));

        $this->assertAuthenticatedAs($admin);
    }

    public function test_learner_login_redirects_to_memorisation(): void
    {
        User::factory()->create([
            'email' => 'learner@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->post(route('login'), [
            'email' => 'learner@example.com',
            'password' => 'secret12',
        ])->assertRedirect(route('memorisation'));
    }

    public function test_login_ignores_intended_progress_page(): void
    {
        User::factory()->create([
            'email' => 'learner@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->withSession(['url.intended' => route('dashboard')])
            ->post(route('login'), [
                'email' => 'learner@example.com',
                'password' => 'secret12',
            ])
            ->assertRedirect(route('memorisation'));
    }

    public function test_authenticated_admin_visiting_login_redirects_to_memorisation(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('login'))
            ->assertRedirect(route('memorisation'));
    }

    public function test_admin_visiting_customer_dashboard_is_sent_to_admin_dashboard(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
        ]);

        $this->actingAs($admin)
            ->get(route('dashboard'))
            ->assertRedirect(route('admin.dashboard'));
    }
}
