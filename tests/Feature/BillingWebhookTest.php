<?php

namespace Tests\Feature;

use App\Models\StripeWebhookEvent;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
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
}
