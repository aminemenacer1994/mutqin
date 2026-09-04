<?php

namespace Tests\Unit;

use App\Support\GoogleOAuthRedirect;
use App\Support\PublicAppUrl;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\URL;
use Tests\TestCase;

class GoogleOAuthRedirectTest extends TestCase
{
    public function test_placeholder_app_url_is_expanded(): void
    {
        $this->assertSame(
            'https://app.mutqin.ai/auth/google/callback',
            GoogleOAuthRedirect::fromEnvironment(
                '${APP_URL}/auth/google/callback',
                'https://app.mutqin.ai'
            )
        );
    }

    public function test_empty_redirect_falls_back_to_app_url_callback(): void
    {
        $this->assertSame(
            'https://app.mutqin.ai/auth/google/callback',
            GoogleOAuthRedirect::fromEnvironment('', 'https://app.mutqin.ai/')
        );
    }

    public function test_origin_only_redirect_appends_callback_path(): void
    {
        $this->assertSame(
            'https://app.mutqin.ai/auth/google/callback',
            GoogleOAuthRedirect::fromEnvironment('https://app.mutqin.ai', 'https://app.mutqin.ai')
        );
    }

    public function test_http_redirect_is_upgraded_when_app_url_is_https(): void
    {
        $this->assertSame(
            'https://app.mutqin.ai/auth/google/callback',
            GoogleOAuthRedirect::fromEnvironment(
                'http://app.mutqin.ai/auth/google/callback',
                'https://app.mutqin.ai'
            )
        );
    }

    public function test_local_http_redirect_is_not_upgraded(): void
    {
        $this->assertSame(
            'http://localhost:8000/auth/google/callback',
            GoogleOAuthRedirect::fromEnvironment(
                'http://localhost:8000/auth/google/callback',
                'http://localhost:8000'
            )
        );
    }

    public function test_cloud_hostname_does_not_replace_canonical_redirect_uri(): void
    {
        config([
            'app.url' => 'https://app.mutqin.ai',
            'services.google.redirect' => 'https://app.mutqin.ai/auth/google/callback',
        ]);

        $request = Request::create('https://mutqin-abc.laravel.cloud/auth/google', 'GET');

        $this->assertSame(
            'https://app.mutqin.ai/auth/google/callback',
            GoogleOAuthRedirect::uri($request)
        );
    }

    public function test_local_loopback_hosts_can_swap_for_google_callback(): void
    {
        config([
            'app.url' => 'http://localhost:8000',
            'services.google.redirect' => 'http://localhost:8000/auth/google/callback',
        ]);

        $request = Request::create('http://127.0.0.1:8000/auth/google', 'GET');

        $this->assertSame(
            'http://127.0.0.1:8000/auth/google/callback',
            GoogleOAuthRedirect::uri($request)
        );
    }

    public function test_production_pins_generated_routes_to_app_url(): void
    {
        PublicAppUrl::apply('https://app.mutqin.ai', 'production');

        $this->assertSame('https://app.mutqin.ai/auth/google/callback', route('auth.google.callback'));
        $this->assertSame('https://app.mutqin.ai/memorisation', route('memorisation'));

        URL::forceRootUrl(null);
        URL::forceScheme(null);
    }

    public function test_local_loopback_does_not_force_https_root(): void
    {
        $before = url('/auth/google/callback');

        PublicAppUrl::apply('http://localhost:8000', 'local');

        $this->assertSame($before, url('/auth/google/callback'));
        $this->assertStringStartsWith('http://', url('/auth/google/callback'));
    }

    public function test_trusted_proxies_treat_forwarded_https_as_secure(): void
    {
        $request = Request::create('http://app.mutqin.ai/login', 'GET', [], [], [], [
            'HTTP_X_FORWARDED_PROTO' => 'https',
            'HTTP_X_FORWARDED_HOST' => 'app.mutqin.ai',
            'REMOTE_ADDR' => '10.0.0.1',
        ]);

        app(\Illuminate\Contracts\Http\Kernel::class)->handle($request);

        $this->assertTrue($request->isSecure());
        $this->assertSame('https', $request->getScheme());
    }

    public function test_empty_session_domain_is_null(): void
    {
        $this->assertNull(config('session.domain'));
    }
}
