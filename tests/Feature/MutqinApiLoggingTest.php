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
}
