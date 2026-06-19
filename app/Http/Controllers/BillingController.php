<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Carbon;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Http;
use Illuminate\Validation\Rule;

class BillingController extends Controller
{
    public function index(Request $request)
    {
        return redirect()->to(route('home') . '#pricing');
    }

    public function checkout(Request $request)
    {
        $planKey = $request->validate([
            'plan' => ['required', 'string', Rule::in(array_keys($this->paidPlans()))],
        ])['plan'];

        $user = $request->user();
        $plan = config("billing.plans.$planKey");
        $priceId = $plan['price_id'] ?? null;

        abort_unless($priceId, 500, 'Stripe price is not configured.');

        $checkoutData = [
            'mode' => 'subscription',
            'success_url' => route('billing.success') . '?session_id={CHECKOUT_SESSION_ID}',
            'cancel_url' => route('billing.index', ['plan' => $planKey]),
            'metadata[plan]' => $planKey,
            'subscription_data[trial_period_days]' => $plan['trial_days'],
            'subscription_data[metadata][plan]' => $planKey,
            'line_items[0][quantity]' => 1,
            'line_items[0][price]' => $priceId,
        ];

        if ($user) {
            $checkoutData['customer'] = $this->ensureStripeCustomer($user);
            $checkoutData['client_reference_id'] = (string) $user->id;
            $checkoutData['metadata[user_id]'] = (string) $user->id;
            $checkoutData['subscription_data[metadata][user_id]'] = (string) $user->id;
        }

        $session = $this->stripePost('checkout/sessions', $checkoutData);

        return redirect()->away($session['url']);
    }

    public function success(Request $request)
    {
        $sessionId = (string) $request->query('session_id', '');

        if ($sessionId !== '') {
            $session = $this->stripeGet("checkout/sessions/$sessionId");

            $user = $request->user();

            if ($user && ($session['client_reference_id'] ?? null) === (string) $user->id) {
                $this->syncSubscriptionFromStripe((string) ($session['subscription'] ?? ''));
            }
        }

        if ($request->user()) {
            return redirect()->to(route('profile.show') . '#subscription')->with('billing_status', 'Your Mutqin subscription is being activated.');
        }

        return redirect()->route('login')->with('status', 'Your checkout completed. Sign in with the same email to sync your subscription.');
    }

    public function portal(Request $request)
    {
        $user = $request->user();

        if (!$user->stripe_customer_id) {
            return redirect()->to(route('profile.show') . '#subscription')->with('billing_error', 'No Stripe customer exists for this account yet.');
        }

        $session = $this->stripePost('billing_portal/sessions', [
            'customer' => $user->stripe_customer_id,
            'return_url' => route('profile.show') . '#subscription',
        ]);

        return redirect()->away($session['url']);
    }

    public function webhook(Request $request)
    {
        $payload = $request->getContent();
        $signature = (string) $request->header('Stripe-Signature', '');
        $webhookSecret = config('services.stripe.webhook_secret');

        if ($webhookSecret && !$this->hasValidSignature($payload, $signature, $webhookSecret)) {
            return response('Invalid signature', 400);
        }

        $event = json_decode($payload, true);

        if (!is_array($event)) {
            return response('Invalid payload', 400);
        }

        $object = $event['data']['object'] ?? [];

        match ($event['type'] ?? '') {
            'checkout.session.completed' => $this->syncSubscriptionFromStripe((string) ($object['subscription'] ?? '')),
            'customer.subscription.created',
            'customer.subscription.updated',
            'customer.subscription.deleted' => $this->applySubscription($object),
            default => null,
        };

        return response('OK');
    }

    private function paidPlans(): array
    {
        return array_filter(config('billing.plans'), fn (array $plan) => isset($plan['price_id']));
    }

    private function ensureStripeCustomer(User $user): string
    {
        if ($user->stripe_customer_id) {
            return $user->stripe_customer_id;
        }

        $customer = $this->stripePost('customers', [
            'email' => $user->email,
            'name' => $user->name,
            'metadata[user_id]' => (string) $user->id,
        ]);

        $user->forceFill(['stripe_customer_id' => $customer['id']])->save();

        return $customer['id'];
    }

    private function syncSubscriptionFromStripe(string $subscriptionId): void
    {
        if ($subscriptionId === '') {
            return;
        }

        $subscription = $this->stripeGet("subscriptions/$subscriptionId");
        $this->applySubscription($subscription);
    }

    private function applySubscription(array $subscription): void
    {
        $userId = $subscription['metadata']['user_id'] ?? null;
        $customerId = $subscription['customer'] ?? null;
        $user = $userId ? User::find($userId) : null;
        $user ??= $customerId ? User::where('stripe_customer_id', $customerId)->first() : null;

        if (!$user) {
            return;
        }

        $planKey = $subscription['metadata']['plan'] ?? $user->subscription_plan;
        $plan = $planKey ? config("billing.plans.$planKey") : null;
        $status = (string) ($subscription['status'] ?? 'incomplete');
        $active = in_array($status, ['trialing', 'active'], true);

        $user->forceFill([
            'stripe_customer_id' => $customerId ?: $user->stripe_customer_id,
            'stripe_subscription_id' => $subscription['id'] ?? $user->stripe_subscription_id,
            'subscription_plan' => $planKey,
            'subscription_tier' => $active && $plan ? $plan['tier'] : 'free',
            'subscription_status' => $status,
            'subscription_trial_ends_at' => $this->timestamp($subscription['trial_end'] ?? null),
            'subscription_current_period_ends_at' => $this->timestamp($subscription['current_period_end'] ?? null),
        ])->save();
    }

    private function stripeGet(string $path): array
    {
        return $this->stripeRequest('get', $path);
    }

    private function stripePost(string $path, array $data): array
    {
        return $this->stripeRequest('post', $path, $data);
    }

    private function stripeRequest(string $method, string $path, array $data = []): array
    {
        $secret = config('services.stripe.secret_key');

        abort_unless($secret, 500, 'Stripe secret key is not configured.');

        $response = Http::asForm()
            ->withToken($secret)
            ->acceptJson()
            ->{$method}("https://api.stripe.com/v1/$path", $data);

        if (!$response->successful()) {
            $message = $response->json('error.message') ?? 'Stripe request failed.';
            abort($response->status() ?: 502, $message);
        }

        return $response->json();
    }

    private function timestamp(mixed $value): ?Carbon
    {
        return $value ? Carbon::createFromTimestamp((int) $value) : null;
    }

    private function hasValidSignature(string $payload, string $signature, string $secret): bool
    {
        $parts = collect(explode(',', $signature))
            ->mapWithKeys(function (string $part) {
                [$key, $value] = array_pad(explode('=', $part, 2), 2, null);

                return $key && $value ? [$key => $value] : [];
            });

        $timestamp = $parts->get('t');
        $expected = $parts->get('v1');

        if (!$timestamp || !$expected || abs(time() - (int) $timestamp) > 300) {
            return false;
        }

        $signedPayload = $timestamp . '.' . $payload;
        $computed = hash_hmac('sha256', $signedPayload, $secret);

        return hash_equals($expected, $computed);
    }
}
