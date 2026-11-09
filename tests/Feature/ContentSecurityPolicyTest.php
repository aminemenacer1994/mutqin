<?php

namespace Tests\Feature;

use App\Http\Middleware\SetMutqinContentSecurityPolicy;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ContentSecurityPolicyTest extends TestCase
{
    use RefreshDatabase;
    public function test_homepage_includes_quran_foundation_and_bunny_font_sources(): void
    {
        $policy = $this->get('/')
            ->assertOk()
            ->headers->get('Content-Security-Policy');

        $this->assertNotNull($policy);
        $this->assertStringContainsString('https://verses.quran.foundation', (string) $policy);
        $this->assertStringContainsString('https://fonts.bunny.net', (string) $policy);
        $this->assertStringNotContainsString("script-src 'none'", (string) $policy);
        $this->assertStringContainsString("script-src 'self'", (string) $policy);
    }

    public function test_memorisation_shell_allows_same_origin_scripts(): void
    {
        $user = User::factory()->create([
            'email_verified_at' => now(),
        ]);

        $policy = $this->actingAs($user)
            ->get('/memorisation')
            ->assertOk()
            ->headers->get('Content-Security-Policy');

        $this->assertNotNull($policy);
        $this->assertStringContainsString("script-src 'self'", (string) $policy);
        $this->assertStringNotContainsString("script-src 'none'", (string) $policy);
    }

    public function test_build_policy_omits_unsafe_eval_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['app.debug' => false]);

        $policy = SetMutqinContentSecurityPolicy::buildPolicy();

        $this->assertStringNotContainsString("'unsafe-eval'", $policy);
    }

    public function test_build_policy_includes_relative_form_action_self(): void
    {
        $policy = SetMutqinContentSecurityPolicy::buildPolicy();

        $this->assertStringContainsString("form-action 'self'", $policy);
        $this->assertStringContainsString('https://checkout.stripe.com', $policy);
        $this->assertStringContainsString('https://billing.stripe.com', $policy);
        $this->assertStringContainsString('https://accounts.google.com', $policy);
    }

    public function test_build_policy_allows_app_url_forms_in_local_when_hosts_differ(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config(['app.url' => 'http://localhost:8000']);

        $request = \Illuminate\Http\Request::create('http://127.0.0.1:8000/donate', 'GET', [], [], [], [
            'HTTP_HOST' => '127.0.0.1:8000',
        ]);

        $policy = SetMutqinContentSecurityPolicy::buildPolicy($request);

        $this->assertStringContainsString("form-action 'self'", $policy);
        $this->assertStringContainsString('http://localhost:8000', $policy);
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
        $this->assertStringContainsString(
            "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com",
            $policy
        );
    }

    public function test_middleware_replaces_script_src_none_policy(): void
    {
        $middleware = new SetMutqinContentSecurityPolicy;

        $request = \Illuminate\Http\Request::create('/memorisation', 'GET');
        $response = response('<html><body>ok</body></html>', 200, [
            'Content-Type' => 'text/html; charset=UTF-8',
            'Content-Security-Policy' => "default-src 'self'; script-src 'none'",
        ]);

        $result = $middleware->handle($request, fn () => $response);
        $policy = (string) $result->headers->get('Content-Security-Policy');

        $this->assertStringContainsString("script-src 'self'", $policy);
        $this->assertStringNotContainsString("script-src 'none'", $policy);
    }
}
