<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SpeechmaticsTranscriptionTokenTest extends TestCase
{
    use RefreshDatabase;

    public function test_transcription_token_returns_soft_unavailable_payload_when_api_key_is_missing(): void
    {
        $user = User::factory()->create();

        config([
            'services.speechmatics.api_key' => '',
            'services.speechmatics.region' => 'eu',
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'available' => false,
                'message' => 'Speechmatics API key is not configured.',
                'speechmatics_status' => 422,
            ]);
    }

    public function test_transcription_token_returns_soft_unavailable_payload_when_upstream_rejects_the_key(): void
    {
        $user = User::factory()->create();

        config([
            'services.speechmatics.api_key' => 'speechmatics-test-key-123456',
            'services.speechmatics.region' => 'eu',
        ]);

        Http::fake([
            'https://mp.speechmatics.com/*' => Http::response([
                'detail' => 'not authorized',
            ], 401),
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'available' => false,
                'message' => 'Speechmatics rejected the configured server key for temporary token creation.',
                'speechmatics_status' => 401,
            ]);

        Http::assertSentCount(1);
    }
}
