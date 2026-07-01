@extends('layouts.app')

@section('content')
    @php
        $user = Auth::user();
        $selectedPlan ??= null;
        $selectedTier = $selectedPlan ? str($selectedPlan)->before('_')->toString() : null;
        $planLabels = [
            'free' => 'Free access',
            'premium_monthly' => 'Premium monthly',
            'premium_yearly' => 'Premium yearly',
            'pro_monthly' => 'Pro monthly',
            'pro_yearly' => 'Pro yearly',
        ];
    @endphp

    <section class="billing-page shell">
        @if (app()->environment('local'))
            <div class="billing-debug">
                <strong>Debug</strong>
                <span>Premium monthly: {{ $plans['premium_monthly']['price_id'] }}</span>
                <span>Premium yearly: {{ $plans['premium_yearly']['price_id'] }}</span>
                <span>Pro monthly: {{ $plans['pro_monthly']['price_id'] }}</span>
                <span>Pro yearly: {{ $plans['pro_yearly']['price_id'] }}</span>
            </div>
        @endif

        <div class="billing-hero">
            <div>
                <span class="billing-kicker">Mutqin Billing</span>
                <h1>Choose the plan that fits your memorisation.</h1>
                <p>Start on Free, or unlock Premium and Pro with a 7-day free trial. No account required to begin checkout.</p>
            </div>
            <div class="billing-status-panel">
                @auth
                    <span>Current plan</span>
                    <strong>{{ ucfirst($user->subscription_tier ?? 'free') }}</strong>
                    <small>
                        {{ $planLabels[$user->subscription_plan] ?? 'Free access' }}
                        @if ($user->subscription_status && $user->subscription_status !== 'free')
                            · {{ ucfirst($user->subscription_status) }}
                        @endif
                    </small>
                    @if ($user->subscription_trial_ends_at)
                        <small>Trial ends {{ $user->subscription_trial_ends_at->format('j M Y') }}</small>
                    @endif
                    @if ($user->stripe_customer_id)
                        <form method="POST" action="{{ route('billing.portal') }}">
                            @csrf
                            <button class="billing-link-btn" type="submit">
                                <i class="bi bi-credit-card"></i> Manage billing
                            </button>
                        </form>
                    @endif
                @else
                    <span>Checkout</span>
                    <strong>No account needed</strong>
                    <small>Stripe collects your email securely during checkout.</small>
                    <a class="billing-link-btn" href="{{ route('login') }}">
                        <i class="bi bi-box-arrow-in-right"></i> Sign in to sync plan
                    </a>
                @endauth
            </div>
        </div>

        @if (session('billing_status'))
            <div class="billing-confirmation">
                <div>
                    <span class="billing-confirmation-kicker">Checkout complete</span>
                    <h2>{{ session('billing_status') }}</h2>
                    <p>Your subscription is active in Stripe. Sign in with the same email to sync it with Mutqin.</p>
                </div>
                <div class="billing-confirmation-actions">
                    <a class="billing-primary-btn" href="{{ route('memorisation') }}">
                        <i class="bi bi-arrow-right-circle"></i>
                        Go to app
                    </a>
                    @auth
                        @if ($user->stripe_customer_id)
                            <form method="POST" action="{{ route('billing.portal') }}">
                                @csrf
                                <button class="billing-secondary-btn" type="submit">
                                    <i class="bi bi-credit-card"></i>
                                    Manage billing
                                </button>
                            </form>
                        @endif
                    @else
                        <a class="billing-secondary-btn" href="{{ route('login') }}">
                            <i class="bi bi-box-arrow-in-right"></i>
                            Sign in
                        </a>
                    @endauth
                </div>
            </div>
        @endif

        @if (session('billing_error'))
            <div class="billing-alert billing-alert-error">{{ session('billing_error') }}</div>
        @endif

        @if ($selectedPlan)
            <div class="billing-alert billing-alert-info">
                Selected from homepage: {{ $planLabels[$selectedPlan] ?? ucfirst($selectedTier) }}.
            </div>
        @endif

        <div class="billing-grid" id="billing-plans">
            <article id="billing-free" class="billing-card {{ $selectedTier === 'free' ? 'billing-card-selected' : '' }}">
                <div class="billing-card-head">
                    <i class="bi bi-flower1"></i>
                    <h2>Free</h2>
                    <div class="billing-price">£0</div>
                </div>
                <ul>
                    @foreach ($plans['free']['features'] as $feature)
                        <li><i class="bi bi-check-circle-fill"></i>{{ $feature }}</li>
                    @endforeach
                </ul>
                <a class="billing-secondary-btn" href="{{ route('memorisation') }}">Continue free</a>
            </article>

            <article id="billing-premium" class="billing-card billing-card-featured {{ $selectedTier === 'premium' ? 'billing-card-selected' : '' }}">
                <div class="billing-pill">7-day free trial</div>
                <div class="billing-card-head">
                    <i class="bi bi-stars"></i>
                    <h2>Premium</h2>
                    <div class="billing-price">£2.99 <span>/ month</span></div>
                    <small>or £17.99 yearly</small>
                </div>
                <ul>
                    @foreach ($plans['premium_monthly']['features'] as $feature)
                        <li><i class="bi bi-check-circle-fill"></i>{{ $feature }}</li>
                    @endforeach
                </ul>
                <div class="billing-actions">
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="premium_monthly">
                        <button class="billing-primary-btn {{ $selectedPlan === 'premium_monthly' ? 'billing-plan-selected-action' : '' }}" type="submit">Monthly</button>
                    </form>
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="premium_yearly">
                        <button class="billing-secondary-btn {{ $selectedPlan === 'premium_yearly' ? 'billing-plan-selected-action' : '' }}" type="submit">Yearly</button>
                    </form>
                </div>
            </article>

            <article id="billing-pro" class="billing-card {{ $selectedTier === 'pro' ? 'billing-card-selected' : '' }}">
                <div class="billing-pill">7-day free trial</div>
                <div class="billing-card-head">
                    <i class="bi bi-gem"></i>
                    <h2>Pro</h2>
                    <div class="billing-price">£5.99 <span>/ month</span></div>
                    <small>or £49.99 yearly</small>
                </div>
                <ul>
                    @foreach ($plans['pro_monthly']['features'] as $feature)
                        <li><i class="bi bi-check-circle-fill"></i>{{ $feature }}</li>
                    @endforeach
                </ul>
                <div class="billing-actions">
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="pro_monthly">
                        <button class="billing-primary-btn {{ $selectedPlan === 'pro_monthly' ? 'billing-plan-selected-action' : '' }}" type="submit">Monthly</button>
                    </form>
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="pro_yearly">
                        <button class="billing-secondary-btn {{ $selectedPlan === 'pro_yearly' ? 'billing-plan-selected-action' : '' }}" type="submit">Yearly</button>
                    </form>
                </div>
            </article>
        </div>
    </section>

    @if ($selectedTier)
        <script>
            window.addEventListener('DOMContentLoaded', () => {
                document.getElementById('billing-{{ $selectedTier }}')?.scrollIntoView({
                    behavior: 'smooth',
                    block: 'center',
                });
            });
        </script>
    @endif
@endsection
