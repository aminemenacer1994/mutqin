<?php

namespace Tests\Unit;

use App\Services\SpeechmaticsUsageCap;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Log;
use Tests\TestCase;

class SpeechmaticsUsageCapTest extends TestCase
{
    private SpeechmaticsUsageCap $cap;

    protected function setUp(): void
    {
        parent::setUp();
        Cache::flush();
        Log::spy();
        $this->cap = new SpeechmaticsUsageCap(Cache::store());
    }

    public function test_allows_mints_under_the_daily_user_limit(): void
    {
        $this->configureCap(userMints: 3, globalMints: 10);

        $this->assertTrue($this->cap->inspect(11)['allowed']);
        $this->cap->recordSuccessfulMint(11);
        $this->cap->recordSuccessfulMint(11);

        $this->assertTrue($this->cap->inspect(11)['allowed']);
        Log::shouldNotHaveReceived('warning', ['Speechmatics usage cap reached.', \Mockery::any()]);
    }

    public function test_blocks_when_the_daily_user_limit_is_reached(): void
    {
        $this->configureCap(userMints: 2, globalMints: 50);

        $this->cap->recordSuccessfulMint(22);
        $this->cap->recordSuccessfulMint(22);

        $decision = $this->cap->inspect(22);
        $this->assertFalse($decision['allowed']);
        $this->assertSame(SpeechmaticsUsageCap::REASON, $decision['reason']);
        $this->assertSame('user', $decision['scope']);
        $this->assertSame(2, $decision['used']);
        $this->assertSame(2, $decision['limit']);
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap reached.', \Mockery::on(function (array $context): bool {
                return ($context['scope'] ?? null) === 'user'
                    && ($context['user_id'] ?? null) === 22
                    && ($context['limit'] ?? null) === 2;
            }));
    }

    public function test_blocks_when_the_global_limit_is_reached_for_another_user(): void
    {
        $this->configureCap(userMints: 20, globalMints: 2);

        $this->cap->recordSuccessfulMint(31);
        $this->cap->recordSuccessfulMint(32);

        $decision = $this->cap->inspect(33);
        $this->assertFalse($decision['allowed']);
        $this->assertSame('global', $decision['scope']);
    }

    public function test_disabled_cap_always_allows_even_after_recorded_usage(): void
    {
        $this->configureCap(enabled: true, userMints: 1, globalMints: 1);
        $this->cap->recordSuccessfulMint(41);

        config(['services.speechmatics.usage_cap.enabled' => false]);
        $this->cap->recordSuccessfulMint(41);

        $this->assertTrue($this->cap->inspect(41)['allowed']);
    }

    public function test_invalid_limits_fail_open_and_log_once(): void
    {
        config([
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => 'not-a-number',
            'services.speechmatics.usage_cap.daily_global_token_mints' => -8,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => '',
            'services.speechmatics.usage_cap.daily_global_session_minutes' => 0,
        ]);

        $this->assertTrue($this->cap->inspect(51)['allowed']);
        $this->cap->recordSuccessfulMint(51);
        $this->assertTrue($this->cap->inspect(51)['allowed']);

        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap misconfigured.', \Mockery::type('array'));
        Log::shouldNotHaveReceived('warning', ['Speechmatics usage cap reached.', \Mockery::any()]);
    }

    public function test_invalid_limits_fail_closed_in_production(): void
    {
        $this->app['env'] = 'production';

        config([
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => 'not-a-number',
            'services.speechmatics.usage_cap.daily_global_token_mints' => -8,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => '',
            'services.speechmatics.usage_cap.daily_global_session_minutes' => 0,
        ]);

        $decision = $this->cap->inspect(52);
        $this->assertFalse($decision['allowed']);
        $this->assertSame(SpeechmaticsUsageCap::REASON, $decision['reason']);
        $this->assertSame('misconfig', $decision['scope']);
    }

    public function test_unrecognised_enabled_flag_fails_closed_in_production(): void
    {
        $this->app['env'] = 'production';

        config([
            'services.speechmatics.usage_cap.enabled' => 'sometimes',
            'services.speechmatics.usage_cap.daily_user_token_mints' => 1,
            'services.speechmatics.usage_cap.daily_global_token_mints' => 1,
        ]);

        $this->assertTrue($this->cap->isEnabled());
        $this->assertTrue($this->cap->inspect(62)['allowed']);
        $this->cap->recordSuccessfulMint(62);
        $this->assertFalse($this->cap->inspect(62)['allowed']);
    }

    public function test_unrecognised_enabled_flag_fails_open(): void
    {
        config([
            'services.speechmatics.usage_cap.enabled' => 'sometimes',
            'services.speechmatics.usage_cap.daily_user_token_mints' => 1,
            'services.speechmatics.usage_cap.daily_global_token_mints' => 1,
        ]);

        $this->assertFalse($this->cap->isEnabled());
        $this->assertTrue($this->cap->inspect(61)['allowed']);
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap misconfigured.', \Mockery::on(function (array $context): bool {
                return ($context['kind'] ?? null) === 'enabled';
            }));
    }

    public function test_session_minutes_convert_to_mint_budget(): void
    {
        config([
            'services.speechmatics.token_ttl' => 120,
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => null,
            'services.speechmatics.usage_cap.daily_global_token_mints' => null,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => 6,
            'services.speechmatics.usage_cap.daily_global_session_minutes' => null,
        ]);

        $this->assertSame(['user' => 3, 'global' => null], $this->cap->resolvedLimits());

        $this->cap->recordSuccessfulMint(71);
        $this->cap->recordSuccessfulMint(71);
        $this->cap->recordSuccessfulMint(71);

        $this->assertFalse($this->cap->inspect(71)['allowed']);
    }

    public function test_tighter_of_mints_and_minutes_wins(): void
    {
        config([
            'services.speechmatics.token_ttl' => 120,
            'services.speechmatics.usage_cap.enabled' => true,
            'services.speechmatics.usage_cap.daily_user_token_mints' => 10,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => 4,
            'services.speechmatics.usage_cap.daily_global_token_mints' => 100,
            'services.speechmatics.usage_cap.daily_global_session_minutes' => null,
        ]);

        $this->assertSame(2, $this->cap->resolvedLimits()['user']);
    }

    public function test_logs_once_when_approaching_the_cap(): void
    {
        $this->configureCap(userMints: 5, globalMints: 100);

        $this->cap->recordSuccessfulMint(81);
        $this->cap->recordSuccessfulMint(81);
        $this->cap->recordSuccessfulMint(81);
        $this->cap->recordSuccessfulMint(81);
        $this->cap->recordSuccessfulMint(81);

        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap approaching.', \Mockery::on(function (array $context): bool {
                return ($context['used'] ?? null) === 4
                    && ($context['remaining'] ?? null) === 1
                    && ($context['scope'] ?? null) === 'user';
            }));
        Log::shouldHaveReceived('warning')
            ->with('Speechmatics usage cap reached.', \Mockery::type('array'));
    }

    private function configureCap(bool $enabled = true, int $userMints = 30, int $globalMints = 200): void
    {
        config([
            'services.speechmatics.token_ttl' => 120,
            'services.speechmatics.usage_cap.enabled' => $enabled,
            'services.speechmatics.usage_cap.daily_user_token_mints' => $userMints,
            'services.speechmatics.usage_cap.daily_global_token_mints' => $globalMints,
            'services.speechmatics.usage_cap.daily_user_session_minutes' => null,
            'services.speechmatics.usage_cap.daily_global_session_minutes' => null,
        ]);
    }
}
