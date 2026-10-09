@php
    $earlyAccessOffcanvasId = 'earlyAccessNavbar';
@endphp
<div class="waiting-list-early-access-bar">
    <nav
        class="waiting-list-minimal-nav waiting-list-minimal-nav--desktop early-access-desktop-links d-none d-lg-flex navbar-nav gap-2 gap-lg-3 justify-content-center"
        aria-label="{{ __('ui.primary_navigation') }}"
    >
        <a
            class="nav-link nav-link-home {{ request()->is('/') ? 'active' : '' }}"
            href="{{ url('/') }}"
        >
            <span class="nav-link-copy"><strong data-i18n="home">{{ __('ui.home') }}</strong></span>
        </a>
        <a
            class="nav-link nav-link-waiting-list {{ request()->is('waiting-list') ? 'active' : '' }}"
            href="{{ url('/waiting-list') }}"
            @if (request()->is('waiting-list')) aria-current="page" @endif
        >
            <span class="nav-link-copy"><strong>{{ __('ui.waiting_list') }}</strong></span>
        </a>
        <a
            class="nav-link nav-link-about {{ request()->is('about') || request()->is('about-us') ? 'active' : '' }}"
            href="{{ url('/about') }}"
            @if (request()->is('about') || request()->is('about-us')) aria-current="page" @endif
        >
            <span class="nav-link-copy"><strong>{{ __('ui.about') }}</strong></span>
        </a>
    </nav>
    <button
        class="navbar-toggler waiting-list-early-access-menu-btn d-lg-none ms-auto flex-shrink-0"
        type="button"
        data-bs-toggle="offcanvas"
        data-bs-target="#{{ $earlyAccessOffcanvasId }}"
        aria-controls="{{ $earlyAccessOffcanvasId }}"
        aria-expanded="false"
        aria-label="{{ __('ui.open_navigation') }}"
    >
        <i class="bi bi-list" aria-hidden="true"></i>
    </button>
</div>

@push('early-access-offcanvas')
<div
    class="offcanvas offcanvas-end d-lg-none early-access-mobile-offcanvas"
    tabindex="-1"
    id="{{ $earlyAccessOffcanvasId }}"
    aria-labelledby="{{ $earlyAccessOffcanvasId }}Label"
>
    <div class="offcanvas-header">
        <h2 class="offcanvas-title h5 mb-0" id="{{ $earlyAccessOffcanvasId }}Label">{{ __('ui.menu') }}</h2>
        <button
            type="button"
            class="btn-close btn-close-white"
            data-bs-dismiss="offcanvas"
            data-bs-target="#{{ $earlyAccessOffcanvasId }}"
            aria-label="{{ __('ui.close_navigation') }}"
        ></button>
    </div>
    <div class="offcanvas-body d-flex flex-column flex-lg-row align-items-lg-center gap-3 pt-3 pt-lg-0">
        <div class="navbar-nav-shell d-flex justify-content-lg-center w-100">
            <div class="navbar-nav nav-links-desktop gap-2 gap-lg-3 justify-content-lg-center w-100">
                <a
                    class="nav-link nav-link-home {{ request()->is('/') ? 'active' : '' }}"
                    href="{{ url('/') }}"
                >
                    <i class="bi bi-house-door nav-link-icon" aria-hidden="true"></i>
                    <span class="nav-link-copy">
                        <strong data-i18n="home">{{ __('ui.home') }}</strong>
                        <small class="d-lg-none">{{ __('ui.nav_home_sub') }}</small>
                    </span>
                    <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                </a>
                <a
                    class="nav-link nav-link-waiting-list {{ request()->routeIs('waiting-list') ? 'active' : '' }}"
                    href="{{ url('/waiting-list') }}"
                    @if (request()->is('waiting-list')) aria-current="page" @endif
                >
                    <i class="bi bi-hourglass-split nav-link-icon" aria-hidden="true"></i>
                    <span class="nav-link-copy">
                        <strong>{{ __('ui.waiting_list') }}</strong>
                        <small class="d-lg-none">{{ __('ui.nav_waiting_list_sub') }}</small>
                    </span>
                    <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                </a>
                <a
                    class="nav-link nav-link-about {{ request()->is('about') || request()->is('about-us') ? 'active' : '' }}"
                    href="{{ url('/about') }}"
                    @if (request()->is('about') || request()->is('about-us')) aria-current="page" @endif
                >
                    <i class="bi bi-info-circle nav-link-icon" aria-hidden="true"></i>
                    <span class="nav-link-copy">
                        <strong>{{ __('ui.about') }}</strong>
                        <small class="d-lg-none">{{ __('ui.nav_about_sub') }}</small>
                    </span>
                    <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                </a>
            </div>
        </div>
    </div>
</div>
@endpush
