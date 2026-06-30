@extends('layouts.app')

@section('content')
    <section class="shell profile-page">
        <div class="profile-stage">
            <div class="profile-hero-card">
                <div class="profile-hero-copy">
                    <span class="profile-kicker">{{ __('profile.kicker') }}</span>
                    <h1>{{ __('profile.title') }}</h1>
                    <p>{{ __('profile.hero_desc') }}</p>
                </div>

                <aside class="profile-hero-summary" aria-label="{{ __('profile.subscription_snapshot') }}">
                    <span class="profile-summary-label">{{ __('profile.current_plan') }}</span>
                    <strong class="profile-summary-plan">{{ $planLabels[$user->subscription_plan] ?? __('profile.free_access') }}</strong>
                    <p class="profile-summary-meta">
                        {{ ucfirst($user->subscription_status ?? 'free') }} {{ __('profile.access') }}
                        &middot;
                        {{ __('profile.renewal') }} {{ optional($user->subscription_current_period_ends_at)->format('j M Y') ?? __('profile.not_scheduled') }}
                    </p>

                    <div class="profile-hero-actions">
                        <a class="billing-primary-btn profile-action-btn" href="{{ route('home') }}#pricing">{{ __('profile.upgrade_plan') }}</a>
                        @if ($user->stripe_customer_id)
                            <form method="POST" action="{{ route('billing.portal') }}">
                                @csrf
                                <button type="submit" class="billing-secondary-btn profile-action-btn">{{ __('profile.manage_subscription') }}</button>
                            </form>
                        @endif
                    </div>
                </aside>
            </div>

            @if (session('profile_status'))
                <div class="billing-alert billing-alert-success">{{ session('profile_status') }}</div>
            @endif

            @if (session('password_status'))
                <div class="billing-alert billing-alert-success">{{ session('password_status') }}</div>
            @endif

            @if (session('billing_status'))
                <div class="billing-alert billing-alert-success">{{ session('billing_status') }}</div>
            @endif

            @if (session('billing_error'))
                <div class="billing-alert billing-alert-error">{{ session('billing_error') }}</div>
            @endif

            <div class="profile-grid">
                <article class="profile-card profile-pane">
                    <div class="profile-card-head">
                        <h2>{{ __('profile.personal_details') }}</h2>
                        <p>{{ __('profile.personal_details_desc') }}</p>
                    </div>

                    <form method="POST" action="{{ route('profile.update') }}" class="profile-form">
                        @csrf
                        @method('PUT')

                        <div>
                            <label class="form-label" for="profileName">{{ __('profile.full_name') }}</label>
                            <input id="profileName" name="name" type="text" class="form-control @error('name') is-invalid @enderror" value="{{ old('name', $user->name) }}" required autocomplete="name">
                            @error('name')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <div>
                            <label class="form-label" for="profileEmail">{{ __('profile.email') }}</label>
                            <input id="profileEmail" name="email" type="email" class="form-control @error('email') is-invalid @enderror" value="{{ old('email', $user->email) }}" required autocomplete="email">
                            @error('email')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <button type="submit" class="billing-primary-btn profile-submit-btn">{{ __('profile.save_profile') }}</button>
                    </form>
                </article>

                <article class="profile-card profile-pane" id="settings">
                    <div class="profile-card-head">
                        <h2>{{ $user->google_id ? __('profile.set_password') : __('profile.change_password') }}</h2>
                        <p>{{ $user->google_id ? __('profile.set_password_desc') : __('profile.change_password_desc') }}</p>
                    </div>

                    <form method="POST" action="{{ route('profile.password.update') }}" class="profile-form">
                        @csrf
                        @method('PUT')

                        @if (! $user->google_id)
                            <div>
                                <label class="form-label" for="currentPassword">{{ __('profile.current_password') }}</label>
                                <input id="currentPassword" name="current_password" type="password" class="form-control @error('current_password') is-invalid @enderror" autocomplete="current-password">
                                @error('current_password')
                                    <div class="invalid-feedback d-block">{{ $message }}</div>
                                @enderror
                            </div>
                        @endif

                        <div>
                            <label class="form-label" for="newPassword">{{ __('profile.new_password') }}</label>
                            <input id="newPassword" name="password" type="password" class="form-control @error('password') is-invalid @enderror" autocomplete="new-password">
                            @error('password')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <div>
                            <label class="form-label" for="newPasswordConfirmation">{{ __('profile.confirm_new_password') }}</label>
                            <input id="newPasswordConfirmation" name="password_confirmation" type="password" class="form-control" autocomplete="new-password">
                        </div>

                        <button type="submit" class="billing-secondary-btn profile-submit-btn">{{ __('profile.update_password') }}</button>
                    </form>
                </article>
            </div>

            <article class="profile-card profile-pane profile-card-wide" id="subscription">
                <div class="profile-card-head profile-card-head-split">
                    <div>
                        <h2>{{ __('profile.subscription') }}</h2>
                        <p>{{ __('profile.subscription_desc') }}</p>
                    </div>
                    <span class="profile-inline-badge">{{ ucfirst($user->subscription_tier ?? 'free') }} {{ __('profile.tier') }}</span>
                </div>

                <div class="profile-subscription-grid">
                    <div class="profile-subscription-item">
                        <span>{{ __('profile.status') }}</span>
                        <strong>{{ ucfirst($user->subscription_status ?? 'free') }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>{{ __('profile.current_plan') }}</span>
                        <strong>{{ $planLabels[$user->subscription_plan] ?? __('profile.free_access') }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>{{ __('profile.tier_label') }}</span>
                        <strong>{{ ucfirst($user->subscription_tier ?? 'free') }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>{{ __('profile.renewal_date') }}</span>
                        <strong>{{ optional($user->subscription_current_period_ends_at)->format('j M Y') ?? __('profile.not_scheduled_cap') }}</strong>
                    </div>
                </div>

                @if ($user->subscription_trial_ends_at)
                    <p class="profile-subscription-note">{{ __('profile.trial_ends', ['date' => $user->subscription_trial_ends_at->format('j M Y')]) }}</p>
                @endif

                <div class="profile-subscription-actions">
                    <a class="billing-primary-btn profile-action-btn" href="{{ route('home') }}#pricing">{{ __('profile.upgrade_plan') }}</a>
                    @if ($user->stripe_customer_id)
                        <form method="POST" action="{{ route('billing.portal') }}">
                            @csrf
                            <button type="submit" class="billing-secondary-btn profile-action-btn">{{ __('profile.manage_subscription') }}</button>
                        </form>
                    @endif
                </div>
            </article>
        </div>
    </section>
@endsection
