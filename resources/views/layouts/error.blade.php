@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = $appThemePreference ?? (request()->cookie('mutqin_theme') ?: session('mutqin_theme', 'sepia-mode'));
    $appTheme = $appTheme ?? (str_starts_with((string) $appThemePreference, 'dark') ? 'dark' : (str_starts_with((string) $appThemePreference, 'light') ? 'light' : 'sepia'));
    $appThemeColor = $appTheme === 'dark' ? '#14110f' : '#8b5e3c';
    $appColorScheme = $appTheme === 'dark' ? 'dark' : 'light';
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="{{ $appTheme }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="theme-color" content="{{ $appThemeColor }}">
    <meta name="color-scheme" content="{{ $appColorScheme }}">
    <title>@yield('title', __('ui.error_title')) · Mutqin</title>
    @include('partials.google-analytics')
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <style>
        .mutqin-error-page {
            min-height: 100dvh;
            display: grid;
            place-items: center;
            padding: clamp(1.25rem, 4vw, 2.75rem);
            background:
                radial-gradient(920px 420px at 50% -8%, color-mix(in srgb, var(--accent, #8b5e3c) 12%, transparent), transparent 68%),
                var(--bg, #f6f3ee);
            color: var(--text, #1f1812);
            font-family: var(--font-ui, "Avenir Next", system-ui, sans-serif);
        }
        .mutqin-error-shell {
            width: min(100%, 26rem);
            display: grid;
            justify-items: center;
            gap: 1rem;
        }
        .mutqin-error-brand {
            margin: 0;
            color: color-mix(in srgb, var(--text, #1f1812) 58%, var(--accent, #8b5e3c));
            font-size: 0.78rem;
            font-weight: 700;
            letter-spacing: 0.16em;
            text-transform: uppercase;
        }
        .mutqin-error-card {
            width: 100%;
            display: flex;
            flex-direction: column;
            align-items: center;
            text-align: center;
            padding: 2.15rem 1.75rem 1.7rem;
            border-radius: 20px;
            border: 1px solid color-mix(in srgb, var(--border, #d6d0c6) 88%, transparent);
            background: var(--surface-strong, #fffaf3);
            box-shadow: var(--shadow-md, 0 18px 44px rgba(45, 32, 20, 0.12));
        }
        .mutqin-error-card__icon {
            width: 3.25rem;
            height: 3.25rem;
            display: inline-grid;
            place-items: center;
            border-radius: 999px;
            background: var(--danger-soft, rgba(181, 80, 65, 0.14));
            color: var(--danger, #b55041);
            font-size: 1.35rem;
            line-height: 1;
        }
        .mutqin-error-card__icon.is-offline {
            background: var(--warning-soft, rgba(154, 98, 7, 0.14));
            color: var(--warning, #9a6207);
        }
        .mutqin-error-card__icon.is-info {
            background: var(--accent-light, rgba(139, 94, 60, 0.12));
            color: var(--accent, #8b5e3c);
        }
        .mutqin-error-card__copy {
            display: grid;
            gap: 0.5rem;
            margin-top: 1.15rem;
            max-width: 21rem;
        }
        .mutqin-error-card h1 {
            margin: 0;
            font-size: clamp(1.2rem, 2.6vw, 1.35rem);
            font-weight: 700;
            letter-spacing: -0.02em;
            line-height: 1.3;
        }
        .mutqin-error-card p {
            margin: 0;
            color: var(--text-muted, #5c4a3a);
            font-size: 0.95rem;
            line-height: 1.55;
        }
        .mutqin-error-card__reference {
            display: inline-flex;
            justify-self: center;
            margin-top: 0.2rem;
            padding: 0.22rem 0.6rem;
            border-radius: 999px;
            background: color-mix(in srgb, var(--text, #1f1812) 6%, transparent);
            color: var(--text-muted, #5c4a3a);
            font-size: 0.74rem;
            font-variant-numeric: tabular-nums;
            letter-spacing: 0.01em;
        }
        .mutqin-error-card__actions {
            display: flex;
            flex-wrap: wrap;
            justify-content: center;
            gap: 0.65rem;
            width: 100%;
            margin-top: 1.65rem;
        }
        .mutqin-error-card__actions a,
        .mutqin-error-card__actions button {
            appearance: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            flex: 1 1 8.5rem;
            min-height: 2.7rem;
            min-width: 8.5rem;
            padding: 0.55rem 1.15rem;
            border-radius: 999px;
            border: 1px solid transparent;
            font: inherit;
            font-size: 0.9rem;
            font-weight: 600;
            line-height: 1;
            text-decoration: none;
            cursor: pointer;
            transition:
                background 160ms ease,
                border-color 160ms ease,
                color 160ms ease,
                filter 160ms ease;
        }
        .mutqin-error-btn--primary {
            background: var(--accent, #8b5e3c);
            border-color: color-mix(in srgb, var(--accent, #8b5e3c) 72%, #000);
            color: #fff;
        }
        .mutqin-error-btn--primary:hover,
        .mutqin-error-btn--primary:focus-visible {
            filter: brightness(1.06);
        }
        .mutqin-error-btn--secondary {
            background: #fff;
            border-color: color-mix(in srgb, var(--text, #1f1812) 32%, transparent);
            color: var(--text, #1f1812);
        }
        .mutqin-error-btn--secondary:hover,
        .mutqin-error-btn--secondary:focus-visible {
            border-color: color-mix(in srgb, var(--accent, #8b5e3c) 55%, var(--border, #d6d0c6));
            color: var(--accent, #8b5e3c);
        }
        .mutqin-error-card__actions a:focus-visible,
        .mutqin-error-card__actions button:focus-visible {
            outline: none;
            box-shadow: var(--ring, 0 0 0 3px color-mix(in srgb, var(--accent, #8b5e3c) 48%, transparent));
        }
        @media (max-width: 480px) {
            .mutqin-error-card__actions {
                flex-direction: column;
            }
            .mutqin-error-card__actions a,
            .mutqin-error-card__actions button {
                width: 100%;
                min-width: 0;
            }
        }
        [data-theme="dark"] .mutqin-error-page {
            background:
                radial-gradient(920px 420px at 50% -8%, color-mix(in srgb, var(--accent, #d4a574) 12%, transparent), transparent 68%),
                var(--bg, #14110f);
        }
        [data-theme="dark"] .mutqin-error-brand {
            color: color-mix(in srgb, var(--text, #f3eee7) 72%, var(--accent, #d4a574));
        }
        [data-theme="dark"] .mutqin-error-btn--secondary {
            background: color-mix(in srgb, var(--surface, #121212) 92%, #fff);
            border-color: color-mix(in srgb, var(--text, #f3eee7) 34%, transparent);
            color: var(--text, #f3eee7);
        }
        @media (prefers-reduced-motion: reduce) {
            .mutqin-error-card__actions a,
            .mutqin-error-card__actions button {
                transition: none;
            }
        }
    </style>
</head>
<body>
    <main class="mutqin-error-page" id="mainContent" tabindex="-1">
        <div class="mutqin-error-shell">
            <p class="mutqin-error-brand">{{ __('ui.mutqin_brand') }}</p>
            @yield('content')
        </div>
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
