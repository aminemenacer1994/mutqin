@extends('layouts.app')

@php
    $accountRole = old('account_role', 'individual');
    if (! in_array($accountRole, ['individual', 'student', 'teacher'], true)) {
        $accountRole = 'individual';
    }
    $organisationOpen = in_array($accountRole, ['student', 'teacher'], true)
        || $errors->has('organisation_type')
        || $errors->has('organisation_name');
    $organisationOptions = $organisationOptions ?? [];
    $oldOrganisationType = old('organisation_type');
    $oldOrganisationName = old('organisation_name');
    $listedOrganisationNames = collect($organisationOptions)
        ->filter(fn (array $row) => ($row['type'] ?? '') === $oldOrganisationType)
        ->pluck('name')
        ->all();
    $organisationNameIsCustom = is_string($oldOrganisationName)
        && $oldOrganisationName !== ''
        && ! in_array($oldOrganisationName, $listedOrganisationNames, true);
    $roleCards = [
        'individual' => ['icon' => 'bi-person', 'title' => __('ui.auth_role_individual_title'), 'lede' => __('ui.auth_role_individual_lede')],
        'student' => ['icon' => 'bi-mortarboard', 'title' => __('ui.auth_role_student_title'), 'lede' => __('ui.auth_role_student_lede')],
        'teacher' => ['icon' => 'bi-easel2', 'title' => __('ui.auth_role_teacher_title'), 'lede' => __('ui.auth_role_teacher_lede')],
    ];
    $typeChips = [
        'halaqa' => 'bi-moon-stars',
        'madrassa' => 'bi-book',
        'school' => 'bi-building',
        'other' => 'bi-grid',
    ];
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
                    @foreach ($roleCards as $roleValue => $roleCard)
                        <label class="auth-role__option" for="account-role-{{ $roleValue }}">
                            <input id="account-role-{{ $roleValue }}" type="radio" name="account_role" value="{{ $roleValue }}" @checked($accountRole === $roleValue) @if($errors->has('account_role')) aria-invalid="true" aria-describedby="registerRoleError" @endif>
                            <span class="auth-role__icon" aria-hidden="true"><i class="bi {{ $roleCard['icon'] }}"></i></span>
                            <span class="auth-role__copy">
                                <span class="visually-hidden">{{ __('ui.auth_role_'.$roleValue) }}</span>
                                <span class="auth-role__title">{{ $roleCard['title'] }}</span>
                                <span class="auth-role__lede">{{ $roleCard['lede'] }}</span>
                            </span>
                        </label>
                    @endforeach
                </div>
                @error('account_role')
                    <span id="registerRoleError" class="invalid-feedback" role="alert">{{ $message }}</span>
                @enderror

                <div class="auth-org @if($organisationOpen) is-open @endif" data-auth-org>
                    <div class="auth-org__inner">
                        <p id="registerOrgIntro" class="auth-org__intro">{{ __('ui.auth_org_section_intro') }}</p>

                        <div class="auth-field">
                            <p class="form-label" id="organisation-type-label">{{ __('ui.auth_org_type') }}</p>
                            <div class="auth-chips" role="radiogroup" aria-labelledby="organisation-type-label" @if($errors->has('organisation_type')) aria-invalid="true" aria-describedby="registerOrgTypeError" @endif>
                                @foreach (\App\Enums\OrganisationType::cases() as $organisationType)
                                    <label class="auth-chip" for="organisation-type-{{ $organisationType->value }}">
                                        <input
                                            id="organisation-type-{{ $organisationType->value }}"
                                            type="radio"
                                            name="organisation_type"
                                            value="{{ $organisationType->value }}"
                                            @checked($oldOrganisationType === $organisationType->value)
                                            @if($organisationOpen) required @endif
                                        >
                                        <span class="auth-chip__icon" aria-hidden="true"><i class="bi {{ $typeChips[$organisationType->value] ?? 'bi-grid' }}"></i></span>
                                        <span class="auth-chip__label">{{ __('ui.auth_org_type_'.$organisationType->value) }}</span>
                                    </label>
                                @endforeach
                            </div>
                            @error('organisation_type')
                                <span id="registerOrgTypeError" class="invalid-feedback" role="alert">{{ $message }}</span>
                            @enderror
                        </div>

                        <div class="auth-field" data-auth-org-name>
                            <p class="form-label" id="organisation-name-label">{{ __('ui.auth_org_name') }}</p>
                            <p class="auth-org-names__prompt">{{ __('ui.auth_org_name_placeholder') }}</p>
                            <div class="auth-org-names" role="radiogroup" aria-labelledby="organisation-name-label" data-auth-org-name-list>
                                @foreach ($organisationOptions as $organisationOption)
                                    <label class="auth-choice" data-org-type="{{ $organisationOption['type'] }}">
                                        <input
                                            type="radio"
                                            name="organisation_name"
                                            value="{{ $organisationOption['name'] }}"
                                            @checked(! $organisationNameIsCustom && $oldOrganisationName === $organisationOption['name'] && $oldOrganisationType === $organisationOption['type'])
                                        >
                                        <span class="auth-choice__mark" aria-hidden="true"></span>
                                        <span class="auth-choice__label">{{ $organisationOption['name'] }}</span>
                                    </label>
                                @endforeach
                                <label class="auth-choice auth-choice--custom" data-org-custom>
                                    <input
                                        type="radio"
                                        name="organisation_name"
                                        value="{{ \App\Support\Registration\RegistrationProfile::CUSTOM_NAME_VALUE }}"
                                        @checked($organisationNameIsCustom)
                                    >
                                    <span class="auth-choice__mark" aria-hidden="true"></span>
                                    <span class="auth-choice__label">{{ __('ui.auth_org_name_other') }}</span>
                                </label>
                            </div>
                            <p class="auth-field-hint" data-auth-org-name-hint hidden>{{ __('ui.auth_org_name_none_for_type') }}</p>
                            <div class="auth-org-custom" data-auth-org-name-custom>
                                <label for="organisation_name_custom" class="form-label">{{ __('ui.auth_org_name_custom_placeholder') }}</label>
                                <input id="organisation_name_custom" type="text" name="organisation_name_custom" class="form-control @error('organisation_name') is-invalid @enderror" value="{{ $organisationNameIsCustom ? $oldOrganisationName : '' }}" placeholder="{{ __('ui.auth_org_name_custom_placeholder') }}" maxlength="120" autocomplete="organization">
                            </div>
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
    if (!form || !form.querySelector('[data-auth-org-name-list]')) return;

    var org = form.querySelector('[data-auth-org]');
    var nameList = form.querySelector('[data-auth-org-name-list]');
    var nameHint = form.querySelector('[data-auth-org-name-hint]');
    var nameCustom = form.querySelector('#organisation_name_custom');
    var googleButton = form.querySelector('[data-register-google]');
    var typeMessage = form.getAttribute('data-org-type-required') || '';
    var nameMessage = form.getAttribute('data-org-name-required') || '';
    var organisationsUrl = '/api/registration/organisations';
    var customValue = @json(\App\Support\Registration\RegistrationProfile::CUSTOM_NAME_VALUE);
    var fetchTimer = null;

    function needsOrg() {
        var checked = form.querySelector('input[name="account_role"]:checked');
        return !!checked && (checked.value === 'student' || checked.value === 'teacher');
    }

    function selectedType() {
        var checked = form.querySelector('input[name="organisation_type"]:checked');
        return checked ? checked.value : '';
    }

    function selectedNameInput() {
        return form.querySelector('input[name="organisation_name"]:checked');
    }

    function listedNamesFor(type) {
        return Array.prototype.filter.call(
            nameList.querySelectorAll('.auth-choice[data-org-type]'),
            function (choice) { return choice.getAttribute('data-org-type') === type; }
        );
    }

    function resolvedName() {
        var picked = selectedNameInput();
        if (!picked) return '';
        if (picked.value === customValue) {
            return nameCustom ? nameCustom.value.trim() : '';
        }
        return picked.value.trim();
    }

    function syncOrgPanel() {
        var open = needsOrg();
        if (org) org.classList.toggle('is-open', open);
        form.querySelectorAll('input[name="organisation_type"]').forEach(function (radio) {
            radio.required = open;
        });
        form.querySelectorAll('input[name="organisation_name"]').forEach(function (radio) {
            radio.required = false;
        });
        if (nameCustom) nameCustom.required = false;
        if (!open) return;
        syncNameChoices();
        refreshOrganisationsFromServer();
    }

    function syncNameChoices() {
        var type = selectedType();
        var visible = listedNamesFor(type);
        var selected = selectedNameInput();

        if (selected && selected.value !== customValue) {
            var parent = selected.closest('[data-org-type]');
            if (parent && parent.getAttribute('data-org-type') !== type) {
                selected.checked = false;
                selected = null;
            }
        }

        if (nameHint) nameHint.hidden = !type || visible.length > 0;

        if (type && visible.length === 0 && !selected) {
            var other = nameList.querySelector('[data-org-custom] input');
            if (other) other.checked = true;
        }

        var picked = selectedNameInput();
        if (nameCustom) {
            nameCustom.required = needsOrg() && !!picked && picked.value === customValue;
        }
        if (needsOrg() && type) {
            var requireTarget = visible[0]
                ? visible[0].querySelector('input')
                : nameList.querySelector('[data-org-custom] input');
            if (requireTarget) requireTarget.required = true;
        }
    }

    function addNameChoice(type, name) {
        var exists = Array.prototype.some.call(
            nameList.querySelectorAll('.auth-choice[data-org-type] input'),
            function (input) { return input.value === name && input.closest('[data-org-type]').getAttribute('data-org-type') === type; }
        );
        if (exists) return;

        var label = document.createElement('label');
        label.className = 'auth-choice';
        label.setAttribute('data-org-type', type);
        label.innerHTML = '<input type="radio" name="organisation_name" value=""><span class="auth-choice__mark" aria-hidden="true"></span><span class="auth-choice__label"></span>';
        label.querySelector('input').value = name;
        label.querySelector('.auth-choice__label').textContent = name;
        var custom = nameList.querySelector('[data-org-custom]');
        nameList.insertBefore(label, custom);
    }

    function refreshOrganisationsFromServer() {
        var type = selectedType();
        if (!type) return;
        clearTimeout(fetchTimer);
        fetchTimer = setTimeout(function () {
            fetch(organisationsUrl + '?type=' + encodeURIComponent(type), {
                headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
                credentials: 'same-origin',
            })
                .then(function (response) { return response.ok ? response.json() : null; })
                .then(function (payload) {
                    if (!payload || !Array.isArray(payload.data)) return;
                    payload.data.forEach(function (row) {
                        if (row && row.name && row.type) addNameChoice(row.type, row.name);
                    });
                    syncNameChoices();
                })
                .catch(function () { /* seeded names are already in the page */ });
        }, 0);
    }

    function validateOrgFields() {
        var typeRadio = form.querySelector('input[name="organisation_type"]');
        var type = selectedType();
        if (!type) {
            if (typeRadio) typeRadio.setCustomValidity(typeMessage);
            return form.querySelector('.auth-chip input') || typeRadio;
        }
        form.querySelectorAll('input[name="organisation_type"]').forEach(function (radio) {
            radio.setCustomValidity('');
        });

        var nameValue = resolvedName();
        var picked = selectedNameInput();
        if (!nameValue) {
            if (picked && picked.value === customValue && nameCustom) {
                nameCustom.setCustomValidity(nameMessage);
                return nameCustom;
            }
            var firstName = nameList.querySelector('.auth-choice input');
            if (firstName) firstName.setCustomValidity(nameMessage);
            return firstName;
        }
        form.querySelectorAll('input[name="organisation_name"]').forEach(function (radio) {
            radio.setCustomValidity('');
        });
        if (nameCustom) nameCustom.setCustomValidity('');
        return null;
    }

    form.querySelectorAll('input[name="account_role"]').forEach(function (radio) {
        radio.addEventListener('change', syncOrgPanel);
    });
    form.querySelectorAll('input[name="organisation_type"]').forEach(function (radio) {
        radio.addEventListener('change', function () {
            radio.setCustomValidity('');
            syncNameChoices();
            refreshOrganisationsFromServer();
        });
    });
    nameList.addEventListener('change', function () {
        form.querySelectorAll('input[name="organisation_name"]').forEach(function (radio) {
            radio.setCustomValidity('');
        });
        syncNameChoices();
        if (nameCustom) nameCustom.setCustomValidity('');
    });
    if (nameCustom) {
        nameCustom.addEventListener('input', function () {
            nameCustom.setCustomValidity('');
        });
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
