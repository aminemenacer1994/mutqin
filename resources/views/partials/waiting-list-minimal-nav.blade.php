<div class="waiting-list-early-access-bar">
    <nav
        class="waiting-list-minimal-nav navbar-nav nav-links-desktop gap-2 gap-lg-3"
        aria-label="{{ __('ui.primary_navigation') }}"
    >
        <a
            class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}"
            href="{{ route('home') }}"
        >
            <i class="bi bi-house-door nav-link-icon" aria-hidden="true"></i>
            <span class="nav-link-copy"><strong data-i18n="home">{{ __('ui.home') }}</strong></span>
            <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
        </a>
        <a
            class="nav-link nav-link-waiting-list {{ request()->routeIs('waiting-list') ? 'active' : '' }}"
            href="{{ route('waiting-list') }}"
            @if (request()->routeIs('waiting-list')) aria-current="page" @endif
        >
            <i class="bi bi-hourglass-split nav-link-icon" aria-hidden="true"></i>
            <span class="nav-link-copy"><strong>{{ __('ui.waiting_list') }}</strong></span>
            <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
        </a>
    </nav>
    <div class="waiting-list-navbar-lang">
        @include('partials.app-lang-switcher')
    </div>
</div>
