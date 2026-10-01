<?php

namespace Tests\Unit;

use App\Support\MutqinDomains;
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
}
