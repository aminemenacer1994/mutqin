<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LandingPreviewResourcesTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['menacer72@gmail.com']);
    }

    public function test_resources_page_requires_allowlist(): void
    {
        $this->get('/preview/resources')->assertRedirect();

        $other = User::factory()->create([
            'email' => 'other@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($other)
            ->get('/preview/resources')
            ->assertNotFound();
    }

    public function test_resources_page_renders_for_allowlisted_user(): void
    {
        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/resources')
            ->assertOk()
            ->assertSee('preview-resources-page', false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');
    }

    public function test_reference_pdf_requires_allowlist(): void
    {
        $this->get('/preview/resources/files/business-model')->assertRedirect();

        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/resources/files/business-model')
            ->assertOk()
            ->assertHeader('Content-Type', 'application/pdf')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    public function test_reference_pdf_rejects_unknown_file(): void
    {
        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/resources/files/not-real')
            ->assertNotFound();
    }
}
