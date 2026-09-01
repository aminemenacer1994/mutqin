<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SpeechmaticsUsageCap;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SpeechmaticsTranscriptionTokenTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_transcription_token_returns_soft_unavailable_payload_when_api_key_is_missing(): void
    {
        $user = User::factory()->pro()->create();

        config([
            'services.speechmatics.api_key' => '',
            'services.speechmatics.region' => 'eu',
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'available' => false,
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => 422,
            ]);
    }

    public function test_transcription_token_returns_soft_unavailable_payload_when_upstream_rejects_the_key(): void
    {
        $user = User::factory()->pro()->create();

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
                'reason' => 'unavailable',
                'message' => SpeechmaticsUsageCap::LEARNER_UNAVAILABLE,
                'speechmatics_status' => 401,
            ]);

        Http::assertSentCount(1);
    }

    public function test_transcription_token_allows_a_normal_session_burst_under_the_rate_limit(): void
    {
        $user = User::factory()->pro()->create();

        config([
            'services.speechmatics.api_key' => 'speechmatics-test-key-123456',
            'services.speechmatics.region' => 'eu',
            'services.speechmatics.usage_cap.enabled' => false,
            'services.speechmatics.rate_limit.enabled' => true,
            'services.speechmatics.rate_limit.per_user_per_minute' => 10,
            'services.speechmatics.rate_limit.per_ip_per_minute' => 30,
            'services.speechmatics.rate_limit.burst_per_user' => 5,
            'services.speechmatics.rate_limit.burst_seconds' => 10,
        ]);

        Http::fake([
            'https://mp.speechmatics.com/*' => Http::response([
                'key_value' => 'rt-test-token',
            ], 201),
        ]);

        $this->actingAs($user);

        // Legitimate AMD start + soft-recover remints stay under the configured burst.
        for ($attempt = 0; $attempt < 5; $attempt++) {
            $this->postJson(route('memorisation.transcription-token'))
                ->assertOk()
                ->assertJson([
                    'access_token' => 'rt-test-token',
                    'websocket_host' => 'eu.rt.speechmatics.com',
                ]);
        }

        Http::assertSentCount(5);
    }

    public function test_transcription_token_is_minted_while_under_the_usage_cap(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureUsageCap(userMints: 3, globalMints: 10);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'access_token' => 'rt-test-token',
                'expires_in' => 120,
                'websocket_host' => 'eu.rt.speechmatics.com',
            ])
            ->assertJsonMissing(['reason' => SpeechmaticsUsageCap::REASON]);

        Http::assertSentCount(1);
    }

    public function test_transcription_token_is_blocked_when_the_user_daily_cap_is_exceeded(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureUsageCap(userMints: 2, globalMints: 50);
        $this->fakeSuccessfulSpeechmaticsMint();
        Log::spy();

        $this->actingAs($user);
        $this->postJson(route('memorisation.transcription-token'))->assertOk()->assertJsonPath('access_token', 'rt-test-token');
        $this->postJson(route('memorisation.transcription-token'))->assertOk()->assertJsonPath('access_token', 'rt-test-token');

        $response = $this->postJson(route('memorisation.transcription-token'));
        $response->assertOk()
            ->assertJson([
                'available' => false,
                'reason' => SpeechmaticsUsageCap::REASON,
                'message' => SpeechmaticsUsageCap::LEARNER_USER_MESSAGE,
                'speechmatics_status' => 429,
            ])
            ->assertJsonMissingPath('speechmatics_message')
            ->assertJsonMissingPath('configured_key_suffix');

        $payload = $response->json();
        $this->assertSame(SpeechmaticsUsageCap::LEARNER_USER_MESSAGE, $payload['message']);
        $this->assertStringNotContainsStringIgnoringCase('speechmatics', $payload['message']);
        $this->assertStringNotContainsStringIgnoringCase('api_key', json_encode($payload));
        $this->assertStringNotContainsStringIgnoringCase('token_mints', json_encode($payload));
        $this->assertArrayNotHasKey('limit', $payload);
        $this->assertArrayNotHasKey('used', $payload);

        Http::assertSentCount(2);
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap reached.', \Mockery::on(function (array $context) use ($user): bool {
                return ($context['scope'] ?? null) === 'user'
                    && ($context['user_id'] ?? null) === $user->id
                    && ($context['limit'] ?? null) === 2;
            }));
    }

    public function test_transcription_token_is_blocked_when_the_global_daily_cap_is_exceeded(): void
    {
        $first = User::factory()->pro()->create();
        $second = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureUsageCap(userMints: 20, globalMints: 1);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($first)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');

        $this->actingAs($second)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'available' => false,
                'reason' => SpeechmaticsUsageCap::REASON,
                'message' => SpeechmaticsUsageCap::LEARNER_GLOBAL_MESSAGE,
            ]);

        Http::assertSentCount(1);
    }

    public function test_failed_upstream_mint_does_not_consume_usage_cap(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureUsageCap(userMints: 1, globalMints: 1);

        Http::fake([
            'https://mp.speechmatics.com/*' => Http::sequence()
                ->push(['detail' => 'not authorized'], 401)
                ->push(['key_value' => 'rt-test-token'], 201),
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');
    }

    public function test_misconfigured_usage_cap_fails_open_without_leaking_config(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        config([
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => 'unlimited-please',
            'services.speechmatics.usage_cap.daily_global_token_mints' => -1,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => 0,
            'services.speechmatics.usage_cap.daily_global_session_minutes' => '',
        ]);
        $this->fakeSuccessfulSpeechmaticsMint();
        Log::spy();

        $response = $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'));

        $response->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token')
            ->assertJsonMissing(['reason' => SpeechmaticsUsageCap::REASON]);

        $this->assertStringNotContainsStringIgnoringCase('unlimited-please', json_encode($response->json()));
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap misconfigured.', \Mockery::type('array'));
    }

    public function test_transcription_token_is_blocked_when_emergency_global_cap_is_exceeded(): void
    {
        $first = User::factory()->pro()->create();
        $second = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureUsageCap(userMints: 20, globalMints: 10);
        config(['services.speechmatics.usage_cap.emergency_global_token_mints' => 1]);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($first)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');

        $this->actingAs($second)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJson([
                'available' => false,
                'reason' => SpeechmaticsUsageCap::REASON,
                'message' => SpeechmaticsUsageCap::LEARNER_GLOBAL_MESSAGE,
            ]);

        Http::assertSentCount(1);
    }

    private function configureSpeechmatics(): void
    {
        config([
            'services.speechmatics.api_key' => 'speechmatics-test-key-123456',
            'services.speechmatics.region' => 'eu',
            'services.speechmatics.token_ttl' => 120,
        ]);
    }

    private function configureUsageCap(int $userMints, int $globalMints): void
    {
        config([
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => $userMints,
            'services.speechmatics.usage_cap.daily_global_token_mints' => $globalMints,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => null,
            'services.speechmatics.usage_cap.daily_global_session_minutes' => null,
        ]);
    }

    private function fakeSuccessfulSpeechmaticsMint(): void
    {
        Http::fake([
            'https://mp.speechmatics.com/*' => Http::response([
                'key_value' => 'rt-test-token',
            ], 201),
        ]);
    }
}
