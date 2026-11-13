<?php

namespace Tests\Feature;

use App\Models\FeatureUsageCounter;
use App\Models\MemorisationAssessment;
use App\Models\MemorisationProgress;
use App\Models\StripeWebhookEvent;
use App\Models\User;
use App\Services\Billing\SubscriptionEntitlement;
use App\Services\UserAiReciteUsageService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class SubscriptionBillingTest extends TestCase
{
    use RefreshDatabase;

    public function test_new_users_receive_the_free_plan(): void
    {
        $user = User::factory()->create();

        $this->assertSame('free', $user->fresh()->subscription_tier);
        $this->assertSame('free', $user->fresh()->subscription_status);
        $this->assertFalse($user->fresh()->hasPaidAccess());
        $this->assertSame('free', app(SubscriptionEntitlement::class)->getEffectivePlan($user));
    }

    public function test_existing_progress_is_kept_for_users_without_a_subscription(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
        ]);

        $progress = MemorisationProgress::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'ayah_number' => 1,
            'status' => 'memorised',
        ]);

        $this->assertFalse($user->fresh()->hasProAccess());
        $this->assertDatabaseHas('memorisation_progress', [
            'id' => $progress->id,
            'user_id' => $user->id,
            'status' => 'memorised',
        ]);
    }

    public function test_free_user_can_access_core_features_and_not_pro_tools(): void
    {
        $user = User::factory()->create();
        $entitlement = app(SubscriptionEntitlement::class);

        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::MUSHAF));
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::MEMORISATION));
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::BASIC_PROGRESS));
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::AI_ASSESSMENT));
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::FIND_AYAH));
        $this->assertFalse($entitlement->canAccessFeature($user, SubscriptionEntitlement::PRO_TOOLS));
        $this->assertFalse($entitlement->canAccessFeature($user, SubscriptionEntitlement::WORD_BY_WORD));
        $this->assertFalse($entitlement->canAccessFeature($user, SubscriptionEntitlement::OFFLINE_AUDIO));
        $this->assertFalse($entitlement->canAccessFeature($user, SubscriptionEntitlement::WEAK_AYAH_INSIGHTS));
        $this->assertSame(5, $entitlement->freeSavedSessionsLimit());
        $this->assertSame(5, $entitlement->freeFindAyahDailyLimit());

        $this->actingAs($user)
            ->getJson('/api/memorisation/weak-spots')
            ->assertForbidden()
            ->assertJsonPath('reason', 'plan_required');
    }

    public function test_free_users_cannot_exceed_the_daily_find_ayah_limit(): void
    {
        $user = User::factory()->create();
        $entitlement = app(SubscriptionEntitlement::class);

        for ($i = 0; $i < 5; $i++) {
            $this->assertTrue($entitlement->consumeFindAyah($user));
        }

        $this->assertFalse($entitlement->consumeFindAyah($user));
        $this->assertFalse($entitlement->canStartFindAyah($user));
        $this->assertSame(0, $entitlement->getRemainingUsage($user, SubscriptionEntitlement::FIND_AYAH)['remaining']);

        $pro = User::factory()->pro()->create();
        $this->assertTrue($entitlement->consumeFindAyah($pro));
        $this->assertNull($entitlement->getRemainingUsage($pro, SubscriptionEntitlement::FIND_AYAH)['limit']);
    }

    public function test_free_users_cannot_exceed_the_daily_ai_assessment_limit(): void
    {
        $user = User::factory()->create();

        for ($i = 0; $i < 5; $i++) {
            $this->scoredAssessment($user);
        }

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $this->assessmentPayload())
            ->assertStatus(429)
            ->assertJsonPath('reason', UserAiReciteUsageService::REASON_DAILY)
            ->assertJsonPath('upgrade', true)
            ->assertJsonPath('remaining', 0);

        $this->assertSame(5, MemorisationAssessment::query()->where('user_id', $user->id)->count());
    }

    public function test_conditional_usage_update_stops_a_sixth_reservation(): void
    {
        $user = User::factory()->create();
        $period = Carbon::now('UTC')->toDateString();
        $now = now();

        DB::table('feature_usage_counters')->insert([
            'user_id' => $user->id,
            'feature' => SubscriptionEntitlement::AI_ASSESSMENT,
            'period_on' => $period,
            'consumed' => 4,
            'created_at' => $now,
            'updated_at' => $now,
        ]);

        $first = DB::update(
            'update feature_usage_counters set consumed = consumed + 1 where user_id = ? and feature = ? and period_on = ? and consumed < ?',
            [$user->id, SubscriptionEntitlement::AI_ASSESSMENT, $period, 5]
        );
        $second = DB::update(
            'update feature_usage_counters set consumed = consumed + 1 where user_id = ? and feature = ? and period_on = ? and consumed < ?',
            [$user->id, SubscriptionEntitlement::AI_ASSESSMENT, $period, 5]
        );

        $this->assertSame(1, $first);
        $this->assertSame(0, $second);
        $this->assertSame(5, (int) FeatureUsageCounter::query()->where('user_id', $user->id)->value('consumed'));
    }

    public function test_failed_and_repeated_submissions_do_not_consume_another_allowance(): void
    {
        $user = User::factory()->create();
        $payload = $this->assessmentPayload();
        $payload['idempotency_key'] = 'same-attempt';

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $payload)
            ->assertCreated();

        $consumedAfterFirst = (int) FeatureUsageCounter::query()->where('user_id', $user->id)->value('consumed');

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments', $payload)
            ->assertSuccessful();

        $this->actingAs($user)
            ->postJson('/api/memorisation/assessments/failed', [
                'surah_number' => 1,
                'start_ayah' => 1,
                'end_ayah' => 1,
                'failure_reason' => 'processing_failed',
                'idempotency_key' => 'failed-attempt',
            ])
            ->assertCreated();

        $this->assertSame(
            $consumedAfterFirst,
            (int) FeatureUsageCounter::query()->where('user_id', $user->id)->value('consumed')
        );
        $this->assertLessThanOrEqual(1, $consumedAfterFirst);
    }

    public function test_pro_users_are_not_limited_to_the_free_daily_allowance(): void
    {
        $user = User::factory()->pro()->create();
        $entitlement = app(SubscriptionEntitlement::class);

        for ($i = 0; $i < 6; $i++) {
            $this->assertTrue($entitlement->checkAndConsumeUsage($user, SubscriptionEntitlement::AI_ASSESSMENT));
        }

        $this->assertNull($entitlement->getRemainingUsage($user, SubscriptionEntitlement::AI_ASSESSMENT)['limit']);
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::PRO_TOOLS));
        $this->assertTrue($entitlement->canAccessFeature($user, SubscriptionEntitlement::PREMIUM_TOOLS));
        $this->assertSame(0, FeatureUsageCounter::query()->where('user_id', $user->id)->count());
    }

    public function test_checkout_uses_the_configured_pro_monthly_price_and_refuses_a_mismatch(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test_123',
            'services.stripe.livemode' => false,
            'billing.verify_price_on_checkout' => true,
            'billing.plans.pro_monthly.price_id' => 'price_pro_monthly',
            'billing.plans.pro_monthly.expected_unit_amount' => 299,
        ]);

        Http::fake([
            'https://api.stripe.com/v1/prices/price_pro_monthly' => Http::response([
                'id' => 'price_pro_monthly',
                'active' => true,
                'currency' => 'gbp',
                'unit_amount' => 599,
                'type' => 'recurring',
                'livemode' => false,
                'recurring' => ['interval' => 'month'],
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_monthly'])
            ->assertRedirect(route('pricing'))
            ->assertSessionHas('billing_error', __('billing.price_mismatch'));

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'checkout/sessions'));
    }

    public function test_checkout_proceeds_when_stripe_reports_two_ninety_nine(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test_123',
            'services.stripe.livemode' => false,
            'billing.verify_price_on_checkout' => true,
            'billing.plans.pro_monthly.price_id' => 'price_pro_299',
            'billing.plans.pro_monthly.expected_unit_amount' => 299,
        ]);

        Http::fake([
            'https://api.stripe.com/v1/prices/price_pro_299' => Http::response([
                'id' => 'price_pro_299',
                'active' => true,
                'currency' => 'gbp',
                'unit_amount' => 299,
                'type' => 'recurring',
                'livemode' => false,
                'recurring' => ['interval' => 'month'],
            ], 200),
            'https://api.stripe.com/v1/customers' => Http::response(['id' => 'cus_test'], 200),
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_test',
                'url' => 'https://checkout.stripe.com/c/pay/cs_test',
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_monthly'])
            ->assertRedirect('https://checkout.stripe.com/c/pay/cs_test');

        Http::assertSent(fn ($request) => str_contains($request->url(), 'checkout/sessions')
            && $request['line_items[0][price]'] === 'price_pro_299');
    }

    public function test_lifetime_checkout_refuses_a_recurring_price(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test_123',
            'services.stripe.livemode' => false,
            'billing.verify_price_on_checkout' => true,
            'billing.plans.pro_lifetime.price_id' => 'price_life',
            'billing.plans.pro_lifetime.expected_unit_amount' => 5382,
            'billing.plans.pro_lifetime.price_type' => 'one_time',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/prices/price_life' => Http::response([
                'id' => 'price_life',
                'active' => true,
                'currency' => 'gbp',
                'unit_amount' => 5382,
                'type' => 'recurring',
                'livemode' => false,
                'recurring' => ['interval' => 'year'],
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_lifetime'])
            ->assertRedirect(route('pricing'))
            ->assertSessionHas('billing_error', __('billing.price_mismatch'));
    }

    public function test_duplicate_checkout_does_not_create_another_subscription(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test',
            'billing.plans.pro_monthly.price_id' => 'price_pro_monthly',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/billing_portal/sessions' => Http::response([
                'url' => 'https://billing.stripe.com/session/test',
            ], 200),
        ]);

        $user = User::factory()->pro()->create([
            'stripe_customer_id' => 'cus_existing',
            'stripe_subscription_id' => 'sub_existing',
        ]);

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_monthly'])
            ->assertRedirect('https://billing.stripe.com/session/test');

        Http::assertNotSent(fn ($request) => str_contains($request->url(), 'checkout/sessions'));
    }

    public function test_verified_webhook_activates_pro_and_invalid_signatures_are_rejected(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);
        $user = User::factory()->create();
        $payload = $this->subscriptionEvent('evt_activate', 'customer.subscription.updated', $user, [
            'status' => 'active',
            'plan' => 'pro_monthly',
        ]);

        $this->postJson(route('stripe.webhook'), $payload, [
            'Stripe-Signature' => 't='.time().',v1=invalid',
        ])->assertStatus(400);

        $this->callWebhook($payload, 'whsec_test_secret')->assertOk();

        $user->refresh();
        $this->assertSame('pro', $user->subscription_tier);
        $this->assertSame('active', $user->subscription_status);
        $this->assertTrue($user->hasProAccess());
    }

    public function test_duplicate_webhook_delivery_is_safe(): void
    {
        $user = User::factory()->create();
        $payload = $this->subscriptionEvent('evt_once', 'customer.subscription.updated', $user, [
            'status' => 'active',
            'plan' => 'pro_monthly',
        ]);

        $this->postJson(route('stripe.webhook'), $payload)->assertOk();
        $this->postJson(route('stripe.webhook'), $payload)->assertOk();

        $this->assertSame(1, StripeWebhookEvent::query()->where('stripe_event_id', 'evt_once')->count());
        $this->assertSame('pro', $user->fresh()->subscription_tier);
    }

    public function test_out_of_order_events_do_not_overwrite_newer_subscription_state(): void
    {
        $user = User::factory()->create();
        $newer = $this->subscriptionEvent('evt_new', 'customer.subscription.updated', $user, [
            'status' => 'active',
            'plan' => 'pro_monthly',
        ], 200);
        $older = $this->subscriptionEvent('evt_old', 'customer.subscription.updated', $user, [
            'status' => 'canceled',
            'plan' => 'pro_monthly',
        ], 100);

        $this->postJson(route('stripe.webhook'), $newer)->assertOk();
        $this->postJson(route('stripe.webhook'), $older)->assertOk();

        $user->refresh();
        $this->assertSame('active', $user->subscription_status);
        $this->assertSame('pro', $user->subscription_tier);
        $this->assertTrue($user->hasProAccess());
    }

    public function test_failed_payment_updates_status_and_keeps_access_until_period_end(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);
        $user = User::factory()->pro()->create([
            'stripe_customer_id' => 'cus_pay',
            'stripe_subscription_id' => 'sub_pay',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/subscriptions/sub_pay' => Http::response([
                'id' => 'sub_pay',
                'customer' => 'cus_pay',
                'status' => 'past_due',
                'cancel_at_period_end' => false,
                'current_period_end' => now()->addDays(3)->timestamp,
                'metadata' => [
                    'user_id' => (string) $user->id,
                    'plan' => 'pro_monthly',
                ],
            ], 200),
        ]);

        $this->postJson(route('stripe.webhook'), [
            'id' => 'evt_invoice_failed',
            'type' => 'invoice.payment_failed',
            'created' => time(),
            'data' => [
                'object' => [
                    'id' => 'in_failed',
                    'subscription' => 'sub_pay',
                    'customer' => 'cus_pay',
                ],
            ],
        ])->assertOk();

        $user->refresh();
        $this->assertSame('past_due', $user->subscription_status);
        $this->assertTrue($user->hasPaidAccess());
        $this->assertSame('pro', $user->subscription_tier);
    }

    public function test_cancellation_at_period_end_keeps_access_until_expiry(): void
    {
        $user = User::factory()->create();
        $periodEnd = now()->addDays(10)->timestamp;

        $this->postJson(route('stripe.webhook'), $this->subscriptionEvent(
            'evt_cancel_later',
            'customer.subscription.updated',
            $user,
            [
                'status' => 'active',
                'plan' => 'pro_monthly',
                'cancel_at_period_end' => true,
                'current_period_end' => $periodEnd,
            ]
        ))->assertOk();

        $user->refresh();
        $this->assertTrue($user->subscription_cancel_at_period_end);
        $this->assertTrue($user->hasProAccess());

        $user->forceFill([
            'subscription_status' => 'canceled',
            'subscription_current_period_ends_at' => now()->subMinute(),
        ])->save();

        $this->assertFalse($user->fresh()->hasPaidAccess());
        $this->assertSame('free', $user->fresh()->effectiveSubscriptionTier());
    }

    public function test_customer_portal_uses_only_the_authenticated_customer(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        Http::fake([
            'https://api.stripe.com/v1/billing_portal/sessions' => Http::response([
                'url' => 'https://billing.stripe.com/session/own',
            ], 200),
        ]);

        $user = User::factory()->create([
            'stripe_customer_id' => 'cus_owner',
        ]);

        $this->actingAs($user)
            ->post(route('billing.portal'), ['customer' => 'cus_someone_else'])
            ->assertRedirect('https://billing.stripe.com/session/own');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'billing_portal/sessions')
                && $request['customer'] === 'cus_owner';
        });
    }

    public function test_lifetime_checkout_webhook_grants_pro_without_a_subscription(): void
    {
        $user = User::factory()->create();

        $this->postJson(route('stripe.webhook'), [
            'id' => 'evt_lifetime',
            'type' => 'checkout.session.completed',
            'created' => time(),
            'data' => [
                'object' => [
                    'id' => 'cs_lifetime',
                    'mode' => 'payment',
                    'payment_status' => 'paid',
                    'customer' => 'cus_lifetime',
                    'client_reference_id' => (string) $user->id,
                    'metadata' => [
                        'type' => 'lifetime',
                        'plan' => 'pro_lifetime',
                        'user_id' => (string) $user->id,
                        'price_id' => 'price_pro_lifetime',
                    ],
                ],
            ],
        ])->assertOk();

        $user->refresh();
        $this->assertSame('pro', $user->subscription_tier);
        $this->assertSame('lifetime', $user->subscription_status);
        $this->assertSame('pro_lifetime', $user->subscription_plan);
        $this->assertNull($user->stripe_subscription_id);
        $this->assertTrue($user->hasProAccess());
        $this->assertTrue($user->hasPaidAccess());
    }

    public function test_subscription_webhook_does_not_revoke_lifetime_access(): void
    {
        $user = User::factory()->lifetime()->create([
            'stripe_customer_id' => 'cus_life',
        ]);

        $this->postJson(route('stripe.webhook'), $this->subscriptionEvent(
            'evt_old_sub',
            'customer.subscription.deleted',
            $user,
            [
                'status' => 'canceled',
                'plan' => 'pro_monthly',
            ]
        ))->assertOk();

        $user->refresh();
        $this->assertSame('lifetime', $user->subscription_status);
        $this->assertSame('pro_lifetime', $user->subscription_plan);
        $this->assertTrue($user->hasProAccess());
    }

    public function test_donation_webhook_does_not_change_subscription_state(): void
    {
        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
        ]);

        $this->postJson(route('stripe.webhook'), [
            'id' => 'evt_donation',
            'type' => 'checkout.session.completed',
            'data' => [
                'object' => [
                    'id' => 'cs_donation',
                    'mode' => 'payment',
                    'metadata' => [
                        'type' => 'donation',
                        'user_id' => (string) $user->id,
                    ],
                ],
            ],
        ])->assertOk();

        $user->refresh();
        $this->assertSame('free', $user->subscription_tier);
        $this->assertSame('free', $user->subscription_status);
        $this->assertNull($user->stripe_subscription_id);
    }

    public function test_pricing_and_billing_pages_include_the_public_plans(): void
    {
        $user = User::factory()->create();

        $this->get(route('pricing'))
            ->assertOk()
            ->assertSee('£0/month', false)
            ->assertSee('£2.99/month', false)
            ->assertSee('£26.91/year', false)
            ->assertSee('£53.82 lifetime', false)
            ->assertSee('name="viewport"', false);

        $this->actingAs($user)
            ->get(route('profile.show'))
            ->assertOk()
            ->assertSee(__('profile.price_free'), false)
            ->assertSee(__('profile.upgrade_to_pro'), false);
    }

    public function test_premium_entitlement_is_preserved_and_not_offered_for_checkout(): void
    {
        $user = User::factory()->premium()->create([
            'stripe_customer_id' => 'cus_premium',
            'stripe_subscription_id' => 'sub_premium',
        ]);

        $this->assertTrue($user->hasPremiumAccess());
        $this->assertTrue($user->hasProAccess());

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'premium_monthly'])
            ->assertSessionHasErrors('plan');

        $this->assertSame('pro', $user->fresh()->billingSubscriptionTier());
        $this->assertSame('sub_premium', $user->fresh()->stripe_subscription_id);
    }

    /**
     * @param  array<string, mixed>  $overrides
     * @return array<string, mixed>
     */
    private function subscriptionEvent(string $id, string $type, User $user, array $overrides = [], ?int $created = null): array
    {
        return [
            'id' => $id,
            'type' => $type,
            'created' => $created ?? time(),
            'data' => [
                'object' => [
                    'id' => 'sub_test',
                    'customer' => 'cus_test',
                    'status' => $overrides['status'] ?? 'active',
                    'cancel_at_period_end' => $overrides['cancel_at_period_end'] ?? false,
                    'current_period_end' => $overrides['current_period_end'] ?? now()->addMonth()->timestamp,
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan' => $overrides['plan'] ?? 'pro_monthly',
                    ],
                ],
            ],
        ];
    }

    /**
     * @return array<string, mixed>
     */
    private function assessmentPayload(): array
    {
        return [
            'surah_number' => 1,
            'surah_name' => 'Al-Fatihah',
            'start_ayah' => 1,
            'end_ayah' => 1,
            'duration_ms' => 1000,
            'provider' => 'test',
            'ayahs' => [[
                'ayah_number' => 1,
                'surah_number' => 1,
                'words' => ['بسم', 'الله'],
            ]],
            'recognition_words' => [
                ['word' => 'بسم', 'confidence' => 0.95],
                ['word' => 'الله', 'confidence' => 0.94],
            ],
        ];
    }

    private function scoredAssessment(User $user): void
    {
        MemorisationAssessment::query()->create([
            'user_id' => $user->id,
            'surah_number' => 1,
            'start_ayah' => 1,
            'end_ayah' => 1,
            'status' => MemorisationAssessment::STATUS_COMPLETED,
            'overall_accuracy' => 90,
        ]);
    }

    private function callWebhook(array $payload, string $secret): \Illuminate\Testing\TestResponse
    {
        $body = json_encode($payload);
        $timestamp = time();
        $signature = hash_hmac('sha256', $timestamp.'.'.$body, $secret);

        return $this->call(
            'POST',
            route('stripe.webhook'),
            [],
            [],
            [],
            [
                'CONTENT_TYPE' => 'application/json',
                'HTTP_STRIPE_SIGNATURE' => 't='.$timestamp.',v1='.$signature,
            ],
            $body
        );
    }
}
