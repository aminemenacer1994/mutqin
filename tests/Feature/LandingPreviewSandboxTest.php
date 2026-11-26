<?php

namespace Tests\Feature;

use App\Models\PreviewSandboxSession;
use App\Models\User;
use App\Support\LandingPreviewDemo;
use App\Support\PreviewSandbox;
use Database\Seeders\OrganisationNetworkSeeder;
use Database\Seeders\PlatformDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Illuminate\Support\Str;
use Tests\TestCase;

class LandingPreviewSandboxTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['previewer@example.com']);
        config()->set('mutqin.preview_sandbox.public_access_enabled', false);
    }

    public function test_preview_hub_accessible_while_impersonating_demo_via_owner_session(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher'])
            ->assertRedirect('/teacher');

        $this->get('/preview/demo')->assertOk();
    }

    public function test_demo_exit_restores_preview_owner(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/preview/demo/exit')
            ->assertRedirect(route('preview.demo'));

        $this->assertAuthenticatedAs($owner);
        $this->assertFalse(session()->has(LandingPreviewDemo::SESSION_KEY));
    }

    public function test_synthetic_user_without_sandbox_session_is_rejected(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $teacher = User::query()
            ->where('email', 'org.demo.halaqa.teacher@example.com')
            ->firstOrFail();

        $this->actingAs($teacher)
            ->get('/teacher')
            ->assertRedirect(route('login'));
    }

    public function test_expired_sandbox_ejects_demo_user_back_to_preview_hub(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $session = PreviewSandboxSession::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'expires_at' => now()->subMinute(),
            'last_activity_at' => now()->subHour(),
        ]);

        $teacher = LandingPreviewDemo::resolveDemoUser('org_halaqa_teacher');
        $this->assertNotNull($teacher);

        $this->withSession([
            PreviewSandbox::SESSION_ID_KEY => $session->id,
            PreviewSandbox::OWNER_USER_ID_KEY => $owner->id,
            LandingPreviewDemo::SESSION_KEY => LandingPreviewDemo::sessionPayload('org_halaqa_teacher', $session->id),
        ])
            ->actingAs($teacher)
            ->get('/teacher')
            ->assertRedirect(route('preview.demo'))
            ->assertSessionHas('preview_demo_error');

        $this->assertAuthenticatedAs($owner);
    }

    public function test_sandbox_session_keys_rebind_from_demo_payload(): void
    {
        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $session = PreviewSandboxSession::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'active_persona' => 'org_halaqa_teacher',
            'expires_at' => now()->addHour(),
            'last_activity_at' => now(),
        ]);

        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $teacher = LandingPreviewDemo::resolveDemoUser('org_halaqa_teacher');
        $this->assertNotNull($teacher);

        $this->withSession([
            LandingPreviewDemo::SESSION_KEY => LandingPreviewDemo::sessionPayload('org_halaqa_teacher', $session->id),
        ])
            ->actingAs($teacher)
            ->get('/teacher')
            ->assertOk();

        $this->assertSame($session->id, session(PreviewSandbox::SESSION_ID_KEY));
        $this->assertSame($owner->id, session(PreviewSandbox::OWNER_USER_ID_KEY));
    }

    public function test_cross_owner_sandbox_session_is_rejected(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $ownerA = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);
        $ownerB = User::factory()->create([
            'email' => 'other-previewer@example.com',
            'email_verified_at' => now(),
        ]);
        config()->set('mutqin.landing_preview_emails', ['previewer@example.com', 'other-previewer@example.com']);

        $this->actingAs($ownerA)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $foreignSessionId = PreviewSandboxSession::query()
            ->where('owner_user_id', $ownerA->id)
            ->value('id');
        $this->assertIsString($foreignSessionId);

        $teacher = LandingPreviewDemo::resolveDemoUser('org_halaqa_teacher');
        $this->assertNotNull($teacher);

        $this->actingAs($ownerB)
            ->withSession([
                PreviewSandbox::SESSION_ID_KEY => $foreignSessionId,
                PreviewSandbox::OWNER_USER_ID_KEY => $ownerB->id,
                LandingPreviewDemo::SESSION_KEY => LandingPreviewDemo::sessionPayload('org_halaqa_teacher', $foreignSessionId),
            ])
            ->actingAs($teacher)
            ->get('/teacher')
            ->assertRedirect(route('preview.demo'))
            ->assertSessionHas('preview_demo_error');

        $this->assertAuthenticatedAs($ownerB);
    }

    public function test_classroom_persona_mismatch_returns_forbidden(): void
    {
        $this->seed(OrganisationNetworkSeeder::class);
        Config::set('mutqin.platform_demo_password', 'LocalPlatformDemo1!');
        $this->enableTeacherFeatures();
        $this->seed(PlatformDemoSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/preview/demo/enter', ['persona' => 'platform_teacher'])
            ->assertForbidden();
    }

    public function test_platform_classroom_parent_persona_resolves(): void
    {
        Config::set('mutqin.platform_demo_password', 'LocalPlatformDemo1!');
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
        $this->seed(PlatformDemoSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'platform_classroom_parent'])
            ->assertRedirect('/parent');

        $parent = LandingPreviewDemo::resolveDemoUser('platform_classroom_parent');
        $this->assertNotNull($parent);
        $this->assertAuthenticatedAs($parent);
    }

    public function test_billing_checkout_blocked_during_sandbox(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/checkout', ['plan' => 'premium_monthly'])
            ->assertNotFound();
    }

    public function test_manual_reset_clears_sandbox_quotas(): void
    {
        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $session = PreviewSandboxSession::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'expires_at' => now()->addHour(),
            'last_activity_at' => now(),
            'quotas' => ['ai_assessments' => 3],
        ]);

        $this->actingAs($owner)
            ->withSession([
                PreviewSandbox::SESSION_ID_KEY => $session->id,
                PreviewSandbox::OWNER_USER_ID_KEY => $owner->id,
            ])
            ->post('/preview/demo/reset', ['confirm' => '1'])
            ->assertRedirect(route('preview.demo'));

        $session->refresh();
        $this->assertSame([], $session->quotaUsage());
        $this->assertNotNull($session->reset_at);
    }

    public function test_cleanup_command_removes_expired_rows(): void
    {
        $owner = User::factory()->create(['email_verified_at' => now()]);

        PreviewSandboxSession::query()->create([
            'id' => (string) Str::uuid(),
            'owner_user_id' => $owner->id,
            'expires_at' => now()->subMinute(),
            'last_activity_at' => now()->subHour(),
        ]);

        $this->artisan('mutqin:preview-sandbox-cleanup')->assertSuccessful();

        $this->assertSame(0, PreviewSandboxSession::query()->count());
    }
}
