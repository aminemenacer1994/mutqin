<?php

namespace Tests\Unit;

use App\Support\MutqinDomains;
use Illuminate\Http\Request;
use Tests\TestCase;

class MutqinDomainsTest extends TestCase
{
    public function test_host_routing_disabled_when_hosts_match(): void
    {
        config([
            'app.url' => 'http://localhost:8000',
            'mutqin.domains.marketing_host' => 'localhost',
            'mutqin.domains.app_host' => 'localhost',
            'mutqin.domains.force_enabled' => false,
            'mutqin.domains.force_disabled' => false,
        ]);

        $this->assertFalse(MutqinDomains::hostRoutingEnabled());
    }

    public function test_host_routing_enabled_when_production_hosts_differ(): void
    {
        config([
            'app.url' => 'https://app.mutqin.ai',
            'mutqin.domains.marketing_host' => 'mutqin.ai',
            'mutqin.domains.app_host' => 'app.mutqin.ai',
            'mutqin.domains.force_enabled' => true,
            'mutqin.domains.force_disabled' => false,
        ]);

        $this->assertTrue(MutqinDomains::hostRoutingEnabled());
    }

    public function test_app_url_builds_from_app_url_config(): void
    {
        config(['app.url' => 'https://app.mutqin.ai']);

        $this->assertSame('https://app.mutqin.ai/register', MutqinDomains::appUrl('/register'));
    }

    public function test_app_host_defaults_to_app_subdomain_when_app_url_is_marketing(): void
    {
        config([
            'app.url' => 'https://mutqin.ai',
            'mutqin.domains.marketing_host' => 'mutqin.ai',
            'mutqin.domains.app_host' => 'app.mutqin.ai',
        ]);

        $this->assertSame('app.mutqin.ai', MutqinDomains::appHost());
    }

    public function test_app_host_homepage_does_not_use_early_access_nav(): void
    {
        $this->enableSplitHosts();

        $request = Request::create('https://app.mutqin.ai/', 'GET', [], [], [], [
            'HTTP_HOST' => 'app.mutqin.ai',
            'HTTPS' => 'on',
        ]);

        $this->assertFalse(MutqinDomains::usesEarlyAccessNav($request));
    }

    public function test_marketing_host_homepage_uses_early_access_nav(): void
    {
        $this->enableSplitHosts();

        $request = Request::create('https://mutqin.ai/', 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
        ]);

        $this->assertTrue(MutqinDomains::usesEarlyAccessNav($request));
    }

    public function test_waiting_list_uses_early_access_nav_on_both_hosts(): void
    {
        $this->enableSplitHosts();

        $appRequest = Request::create('https://app.mutqin.ai/waiting-list', 'GET', [], [], [], [
            'HTTP_HOST' => 'app.mutqin.ai',
            'HTTPS' => 'on',
        ]);
        $marketingRequest = Request::create('https://mutqin.ai/waiting-list', 'GET', [], [], [], [
            'HTTP_HOST' => 'mutqin.ai',
            'HTTPS' => 'on',
        ]);

        $this->assertTrue(MutqinDomains::usesEarlyAccessNav($appRequest));
        $this->assertTrue(MutqinDomains::usesEarlyAccessNav($marketingRequest));
    }

    private function enableSplitHosts(): void
    {
        config([
            'app.url' => 'https://app.mutqin.ai',
            'mutqin.domains.marketing_host' => 'mutqin.ai',
            'mutqin.domains.app_host' => 'app.mutqin.ai',
            'mutqin.domains.enable_in_tests' => true,
            'mutqin.domains.force_disabled' => false,
        ]);
    }
}
