<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class ErrorTrackingTest extends TestCase
{
    use RefreshDatabase;

    public function test_web_and_api_responses_include_request_id(): void
    {
        $this->get('/')->assertOk()->assertHeader('X-Request-Id');

        $user = User::factory()->create();
        $response = $this->actingAs($user)->getJson('/api/dashboard');
        $response->assertOk()->assertHeader('X-Request-Id');
        $this->assertMatchesRegularExpression('/^[A-Za-z0-9._-]{8,80}$/', (string) $response->headers->get('X-Request-Id'));
    }

    public function test_probe_is_available_outside_production_and_returns_friendly_json(): void
    {
        config(['app.debug' => false]);

        $response = $this->getJson('/internal/error-test');

        $response->assertStatus(500)
            ->assertHeader('X-Request-Id')
            ->assertJsonPath('message', __('ui.error_message'))
            ->assertJsonMissingPath('exception')
            ->assertJsonMissingPath('trace')
            ->assertJsonStructure(['message', 'request_id']);

        $this->assertStringNotContainsString('ErrorTrackingProbeException', $response->getContent());
        $this->assertStringNotContainsString('storage/logs', $response->getContent());
    }

    public function test_probe_is_hidden_in_production_except_for_admins(): void
    {
        $this->app['env'] = 'production';
        config(['app.env' => 'production', 'app.debug' => false]);

        $this->get('/internal/error-test')->assertNotFound();
        $this->getJson('/internal/error-test')->assertNotFound();

        config(['mutqin.admin_emails' => ['admin@example.com']]);
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);

        $this->actingAs($admin)
            ->getJson('/internal/error-test')
            ->assertStatus(500)
            ->assertJsonPath('message', __('ui.error_message'));
    }

    public function test_probe_can_be_disabled(): void
    {
        config(['error_tracking.probe_enabled' => false]);

        $this->get('/internal/error-test')->assertNotFound();
    }

    public function test_probe_is_reported_once_as_a_real_exception(): void
    {
        $reported = [];
        Log::listen(function ($message) use (&$reported): void {
            if ($message->message === 'exception.reported') {
                $reported[] = $message->context;
            }
        });

        $this->getJson('/internal/error-test')->assertStatus(500);

        $this->assertCount(1, $reported);
        $this->assertSame('error_tracking', $reported[0]['feature'] ?? null);
        $this->assertTrue($reported[0]['probe'] ?? false);
        $this->assertArrayHasKey('request_id', $reported[0]);
        $this->assertArrayNotHasKey('user_id', $reported[0]);
        $this->assertArrayNotHasKey('password', $reported[0]);
        $this->assertArrayNotHasKey('email', $reported[0]);
    }

    public function test_validation_errors_are_not_reported_as_exceptions(): void
    {
        $reported = [];
        Log::listen(function ($message) use (&$reported): void {
            if ($message->message === 'exception.reported') {
                $reported[] = $message->context;
            }
        });

        $user = User::factory()->create();
        $this->actingAs($user)->postJson('/api/state', [])->assertStatus(422);

        $this->assertSame([], $reported);
    }

    public function test_client_errors_are_recorded_after_sanitization(): void
    {
        $recorded = [];
        Log::listen(function ($message) use (&$recorded): void {
            if ($message->message === 'client.exception.reported') {
                $recorded[] = $message->context;
            }
        });

        $user = User::factory()->create();
        $response = $this->actingAs($user)->postJson('/api/client-errors', [
            'name' => 'TypeError',
            'message' => 'Unexpected client failure',
            'kind' => 'vue',
            'feature' => 'memorisation',
            'status' => 503,
            'latency_ms' => 42,
            'request_id' => '11111111-1111-1111-1111-111111111111',
            'meta' => [
                'access_token' => 'super-secret-token',
                'raw_audio' => 'data:audio/webm;base64,AAAA',
                'method' => 'GET',
            ],
        ]);

        $response->assertOk()
            ->assertJsonPath('recorded', true)
            ->assertHeader('X-Request-Id');

        $this->assertCount(1, $recorded);
        $this->assertSame('memorisation', $recorded[0]['feature'] ?? null);
        $this->assertSame($user->id, $recorded[0]['user_id'] ?? null);
        $this->assertSame('[redacted]', $recorded[0]['meta']['access_token'] ?? null);
        $this->assertSame('[redacted]', $recorded[0]['meta']['raw_audio'] ?? null);
        $this->assertSame('GET', $recorded[0]['meta']['method'] ?? null);
        $encoded = json_encode($recorded[0]);
        $this->assertStringNotContainsString('super-secret-token', (string) $encoded);
        $this->assertStringNotContainsString('data:audio', (string) $encoded);
    }

    public function test_client_error_ingest_rejects_oversized_payloads(): void
    {
        $this->postJson('/api/client-errors', [
            'message' => str_repeat('x', 2000),
        ])->assertStatus(422);
    }
}
