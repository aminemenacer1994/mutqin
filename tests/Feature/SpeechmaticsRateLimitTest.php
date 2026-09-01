<?php

namespace Tests\Feature;

use App\Models\User;
use App\Services\SpeechmaticsRateLimit;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SpeechmaticsRateLimitTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
    }

    public function test_transcription_token_allows_requests_below_the_per_user_limit(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 5, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 4; $attempt++) {
            $this->postJson(route('memorisation.transcription-token'))
                ->assertOk()
                ->assertJsonPath('access_token', 'rt-test-token');
        }

        Http::assertSentCount(4);
    }

    public function test_transcription_token_allows_the_exact_per_user_limit(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 3, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($user);

        for ($attempt = 0; $attempt < 3; $attempt++) {
            $this->postJson(route('memorisation.transcription-token'))
                ->assertOk()
                ->assertJsonPath('access_token', 'rt-test-token');
        }

        Http::assertSentCount(3);
    }

    public function test_transcription_token_returns_429_when_per_user_limit_is_exceeded(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 2, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();
        Log::spy();

        $this->actingAs($user);
        $this->postJson(route('memorisation.transcription-token'))->assertOk();
        $this->postJson(route('memorisation.transcription-token'))->assertOk();

        $response = $this->postJson(route('memorisation.transcription-token'));
        $response->assertStatus(429)
            ->assertHeader('Retry-After')
            ->assertJson([
                'available' => false,
                'reason' => SpeechmaticsRateLimit::REASON,
                'message' => SpeechmaticsRateLimit::LEARNER_MESSAGE,
            ])
            ->assertJsonMissingPath('access_token')
            ->assertJsonMissingPath('speechmatics_message');

        $payload = $response->json();
        $this->assertIsInt($payload['retry_after']);
        $this->assertGreaterThan(0, $payload['retry_after']);
        $this->assertStringNotContainsStringIgnoringCase('speechmatics', $payload['message']);
        $this->assertStringNotContainsStringIgnoringCase('api_key', json_encode($payload));

        Http::assertSentCount(2);
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics token rate limit hit.', \Mockery::on(function (array $context) use ($user): bool {
                return ($context['reason'] ?? null) === SpeechmaticsRateLimit::REASON
                    && ($context['user_id'] ?? null) === $user->id
                    && ($context['retry_after'] ?? 0) > 0
                    && ! array_key_exists('ip', $context)
                    && isset($context['ip_fingerprint']);
            }));
    }

    public function test_transcription_token_rate_limit_resets_after_the_window(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 1, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk();

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429)
            ->assertJsonPath('reason', SpeechmaticsRateLimit::REASON);

        $this->travel(61)->seconds();

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');

        Http::assertSentCount(2);
    }

    public function test_transcription_token_rate_limits_are_tracked_separately_per_user(): void
    {
        $first = User::factory()->pro()->create();
        $second = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 1, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($first)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk();

        $this->actingAs($first)
            ->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429);

        $this->actingAs($second)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('access_token', 'rt-test-token');

        Http::assertSentCount(2);
    }

    public function test_failed_upstream_mint_still_consumes_rate_limit_and_blocks_further_provider_calls(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 1, perIp: 50, burst: 10, burstSeconds: 60);
        $this->configureUsageCapDisabled();

        Http::fake([
            'https://mp.speechmatics.com/*' => Http::response(['detail' => 'not authorized'], 401),
        ]);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk()
            ->assertJsonPath('available', false);

        $this->actingAs($user)
            ->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429)
            ->assertJsonPath('reason', SpeechmaticsRateLimit::REASON);

        Http::assertSentCount(1);
    }

    public function test_admin_does_not_bypass_rate_limit_unless_explicitly_configured(): void
    {
        $admin = User::factory()->admin()->create([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 1, perIp: 50, burst: 10, burstSeconds: 60);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->assertTrue($admin->isAdmin());

        $this->actingAs($admin)
            ->postJson(route('memorisation.transcription-token'))
            ->assertOk();

        $this->actingAs($admin)
            ->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429)
            ->assertJsonPath('reason', SpeechmaticsRateLimit::REASON);

        Http::assertSentCount(1);
    }

    public function test_burst_limit_blocks_rapid_duplicate_mints_without_calling_speechmatics(): void
    {
        $user = User::factory()->pro()->create();
        $this->configureSpeechmatics();
        $this->configureRateLimit(perUser: 20, perIp: 50, burst: 2, burstSeconds: 30);
        $this->fakeSuccessfulSpeechmaticsMint();

        $this->actingAs($user);
        $this->postJson(route('memorisation.transcription-token'))->assertOk();
        $this->postJson(route('memorisation.transcription-token'))->assertOk();

        $this->postJson(route('memorisation.transcription-token'))
            ->assertStatus(429)
            ->assertJsonPath('reason', SpeechmaticsRateLimit::REASON);

        Http::assertSentCount(2);
    }

    private function configureSpeechmatics(): void
    {
        config([
            'services.speechmatics.api_key' => 'speechmatics-test-key-123456',
            'services.speechmatics.region' => 'eu',
            'services.speechmatics.token_ttl' => 120,
            'services.speechmatics.usage_cap.enabled' => false,
        ]);
    }

    private function configureUsageCapDisabled(): void
    {
        config(['services.speechmatics.usage_cap.enabled' => false]);
    }

    private function configureRateLimit(int $perUser, int $perIp, int $burst, int $burstSeconds): void
    {
        config([
            'services.speechmatics.rate_limit.enabled' => true,
            'services.speechmatics.rate_limit.per_user_per_minute' => $perUser,
            'services.speechmatics.rate_limit.per_ip_per_minute' => $perIp,
            'services.speechmatics.rate_limit.burst_per_user' => $burst,
            'services.speechmatics.rate_limit.burst_seconds' => $burstSeconds,
            'services.speechmatics.rate_limit.bypass_admin' => false,
            'services.speechmatics.rate_limit.bypass_demo' => false,
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
