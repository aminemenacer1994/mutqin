@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = $appThemePreference ?? session('mutqin_theme', \App\Support\Theme::DEFAULT_PREFERENCE);
    $appTheme = $appTheme ?? \App\Support\Theme::toDataTheme($appThemePreference);
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
        var theme = document.documentElement.getAttribute('data-theme') || defaultTheme;
        theme = normalize(theme);
        document.documentElement.setAttribute('data-theme', theme);
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
      }
      .waiting-list-public-nav {
        position: sticky;
        top: 0;
        z-index: 20;
        border-bottom: 1px solid color-mix(in srgb, var(--border, rgba(255,255,255,.22)) 88%, transparent);
        background: color-mix(in srgb, var(--bg, #14110f) 92%, transparent);
        backdrop-filter: blur(10px);
      }
      .waiting-list-public-nav .navbar-shell {
        min-height: var(--nav-h, 64px);
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 1rem;
        padding-top: env(safe-area-inset-top, 0px);
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
    </nav>
    <div id="app">
        <main id="mainContent" tabindex="-1">
            @yield('content')
        </main>
    </div>

    <script>
        window.mutqinMinimalPublicPage = true;
        window.mutqinWaitingListEndpoint = @json(url('/waiting-list'));
    </script>
    <script src="{{ mix('js/app.js') }}" defer></script>
    <script>
        window.mutqinInitialLocale = @json($appLocale);
        window.mutqinInitialDirection = @json($appDirection);
        window.mutqinAuthCheck = false;
        window.mutqinAppUrl = @json(\App\Support\MutqinDomains::appOrigin());
        window.mutqinInitialTheme = @json($appTheme);
        window.mutqinThemeModes = @json(\App\Support\Theme::clientCatalog());
        window.mutqinDefaultTheme = @json(\App\Support\Theme::DEFAULT);
        window.mutqinRelease = @json(\App\Support\ErrorReporting::release());
        window.mutqinEnvironment = @json(app()->environment());
    </script>
</body>
</html>
