<?php

namespace Tests\Feature;

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Application;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use PHPUnit\Framework\Attributes\PreserveGlobalState;
use PHPUnit\Framework\Attributes\RunTestsInSeparateProcesses;
use Tests\TestCase;

/** Route registration depends on APP_URL at bootstrap; isolate from other feature tests. */
#[RunTestsInSeparateProcesses]
#[PreserveGlobalState(false)]
class MutqinDomainRoutingTest extends TestCase
{
    public static function setUpBeforeClass(): void
    {
        parent::setUpBeforeClass();

        putenv('APP_URL=https://mutqin.ai');
        $_ENV['APP_URL'] = 'https://mutqin.ai';
        $_SERVER['APP_URL'] = 'https://mutqin.ai';
    }

    public function createApplication(): Application
    {
        putenv('APP_URL=https://mutqin.ai');
        $_ENV['APP_URL'] = 'https://mutqin.ai';
        $_SERVER['APP_URL'] = 'https://mutqin.ai';

        return parent::createApplication();
    }

    /**
     * Laravel's HTTP test helper rewrites URIs through APP_URL; domain routing needs a real Host.
     */
    private function getOnHost(string $host, string $path): TestResponse
    {
        $path = '/'.ltrim($path, '/');
        $kernel = $this->app->make(HttpKernel::class);
        $request = Request::create($path, 'GET', [], [], [], [
            'HTTP_HOST' => $host,
            'HTTPS' => 'on',
            'SERVER_NAME' => $host,
        ]);
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);

        return $this->createTestResponse($response, $request);
    }

    private function onPublicHost(string $uri): TestResponse
    {
        return $this->getOnHost('mutqin.ai', $uri);
    }

    public function test_public_host_serves_the_application_and_waiting_list(): void
    {
        $this->onPublicHost('/')
            ->assertOk()
            ->assertSee('<homepage', false)
            ->assertSee('id="primaryNavbar"', false)
            ->assertDontSee('nav-link-waiting-list', false)
            ->assertDontSee('class="mutqin-early-access-nav"', false);

        $this->onPublicHost('/waiting-list')
            ->assertRedirect('/');
    }

    public function test_public_host_serves_donate_and_checkout_routes(): void
    {
        $this->onPublicHost('/donate')->assertOk();

        $this->onPublicHost('/donate/success')
            ->assertRedirect(route('donate'));
    }

    public function test_public_host_keeps_public_pages_on_mutqin_ai(): void
    {
        $this->onPublicHost('/pricing')
            ->assertOk();

        $this->onPublicHost('/about')
            ->assertOk();
    }

    public function test_public_host_keeps_application_paths_on_mutqin_ai(): void
    {
        $this->onPublicHost('/login')
            ->assertOk();

        $this->onPublicHost('/memorisation')
            ->assertRedirect(route('login'));

        $admin = $this->onPublicHost('/admin/waiting-list');
        $admin->assertRedirect();
        $location = (string) $admin->headers->get('Location');
        $this->assertStringContainsString('/login', $location);
        $this->assertStringContainsString('mutqin.ai', $location);
    }

    public function test_public_host_serves_robots_and_sitemap(): void
    {
        $this->onPublicHost('/robots.txt')
            ->assertOk()
            ->assertSee('Sitemap:', false);

        $this->onPublicHost('/sitemap.xml')
            ->assertOk()
            ->assertSee('<urlset', false)
            ->assertSee('https://mutqin.ai/', false)
            ->assertSee('https://mutqin.ai/about', false)
            ->assertSee('https://mutqin.ai/donate', false)
            ->assertDontSee('https://mutqin.ai/waiting-list', false);
    }

    public function test_www_host_redirects_to_apex(): void
    {
        $this->getOnHost('www.mutqin.ai', '/')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/');
    }

    public function test_public_host_homepage_shows_full_navigation(): void
    {
        $this->onPublicHost('/')
            ->assertOk()
            ->assertSee('<homepage', false)
            ->assertSee('rel="canonical" href="https://mutqin.ai/"', false)
            ->assertSee('Available now:', false)
            ->assertSee('Start your first session', false)
            ->assertDontSee('Early access:', false)
            ->assertSee('id="primaryNavbar"', false)
            ->assertSee('class="nav-link nav-link-memorisation', false)
            ->assertSee('class="nav-link nav-link-about', false)
            ->assertSee('class="nav-link nav-link-home', false)
            ->assertDontSee('class="mutqin-early-access-nav"', false)
            ->assertDontSee('id="earlyAccessNavbar"', false)
            ->assertDontSee('nav-link-waiting-list', false);
    }

    public function test_public_host_serves_service_worker(): void
    {
        $expected = file_get_contents(public_path('sw.js'));
        $this->assertNotFalse($expected);
        $this->assertStringContainsString('mutqin-shell-v98', $expected);
        $this->assertStringNotContainsString('isSameOrigin || isQuranApi', $expected);

        $response = $this->onPublicHost('/sw.js');
        $response->assertOk();
        $body = method_exists($response, 'streamedContent')
            ? (string) $response->streamedContent()
            : (string) $response->getContent();
        $this->assertStringContainsString('mutqin-shell-v98', $body);
    }

    public function test_public_host_serves_public_mix_assets_same_origin(): void
    {
        if (! is_file(public_path('js/app.js'))) {
            $this->markTestSkipped('Mix build output not present');
        }

        $this->onPublicHost('/js/app.js')->assertOk();
        $this->onPublicHost('/mix-manifest.json')->assertOk();
    }

    public function test_vue_shell_loads_app_bundle(): void
    {
        $html = (string) $this->onPublicHost('/')->getContent();
        $this->assertStringContainsString('/js/app.js', $html);
        $this->assertStringContainsString('<homepage', $html);
    }
}
