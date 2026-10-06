<?php

namespace Tests\Feature;

use App\Support\Ackee;
use Illuminate\Contracts\Http\Kernel as HttpKernel;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class AckeeAnalyticsTest extends TestCase
{
    use RefreshDatabase;

    private const WEBSITE_ID = '11111111-1111-4111-8111-111111111111';

    private const APP_ID = '22222222-2222-4222-8222-222222222222';

    private const EVENT_ID = '33333333-3333-4333-8333-333333333333';

    /**
     * @return array<string, mixed>
     */
    private function enabledConfig(): array
    {
        return [
            'services.ackee.enabled' => true,
            'services.ackee.allow_localhost' => true,
            'services.ackee.server' => 'https://analytics.mutqin.ai',
            'services.ackee.domain_id_website' => self::WEBSITE_ID,
            'services.ackee.domain_id_app' => self::APP_ID,
            'services.ackee.event_id' => self::EVENT_ID,
        ];
    }

    public function test_ackee_config_is_disabled_by_default_in_testing(): void
    {
        $this->get(route('login'))
            ->assertOk()
            ->assertSee('window.mutqinAckee', false)
            ->assertSee('"enabled":false', false);
    }

    public function test_ackee_config_is_injected_when_enabled(): void
    {
        config($this->enabledConfig());

        $this->get(route('login'))
            ->assertOk()
            ->assertSee('window.mutqinAckee', false)
            ->assertSee(self::APP_ID, false)
            ->assertSee('analytics.mutqin.ai', false)
            ->assertSee(self::EVENT_ID, false);
    }

    public function test_invalid_server_and_ids_are_rejected(): void
    {
        config([
            'services.ackee.enabled' => true,
            'services.ackee.allow_localhost' => true,
            'services.ackee.server' => 'javascript:alert(1)',
            'services.ackee.domain_id_website' => 'not-a-uuid',
            'services.ackee.domain_id_app' => '"><script>alert(1)</script>',
            'services.ackee.event_id' => 'nope',
        ]);

        $html = $this->get(route('login'))->assertOk()->getContent();

        $this->assertStringContainsString('window.mutqinAckee', $html);
        $this->assertStringContainsString('"enabled":false', $html);
        $this->assertStringNotContainsString('<script>alert(1)</script>', $html);
        $this->assertStringNotContainsString('javascript:alert(1)', $html);
    }

    public function test_embed_requests_disable_ackee(): void
    {
        config($this->enabledConfig());

        $this->get(route('login', ['mutqin_embed' => 1]))
            ->assertOk()
            ->assertSee('"enabled":false', false);
    }

    public function test_marketing_host_uses_website_domain_id(): void
    {
        config(array_merge($this->enabledConfig(), [
            'mutqin.domains.enable_in_tests' => true,
            'app.url' => 'https://app.mutqin.ai',
        ]));

        $this->assertSame(self::WEBSITE_ID, Ackee::domainIdForHost('mutqin.ai'));
        $this->assertSame(self::APP_ID, Ackee::domainIdForHost('app.mutqin.ai'));
    }

    public function test_error_pages_include_ackee_config_when_enabled(): void
    {
        config($this->enabledConfig());

        $html = view('errors.404')->render();

        $this->assertStringContainsString('window.mutqinAckee', $html);
        $this->assertStringContainsString(self::APP_ID, $html);
    }

    public function test_localhost_is_disabled_unless_allowed(): void
    {
        config([
            'services.ackee.enabled' => true,
            'services.ackee.allow_localhost' => false,
            'services.ackee.server' => 'https://analytics.mutqin.ai',
            'services.ackee.domain_id_app' => self::APP_ID,
        ]);

        $kernel = $this->app->make(HttpKernel::class);
        $request = Request::create('/login', 'GET', [], [], [], [
            'HTTP_HOST' => 'localhost',
            'SERVER_NAME' => 'localhost',
        ]);
        $response = $kernel->handle($request);
        $kernel->terminate($request, $response);
        $html = $response->getContent();

        $this->assertStringContainsString('"enabled":false', $html);
    }

    public function test_local_docker_http_server_is_accepted(): void
    {
        $this->assertSame('http://127.0.0.1:3000', Ackee::sanitiseServer('http://127.0.0.1:3000/'));
        $this->assertSame('http://localhost:3000', Ackee::sanitiseServer('http://localhost:3000'));
        $this->assertSame('', Ackee::sanitiseServer('http://evil.example/'));
    }
}
