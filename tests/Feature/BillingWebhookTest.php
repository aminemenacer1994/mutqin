<?php

namespace Tests\Feature;

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
}
