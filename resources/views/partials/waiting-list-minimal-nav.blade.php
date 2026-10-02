@php
    $earlyAccessOffcanvasId = 'earlyAccessNavbar';
@endphp
<div class="waiting-list-early-access-bar">
    <nav
        class="waiting-list-minimal-nav waiting-list-minimal-nav--desktop early-access-desktop-links d-none d-lg-flex navbar-nav gap-2 gap-lg-3 justify-content-center"
        aria-label="{{ __('ui.primary_navigation') }}"
    >
        <a
            class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}"
            href="{{ route('home') }}"
        >
            <span class="nav-link-copy"><strong data-i18n="home">{{ __('ui.home') }}</strong></span>
        </a>
        <a
            class="nav-link nav-link-waiting-list {{ request()->routeIs('waiting-list') ? 'active' : '' }}"
            href="{{ route('waiting-list') }}"
            @if (request()->routeIs('waiting-list')) aria-current="page" @endif
        >
            <span class="nav-link-copy"><strong>{{ __('ui.waiting_list') }}</strong></span>
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
    class="offcanvas offcanvas-end d-lg-none"
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
    <div class="offcanvas-body d-flex flex-column gap-3 pt-3">
        <div class="navbar-nav-shell d-flex w-100">
            <nav
                class="waiting-list-minimal-nav waiting-list-minimal-nav--mobile navbar-nav w-100"
                aria-label="{{ __('ui.primary_navigation') }}"
            >
                <a
                    class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}"
                    href="{{ route('home') }}"
                >
                    <i class="bi bi-house-door nav-link-icon" aria-hidden="true"></i>
                    <span class="nav-link-copy">
                        <strong data-i18n="home">{{ __('ui.home') }}</strong>
                        <small>{{ __('ui.nav_home_sub') }}</small>
                    </span>
                    <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                </a>
                <a
                    class="nav-link nav-link-waiting-list {{ request()->routeIs('waiting-list') ? 'active' : '' }}"
                    href="{{ route('waiting-list') }}"
                    @if (request()->routeIs('waiting-list')) aria-current="page" @endif
                >
                    <i class="bi bi-hourglass-split nav-link-icon" aria-hidden="true"></i>
                    <span class="nav-link-copy">
                        <strong>{{ __('ui.waiting_list') }}</strong>
                        <small>{{ __('ui.nav_waiting_list_sub') }}</small>
                    </span>
                    <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                </a>
            </nav>
        </div>
    </div>
</div>
@endpush
