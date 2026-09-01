@extends('layouts.app')

@section('content')
    @php
        $isAdmin = $isAdmin ?? $user->isAdmin();
        $planKey = strtolower((string) ($user->subscription_plan ?: 'free'));
        $planLabel = $isAdmin
            ? __('profile.org_plan')
            : ($planLabels[$planKey] ?? __('profile.free_access'));
        $renewalEndsAt = $user->subscription_current_period_ends_at;
        $isFreeLike = in_array($planKey, ['free', ''], true)
            || in_array(strtolower((string) ($user->subscription_status ?: 'free')), ['free', 'none', ''], true);
        $isChangePassword = $user->hasSetPassword();
    @endphp

    <section class="container-fluid shell profile-page">
        <div class="profile-stage">
            <div class="profile-hero-card">
                <div class="profile-hero-copy">
                    <div class="profile-kicker-row">
                        <span class="profile-kicker">{{ $isAdmin ? __('profile.kicker_admin') : __('profile.kicker') }}</span>
                    </div>
                    <h1>{{ __('profile.title') }}</h1>
                    <p>{{ $isAdmin ? __('profile.hero_desc_admin') : __('profile.hero_desc') }}</p>
                </div>

                <aside
                    class="profile-hero-summary"
                    aria-label="{{ $isAdmin ? __('profile.org_snapshot') : __('profile.subscription_snapshot') }}"
                >
                    <div class="profile-summary-copy">
                        <span class="profile-summary-label">
                            {{ $isAdmin ? __('profile.org_plan_label') : __('profile.current_plan') }}
                        </span>
                        <strong class="profile-summary-plan">{{ $planLabel }}</strong>
                        @unless ($isAdmin)
                            <p class="profile-summary-meta">
                                @if ($renewalEndsAt)
                                    {{ __('profile.renewal_on', ['date' => $renewalEndsAt->format('j M Y')]) }}
                                @elseif ($isFreeLike)
                                    {{ __('profile.renewal_free_never') }}
                                @else
                                    {{ __('profile.renewal_not_scheduled') }}
                                @endif
                            </p>
                            @if ($user->subscription_trial_ends_at)
                                <p class="profile-summary-meta">{{ __('profile.trial_ends', ['date' => $user->subscription_trial_ends_at->format('j M Y')]) }}</p>
                            @endif
                        @endunless
                    </div>

                    <div class="profile-hero-actions">
                        @if ($isAdmin)
                            <a class="billing-primary-btn profile-action-btn profile-upgrade-btn" href="{{ route('admin.dashboard') }}">
                                <i class="bi bi-speedometer2" aria-hidden="true"></i>
                                {{ __('profile.open_admin_console') }}
                            </a>
                        @else
                            @if ($user->stripe_customer_id)
                                <form method="POST" action="{{ route('billing.portal') }}">
                                    @csrf
                                    <button type="submit" class="billing-secondary-btn profile-action-btn">{{ __('profile.manage_subscription') }}</button>
                                </form>
                            @endif
                            <a class="billing-primary-btn profile-action-btn profile-upgrade-btn" href="{{ route('pricing') }}">{{ __('profile.upgrade_plan') }}</a>
                        @endif
                    </div>
                </aside>
            </div>

            @if (session('billing_status'))
                <div class="billing-alert billing-alert-success">{{ session('billing_status') }}</div>
            @endif

            @if (session('billing_error'))
                <div class="billing-alert billing-alert-error">{{ session('billing_error') }}</div>
            @endif

            <div
                class="profile-toast"
                data-profile-toast
                role="status"
                aria-live="polite"
                hidden
                @if (session('profile_status')) data-flash-profile="{{ session('profile_status') }}" @endif
                @if (session('password_status')) data-flash-password="{{ session('password_status') }}" @endif
            ></div>

            <section class="profile-account" aria-label="{{ __('profile.account_settings') }}">
                <div class="profile-grid">
                    <article class="profile-card profile-pane profile-card--details" data-profile-details>
                        <div class="profile-card-head">
                            <h2><i class="bi bi-person-vcard" aria-hidden="true"></i>{{ __('profile.personal_details') }}</h2>
                            <p>{{ __('profile.personal_details_desc') }}</p>
                        </div>

                        <form
                            method="POST"
                            action="{{ route('profile.update') }}"
                            class="profile-form"
                            data-profile-form
                            data-form-kind="profile"
                            novalidate
                        >
                            @csrf
                            @method('PUT')

                            <div class="profile-field" data-field="name">
                                <label class="form-label" for="profileName">{{ __('profile.full_name') }}</label>
                                <input
                                    id="profileName"
                                    name="name"
                                    type="text"
                                    class="form-control @error('name') is-invalid @enderror"
                                    value="{{ old('name', $user->name) }}"
                                    data-initial="{{ $user->name }}"
                                    required
                                    autocomplete="name"
                                    @if ($errors->has('name')) aria-invalid="true" @endif
                                >
                                <p class="profile-field-error" data-error-for="name" role="alert">
                                    @error('name'){{ $message }}@enderror
                                </p>
                            </div>

                            <div class="profile-field" data-field="email">
                                <label class="form-label" for="profileEmail">{{ __('profile.email') }}</label>
                                <input
                                    id="profileEmail"
                                    name="email"
                                    type="email"
                                    class="form-control @error('email') is-invalid @enderror"
                                    value="{{ old('email', $user->email) }}"
                                    data-initial="{{ $user->email }}"
                                    required
                                    autocomplete="email"
                                    @if ($errors->has('email')) aria-invalid="true" @endif
                                >
                                <p class="profile-field-error" data-error-for="email" role="alert">
                                    @error('email'){{ $message }}@enderror
                                </p>
                            </div>

                            <button type="submit" class="billing-primary-btn profile-submit-btn profile-submit-btn--save" data-submit-btn disabled>
                                <span class="profile-submit-btn__state" data-state="idle">{{ __('profile.save_profile') }}</span>
                                <span class="profile-submit-btn__state" data-state="loading" hidden>
                                    <i class="bi bi-arrow-repeat profile-submit-btn__spinner" aria-hidden="true"></i>
                                    {{ __('profile.saving') }}
                                </span>
                                <span class="profile-submit-btn__state" data-state="success" hidden>
                                    <i class="bi bi-check-lg" aria-hidden="true"></i>
                                    {{ __('profile.saved') }}
                                </span>
                            </button>
                        </form>
                    </article>

                    <article class="profile-card profile-pane profile-card--password" id="settings">
                        <div class="profile-card-head">
                            <h2>
                                <i class="bi bi-shield-lock" aria-hidden="true"></i>
                                {{ $isChangePassword ? __('profile.change_password') : __('profile.set_password') }}
                            </h2>
                            <p>{{ $isChangePassword ? __('profile.change_password_desc') : __('profile.set_password_desc') }}</p>
                        </div>

                        <form
                            method="POST"
                            action="{{ route('profile.password.update') }}"
                            class="profile-form profile-password-form"
                            data-password-form
                            data-form-kind="password"
                            novalidate
                        >
                            @csrf
                            @method('PUT')

                            @if ($isChangePassword)
                                <div class="profile-field" data-field="current_password">
                                    <label class="form-label" for="currentPassword">{{ __('profile.current_password') }}</label>
                                    <div class="profile-password-wrap">
                                        <input
                                            id="currentPassword"
                                            name="current_password"
                                            type="password"
                                            class="form-control profile-password-input @error('current_password') is-invalid @enderror"
                                            autocomplete="current-password"
                                            @if ($errors->has('current_password')) aria-invalid="true" @endif
                                        >
                                        <button
                                            type="button"
                                            class="profile-password-toggle"
                                            data-password-toggle="currentPassword"
                                            aria-label="{{ __('ui.show_password') }}"
                                        >
                                            <i class="bi bi-eye" aria-hidden="true"></i>
                                        </button>
                                    </div>
                                    <p class="profile-field-error" data-error-for="current_password" role="alert">
                                        @error('current_password'){{ $message }}@enderror
                                    </p>
                                </div>
                            @endif

                            <div class="profile-field" data-field="password">
                                <label class="form-label" for="newPassword">{{ __('profile.new_password') }}</label>
                                <div class="profile-password-wrap">
                                    <input
                                        id="newPassword"
                                        name="password"
                                        type="password"
                                        class="form-control profile-password-input @error('password') is-invalid @enderror"
                                        autocomplete="new-password"
                                        required
                                        minlength="8"
                                        @if ($errors->has('password')) aria-invalid="true" @endif
                                        aria-describedby="passwordStrength passwordError"
                                    >
                                    <button
                                        type="button"
                                        class="profile-password-toggle"
                                        data-password-toggle="newPassword"
                                        aria-label="{{ __('ui.show_password') }}"
                                    >
                                        <i class="bi bi-eye" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <div
                                    id="passwordStrength"
                                    class="profile-password-strength"
                                    data-password-strength
                                    data-label-weak="{{ __('profile.password_strength_weak') }}"
                                    data-label-fair="{{ __('profile.password_strength_fair') }}"
                                    data-label-strong="{{ __('profile.password_strength_strong') }}"
                                    hidden
                                >
                                    <div class="profile-password-strength__track" aria-hidden="true">
                                        <span></span><span></span><span></span>
                                    </div>
                                    <p class="profile-password-strength__label" data-strength-label></p>
                                </div>
                                <p id="passwordError" class="profile-field-error" data-error-for="password" role="alert">
                                    @error('password'){{ $message }}@enderror
                                </p>
                            </div>

                            <div class="profile-field" data-field="password_confirmation">
                                <label class="form-label" for="newPasswordConfirmation">{{ __('profile.confirm_new_password') }}</label>
                                <div class="profile-password-wrap">
                                    <input
                                        id="newPasswordConfirmation"
                                        name="password_confirmation"
                                        type="password"
                                        class="form-control profile-password-input @error('password') is-invalid @enderror"
                                        autocomplete="new-password"
                                        required
                                        minlength="8"
                                    >
                                    <button
                                        type="button"
                                        class="profile-password-toggle"
                                        data-password-toggle="newPasswordConfirmation"
                                        aria-label="{{ __('ui.show_password') }}"
                                    >
                                        <i class="bi bi-eye" aria-hidden="true"></i>
                                    </button>
                                </div>
                                <p class="profile-field-error" data-error-for="password_confirmation" role="alert"></p>
                            </div>

                            <button type="submit" class="billing-primary-btn profile-submit-btn" data-submit-btn disabled>
                                <span class="profile-submit-btn__state" data-state="idle">
                                    {{ $isChangePassword ? __('profile.update_password') : __('profile.set_password') }}
                                </span>
                                <span class="profile-submit-btn__state" data-state="loading" hidden>
                                    <i class="bi bi-arrow-repeat profile-submit-btn__spinner" aria-hidden="true"></i>
                                    {{ __('profile.saving') }}
                                </span>
                                <span class="profile-submit-btn__state" data-state="success" hidden>
                                    <i class="bi bi-check-lg" aria-hidden="true"></i>
                                    {{ __('profile.saved') }}
                                </span>
                            </button>
                        </form>

                        <div class="profile-signin-methods">
                            <h3 class="profile-signin-methods__title">{{ __('profile.sign_in_methods') }}</h3>
                            <ul class="profile-signin-methods__list">
                                @if ($user->connectedWithGoogle())
                                    <li>
                                        <i class="bi bi-google" aria-hidden="true"></i>
                                        <span>{{ __('profile.connected_with_google', ['email' => $user->email]) }}</span>
                                    </li>
                                @elseif ($user->hasVerifiedEmail())
                                    <li>
                                        <i class="bi bi-google" aria-hidden="true"></i>
                                        <span>{{ __('profile.link_google_desc') }}</span>
                                        <a href="{{ route('auth.google.redirect') }}" class="profile-link-google">{{ __('profile.link_google') }}</a>
                                    </li>
                                @else
                                    <li>
                                        <i class="bi bi-google" aria-hidden="true"></i>
                                        <span>{{ __('profile.link_google_verify_first') }}</span>
                                    </li>
                                @endif
                                @if ($isChangePassword)
                                    <li>
                                        <i class="bi bi-envelope" aria-hidden="true"></i>
                                        <span>{{ __('profile.sign_in_email_password') }}</span>
                                    </li>
                                @elseif (! $user->connectedWithGoogle())
                                    <li>
                                        <i class="bi bi-envelope" aria-hidden="true"></i>
                                        <span>{{ __('profile.sign_in_email_only') }}</span>
                                    </li>
                                @endif
                            </ul>
                            @error('google')
                                <p class="profile-field-error" role="alert">{{ $message }}</p>
                            @enderror
                        </div>
                    </article>
                </div>
            </section>

            @unless ($isAdmin)
                <article class="profile-card profile-pane profile-card-wide profile-danger" id="danger-zone">
                    <div class="profile-card-head">
                        <h2><i class="bi bi-exclamation-triangle" aria-hidden="true"></i>{{ __('profile.danger_zone') }}</h2>
                        <p>{{ __('profile.danger_zone_desc') }}</p>
                    </div>

                    <div class="profile-danger-grid">
                        <div class="profile-danger-item">
                            <div class="profile-danger-item__copy">
                                <strong>{{ __('profile.delete_account') }}</strong>
                                <p>{{ __('profile.delete_account_desc') }}</p>
                            </div>
                            <button
                                type="button"
                                class="profile-danger-btn profile-danger-btn--delete"
                                data-open-delete-dialog
                            >
                                {{ __('profile.delete_account') }}
                            </button>
                        </div>
                    </div>
                </article>
            @endunless
        </div>
    </section>

    @unless ($isAdmin)
        <dialog
            class="profile-dialog"
            data-delete-dialog
            data-user-email="{{ $user->email }}"
            aria-labelledby="deleteAccountTitle"
        >
            <div class="profile-dialog__panel" data-delete-step="1">
                <h2 id="deleteAccountTitle">{{ __('profile.delete_account_confirm_title') }}</h2>
                <p>{{ __('profile.delete_account_confirm_step1') }}</p>
                <div class="profile-dialog__actions">
                    <button type="button" class="profile-danger-btn" data-close-delete-dialog>
                        {{ __('profile.delete_cancel') }}
                    </button>
                    <button type="button" class="profile-danger-btn profile-danger-btn--delete" data-delete-step-next>
                        {{ __('profile.delete_continue') }}
                    </button>
                </div>
            </div>

            <form
                method="POST"
                action="{{ route('profile.destroy') }}"
                class="profile-dialog__panel"
                data-delete-form
                data-delete-step="2"
                hidden
            >
                @csrf
                @method('DELETE')
                <h2>{{ __('profile.delete_account_confirm_title') }}</h2>
                <p>{{ __('profile.delete_account_confirm_body') }}</p>
                <div class="profile-field" data-field="confirmation">
                    <label class="form-label" for="deleteConfirmation">{{ __('profile.delete_confirm_label') }}</label>
                    <input
                        id="deleteConfirmation"
                        name="confirmation"
                        type="text"
                        class="form-control"
                        autocomplete="off"
                        required
                        data-delete-confirm-input
                        @if ($errors->has('confirmation')) aria-invalid="true" @endif
                    >
                    <p class="profile-field-error" data-error-for="confirmation" role="alert">
                        @error('confirmation'){{ $message }}@enderror
                    </p>
                </div>
                <div class="profile-dialog__actions">
                    <button type="button" class="profile-danger-btn" data-delete-step-back>
                        {{ __('profile.delete_back') }}
                    </button>
                    <button type="submit" class="profile-danger-btn profile-danger-btn--delete" data-delete-submit disabled>
                        {{ __('profile.delete_confirm_submit') }}
                    </button>
                </div>
            </form>
        </dialog>
    @endunless

    <script>
        (function () {
            const toastEl = document.querySelector('[data-profile-toast]');
            const messages = {
                nameRequired: @json(__('profile.name_required')),
                emailRequired: @json(__('profile.email_required')),
                emailInvalid: @json(__('profile.email_invalid')),
                passwordRequired: @json(__('profile.new_password_required')),
                passwordMin: @json(__('profile.password_min')),
                mismatch: @json(__('profile.passwords_dont_match')),
                currentRequired: @json(__('profile.current_password_required')),
                deleteConfirm: @json(__('profile.delete_confirm_required')),
            };

            function showToast(message) {
                if (!toastEl || !message) return;
                toastEl.textContent = message;
                toastEl.hidden = false;
                toastEl.classList.add('is-visible');
                window.clearTimeout(showToast._timer);
                showToast._timer = window.setTimeout(function () {
                    toastEl.classList.remove('is-visible');
                    window.setTimeout(function () {
                        if (!toastEl.classList.contains('is-visible')) toastEl.hidden = true;
                    }, 220);
                }, 3200);
            }

            function setButtonState(button, state) {
                if (!button) return;
                button.querySelectorAll('[data-state]').forEach(function (node) {
                    node.hidden = node.getAttribute('data-state') !== state;
                });
                button.classList.toggle('is-loading', state === 'loading');
                button.classList.toggle('is-success', state === 'success');
            }

            function setFieldError(form, name, message) {
                const field = form.querySelector('[data-field="' + name + '"]');
                if (!field) return;
                const input = field.querySelector('input');
                const error = field.querySelector('[data-error-for="' + name + '"]');
                if (input) {
                    input.classList.toggle('is-invalid', !!message);
                    input.setAttribute('aria-invalid', message ? 'true' : 'false');
                }
                if (error) error.textContent = message || '';
            }

            function clearErrors(form) {
                form.querySelectorAll('[data-field]').forEach(function (field) {
                    const name = field.getAttribute('data-field');
                    if (name) setFieldError(form, name, '');
                });
            }

            function wireSubmitButton(form, isDirtyFn, validateFn) {
                const button = form.querySelector('[data-submit-btn]');
                if (!button) return;

                function syncDirty() {
                    if (button.classList.contains('is-loading') || button.classList.contains('is-success')) return;
                    const dirty = !!isDirtyFn();
                    button.disabled = !dirty;
                }

                form.querySelectorAll('input').forEach(function (input) {
                    input.addEventListener('input', syncDirty);
                    input.addEventListener('change', syncDirty);
                });

                form.addEventListener('submit', function (event) {
                    if (!isDirtyFn()) {
                        event.preventDefault();
                        syncDirty();
                        return;
                    }
                    if (validateFn && !validateFn()) {
                        event.preventDefault();
                        setButtonState(button, 'idle');
                        button.disabled = false;
                        return;
                    }
                    button.disabled = true;
                    setButtonState(button, 'loading');
                });

                syncDirty();
            }

            function flashSuccess(kind, message) {
                const form = document.querySelector('[data-form-kind="' + kind + '"]');
                const button = form ? form.querySelector('[data-submit-btn]') : null;
                showToast(message);
                if (!button) return;
                button.disabled = true;
                setButtonState(button, 'success');
                window.setTimeout(function () {
                    setButtonState(button, 'idle');
                    if (kind === 'password') {
                        form.reset();
                        const strength = form.querySelector('[data-password-strength]');
                        if (strength) {
                            strength.hidden = true;
                            strength.removeAttribute('data-level');
                        }
                    }
                    form.querySelector('input')?.dispatchEvent(new Event('input', { bubbles: true }));
                }, 1800);
            }

            const profileForm = document.querySelector('[data-profile-form]');
            if (profileForm) {
                const nameInput = profileForm.querySelector('#profileName');
                const emailInput = profileForm.querySelector('#profileEmail');

                function profileDirty() {
                    const name = (nameInput?.value || '').trim();
                    const email = (emailInput?.value || '').trim();
                    const initialName = (nameInput?.getAttribute('data-initial') || '').trim();
                    const initialEmail = (emailInput?.getAttribute('data-initial') || '').trim();
                    return name !== initialName || email.toLowerCase() !== initialEmail.toLowerCase();
                }

                function validateProfile() {
                    clearErrors(profileForm);
                    let valid = true;
                    const name = (nameInput?.value || '').trim();
                    const email = (emailInput?.value || '').trim();
                    if (!name) {
                        setFieldError(profileForm, 'name', messages.nameRequired);
                        valid = false;
                    }
                    if (!email) {
                        setFieldError(profileForm, 'email', messages.emailRequired);
                        valid = false;
                    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                        setFieldError(profileForm, 'email', messages.emailInvalid);
                        valid = false;
                    }
                    return valid;
                }

                wireSubmitButton(profileForm, profileDirty, validateProfile);
            }

            const passwordForm = document.querySelector('[data-password-form]');
            if (passwordForm) {
                const newInput = passwordForm.querySelector('#newPassword');
                const confirmInput = passwordForm.querySelector('#newPasswordConfirmation');
                const currentInput = passwordForm.querySelector('#currentPassword');
                const strengthRoot = passwordForm.querySelector('[data-password-strength]');
                const strengthLabel = strengthRoot ? strengthRoot.querySelector('[data-strength-label]') : null;

                function scorePassword(value) {
                    let score = 0;
                    if (value.length >= 8) score += 1;
                    if (value.length >= 12) score += 1;
                    if (/[a-z]/.test(value) && /[A-Z]/.test(value)) score += 1;
                    if (/\d/.test(value)) score += 1;
                    if (/[^A-Za-z0-9]/.test(value)) score += 1;
                    if (score <= 2) return 'weak';
                    if (score <= 4) return 'fair';
                    return 'strong';
                }

                function updateStrength() {
                    if (!strengthRoot || !strengthLabel || !newInput) return;
                    const value = newInput.value || '';
                    if (!value) {
                        strengthRoot.hidden = true;
                        strengthRoot.removeAttribute('data-level');
                        strengthLabel.textContent = '';
                        return;
                    }
                    const level = scorePassword(value);
                    strengthRoot.hidden = false;
                    strengthRoot.setAttribute('data-level', level);
                    strengthLabel.textContent = strengthRoot.getAttribute('data-label-' + level) || level;
                }

                function passwordDirty() {
                    return !!(
                        (currentInput && currentInput.value.trim())
                        || (newInput && newInput.value)
                        || (confirmInput && confirmInput.value)
                    );
                }

                function validatePassword() {
                    clearErrors(passwordForm);
                    let valid = true;
                    if (currentInput && !currentInput.value.trim()) {
                        setFieldError(passwordForm, 'current_password', messages.currentRequired);
                        valid = false;
                    }
                    const password = newInput ? newInput.value : '';
                    const confirm = confirmInput ? confirmInput.value : '';
                    if (!password) {
                        setFieldError(passwordForm, 'password', messages.passwordRequired);
                        valid = false;
                    } else if (password.length < 8) {
                        setFieldError(passwordForm, 'password', messages.passwordMin);
                        valid = false;
                    }
                    if (!confirm) {
                        setFieldError(passwordForm, 'password_confirmation', messages.passwordRequired);
                        valid = false;
                    } else if (password && confirm !== password) {
                        setFieldError(passwordForm, 'password_confirmation', messages.mismatch);
                        valid = false;
                    }
                    return valid;
                }

                if (newInput) {
                    newInput.addEventListener('input', function () {
                        updateStrength();
                        if (confirmInput && confirmInput.value) {
                            setFieldError(
                                passwordForm,
                                'password_confirmation',
                                confirmInput.value === newInput.value ? '' : messages.mismatch
                            );
                        }
                    });
                }
                if (confirmInput) {
                    confirmInput.addEventListener('input', function () {
                        if (!newInput) return;
                        setFieldError(
                            passwordForm,
                            'password_confirmation',
                            !confirmInput.value || confirmInput.value === newInput.value ? '' : messages.mismatch
                        );
                    });
                }

                wireSubmitButton(passwordForm, passwordDirty, validatePassword);
                updateStrength();
            }

            const deleteDialog = document.querySelector('[data-delete-dialog]');
            const openDelete = document.querySelector('[data-open-delete-dialog]');
            const closeDeleteButtons = document.querySelectorAll('[data-close-delete-dialog]');
            const deleteStepNext = document.querySelector('[data-delete-step-next]');
            const deleteStepBack = document.querySelector('[data-delete-step-back]');
            const deleteStep1 = document.querySelector('[data-delete-step="1"]');
            const deleteStep2 = document.querySelector('[data-delete-step="2"]');
            const deleteConfirmInput = document.querySelector('[data-delete-confirm-input]');
            const deleteSubmit = document.querySelector('[data-delete-submit]');
            const deleteForm = document.querySelector('[data-delete-form]');
            const deleteUserEmail = (deleteDialog?.getAttribute('data-user-email') || '').trim().toLowerCase();

            function isDeleteConfirmationValid(value) {
                const trimmed = (value || '').trim();
                if (!trimmed) return false;
                if (trimmed === 'DELETE') return true;
                return deleteUserEmail !== '' && trimmed.toLowerCase() === deleteUserEmail;
            }

            function setDeleteStep(step) {
                if (deleteStep1) deleteStep1.hidden = step !== 1;
                if (deleteStep2) deleteStep2.hidden = step !== 2;
                if (step === 2) {
                    syncDeleteConfirm();
                    deleteConfirmInput?.focus();
                }
            }

            function resetDeleteDialog() {
                if (deleteConfirmInput) deleteConfirmInput.value = '';
                const error = deleteForm?.querySelector('[data-error-for="confirmation"]');
                if (error) error.textContent = '';
                setDeleteStep(1);
                syncDeleteConfirm();
            }

            function syncDeleteConfirm() {
                if (!deleteConfirmInput || !deleteSubmit) return;
                deleteSubmit.disabled = !isDeleteConfirmationValid(deleteConfirmInput.value);
            }

            if (openDelete && deleteDialog) {
                openDelete.addEventListener('click', function () {
                    resetDeleteDialog();
                    if (typeof deleteDialog.showModal === 'function') {
                        deleteDialog.showModal();
                    }
                });
            }
            closeDeleteButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    deleteDialog?.close();
                    resetDeleteDialog();
                });
            });
            if (deleteStepNext) {
                deleteStepNext.addEventListener('click', function () {
                    setDeleteStep(2);
                });
            }
            if (deleteStepBack) {
                deleteStepBack.addEventListener('click', function () {
                    setDeleteStep(1);
                });
            }
            if (deleteConfirmInput) {
                deleteConfirmInput.addEventListener('input', syncDeleteConfirm);
            }
            if (deleteForm && deleteConfirmInput) {
                deleteForm.addEventListener('submit', function (event) {
                    if (!isDeleteConfirmationValid(deleteConfirmInput.value)) {
                        event.preventDefault();
                        const error = deleteForm.querySelector('[data-error-for="confirmation"]');
                        if (error) error.textContent = messages.deleteConfirm;
                        syncDeleteConfirm();
                    }
                });
            }
            if (deleteDialog) {
                deleteDialog.addEventListener('close', resetDeleteDialog);
                const confirmationError = deleteForm?.querySelector('[data-error-for="confirmation"]');
                if (confirmationError && confirmationError.textContent.trim()) {
                    setDeleteStep(2);
                    if (typeof deleteDialog.showModal === 'function') {
                        deleteDialog.showModal();
                    }
                }
            }

            if (toastEl) {
                const profileFlash = toastEl.getAttribute('data-flash-profile');
                const passwordFlash = toastEl.getAttribute('data-flash-password');
                const savedSuccess = @json(__('profile.saved_success'));
                if (profileFlash) {
                    if (profileFlash === savedSuccess) {
                        flashSuccess('profile', profileFlash);
                    } else {
                        showToast(profileFlash);
                    }
                }
                if (passwordFlash) flashSuccess('password', passwordFlash);
            }
        })();
    </script>
@endsection
