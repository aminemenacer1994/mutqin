<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LandingPreviewDemo;
use Database\Seeders\OrganisationNetworkSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPreviewDemoTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['previewer@example.com']);
    }

    public function test_demo_routes_require_allowlisted_user(): void
    {
        foreach (['/preview/demo', '/preview/demo/memorisation', '/preview/demo/status'] as $path) {
            $this->get($path)->assertRedirect();
        }

        $other = User::factory()->create([
            'email' => 'other@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($other)->get('/preview/demo')->assertNotFound();
    }

    public function test_demo_status_returns_readiness_for_allowlisted_user(): void
    {
        $allowed = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->getJson('/preview/demo/status')
            ->assertOk()
            ->assertJsonPath('personas.0.id', 'org_halaqa_teacher')
            ->assertJsonPath('personas.0.ready', false)
            ->assertJsonStructure(['personas', 'experiences'])
            ->assertJsonPath('experiences.0.experience', 'teacher')
            ->assertJsonPath('experiences.3.experience', 'personal')
            ->assertJsonPath('experiences.3.ready', true)
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_demo_enter_switches_to_synthetic_teacher(): void
    {
        $this->seed(OrganisationNetworkSeeder::class);

        $allowed = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher'])
            ->assertRedirect('/teacher');

        $teacher = User::query()->where('email', 'org.demo.halaqa.teacher@example.com')->firstOrFail();
        $this->assertAuthenticatedAs($teacher);
        $this->assertTrue(LandingPreviewDemo::isSyntheticDemoUser($teacher));
        $this->assertSame('org_halaqa_teacher', session(LandingPreviewDemo::SESSION_KEY)['persona'] ?? null);
    }

    public function test_demo_enter_memorisation_sets_session_without_impersonation(): void
    {
        $allowed = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->post('/preview/demo/enter', ['persona' => 'memorisation_guest'])
            ->assertRedirect('/preview/demo/memorisation');

        $this->assertAuthenticatedAs($allowed);
        $this->assertSame('memorisation_guest', session(LandingPreviewDemo::SESSION_KEY)['persona'] ?? null);
    }

    public function test_demo_exit_requires_active_session(): void
    {
        $user = User::factory()->create(['email_verified_at' => now()]);

        $this->actingAs($user)
            ->post('/preview/demo/exit')
            ->assertNotFound();
    }

    public function test_demo_personas_exclude_parent_demo_child_pii(): void
    {
        $emails = array_filter(array_column(LandingPreviewDemo::personas(), 'email'));
        $this->assertNotContains('menacer72@gmail.com', $emails);
    }
}
