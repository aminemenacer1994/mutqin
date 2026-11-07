<?php

namespace Tests\Feature;

use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Http\Request;
use Illuminate\Testing\TestResponse;
use Tests\TestCase;

/**
 * Waiting-list-only policy must work even when APP_URL equals the marketing domain
 * (common after Laravel Cloud adds mutqin.ai as a custom domain).
 */
class MarketingHostPolicyTest extends TestCase
{
    protected function setUp(): void
    {
        parent::setUp();

        config([
            'app.url' => 'https://mutqin.ai',
            'mutqin.domains.enable_in_tests' => true,
            'mutqin.domains.force_disabled' => false,
        ]);
    }

    private function getOnMarketingHost(string $path): TestResponse
    {
        $path = '/'.ltrim($path, '/');
        $kernel = $this->app->make(HttpKernel::class);
        $request = Request::create($path, 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
            'SERVER_NAME' => 'mutqin.ai',
        ]);
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);

        return $this->createTestResponse($response, $request);
    }

    public function test_marketing_root_is_the_full_application_homepage(): void
    {
        $this->getOnMarketingHost('/')
            ->assertOk()
            ->assertSee('window.mutqinRestrictMarketingHost = false', false)
            ->assertSee('<homepage', false)
            ->assertSee('Available now:', false)
            ->assertSee('Start your first session', false)
            ->assertDontSee('Early access:', false)
            ->assertDontSee('Join the waiting list', false)
            ->assertSee('id="primaryNavbar"', false)
            ->assertSee('class="nav-link nav-link-memorisation', false)
            ->assertDontSee('class="mutqin-early-access-nav"', false)
            ->assertDontSee('id="earlyAccessNavbar"', false);
    }

    public function test_marketing_host_serves_public_pages_and_blocks_waiting_list(): void
    {
        $this->getOnMarketingHost('/pricing')
            ->assertOk();

        config(['mutqin.show_articles' => true]);
        $this->getOnMarketingHost('/articles')
            ->assertOk()
            ->assertSee('<articles-page', false);

        config(['mutqin.show_articles' => false]);
        $this->getOnMarketingHost('/articles')
            ->assertNotFound();

        $this->getOnMarketingHost('/waiting-list')
            ->assertRedirect('/');
    }

    public function test_marketing_host_admin_waiting_list_stays_on_mutqin_ai(): void
    {
        $kernel = $this->app->make(HttpKernel::class);
        $request = Request::create('/admin/waiting-list', 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
            'SERVER_NAME' => 'mutqin.ai',
        ]);
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);

        $this->assertTrue($response->isRedirection());
        $location = (string) $response->headers->get('Location');
        $this->assertStringContainsString('/login', $location);
        $this->assertStringContainsString('mutqin.ai', $location);
    }

}
