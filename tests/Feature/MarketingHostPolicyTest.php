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

    public function test_marketing_root_redirects_to_waiting_list_when_app_url_is_marketing(): void
    {
        $this->getOnMarketingHost('/')
            ->assertRedirect('/waiting-list');
    }

    public function test_marketing_host_blocks_homepage_and_public_pages(): void
    {
        $this->getOnMarketingHost('/pricing')
            ->assertRedirect('https://app.mutqin.ai/pricing');

        $this->getOnMarketingHost('/waiting-list')
            ->assertOk()
            ->assertSee('waiting-list-page', false);
    }
}
