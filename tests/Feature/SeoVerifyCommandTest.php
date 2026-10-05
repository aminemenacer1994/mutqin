<?php

namespace Tests\Feature;

use Tests\TestCase;

class SeoVerifyCommandTest extends TestCase
{
    public function test_seo_verify_command_passes_locally(): void
    {
        $this->artisan('mutqin:seo-verify')
            ->assertSuccessful();
    }

    public function test_seo_verify_json_reports_ok(): void
    {
        $this->artisan('mutqin:seo-verify', ['--json' => true])
            ->assertSuccessful()
            ->expectsOutputToContain('"ok": true');
    }

    public function test_verification_meta_omitted_when_tokens_empty(): void
    {
        config([
            'seo.google_site_verification' => '',
            'seo.bing_site_verification' => '',
        ]);

        $this->get('/')
            ->assertOk()
            ->assertDontSee('google-site-verification', false)
            ->assertDontSee('msvalidate.01', false);
    }

    public function test_verification_meta_rendered_from_config_only(): void
    {
        config([
            'seo.google_site_verification' => 'google-token-from-env',
            'seo.bing_site_verification' => 'bing-token-from-env',
        ]);

        $this->get('/')
            ->assertOk()
            ->assertSee('name="google-site-verification"', false)
            ->assertSee('content="google-token-from-env"', false)
            ->assertSee('name="msvalidate.01"', false)
            ->assertSee('content="bing-token-from-env"', false);
    }
}
