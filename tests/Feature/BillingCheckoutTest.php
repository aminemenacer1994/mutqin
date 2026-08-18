<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class BillingCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login_from_checkout(): void
    {
        $this->post(route('billing.checkout'), ['plan' => 'premium_monthly'])
            ->assertRedirect();
    }

    public function test_checkout_rejects_unknown_plan(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('billing.checkout'), ['plan' => 'not_a_plan'])
            ->assertSessionHasErrors('plan');
    }

    public function test_checkout_rejects_plan_when_stripe_price_is_not_configured(): void
    {
        config([
            'billing.plans.premium_monthly.price_id' => null,
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('billing.checkout'), ['plan' => 'premium_monthly'])
            ->assertSessionHasErrors('plan');
    }
}
