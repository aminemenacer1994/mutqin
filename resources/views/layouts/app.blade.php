@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = $appThemePreference ?? session('mutqin_theme', 'light-mode');
    $appTheme = $appTheme ?? (str_starts_with($appThemePreference, 'dark') ? 'dark' : (str_starts_with($appThemePreference, 'sepia') ? 'sepia' : 'light'));
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="{{ $appTheme }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ __('ui.app_title') }}</title>
    <link id="appFaviconLight" rel="icon" type="image/svg+xml" href="/favicon-light.svg" media="(prefers-color-scheme: light)">
    <link id="appFaviconDark" rel="icon" type="image/svg+xml" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)">
    <link id="appThemeFavicon" rel="icon" type="image/svg+xml" href="/favicon-light.svg">
    <link id="appThemeFaviconIco" rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    @if(request()->routeIs('memorisation'))
    {{-- Survives stale memorisation JS chunks: HTML is network-first / not JS-chunk-cached --}}
    <style id="mutqin-button-colour-semantics">
      :root {
        --bs-danger: #b55041;
        --bs-danger-rgb: 181, 80, 65;
        --success: #2e7d64;
        --success-strong: #23624e;
        --danger: #b55041;
        --danger-strong: #9a4336;
        --destructive: var(--danger);
        --destructive-strong: var(--danger-strong);
      }
      [data-theme="dark"] {
        --bs-danger: #d4786a;
        --bs-danger-rgb: 212, 120, 106;
        --success: #3f8f6f;
        --success-strong: #2f6f58;
        --danger: #d4786a;
        --danger-strong: #c45f50;
      }
      .app .mutqin-modal-btn--primary,
      .app .btn-primary,
      .app .tools-btn-primary,
      .app .tools-btn.btn-primary,
      .app .action-btn.primary,
      .app .action-btn.btn-primary,
      .app .session-primary-action.btn-primary,
      .app .session-resume-btn.btn-primary,
      .app .self-check-action-btn.btn-primary,
      .app .recitation-check-actions .btn-primary,
      .app .post-session-simple__btn--primary,
      .app .saved-session-row-btn-primary {
        color: #fff !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
        border-color: color-mix(in srgb, var(--accent) 48%, transparent) !important;
      }
      [data-theme="dark"] .app .mutqin-modal-btn--primary,
      [data-theme="dark"] .app .btn-primary,
      [data-theme="dark"] .app .tools-btn-primary,
      [data-theme="dark"] .app .action-btn.primary,
      [data-theme="dark"] .app .action-btn.btn-primary,
      [data-theme="dark"] .app .session-primary-action.btn-primary,
      [data-theme="dark"] .app .self-check-action-btn.btn-primary {
        color: #1a120c !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
      }
      .app .mutqin-modal-btn--secondary,
      .app .post-session-simple__btn--secondary {
        color: var(--text) !important;
        background: color-mix(in srgb, var(--surface) 96%, transparent) !important;
        border-color: color-mix(in srgb, var(--border) 82%, transparent) !important;
      }
      .app .mutqin-modal-btn--success {
        color: #fff !important;
        background: linear-gradient(135deg, var(--success), var(--success-strong)) !important;
      }
      .app .mutqin-modal-btn--danger,
      .app .mutqin-modal-btn--destructive,
      .app .action-btn-exit,
      .app .action-btn.mutqin-btn--destructive,
      .app .session-exit-action-chip--end,
      .app .workspace-shell-actions .action-btn-exit {
        color: #fff !important;
        background: var(--bs-danger, #b55041) !important;
        border-color: var(--bs-danger, #b55041) !important;
      }
    </style>
    <script>
      // Re-assert colour lock after Vue injects chunk CSS (beats stale cached chunks).
      (function () {
        function pin() {
          var el = document.getElementById('mutqin-button-colour-semantics');
          if (el && el.parentNode) el.parentNode.appendChild(el);
        }
        window.addEventListener('load', function () {
          pin();
          setTimeout(pin, 0);
          setTimeout(pin, 500);
          setTimeout(pin, 2000);
        });
      })();
    </script>
    @endif
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-W4K8J2T0SG"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', 'G-W4K8J2T0SG');
    </script>
    <style>
        /* Theme Variables - NO SHADOWS */
        :root {
            color-scheme: light;
            --bg: #fdf9f2;
            --surface: rgba(255, 255, 255, 0.96);
            --surface-strong: #ffffff;
            --surface-elevated: #fffaf4;
            --surface-soft: rgba(249, 242, 233, 0.78);
            --border: rgba(160, 120, 76, 0.12);
            --text: #1a2e24;
            --text-muted: #6b7f76;
            --accent: #a0784c;
            --accent-strong: #8b653b;
            --accent-light: rgba(160, 120, 76, 0.1);
            --text-on-accent: #fffaf5;
            --text-on-accent-muted: rgba(255, 250, 245, 0.82);
            --field-bg: rgba(255, 255, 255, 0.9);
            --field-bg-strong: rgba(255, 255, 255, 0.97);
            --overlay: rgba(17, 13, 10, 0.34);
            --success-bg: rgba(24, 128, 86, 0.11);
            --success-text: #146c46;
            --danger-bg: rgba(178, 59, 59, 0.1);
            --danger-text: #913232;
            --warning-bg: rgba(196, 154, 108, 0.16);
            --warning-text: #8b653b;
            
            /* Responsive system tokens */
            --nav-h: 70px;
            --shell-max: 1400px;
            --gutter: clamp(14px, 3.6vw, 32px);
            --gutter-tight: clamp(12px, 3vw, 24px);
            --radius: clamp(12px, 1.4vw, 16px);
            --tap: 44px;
            --text-base: clamp(14px, 0.95vw + 10px, 16px);
            --text-sm: clamp(12px, 0.65vw + 9px, 14px);
        }

        [data-theme="dark"] {
            color-scheme: dark;
            --bg: #111315;
            --surface: rgba(24, 22, 20, 0.96);
            --surface-strong: #1b1a18;
            --surface-elevated: #24211d;
            --surface-soft: rgba(48, 40, 33, 0.42);
            --border: rgba(230, 207, 181, 0.14);
            --text: #f4ede4;
            --text-muted: #c9bbac;
            --accent: #c49a6c;
            --accent-strong: #d4aa7c;
            --accent-light: rgba(196, 154, 108, 0.15);
            --text-on-accent: #fff4e6;
            --text-on-accent-muted: rgba(255, 244, 230, 0.82);
            --field-bg: rgba(34, 30, 27, 0.96);
            --field-bg-strong: rgba(39, 34, 30, 0.98);
            --overlay: rgba(4, 4, 4, 0.52);
            --success-bg: rgba(63, 154, 114, 0.18);
            --success-text: #b8f0d5;
            --danger-bg: rgba(175, 82, 82, 0.18);
            --danger-text: #ffd1ca;
            --warning-bg: rgba(196, 154, 108, 0.18);
            --warning-text: #ffd6a7;
        }

        [data-theme="sepia"] {
            --bg: #f4ecd8;
            --surface: rgba(255, 248, 235, 0.96);
            --surface-strong: #fff8eb;
            --surface-elevated: #fff4e3;
            --surface-soft: rgba(239, 223, 200, 0.62);
            --border: rgba(139, 94, 60, 0.15);
            --text: #3d2b1f;
            --text-muted: #8b7355;
            --accent: #b87333;
            --accent-strong: #9a5a2a;
            --accent-light: rgba(184, 115, 51, 0.1);
            --text-on-accent: #fff7ec;
            --text-on-accent-muted: rgba(255, 247, 236, 0.82);
            --field-bg: rgba(255, 250, 241, 0.95);
            --field-bg-strong: rgba(255, 250, 241, 0.98);
            --overlay: rgba(44, 31, 20, 0.24);
            --success-bg: rgba(38, 133, 88, 0.12);
            --success-text: #1f7b50;
            --danger-bg: rgba(173, 76, 62, 0.12);
            --danger-text: #984336;
            --warning-bg: rgba(184, 115, 51, 0.12);
            --warning-text: #9a5a2a;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
            background: var(--bg);
            color: var(--text);
            transition: background 0.3s ease, color 0.3s ease;
            font-size: var(--text-base);
            text-rendering: geometricPrecision;
            -webkit-font-smoothing: antialiased;
            -moz-osx-font-smoothing: grayscale;
        }

        body,
        .form-control,
        .form-select,
        .form-check-input,
        .accordion-button,
        .dropdown-menu,
        .offcanvas,
        .offcanvas-header,
        .offcanvas-body,
        .modal-content,
        .table,
        .card,
        .alert {
            color: var(--text);
        }

        a {
            color: inherit;
        }

        .form-control,
        .form-select,
        textarea.form-control,
        input.form-control {
            background: var(--field-bg);
            border-color: color-mix(in srgb, var(--border) 92%, transparent);
            color: var(--text);
        }

        .form-control::placeholder,
        .form-select::placeholder,
        textarea.form-control::placeholder,
        input.form-control::placeholder {
            color: color-mix(in srgb, var(--text-muted) 86%, transparent);
        }

        .form-control:focus,
        .form-select:focus,
        .form-check-input:focus {
            background: var(--field-bg-strong);
            border-color: color-mix(in srgb, var(--accent) 58%, var(--border));
            color: var(--text);
            box-shadow: none !important;
        }

        .form-check-input {
            background-color: var(--field-bg);
            border-color: color-mix(in srgb, var(--border) 90%, transparent);
        }

        .form-check-input:checked {
            background-color: var(--accent);
            border-color: var(--accent);
        }

        .btn-close {
            filter: none;
        }

        [data-theme="dark"] .btn-close {
            filter: invert(1) grayscale(1) brightness(1.6);
        }

        .modal-content,
        .offcanvas,
        .card,
        .accordion-item,
        .table,
        .table-responsive,
        .list-group-item {
            background: var(--surface-strong);
            border-color: var(--border);
        }

        .modal-header,
        .modal-footer,
        .offcanvas-header,
        .accordion-button,
        .table > :not(caption) > * > * {
            border-color: var(--border);
        }

        .offcanvas {
            color: var(--text);
        }

        .accordion-button,
        .accordion-button:not(.collapsed) {
            background: var(--surface-strong);
            color: var(--text);
            box-shadow: none !important;
        }

        .accordion-button:not(.collapsed) {
            background: color-mix(in srgb, var(--accent-light) 84%, var(--surface-strong));
            color: var(--accent-strong);
        }

        .dropdown-item:active,
        .list-group-item {
            background: transparent;
            color: var(--text);
        }

        .table {
            --bs-table-bg: transparent;
            --bs-table-color: var(--text);
            --bs-table-border-color: var(--border);
            --bs-table-striped-bg: color-mix(in srgb, var(--surface-soft) 72%, transparent);
            --bs-table-striped-color: var(--text);
            --bs-table-hover-bg: color-mix(in srgb, var(--accent-light) 55%, transparent);
            --bs-table-hover-color: var(--text);
        }

        .alert-success {
            background: var(--success-bg);
            border-color: color-mix(in srgb, var(--success-text) 22%, var(--border));
            color: var(--success-text);
        }

        .alert-danger {
            background: var(--danger-bg);
            border-color: color-mix(in srgb, var(--danger-text) 20%, var(--border));
            color: var(--danger-text);
        }

        html[dir="rtl"] body {
            text-align: right;
        }

        /* App Navbar - NO SHADOWS */
        .app-navbar {
            background: var(--surface-strong);
            border-bottom: 1px solid var(--border);
            padding: 3px;
            position: sticky;
            top: 0;
            z-index: 1000;
            padding-top: env(safe-area-inset-top, 0px);
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        [data-theme="dark"] .app-navbar {
            background: var(--surface-strong);
        }

        [data-theme="sepia"] .app-navbar {
            background: var(--surface-strong);
        }

        .navbar-shell {
            max-width: var(--shell-max);
            margin: 0 auto;
            padding: 12px var(--gutter);
            min-height: var(--nav-h);
            gap: 12px;
        }

        .navbar-brand {
            padding: 0;
            margin-inline-end: 0;
        }

        .app-navbar-logo {
            height: 56px;
            width: auto;
            filter: none !important;
            mix-blend-mode: normal;
            opacity: 0.98;
            image-rendering: auto;
        }

        .navbar-quick-actions {
            margin-inline-start: auto;
        }

        .navbar-toggler {
            border: 1px solid var(--border);
            background: var(--surface);
            padding: 10px 14px;
            border-radius: 12px;
            color: var(--text);
            transition: all 0.2s ease;
            min-width: var(--tap);
            min-height: var(--tap);
        }

        .navbar-toggler:hover {
            background: var(--accent-light);
            border-color: var(--accent);
        }

        .navbar-toggler i {
            font-size: 22px;
        }

        .nav-links-desktop {
            display: flex;
            gap: 12px;
            align-items: center;
        }

        .navbar-nav-shell {
            flex: 1 1 auto;
            min-width: 0;
            box-shadow: none !important;
        }

        .app-navbar .offcanvas-lg {
            flex: 1 1 auto;
            border-color: var(--border);
            background: var(--surface-strong);
            --bs-offcanvas-width: min(360px, 100vw);
        }

        .app-navbar .offcanvas-header {
            border-bottom: 1px solid var(--border);
        }

        .app-auth-links {
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .nav-link {
            padding: 9px 16px;
            border-radius: 0;
            font-weight: 500;
            font-size: var(--text-sm);
            color: var(--text-muted);
            transition: all 0.2s ease;
            text-decoration: none;
            background: transparent;
            position: relative;
        }

        .nav-link:hover {
            color: var(--accent);
            background: transparent;
        }

        .nav-link.active {
            color: var(--accent);
            background: transparent;
            font-weight: 600;
        }

        .nav-link.active::after,
        .nav-link:hover::after {
            content: '';
            position: absolute;
            left: 20px;
            right: 20px;
            bottom: 4px;
            height: 2px;
            background: var(--accent);
            border-radius: 999px;
            opacity: 0.7;
        }

        .navbar,
        .app-navbar,
        .navbar-shell,
        .app-navbar::before,
        .app-navbar::after,
        .navbar-shell::before,
        .navbar-shell::after {
            box-shadow: none !important;
            filter: none !important;
        }

        .app-navbar .nav-link-home,
        .app-navbar .nav-link-home:hover,
        .app-navbar .nav-link-home:focus,
        .app-navbar .nav-link-home:focus-visible,
        .app-navbar .nav-link-home.active,
        .app-navbar .nav-link-memorisation,
        .app-navbar .nav-link-memorisation:hover,
        .app-navbar .nav-link-memorisation:focus,
        .app-navbar .nav-link-memorisation:focus-visible,
        .app-navbar .nav-link-memorisation.active {
            box-shadow: none !important;
        }

        .app-theme-toggle {
            width: 42px;
            height: 42px;
            border-radius: 12px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: all 0.2s ease;
            min-width: var(--tap);
            min-height: var(--tap);
        }

        .app-theme-toggle:hover {
            background: var(--accent-light);
            color: var(--accent);
            transform: rotate(15deg);
        }

        .app-lang-toggle {
            min-height: 42px;
            border-radius: 12px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            display: inline-flex;
            align-items: center;
            gap: 0.35rem;
            padding: 0 0.75rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .app-lang-toggle.icon-only {
            width: 42px;
            min-width: 42px;
            padding: 0;
            justify-content: center;
        }

        .global-lang-switcher {
            display: none !important;
        }

        .global-lang-switcher.d-lg-none .app-lang-toggle.icon-only {
            width: 100%;
        }

        .app-lang-toggle:hover,
        .global-lang-switcher .lang-btn.active {
            background: var(--accent-light);
            color: var(--accent);
        }

        html[dir="rtl"] .navbar-shell,
        html[dir="rtl"] .offcanvas-body,
        html[dir="rtl"] .app-auth-links {
            text-align: right;
        }

        html[dir="rtl"] .navbar-quick-actions {
            flex-direction: row-reverse;
        }

        html[dir="rtl"] .dropdown-menu-end {
            right: auto;
            left: 0;
        }

        html[dir="rtl"] .app-user-menu,
        html[dir="rtl"] .app-lang-menu {
            text-align: right;
        }

        .app-lang-menu {
            margin-top: 12px !important;
            min-width: 188px;
            padding: 8px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--surface-strong);
            z-index: 5200;
        }

        /* Dropdown Styles - NO SHADOWS */
        .dropdown {
            position: relative;
            display: inline-block;
        }

        .app-user-toggle {
            display: flex;
            align-items: center;
            gap: 12px;
            padding: 8px 16px 8px 12px;
            border-radius: 48px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            font-weight: 500;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s ease;
            max-width: 100%;
        }

        .app-user-toggle:hover {
            border-color: var(--accent);
            background: var(--accent-light);
        }

        .app-user-toggle > span:last-of-type {
            max-width: 10rem;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
        }

        html[dir="rtl"] .dropdown-menu {
            text-align: right;
        }

        .app-user-avatar {
            width: 36px;
            height: 36px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 15px;
        }

        .dropdown-menu {
            position: absolute;
            top: calc(100% + 12px);
            inset-inline-end: 0;
            background: var(--surface-strong);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 8px;
            min-width: 220px;
            opacity: 0;
            visibility: hidden;
            transform: translateY(-10px);
            transition: all 0.2s ease;
            z-index: 1050;
            max-width: min(92vw, 340px);
        }

        .dropdown-menu.show {
            opacity: 1;
            visibility: visible;
            transform: translateY(0);
        }

        .dropdown-item {
            display: flex;
            align-items: center;
            gap: 12px;
            width: 100%;
            border-radius: 12px;
            padding: 12px 16px;
            color: var(--text);
            text-decoration: none;
            transition: all 0.2s ease;
            cursor: pointer;
            background: none;
            border: none;
            font-size: 14px;
            font-weight: 500;
        }

        .dropdown-item i {
            font-size: 18px;
            width: 20px;
        }

        .dropdown-item:hover {
            background: var(--accent-light);
            color: var(--accent);
        }

        .dropdown-divider {
            height: 1px;
            margin: 8px 0;
            background: var(--border);
        }

        .shell {
            max-width: var(--shell-max);
            margin: 0 auto;
            padding: 0 var(--gutter);
        }

        main.shell {
            bottom: 0px;
            right: 0px;
            left: 0px;
        }

        @media (max-width: 1024px) {
            :root {
                --shell-max: 100%;
            }

            .navbar-shell {
                padding: 10px var(--gutter-tight);
            }

            .app-navbar-logo {
                height: 48px;
            }
        }

        @media (max-width: 768px) {
            :root {
                --nav-h: 64px;
            }

            .navbar-shell {
                gap: 8px;
            }

            .auth-shell {
                padding-inline: var(--gutter-tight);
            }

            .auth-card {
                width: 100%;
            }
        }

        @media (max-width: 480px) {
            .app-navbar-logo {
                height: 42px;
            }

            .nav-link {
                padding: 10px 14px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                scroll-behavior: auto !important;
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
                box-shadow: none !important;
            }
        }

        /* Animations */
        @keyframes fadeIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        .auth-shell, .landing-page {
            animation: fadeIn 0.4s ease-out;
        }

        .auth-shell {
            --auth-form-max-width: 520px;
            --auth-form-min-height: 640px;
            --auth-form-title-size: 2rem;
            --auth-form-copy-size: 0.95rem;
            --auth-form-label-size: 0.95rem;
            min-height: calc(100dvh - var(--nav-h) - 8px);
            display: flex;
            align-items: center;
            justify-content: center;
            padding: 6px var(--gutter) 6px;
            position: relative;
        }

        .auth-shell::before,
        .auth-shell::after {
            display: none;
        }

        .auth-card {
            width: min(100%, 720px);
            display: grid;
            gap: 22px;
            position: relative;
            z-index: 1;
        }

        .auth-card-sm {
            max-width: 640px;
            margin-inline: auto;
        }

        .auth-stage {
            width: min(100%, var(--auth-form-max-width));
            display: grid;
            grid-template-columns: minmax(0, 1fr);
            gap: 0;
            position: relative;
            z-index: 1;
        }

        .auth-stage-single {
            width: min(100%, var(--auth-form-max-width));
            grid-template-columns: minmax(0, 1fr);
            margin-inline: auto;
        }

        .auth-panel {
            min-width: 0;
            border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--border));
            border-radius: 24px;
            background: color-mix(in srgb, var(--surface-strong) 98%, transparent);
        }

        .auth-panel-form {
            display: flex;
            justify-content: center;
        }

        .auth-copy {
            display: grid;
            gap: 14px;
            align-content: start;
        }

        .auth-copy-compact {
            gap: 0.5rem;
            margin-bottom: 0.1rem;
        }

        .auth-brand {
            display: inline-flex;
            align-items: center;
            gap: 12px;
            width: fit-content;
            color: inherit;
            text-decoration: none;
        }

        .auth-brand:hover {
            color: inherit;
        }

        .auth-brand-mobile {
            display: none;
        }

        .auth-brand-static {
            display: inline-flex;
        }

        .auth-brand-mark {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            width: 42px;
            height: 42px;
            border-radius: 14px;
            background: color-mix(in srgb, var(--surface-elevated) 88%, transparent);
            border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
            color: var(--accent-strong);
            font-size: 18px;
        }

        .auth-brand-text {
            display: grid;
            gap: 2px;
            line-height: 1.1;
        }

        .auth-brand-text strong {
            font-size: 18px;
            font-weight: 600;
            letter-spacing: -0.01em;
            color: var(--text);
        }

        .auth-brand-text small {
            color: var(--text-muted);
            font-size: 12px;
        }

        .auth-title {
            margin: 0;
            overflow: visible;
            font-size: clamp(2rem, 3vw, 2.5rem);
            line-height: 1.08;
            letter-spacing: -0.02em;
            color: var(--text);
        }

        .auth-subtitle,
        .auth-form-subtitle {
            margin: 0;
            color: var(--text-muted);
            font-size: var(--auth-form-copy-size);
            line-height: 1.65;
        }

        .auth-subtitle {
            max-width: 36rem;
            font-size: clamp(15px, 1.35vw, 18px);
        }

        .auth-form-title {
            margin: 0;
            font-size: var(--auth-form-title-size);
            line-height: 1.1;
            letter-spacing: -0.015em;
            font-weight: 500;
            color: var(--text);
        }

        .auth-form-wrap {
            min-width: 0;
            width: min(100%, var(--auth-form-max-width));
            max-width: var(--auth-form-max-width);
            min-height: var(--auth-form-min-height);
            display: grid;
            align-content: start;
            gap: 12px;
            padding: clamp(16px, 1.6vw, 20px);
            border-radius: 24px;
            background: color-mix(in srgb, var(--surface-strong) 98%, transparent);
        }

        .auth-stage-single .auth-panel-form {
            justify-content: center;
        }

        .auth-stage-single .auth-form-wrap {
            margin-inline: auto;
        }

        .auth-alert {
            margin: 0;
            border-radius: 18px;
            padding: 14px 16px;
        }

        .auth-divider {
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
            gap: 14px;
            align-items: center;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 500;
            text-transform: uppercase;
            letter-spacing: 0.08em;
        }

        .auth-divider::before,
        .auth-divider::after {
            content: "";
            height: 1px;
            background: color-mix(in srgb, var(--accent) 10%, var(--border));
        }

        .auth-form-grid {
            display: grid;
            gap: 14px;
        }

        .auth-field {
            display: grid;
            gap: 8px;
        }

        .auth-field-split {
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 14px;
        }

        .auth-field-split > div {
            display: grid;
            gap: 8px;
            min-width: 0;
        }

        .auth-form-wrap .form-label {
            color: var(--text);
            font-weight: 500;
            font-size: var(--auth-form-label-size);
        }

        .auth-form-wrap .form-control {
            min-height: 50px;
            border-radius: 18px;
            border: 1px solid color-mix(in srgb, var(--accent) 7%, var(--border));
            background: color-mix(in srgb, var(--surface) 88%, var(--field-bg));
            color: var(--text);
            padding-inline: 16px;
            box-shadow: none !important;
        }

        .auth-form-wrap .form-control:focus {
            border-color: color-mix(in srgb, var(--accent) 56%, var(--border));
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent-light) 72%, transparent);
        }

        .auth-google-btn,
        .auth-btn-primary {
            min-height: 50px;
            border-radius: 18px;
        }

        .auth-google-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            width: 100%;
            padding: 0 18px;
            border: 1px solid color-mix(in srgb, var(--accent) 8%, var(--border));
            background: color-mix(in srgb, var(--surface) 88%, var(--surface-strong));
            color: var(--text);
            font-weight: 500;
            font-size: var(--auth-form-label-size);
            text-decoration: none;
        }

        .auth-google-btn:hover {
            color: var(--text);
            background: color-mix(in srgb, var(--surface-soft) 90%, var(--surface));
        }

        .auth-google-icon {
            display: inline-flex;
            width: 20px;
            height: 20px;
        }

        .auth-form-wrap .invalid-feedback {
            display: block;
            margin-top: 2px;
        }

        .auth-meta-row {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex-wrap: wrap;
        }

        .auth-check {
            display: inline-flex;
            align-items: center;
            gap: 10px;
            color: var(--text-muted);
            font-weight: 400;
            font-size: var(--auth-form-label-size);
            cursor: pointer;
        }

        .auth-check .form-check-input {
            margin: 0;
        }

        .auth-text-link,
        .auth-switch a {
            color: var(--accent-strong);
            font-weight: 500;
            text-decoration: none;
        }

        .auth-text-link:hover,
        .auth-switch a:hover {
            color: var(--accent);
        }

        .auth-actions {
            display: grid;
            gap: 12px;
        }

        .auth-submit {
            width: 100%;
            border: 0;
            background: linear-gradient(135deg, var(--accent), var(--accent-strong));
            color: var(--text-on-accent);
            font-weight: 500;
            font-size: var(--auth-form-label-size);
            letter-spacing: 0.01em;
        }

        .auth-submit:hover,
        .auth-submit:focus {
            background: linear-gradient(135deg, color-mix(in srgb, var(--accent) 90%, white 10%), var(--accent-strong));
            color: var(--text-on-accent);
        }

        .auth-switch {
            margin: 0;
            text-align: center;
            color: var(--text-muted);
            font-size: var(--auth-form-copy-size);
        }

        @media (max-width: 991.98px) {
            .auth-form-wrap {
                padding: 16px;
            }
        }

        @media (max-width: 767.98px) {
            .auth-shell {
                padding-block: 4px 6px;
                padding-inline: var(--gutter-tight);
            }

            .auth-shell {
                --auth-form-min-height: auto;
            }

            .auth-panel,
            .auth-form-wrap {
                border-radius: 26px;
            }

            .auth-field-split {
                grid-template-columns: minmax(0, 1fr);
            }

            .auth-meta-row {
                align-items: flex-start;
                flex-direction: column;
            }

            .navbar-shell {
                min-height: calc(var(--nav-h) + env(safe-area-inset-top, 0px));
                padding: 10px max(12px, env(safe-area-inset-left, 0px)) 10px max(12px, env(safe-area-inset-right, 0px));
                gap: 8px;
                flex-wrap: nowrap;
            }

            .navbar-brand {
                flex: 0 1 auto;
                min-width: 0;
            }

            .app-navbar-logo {
                height: 38px;
                width: auto;
                max-width: min(44vw, 156px);
                object-fit: contain;
            }

            .navbar-quick-actions {
                flex: 0 0 auto;
                min-width: 0;
                gap: 8px !important;
            }

            .app-theme-toggle,
            .navbar-toggler,
            .app-user-toggle,
            .app-lang-toggle.icon-only {
                width: 44px;
                min-width: 44px;
                height: 44px;
                min-height: 44px;
                padding: 0;
                border-radius: 14px;
                justify-content: center;
            }

            .app-user-toggle {
                gap: 0;
            }

            .app-user-toggle > span:last-of-type,
            .app-user-toggle .bi-chevron-down {
                display: none;
            }

            .app-user-avatar {
                width: 34px;
                height: 34px;
                font-size: 14px;
            }

            .app-navbar .offcanvas-lg {
                --bs-offcanvas-width: min(88vw, 360px);
            }

            .app-navbar .offcanvas-header {
                padding: calc(env(safe-area-inset-top, 0px) + 12px) 16px 12px;
            }

            .app-navbar .offcanvas-body {
                padding: 12px 16px calc(env(safe-area-inset-bottom, 0px) + 20px);
                overflow-y: auto;
            }

            .nav-links-desktop,
            .app-auth-links {
                width: 100%;
                align-items: stretch;
            }

            .nav-link {
                display: flex;
                align-items: center;
                min-height: 44px;
                padding: 12px 14px;
                border-radius: 14px;
                white-space: normal;
            }

            .nav-link.active::after,
            .nav-link:hover::after {
                left: 14px;
                right: 14px;
            }

            .auth-shell {
                min-height: calc(100dvh - var(--nav-h));
                align-items: flex-start;
                padding-top: max(8px, env(safe-area-inset-top, 0px));
                padding-bottom: calc(env(safe-area-inset-bottom, 0px) + 16px);
            }

            .auth-card,
            .auth-stage,
            .auth-stage-single,
            .auth-panel,
            .auth-form-wrap {
                width: 100%;
                max-width: none;
            }

            .auth-form-wrap {
                gap: 14px;
                padding: 16px;
                min-height: auto;
                border-radius: 22px;
            }

            .auth-form-title {
                font-size: clamp(1.7rem, 9vw, 2.15rem);
                line-height: 1.05;
            }

            .auth-form-wrap .form-control,
            .auth-google-btn,
            .auth-btn-primary {
                min-height: 46px;
                border-radius: 16px;
            }

            .auth-alert,
            .auth-form-wrap .invalid-feedback,
            .auth-switch,
            .auth-text-link,
            .auth-divider {
                overflow-wrap: anywhere;
            }
        }

        .billing-page {
            padding-block: 42px 64px;
        }

        .profile-page,
        .admin-page {
            padding-block: calc(var(--nav-h) + 20px) 54px;
        }

        .profile-stage {
            display: grid;
            gap: 20px;
        }

        .profile-hero-card {
            display: grid;
            gap: 24px;
            align-items: stretch;
            position: relative;
            grid-template-columns: minmax(0, 1.25fr) minmax(280px, 0.75fr);
            padding: clamp(20px, 3.5vw, 30px);
            border-radius: 32px;
            overflow: hidden;
            background:
                radial-gradient(circle at top left, color-mix(in srgb, var(--field-bg-strong) 68%, transparent), transparent 34%),
                linear-gradient(135deg, color-mix(in srgb, var(--accent) 16%, var(--surface-strong)) 0%, color-mix(in srgb, var(--surface-strong) 88%, var(--surface-elevated)) 100%);
            border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
        }

        .admin-page-head {
            display: flex;
            gap: 18px;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .profile-hero-card::after {
            content: "";
            position: absolute;
            right: -38px;
            bottom: -68px;
            width: 220px;
            height: 220px;
            border-radius: 50%;
            background: radial-gradient(circle, color-mix(in srgb, var(--accent) 20%, transparent), transparent 68%);
            pointer-events: none;
        }

        .profile-hero-copy,
        .profile-hero-summary {
            position: relative;
            z-index: 1;
        }

        .profile-hero-copy {
            display: grid;
            gap: 12px;
            align-content: start;
        }

        .profile-hero-summary {
            display: grid;
            gap: 12px;
            align-content: start;
            padding: 18px;
            border-radius: 24px;
            background: color-mix(in srgb, var(--surface-elevated) 82%, transparent);
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            backdrop-filter: blur(14px);
        }

        .profile-kicker {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--accent-light);
            color: var(--accent-strong);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .profile-hero-copy h1,
        .admin-page-head h1 {
            margin: 0;
            font-size: clamp(34px, 4.4vw, 56px);
            line-height: 0.98;
            letter-spacing: -0.05em;
        }

        .profile-hero-copy p,
        .admin-page-head p {
            max-width: 62ch;
            margin-bottom: 0;
            color: var(--text-muted);
            line-height: 1.75;
        }

        .profile-summary-label,
        .profile-inline-badge {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            min-height: 34px;
            padding: 0 12px;
            border-radius: 999px;
            background: var(--accent-light);
            color: var(--accent-strong);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.04em;
            text-transform: uppercase;
        }

        .profile-summary-plan {
            font-size: clamp(24px, 2.4vw, 34px);
            line-height: 1.05;
            letter-spacing: -0.04em;
            color: var(--text);
        }

        .profile-summary-meta {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.7;
        }

        .profile-hero-actions,
        .profile-subscription-actions,
        .admin-filter-tabs,
        .admin-message-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .profile-hero-actions form,
        .profile-subscription-actions form,
        .admin-message-actions form {
            margin: 0;
        }

        .profile-action-btn,
        .profile-submit-btn {
            width: auto;
            min-width: 170px;
            padding-inline: 18px;
        }

        .profile-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 20px;
        }

        .profile-card {
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
        }

        .profile-pane {
            padding: 22px;
            border-radius: 28px;
            background: color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated));
            border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border));
        }

        .profile-card-wide {
            width: 100%;
        }

        .profile-card-head {
            margin-bottom: 16px;
            padding-bottom: 14px;
            border-bottom: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
        }

        .profile-card-head-split {
            display: flex;
            gap: 14px;
            align-items: flex-start;
            justify-content: space-between;
        }

        .profile-card-head h2,
        .admin-message-title-row h2 {
            margin-bottom: 6px;
            font-size: 25px;
            letter-spacing: -0.02em;
        }

        .profile-card-head p,
        .admin-message-head p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.75;
        }

        .profile-form {
            display: grid;
            gap: 18px;
        }

        .profile-form .form-label {
            color: var(--text);
            font-weight: 700;
        }

        .profile-form .form-control {
            min-height: 50px;
            border-radius: 16px;
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            background: var(--field-bg);
            color: var(--text);
            padding-inline: 15px;
            box-shadow: inset 0 1px 0 color-mix(in srgb, var(--field-bg-strong) 75%, transparent);
        }

        .profile-form .form-control:focus {
            border-color: var(--accent);
            box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--accent) 18%, transparent);
        }

        .profile-subscription-grid {
            display: grid;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            gap: 14px;
        }

        .profile-subscription-item {
            padding: 16px;
            border-radius: 20px;
            background:
                linear-gradient(180deg, color-mix(in srgb, var(--surface-elevated) 92%, transparent), color-mix(in srgb, var(--surface-soft) 72%, var(--surface)));
            border: 1px solid color-mix(in srgb, var(--accent) 12%, var(--border));
            box-shadow: inset 0 1px 0 color-mix(in srgb, var(--field-bg-strong) 62%, transparent);
        }

        .profile-subscription-item span {
            display: block;
            margin-bottom: 8px;
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .profile-subscription-item strong {
            font-size: 20px;
            line-height: 1.2;
        }

        .profile-subscription-note {
            margin: 16px 0 0;
            padding: 12px 14px;
            border-radius: 16px;
            background: var(--accent-light);
            border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
            color: var(--accent-strong);
        }

        .profile-subscription-actions {
            margin-top: 22px;
        }

        .admin-message-list {
            display: grid;
            gap: 16px;
        }

        .admin-message-card {
            display: grid;
            gap: 18px;
        }

        .admin-message-head {
            display: flex;
            gap: 14px;
            justify-content: space-between;
            align-items: flex-start;
        }

        .admin-message-title-row {
            display: flex;
            gap: 12px;
            align-items: center;
            flex-wrap: wrap;
        }

        .admin-message-status {
            padding: 6px 10px;
            border-radius: 999px;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
        }

        .admin-message-status-pending {
            background: var(--warning-bg);
            color: var(--warning-text);
        }

        .admin-message-status-resolved {
            background: var(--success-bg);
            color: var(--success-text);
        }

        .admin-message-body {
            padding: 18px;
            border-radius: 16px;
            background: var(--surface);
            border: 1px solid var(--border);
            line-height: 1.7;
            white-space: pre-wrap;
        }

        .admin-filter-active {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-light);
        }

        .admin-pagination {
            margin-top: 20px;
        }

        .billing-debug {
            display: grid;
            gap: 6px;
            margin-bottom: 18px;
            padding: 14px 16px;
            border-radius: 8px;
            border: 1px dashed var(--border);
            background: color-mix(in srgb, var(--surface-elevated) 84%, transparent);
            color: var(--text-muted);
            font-size: 12px;
        }

        .billing-debug strong {
            color: var(--text);
            font-size: 13px;
        }

        .billing-hero {
            display: grid;
            grid-template-columns: minmax(0, 1fr) minmax(260px, 360px);
            gap: 24px;
            align-items: stretch;
            margin-bottom: 28px;
        }

        .billing-kicker {
            display: inline-flex;
            margin-bottom: 12px;
            color: var(--accent);
            font-weight: 700;
            font-size: 13px;
            text-transform: uppercase;
        }

        .billing-hero h1 {
            max-width: 760px;
            font-size: clamp(32px, 4vw, 56px);
            line-height: 1.02;
            margin-bottom: 14px;
            letter-spacing: 0;
        }

        .billing-hero p,
        .billing-status-panel small,
        .billing-card small {
            color: var(--text-muted);
        }

        .billing-status-panel,
        .billing-card {
            background: var(--surface-strong);
            border: 1px solid var(--border);
            border-radius: 8px;
        }

        .billing-status-panel {
            padding: 22px;
            display: flex;
            flex-direction: column;
            gap: 8px;
        }

        .billing-status-panel span {
            color: var(--text-muted);
            font-size: 13px;
            font-weight: 700;
            text-transform: uppercase;
        }

        .billing-status-panel strong {
            font-size: 30px;
            line-height: 1;
        }

        .billing-alert {
            border-radius: 8px;
            padding: 14px 16px;
            margin-bottom: 18px;
            font-weight: 600;
        }

        .billing-confirmation {
            display: flex;
            gap: 18px;
            align-items: center;
            justify-content: space-between;
            border-radius: 8px;
            padding: 20px 22px;
            margin-bottom: 18px;
            background: var(--success-bg);
            color: var(--success-text);
            border: 1px solid color-mix(in srgb, var(--success-text) 22%, var(--border));
        }

        .billing-confirmation h2 {
            margin: 4px 0 8px;
            font-size: 22px;
            color: inherit;
        }

        .billing-confirmation p {
            margin: 0;
            color: inherit;
            opacity: 0.85;
        }

        .billing-confirmation-kicker {
            display: inline-flex;
            font-size: 12px;
            font-weight: 800;
            text-transform: uppercase;
            letter-spacing: 0.03em;
        }

        .billing-confirmation-actions {
            display: grid;
            gap: 10px;
            min-width: 240px;
        }

        .billing-confirmation-actions form {
            margin: 0;
        }

        .billing-alert-success {
            background: var(--success-bg);
            color: var(--success-text);
            border: 1px solid color-mix(in srgb, var(--success-text) 22%, var(--border));
        }

        .billing-alert-error {
            background: var(--danger-bg);
            color: var(--danger-text);
            border: 1px solid color-mix(in srgb, var(--danger-text) 20%, var(--border));
        }

        .billing-alert-info {
            background: var(--accent-light);
            color: var(--accent-strong);
            border: 1px solid color-mix(in srgb, var(--accent) 20%, var(--border));
        }

        .billing-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 18px;
        }

        .billing-card {
            position: relative;
            padding: 24px;
            display: flex;
            flex-direction: column;
            min-height: 430px;
            min-width: 0;
        }

        .billing-card-featured {
            border-color: var(--accent);
        }

        .billing-card-selected {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-light);
        }

        .billing-pill {
            align-self: flex-start;
            border-radius: 999px;
            background: var(--accent-light);
            color: var(--accent-strong);
            padding: 6px 10px;
            font-size: 12px;
            font-weight: 800;
            margin-bottom: 14px;
        }

        .billing-card-head i {
            color: var(--accent);
            font-size: 28px;
        }

        .billing-card h2 {
            margin: 12px 0 8px;
            font-size: 24px;
        }

        .billing-price {
            color: var(--accent);
            font-size: 34px;
            font-weight: 800;
            line-height: 1;
        }

        .billing-price span {
            color: var(--text-muted);
            font-size: 15px;
            font-weight: 600;
        }

        .billing-card ul {
            list-style: none;
            padding: 0;
            margin: 22px 0;
            display: grid;
            gap: 12px;
        }

        .billing-card li {
            display: flex;
            gap: 10px;
            color: var(--text-muted);
            line-height: 1.35;
        }

        .billing-card li i {
            color: var(--accent);
            flex: 0 0 auto;
        }

        .billing-actions {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 10px;
            margin-top: auto;
        }

        .billing-actions form {
            min-width: 0;
        }

        .billing-primary-btn,
        .billing-secondary-btn,
        .billing-link-btn {
            min-height: 44px;
            border-radius: 8px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 8px;
            font-weight: 800;
            text-decoration: none;
            width: 100%;
            cursor: pointer;
        }

        .billing-primary-btn {
            border: 1px solid var(--accent);
            background: var(--accent);
            color: var(--text-on-accent);
        }

        .billing-secondary-btn,
        .billing-link-btn {
            border: 1px solid var(--border);
            background: var(--surface);
            color: var(--text);
        }

        .billing-link-btn {
            margin-top: 8px;
        }

        .billing-plan-selected-action {
            box-shadow: 0 0 0 3px var(--accent-light);
        }

        /* Mobile drawer affordances stay inert outside the phone breakpoint. */
        .nav-links-desktop .nav-link-icon,
        .nav-links-desktop .nav-link-chevron,
        .nav-links-desktop .nav-link-copy small,
        .offcanvas-body .app-lang-toggle > span,
        .offcanvas-body .app-lang-toggle > .bi-chevron-down,
        .mobile-nav-identity > img,
        .mobile-nav-identity > div > span,
        .mobile-nav-only {
            display: none !important;
        }

        .nav-links-desktop .nav-link-copy,
        .nav-links-desktop .nav-link-copy strong {
            display: inline;
            font: inherit;
            color: inherit;
        }

        @media (max-width: 767.98px) {
            .app-navbar {
                padding-inline: 0;
                z-index: var(--bs-offcanvas-zindex, 1045);
            }

            .navbar-shell {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                margin: 0;
            }

            .app-navbar-logo {
                max-width: min(44vw, 148px);
            }

            .app-navbar .offcanvas-lg {
                --bs-offcanvas-width: min(88vw, 360px);
                max-width: 100vw;
                z-index: var(--bs-offcanvas-zindex, 1045) !important;
            }

            html[dir="rtl"] .app-navbar .offcanvas-lg.offcanvas-end {
                right: auto;
                left: 0;
                transform: translateX(-100%);
                border-right: 0;
                border-left: var(--bs-offcanvas-border-width) solid var(--bs-offcanvas-border-color);
            }

            html[dir="rtl"] .app-navbar .offcanvas-lg.offcanvas-end.show,
            html[dir="rtl"] .app-navbar .offcanvas-lg.offcanvas-end.showing {
                transform: none;
            }

            #mainContent,
            .profile-page,
            .admin-page,
            .billing-page,
            .profile-stage,
            .profile-hero-card,
            .profile-hero-copy,
            .profile-hero-summary,
            .profile-grid,
            .profile-pane,
            .profile-subscription-grid,
            .billing-hero,
            .billing-status-panel,
            .billing-confirmation,
            .billing-grid,
            .billing-card {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                min-width: 0;
            }

            .profile-page,
            .admin-page,
            .billing-page {
                padding-block: 20px 36px;
            }

            .profile-stage {
                gap: 14px;
            }

            .profile-hero-card,
            .profile-grid,
            .billing-hero,
            .billing-grid {
                grid-template-columns: minmax(0, 1fr);
            }

            .profile-hero-card {
                gap: 14px;
                padding: 16px;
                border-radius: 22px;
            }

            .profile-hero-card::after {
                right: 0;
                bottom: 0;
                width: min(54vw, 180px);
                height: min(54vw, 180px);
            }

            .profile-hero-copy h1,
            .admin-page-head h1,
            .billing-hero h1 {
                font-size: clamp(1.9rem, 10vw, 2.65rem);
                line-height: 1.05;
                overflow-wrap: break-word;
            }

            .profile-hero-copy p,
            .profile-summary-meta,
            .profile-card-head p,
            .admin-page-head p,
            .billing-hero p,
            .billing-card li,
            .billing-card small {
                overflow-wrap: break-word;
            }

            .profile-hero-summary,
            .profile-pane,
            .billing-status-panel,
            .billing-card {
                padding: 16px;
                border-radius: 20px;
            }

            .profile-grid {
                gap: 14px;
            }

            .profile-card-head-split,
            .admin-page-head,
            .admin-message-head,
            .billing-confirmation {
                align-items: stretch;
                flex-direction: column;
            }

            .profile-hero-actions,
            .profile-subscription-actions,
            .admin-message-actions,
            .billing-confirmation-actions {
                display: grid;
                grid-template-columns: minmax(0, 1fr);
                width: 100%;
                min-width: 0;
            }

            .profile-hero-actions form,
            .profile-subscription-actions form,
            .admin-message-actions form,
            .profile-action-btn,
            .profile-submit-btn,
            .billing-confirmation-actions,
            .billing-confirmation-actions form {
                width: 100%;
                min-width: 0;
            }

            .profile-subscription-grid {
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            .profile-subscription-item {
                min-width: 0;
                padding: 13px;
                border-radius: 16px;
            }

            .profile-subscription-item strong {
                font-size: 17px;
                overflow-wrap: break-word;
            }

            .admin-page-head,
            .billing-hero {
                gap: 14px;
                margin-bottom: 18px;
            }

            .admin-message-body {
                padding: 14px;
                overflow-wrap: anywhere;
            }

            .billing-confirmation {
                gap: 14px;
                padding: 16px;
            }

            .billing-confirmation-actions {
                min-width: 0;
            }

            .billing-grid {
                gap: 14px;
            }

            .billing-card {
                min-height: 0;
            }

            .billing-actions {
                grid-template-columns: repeat(2, minmax(0, 1fr));
            }

            /* Canonical four-column phone grid for the shared application shell. */
            .navbar-shell {
                --app-mobile-grid: repeat(4, minmax(0, 1fr));
                --app-mobile-gap: clamp(8px, 2.4vw, 12px);
                display: grid !important;
                grid-template-columns: var(--app-mobile-grid);
                gap: var(--app-mobile-gap) !important;
                align-items: center;
            }

            .navbar-brand {
                grid-column: 1 / span 2;
                min-width: 0;
                justify-self: start;
            }

            .navbar-quick-actions {
                grid-column: 3 / -1;
                display: grid !important;
                grid-auto-flow: column;
                grid-auto-columns: 44px;
                justify-content: end;
                gap: var(--app-mobile-gap) !important;
                min-width: 0;
            }

            .navbar-quick-actions > .dropdown,
            .navbar-quick-actions > button {
                width: 44px;
                min-width: 44px;
            }

            .app-navbar .offcanvas-lg {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                --bs-offcanvas-width: min(88vw, 360px);
                width: var(--bs-offcanvas-width) !important;
                max-width: min(88vw, 360px) !important;
                background: var(--surface);
                border-inline-start: 1px solid var(--border);
                box-shadow: -18px 0 50px rgba(31, 42, 35, 0.14);
            }

            .app-navbar .offcanvas-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 44px;
                gap: 10px;
                align-items: center;
                min-height: 82px;
                padding: max(14px, env(safe-area-inset-top)) 16px 14px;
                border-bottom: 1px solid var(--border);
            }

            .mobile-nav-identity {
                display: grid;
                grid-template-columns: 78px minmax(0, 1fr);
                gap: 10px;
                align-items: center;
                min-width: 0;
            }

            .mobile-nav-identity img {
                display: block !important;
                width: 78px;
                height: auto;
                max-height: 40px;
                object-fit: contain;
            }

            .mobile-nav-identity > div {
                min-width: 0;
            }

            .mobile-nav-identity > div > span {
                display: none !important;
            }

            .mobile-nav-identity h2 {
                color: var(--text);
                font-size: 1.05rem !important;
                font-weight: 800;
            }

            .app-navbar .offcanvas-body {
                display: grid !important;
                grid-template-columns: var(--app-mobile-grid);
                grid-auto-rows: max-content;
                align-content: start;
                gap: 16px;
                padding: 16px 14px calc(20px + env(safe-area-inset-bottom)) !important;
                overflow-x: hidden;
                overflow-y: auto;
                overscroll-behavior: contain;
            }

            .app-navbar .offcanvas-body > * {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .nav-links-desktop,
            .app-auth-links {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr);
                gap: 8px !important;
                width: 100%;
            }

            .navbar-nav-shell {
                width: 100%;
                min-width: 0;
            }

            .app-navbar .offcanvas-body .nav-link {
                display: grid;
                grid-template-columns: 44px minmax(0, 1fr) 20px;
                gap: 10px;
                align-items: center;
                width: 100%;
                min-width: 0;
                min-height: 60px;
                padding: 8px 10px;
                color: var(--text-muted);
                text-align: start;
                border: 1px solid transparent;
                border-radius: 14px;
            }

            .app-navbar .offcanvas-body .nav-link:hover,
            .app-navbar .offcanvas-body .nav-link:focus-visible {
                color: var(--text);
                background: var(--surface-2);
                border-color: var(--border);
            }

            .app-navbar .offcanvas-body .nav-link.active {
                color: var(--text);
                background: color-mix(in srgb, var(--success-text) 9%, var(--surface) 91%);
                border-color: color-mix(in srgb, var(--success-text) 24%, var(--border) 76%);
                box-shadow: inset 3px 0 0 var(--success-text);
            }

            html[dir="rtl"] .app-navbar .offcanvas-body .nav-link.active {
                box-shadow: inset -3px 0 0 var(--success-text);
            }

            .app-navbar .offcanvas-body .nav-link-icon {
                display: grid !important;
                grid-column: 1;
                place-items: center;
                width: 44px;
                height: 44px;
                border-radius: 12px;
                background: var(--surface-soft);
                font-size: 1.1rem;
            }

            .app-navbar .offcanvas-body .nav-link-copy {
                display: grid !important;
                grid-column: 2;
                gap: 2px;
                width: 100%;
                min-width: 0;
            }

            .app-navbar .offcanvas-body .nav-link-copy strong {
                display: block;
                color: inherit;
                font-size: 0.96rem;
                line-height: 1.2;
                white-space: normal;
                word-break: normal;
                overflow-wrap: break-word;
            }

            .app-navbar .offcanvas-body .nav-link-copy small {
                display: block !important;
                color: var(--text-muted);
                font-size: 0.74rem;
                line-height: 1.3;
                white-space: normal;
                word-break: normal;
                overflow-wrap: break-word;
            }

            .app-navbar .offcanvas-body .nav-link-chevron {
                display: block !important;
                grid-column: 3;
                justify-self: end;
                color: var(--text-muted);
            }

            .app-navbar .offcanvas-body .nav-link > span:not(.nav-link-copy) {
                grid-column: 2 / -1;
                min-width: 0;
                white-space: normal;
                word-break: normal;
            }

            html[dir="rtl"] .app-navbar .offcanvas-body .nav-link-chevron {
                transform: scaleX(-1);
            }

            .app-navbar .offcanvas-body .app-lang-toggle {
                display: grid;
                grid-template-columns: 44px minmax(0, 1fr) 20px;
                gap: 10px;
                align-items: center;
                min-height: 54px;
                padding: 5px 10px;
                text-align: start;
            }

            .app-navbar .offcanvas-body .app-lang-toggle > :first-child {
                width: 44px;
                height: 44px;
                display: grid;
                place-items: center;
            }

            .app-navbar .offcanvas-body .app-lang-toggle > span,
            .app-navbar .offcanvas-body .app-lang-toggle > .bi-chevron-down {
                display: block !important;
            }

            .mobile-nav-only {
                display: grid !important;
            }

            .mobile-nav-account {
                display: grid;
                gap: 8px;
                padding-top: 12px;
                border-top: 1px solid var(--border);
            }

            .mobile-nav-section-label {
                color: var(--text-muted);
                font-size: 0.72rem;
                font-weight: 800;
                letter-spacing: 0.1em;
                text-transform: uppercase;
            }

            .mobile-nav-account form {
                min-width: 0;
            }

            .app-navbar .offcanvas-body .mobile-nav-logout {
                grid-template-columns: 44px minmax(0, 1fr);
                border: 0;
                background: transparent;
            }

            .auth-stage,
            .auth-stage-single,
            .auth-form-wrap,
            .auth-form-grid {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                column-gap: clamp(8px, 2.4vw, 12px);
            }

            .auth-stage > *,
            .auth-stage-single > *,
            .auth-form-wrap > *,
            .auth-form-grid > * {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .auth-field-split {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
            }

            .auth-field-split > * {
                grid-column: span 2;
                min-width: 0;
            }

            .auth-meta-row {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
                align-items: center;
            }

            .auth-meta-row > :first-child {
                grid-column: 1 / span 2;
            }

            .auth-meta-row > :last-child {
                grid-column: 3 / -1;
                justify-self: end;
                text-align: end;
            }

            .profile-stage,
            .profile-hero-card,
            .profile-grid,
            .profile-subscription-grid,
            .profile-hero-actions,
            .profile-subscription-actions,
            .admin-page-head,
            .admin-message-head,
            .admin-message-actions,
            .billing-hero,
            .billing-confirmation,
            .billing-confirmation-actions,
            .billing-grid,
            .billing-actions {
                display: grid !important;
                grid-template-columns: repeat(4, minmax(0, 1fr)) !important;
                gap: clamp(8px, 2.4vw, 12px) !important;
                min-width: 0;
            }

            .profile-stage > *,
            .profile-grid > *,
            .billing-grid > * {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .profile-hero-copy {
                grid-column: 1 / span 2;
            }

            .profile-hero-summary {
                grid-column: 3 / -1;
            }

            .profile-hero-copy h1,
            .admin-page-head h1,
            .billing-hero h1 {
                font-size: clamp(1.5rem, 7.8vw, 2.35rem);
                line-height: 1.02;
            }

            .profile-hero-actions > *,
            .profile-subscription-actions > *,
            .admin-message-actions > * {
                grid-column: span 2;
                width: 100%;
                min-width: 0;
            }

            .profile-action-btn,
            .profile-submit-btn {
                width: 100%;
                min-width: 0;
            }

            .profile-card-head-split {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 10px;
                align-items: start;
            }

            .profile-subscription-grid > * {
                grid-column: span 2;
            }

            .admin-page-head > :first-child,
            .admin-message-head > :first-child,
            .billing-confirmation > :first-child {
                grid-column: 1 / span 3;
            }

            .admin-page-head > :last-child,
            .admin-message-head > :last-child,
            .billing-confirmation > :last-child {
                grid-column: 4 / -1;
            }

            .billing-hero > :first-child {
                grid-column: 1 / span 2;
            }

            .billing-hero > .billing-status-panel {
                grid-column: 3 / -1;
            }

            .billing-confirmation-actions > *,
            .billing-actions > * {
                grid-column: span 2;
                min-width: 0;
            }

            .billing-card {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 10px;
            }

            .billing-card > * {
                grid-column: 1 / -1;
                min-width: 0;
            }

            .billing-card ul {
                display: grid;
                grid-template-columns: repeat(2, minmax(0, 1fr));
                gap: 10px;
            }

            .billing-card li {
                min-width: 0;
            }
        }

        @media (max-width: 479.98px) {
            .profile-hero-copy,
            .profile-hero-summary {
                grid-column: 1 / -1;
            }

            .profile-hero-summary {
                display: grid;
                grid-template-columns: repeat(4, minmax(0, 1fr));
                gap: 8px;
                align-items: center;
            }

            .profile-summary-label {
                grid-column: 1 / span 2;
            }

            .profile-summary-plan {
                grid-column: 3 / -1;
            }

            .profile-summary-meta {
                grid-column: 1 / span 3;
            }

            .profile-hero-summary > .profile-hero-actions {
                grid-column: 4 / -1;
                align-self: stretch;
            }

            .profile-hero-summary > .profile-hero-actions > * {
                grid-column: 1 / -1;
            }

            .profile-hero-summary .profile-action-btn {
                min-width: 0;
                height: 100%;
            }
        }

        @media (max-width: 349.98px) {
            .app-navbar-logo {
                max-width: 40vw;
            }

            .profile-subscription-grid,
            .billing-actions {
                grid-template-columns: repeat(4, minmax(0, 1fr));
            }

            .profile-hero-copy,
            .profile-hero-summary,
            .billing-hero > :first-child,
            .billing-hero > .billing-status-panel,
            .admin-page-head > :first-child,
            .admin-page-head > :last-child,
            .admin-message-head > :first-child,
            .admin-message-head > :last-child,
            .billing-confirmation > :first-child,
            .billing-confirmation > :last-child {
                grid-column: 1 / -1;
            }

            .auth-field-split > *,
            .profile-subscription-grid > *,
            .billing-actions > * {
                grid-column: 1 / -1;
            }
        }
    </style>
</head>
<body dir="{{ $appDirection }}">
    <a class="skip-link" href="#mainContent">{{ __('ui.skip_main') }}</a>
    <nav class="navbar navbar-expand-lg app-navbar" aria-label="{{ __('ui.primary_navigation') }}">
        <div class="container-fluid shell navbar-shell">
            <a class="navbar-brand" href="{{ route('home') }}">
                <img
                    id="appNavbarLogo"
                    src="/images/logo.png"
                    data-logo-light="/images/logo.png"
                    data-logo-dark="/images/dark_logo.png"
                    alt="Mutqin"
                    class="app-navbar-logo"
                >
            </a>

            <div class="offcanvas offcanvas-end offcanvas-lg" tabindex="-1" id="primaryNavbar" aria-labelledby="primaryNavbarLabel">
                <div class="offcanvas-header">
                    <div class="mobile-nav-identity">
                        <img src="/images/logo.png" alt="" aria-hidden="true">
                        <div>
                            <span>Mutqin</span>
                            <h2 class="offcanvas-title h5 mb-0" id="primaryNavbarLabel">{{ __('ui.primary_navigation') }}</h2>
                        </div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="offcanvas" data-bs-target="#primaryNavbar" aria-label="{{ __('ui.close_navigation') }}"></button>
                </div>
                <div class="offcanvas-body d-flex flex-column flex-lg-row align-items-lg-center gap-3 pt-3 pt-lg-0">
                    <div class="navbar-nav-shell d-flex justify-content-lg-center">
                        <div class="navbar-nav nav-links-desktop gap-2 gap-lg-3 justify-content-lg-center">
                            <a class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}" href="{{ route('home') }}">
                                <i class="bi bi-house-door nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="home">{{ __('ui.home') }}</strong><small class="d-lg-none">Overview and product guidance</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link nav-link-memorisation {{ request()->routeIs('memorisation') ? 'active' : '' }}" href="{{ route('memorisation') }}">
                                <i class="bi bi-journal-bookmark nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="memorisation">{{ __('ui.memorisation') }}</strong><small class="d-lg-none">Continue your Quran practice</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link mobile-nav-only {{ request()->routeIs('about', 'about-us') ? 'active' : '' }}" href="{{ route('about-us') }}">
                                <i class="bi bi-people nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>About Mutqin</strong><small>Our story and approach</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link mobile-nav-only {{ request()->routeIs('our-mission') ? 'active' : '' }}" href="{{ route('our-mission') }}">
                                <i class="bi bi-compass nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>Our Mission</strong><small>Why deliberate memorisation matters</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link mobile-nav-only {{ request()->routeIs('donate') ? 'active' : '' }}" href="{{ route('donate') }}">
                                <i class="bi bi-heart nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>Support Mutqin</strong><small>Help make learning accessible</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                        </div>
                    </div>

                    <div class="global-lang-switcher dropdown d-lg-none w-100" aria-label="{{ __('ui.language_switcher') }}">
                        <button class="btn app-lang-toggle icon-only w-100 lang-btn-group" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="{{ __('ui.language_switcher') }}">
                            <i class="bi bi-translate" aria-hidden="true"></i>
                            <span>{{ __('ui.language_switcher') }}</span>
                            <i class="bi bi-chevron-down" aria-hidden="true"></i>
                        </button>
                        <ul class="dropdown-menu w-100 app-lang-menu">
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="en">🇬🇧 {{ __('ui.english') }}</button></li>
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="fr">🇫🇷 {{ __('ui.french') }}</button></li>
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="ar">🇸🇦 {{ __('ui.arabic') }}</button></li>
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="id">🇮🇩 {{ __('ui.indonesian') }}</button></li>
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="tr">🇹🇷 {{ __('ui.turkish') }}</button></li>
                            <li><button type="button" class="dropdown-item lang-btn" data-locale="es">🇪🇸 {{ __('ui.spanish') }}</button></li>
                        </ul>
                    </div>

                    @guest
                        <div class="app-auth-links d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 gap-lg-0">
                            <a class="nav-link" href="{{ route('login') }}"><i class="bi bi-box-arrow-in-right nav-link-icon d-lg-none" aria-hidden="true"></i><span data-i18n="login">{{ __('ui.login') }}</span></a>
                            <a class="nav-link" href="{{ route('register') }}"><i class="bi bi-person-plus nav-link-icon d-lg-none" aria-hidden="true"></i><span data-i18n="register">{{ __('ui.register') }}</span></a>
                        </div>
                    @endguest
                    @auth
                        <div class="mobile-nav-account mobile-nav-only">
                            <span class="mobile-nav-section-label">Account</span>
                            <a class="nav-link {{ request()->routeIs('profile.*') ? 'active' : '' }}" href="{{ route('profile.show') }}">
                                <i class="bi bi-person nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>Profile</strong><small>Preferences and subscription</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                            <form method="POST" action="{{ route('logout') }}">
                                @csrf
                                <button type="submit" class="nav-link mobile-nav-logout">
                                    <i class="bi bi-box-arrow-right nav-link-icon" aria-hidden="true"></i>
                                    <span>{{ __('ui.logout') }}</span>
                                </button>
                            </form>
                        </div>
                    @endauth
                </div>
            </div>

            <div class="d-flex align-items-center gap-2 navbar-quick-actions">
                <div class="global-lang-switcher dropdown d-none d-lg-block" aria-label="{{ __('ui.language_switcher') }}">
                    <button class="btn app-lang-toggle icon-only lang-btn-group" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="{{ __('ui.language_switcher') }}">
                        <i class="bi bi-translate" aria-hidden="true"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end app-lang-menu">
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="en">🇬🇧 {{ __('ui.english') }}</button></li>
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="fr">🇫🇷 {{ __('ui.french') }}</button></li>
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="ar">🇸🇦 {{ __('ui.arabic') }}</button></li>
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="id">🇮🇩 {{ __('ui.indonesian') }}</button></li>
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="tr">🇹🇷 {{ __('ui.turkish') }}</button></li>
                        <li><button type="button" class="dropdown-item lang-btn" data-locale="es">🇪🇸 {{ __('ui.spanish') }}</button></li>
                    </ul>
                </div>

                <button id="globalThemeToggle" class="btn app-theme-toggle" type="button" aria-label="{{ __('ui.switch_dark') }}">
                    <i class="bi bi-sun"></i>
                </button>

                @auth
                    <div class="dropdown" id="userDropdown">
                        <button class="btn app-user-toggle" type="button" id="dropdownToggle" aria-expanded="false" aria-haspopup="menu" aria-controls="dropdownMenu">
                            <span class="app-user-avatar" aria-hidden="true">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                            <span class="d-none d-lg-inline">{{ Auth::user()->name ?? __('ui.user') }}</span>
                            <i class="bi bi-chevron-down" aria-hidden="true"></i>
                        </button>
                        <ul class="dropdown-menu" id="dropdownMenu" role="menu">
                            @if (Auth::user()->isAdmin())
                                <li>
                                    <a class="dropdown-item" href="{{ route('admin.contact-messages.index') }}">
                                        <i class="bi bi-inbox"></i> <span data-i18n="contact_inbox">{{ __('ui.contact_inbox') }}</span>
                                    </a>
                                </li>
                            @endif
                            <li>
                                <form method="POST" action="{{ route('logout') }}" id="logoutForm">
                                    @csrf
                                    <button type="submit" class="dropdown-item" role="menuitem">
                                        <i class="bi bi-box-arrow-right" aria-hidden="true"></i> <span data-i18n="logout">{{ __('ui.logout') }}</span>
                                    </button>
                                </form>
                            </li>
                        </ul>
                    </div>
                @endauth

                <button class="navbar-toggler" type="button" data-bs-toggle="offcanvas" data-bs-target="#primaryNavbar" aria-controls="primaryNavbar" aria-label="{{ __('ui.open_navigation') }}">
                    <i class="bi bi-list"></i>
                </button>
            </div>
        </div>
    </nav>

    <div id="app">
        <main id="mainContent" tabindex="-1">
            @yield('content')
        </main>
    </div>

    <script src="{{ mix('js/app.js') }}" defer></script>
    
    <script>
        window.mutqinInitialLocale = @json($appLocale);
        window.mutqinInitialDirection = @json($appDirection);
        window.mutqinForceInitialLocale = @json(request()->query('lang') ? true : false);
        window.mutqinAuthCheck = @json(Auth::check());
        window.mutqinUiLabels = {
            en: @json(trans('ui', [], 'en')),
            fr: @json(trans('ui', [], 'fr')),
            ar: @json(trans('ui', [], 'ar')),
            id: @json(trans('ui', [], 'id')),
            tr: @json(trans('ui', [], 'tr')),
            es: @json(trans('ui', [], 'es')),
        };
        window.mutqinInitialThemePreference = @json($appThemePreference);
        window.mutqinInitialTheme = @json($appTheme);

        function runWhenReady(fn) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', fn);
                return;
            }
            fn();
        }

        // Theme management
        (function() {
            function safeGet(key) {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            }
            function safeSet(key, value) {
                try { localStorage.setItem(key, value); } catch (e) {}
            }
            function normalizeTheme(value) {
                if (value === 'dark' || value === 'dark-mode') return 'dark';
                if (value === 'sepia' || value === 'sepia-mode') return 'sepia';
                return 'light';
            }
            function toThemePreference(value) {
                const theme = normalizeTheme(value);
                if (theme === 'dark') return 'dark-mode';
                if (theme === 'sepia') return 'sepia-mode';
                return 'light-mode';
            }
            const themes = ['light', 'dark'];
            const themeIcons = {
                light: 'bi-sun',
                dark: 'bi-moon-stars'
            };
            
            function setTheme(theme) {
                const normalizedTheme = normalizeTheme(theme);
                const themePreference = toThemePreference(normalizedTheme);

                document.documentElement.setAttribute('data-theme', normalizedTheme);
                safeSet('mutqin-theme', normalizedTheme);
                safeSet('mutqin-theme-preference', themePreference);
                document.cookie = `mutqin_theme=${themePreference};path=/;max-age=31536000;samesite=lax`;
                window.dispatchEvent(new CustomEvent('mutqin:theme-change', { detail: { theme: normalizedTheme } }));
                
                const button = document.getElementById('globalThemeToggle');
                if (button) {
                    const icon = button.querySelector('i');
                    icon.className = `bi ${themeIcons[normalizedTheme] || themeIcons.light}`;
                    button.setAttribute('aria-label', normalizedTheme === 'dark' ? @json(__('ui.switch_light')) : @json(__('ui.switch_dark')));
                }

                const logo = document.getElementById('appNavbarLogo');
                if (logo) {
                    const lightSrc = logo.getAttribute('data-logo-light') || '/images/logo.png';
                    const darkSrc = logo.getAttribute('data-logo-dark') || '/images/logo.png';
                    logo.src = normalizedTheme === 'dark' ? darkSrc : lightSrc;
                }

                const favicon = document.getElementById('appThemeFavicon');
                if (favicon) {
                    favicon.setAttribute('href', normalizedTheme === 'dark' ? '/favicon-dark.svg' : '/favicon-light.svg');
                }
            }
            
            function cycleTheme() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const currentIndex = themes.indexOf(current);
                const nextIndex = (currentIndex + 1) % themes.length;
                setTheme(themes[nextIndex]);
            }
            
            // Load saved theme
            const savedThemePreference = safeGet('mutqin-theme-preference');
            const savedTheme = safeGet('mutqin-theme');
            setTheme(savedTheme || savedThemePreference || window.mutqinInitialThemePreference || window.mutqinInitialTheme || 'light-mode');
            
            runWhenReady(function() {
                const themeButton = document.getElementById('globalThemeToggle');
                if (themeButton) {
                    themeButton.addEventListener('click', cycleTheme);
                }
            });
        })();

        // Custom dropdown functionality
        (function() {
            runWhenReady(function() {
                const dropdown = document.getElementById('userDropdown');
                const toggle = document.getElementById('dropdownToggle');
                const menu = document.getElementById('dropdownMenu');
                
                if (!dropdown || !toggle || !menu) return;
                
                function closeDropdown() {
                    menu.classList.remove('show');
                    toggle.setAttribute('aria-expanded', 'false');
                }
                
                function openDropdown() {
                    menu.classList.add('show');
                    toggle.setAttribute('aria-expanded', 'true');
                }
                
                function isDropdownOpen() {
                    return menu.classList.contains('show');
                }
                
                toggle.addEventListener('click', function(e) {
                    e.stopPropagation();
                    if (isDropdownOpen()) {
                        closeDropdown();
                    } else {
                        openDropdown();
                    }
                });
                
                document.addEventListener('click', function(e) {
                    if (!dropdown.contains(e.target)) {
                        closeDropdown();
                    }
                });
                
                document.addEventListener('keydown', function(e) {
                    if (e.key === 'Escape' && isDropdownOpen()) {
                        closeDropdown();
                    }
                });
                
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });
            });
        })();

        (function() {
            runWhenReady(function() {
                const panel = document.getElementById('primaryNavbar');
                if (!panel || !window.bootstrap) return;

                panel.querySelectorAll('a[href]').forEach((link) => {
                    link.addEventListener('click', function() {
                        if (!panel.classList.contains('show')) return;
                        window.bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
                    });
                });
            });
        })();
        
        // Global language switcher for all pages
        (function() {
            const supported = ['en', 'ar', 'fr', 'id', 'tr', 'es'];
            const labels = window.mutqinUiLabels || { en: {}, fr: {}, ar: {}, id: {}, tr: {}, es: {} };

            function safeGet(key) {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            }
            function safeSet(key, value) {
                try { localStorage.setItem(key, value); } catch (e) {}
            }

            function normalize(locale) {
                return supported.includes(locale) ? locale : 'en';
            }

            function toSnake(key) {
                return String(key).replace(/([A-Z])/g, '_$1').toLowerCase().replace(/^_/, '');
            }

            function getLabel(locale, key) {
                const pack = labels[locale] || {};
                return pack[key] || pack[toSnake(key)] || null;
            }

            function setDocumentLocale(locale) {
                const next = normalize(locale);
                const rtl = next === 'ar';
                document.documentElement.setAttribute('lang', next);
                document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                if (document.body) document.body.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                safeSet('mutqin.locale', next);
                document.cookie = `mutqin_locale=${next};path=/;max-age=31536000;samesite=lax`;
                document.querySelectorAll('.global-lang-switcher .lang-btn').forEach((btn) => {
                    btn.classList.toggle('active', btn.dataset.locale === next);
                });
                document.querySelectorAll('[data-i18n]').forEach((el) => {
                    const key = el.getAttribute('data-i18n');
                    const text = getLabel(next, key);
                    if (text) el.textContent = text;
                });
                window.dispatchEvent(new CustomEvent('mutqin:locale-change', { detail: { locale: next } }));
                return next;
            }

            async function applyLocale(locale) {
                const next = normalize(locale);
                if (window.mutqinSetLocale) {
                    await window.mutqinSetLocale(next);
                }
                setDocumentLocale(next);
            }

            function bindLangDropdowns() {
                if (!window.bootstrap?.Dropdown) return false;
                document.querySelectorAll('.global-lang-switcher').forEach((wrap) => {
                    const toggle = wrap.querySelector('.app-lang-toggle');
                    if (!toggle || toggle.dataset.langDropdownBound) return;
                    toggle.dataset.langDropdownBound = '1';
                    window.bootstrap.Dropdown.getOrCreateInstance(toggle);
                });
                return true;
            }

            function bindLangButtons() {
                document.querySelectorAll('.global-lang-switcher .lang-btn[data-locale]').forEach((btn) => {
                    if (btn.dataset.langBound) return;
                    btn.dataset.langBound = '1';
                    btn.addEventListener('click', async (event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        const locale = btn.dataset.locale;
                        if (!locale) return;
                        await applyLocale(locale);
                        const wrap = btn.closest('.global-lang-switcher');
                        const toggle = wrap?.querySelector('.app-lang-toggle');
                        if (toggle && window.bootstrap?.Dropdown) {
                            window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
                        }
                        const panel = document.getElementById('primaryNavbar');
                        if (panel?.classList.contains('show') && window.bootstrap?.Offcanvas) {
                            window.bootstrap.Offcanvas.getOrCreateInstance(panel).hide();
                        }
                    });
                });
            }

            function initLangSwitcher() {
                bindLangButtons();
                if (!bindLangDropdowns()) {
                    window.addEventListener('load', () => {
                        bindLangDropdowns();
                    }, { once: true });
                }
                const saved = window.mutqinForceInitialLocale
                    ? window.mutqinInitialLocale
                    : (safeGet('mutqin.locale') || window.mutqinInitialLocale || 'en');
                setDocumentLocale(saved);
                if (window.mutqinSetLocale && window.mutqinGetLocale?.() !== normalize(saved)) {
                    window.mutqinSetLocale(normalize(saved));
                }
            }

            runWhenReady(initLangSwitcher);
            window.addEventListener('mutqin:i18n-ready', () => {
                const current = window.mutqinGetLocale?.() || safeGet('mutqin.locale') || 'en';
                setDocumentLocale(current);
            });
        })();
    </script>
</body>
</html>
