<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class GoogleAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    public function test_gtag_is_omitted_when_disabled(): void
    {
        config([
            'services.google_analytics.enabled' => false,
            'services.google_analytics.measurement_id' => 'G-W4K8J2T0SG',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('googletagmanager.com/gtag/js', false)
            ->assertDontSee('G-W4K8J2T0SG', false);
    }

    public function test_gtag_is_injected_when_enabled(): void
    {
        config([
            'services.google_analytics.enabled' => true,
            'services.google_analytics.measurement_id' => 'G-TEST12345',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertSee('googletagmanager.com/gtag/js?id=G-TEST12345', false)
            ->assertSee('gtag(\'config\', "G-TEST12345")', false);
    }

    public function test_invalid_measurement_id_is_rejected(): void
    {
        config([
            'services.google_analytics.enabled' => true,
            'services.google_analytics.measurement_id' => '"><script>alert(1)</script>',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('googletagmanager.com/gtag/js', false)
            ->assertDontSee('<script>alert(1)</script>', false);
    }

    public function test_embed_requests_omit_analytics(): void
    {
        config([
            'services.google_analytics.enabled' => true,
            'services.google_analytics.measurement_id' => 'G-TEST12345',
        ]);

        $this->get(route('login', ['mutqin_embed' => 1]))
            ->assertOk()
            ->assertDontSee('googletagmanager.com/gtag/js', false);
    }

    public function test_error_pages_include_analytics_when_enabled(): void
    {
        config([
            'services.google_analytics.enabled' => true,
            'services.google_analytics.measurement_id' => 'G-TEST12345',
        ]);

        $html = view('errors.404')->render();

        $this->assertStringContainsString('googletagmanager.com/gtag/js?id=G-TEST12345', $html);
        $this->assertStringContainsString('gtag(\'config\', "G-TEST12345")', $html);
    }
}
