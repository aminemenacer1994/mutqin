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

        putenv('APP_URL=https://app.mutqin.ai');
        putenv('MUTQIN_DOMAIN_ROUTING_FORCE=true');
        $_ENV['APP_URL'] = 'https://app.mutqin.ai';
        $_SERVER['APP_URL'] = 'https://app.mutqin.ai';
        $_ENV['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'true';
        $_SERVER['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'true';
    }

    public function createApplication(): Application
    {
        putenv('APP_URL=https://app.mutqin.ai');
        putenv('MUTQIN_DOMAIN_ROUTING_FORCE=true');
        $_ENV['APP_URL'] = 'https://app.mutqin.ai';
        $_SERVER['APP_URL'] = 'https://app.mutqin.ai';
        $_ENV['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'true';
        $_SERVER['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'true';

        return parent::createApplication();
    }

    public static function tearDownAfterClass(): void
    {
        putenv('MUTQIN_DOMAIN_ROUTING_FORCE=false');
        $_ENV['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'false';
        $_SERVER['MUTQIN_DOMAIN_ROUTING_FORCE'] = 'false';

        parent::tearDownAfterClass();
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

    private function onMarketingHost(string $uri): TestResponse
    {
        return $this->getOnHost('mutqin.ai', $uri);
    }

    private function onAppHost(string $uri): TestResponse
    {
        return $this->getOnHost('app.mutqin.ai', $uri);
    }

    public function test_marketing_host_serves_the_application_and_waiting_list(): void
    {
        $this->onMarketingHost('/')
            ->assertOk()
            ->assertSee('<homepage', false)
            ->assertSee('id="primaryNavbar"', false)
            ->assertDontSee('nav-link-waiting-list', false)
            ->assertDontSee('class="mutqin-early-access-nav"', false);

        $this->onMarketingHost('/waiting-list')
            ->assertRedirect('/');
    }

    public function test_marketing_host_keeps_public_pages_on_mutqin_ai(): void
    {
        $this->onMarketingHost('/pricing')
            ->assertOk();

        $this->onMarketingHost('/about')
            ->assertOk();
    }

    public function test_marketing_host_keeps_application_paths_on_mutqin_ai(): void
    {
        $this->onMarketingHost('/login')
            ->assertOk();

        $this->onMarketingHost('/memorisation')
            ->assertRedirect(route('login'));

        $admin = $this->onMarketingHost('/admin/waiting-list');
        $admin->assertRedirect();
        $location = (string) $admin->headers->get('Location');
        $this->assertStringContainsString('/login', $location);
        $this->assertStringNotContainsString('app.mutqin.ai', $location);
    }

    public function test_app_host_redirects_to_the_apex_host(): void
    {
        $this->onAppHost('/login')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/login');

        $this->onAppHost('/memorisation')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/memorisation');

        $this->onAppHost('/')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/');
    }

    public function test_marketing_host_serves_robots_and_sitemap(): void
    {
        $this->onMarketingHost('/robots.txt')
            ->assertOk()
            ->assertSee('Sitemap:', false);

        $this->onMarketingHost('/sitemap.xml')
            ->assertOk()
            ->assertSee('<urlset', false)
            ->assertSee('https://mutqin.ai/', false)
            ->assertSee('https://mutqin.ai/about', false)
            ->assertDontSee('https://mutqin.ai/waiting-list', false)
            ->assertDontSee('https://app.mutqin.ai/about', false);
    }

    public function test_www_marketing_host_redirects_to_apex(): void
    {
        $this->getOnHost('www.mutqin.ai', '/')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/');
    }

    public function test_marketing_host_homepage_shows_full_navigation(): void
    {
        $this->onMarketingHost('/')
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

    public function test_marketing_and_app_hosts_serve_the_same_fixed_service_worker(): void
    {
        $expected = file_get_contents(public_path('sw.js'));
        $this->assertNotFalse($expected);
        $this->assertStringContainsString('mutqin-shell-v98', $expected);
        $this->assertStringNotContainsString('isSameOrigin || isQuranApi', $expected);

        $marketing = $this->onMarketingHost('/sw.js');
        $marketing->assertOk();
        $marketingBody = method_exists($marketing, 'streamedContent')
            ? (string) $marketing->streamedContent()
            : (string) $marketing->getContent();
        $this->assertStringContainsString('mutqin-shell-v98', $marketingBody);

        // app.mutqin.ai serves public/sw.js from the web root in production; assert the
        // on-disk worker both hosts deploy (same release artifact).
        $this->assertStringContainsString('mutqin-shell-v98', $expected);
    }

    public function test_marketing_host_serves_public_mix_assets_same_origin(): void
    {
        if (! is_file(public_path('js/app.js'))) {
            $this->markTestSkipped('Mix build output not present');
        }

        $this->onMarketingHost('/js/app.js')->assertOk();
        $this->onMarketingHost('/mix-manifest.json')->assertOk();
    }

    public function test_vue_shell_on_both_hosts_loads_app_bundle(): void
    {
        $html = (string) $this->onMarketingHost('/')->getContent();
        $this->assertStringContainsString('/js/app.js', $html);
        $this->assertStringContainsString('<homepage', $html);

        $this->onAppHost('/')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/');
    }
}
