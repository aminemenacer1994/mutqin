@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = $appThemePreference ?? (request()->cookie('mutqin_theme') ?: session('mutqin_theme', 'light-mode'));
    $appTheme = $appTheme ?? (str_starts_with((string) $appThemePreference, 'dark') ? 'dark' : (str_starts_with((string) $appThemePreference, 'sepia') ? 'sepia' : 'light'));
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="{{ $appTheme }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="#8b5e3c" media="(prefers-color-scheme: light)">
    <meta name="theme-color" content="#0f1115" media="(prefers-color-scheme: dark)">
    <title>@yield('title', __('ui.error_title')) · Mutqin</title>
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <style>
        .mutqin-error-page {
            min-height: 100dvh;
            display: grid;
            place-items: center;
            padding: clamp(1.25rem, 4vw, 2.5rem);
            background:
                radial-gradient(1200px 480px at 50% -10%, color-mix(in srgb, var(--accent, #8b5e3c) 16%, transparent), transparent 70%),
                var(--bg, #f7f3ec);
            color: var(--text, #1f1812);
        }
        .mutqin-error-card {
            width: min(100%, 28rem);
            display: grid;
            gap: 0.7rem;
            justify-items: center;
            text-align: center;
            padding: clamp(1.35rem, 3vw, 2rem);
            border-radius: 16px;
            border: 1px solid color-mix(in srgb, var(--border, #d6d0c6) 85%, transparent);
            background: color-mix(in srgb, var(--surface, #fff) 96%, transparent);
            box-shadow: var(--shadow-md, 0 10px 30px rgba(40, 28, 18, 0.08));
        }
        .mutqin-error-card__icon {
            width: 2.75rem;
            height: 2.75rem;
            display: inline-grid;
            place-items: center;
            border-radius: 999px;
            background: color-mix(in srgb, var(--danger, #c45c4a) 14%, transparent);
            color: var(--danger, #c45c4a);
            font-size: 1.25rem;
        }
        .mutqin-error-card__icon.is-offline {
            background: color-mix(in srgb, var(--warning, #c9973a) 16%, transparent);
            color: var(--warning, #c9973a);
        }
        .mutqin-error-card h1 {
            margin: 0;
            font-size: clamp(1.15rem, 2.4vw, 1.35rem);
            font-weight: 700;
            line-height: 1.35;
        }
        .mutqin-error-card p {
            margin: 0;
            color: var(--text-muted, #6b6560);
            font-size: 0.95rem;
            line-height: 1.5;
            max-width: 24rem;
        }
        .mutqin-error-card__actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.55rem;
            margin-top: 0.35rem;
        }
        .mutqin-error-card__actions a,
        .mutqin-error-card__actions button {
            appearance: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 2.4rem;
            padding: 0.45rem 1rem;
            border-radius: 999px;
            border: 1px solid transparent;
            font: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            text-decoration: none;
            cursor: pointer;
        }
        .mutqin-error-btn--primary {
            background: var(--accent, #8b5e3c);
            border-color: color-mix(in srgb, var(--accent, #8b5e3c) 70%, #000);
            color: #fff;
        }
        .mutqin-error-btn--secondary {
            background: transparent;
            border-color: color-mix(in srgb, var(--border, #d6d0c6) 90%, transparent);
            color: var(--text, #1f1812);
        }
        [data-theme="dark"] .mutqin-error-page {
            background:
                radial-gradient(1200px 480px at 50% -10%, color-mix(in srgb, var(--accent, #d4a574) 14%, transparent), transparent 70%),
                var(--bg, #12100e);
        }
        [data-theme="dark"] .mutqin-error-btn--secondary {
            color: var(--text, #f3eee7);
        }
    </style>
</head>
<body>
    <main class="mutqin-error-page" id="mainContent" tabindex="-1">
        @yield('content')
    </main>
    <script>
        (function () {
            if (typeof navigator !== 'undefined' && navigator.onLine === false) {
                window.addEventListener('online', function () {
                    window.location.reload();
                }, { once: true });
            }
        })();
    </script>
</body>
</html>
