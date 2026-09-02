<?php

namespace Tests\Unit;

use App\Services\Health\HealthCheckService;
use App\Support\Monitoring\HealthHeartbeat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class HealthCheckServiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_speechmatics_unconfigured_does_not_fail_overall_status(): void
    {
        config([
            'queue.default' => 'sync',
            'services.speechmatics.api_key' => '',
            'services.speechmatics.region' => '',
        ]);

        app(HealthHeartbeat::class)->touch(HealthHeartbeat::KIND_SCHEDULER);

        $result = app(HealthCheckService::class)->run(true);

        $this->assertSame('ok', $result['status']);
        $this->assertSame('skipped', $result['checks']['speechmatics']['status']);
    }

    public function test_speechmatics_misconfiguration_is_degraded_only(): void
    {
        config([
            'queue.default' => 'sync',
            'services.speechmatics.api_key' => 'present',
            'services.speechmatics.region' => '',
        ]);

        app(HealthHeartbeat::class)->touch(HealthHeartbeat::KIND_SCHEDULER);

        $result = app(HealthCheckService::class)->run(true);

        $this->assertSame('degraded', $result['status']);
        $this->assertSame('degraded', $result['checks']['speechmatics']['status']);
        $this->assertSame('misconfigured', $result['checks']['speechmatics']['code']);
    }
}
