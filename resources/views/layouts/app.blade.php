@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="light">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>{{ __('ui.app_title') }}</title>
    <link rel="icon" type="image/svg+xml" href="/favicon-light.svg" media="(prefers-color-scheme: light)">
    <link rel="icon" type="image/svg+xml" href="/favicon-dark.svg" media="(prefers-color-scheme: dark)">
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <!-- Google tag (gtag.js) -->
    <script async src="https://www.googletagmanager.com/gtag/js?id=G-W4K8J2T0SG"></script>
    <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());

    gtag('config', 'G-W4K8J2T0SG');
    </script>
    <style>
        /* Theme Variables */
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
            --field-bg: rgba(255, 255, 255, 0.9);
            --field-bg-strong: rgba(255, 255, 255, 0.97);
            --overlay: rgba(17, 13, 10, 0.34);
            --success-bg: rgba(24, 128, 86, 0.11);
            --success-text: #146c46;
            --danger-bg: rgba(178, 59, 59, 0.1);
            --danger-text: #913232;
            --warning-bg: rgba(196, 154, 108, 0.16);
            --warning-text: #8b653b;
            --shadow-sm: 0 4px 12px rgba(0, 0, 0, 0.04);
            --shadow-md: 0 8px 24px rgba(0, 0, 0, 0.06);
            --shadow-lg: 0 20px 40px -12px rgba(0, 0, 0, 0.1);

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
            --field-bg: rgba(34, 30, 27, 0.96);
            --field-bg-strong: rgba(39, 34, 30, 0.98);
            --overlay: rgba(4, 4, 4, 0.52);
            --success-bg: rgba(63, 154, 114, 0.18);
            --success-text: #b8f0d5;
            --danger-bg: rgba(175, 82, 82, 0.18);
            --danger-text: #ffd1ca;
            --warning-bg: rgba(196, 154, 108, 0.18);
            --warning-text: #ffd6a7;
            --shadow-sm: 0 10px 24px rgba(0, 0, 0, 0.24);
            --shadow-md: 0 16px 34px rgba(0, 0, 0, 0.32);
            --shadow-lg: 0 28px 62px rgba(0, 0, 0, 0.42);
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
            box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--accent-light) 78%, transparent);
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
            box-shadow: none;
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

        /* App Navbar */
        .app-navbar {
            background: var(--surface-strong);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 3px;
            position: sticky;
            top: 0;
            z-index: 1000;
            padding-top: env(safe-area-inset-top, 0px);
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
            display: grid;
            grid-template-columns: auto 1fr auto;
            align-items: center;
            column-gap: 24px;
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
            justify-content: center;
            align-items: center;
            flex-wrap: wrap;
        }

        .navbar-collapse {
            display: flex;
            align-items: center;
            justify-content: center;
            min-width: 0;
        }

        .navbar-nav-shell {
            flex: 1 1 auto;
            display: flex;
            justify-content: center;
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

        .app-navbar-actions {
            display: flex;
            align-items: center;
            gap: 20px;
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

        .lang-switcher {
            display: inline-flex;
            align-items: center;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            background: var(--surface);
        }

        .lang-btn {
            border: none;
            background: transparent;
            color: var(--text-muted);
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.04em;
            padding: 8px 10px;
            min-width: 42px;
            cursor: pointer;
            text-transform: uppercase;
        }

        .lang-btn.active {
            color: var(--text);
            background: var(--accent-light);
        }

        /* Dropdown Styles */
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
        }

        .app-user-toggle:hover {
            border-color: var(--accent);
            background: var(--accent-light);
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
            box-shadow: var(--shadow-lg);
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

        /* Mobile styles */
        @media (max-width: 992px) {
            .navbar-shell {
                padding: 12px var(--gutter-tight);
                min-height: auto;
                display: flex;
            }

            .app-navbar-logo {
                height: clamp(42px, 10vw, 52px);
            }

            .navbar-brand {
                margin-inline-end: 0;
                min-width: 0;
            }
            
            .navbar-collapse {
                position: fixed;
                top: calc(env(safe-area-inset-top, 0px) + 76px);
                inset-inline: 0;
                width: 100%;
                height: calc(100dvh - (env(safe-area-inset-top, 0px) + 76px));
                background: var(--surface-strong);
                transition: opacity 0.22s ease, visibility 0.22s ease, transform 0.22s ease;
                padding: 18px var(--gutter);
                z-index: 999;
                overflow-y: auto;
                overscroll-behavior: contain;
                -webkit-overflow-scrolling: touch;
                opacity: 0;
                visibility: hidden;
                transform: translateY(-8px);
                border-top: 1px solid var(--border);
            }
            
            .navbar-collapse.show {
                opacity: 1;
                visibility: visible;
                transform: translateY(0);
            }
            
            .nav-links-desktop {
                flex-direction: column;
                width: 100%;
                gap: 8px;
                align-items: stretch;
            }

            .navbar-nav-shell {
                width: 100%;
            }
            
            .nav-link {
                padding: 14px 20px;
                font-size: 16px;
                min-height: var(--tap);
                display: flex;
                align-items: center;
                overflow-wrap: anywhere;
            }
            
            .app-navbar-actions {
                margin-inline-start: 0;
                width: 100%;
                display: grid;
                grid-template-columns: 1fr;
                align-items: stretch;
                gap: 12px;
                padding-top: 8px;
            }

            .app-navbar-actions > *,
            .app-navbar-actions .dropdown,
            .app-theme-toggle,
            .lang-switcher,
            .app-user-toggle {
                width: 100%;
            }

            .app-theme-toggle,
            .app-user-toggle {
                justify-content: center;
            }

            .lang-switcher {
                display: grid;
                grid-template-columns: repeat(3, minmax(0, 1fr));
            }
            
            .dropdown-menu {
                position: static;
                box-shadow: none;
                background: transparent;
                padding-inline-start: 20px;
                margin-top: 8px;
                transform: none;
                border: none;
            }
            
            .dropdown-menu.show {
                opacity: 1;
                visibility: visible;
                transform: none;
            }
            
            .dropdown-item {
                padding: 12px 16px;
                min-height: var(--tap);
            }
        }

        @media (max-width: 768px) {
            .shell {
                padding: 0 var(--gutter-tight);
            }
            
            main.shell {
                padding-top: 24px;
                padding-bottom: 24px;
            }
        }

        @media (max-width: 640px) {
            .navbar-shell {
                padding: 10px 14px;
            }

            .app-user-toggle {
                padding: 10px 12px;
            }
            
            .app-user-avatar {
                width: 32px;
                height: 32px;
                font-size: 13px;
            }
            
            .shell {
                padding: 0 16px;
            }
            
            main.shell {
                padding-top: 20px;
                padding-bottom: 20px;
            }

            .navbar-toggler {
                width: 54px;
                height: 54px;
                padding: 0;
                border-radius: 8px;
            }

            .navbar-collapse {
                top: calc(env(safe-area-inset-top, 0px) + 74px);
                height: calc(100dvh - (env(safe-area-inset-top, 0px) + 74px));
                padding: 16px;
            }
        }

        @media (max-width: 360px) {
            .navbar-shell {
                padding-inline: 10px;
            }

            .app-navbar-logo {
                height: 38px;
            }

            .navbar-toggler {
                width: 48px;
                height: 48px;
            }

            .navbar-collapse {
                top: calc(env(safe-area-inset-top, 0px) + 64px);
                height: calc(100dvh - (env(safe-area-inset-top, 0px) + 64px));
                padding: 12px;
            }
        }

        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                scroll-behavior: auto !important;
                transition-duration: 0.01ms !important;
                animation-duration: 0.01ms !important;
                animation-iteration-count: 1 !important;
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
            min-height: calc(100dvh - var(--nav-h));
            display: flex;
            align-items: center;
            justify-content: center;
            padding: calc(var(--nav-h) + clamp(20px, 4vw, 42px)) var(--gutter) clamp(28px, 5vw, 56px);
            position: relative;
        }

        .auth-card {
            width: min(100%, 980px);
            display: grid;
            grid-template-columns: minmax(0, 0.9fr) minmax(340px, 1fr);
            gap: clamp(24px, 4vw, 48px);
            align-items: start;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
            box-shadow: none;
        }

        .auth-card-sm {
            max-width: 640px;
            grid-template-columns: 1fr;
        }

        .auth-copy {
            display: grid;
            gap: 16px;
            padding-top: 4px;
            align-content: start;
        }

        .auth-eyebrow {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            gap: 8px;
            padding: 8px 12px;
            border-radius: 999px;
            background: var(--accent-light);
            color: var(--accent-strong);
            font-size: 12px;
            font-weight: 800;
            letter-spacing: 0.02em;
            text-transform: uppercase;
        }

        .auth-note-list {
            display: grid;
            gap: 12px;
            margin: 6px 0 0;
        }

        .auth-note {
            display: flex;
            gap: 12px;
            align-items: flex-start;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
        }

        .auth-note i {
            color: var(--accent);
            font-size: 18px;
            margin-top: 1px;
        }

        .auth-note strong {
            display: block;
            margin-bottom: 2px;
            color: var(--text);
        }

        .auth-note span {
            color: var(--text-muted);
            font-size: 14px;
            line-height: 1.55;
        }

        .auth-title {
            margin: 0;
            overflow: visible;
            font-size: clamp(34px, 5vw, 58px);
            line-height: 1.05;
            letter-spacing: 0;
            color: var(--text);
        }

        .auth-subtitle {
            max-width: 42ch;
            margin: 0;
            color: var(--text-muted);
            font-size: clamp(15px, 1.4vw, 18px);
            line-height: 1.6;
        }

        .auth-form-wrap {
            min-width: 0;
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
        }

        .auth-form-wrap .form-label {
            color: var(--text);
            font-weight: 650;
        }

        .auth-form-wrap .form-control {
            min-height: 50px;
            border-radius: 16px;
            border-color: color-mix(in srgb, var(--border) 92%, transparent);
            background: var(--field-bg);
            color: var(--text);
            padding-inline: 15px;
        }

        .auth-google-btn,
        .auth-btn-primary {
            min-height: 50px;
            border-radius: 16px;
        }

        @media (max-width: 860px) {
            .auth-shell {
                align-items: flex-start;
            }

            .auth-card {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 520px) {
            .auth-shell {
                padding-inline: 14px;
            }

            .auth-card {
                padding: 14px;
            }

            .auth-form-wrap {
                padding: 12px;
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
            box-shadow: var(--shadow-lg);
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
            box-shadow: 0 18px 36px rgba(72, 54, 36, 0.08);
            backdrop-filter: blur(14px);
        }

        .profile-kicker {
            display: inline-flex;
            align-items: center;
            width: fit-content;
            padding: 8px 12px;
            border-radius: 999px;
            background: rgba(154, 103, 56, 0.1);
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
            background: rgba(154, 103, 56, 0.1);
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
            box-shadow: none;
        }

        .profile-pane {
            padding: 22px;
            border-radius: 28px;
            background: color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated));
            border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border));
            box-shadow: 0 22px 40px rgba(72, 54, 36, 0.07);
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
            box-shadow: 0 0 0 0.2rem rgba(154, 103, 56, 0.12);
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
            box-shadow: var(--shadow-sm);
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
            border: 1px solid rgba(154, 103, 56, 0.18);
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
            box-shadow: var(--shadow-md);
        }

        .billing-card-selected {
            border-color: var(--accent);
            box-shadow: 0 0 0 3px var(--accent-light), var(--shadow-md);
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
            color: #fff;
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

        @media (max-width: 900px) {
            .billing-confirmation {
                flex-direction: column;
                align-items: stretch;
            }

            .billing-confirmation-actions {
                min-width: 0;
                width: 100%;
            }

            .billing-hero,
            .billing-grid,
            .profile-grid,
            .profile-subscription-grid {
                grid-template-columns: 1fr;
            }

            .billing-card {
                min-height: auto;
            }

            .profile-hero-card {
                grid-template-columns: 1fr;
            }

            .profile-card-head-split,
            .profile-hero-actions,
            .profile-subscription-actions,
            .admin-page-head,
            .admin-message-head {
                flex-direction: column;
            }

            .profile-action-btn,
            .profile-submit-btn,
            .profile-hero-actions form,
            .profile-subscription-actions form {
                width: 100%;
            }
        }

        @media (max-width: 575.98px) {
            .billing-page {
                padding-block: 24px 42px;
            }

            .billing-hero {
                gap: 16px;
            }

            .billing-hero h1 {
                font-size: clamp(28px, 11vw, 38px);
                line-height: 1.08;
                overflow-wrap: anywhere;
            }

            .billing-status-panel,
            .billing-card,
            .billing-confirmation,
            .profile-pane {
                padding: 18px;
                border-radius: 20px;
            }

            .billing-actions {
                grid-template-columns: 1fr;
            }

            .billing-price {
                font-size: 30px;
            }

            .billing-primary-btn,
            .billing-secondary-btn,
            .billing-link-btn {
                min-height: 48px;
                white-space: normal;
                text-align: center;
            }

            .profile-page {
                padding-block: calc(var(--nav-h) + 14px) 40px;
            }

            .profile-hero-card {
                padding: 18px;
                border-radius: 22px;
            }

            .profile-hero-summary,
            .profile-subscription-item {
                padding: 14px;
                border-radius: 18px;
            }

            .profile-subscription-actions,
            .admin-filter-tabs,
            .admin-message-actions {
                display: grid;
                grid-template-columns: 1fr;
            }

            .auth-card {
                padding: 0;
            }
        }

        @media (max-width: 360px) {
            .billing-status-panel,
            .billing-card,
            .billing-confirmation {
                padding: 14px;
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
                    data-logo-dark="/images/logo.png"
                    alt="Mutqin"
                    class="app-navbar-logo"
                >
            </a>

            <button class="navbar-toggler" type="button" aria-controls="navbarSupportedContent" aria-expanded="false" aria-label="{{ __('ui.open_navigation') }}">
                <i class="bi bi-list"></i>
            </button>

            <div class="collapse navbar-collapse" id="navbarSupportedContent">
                <div class="navbar-nav-shell">
                    <div class="navbar-nav nav-links-desktop">
                        <a class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}" href="{{ route('home') }}">Home</a>
                        <a class="nav-link {{ request()->routeIs('memorisation') ? 'active' : '' }}" href="{{ route('memorisation') }}">Memorisation</a>
                    </div>
                </div>

                <div class="d-flex align-items-center gap-3 app-navbar-actions">
                    <!-- <div class="lang-switcher" id="globalLangSwitcher" role="group" aria-label="{{ __('ui.language_switcher') }}">
                        <button type="button" class="lang-btn" data-locale="en" aria-label="{{ __('ui.switch_language', ['language' => __('ui.english')]) }}">EN</button>
                        <button type="button" class="lang-btn" data-locale="ar" aria-label="{{ __('ui.switch_language', ['language' => __('ui.arabic')]) }}">AR</button>
                        <button type="button" class="lang-btn" data-locale="fr" aria-label="{{ __('ui.switch_language', ['language' => __('ui.french')]) }}">FR</button>
                    </div> -->
                    <button id="globalThemeToggle" class="btn app-theme-toggle" type="button" aria-label="{{ __('ui.switch_dark') }}">
                        <i class="bi bi-sun"></i>
                    </button>

                    @auth
                        <div class="dropdown" id="userDropdown">
                            <button class="btn app-user-toggle" type="button" id="dropdownToggle" aria-expanded="false" aria-haspopup="menu" aria-controls="dropdownMenu">
                                <span class="app-user-avatar" aria-hidden="true">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                                <span>{{ Auth::user()->name ?? __('ui.user') }}</span>
                                <i class="bi bi-chevron-down" aria-hidden="true"></i>
                            </button>
                            <ul class="dropdown-menu" id="dropdownMenu" role="menu">
                                <li>
                                    <a class="dropdown-item" href="{{ route('profile.show') }}">
                                        <i class="bi bi-person-circle"></i> Profile
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="{{ route('profile.show') }}#subscription">
                                        <i class="bi bi-credit-card-2-front"></i> Subscription
                                    </a>
                                </li>
                                <li>
                                    <a class="dropdown-item" href="{{ route('profile.show') }}#settings">
                                        <i class="bi bi-gear"></i> Settings
                                    </a>
                                </li>
                                @if (Auth::user()->isAdmin())
                                    <li>
                                        <a class="dropdown-item" href="{{ route('admin.contact-messages.index') }}">
                                            <i class="bi bi-inbox"></i> Contact Inbox
                                        </a>
                                    </li>
                                @endif
                                <li><hr class="dropdown-divider"></li>
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
                    @else
                        <div class="app-auth-links">
                            <a class="nav-link" href="{{ route('login') }}" data-i18n="login">{{ __('ui.login') }}</a>
                            <a class="nav-link" href="{{ route('register') }}" data-i18n="register">{{ __('ui.register') }}</a>
                        </div>
                    @endauth
                </div>
            </div>
        </div>
    </nav>

    <div id="app">
        <main id="mainContent" tabindex="-1">
            @yield('content')
        </main>
    </div>

    <script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js"></script>
    <script src="{{ mix('js/app.js') }}" defer></script>
    
    <script>
        window.mutqinInitialLocale = @json($appLocale);
        window.mutqinInitialDirection = @json($appDirection);
        window.mutqinForceInitialLocale = @json(request()->query('lang') ? true : false);

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
            const themes = ['light', 'dark'];
            const themeIcons = {
                light: 'bi-sun',
                dark: 'bi-moon-stars'
            };
            
            function setTheme(theme) {
                document.documentElement.setAttribute('data-theme', theme);
                safeSet('mutqin-theme', theme);
                window.dispatchEvent(new CustomEvent('mutqin:theme-change', { detail: { theme } }));
                
                const button = document.getElementById('globalThemeToggle');
                if (button) {
                    const icon = button.querySelector('i');
                    icon.className = `bi ${themeIcons[theme] || themeIcons.light}`;
                    button.setAttribute('aria-label', theme === 'dark' ? @json(__('ui.switch_light')) : @json(__('ui.switch_dark')));
                }

                const logo = document.getElementById('appNavbarLogo');
                if (logo) {
                    const lightSrc = logo.getAttribute('data-logo-light') || '/images/logo.png';
                    const darkSrc = logo.getAttribute('data-logo-dark') || '/images/logo.png';
                    logo.src = theme === 'dark' ? darkSrc : lightSrc;
                }
            }
            
            function cycleTheme() {
                const current = document.documentElement.getAttribute('data-theme') || 'light';
                const currentIndex = themes.indexOf(current);
                const nextIndex = (currentIndex + 1) % themes.length;
                setTheme(themes[nextIndex]);
            }
            
            // Load saved theme
            const savedTheme = safeGet('mutqin-theme');
            if (savedTheme && themes.includes(savedTheme)) {
                setTheme(savedTheme);
            } else {
                if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    setTheme('dark');
                } else {
                    setTheme('light');
                }
            }
            
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
        
        // Handle mobile menu toggle
        (function() {
            runWhenReady(function() {
                const toggler = document.querySelector('.navbar-toggler');
                const collapse = document.querySelector('.navbar-collapse');
                
                if (toggler && collapse) {
                    toggler.addEventListener('click', function() {
                        collapse.classList.toggle('show');
                        const expanded = collapse.classList.contains('show');
                        toggler.setAttribute('aria-expanded', expanded);
                        toggler.setAttribute('aria-label', expanded ? @json(__('ui.close_navigation')) : @json(__('ui.open_navigation')));
                    });
                    
                    const links = collapse.querySelectorAll('a');
                    links.forEach(link => {
                        link.addEventListener('click', function() {
                            collapse.classList.remove('show');
                            toggler.setAttribute('aria-expanded', 'false');
                            toggler.setAttribute('aria-label', @json(__('ui.open_navigation')));
                        });
                    });
                }
            });
        })();

        // Global language switcher for all pages
        (function() {
            const supported = ['en', 'ar', 'fr'];
            const labels = {
                en: {
                    login: 'Login',
                    register: 'Register',
                    logout: 'Logout',
                    authLoginKicker: 'Welcome back',
                    authLoginSubtitle: 'Simple sign in. Your memorisation setup stays ready.',
                    authRegisterKicker: 'Start here',
                    authRegisterSubtitle: 'A clean setup for memorisation, revision, and tracking.',
                    emailAddress: 'Email Address',
                    password: 'Password',
                    confirmPassword: 'Confirm Password',
                    rememberMe: 'Remember Me',
                    continueGoogle: 'Continue with Google',
                    forgotPassword: 'Forgot Your Password?',
                    name: 'Name',
                    resetKicker: 'Need a reset?',
                    resetTitle: 'Reset your password',
                    resetSubtitle: 'Enter your email and we will send a reset link.',
                    sendResetLink: 'Send Password Reset Link',
                    newPasswordKicker: 'Set a new one',
                    newPasswordTitle: 'Choose a new password',
                    newPasswordSubtitle: 'Keep it simple. You can get back to your session after this.',
                    resetPassword: 'Reset Password',
                    verifyKicker: 'One last step',
                    verifyTitle: 'Verify your email',
                    verifySubtitle: 'Open the link in your inbox to unlock full access.',
                    verifyMessage: 'Before proceeding, please check your email for a verification link.',
                    verifyNoEmail: 'If you did not receive the email',
                    verifyResend: 'click here to request another',
                    verifySpam: "Check your spam folder if you don't see it within 5 minutes"
                },
                ar: {
                    login: 'تسجيل الدخول',
                    register: 'إنشاء حساب',
                    logout: 'تسجيل الخروج',
                    authLoginKicker: 'مرحبا بعودتك',
                    authLoginSubtitle: 'تسجيل دخول بسيط. تبقى إعدادات الحفظ جاهزة.',
                    authRegisterKicker: 'ابدأ من هنا',
                    authRegisterSubtitle: 'إعداد واضح للحفظ والمراجعة والمتابعة.',
                    emailAddress: 'البريد الإلكتروني',
                    password: 'كلمة المرور',
                    confirmPassword: 'تأكيد كلمة المرور',
                    rememberMe: 'تذكرني',
                    continueGoogle: 'المتابعة باستخدام Google',
                    forgotPassword: 'هل نسيت كلمة المرور؟',
                    name: 'الاسم',
                    resetKicker: 'تحتاج إلى إعادة تعيين؟',
                    resetTitle: 'إعادة تعيين كلمة المرور',
                    resetSubtitle: 'أدخل بريدك الإلكتروني وسنرسل رابط إعادة التعيين.',
                    sendResetLink: 'إرسال رابط إعادة التعيين',
                    newPasswordKicker: 'عيّن كلمة مرور جديدة',
                    newPasswordTitle: 'اختر كلمة مرور جديدة',
                    newPasswordSubtitle: 'اجعلها بسيطة. يمكنك العودة إلى جلستك بعد ذلك.',
                    resetPassword: 'إعادة تعيين كلمة المرور',
                    verifyKicker: 'خطوة أخيرة',
                    verifyTitle: 'تحقق من بريدك الإلكتروني',
                    verifySubtitle: 'افتح الرابط في بريدك للوصول الكامل.',
                    verifyMessage: 'قبل المتابعة، يرجى التحقق من بريدك الإلكتروني للحصول على رابط التحقق.',
                    verifyNoEmail: 'إذا لم تستلم البريد الإلكتروني',
                    verifyResend: 'اضغط هنا لطلب رابط آخر',
                    verifySpam: 'تحقق من مجلد الرسائل غير المرغوب فيها إذا لم تجده خلال 5 دقائق'
                },
                fr: {
                    login: 'Connexion',
                    register: 'Inscription',
                    logout: 'Déconnexion',
                    authLoginKicker: 'Bon retour',
                    authLoginSubtitle: 'Connexion simple. Votre configuration de mémorisation reste prête.',
                    authRegisterKicker: 'Commencez ici',
                    authRegisterSubtitle: 'Une configuration claire pour la mémorisation, la révision et le suivi.',
                    emailAddress: 'Adresse e-mail',
                    password: 'Mot de passe',
                    confirmPassword: 'Confirmer le mot de passe',
                    rememberMe: 'Se souvenir de moi',
                    continueGoogle: 'Continuer avec Google',
                    forgotPassword: 'Mot de passe oublié ?',
                    name: 'Nom',
                    resetKicker: 'Besoin de réinitialiser ?',
                    resetTitle: 'Réinitialiser votre mot de passe',
                    resetSubtitle: 'Entrez votre e-mail et nous vous enverrons un lien de réinitialisation.',
                    sendResetLink: 'Envoyer le lien de réinitialisation',
                    newPasswordKicker: 'Définir un nouveau mot de passe',
                    newPasswordTitle: 'Choisissez un nouveau mot de passe',
                    newPasswordSubtitle: 'Restez simple. Vous pourrez revenir à votre session ensuite.',
                    resetPassword: 'Réinitialiser le mot de passe',
                    verifyKicker: 'Dernière étape',
                    verifyTitle: 'Vérifiez votre e-mail',
                    verifySubtitle: 'Ouvrez le lien dans votre boîte de réception pour débloquer l’accès complet.',
                    verifyMessage: 'Avant de continuer, veuillez vérifier votre e-mail pour le lien de vérification.',
                    verifyNoEmail: "Si vous n'avez pas reçu l'e-mail",
                    verifyResend: 'cliquez ici pour en demander un autre',
                    verifySpam: 'Vérifiez votre dossier spam si vous ne le voyez pas dans les 5 minutes'
                }
            };

            function safeGet(key) {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            }
            function safeSet(key, value) {
                try { localStorage.setItem(key, value); } catch (e) {}
            }

            function normalize(locale) {
                return supported.includes(locale) ? locale : 'en';
            }

            function setDocumentLocale(locale) {
                const next = normalize(locale);
                const rtl = next === 'ar';
                document.documentElement.setAttribute('lang', next);
                document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                if (document.body) document.body.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                safeSet('mutqin.locale', next);
                document.cookie = `mutqin_locale=${next};path=/;max-age=31536000;samesite=lax`;
                document.querySelectorAll('#globalLangSwitcher .lang-btn').forEach((btn) => {
                    btn.classList.toggle('active', btn.dataset.locale === next);
                });
                document.querySelectorAll('[data-i18n]').forEach((el) => {
                    const key = el.getAttribute('data-i18n');
                    if (labels[next] && labels[next][key]) el.textContent = labels[next][key];
                });
                window.dispatchEvent(new CustomEvent('mutqin:locale-change', { detail: { locale: next } }));
                return next;
            }

            async function applyLocale(locale) {
                const next = setDocumentLocale(locale);
                if (window.mutqinSetLocale) {
                    await window.mutqinSetLocale(next);
                }
            }

            runWhenReady(function() {
                const saved = window.mutqinForceInitialLocale ? window.mutqinInitialLocale : (safeGet('mutqin.locale') || window.mutqinInitialLocale || 'en');
                setDocumentLocale(saved);
                document.querySelectorAll('#globalLangSwitcher .lang-btn').forEach((btn) => {
                    btn.addEventListener('click', () => applyLocale(btn.dataset.locale));
                });
            });
        })();
    </script>
</body>
</html>
