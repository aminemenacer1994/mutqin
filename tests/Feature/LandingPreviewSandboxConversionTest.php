<?php

namespace Tests\Feature;

use App\Models\User;
use App\Support\LandingPreviewDemo;
use Database\Seeders\OrganisationNetworkSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPreviewSandboxConversionTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['previewer@example.com']);
        config()->set('mutqin.preview_sandbox.public_access_enabled', false);
    }

    public function test_demo_exit_can_redirect_to_preview_landing(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/preview/demo/exit', ['destination' => 'landing'])
            ->assertRedirect(route('preview.home'));

        $this->assertAuthenticatedAs($owner);
        $this->assertFalse(session()->has(LandingPreviewDemo::SESSION_KEY));
    }

    public function test_demo_exit_can_redirect_to_preview_pricing(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/preview/demo/exit', ['destination' => 'pricing'])
            ->assertRedirect(route('preview.pricing'));

        $this->assertAuthenticatedAs($owner);
    }

    public function test_demo_exit_rejects_unknown_destination(): void
    {
        $this->enableTeacherFeatures();
        $this->seed(OrganisationNetworkSeeder::class);

        $owner = User::factory()->create([
            'email' => 'previewer@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($owner)
            ->post('/preview/demo/enter', ['persona' => 'org_halaqa_teacher']);

        $this->post('/preview/demo/exit', ['destination' => 'register'])
            ->assertSessionHasErrors('destination');
    }
}
