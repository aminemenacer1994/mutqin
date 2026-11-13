<?php

namespace Tests\Feature;

use App\Enums\UserSessionStatus;
use App\Models\ProductEvent;
use App\Models\Referral;
use App\Models\User;
use App\Models\UserSession;
use App\Services\Analytics\SessionProductEvents;
use App\Services\Analytics\SignupAnalytics;
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
        $this->assertDatabaseHas('referrals', [
            'referrer_user_id' => $referrer->id,
            'referred_user_id' => $referred->id,
            'referral_code' => $code,
        ]);

        $json = $this->actingAs($referrer)->getJson('/api/referrals')->assertOk()->json();
        $this->assertSame($code, $json['code']);
        $this->assertSame(1, $json['stats']['signups']);
        $this->assertSame(0, $json['stats']['activations']);
        $this->assertStringContainsString('ref='.$code, $json['url']);
        $encoded = json_encode($json);
        $this->assertStringNotContainsString('referred@example.com', $encoded);
        $this->assertStringNotContainsString('Referred Learner', $encoded);
    }

    public function test_self_referral_and_unknown_codes_are_ignored(): void
    {
        $user = User::factory()->create([
            'email' => 'self@example.com',
        ]);
        $code = app(ReferralService::class)->ensureCode($user);

        $request = Request::create('/register', 'POST', [
            'ref' => $code,
        ]);
        $request->setLaravelSession($this->app['session']->driver());

        // Pretend the new account somehow carries its own invite code.
        app(SignupAnalytics::class)->capture($user, $request, 'email');
        $this->assertNull($user->fresh()->referred_by_user_id);
        $this->assertDatabaseCount('referrals', 0);

        $other = User::factory()->create(['email' => 'other@example.com']);
        $bogus = Request::create('/register', 'POST', ['ref' => 'notareal01']);
        $bogus->setLaravelSession($this->app['session']->driver());
        app(SignupAnalytics::class)->capture($other, $bogus, 'email');
        $this->assertNull($other->fresh()->referred_by_user_id);
        $this->assertDatabaseCount('referrals', 0);
    }

    public function test_first_completed_session_activates_once_grants_reward_and_can_be_acknowledged(): void
    {
        config()->set('mutqin.referrals.reward_ai_checks', 3);

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

        $events = app(SessionProductEvents::class);
        $events->ended($referred, $session);
        $events->ended($referred, $session);

        $referral = Referral::query()->where('referred_user_id', $referred->id)->firstOrFail();
        $this->assertNotNull($referral->activated_at);
        $this->assertNotNull($referral->reward_granted_at);
        $this->assertSame(3, (int) $referral->reward_ai_checks);
        $this->assertSame(3, (int) $referrer->fresh()->ai_recite_bonus_checks);
        $this->assertSame(
            1,
            ProductEvent::query()->where('event_name', ProductEventName::REFERRAL_ACTIVATED)->count()
        );

        $payload = $this->actingAs($referrer)->getJson('/api/referrals')->assertOk()->json();
        $this->assertSame(1, $payload['stats']['activations']);
        $this->assertSame(1, $payload['pending_thanks']);
        $this->assertSame(3, $payload['reward']['per_activation']);
        $this->assertSame(3, $payload['reward']['total_ai_checks_earned']);
        $this->assertSame(3, $payload['reward']['bonus_remaining']);
        $encoded = json_encode($payload);
        $this->assertStringNotContainsString($referred->email, $encoded);

        $this->actingAs($referrer)
            ->postJson('/api/referrals/acknowledge')
            ->assertOk()
            ->assertJson(['acknowledged' => 1, 'pending_thanks' => 0]);

        $this->assertNotNull($referral->fresh()->acknowledged_at);
        $this->assertSame(0, $this->actingAs($referrer)->getJson('/api/referrals')->json('pending_thanks'));
    }

    public function test_bonus_checks_allow_and_consume_when_daily_limit_is_reached(): void
    {
        config()->set('billing.limits.free.ai_assessments_per_day', 1);
        config()->set('mutqin.ai_recite.default_daily_limit', 1);
        config()->set('mutqin.ai_recite.daily_limit_exempt_emails', []);
        config()->set('mutqin.ai_recite.daily_limit_exempt_names', []);

        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
            'ai_recite_bonus_checks' => 2,
        ]);

        $usage = app(UserAiReciteUsageService::class);
        $entitlement = app(SubscriptionEntitlement::class);

        $this->assertTrue($entitlement->consumeAiAssessment($user));
        $this->assertSame(2, (int) $user->fresh()->ai_recite_bonus_checks);

        $inspect = $usage->inspect($user->fresh());
        $this->assertFalse($inspect['within_normal_limits']);
        $this->assertTrue($inspect['allowed']);
        $this->assertSame(2, $inspect['bonus_remaining']);

        $this->assertTrue($entitlement->consumeAiAssessment($user->fresh()));
        $this->assertSame(1, (int) $user->fresh()->ai_recite_bonus_checks);

        $this->assertTrue($entitlement->consumeAiAssessment($user->fresh()));
        $this->assertSame(0, (int) $user->fresh()->ai_recite_bonus_checks);

        $this->assertFalse($entitlement->consumeAiAssessment($user->fresh()));
    }

    public function test_referrals_page_and_api_require_auth(): void
    {
        $this->get('/referrals')->assertRedirect();
        $this->getJson('/api/referrals')->assertUnauthorized();

        $user = User::factory()->create();
        $this->actingAs($user)->get('/referrals')->assertOk();
    }

    public function test_link_visits_count_from_product_events(): void
    {
        $referrer = User::factory()->create();
        $code = app(ReferralService::class)->ensureCode($referrer);

        ProductEvent::query()->create([
            'event_name' => ProductEventName::REFERRAL_LINK_OPENED,
            'anonymous_id' => 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
            'idempotency_key' => 'open:1',
            'referral_code' => $code,
            'occurred_at' => now(),
        ]);
        ProductEvent::query()->create([
            'event_name' => ProductEventName::REFERRAL_LINK_OPENED,
            'anonymous_id' => 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
            'idempotency_key' => 'open:2',
            'referral_code' => $code,
            'occurred_at' => now(),
        ]);

        $json = $this->actingAs($referrer)->getJson('/api/referrals')->assertOk()->json();
        $this->assertSame(2, $json['stats']['link_visits']);
    }
}
