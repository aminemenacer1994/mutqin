@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = \App\Support\Theme::DEFAULT_PREFERENCE;
    $appTheme = \App\Support\Theme::DEFAULT;
    $appThemeChrome = \App\Support\Theme::chrome($appTheme);
    $appThemeColor = $appThemeChrome['theme_color'];
    $appColorScheme = $appThemeChrome['color_scheme'];
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="{{ $appTheme }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover, interactive-widget=resizes-content">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="{{ $appThemeColor }}">
    <meta name="color-scheme" content="{{ $appColorScheme }}">
    <meta name="robots" content="index, follow">
    <meta name="description" content="Mutqin early access — join the waiting list to be invited first to try Qur'an memorisation support between lessons.">
    <title>Mutqin</title>
    @include('partials.google-analytics')
    @include('partials.ackee-config')
    <link rel="icon" href="/favicon.ico?v=20260730c" sizes="any">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <script>
      (function () {
        var modes = @json(\App\Support\Theme::clientCatalog());
        var defaultTheme = @json(\App\Support\Theme::DEFAULT);
        var byId = {};
        for (var i = 0; i < modes.length; i++) byId[modes[i].id] = modes[i];
        function normalize(value) {
          var raw = String(value || '').toLowerCase();
          if (byId[raw]) return raw;
          for (var j = 0; j < modes.length; j++) {
            if (modes[j].preference === raw) return modes[j].id;
          }
          return defaultTheme;
        }
        document.documentElement.setAttribute('data-theme', defaultTheme);
        var theme = defaultTheme;
        var chrome = byId[theme] || byId[defaultTheme];
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && chrome) meta.setAttribute('content', chrome.themeColor);
        var scheme = document.querySelector('meta[name="color-scheme"]');
        if (scheme && chrome) scheme.setAttribute('content', chrome.colorScheme);
      })();
    </script>
    <style>
      html, body {
        width: 100%;
        max-width: 100%;
        overflow-x: hidden;
        overflow-x: clip;
        margin: 0;
      }
      body.mutqin-waiting-list-public {
        min-height: 100dvh;
        background: var(--bg, #14110f);
        color-scheme: dark;
      }

      html[data-theme="dark"],
      html[data-theme="dark"] body.mutqin-waiting-list-public {
        background: var(--bg, #14110f);
      }
      .waiting-list-public-nav {
        position: sticky;
        top: 0;
        z-index: 20;
        border-bottom: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,.22)) 88%, transparent);
        background: color-mix(in srgb, var(--bg, #14110f) 92%, transparent);
        backdrop-filter: blur(10px);
      }
      @media (min-width: 992px) {
        .waiting-list-public-nav .navbar-shell {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
          align-items: center;
          gap: 0.75rem 1rem;
          min-height: var(--nav-h, 64px);
          padding-top: env(safe-area-inset-top, 0px);
        }

        .waiting-list-public-nav .navbar-brand {
          grid-column: 1;
          justify-self: start;
        }

        .waiting-list-public-nav .waiting-list-early-access-bar {
          grid-column: 2;
          justify-self: center;
        }
      }

      @media (max-width: 991.98px) {
        .waiting-list-public-nav .navbar-shell {
          min-height: 56px;
          display: flex !important;
          align-items: center;
          justify-content: space-between;
          gap: 0.65rem;
          padding: calc(env(safe-area-inset-top, 0px) + 6px) max(var(--gutter, 14px), 14px) 6px;
        }

        .waiting-list-public-nav .waiting-list-minimal-nav--desktop {
          display: none !important;
        }

        .waiting-list-public-nav .waiting-list-early-access-bar {
          flex: 0 0 auto;
          margin-inline-start: auto;
        }
      }
      .waiting-list-public-nav .navbar-brand {
        flex-shrink: 0;
        margin: 0;
        padding: 0;
      }
      html[data-theme="dark"] .waiting-list-public-nav .app-navbar-logo--light {
        display: none;
      }
      html[data-theme="dark"] .waiting-list-public-nav .app-navbar-logo--dark {
        display: block;
      }
      html:not([data-theme="dark"]) .waiting-list-public-nav .app-navbar-logo--dark {
        display: none;
      }
      :root {
        --text-on-accent: #fffaf5;
      }
      html[data-theme="dark"] {
        --text-on-accent: #1c140e;
      }
      html[data-theme="sepia"] {
        --text-on-accent: #fff7ec;
      }

      .waiting-list-public-nav.app-navbar .navbar-toggler {
        all: unset;
        box-sizing: border-box;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 40px;
        height: 40px;
        min-width: 44px;
        min-height: 44px;
        padding: 0;
        border: 1px solid var(--border, rgba(255, 255, 255, 0.22));
        border-radius: 10px;
        background: transparent;
        color: var(--text, #f5efe8);
        cursor: pointer;
        -webkit-appearance: none;
        appearance: none;
      }

      .waiting-list-public-nav.app-navbar .navbar-toggler:hover,
      .waiting-list-public-nav.app-navbar .navbar-toggler:focus-visible {
        border-color: var(--accent, #c9a227);
        color: var(--accent, #c9a227);
        outline: none;
      }

      .waiting-list-public-nav.app-navbar .navbar-toggler:focus-visible {
        outline: 2px solid var(--accent, #c9a227);
        outline-offset: 2px;
      }

      .waiting-list-public-nav.app-navbar .navbar-toggler i {
        font-size: 20px;
      }

      @media (min-width: 992px) {
        .waiting-list-public-nav.app-navbar .waiting-list-early-access-menu-btn {
          display: none !important;
        }
      }

      @media (max-width: 991.98px) {
        .waiting-list-public-nav #earlyAccessNavbar.early-access-mobile-offcanvas {
          display: grid;
          grid-template-rows: auto minmax(0, 1fr);
          --bs-offcanvas-width: 100%;
          --bs-offcanvas-bg: var(--bg, #14110f);
          width: 100% !important;
          max-width: 100% !important;
          background: var(--bg, #14110f) !important;
          border-inline-start: 0;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-header {
          display: grid;
          grid-template-columns: minmax(0, 1fr) 44px;
          gap: 10px;
          align-items: center;
          min-height: 56px;
          padding: max(12px, env(safe-area-inset-top)) 16px 12px;
          border-bottom: 1px solid var(--border, rgba(255, 255, 255, 0.22));
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-title {
          margin: 0;
          color: var(--text, #f5efe8);
          font-weight: 650;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr);
          align-content: start;
          gap: 16px;
          padding: 16px 14px calc(20px + env(safe-area-inset-bottom)) !important;
          overflow-x: hidden;
          overflow-y: auto;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body > * {
          grid-column: 1 / -1;
          min-width: 0;
        }

        .waiting-list-public-nav #earlyAccessNavbar .nav-links-desktop {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr);
          gap: 8px !important;
          width: 100%;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link {
          display: grid;
          grid-template-columns: 44px minmax(0, 1fr) 20px;
          gap: 10px;
          align-items: center;
          width: 100%;
          min-height: 60px;
          padding: 8px 10px;
          color: var(--text-muted, rgba(245, 239, 232, 0.72));
          font-weight: 500;
          text-decoration: none;
          border: 1px solid transparent;
          border-radius: 14px;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link:hover,
        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link:focus-visible {
          color: var(--text, #f5efe8);
          background: var(--surface-2, color-mix(in srgb, var(--text, #f5efe8) 6%, transparent));
          border-color: var(--border, rgba(255, 255, 255, 0.22));
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link.active {
          color: var(--text, #f5efe8);
          background: color-mix(in srgb, var(--success-text, #6fb896) 9%, var(--surface, #14110f) 91%);
          border-color: color-mix(in srgb, var(--success-text, #6fb896) 24%, var(--border, rgba(255, 255, 255, 0.22)) 76%);
          box-shadow: inset 3px 0 0 var(--success-text, #6fb896);
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-icon {
          display: grid !important;
          grid-column: 1;
          place-items: center;
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: var(--surface-soft, color-mix(in srgb, var(--text, #f5efe8) 8%, transparent));
          font-size: 1.1rem;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-copy {
          display: grid !important;
          grid-column: 2;
          gap: 2px;
          min-width: 0;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-copy strong {
          display: block;
          font-size: 0.96rem;
          line-height: 1.2;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-copy small {
          display: block !important;
          color: var(--text-muted, rgba(245, 239, 232, 0.72));
          font-size: 0.74rem;
          line-height: 1.3;
        }

        .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-chevron {
          display: block !important;
          grid-column: 3;
          justify-self: end;
          color: var(--text-muted, rgba(245, 239, 232, 0.72));
        }

        html[dir="rtl"] .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link-chevron {
          transform: scaleX(-1);
        }

        html[dir="rtl"] .waiting-list-public-nav #earlyAccessNavbar .offcanvas-body .nav-link.active {
          box-shadow: inset -3px 0 0 var(--success-text, #6fb896);
        }
      }
    </style>
</head>
<body class="mutqin-waiting-list-public">
    <nav class="waiting-list-public-nav app-navbar navbar" aria-label="{{ __('ui.mutqin_brand') }}">
        <div class="container-fluid shell navbar-shell w-100">
            <a class="navbar-brand" href="{{ \App\Support\MutqinDomains::appUrl('/') }}" aria-label="{{ __('ui.mutqin_brand') }}">
                <img
                    src="/images/logo.png"
                    alt=""
                    class="app-navbar-logo app-navbar-logo--full app-navbar-logo--light"
                    width="120"
                    height="32"
                >
                <img
                    src="/images/dark_logo.png"
                    alt=""
                    class="app-navbar-logo app-navbar-logo--full app-navbar-logo--dark"
                    width="120"
                    height="32"
                >
            </a>
            @include('partials.waiting-list-minimal-nav')
        </div>
        @stack('early-access-offcanvas')
    </nav>
    <div id="app">
        <main id="mainContent" tabindex="-1">
            @yield('content')
        </main>
    </div>

    <script>
        window.mutqinMinimalPublicPage = true;
        window.mutqinWaitingListEndpoint = @json(\App\Support\MutqinDomains::waitingListStoreUrl(request()));
    </script>
    <script src="{{ mix('js/app.js') }}" defer></script>
    <script>
        window.mutqinInitialLocale = 'en';
        window.mutqinInitialDirection = 'ltr';
        window.mutqinForceInitialLocale = true;
        window.mutqinAuthCheck = false;
        window.mutqinAppUrl = @json(\App\Support\MutqinDomains::appOrigin());
        window.mutqinInitialTheme = 'dark';
        window.mutqinInitialThemePreference = @json($appThemePreference);
        window.mutqinThemeModes = @json(\App\Support\Theme::clientCatalog());
        window.mutqinDefaultTheme = @json(\App\Support\Theme::DEFAULT);
        window.mutqinRelease = @json(\App\Support\ErrorReporting::release());
        window.mutqinEnvironment = @json(app()->environment());
    </script>
</body>
</html>
