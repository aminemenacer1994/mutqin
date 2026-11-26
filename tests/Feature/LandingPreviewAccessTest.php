<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use PHPUnit\Framework\Attributes\DataProvider;
use Tests\TestCase;

class LandingPreviewAccessTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        config()->set('mutqin.landing_preview_enabled', true);
        config()->set('mutqin.landing_preview_emails', ['menacer72@gmail.com']);
    }

    public function test_preview_routes_are_hidden_when_marketing_preview_is_disabled(): void
    {
        config()->set('mutqin.landing_preview_enabled', false);

        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview')
            ->assertNotFound();
    }

    public function test_preview_home_is_not_indexed_and_not_public(): void
    {
        $this->get('/preview')
            ->assertRedirect();

        $user = User::factory()->create([
            'email' => 'other@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($user)
            ->get('/preview')
            ->assertNotFound();

        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview')
            ->assertOk()
            ->assertSee('homepage', false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');
    }

    public function test_preview_pricing_follows_same_gate(): void
    {
        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/pricing')
            ->assertOk()
            ->assertSee('pricing-page', false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');
    }

    public function test_robots_txt_disallows_preview_prefix(): void
    {
        $body = $this->get('/robots.txt')
            ->assertOk()
            ->getContent();

        $this->assertStringContainsString('Disallow: /preview', $body);
    }

    public function test_public_homepage_unchanged_for_guests(): void
    {
        $this->get('/')
            ->assertOk()
            ->assertHeader('X-Robots-Tag', 'index, follow');
    }

    public function test_preview_marketing_assets_require_allowlist(): void
    {
        $this->get('/preview/assets/overview.png')
            ->assertRedirect();

        $other = User::factory()->create([
            'email' => 'other@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($other)
            ->get('/preview/assets/overview.png')
            ->assertNotFound();

        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/assets/overview.png')
            ->assertOk()
            ->assertHeader('Content-Type', 'image/png')
            ->assertHeader('X-Robots-Tag', 'noindex, nofollow');
    }

    #[DataProvider('previewAudienceRoutes')]
    public function test_preview_audience_pages_follow_same_gate(string $path, string $needle): void
    {
        $this->get($path)
            ->assertRedirect();

        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get($path)
            ->assertOk()
            ->assertSee($needle, false)
            ->assertHeader('X-Robots-Tag', 'noindex, follow');
    }

    public static function previewAudienceRoutes(): array
    {
        return [
            'teachers' => ['/preview/teachers', 'preview-audience-page'],
            'students' => ['/preview/students', 'preview-audience-page'],
            'parents' => ['/preview/parents', 'preview-audience-page'],
            'learning' => ['/preview/learning', 'preview-audience-page'],
            'institutions' => ['/preview/institutions', 'preview-audience-page'],
            'demo' => ['/preview/demo', 'preview-demo-page'],
            'resources' => ['/preview/resources', 'preview-resources-page'],
        ];
    }

    public function test_preview_marketing_assets_reject_unknown_files(): void
    {
        $allowed = User::factory()->create([
            'email' => 'menacer72@gmail.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($allowed)
            ->get('/preview/assets/not-real.png')
            ->assertNotFound();
    }
}
