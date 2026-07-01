@extends('layouts.app')

@section('content')
    <section class="shell profile-page">
        <div class="profile-stage">
            <div class="profile-hero-card">
                <div class="profile-hero-copy">
                    <span class="profile-kicker">Account</span>
                    <h1>Profile</h1>
                    <p>Update your details, keep your password current, and check your plan from one cleaner space.</p>
                </div>

                <aside class="profile-hero-summary" aria-label="Subscription snapshot">
                    <span class="profile-summary-label">Current plan</span>
                    <strong class="profile-summary-plan">{{ $planLabels[$user->subscription_plan] ?? 'Free access' }}</strong>
                    <p class="profile-summary-meta">
                        {{ ucfirst($user->subscription_status ?? 'free') }} access
                        &middot;
                        Renewal {{ optional($user->subscription_current_period_ends_at)->format('j M Y') ?? 'not scheduled' }}
                    </p>

                    <div class="profile-hero-actions">
                        <a class="billing-primary-btn profile-action-btn" href="{{ route('home') }}#pricing">Upgrade Plan</a>
                        @if ($user->stripe_customer_id)
                            <form method="POST" action="{{ route('billing.portal') }}">
                                @csrf
                                <button type="submit" class="billing-secondary-btn profile-action-btn">Manage subscription</button>
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
                        <h2>Personal details</h2>
                        <p>Keep your account information current.</p>
                    </div>

                    <form method="POST" action="{{ route('profile.update') }}" class="profile-form">
                        @csrf
                        @method('PUT')

                        <div>
                            <label class="form-label" for="profileName">Full name</label>
                            <input id="profileName" name="name" type="text" class="form-control @error('name') is-invalid @enderror" value="{{ old('name', $user->name) }}" required autocomplete="name">
                            @error('name')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <div>
                            <label class="form-label" for="profileEmail">Email</label>
                            <input id="profileEmail" name="email" type="email" class="form-control @error('email') is-invalid @enderror" value="{{ old('email', $user->email) }}" required autocomplete="email">
                            @error('email')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <button type="submit" class="billing-primary-btn profile-submit-btn">Save profile</button>
                    </form>
                </article>

                <article class="profile-card profile-pane" id="settings">
                    <div class="profile-card-head">
                        <h2>{{ $user->google_id ? 'Set password' : 'Change password' }}</h2>
                        <p>{{ $user->google_id ? 'Add a password for email sign-in.' : 'Use a strong password.' }}</p>
                    </div>

                    <form method="POST" action="{{ route('profile.password.update') }}" class="profile-form">
                        @csrf
                        @method('PUT')

                        @if (! $user->google_id)
                            <div>
                                <label class="form-label" for="currentPassword">Current password</label>
                                <input id="currentPassword" name="current_password" type="password" class="form-control @error('current_password') is-invalid @enderror" autocomplete="current-password">
                                @error('current_password')
                                    <div class="invalid-feedback d-block">{{ $message }}</div>
                                @enderror
                            </div>
                        @endif

                        <div>
                            <label class="form-label" for="newPassword">New password</label>
                            <input id="newPassword" name="password" type="password" class="form-control @error('password') is-invalid @enderror" autocomplete="new-password">
                            @error('password')
                                <div class="invalid-feedback d-block">{{ $message }}</div>
                            @enderror
                        </div>

                        <div>
                            <label class="form-label" for="newPasswordConfirmation">Confirm new password</label>
                            <input id="newPasswordConfirmation" name="password_confirmation" type="password" class="form-control" autocomplete="new-password">
                        </div>

                        <button type="submit" class="billing-secondary-btn profile-submit-btn">Update password</button>
                    </form>
                </article>
            </div>

            <article class="profile-card profile-pane profile-card-wide" id="subscription">
                <div class="profile-card-head profile-card-head-split">
                    <div>
                        <h2>Subscription</h2>
                        <p>Your current plan and renewal details.</p>
                    </div>
                    <span class="profile-inline-badge">{{ ucfirst($user->subscription_tier ?? 'free') }} tier</span>
                </div>

                <div class="profile-subscription-grid">
                    <div class="profile-subscription-item">
                        <span>Status</span>
                        <strong>{{ ucfirst($user->subscription_status ?? 'free') }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>Current plan</span>
                        <strong>{{ $planLabels[$user->subscription_plan] ?? 'Free access' }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>Tier</span>
                        <strong>{{ ucfirst($user->subscription_tier ?? 'free') }}</strong>
                    </div>
                    <div class="profile-subscription-item">
                        <span>Renewal date</span>
                        <strong>{{ optional($user->subscription_current_period_ends_at)->format('j M Y') ?? 'Not scheduled' }}</strong>
                    </div>
                </div>

                @if ($user->subscription_trial_ends_at)
                    <p class="profile-subscription-note">Trial ends on {{ $user->subscription_trial_ends_at->format('j M Y') }}.</p>
                @endif

                <div class="profile-subscription-actions">
                    <a class="billing-primary-btn profile-action-btn" href="{{ route('home') }}#pricing">Upgrade Plan</a>
                    @if ($user->stripe_customer_id)
                        <form method="POST" action="{{ route('billing.portal') }}">
                            @csrf
                            <button type="submit" class="billing-secondary-btn profile-action-btn">Manage subscription</button>
                        </form>
                    @endif
                </div>
            </article>
        </div>
    </section>
@endsection
