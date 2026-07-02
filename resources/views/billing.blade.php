@extends('layouts.app')

@section('content')
    @php
        $user = Auth::user();
        $selectedPlan ??= null;
        $selectedTier = $selectedPlan ? str($selectedPlan)->before('_')->toString() : null;
        $planLabels = [
            'free' => __('billing.free_access'),
            'premium_monthly' => __('billing.premium_monthly'),
            'premium_yearly' => __('billing.premium_yearly'),
            'pro_monthly' => __('billing.pro_monthly'),
            'pro_yearly' => __('billing.pro_yearly'),
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
                <span class="billing-kicker">{{ __('billing.kicker') }}</span>
                <h1>{{ __('billing.title') }}</h1>
                <p>{{ __('billing.hero_desc') }}</p>
            </div>
            <div class="billing-status-panel">
                @auth
                    <span>{{ __('billing.current_plan') }}</span>
                    <strong>{{ ucfirst($user->subscription_tier ?? 'free') }}</strong>
                    <small>
                        {{ $planLabels[$user->subscription_plan] ?? __('billing.free_access') }}
                        @if ($user->subscription_status && $user->subscription_status !== 'free')
                            · {{ ucfirst($user->subscription_status) }}
                        @endif
                    </small>
                    @if ($user->subscription_trial_ends_at)
                        <small>{{ __('billing.trial_ends', ['date' => $user->subscription_trial_ends_at->format('j M Y')]) }}</small>
                    @endif
                    @if ($user->stripe_customer_id)
                        <form method="POST" action="{{ route('billing.portal') }}">
                            @csrf
                            <button class="billing-link-btn" type="submit">
                                <i class="bi bi-credit-card"></i> {{ __('billing.manage_billing') }}
                            </button>
                        </form>
                    @endif
                @else
                    <span>{{ __('billing.checkout') }}</span>
                    <strong>{{ __('billing.no_account_needed') }}</strong>
                    <small>{{ __('billing.stripe_email_note') }}</small>
                    <a class="billing-link-btn" href="{{ route('login') }}">
                        <i class="bi bi-box-arrow-in-right"></i> {{ __('billing.sign_in_sync') }}
                    </a>
                @endauth
            </div>
        </div>

        @if (session('billing_status'))
            <div class="billing-confirmation">
                <div>
                    <span class="billing-confirmation-kicker">{{ __('billing.checkout_complete') }}</span>
                    <h2>{{ session('billing_status') }}</h2>
                    <p>{{ __('billing.checkout_sync_note') }}</p>
                </div>
                <div class="billing-confirmation-actions">
                    <a class="billing-primary-btn" href="{{ route('memorisation') }}">
                        <i class="bi bi-arrow-right-circle"></i>
                        {{ __('billing.go_to_app') }}
                    </a>
                    @auth
                        @if ($user->stripe_customer_id)
                            <form method="POST" action="{{ route('billing.portal') }}">
                                @csrf
                                <button class="billing-secondary-btn" type="submit">
                                    <i class="bi bi-credit-card"></i>
                                    {{ __('billing.manage_billing') }}
                                </button>
                            </form>
                        @endif
                    @else
                        <a class="billing-secondary-btn" href="{{ route('login') }}">
                            <i class="bi bi-box-arrow-in-right"></i>
                            {{ __('billing.sign_in') }}
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
                {{ __('billing.selected_from_homepage', ['plan' => $planLabels[$selectedPlan] ?? ucfirst($selectedTier)]) }}
            </div>
        @endif

        <div class="billing-grid" id="billing-plans">
            <article id="billing-free" class="billing-card {{ $selectedTier === 'free' ? 'billing-card-selected' : '' }}">
                <div class="billing-card-head">
                    <i class="bi bi-flower1"></i>
                    <h2>{{ __('billing.free') }}</h2>
                    <div class="billing-price">£0</div>
                </div>
                <ul>
                    @foreach ($plans['free']['features'] as $feature)
                        <li><i class="bi bi-check-circle-fill"></i>{{ $feature }}</li>
                    @endforeach
                </ul>
                <a class="billing-secondary-btn" href="{{ route('memorisation') }}">{{ __('billing.continue_free') }}</a>
            </article>

            <article id="billing-premium" class="billing-card billing-card-featured {{ $selectedTier === 'premium' ? 'billing-card-selected' : '' }}">
                <div class="billing-pill">{{ __('billing.free_trial_pill') }}</div>
                <div class="billing-card-head">
                    <i class="bi bi-stars"></i>
                    <h2>{{ __('billing.premium') }}</h2>
                    <div class="billing-price">£2.99 <span>{{ __('billing.per_month') }}</span></div>
                    <small>{{ __('billing.or_yearly_premium') }}</small>
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
                        <button class="billing-primary-btn {{ $selectedPlan === 'premium_monthly' ? 'billing-plan-selected-action' : '' }}" type="submit">{{ __('billing.monthly') }}</button>
                    </form>
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="premium_yearly">
                        <button class="billing-secondary-btn {{ $selectedPlan === 'premium_yearly' ? 'billing-plan-selected-action' : '' }}" type="submit">{{ __('billing.yearly') }}</button>
                    </form>
                </div>
            </article>

            <article id="billing-pro" class="billing-card {{ $selectedTier === 'pro' ? 'billing-card-selected' : '' }}">
                <div class="billing-pill">{{ __('billing.free_trial_pill') }}</div>
                <div class="billing-card-head">
                    <i class="bi bi-gem"></i>
                    <h2>{{ __('billing.pro') }}</h2>
                    <div class="billing-price">£5.99 <span>{{ __('billing.per_month') }}</span></div>
                    <small>{{ __('billing.or_yearly_pro') }}</small>
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
                        <button class="billing-primary-btn {{ $selectedPlan === 'pro_monthly' ? 'billing-plan-selected-action' : '' }}" type="submit">{{ __('billing.monthly') }}</button>
                    </form>
                    <form method="POST" action="{{ route('billing.checkout') }}">
                        @csrf
                        <input type="hidden" name="plan" value="pro_yearly">
                        <button class="billing-secondary-btn {{ $selectedPlan === 'pro_yearly' ? 'billing-plan-selected-action' : '' }}" type="submit">{{ __('billing.yearly') }}</button>
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
