<?php

namespace Tests\Feature;

use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PostHogConfigTest extends TestCase
{
    use RefreshDatabase;

    public function test_login_page_receives_the_eu_project_token_once(): void
    {
        config([
            'services.posthog.key' => 'phc_testtoken12345678',
            'services.posthog.host' => 'https://us.i.posthog.com',
        ]);

        $html = $this->get(route('login'))
            ->assertOk()
            ->getContent();

        $this->assertSame(1, substr_count($html, 'window.mutqinPosthog'));
        $this->assertStringContainsString('phc_testtoken12345678', $html);
        $this->assertStringContainsString('https:\/\/eu.i.posthog.com', $html);
        $this->assertStringNotContainsString('us.i.posthog.com', $html);

        $posthogAt = strpos($html, 'window.mutqinPosthog');
        $appAt = strpos($html, 'js/app.js');
        $this->assertNotFalse($posthogAt);
        $this->assertNotFalse($appAt);
        $this->assertLessThan($appAt, $posthogAt, 'PostHog config must load before the deferred app bundle.');
    }

    public function test_invalid_or_empty_token_is_not_written_into_the_page(): void
    {
        config([
            'services.posthog.key' => '"><script>alert(1)</script>',
            'services.posthog.host' => 'https://eu.i.posthog.com',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('window.mutqinPosthog', false)
            ->assertDontSee('<script>alert(1)</script>', false);

        config(['services.posthog.key' => '']);

        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('window.mutqinPosthog', false);

        config([
            'services.posthog.key' => 'phc_testtoken12345678',
            'services.posthog.personal_api_key' => 'phx_personal_secret_should_not_leak',
        ]);

        $this->get(route('login'))
            ->assertOk()
            ->assertDontSee('phx_personal_secret_should_not_leak', false)
            ->assertDontSee('POSTHOG_PERSONAL_API_KEY', false);
    }
}
