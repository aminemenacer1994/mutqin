<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class MutqinApiLoggingTest extends TestCase
{
    use RefreshDatabase;

    public function test_api_requests_emit_structured_log_and_request_id_header(): void
    {
        Log::spy();

        $user = User::factory()->create();

        $response = $this->actingAs($user)->getJson('/api/dashboard');

        $response->assertOk();
        $response->assertHeader('X-Request-Id');

        Log::shouldHaveReceived('info')
            ->once()
            ->with('api.request.completed', \Mockery::on(function (array $context): bool {
                return ($context['service'] ?? null) === 'mutqin'
                    && ($context['path'] ?? null) === 'api/dashboard'
                    && isset($context['duration_ms']);
            }));
    }

    public function test_state_poll_skips_structured_request_log(): void
    {
        Log::spy();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/state')
            ->assertOk()
            ->assertHeader('X-Request-Id');

        Log::shouldNotHaveReceived('info', ['api.request.completed']);
    }

    public function test_session_current_poll_skips_structured_request_log(): void
    {
        Log::spy();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->getJson('/api/session/current')
            ->assertOk()
            ->assertHeader('X-Request-Id');

        Log::shouldNotHaveReceived('info', ['api.request.completed']);
    }

    public function test_state_autosave_still_emits_structured_request_log(): void
    {
        Log::spy();

        $user = User::factory()->create();

        $this->actingAs($user)
            ->postJson('/api/state', [
                'state' => ['sessionState' => ['queue' => [], 'current_index' => 0]],
                'meta' => ['device_id' => 'log-test'],
            ])
            ->assertOk()
            ->assertHeader('X-Request-Id');

        Log::shouldHaveReceived('info')
            ->with('api.request.completed', \Mockery::on(function (array $context): bool {
                return ($context['path'] ?? null) === 'api/state'
                    && ($context['method'] ?? null) === 'POST';
            }));
    }
}
