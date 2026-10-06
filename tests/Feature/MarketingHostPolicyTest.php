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

    public function test_marketing_root_is_the_homepage_when_app_url_is_marketing(): void
    {
        $this->getOnMarketingHost('/')
            ->assertOk()
            ->assertSee('window.mutqinRestrictMarketingHost = true', false)
            ->assertSee('<homepage', false)
            ->assertSee('class="mutqin-early-access-nav"', false)
            ->assertSee('id="earlyAccessNavbar"', false)
            ->assertDontSee('id="primaryNavbar"', false)
            ->assertDontSee('class="nav-link nav-link-memorisation', false);
    }

    public function test_marketing_host_blocks_homepage_and_public_pages(): void
    {
        $this->getOnMarketingHost('/pricing')
            ->assertRedirect('https://app.mutqin.ai/pricing');

        $this->getOnMarketingHost('/articles')
            ->assertOk()
            ->assertSee('<articles-page', false)
            ->assertSee('Qur&#039;an Memorisation Articles &amp; Guides | Mutqin', false);

        $this->getOnMarketingHost('/articles/how-to-memorise-the-quran-beginners-guide')
            ->assertOk()
            ->assertSee('<article-detail-page', false);

        $response = $this->getOnMarketingHost('/waiting-list');
        $response->assertOk()
            ->assertSee('waiting-list-page', false)
            ->assertSee('mutqinMinimalPublicPage', false)
            ->assertSee('app.mutqin.ai\\/join-waiting-list', false)
            ->assertSee('mutqin-early-access-nav', false)
            ->assertSee('id="earlyAccessNavbar"', false)
            ->assertDontSee('id="primaryNavbar"', false)
            ->assertDontSee('href="'.route('memorisation').'"', false)
            ->assertDontSee('href="'.route('login').'"', false)
            ->assertDontSee('href="'.route('register').'"', false)
            ->assertDontSee('admin/waiting-list', false);
    }

    public function test_marketing_host_admin_waiting_list_redirects_to_app(): void
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
        $this->assertSame(
            'https://app.mutqin.ai/admin/waiting-list',
            (string) $response->headers->get('Location')
        );
    }

}
