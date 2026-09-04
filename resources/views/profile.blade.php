@extends('layouts.app')

@section('content')
    @php
        $isAdmin = $isAdmin ?? $user->isAdmin();
        $verificationRequired = $verificationRequired ?? false;
        $pendingEmail = $user->pending_email;
        $emailVerified = $user->email_verified_at !== null;
        $nameParts = preg_split('/\s+/', trim((string) $user->name), -1, PREG_SPLIT_NO_EMPTY) ?: [];
        $initials = collect($nameParts)->map(fn ($part) => mb_strtoupper(mb_substr($part, 0, 1)))->take(2)->implode('');
        if ($initials === '') {
            $initials = mb_strtoupper(mb_substr((string) $user->email, 0, 1));
        }
    @endphp

    <section class="container-fluid shell profile-page">
        <div class="profile-stage">
            <div class="profile-hero-card">
                <div class="profile-hero-copy">
                    <div class="profile-hero-identity">
                        @if ($user->avatar)
                            <img class="profile-avatar" src="{{ $user->avatar }}" alt="" width="56" height="56">
                        @else
                            <span class="profile-avatar profile-avatar--initials" aria-hidden="true">{{ $initials }}</span>
                        @endif
                        <div>
                            <h1>{{ __('profile.title') }}</h1>
                        </div>
                    </div>
                </div>
            </div>

            @if (session('billing_status'))
                <div class="billing-alert billing-alert-success" role="status">{{ session('billing_status') }}</div>
            @endif

            @if (session('billing_error'))
                <div class="billing-alert billing-alert-error" role="alert">{{ session('billing_error') }}</div>
            @endif

            @if (session('resent'))
                <div class="billing-alert billing-alert-success" role="status">{{ __('ui.verify_resent') }}</div>
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

            <div class="profile-layout">
                <section class="profile-account" aria-label="{{ __('profile.account_settings') }}">
                    <div class="profile-grid">
                        <article class="profile-card profile-pane profile-card--details" data-profile-details id="personal-details">
                            <div class="profile-card-head">
                                <h2>{{ __('profile.personal_details') }}</h2>
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
                                        maxlength="255"
                                        autocomplete="name"
                                        aria-describedby="profileNameError"
                                        @if ($errors->has('name')) aria-invalid="true" @endif
                                    >
                                    <p id="profileNameError" class="profile-field-error" data-error-for="name" role="alert">
                                        @error('name'){{ $message }}@enderror
                                    </p>
                                </div>

                                <div class="profile-field" data-field="email">
                                    <div class="profile-field-label-row">
                                        <label class="form-label" for="profileEmail">{{ __('profile.email') }}</label>
                                        @if ($pendingEmail)
                                            <span class="profile-badge profile-badge--pending">{{ __('profile.email_pending') }}</span>
                                        @elseif ($verificationRequired && ! $emailVerified)
                                            <span class="profile-badge profile-badge--unverified">{{ __('profile.email_unverified') }}</span>
                                        @endif
                                    </div>
                                    <input
                                        id="profileEmail"
                                        name="email"
                                        type="email"
                                        class="form-control @error('email') is-invalid @enderror"
                                        value="{{ old('email', $user->email) }}"
                                        data-initial="{{ $user->email }}"
                                        required
                                        maxlength="255"
                                        autocomplete="email"
                                        aria-describedby="{{ ($pendingEmail || $verificationRequired) ? 'profileEmailHint ' : '' }}profileEmailError"
                                        @if ($errors->has('email')) aria-invalid="true" @endif
                                    >
                                    @if ($pendingEmail)
                                        <p id="profileEmailHint" class="profile-field-note">{{ __('profile.email_change_pending', ['email' => $pendingEmail]) }}</p>
                                    @elseif ($verificationRequired && ! $emailVerified)
                                        <p id="profileEmailHint" class="profile-field-note">{{ __('profile.email_unverified_hint') }}</p>
                                    @endif
                                    <p id="profileEmailError" class="profile-field-error" data-error-for="email" role="alert">
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

                            @if ($pendingEmail || ($verificationRequired && ! $emailVerified))
                                <div class="profile-inline-actions">
                                    <form method="POST" action="{{ route('verification.resend') }}">
                                        @csrf
                                        <button type="submit" class="profile-text-btn">{{ __('profile.resend_verification') }}</button>
                                    </form>
                                    @if ($pendingEmail)
                                        <form method="POST" action="{{ route('profile.pending-email.destroy') }}">
                                            @csrf
                                            @method('DELETE')
                                            <button type="submit" class="profile-text-btn">{{ __('profile.cancel_email_change') }}</button>
                                        </form>
                                    @endif
                                </div>
                            @endif
                        </article>

                        <article class="profile-card profile-pane" id="password">
                            <div class="profile-card-head">
                                <h2>{{ $user->hasSetPassword() ? __('profile.change_password') : __('profile.set_password') }}</h2>
                            </div>
                            <form
                                method="POST"
                                action="{{ route('profile.password.update') }}"
                                class="profile-form"
                                data-password-form
                                data-form-kind="password"
                                novalidate
                            >
                                @csrf
                                @method('PUT')
                                @if ($user->hasSetPassword())
                                    <div class="profile-field" data-field="current_password">
                                        <label class="form-label" for="currentPassword">{{ __('profile.current_password') }}</label>
                                        <input
                                            id="currentPassword"
                                            name="current_password"
                                            type="password"
                                            class="form-control @error('current_password') is-invalid @enderror"
                                            autocomplete="current-password"
                                            @if ($errors->has('current_password')) aria-invalid="true" @endif
                                        >
                                        <p class="profile-field-error" data-error-for="current_password" role="alert">
                                            @error('current_password'){{ $message }}@enderror
                                        </p>
                                    </div>
                                @endif
                                <div class="profile-field" data-field="password">
                                    <label class="form-label" for="newPassword">{{ __('profile.new_password') }}</label>
                                    <input
                                        id="newPassword"
                                        name="password"
                                        type="password"
                                        class="form-control @error('password') is-invalid @enderror"
                                        autocomplete="new-password"
                                        minlength="8"
                                        required
                                        @if ($errors->has('password')) aria-invalid="true" @endif
                                    >
                                    <p class="profile-field-error" data-error-for="password" role="alert">
                                        @error('password'){{ $message }}@enderror
                                    </p>
                                </div>
                                <div class="profile-field" data-field="password_confirmation">
                                    <label class="form-label" for="newPasswordConfirmation">{{ __('profile.confirm_new_password') }}</label>
                                    <input
                                        id="newPasswordConfirmation"
                                        name="password_confirmation"
                                        type="password"
                                        class="form-control @error('password_confirmation') is-invalid @enderror"
                                        autocomplete="new-password"
                                        minlength="8"
                                        required
                                        @if ($errors->has('password_confirmation')) aria-invalid="true" @endif
                                    >
                                    <p class="profile-field-error" data-error-for="password_confirmation" role="alert">
                                        @error('password_confirmation'){{ $message }}@enderror
                                    </p>
                                </div>
                                <button type="submit" class="billing-primary-btn profile-submit-btn" data-submit-btn disabled>
                                    <span class="profile-submit-btn__state" data-state="idle">{{ $user->hasSetPassword() ? __('profile.update_password') : __('profile.set_password') }}</span>
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
                    </div>
                </section>
            </div>

            @unless ($isAdmin)
                <article class="profile-card profile-pane profile-card-wide" id="delete-account">
                    <div class="profile-danger-item">
                        <div class="profile-danger-item__copy">
                            <strong>{{ __('profile.delete_account') }}</strong>
                        </div>
                        <button
                            type="button"
                            class="profile-danger-btn profile-danger-btn--delete"
                            data-open-delete-dialog
                        >
                            {{ __('profile.delete_account') }}
                        </button>
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
                        aria-describedby="deleteConfirmError"
                        @if ($errors->has('confirmation')) aria-invalid="true" @endif
                    >
                    <p id="deleteConfirmError" class="profile-field-error" data-error-for="confirmation" role="alert">
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

@endsection

@push('page-scripts')
    <script>
        (function () {
            function bootProfilePage() {
                if (document.documentElement.dataset.profilePageBooted === '1') return;
                if (!document.querySelector('[data-profile-form], [data-password-form], [data-profile-toast]')) return;
                document.documentElement.dataset.profilePageBooted = '1';

            const toastEl = document.querySelector('[data-profile-toast]');
            const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
            const messages = {
                nameRequired: @json(__('profile.name_required')),
                nameMax: @json(__('profile.name_max')),
                emailRequired: @json(__('profile.email_required')),
                emailInvalid: @json(__('profile.email_invalid')),
                passwordRequired: @json(__('profile.new_password_required')),
                passwordMin: @json(__('profile.password_min')),
                mismatch: @json(__('profile.passwords_dont_match')),
                currentRequired: @json(__('profile.current_password_required')),
                deleteConfirm: @json(__('profile.delete_confirm_required')),
                preferenceSaved: @json(__('profile.preference_saved')),
                preferenceError: @json(__('profile.preference_error')),
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
                if (state === 'loading') button.setAttribute('aria-busy', 'true');
                else button.removeAttribute('aria-busy');
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
                    if (form.dataset.submitting === '1') {
                        event.preventDefault();
                        return;
                    }
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
                    form.dataset.submitting = '1';
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
                    } else if (name.length > 255) {
                        setFieldError(profileForm, 'name', messages.nameMax);
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
                    if (deleteForm.dataset.submitting === '1') {
                        event.preventDefault();
                        return;
                    }
                    if (!isDeleteConfirmationValid(deleteConfirmInput.value)) {
                        event.preventDefault();
                        const error = deleteForm.querySelector('[data-error-for="confirmation"]');
                        if (error) error.textContent = messages.deleteConfirm;
                        syncDeleteConfirm();
                        return;
                    }
                    deleteForm.dataset.submitting = '1';
                    if (deleteSubmit) deleteSubmit.disabled = true;
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

            function jsonHeaders() {
                return {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                };
            }

            function markChoice(group, attr, value, pressedAttr) {
                group.querySelectorAll('[' + attr + ']').forEach(function (btn) {
                    const selected = btn.getAttribute(attr) === value;
                    btn.setAttribute(pressedAttr, selected ? 'true' : 'false');
                    btn.classList.toggle('is-selected', selected);
                    if (selected) btn.setAttribute('aria-current', 'true');
                    else btn.removeAttribute('aria-current');
                });
            }

            const localeGroup = document.querySelector('[data-locale-group]');
            const localeError = document.querySelector('[data-locale-error]');
            if (localeGroup) {
                localeGroup.querySelectorAll('[data-locale-choice]').forEach(function (btn) {
                    btn.addEventListener('click', async function () {
                        const locale = btn.getAttribute('data-locale-choice');
                        if (!locale || localeGroup.dataset.saving === '1') return;
                        localeGroup.dataset.saving = '1';
                        localeGroup.querySelectorAll('button').forEach(function (node) { node.disabled = true; });
                        try {
                            const response = await fetch(@json(route('api.profile.locale')), {
                                method: 'PATCH',
                                headers: jsonHeaders(),
                                credentials: 'same-origin',
                                body: JSON.stringify({ locale: locale }),
                            });
                            if (!response.ok) throw new Error('locale');
                            markChoice(localeGroup, 'data-locale-choice', locale, 'aria-checked');
                            showToast(messages.preferenceSaved);
                            window.location.reload();
                        } catch (e) {
                            if (localeError) localeError.textContent = messages.preferenceError;
                            showToast(messages.preferenceError);
                            localeGroup.querySelectorAll('button').forEach(function (node) { node.disabled = false; });
                            localeGroup.dataset.saving = '0';
                        }
                    });
                });
            }

            const themeGroup = document.querySelector('[data-theme-group]');
            const themeError = document.querySelector('[data-theme-error]');
            if (themeGroup) {
                function syncThemeChoices(theme) {
                    markChoice(themeGroup, 'data-theme-choice', theme, 'aria-checked');
                }
                themeGroup.querySelectorAll('[data-theme-choice]').forEach(function (btn) {
                    btn.addEventListener('click', async function () {
                        const theme = btn.getAttribute('data-theme-choice');
                        if (!theme || themeGroup.dataset.saving === '1') return;
                        themeGroup.dataset.saving = '1';
                        try {
                            if (typeof window.mutqinSetTheme === 'function') {
                                window.mutqinSetTheme(theme);
                            } else {
                                const response = await fetch(@json(route('api.profile.theme')), {
                                    method: 'PATCH',
                                    headers: jsonHeaders(),
                                    credentials: 'same-origin',
                                    body: JSON.stringify({ theme: theme }),
                                });
                                if (!response.ok) throw new Error('theme');
                                document.documentElement.setAttribute('data-theme', theme);
                            }
                            syncThemeChoices(theme);
                            if (themeError) themeError.textContent = '';
                            showToast(messages.preferenceSaved);
                        } catch (e) {
                            if (themeError) themeError.textContent = messages.preferenceError;
                            showToast(messages.preferenceError);
                        } finally {
                            themeGroup.dataset.saving = '0';
                        }
                    });
                });
                window.addEventListener('mutqin:theme-change', function (event) {
                    const next = event?.detail?.theme;
                    if (next) syncThemeChoices(next);
                });
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
            }

            if (document.documentElement.dataset.mutqinAppMounted === '1') {
                bootProfilePage();
            } else {
                window.addEventListener('mutqin:app-mounted', bootProfilePage, { once: true });
            }
        })();
    </script>
@endpush
