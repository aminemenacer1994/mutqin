<?php

namespace Tests\Feature;

use App\Http\Middleware\SetMutqinContentSecurityPolicy;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    public function test_homepage_includes_quran_foundation_and_bunny_font_sources(): void
    {
        $policy = $this->get('/')
            ->assertOk()
            ->headers->get('Content-Security-Policy');

        $this->assertNotNull($policy);
        $this->assertStringContainsString('https://verses.quran.foundation', (string) $policy);
        $this->assertStringContainsString('https://fonts.bunny.net', (string) $policy);
    }

    public function test_build_policy_omits_unsafe_eval_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['app.debug' => false]);

        $policy = SetMutqinContentSecurityPolicy::buildPolicy();

        $this->assertStringNotContainsString("'unsafe-eval'", $policy);
    }

    public function test_build_policy_includes_required_asset_hosts(): void
    {
        $policy = SetMutqinContentSecurityPolicy::buildPolicy();

        $this->assertStringContainsString(
            "style-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.bunny.net",
            $policy
        );
        $this->assertStringContainsString(
            "font-src 'self' data: https://cdn.jsdelivr.net https://fonts.gstatic.com https://fonts.bunny.net https://verses.quran.foundation",
            $policy
        );
        $this->assertStringContainsString("media-src 'self' blob: data: https:", $policy);
    }
}
