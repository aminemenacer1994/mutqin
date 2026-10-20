@extends('layouts.app')

@php
    $accountRole = old('account_role', 'individual');
    if (! in_array($accountRole, ['individual', 'student', 'teacher'], true)) {
        $accountRole = 'individual';
    }
    $organisationOpen = in_array($accountRole, ['student', 'teacher'], true)
        || $errors->has('organisation_type')
        || $errors->has('organisation_name');
@endphp

@section('content')
<div class="auth-page">
    <div class="auth-panel">
        <header class="auth-greeting">
            <p class="auth-greeting__arabic" lang="ar" dir="rtl">{{ __('ui.auth_register_arabic') }}</p>
            <h1 class="auth-heading">{{ __('ui.auth_register_heading') }}</h1>
            <p class="auth-lede">{{ __('ui.auth_register_subtitle') }}</p>
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
            data-org-type-required="{{ __('ui.auth_org_type_required') }}"
            data-org-name-required="{{ __('ui.auth_org_name_required') }}"
            data-organisation-catalog='@json($organisationOptions ?? [])'
        >
            @csrf
            <button type="submit" class="auth-implicit-submit" hidden tabindex="-1" aria-hidden="true"></button>

            @if (config('mutqin.teacher_features_enabled'))
            <fieldset class="auth-role">
                <legend class="auth-role__legend">{{ __('ui.auth_role_prompt') }}</legend>
                <div class="auth-role__options" role="radiogroup" aria-label="{{ __('ui.auth_role_prompt') }}">
                    <label class="auth-role__option" for="account-role-individual">
                        <input id="account-role-individual" type="radio" name="account_role" value="individual" @checked($accountRole === 'individual') @if($errors->has('account_role')) aria-invalid="true" aria-describedby="registerRoleError" @endif>
                        <span>{{ __('ui.auth_role_individual') }}</span>
                    </label>
                    <label class="auth-role__option" for="account-role-student">
                        <input id="account-role-student" type="radio" name="account_role" value="student" @checked($accountRole === 'student') @if($errors->has('account_role')) aria-invalid="true" aria-describedby="registerRoleError" @endif>
                        <span>{{ __('ui.auth_role_student') }}</span>
                    </label>
                    <label class="auth-role__option" for="account-role-teacher">
                        <input id="account-role-teacher" type="radio" name="account_role" value="teacher" @checked($accountRole === 'teacher') @if($errors->has('account_role')) aria-invalid="true" aria-describedby="registerRoleError" @endif>
                        <span>{{ __('ui.auth_role_teacher') }}</span>
                    </label>
                </div>
                @error('account_role')
                    <span id="registerRoleError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror

                <div class="auth-org @if($organisationOpen) is-open @endif" data-auth-org>
                    <div class="auth-org__inner">
                        <div class="auth-field">
                            <label for="organisation_type" class="form-label">{{ __('ui.auth_org_type') }}</label>
                            <select id="organisation_type" name="organisation_type" class="form-control @error('organisation_type') is-invalid @enderror" @if($organisationOpen) required @endif @if($errors->has('organisation_type')) aria-invalid="true" aria-describedby="registerOrgTypeError" @endif>
                                <option value="" @selected(! old('organisation_type'))>{{ __('ui.auth_org_type_placeholder') }}</option>
                                @foreach (\App\Enums\OrganisationType::cases() as $organisationType)
                                    <option value="{{ $organisationType->value }}" @selected(old('organisation_type') === $organisationType->value)>{{ __('ui.auth_org_type_'.$organisationType->value) }}</option>
                                @endforeach
                            </select>
                            @error('organisation_type')
                                <span id="registerOrgTypeError" class="invalid-feedback" role="alert">{{ $message }}</span>
                            @enderror
                        </div>

                        <div class="auth-field" data-auth-org-name>
                            <label for="organisation_name_choice" class="form-label">{{ __('ui.auth_org_name') }}</label>
                            <select id="organisation_name_choice" class="form-control @error('organisation_name') is-invalid @enderror" @if($organisationOpen) required @endif @if($errors->has('organisation_name')) aria-invalid="true" aria-describedby="registerOrgNameError registerOrgNameHint" @else aria-describedby="registerOrgNameHint" @endif>
                                <option value="">{{ __('ui.auth_org_name_placeholder') }}</option>
                            </select>
                            <p id="registerOrgNameHint" class="auth-field-hint" data-auth-org-name-hint hidden>{{ __('ui.auth_org_name_none_for_type') }}</p>
                            <div class="auth-field auth-field--nested" data-auth-org-name-custom hidden>
                                <label for="organisation_name_custom" class="form-label">{{ __('ui.auth_org_name_custom_placeholder') }}</label>
                                <input id="organisation_name_custom" type="text" class="form-control @error('organisation_name') is-invalid @enderror" value="{{ old('organisation_name') }}" placeholder="{{ __('ui.auth_org_name_custom_placeholder') }}" maxlength="120" autocomplete="organization">
                            </div>
                            <input type="hidden" name="organisation_name" id="organisation_name" value="{{ old('organisation_name') }}">
                            @error('organisation_name')
                                <span id="registerOrgNameError" class="invalid-feedback" role="alert">{{ $message }}</span>
                            @enderror
                        </div>
                    </div>
                </div>
            </fieldset>
            @endif

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

            <div class="auth-divider"><span>{{ __('ui.auth_or') }}</span></div>

            <div class="auth-field">
                <label for="name" class="form-label">{{ __('ui.name') }}</label>
                <input id="name" type="text" class="form-control @error('name') is-invalid @enderror" name="name" value="{{ old('name') }}" placeholder="{{ __('ui.placeholder_name') }}" required autocomplete="name" autofocus @if($errors->has('name')) aria-invalid="true" aria-describedby="registerNameError" @endif>
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

            <button type="submit" class="btn auth-submit">{{ __('ui.create_account') }}</button>
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
    if (!form || !form.querySelector('#organisation_name_choice')) return;

    var org = form.querySelector('[data-auth-org]');
    var typeInput = form.querySelector('#organisation_type');
    var nameChoice = form.querySelector('#organisation_name_choice');
    var nameCustomWrap = form.querySelector('[data-auth-org-name-custom]');
    var nameCustom = form.querySelector('#organisation_name_custom');
    var nameHidden = form.querySelector('#organisation_name');
    var nameHint = form.querySelector('[data-auth-org-name-hint]');
    var googleButton = form.querySelector('[data-register-google]');
    var typeMessage = form.getAttribute('data-org-type-required') || '';
    var nameMessage = form.getAttribute('data-org-name-required') || '';
    var organisationsUrl = '/api/registration/organisations';
    var placeholderLabel = @json(__('ui.auth_org_name_placeholder'));
    var otherLabel = @json(__('ui.auth_org_name_other'));
    var initialName = @json(old('organisation_name', ''));
    var customValue = '__custom__';
    var fetchTimer = null;
    var catalog = [];

    try {
        catalog = JSON.parse(form.getAttribute('data-organisation-catalog') || '[]');
    } catch (error) {
        catalog = [];
    }

    function needsOrg() {
        var checked = form.querySelector('input[name="account_role"]:checked');
        return !!checked && (checked.value === 'student' || checked.value === 'teacher');
    }

    function setCustomVisible(visible) {
        if (nameCustomWrap) nameCustomWrap.hidden = !visible;
        if (nameChoice) nameChoice.required = needsOrg() && !visible;
        if (nameCustom) nameCustom.required = needsOrg() && visible;
    }

    function mergeCatalogRows(rows) {
        if (!Array.isArray(rows)) return;
        rows.forEach(function (row) {
            if (!row || !row.name || !row.type) return;
            var exists = catalog.some(function (item) {
                return item.name === row.name && item.type === row.type;
            });
            if (!exists) catalog.push({ name: row.name, type: row.type });
        });
    }

    function namesForType(type) {
        if (!type) return [];
        var names = catalog
            .filter(function (row) { return row.type === type; })
            .map(function (row) { return row.name; });
        return names.filter(function (name, index) { return names.indexOf(name) === index; });
    }

    function rebuildOrganisationNameSelect(preferredValue) {
        if (!nameChoice || !typeInput) return;

        var type = typeInput.value;
        var names = namesForType(type);
        var previous = preferredValue || nameChoice.value;

        nameChoice.innerHTML = '';
        var placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = placeholderLabel;
        nameChoice.appendChild(placeholder);

        names.forEach(function (name) {
            var option = document.createElement('option');
            option.value = name;
            option.textContent = name;
            nameChoice.appendChild(option);
        });

        var other = document.createElement('option');
        other.value = customValue;
        other.textContent = otherLabel;
        nameChoice.appendChild(other);

        if (nameHint) nameHint.hidden = !type || names.length > 0;

        if (previous && names.indexOf(previous) !== -1) {
            nameChoice.value = previous;
            setCustomVisible(false);
        } else if (previous === customValue) {
            nameChoice.value = customValue;
            setCustomVisible(true);
        } else if (names.length === 1) {
            nameChoice.value = names[0];
            setCustomVisible(false);
        } else if (names.length === 0 && type) {
            nameChoice.value = customValue;
            setCustomVisible(true);
        } else {
            nameChoice.value = '';
            setCustomVisible(false);
        }

        syncHiddenName();
    }

    function restoreInitialName() {
        if (!initialName) return;
        var type = typeInput ? typeInput.value : '';
        var names = namesForType(type);
        if (names.indexOf(initialName) !== -1) {
            nameChoice.value = initialName;
            setCustomVisible(false);
        } else {
            nameChoice.value = customValue;
            setCustomVisible(true);
            if (nameCustom) nameCustom.value = initialName;
        }
        initialName = '';
        syncHiddenName();
    }

    function refreshOrganisationsFromServer() {
        if (!typeInput || !typeInput.value) return;
        var type = typeInput.value;
        clearTimeout(fetchTimer);
        fetchTimer = setTimeout(function () {
            fetch(organisationsUrl + '?type=' + encodeURIComponent(type), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then(function (response) { return response.ok ? response.json() : null; })
                .then(function (payload) {
                    if (!payload || !Array.isArray(payload.data)) return;
                    mergeCatalogRows(payload.data);
                    rebuildOrganisationNameSelect(nameChoice.value);
                    restoreInitialName();
                })
                .catch(function () { /* catalogue JSON is enough */ });
        }, 0);
    }

    function resolvedName() {
        if (!nameChoice) return '';
        if (nameChoice.value === customValue) {
            return nameCustom ? nameCustom.value.trim() : '';
        }
        return nameChoice.value.trim();
    }

    function syncHiddenName() {
        if (!nameHidden) return;
        nameHidden.value = resolvedName();
    }

    function syncOrgPanel() {
        var open = needsOrg();
        if (org) org.classList.toggle('is-open', open);
        if (typeInput) typeInput.required = open;
        if (!open) {
            setCustomVisible(false);
            if (nameChoice) nameChoice.required = false;
            if (nameCustom) nameCustom.required = false;
            return;
        }
        rebuildOrganisationNameSelect();
        refreshOrganisationsFromServer();
        restoreInitialName();
    }

    form.querySelectorAll('input[name="account_role"]').forEach(function (radio) {
        radio.addEventListener('change', syncOrgPanel);
    });

    if (typeInput) {
        typeInput.addEventListener('change', function () {
            typeInput.setCustomValidity('');
            rebuildOrganisationNameSelect('');
            refreshOrganisationsFromServer();
        });
    }

    if (nameChoice) {
        nameChoice.addEventListener('change', function () {
            nameChoice.setCustomValidity('');
            setCustomVisible(nameChoice.value === customValue);
            syncHiddenName();
        });
    }

    if (nameCustom) {
        nameCustom.addEventListener('input', function () {
            nameCustom.setCustomValidity('');
            syncHiddenName();
        });
    }

    form.addEventListener('submit', function () {
        syncHiddenName();
    });

    function validateOrgFields() {
        var invalid = null;
        if (typeInput && !typeInput.value) {
            typeInput.setCustomValidity(typeMessage);
            invalid = typeInput;
        } else if (typeInput) {
            typeInput.setCustomValidity('');
        }

        syncHiddenName();
        var nameValue = resolvedName();
        if (!nameValue) {
            if (nameChoice && nameChoice.value === customValue && nameCustom) {
                nameCustom.setCustomValidity(nameMessage);
                if (!invalid) invalid = nameCustom;
            } else if (nameChoice) {
                nameChoice.setCustomValidity(nameMessage);
                if (!invalid) invalid = nameChoice;
            }
        } else {
            if (nameChoice) nameChoice.setCustomValidity('');
            if (nameCustom) nameCustom.setCustomValidity('');
        }

        return invalid;
    }

    if (googleButton) {
        googleButton.addEventListener('click', function (event) {
            if (!needsOrg()) return;
            var invalid = validateOrgFields();
            if (invalid) {
                event.preventDefault();
                invalid.reportValidity();
            }
        });
    }

    syncOrgPanel();
})();
</script>
@endsection
