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

    public function test_marketing_host_root_and_waiting_list_are_the_only_public_pages(): void
    {
        $this->onMarketingHost('/')
            ->assertOk()
            ->assertSee('<homepage', false);

        $this->onMarketingHost('/waiting-list')
            ->assertOk()
            ->assertSee('waiting-list-page', false);
    }

    public function test_marketing_host_redirects_other_public_pages_to_app_host(): void
    {
        $this->onMarketingHost('/pricing')
            ->assertRedirect('https://app.mutqin.ai/pricing');

        $this->onMarketingHost('/about')
            ->assertRedirect('https://app.mutqin.ai/about');
    }

    public function test_marketing_host_redirects_application_paths_to_app_host(): void
    {
        $this->onMarketingHost('/login')
            ->assertRedirect('https://app.mutqin.ai/login');

        $this->onMarketingHost('/memorisation')
            ->assertRedirect('https://app.mutqin.ai/memorisation');

        $this->onMarketingHost('/admin/waiting-list')
            ->assertRedirect('https://app.mutqin.ai/admin/waiting-list');
    }

    public function test_app_host_keeps_login_and_memorisation_routes(): void
    {
        $this->onAppHost('/login')
            ->assertOk();

        $this->onAppHost('/memorisation/demo')
            ->assertOk();
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
            ->assertSee('https://app.mutqin.ai/about', false)
            ->assertSee('https://mutqin.ai/waiting-list', false);
    }

    public function test_www_marketing_host_redirects_to_apex(): void
    {
        $this->getOnHost('www.mutqin.ai', '/')
            ->assertStatus(301)
            ->assertRedirect('https://mutqin.ai/');
    }

    public function test_app_host_homepage_shows_full_navigation(): void
    {
        $this->onAppHost('/')
            ->assertOk()
            ->assertSee('<homepage', false)
            ->assertSee('id="primaryNavbar"', false)
            ->assertSee('class="nav-link nav-link-memorisation', false)
            ->assertSee('class="nav-link nav-link-home', false)
            ->assertDontSee('class="mutqin-early-access-nav"', false)
            ->assertDontSee('id="earlyAccessNavbar"', false);
    }
}
