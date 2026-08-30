<?php

namespace Tests\Feature;

use App\Models\StripeWebhookEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BillingWebhookTest extends TestCase
{
    use RefreshDatabase;

    public function test_webhook_rejects_requests_when_secret_missing_in_production(): void
    {
        $this->app->detectEnvironment(fn () => 'production');
        config(['services.stripe.webhook_secret' => '']);

        $this->postJson(route('stripe.webhook'), ['type' => 'ping'])
            ->assertStatus(503)
            ->assertSee('Webhook secret not configured');
    }

    public function test_webhook_rejects_requests_when_secret_missing_in_local(): void
    {
        $this->app->detectEnvironment(fn () => 'local');
        config(['services.stripe.webhook_secret' => '']);

        $this->postJson(route('stripe.webhook'), ['type' => 'ping'])
            ->assertStatus(503)
            ->assertSee('Webhook secret not configured');
    }

    public function test_webhook_rejects_invalid_signature_when_secret_configured(): void
    {
        config(['services.stripe.webhook_secret' => 'whsec_test_secret']);

        $this->postJson(route('stripe.webhook'), ['type' => 'ping'], [
            'Stripe-Signature' => 't=1234567890,v1=invalid',
        ])
            ->assertStatus(400)
            ->assertSee('Invalid signature');
    }

    public function test_webhook_accepts_valid_payload_in_testing_without_secret(): void
    {
        config(['services.stripe.webhook_secret' => '']);

        $this->postJson(route('stripe.webhook'), [
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_test',
                    'status' => 'active',
                    'customer' => 'cus_test',
                    'metadata' => [],
                ],
            ],
        ])
            ->assertOk()
            ->assertSee('OK');
    }

    public function test_webhook_deduplicates_replayed_events(): void
    {
        config(['services.stripe.webhook_secret' => '']);

        $user = User::factory()->create([
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
        ]);

        $payload = [
            'id' => 'evt_test_replay',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_test',
                    'status' => 'active',
                    'customer' => 'cus_test',
                    'metadata' => [
                        'user_id' => (string) $user->id,
                        'plan' => 'premium_monthly',
                    ],
                ],
            ],
        ];

        $this->postJson(route('stripe.webhook'), $payload)
            ->assertOk()
            ->assertSee('OK');

        $user->refresh();
        $this->assertSame('premium', $user->subscription_tier);

        $this->postJson(route('stripe.webhook'), $payload)
            ->assertOk()
            ->assertSee('OK');

        $this->assertSame(1, StripeWebhookEvent::where('stripe_event_id', 'evt_test_replay')->count());
    }

    public function test_webhook_links_subscription_by_stripe_customer_email_when_user_id_missing(): void
    {
        config(['services.stripe.webhook_secret' => '', 'services.stripe.secret_key' => 'sk_test']);

        $user = User::factory()->create([
            'email' => 'buyer@example.com',
            'subscription_tier' => 'free',
            'subscription_status' => 'free',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/customers/cus_email_match' => Http::response([
                'id' => 'cus_email_match',
                'email' => 'buyer@example.com',
            ], 200),
        ]);

        $this->postJson(route('stripe.webhook'), [
            'id' => 'evt_email_match',
            'type' => 'customer.subscription.updated',
            'data' => [
                'object' => [
                    'id' => 'sub_email_match',
                    'status' => 'active',
                    'customer' => 'cus_email_match',
                    'metadata' => [
                        'plan' => 'pro_monthly',
                    ],
                ],
            ],
        ])
            ->assertOk()
            ->assertSee('OK');

        $user->refresh();
        $this->assertSame('pro', $user->subscription_tier);
        $this->assertSame('cus_email_match', $user->stripe_customer_id);
    }
}
