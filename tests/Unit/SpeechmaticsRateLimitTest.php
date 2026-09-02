<?php

namespace Tests\Unit;

use App\Models\User;
use App\Services\SpeechmaticsRateLimit;
use Illuminate\Cache\RateLimiting\Limit;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;
use Tests\TestCase;

class SpeechmaticsRateLimitTest extends TestCase
{
    private SpeechmaticsRateLimit $limiter;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        $this->limiter = app(SpeechmaticsRateLimit::class);
    }

    public function test_is_enabled_defaults_to_true_and_accepts_common_truthy_values(): void
    {
        config(['services.speechmatics.rate_limit.enabled' => true]);
        $this->assertTrue($this->limiter->isEnabled());

        config(['services.speechmatics.rate_limit.enabled' => 'on']);
        $this->assertTrue($this->limiter->isEnabled());

        config(['services.speechmatics.rate_limit.enabled' => '0']);
        $this->assertFalse($this->limiter->isEnabled());

        config(['services.speechmatics.rate_limit.enabled' => false]);
        $this->assertFalse($this->limiter->isEnabled());
    }

    public function test_admin_and_demo_do_not_bypass_unless_flags_are_explicitly_enabled(): void
    {
        $admin = User::factory()->admin()->make([
            'email' => 'admin@example.com',
            'email_verified_at' => now(),
        ]);
        config(['mutqin.admin_emails' => ['admin@example.com']]);

        $demo = User::factory()->make([
            'email' => 'fatima.reviser@mutqin.test',
        ]);

        config([
            'services.speechmatics.rate_limit.bypass_admin' => false,
            'services.speechmatics.rate_limit.bypass_demo' => false,
        ]);

        $this->assertTrue($admin->isAdmin());
        $this->assertFalse($this->limiter->shouldBypass($admin));
        $this->assertFalse($this->limiter->shouldBypass($demo));
        $this->assertFalse($this->limiter->shouldBypass(null));

        config(['services.speechmatics.rate_limit.bypass_admin' => true]);
        $this->assertTrue($this->limiter->shouldBypass($admin));
        $this->assertFalse($this->limiter->shouldBypass($demo));

        config([
            'services.speechmatics.rate_limit.bypass_admin' => false,
            'services.speechmatics.rate_limit.bypass_demo' => true,
        ]);
        $this->assertFalse($this->limiter->shouldBypass($admin));
        $this->assertTrue($this->limiter->shouldBypass($demo));
    }

    public function test_limits_for_include_user_burst_minute_and_ip_safeguard(): void
    {
        $user = User::factory()->make(['id' => 42]);
        $request = Request::create('/memorisation/transcription-token', 'POST', server: [
            'REMOTE_ADDR' => '203.0.113.10',
        ]);
        $request->setUserResolver(fn () => $user);

        config([
            'services.speechmatics.rate_limit.enabled' => true,
            'services.speechmatics.rate_limit.bypass_admin' => false,
            'services.speechmatics.rate_limit.bypass_demo' => false,
            'services.speechmatics.rate_limit.per_user_per_minute' => 10,
            'services.speechmatics.rate_limit.per_ip_per_minute' => 30,
            'services.speechmatics.rate_limit.burst_per_user' => 3,
            'services.speechmatics.rate_limit.burst_seconds' => 10,
        ]);

        $limits = $this->limiter->limitsFor($request);

        $this->assertIsArray($limits);
        $this->assertCount(3, $limits);
        $this->assertContainsOnlyInstancesOf(Limit::class, $limits);
        $this->assertSame(3, $limits[0]->maxAttempts);
        $this->assertSame(10, $limits[0]->decaySeconds);
        $this->assertSame(10, $limits[1]->maxAttempts);
        $this->assertSame(60, $limits[1]->decaySeconds);
        $this->assertSame(30, $limits[2]->maxAttempts);
        $this->assertStringContainsString('ip:', (string) $limits[2]->key);
        $this->assertStringNotContainsString('203.0.113.10', (string) $limits[2]->key);
    }

    public function test_disabled_limiter_returns_no_limits(): void
    {
        config(['services.speechmatics.rate_limit.enabled' => false]);

        $limit = $this->limiter->limitsFor(Request::create('/memorisation/transcription-token', 'POST'));

        $this->assertInstanceOf(Limit::class, $limit);
        $this->assertSame(PHP_INT_MAX, $limit->maxAttempts);
    }

    public function test_invalid_limit_values_fall_back_to_defaults(): void
    {
        config([
            'services.speechmatics.rate_limit.per_user_per_minute' => 'unlimited',
            'services.speechmatics.rate_limit.per_ip_per_minute' => 0,
            'services.speechmatics.rate_limit.burst_per_user' => -2,
            'services.speechmatics.rate_limit.burst_seconds' => '',
        ]);

        $this->assertSame([
            'per_user_per_minute' => SpeechmaticsRateLimit::DEFAULT_PER_USER_PER_MINUTE,
            'per_ip_per_minute' => SpeechmaticsRateLimit::DEFAULT_PER_IP_PER_MINUTE,
            'burst_per_user' => SpeechmaticsRateLimit::DEFAULT_BURST_PER_USER,
            'burst_seconds' => SpeechmaticsRateLimit::DEFAULT_BURST_SECONDS,
        ], $this->limiter->configuredLimits());
    }

    public function test_overlapping_mint_reuses_the_in_flight_success_payload(): void
    {
        Cache::put('speechmatics-token:inflight-result:user:9', [
            'access_token' => 'shared-token',
            'expires_in' => 120,
            'region' => 'eu',
            'websocket_host' => 'eu.rt.speechmatics.com',
        ], 5);

        $lock = Cache::lock('speechmatics-token:inflight:user:9', 10);
        $this->assertTrue($lock->get());

        $called = false;
        $response = $this->limiter->runExclusiveMint(9, function () use (&$called) {
            $called = true;

            return response()->json(['access_token' => 'new-token']);
        });

        $this->assertFalse($called);
        $this->assertSame('shared-token', $response->getData(true)['access_token']);
        $this->assertSame('eu.rt.speechmatics.com', $response->getData(true)['websocket_host']);

        $lock->release();
    }

    public function test_sequential_exclusive_mints_are_not_forced_to_share_a_token(): void
    {
        $first = $this->limiter->runExclusiveMint(4, fn () => response()->json([
            'access_token' => 'first-token',
            'websocket_host' => 'eu.rt.speechmatics.com',
        ]));
        $second = $this->limiter->runExclusiveMint(4, fn () => response()->json([
            'access_token' => 'second-token',
            'websocket_host' => 'eu.rt.speechmatics.com',
        ]));

        $this->assertSame('first-token', $first->getData(true)['access_token']);
        $this->assertSame('second-token', $second->getData(true)['access_token']);
    }
}
