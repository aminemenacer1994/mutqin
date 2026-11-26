<?php

namespace Tests\Feature;

use App\Models\TeacherAssignmentRecipient;
use App\Models\User;
use App\Support\LandingPreviewDemo;
use App\Support\PreviewSandboxEntitlement;
use Database\Seeders\PlatformDemoSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Config;
use Tests\TestCase;

class LandingPreviewSandboxExperienceTest extends TestCase
{
    use RefreshDatabase;

    private const PLATFORM_PASSWORD = 'platform-demo-test-pass';

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['previewer@example.com']);
        $this->enableTeacherFeatures();
        $this->enableParentFeatures();
        Config::set('mutqin.platform_demo_password', self::PLATFORM_PASSWORD);
    }

    public function test_capabilities_endpoint_audits_live_teacher_tools(): void
    {
        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->getJson('/preview/demo/capabilities')
            ->assertOk()
            ->assertJsonPath('capabilities.teacher.0.id', 'dashboard')
            ->assertJsonPath('capabilities.teacher.0.status', 'live')
            ->assertJsonPath('capabilities.personal.3.id', 'ai_recite');
    }

    public function test_platform_demo_links_teacher_work_to_students(): void
    {
        $this->seed(PlatformDemoSeeder::class);

        $student = LandingPreviewDemo::resolveDemoUser('platform_classroom_student');
        $this->assertInstanceOf(User::class, $student);

        $this->assertGreaterThan(
            0,
            TeacherAssignmentRecipient::query()->where('student_id', $student->id)->count()
        );
    }

    public function test_entitlement_preview_does_not_mutate_owner_subscription(): void
    {
        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
            'subscription_tier' => 'free',
            'subscription_plan' => 'free',
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'memorisation_guest'])
            ->assertRedirect('/preview/demo/memorisation');

        $this->from('/preview/demo/memorisation')
            ->post('/preview/demo/entitlement', ['tier' => 'pro'])
            ->assertRedirect('/preview/demo/memorisation');

        $owner->refresh();
        $this->assertSame('free', strtolower((string) $owner->subscription_tier));
        $this->assertSame('pro', session(PreviewSandboxEntitlement::SESSION_TIER_KEY));
    }

    public function test_reset_requires_confirmation(): void
    {
        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'memorisation_guest']);

        $this->post('/preview/demo/reset')
            ->assertSessionHasErrors('confirm');
    }
}
