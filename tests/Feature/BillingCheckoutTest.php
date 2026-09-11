<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class BillingCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_guest_is_redirected_to_login_from_checkout(): void
    {
        $this->post(route('billing.checkout'), ['plan' => 'premium_monthly'])
            ->assertRedirect(route('login', ['plan' => 'premium_monthly']))
            ->assertSessionHas(\App\Support\BillingIntent::SESSION_KEY, 'premium_monthly');
    }

    public function test_guest_is_redirected_to_login_from_checkout_alias_route(): void
    {
        $this->post(route('checkout'), ['plan' => 'premium_monthly'])
            ->assertRedirect(route('login', ['plan' => 'premium_monthly']));
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

    public function test_authenticated_user_can_start_pro_monthly_checkout(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test',
            'billing.plans.pro_monthly.price_id' => 'price_pro_monthly',
        ]);

        Http::fake([
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

        Http::assertSent(function ($request) use ($user) {
            return str_contains($request->url(), 'checkout/sessions')
                && $request['line_items[0][price]'] === 'price_pro_monthly'
                && $request['metadata[plan]'] === 'pro_monthly'
                && $request['metadata[user_id]'] === (string) $user->id
                && (int) $request['subscription_data[trial_period_days]'] === 7
                && $request['payment_method_collection'] === 'always'
                && $request['custom_text[submit][message]'] === __('billing.stripe_checkout_note')
                && $request['subscription_data[description]'] === __('billing.stripe_subscription_description')
                && str_contains((string) $request['cancel_url'], '/pricing');
        });
    }

    public function test_authenticated_user_can_start_pro_yearly_checkout(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test',
            'billing.plans.pro_yearly.price_id' => 'price_pro_yearly',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/customers' => Http::response(['id' => 'cus_test'], 200),
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_test',
                'url' => 'https://checkout.stripe.com/c/pay/cs_test',
            ], 200),
        ]);

        $user = User::factory()->create();

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_yearly'])
            ->assertRedirect('https://checkout.stripe.com/c/pay/cs_test');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'checkout/sessions')
                && $request['line_items[0][price]'] === 'price_pro_yearly'
                && $request['metadata[plan]'] === 'pro_yearly'
                && (int) $request['subscription_data[trial_period_days]'] === 7
                && $request['payment_method_collection'] === 'always';
        });
    }

    public function test_returning_subscriber_does_not_get_another_trial(): void
    {
        config([
            'services.stripe.secret_key' => 'sk_test',
            'billing.plans.pro_monthly.price_id' => 'price_pro_monthly',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_test',
                'url' => 'https://checkout.stripe.com/c/pay/cs_test',
            ], 200),
        ]);

        $user = User::factory()->create([
            'stripe_customer_id' => 'cus_existing',
            'stripe_subscription_id' => 'sub_existing',
        ]);

        $this->actingAs($user)
            ->post(route('checkout'), ['plan' => 'pro_monthly'])
            ->assertRedirect('https://checkout.stripe.com/c/pay/cs_test');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'checkout/sessions')
                && ! array_key_exists('subscription_data[trial_period_days]', $request->data());
        });
    }

    public function test_registering_after_pricing_resumes_stripe_checkout(): void
    {
        $this->get(route('register', ['plan' => 'pro_yearly']))
            ->assertOk()
            ->assertSessionHas(\App\Support\BillingIntent::SESSION_KEY, 'pro_yearly');

        $this->post(route('register'), [
            'name' => 'New Student',
            'email' => 'pro-student@example.com',
            'password' => 'secret12',
            'password_confirmation' => 'secret12',
        ])->assertRedirect(route('pricing', [
            'plan' => 'pro_yearly',
            'checkout' => 1,
        ]));
    }

    public function test_login_after_pricing_resumes_stripe_checkout(): void
    {
        $user = User::factory()->create([
            'email' => 'returning-pro@example.com',
            'password' => bcrypt('secret12'),
        ]);

        $this->get(route('login', ['plan' => 'pro_monthly']))
            ->assertOk()
            ->assertSessionHas(\App\Support\BillingIntent::SESSION_KEY, 'pro_monthly');

        $this->post(route('login'), [
            'email' => 'returning-pro@example.com',
            'password' => 'secret12',
        ])->assertRedirect(route('pricing', [
            'plan' => 'pro_monthly',
            'checkout' => 1,
        ]));
    }

    public function test_checkout_success_flash_is_translated(): void
    {
        $user = User::factory()->create();

        $this->actingAs($user)
            ->get(route('billing.success'))
            ->assertRedirect(route('profile.show') . '#subscription')
            ->assertSessionHas('billing_status', __('billing.activating'));
    }

    public function test_portal_without_stripe_customer_uses_translated_error(): void
    {
        $user = User::factory()->create([
            'stripe_customer_id' => null,
        ]);

        $this->actingAs($user)
            ->post(route('billing.portal'))
            ->assertRedirect(route('profile.show') . '#subscription')
            ->assertSessionHas('billing_error', __('billing.no_stripe_customer'));
    }
}
