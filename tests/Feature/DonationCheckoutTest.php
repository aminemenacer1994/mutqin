<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Http;
use Tests\TestCase;

class DonationCheckoutTest extends TestCase
{
    use RefreshDatabase;

    public function test_donate_page_is_public(): void
    {
        $this->get(route('donate'))
            ->assertOk()
            ->assertSee('<donation-page', false)
            ->assertSee(__('donation.ssr_form_hint'), false);
    }

    public function test_ajax_donation_checkout_returns_stripe_url(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_donate_ajax',
                'url' => 'https://checkout.stripe.com/c/pay/cs_donate_ajax',
            ], 200),
        ]);

        $this->postJson(route('donate.checkout'), [
            'amount' => 10,
            'email' => 'donor@example.com',
        ])
            ->assertOk()
            ->assertJsonPath('url', 'https://checkout.stripe.com/c/pay/cs_donate_ajax');
    }

    public function test_guest_can_start_donation_checkout(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_donate_test',
                'url' => 'https://checkout.stripe.com/c/pay/cs_donate_test',
            ], 200),
        ]);

        $this->post(route('donate.checkout'), [
            'amount' => 10,
            'email' => 'donor@example.com',
            'message' => 'Barakallahu feek',
        ])
            ->assertRedirect('https://checkout.stripe.com/c/pay/cs_donate_test');

        Http::assertSent(function ($request) {
            return str_contains($request->url(), 'checkout/sessions')
                && $request['mode'] === 'payment'
                && $request['line_items[0][price_data][currency]'] === 'gbp'
                && (int) $request['line_items[0][price_data][unit_amount]'] === 1000
                && $request['customer_email'] === 'donor@example.com'
                && $request['metadata[type]'] === 'donation'
                && $request['metadata[donor_message]'] === 'Barakallahu feek';
        });
    }

    public function test_production_checkout_uses_mutqin_ai_return_urls(): void
    {
        $this->withoutMiddleware(\Illuminate\Foundation\Http\Middleware\ValidateCsrfToken::class);
        $this->app->detectEnvironment(fn () => 'production');

        config([
            'services.stripe.secret_key' => 'sk_test',
            'app.url' => 'https://mutqin.ai',
            'mutqin.domains.marketing_host' => 'mutqin.ai',
            'mutqin.domains.app_host' => 'mutqin.ai',
        ]);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_donate_prod',
                'url' => 'https://checkout.stripe.com/c/pay/cs_donate_prod',
            ], 200),
        ]);

        $this->post(route('donate.checkout'), [
            'amount' => 10,
            'email' => 'donor@example.com',
        ])->assertRedirect();

        Http::assertSent(function ($request) {
            return str_contains((string) $request['success_url'], 'https://mutqin.ai/donate/success')
                && str_contains((string) $request['success_url'], 'session_id=')
                && (string) $request['cancel_url'] === 'https://mutqin.ai/donate';
        });
    }

    public function test_authenticated_user_donation_includes_user_metadata(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions' => Http::response([
                'id' => 'cs_donate_auth',
                'url' => 'https://checkout.stripe.com/c/pay/cs_donate_auth',
            ], 200),
        ]);

        $user = User::factory()->create(['email' => 'member@example.com']);

        $this->actingAs($user)
            ->post(route('donate.checkout'), ['amount' => 25])
            ->assertRedirect('https://checkout.stripe.com/c/pay/cs_donate_auth');

        Http::assertSent(function ($request) use ($user) {
            return $request['customer_email'] === 'member@example.com'
                && $request['client_reference_id'] === (string) $user->id
                && $request['metadata[user_id]'] === (string) $user->id
                && (int) $request['line_items[0][price_data][unit_amount]'] === 2500;
        });
    }

    public function test_donation_checkout_requires_stripe_secret(): void
    {
        config(['services.stripe.secret_key' => null]);

        $this->post(route('donate.checkout'), ['amount' => 10])
            ->assertRedirect(route('donate'))
            ->assertSessionHas('donation_error');

        Http::assertNothingSent();
    }

    public function test_donation_checkout_rejects_amount_below_minimum(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        $this->post(route('donate.checkout'), ['amount' => 2])
            ->assertSessionHasErrors('amount');

        Http::assertNothingSent();
    }

    public function test_donation_success_shows_thank_you_for_paid_session(): void
    {
        config(['services.stripe.secret_key' => 'sk_test']);

        Http::fake([
            'https://api.stripe.com/v1/checkout/sessions/cs_paid' => Http::response([
                'id' => 'cs_paid',
                'payment_status' => 'paid',
                'metadata' => ['type' => 'donation'],
            ], 200),
        ]);

        $this->get(route('donate.success', ['session_id' => 'cs_paid']))
            ->assertRedirect(route('donate'))
            ->assertSessionHas('donation_status', __('donation.thank_you'));
    }
}
