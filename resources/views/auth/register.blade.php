@extends('layouts.app')

@php
    $allowedRoles = \App\Support\Registration\RegistrationProfile::allowedAccountRoles();
    $accountRole = old('account_role', 'individual');
    if (! in_array($accountRole, $allowedRoles, true)) {
        $accountRole = 'individual';
    }
    $roleCards = [
        'individual' => ['icon' => 'bi-person', 'title' => __('ui.auth_role_individual_title'), 'lede' => __('ui.auth_role_individual_lede')],
        'student' => ['icon' => 'bi-mortarboard', 'title' => __('ui.auth_role_student_title'), 'lede' => __('ui.auth_role_student_lede')],
        'teacher' => ['icon' => 'bi-easel2', 'title' => __('ui.auth_role_teacher_title'), 'lede' => __('ui.auth_role_teacher_lede')],
        'parent' => ['icon' => 'bi-people', 'title' => __('ui.auth_role_parent_title'), 'lede' => __('ui.auth_role_parent_lede')],
    ];
    $showRolePicker = count($allowedRoles) > 1;
    // Only resume on purpose after a failed submit that already chose a role.
    $startOnPurpose = $showRolePicker && $errors->any() && filled(old('account_role'));
@endphp

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.auth_register_arabic') }}</p>
            <h1
                class="auth-heading"
                data-register-heading
                data-heading-account="{{ __('ui.auth_register_heading') }}"
                data-heading-purpose="{{ __('ui.auth_purpose_heading') }}"
            >{{ $startOnPurpose ? __('ui.auth_purpose_heading') : __('ui.auth_register_heading') }}</h1>
            <p
                class="auth-lede"
                data-register-lede
                data-lede-account="{{ old('intent', request('intent')) === 'first' ? __('ui.auth_register_subtitle_first') : __('ui.auth_register_subtitle') }}"
                data-lede-purpose="{{ __('ui.auth_purpose_subtitle') }}"
            >{{ $startOnPurpose ? __('ui.auth_purpose_subtitle') : (old('intent', request('intent')) === 'first' ? __('ui.auth_register_subtitle_first') : __('ui.auth_register_subtitle')) }}</p>
            @if ($showRolePicker)
                <p class="auth-step" data-register-step-label>{{ __('ui.auth_register_step', ['current' => $startOnPurpose ? 2 : 1, 'total' => 2]) }}</p>
            @endif
        </header>

        @include('partials.ios-pwa-install')

        @error('google')
            <div class="alert alert-danger auth-alert" role="alert">{{ $message }}</div>
        @enderror

        <form
            method="POST"
            action="{{ route('register') }}"
            class="auth-form"
            id="register-form"
            data-show-purpose="{{ $showRolePicker ? '1' : '0' }}"
            data-start-purpose="{{ $startOnPurpose ? '1' : '0' }}"
            data-step-label="{{ __('ui.auth_register_step', ['current' => ':current', 'total' => '2']) }}"
        >
            @csrf
            @if (old('intent', request('intent')) === 'first')
                <input type="hidden" name="intent" value="first">
            @endif
            <input type="hidden" name="utm_source" value="{{ old('utm_source') }}">
            <input type="hidden" name="utm_medium" value="{{ old('utm_medium') }}">
            <input type="hidden" name="utm_campaign" value="{{ old('utm_campaign') }}">
            <input type="hidden" name="ref" value="{{ old('ref') }}">
            <input type="hidden" name="analytics_anonymous_id" value="{{ old('analytics_anonymous_id') }}">
            <button type="submit" class="auth-implicit-submit" hidden tabindex="-1" aria-hidden="true"></button>

            <div data-register-step="account" @if($startOnPurpose) hidden aria-hidden="true" @endif>
                <div class="auth-field">
                    <label for="name" class="form-label">{{ __('ui.name') }}</label>
                    <input id="name" type="text" class="form-control @error('name') is-invalid @enderror" name="name" value="{{ old('name') }}" placeholder="{{ __('ui.placeholder_name') }}" required autocomplete="name" @if(! $startOnPurpose) autofocus @endif @if($errors->has('name')) aria-invalid="true" aria-describedby="registerNameError" @endif>
                    @error('name')
                        <span id="registerNameError" class="invalid-feedback" role="alert">{{ $message }}</span>
                    @enderror
                </div>

                <div class="auth-field">
                    <label for="email" class="form-label">{{ __('ui.email_address') }}</label>
                    <input id="email" type="email" class="form-control @error('email') is-invalid @enderror" name="email" value="{{ old('email') }}" placeholder="{{ __('ui.placeholder_email') }}" required autocomplete="email" @if($errors->has('email')) aria-invalid="true" aria-describedby="registerEmailError" @endif>
                    @error('email')
                        <span id="registerEmailError" class="invalid-feedback" role="alert">{{ $message }}</span>
                    @enderror
                </div>

                <div class="auth-field">
                    <label for="password" class="form-label">{{ __('ui.password') }}</label>
                    <div class="auth-password-wrap">
                        <input id="password" type="password" class="form-control @error('password') is-invalid @enderror" name="password" placeholder="{{ __('ui.placeholder_new_password') }}" required autocomplete="new-password" @if($errors->has('password')) aria-invalid="true" aria-describedby="registerPasswordError" @endif>
                        <button type="button" class="auth-password-toggle" data-password-toggle="password" aria-label="{{ __('ui.show_password') }}">
                            <i class="bi bi-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                    @error('password')
                        <span id="registerPasswordError" class="invalid-feedback" role="alert">{{ $message }}</span>
                    @enderror
                </div>

                <div class="auth-field">
                    <label for="password-confirm" class="form-label">{{ __('ui.confirm_password') }}</label>
                    <div class="auth-password-wrap">
                        <input id="password-confirm" type="password" class="form-control" name="password_confirmation" placeholder="{{ __('ui.placeholder_confirm_password') }}" required autocomplete="new-password">
                        <button type="button" class="auth-password-toggle" data-password-toggle="password-confirm" aria-label="{{ __('ui.show_password') }}">
                            <i class="bi bi-eye" aria-hidden="true"></i>
                        </button>
                    </div>
                </div>

                @if ($showRolePicker)
                    <button type="button" class="btn auth-submit" data-register-continue>{{ __('ui.continue_btn') }}</button>
                    <div class="auth-divider"><span>{{ __('ui.auth_or') }}</span></div>
                    <button type="button" class="auth-google" data-register-google-continue aria-label="{{ __('ui.continue_google') }}">
                        <span class="auth-google-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fbbc05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"/>
                            </svg>
                        </span>
                        <span>{{ __('ui.continue_google') }}</span>
                    </button>
                @else
                    <input type="hidden" name="account_role" value="individual">
                    <button type="submit" class="btn auth-submit">{{ __('ui.create_account') }}</button>
                    <div class="auth-divider"><span>{{ __('ui.auth_or') }}</span></div>
                    <button type="submit" class="auth-google" formaction="{{ route('auth.google.prepare') }}" formnovalidate data-register-google aria-label="{{ __('ui.continue_google') }}">
                        <span class="auth-google-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fbbc05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"/>
                            </svg>
                        </span>
                        <span>{{ __('ui.continue_google') }}</span>
                    </button>
                @endif
            </div>

            @if ($showRolePicker)
                <div data-register-step="purpose" @if(! $startOnPurpose) hidden aria-hidden="true" @endif>
                    <fieldset class="auth-role">
                        <legend class="auth-role__legend" id="account-role-label">{{ __('ui.auth_role_prompt') }}</legend>
                        <div class="auth-role__options" role="radiogroup" aria-labelledby="account-role-label" @if($errors->has('account_role')) aria-invalid="true" aria-describedby="registerRoleError" @endif>
                            @foreach ($allowedRoles as $roleValue)
                                @continue(! isset($roleCards[$roleValue]))
                                <label class="auth-role__option" for="account-role-{{ $roleValue }}">
                                    <input
                                        id="account-role-{{ $roleValue }}"
                                        type="radio"
                                        name="account_role"
                                        value="{{ $roleValue }}"
                                        @checked($accountRole === $roleValue)
                                        required
                                    >
                                    <span class="auth-role__icon" aria-hidden="true"><i class="bi {{ $roleCards[$roleValue]['icon'] }}"></i></span>
                                    <span class="auth-role__copy">
                                        <span class="auth-role__title">{{ $roleCards[$roleValue]['title'] }}</span>
                                        <span class="auth-role__lede">{{ $roleCards[$roleValue]['lede'] }}</span>
                                    </span>
                                </label>
                            @endforeach
                        </div>
                        @error('account_role')
                            <span id="registerRoleError" class="invalid-feedback" role="alert">{{ $message }}</span>
                        @enderror
                    </fieldset>

                    <button type="submit" class="btn auth-submit" data-register-submit-email>{{ __('ui.create_account') }}</button>
                    <button type="submit" class="auth-google" formaction="{{ route('auth.google.prepare') }}" formnovalidate data-register-submit-google hidden aria-label="{{ __('ui.continue_google') }}">
                        <span class="auth-google-icon" aria-hidden="true">
                            <svg viewBox="0 0 24 24" focusable="false">
                                <path fill="#4285f4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                                <path fill="#34a853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.24 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                                <path fill="#fbbc05" d="M5.84 14.1c-.22-.66-.35-1.36-.35-2.1s.13-1.44.35-2.1V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l3.66-2.84z"/>
                                <path fill="#ea4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06L5.84 9.9C6.71 7.31 9.14 5.38 12 5.38z"/>
                            </svg>
                        </span>
                        <span>{{ __('ui.continue_google') }}</span>
                    </button>
                    <button type="button" class="btn btn-outline-secondary btn-sm mt-2" data-register-back>{{ __('ui.auth_register_back') }}</button>
                </div>
            @endif
        </form>

        <p class="auth-footer">
            {{ __('ui.auth_already_account') }}
            <a href="{{ route('login', \App\Support\BillingIntent::routeParams()) }}">{{ __('ui.auth_sign_in') }}</a>
        </p>
    </div>
</div>
<script>
(function () {
    var form = document.getElementById('register-form');
    if (!form || form.getAttribute('data-show-purpose') !== '1') return;

    var accountStep = form.querySelector('[data-register-step="account"]');
    var purposeStep = form.querySelector('[data-register-step="purpose"]');
    var continueBtn = form.querySelector('[data-register-continue]');
    var googleContinue = form.querySelector('[data-register-google-continue]');
    var backBtn = form.querySelector('[data-register-back]');
    var emailSubmit = form.querySelector('[data-register-submit-email]');
    var googleSubmit = form.querySelector('[data-register-submit-google]');
    var heading = document.querySelector('[data-register-heading]');
    var lede = document.querySelector('[data-register-lede]');
    var stepLabel = document.querySelector('[data-register-step-label]');
    var stepTemplate = form.getAttribute('data-step-label') || '';
    var googleIntent = false;
    var accountInputs = accountStep
        ? Array.prototype.slice.call(accountStep.querySelectorAll('input[name="name"], input[name="email"], input[name="password"], input[name="password_confirmation"]'))
        : [];

    function accountFieldsValid() {
        for (var i = 0; i < accountInputs.length; i += 1) {
            if (!accountInputs[i].checkValidity()) {
                accountInputs[i].reportValidity();
                return false;
            }
        }
        return true;
    }

    function syncAccountRequirements() {
        accountInputs.forEach(function (input) {
            input.required = !googleIntent;
        });
    }

    function setStep(step) {
        var onPurpose = step === 'purpose';
        if (accountStep) {
            accountStep.hidden = onPurpose;
            accountStep.setAttribute('aria-hidden', onPurpose ? 'true' : 'false');
        }
        if (purposeStep) {
            purposeStep.hidden = !onPurpose;
            purposeStep.setAttribute('aria-hidden', onPurpose ? 'false' : 'true');
        }
        if (heading) {
            heading.textContent = onPurpose
                ? (heading.getAttribute('data-heading-purpose') || '')
                : (heading.getAttribute('data-heading-account') || '');
        }
        if (lede) {
            lede.textContent = onPurpose
                ? (lede.getAttribute('data-lede-purpose') || '')
                : (lede.getAttribute('data-lede-account') || '');
        }
        if (stepLabel && stepTemplate) {
            stepLabel.textContent = stepTemplate.replace(':current', onPurpose ? '2' : '1');
        }
        syncAccountRequirements();
        if (emailSubmit) emailSubmit.hidden = googleIntent;
        if (googleSubmit) googleSubmit.hidden = !googleIntent;
        if (onPurpose) {
            var checked = form.querySelector('input[name="account_role"]:checked');
            if (checked) checked.focus();
        } else {
            var nameField = form.querySelector('#name');
            if (nameField) nameField.focus();
        }
    }

    if (continueBtn) {
        continueBtn.addEventListener('click', function () {
            if (!accountFieldsValid()) return;
            googleIntent = false;
            setStep('purpose');
        });
    }

    if (googleContinue) {
        googleContinue.addEventListener('click', function () {
            googleIntent = true;
            setStep('purpose');
        });
    }

    if (backBtn) {
        backBtn.addEventListener('click', function () {
            setStep('account');
        });
    }

    form.addEventListener('submit', function (event) {
        if (purposeStep && purposeStep.hidden) {
            event.preventDefault();
            if (accountFieldsValid()) {
                googleIntent = false;
                setStep('purpose');
            }
            return;
        }
        if (!googleIntent && !accountFieldsValid()) {
            event.preventDefault();
            setStep('account');
        }
    });

    if (form.getAttribute('data-start-purpose') === '1') {
        setStep('purpose');
    }
})();
</script>
@endsection
