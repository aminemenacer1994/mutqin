<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\Referral;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Analytics\SessionProductEvents;
use App\Services\Analytics\SignupAnalytics;
use App\Services\Billing\StripeSubscriptionSync;
use App\Services\Billing\SubscriptionEntitlement;
use App\Services\Referrals\ReferralService;
use App\Services\UserAiReciteUsageService;
use App\Support\Analytics\ProductEventName;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\Request;
use Tests\TestCase;

class ReferralProgrammeTest extends TestCase
{
    use RefreshDatabase;

    public function test_ensure_code_is_stable_and_unique(): void
    {
        $user = User::factory()->create();
        $service = app(ReferralService::class);

        $first = $service->ensureCode($user);
        $second = $service->ensureCode($user->fresh());

        $this->assertSame($first, $second);
        $this->assertMatchesRegularExpression('/^[a-z0-9]{10}$/', $first);
        $this->assertSame($first, $user->fresh()->referral_code);
    }

    public function test_valid_referral_attributes_signup_without_exposing_identity_in_api(): void
    {
        $referrer = User::factory()->create();
        $code = app(ReferralService::class)->ensureCode($referrer);

        $this->post('/register', [
            'name' => 'Referred Learner',
            'email' => 'referred@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
            'ref' => $code,
        ])->assertRedirect();

        $referred = User::query()->where('email', 'referred@example.com')->firstOrFail();
        $this->assertSame($code, $referred->signup_referral_code);
        $this->assertSame($referrer->id, $referred->referred_by_user_id);

        $json = $this->actingAs($referrer)->getJson('/api/referrals')->assertOk()->json();
        $this->assertSame(1, $json['stats']['signups']);
        $this->assertSame(3, $json['reward']['pro_signups_needed']);
        $this->assertSame(0, $json['reward']['pro_signups']);
        $encoded = json_encode($json);
        $this->assertStringNotContainsString('referred@example.com', $encoded);
        $this->assertStringNotContainsString('Referred Learner', $encoded);
    }

    public function test_self_referral_and_unknown_codes_are_ignored(): void
    {
        $user = User::factory()->create(['email' => 'self@example.com']);
        $code = app(ReferralService::class)->ensureCode($user);

        $request = Request::create('/register', 'POST', ['ref' => $code]);
        $request->setLaravelSession($this->app['session']->driver());
        app(SignupAnalytics::class)->capture($user, $request, 'email');
        $this->assertNull($user->fresh()->referred_by_user_id);
        $this->assertDatabaseCount('referrals', 0);

        $other = User::factory()->create(['email' => 'other@example.com']);
        $bogus = Request::create('/register', 'POST', ['ref' => 'notareal01']);
        $bogus->setLaravelSession($this->app['session']->driver());
        app(SignupAnalytics::class)->capture($other, $bogus, 'email');
        $this->assertNull($other->fresh()->referred_by_user_id);
    }

    public function test_first_completed_session_activates_without_ai_reward(): void
    {
        $referrer = User::factory()->create(['ai_recite_bonus_checks' => 0]);
        $code = app(ReferralService::class)->ensureCode($referrer);
        $referred = User::factory()->create([
            'signup_referral_code' => $code,
            'referred_by_user_id' => $referrer->id,
        ]);
        Referral::query()->create([
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'referral_code' => $code,
            'signed_up_at' => now()->subDay(),
        ]);

        $session = UserSession::query()->create([
            'user_id' => $referred->id,
            'surah_number' => 1,
            'status' => UserSessionStatus::Completed,
            'is_onboarding_example' => false,
            'started_at' => now()->subMinutes(20),
            'ended_at' => now(),
            'last_activity_at' => now(),
            'session_duration_seconds' => 600,
        ]);

        app(SessionProductEvents::class)->ended($referred, $session);
        app(SessionProductEvents::class)->ended($referred, $session);

        $referral = Referral::query()->where('referred_user_id', $referred->id)->firstOrFail();
        $this->assertNotNull($referral->activated_at);
        $this->assertNull($referral->reward_granted_at);
        $this->assertSame(0, (int) $referrer->fresh()->ai_recite_bonus_checks);
        $this->assertSame(1, ProductEvent::query()->where('event_name', ProductEventName::REFERRAL_ACTIVATED)->count());
    }

    public function test_three_referred_pro_signups_grant_one_complimentary_month(): void
    {
        config()->set('mutqin.referrals.pro_signups_for_free_month', 3);
        config()->set('billing.plans.pro_monthly', [
            'tier' => 'pro',
            'price_id' => 'price_pro_test',
        ]);

        $referrer = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
            'referral_free_months_granted' => 0,
            'complimentary_pro_until' => null,
        ]);
        $code = app(ReferralService::class)->ensureCode($referrer);
        $sync = app(StripeSubscriptionSync::class);

        for ($i = 1; $i <= 3; $i++) {
            $referred = User::factory()->create([
                'email' => "pro-ref-{$i}@example.com",
                'referred_by_user_id' => $referrer->id,
                'signup_referral_code' => $code,
            ]);
            Referral::query()->create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $referred->id,
                'referral_code' => $code,
                'signed_up_at' => now()->subDays($i),
                'activated_at' => now()->subDays($i),
            ]);

            $sync->apply($referred, [
                'id' => "sub_test_{$i}",
                'customer' => "cus_test_{$i}",
                'status' => 'active',
                'cancel_at_period_end' => false,
                'current_period_start' => now()->timestamp,
                'current_period_end' => now()->addMonth()->timestamp,
                'items' => ['data' => [['price' => ['id' => 'price_pro_test']]]],
                'metadata' => ['plan' => 'pro_monthly'],
            ], now()->timestamp + $i, true);

            if ($i < 3) {
                $this->assertNull($referrer->fresh()->complimentary_pro_until);
                $this->assertSame(0, (int) $referrer->fresh()->referral_free_months_granted);
            }
        }

        $referrer = $referrer->fresh();
        $this->assertSame(1, (int) $referrer->referral_free_months_granted);
        $this->assertNotNull($referrer->complimentary_pro_until);
        $this->assertTrue($referrer->complimentary_pro_until->isFuture());
        $this->assertTrue($referrer->hasProAccess());

        $json = $this->actingAs($referrer)->getJson('/api/referrals')->assertOk()->json();
        $this->assertSame(3, $json['reward']['pro_signups']);
        $this->assertSame(1, $json['reward']['free_months_earned']);
        $this->assertNotNull($json['reward']['complimentary_pro_until']);
    }

    public function test_sixth_pro_signup_grants_another_free_month(): void
    {
        config()->set('mutqin.referrals.pro_signups_for_free_month', 3);
        $referrer = User::factory()->create([
            'referral_free_months_granted' => 0,
            'complimentary_pro_until' => null,
        ]);
        $code = app(ReferralService::class)->ensureCode($referrer);

        for ($i = 1; $i <= 6; $i++) {
            $referred = User::factory()->create([
                'email' => "batch-{$i}@example.com",
                'referred_by_user_id' => $referrer->id,
                'subscription_tier' => 'pro',
                'subscription_status' => 'active',
                'subscription_current_period_ends_at' => now()->addMonth(),
            ]);
            Referral::query()->create([
                'referrer_user_id' => $referrer->id,
                'referred_user_id' => $referred->id,
                'referral_code' => $code,
                'signed_up_at' => now()->subDays($i),
                'activated_at' => now()->subDays($i),
            ]);
            app(ReferralService::class)->recordProConversionIfEligible($referred->fresh());
        }

        $referrer = $referrer->fresh();
        $this->assertSame(2, (int) $referrer->referral_free_months_granted);
        $this->assertTrue($referrer->complimentary_pro_until->greaterThan(now()->addMonths(1)->subDay()));
    }

    public function test_bonus_checks_still_consume_when_present(): void
    {
        config()->set('billing.limits.free.ai_assessments_per_day', 1);
        config()->set('mutqin.ai_recite.default_daily_limit', 1);
        config()->set('mutqin.ai_recite.daily_limit_exempt_emails', []);
        config()->set('mutqin.ai_recite.daily_limit_exempt_names', []);

        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
            'ai_recite_bonus_checks' => 1,
        ]);

        $entitlement = app(SubscriptionEntitlement::class);
        $this->assertTrue($entitlement->consumeAiAssessment($user));
        $this->assertTrue($entitlement->consumeAiAssessment($user->fresh()));
        $this->assertSame(0, (int) $user->fresh()->ai_recite_bonus_checks);
        $this->assertFalse($entitlement->consumeAiAssessment($user->fresh()));
        $this->assertSame(0, app(UserAiReciteUsageService::class)->inspect($user->fresh())['bonus_remaining']);
    }

    public function test_referrals_page_and_api_require_auth(): void
    {
        $this->get('/referrals')->assertRedirect();
        $this->getJson('/api/referrals')->assertUnauthorized();
        $user = User::factory()->create();
        $this->actingAs($user)->get('/referrals')->assertOk();
    }
}
