<?php

namespace Tests\Feature;

use App\Jobs\RecordWorkerHeartbeatJob;
use App\Models\User;
use App\Support\Monitoring\HealthHeartbeat;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Queue;
use Tests\TestCase;

class HealthMonitoringTest extends TestCase
{
    use RefreshDatabase;

    public function test_public_health_returns_minimal_status_payload(): void
    {
        $this->seedFreshHeartbeats();

        $response = $this->getJson('/health');

        $response->assertOk()
            ->assertExactJson(['status' => 'ok']);

        $cacheControl = strtolower((string) $response->headers->get('Cache-Control'));
        $this->assertStringContainsString('no-store', $cacheControl);

        $this->assertStringNotContainsString('database', $response->getContent());
        $this->assertStringNotContainsString('password', $response->getContent());
        $this->assertStringNotContainsString('exception', $response->getContent());
    }

    public function test_public_health_stays_up_when_only_speechmatics_is_misconfigured(): void
    {
        $this->seedFreshHeartbeats();
        config([
            'services.speechmatics.api_key' => 'test-key',
            'services.speechmatics.region' => '',
        ]);

        $response = $this->getJson('/health');

        $response->assertOk()->assertExactJson(['status' => 'degraded']);
    }

    public function test_missing_scheduler_heartbeat_is_degraded_not_unavailable(): void
    {
        config(['queue.default' => 'sync']);

        $response = $this->getJson('/health');

        $response->assertOk()->assertExactJson(['status' => 'degraded']);
    }

    public function test_internal_health_includes_safe_check_codes(): void
    {
        $this->seedFreshHeartbeats();

        $response = $this->getJson('/internal/health');

        $response->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonStructure([
                'status',
                'checks' => [
                    'database' => ['status'],
                    'cache' => ['status'],
                    'redis' => ['status'],
                    'scheduler' => ['status'],
                    'queue_worker' => ['status'],
                    'storage' => ['status'],
                    'speechmatics' => ['status'],
                ],
            ]);

        $body = $response->getContent();
        $this->assertStringNotContainsString('DB_PASSWORD', $body);
        $this->assertStringNotContainsString('127.0.0.1', $body);
        $this->assertStringNotContainsString('SPEECHMATICS_API_KEY', $body);
        $this->assertStringNotContainsString('stack', strtolower($body));
    }

    public function test_internal_health_is_hidden_in_production_except_admin_or_token(): void
    {
        $this->app['env'] = 'production';
        config(['app.env' => 'production', 'monitoring.internal_token' => 'secret-token']);

        $this->getJson('/internal/health')->assertNotFound();

        $this->getJson('/internal/health', [
            'X-Mutqin-Monitoring-Token' => 'wrong',
        ])->assertNotFound();

        $this->getJson('/internal/health', [
            'X-Mutqin-Monitoring-Token' => 'secret-token',
        ])->assertOk();

        config(['mutqin.admin_emails' => ['admin@example.com']]);
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)->getJson('/internal/health')->assertOk();
    }

    public function test_alert_test_emits_log_outside_production(): void
    {
        $reported = [];
        Log::listen(function ($message) use (&$reported): void {
            if ($message->message === 'monitoring.alert_test') {
                $reported[] = $message->context;
            }
        });

        $this->getJson('/internal/alert-test')
            ->assertOk()
            ->assertJsonPath('status', 'ok')
            ->assertJsonPath('logged', true);

        $this->assertCount(1, $reported);
        $this->assertTrue($reported[0]['probe'] ?? false);
        $this->assertSame('monitoring', $reported[0]['feature'] ?? null);
    }

    public function test_alert_test_is_unavailable_in_production(): void
    {
        $this->app['env'] = 'production';
        config(['app.env' => 'production', 'monitoring.internal_token' => 'secret-token']);

        $this->getJson('/internal/alert-test')->assertNotFound();
        $this->getJson('/internal/alert-test', [
            'X-Mutqin-Monitoring-Token' => 'secret-token',
        ])->assertNotFound();
    }

    public function test_health_heartbeat_command_records_scheduler_and_dispatches_worker_job(): void
    {
        config(['queue.default' => 'database']);
        Queue::fake();

        $this->artisan('mutqin:health-heartbeat')->assertSuccessful();

        $status = app(HealthHeartbeat::class)->status(
            HealthHeartbeat::KIND_SCHEDULER,
            180
        );
        $this->assertSame('ok', $status['status']);

        Queue::assertPushed(RecordWorkerHeartbeatJob::class);
    }

    public function test_laravel_shallow_up_endpoint_still_works(): void
    {
        $this->get('/up')->assertOk();
    }

    private function seedFreshHeartbeats(): void
    {
        config(['queue.default' => 'sync']);
        $heartbeats = app(HealthHeartbeat::class);
        $heartbeats->touch(HealthHeartbeat::KIND_SCHEDULER);
        // Worker check is skipped for sync; touch anyway for clarity.
        $heartbeats->touch(HealthHeartbeat::KIND_WORKER);
    }
}
