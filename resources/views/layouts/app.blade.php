@php
    $appLocale = $appLocale ?? app()->getLocale();
    $appDirection = $appDirection ?? ($appLocale === 'ar' ? 'rtl' : 'ltr');
    $appThemePreference = $appThemePreference ?? session('mutqin_theme', \App\Support\Theme::DEFAULT_PREFERENCE);
    $appTheme = $appTheme ?? \App\Support\Theme::toDataTheme($appThemePreference);
    $appThemeChrome = \App\Support\Theme::chrome($appTheme);
    $appThemeColor = $appThemeChrome['theme_color'];
    $appColorScheme = $appThemeChrome['color_scheme'];
    $appThemeModes = \App\Support\Theme::modes();
    $activeThemeMode = \App\Support\Theme::mode($appTheme);
    $switcherLocales = ['en', 'fr', 'es'];
    $languageEndonyms = [
        'en' => 'English',
        'fr' => 'Français',
        'ar' => 'العربية',
        'id' => 'Bahasa Indonesia',
        'tr' => 'Türkçe',
        'es' => 'Español',
        'ur' => 'اردو',
    ];
    $appLocaleOptions = [
        'en' => ['flag' => '🇬🇧', 'label' => $languageEndonyms['en']],
        'fr' => ['flag' => '🇫🇷', 'label' => $languageEndonyms['fr']],
        'es' => ['flag' => '🇪🇸', 'label' => $languageEndonyms['es']],
    ];
    $supportedDocumentLocales = ['en', 'ar', 'fr', 'id', 'tr', 'es', 'ur'];
    $activeLocaleOption = $appLocaleOptions[$appLocale] ?? ['flag' => '🇬🇧', 'label' => $languageEndonyms[$appLocale] ?? $appLocale];
@endphp
<!doctype html>
<html lang="{{ $appLocale }}" dir="{{ $appDirection }}" data-theme="{{ $appTheme }}">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <meta name="theme-color" content="{{ $appThemeColor }}">
    <meta name="color-scheme" content="{{ $appColorScheme }}">
    <meta name="mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-capable" content="yes">
    <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
    <script>
      (function () {
        // Restore from SSR (accounts) or guest device cache before first paint.
        var modes = @json(\App\Support\Theme::clientCatalog());
        var defaultTheme = @json(\App\Support\Theme::DEFAULT);
        var isAuth = @json(\Illuminate\Support\Facades\Auth::check());
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
        var theme = document.documentElement.getAttribute('data-theme') || '';
        if (!isAuth) {
          try {
            theme = localStorage.getItem('mutqin-theme.guest')
              || localStorage.getItem('mutqin-theme')
              || theme;
          } catch (e) {}
        }
        if (!theme) theme = defaultTheme;
        theme = normalize(theme);
        document.documentElement.setAttribute('data-theme', theme);
        var chrome = byId[theme] || byId[defaultTheme];
        var meta = document.querySelector('meta[name="theme-color"]');
        if (meta && chrome) {
          meta.setAttribute('content', chrome.themeColor);
          meta.removeAttribute('media');
        }
        var scheme = document.querySelector('meta[name="color-scheme"]');
        if (scheme && chrome) scheme.setAttribute('content', chrome.colorScheme);
        if (chrome) document.documentElement.style.colorScheme = chrome.colorScheme;
      })();
    </script>
    <meta name="apple-mobile-web-app-title" content="Mutqin">
    <meta name="application-name" content="Mutqin">
    <meta name="description" content="Quran memorisation and recitation workspace for focused hifz practice.">
    <title>{{ __('ui.app_title') }}</title>
    @include('partials.google-analytics')
    <link rel="manifest" href="/manifest.webmanifest">
    <link rel="apple-touch-icon" sizes="180x180" href="/icons/apple-touch-icon.png?v=20260730c">
    <link id="appThemeFavicon" rel="icon" type="image/png" sizes="512x512" href="/favicon-512.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="192x192" href="/favicon-192.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png?v=20260730c">
    <link rel="icon" type="image/png" sizes="192x192" href="/icons/icon-192.png?v=20260730c">
    <link id="appThemeFaviconIco" rel="shortcut icon" href="/favicon.ico?v=20260730c">
    <link rel="icon" href="/favicon.ico?v=20260730c" sizes="any">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&family=Amiri+Quran&family=Noto+Naskh+Arabic:wght@400;600;700&family=Scheherazade+New:wght@400;700&family=Lateef:wght@400;500&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    @if(request()->boolean('mutqin_embed'))
    <style id="mutqin-embed-shell">
      .app-navbar,
      .navbar.app-navbar,
      footer.site-footer,
      .app-footer {
        display: none !important;
      }
      body {
        padding-top: 0 !important;
      }
    </style>
    @endif
    <meta name="mutqin-build" content="v129">
    <meta name="mutqin-asset-build" content="{{ config('error_tracking.asset_build', 'v165') }}">
    <meta name="mutqin-release" content="{{ \App\Support\ErrorReporting::release() }}">
    <meta name="mutqin-environment" content="{{ app()->environment() }}">
    <script>
      document.documentElement.dataset.mutqinAssetBuild = @json(config('error_tracking.asset_build', 'v165'));
    </script>
    <style id="mutqin-ai-recite-force-v125">
      #mutqin-build-stamp {
        display: none !important;
      }
      .ai-recite-clean,
      .ai-recite-clean-overlay,
      .recordings-library-overlay,
      .self-check-library-shortcut-btn:not(.self-check-back-to-session-btn),
      .self-check-ayah-action-manual,
      .self-check-modal-overlay .recitation-check-error,
      .self-check-modal-overlay .recitation-check-error-card {
        display: none !important;
      }
      .self-check-modal-overlay .ai-check-step-guide {
        display: none !important;
      }
      .self-check-modal-overlay .self-check-modal-ayah-shell {
        display: block !important;
        min-height: 7.5rem !important;
        padding: 1.1rem 1.15rem !important;
        border-radius: 16px !important;
        background: #ffffff !important;
        border: 1px solid rgba(120, 80, 40, 0.12) !important;
      }
      .self-check-modal-overlay .self-check-modal-ayah,
      .self-check-modal-overlay .self-check-modal-ayah .session-evaluation-ayah {
        direction: rtl !important;
        text-align: right !important;
        color: #2c1d12 !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      .self-check-modal-overlay .recitation-live-review-compact .recitation-word-stream,
      .self-check-modal-overlay .recitation-live-review-compact .recitation-live-word-stream,
      .self-check-modal-overlay .recitation-live-review-compact .recitation-word-chip {
        display: flex !important;
        flex-wrap: wrap !important;
        visibility: visible !important;
      }
    </style>
    <script>
      (function () {
        // When MUTQIN_ASSET_BUILD changes, drop SW/Cache Storage so the next
        // navigation uses fresh HTML + Mix ?id= URLs. Do NOT force a navigation
        // reload here — that caused refresh loops with stale HTML. ChunkLoadError
        // recovery (resources/js/utils/chunkLoadRecovery.js) handles mid-session
        // stale chunks with at most one controlled reload.
        var BUILD = @json(config('error_tracking.asset_build', 'v165'));
        var STORE = 'mutqin.asset.build';
        try {
          if (localStorage.getItem(STORE) === BUILD) {
            // Strip leftover force params from older recovery scripts.
            var clean = new URL(window.location.href);
            if (clean.searchParams.has('mutqin_force') || clean.searchParams.has('_')) {
              clean.searchParams.delete('mutqin_force');
              clean.searchParams.delete('_');
              window.history.replaceState({}, '', clean.pathname + clean.search + clean.hash);
            }
            return;
          }
          Object.keys(localStorage).forEach(function (k) {
            if (k.indexOf('mutqin.asset') === 0) localStorage.removeItem(k);
          });
        } catch (e) {}

        var tasks = [];
        if ('serviceWorker' in navigator) {
          tasks.push(navigator.serviceWorker.getRegistrations().then(function (regs) {
            return Promise.all(regs.map(function (r) { return r.unregister(); }));
          }).catch(function () {}));
        }
        if ('caches' in window) {
          tasks.push(caches.keys().then(function (keys) {
            return Promise.all(keys.filter(function (k) {
              return k.indexOf('mutqin-') === 0;
            }).map(function (k) { return caches.delete(k); }));
          }).catch(function () {}));
        }

        var finish = function () {
          try { localStorage.setItem(STORE, BUILD); } catch (e) {}
        };
        var watchdog = window.setTimeout(finish, 2500);
        Promise.all(tasks).then(function () {
          window.clearTimeout(watchdog);
          finish();
        }).catch(function () {
          window.clearTimeout(watchdog);
          finish();
        });
      })();
    </script>
    @if(request()->routeIs('memorisation', 'memorisation.demo'))
    {{-- Survives stale memorisation JS chunks: HTML is network-first / not JS-chunk-cached.
         Canonical source for button semantics is resources/sass/app.scss (.btn-primary, etc.). --}}
    <style id="mutqin-button-colour-semantics">
      :root {
        --bs-danger: #dc2626;
        --bs-danger-rgb: 220, 38, 38;
        --success: #2e7d64;
        --success-strong: #23624e;
        --danger: #dc2626;
        --danger-strong: #b91c1c;
        --destructive: var(--danger);
        --destructive-strong: var(--danger-strong);
      }
      [data-theme="dark"] {
        --bs-danger: #ef4444;
        --bs-danger-rgb: 239, 68, 68;
        --success: #3f8f6f;
        --success-strong: #2f6f58;
        --danger: #ef4444;
        --danger-strong: #dc2626;
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
      .app .saved-session-row-btn-primary {
        color: #fff !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
        border-color: color-mix(in srgb, var(--accent) 48%, transparent) !important;
      }
      /* Session Complete uses site bronze accent (same as onboarding / workspace) */
      .app .post-session-simple__btn--primary,
      .app .post-session-simple.post-session-simple--premium .post-session-simple__btn--primary {
        color: #fff !important;
        background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
        border-color: color-mix(in srgb, var(--accent) 48%, transparent) !important;
        box-shadow: 0 8px 18px color-mix(in srgb, var(--accent) 22%, transparent) !important;
      }
      .app .post-session-simple__btn--primary:hover:not(:disabled),
      .app .post-session-simple.post-session-simple--premium .post-session-simple__btn--primary:hover:not(:disabled) {
        filter: brightness(1.04) !important;
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
      .app .mutqin-modal-btn--secondary {
        color: var(--text) !important;
        background: color-mix(in srgb, var(--surface) 96%, transparent) !important;
        border-color: color-mix(in srgb, var(--border) 82%, transparent) !important;
      }
      .app .post-session-simple__btn--secondary,
      .app .post-session-simple__btn--ghost {
        color: var(--text) !important;
        background: color-mix(in srgb, var(--surface) 96%, transparent) !important;
        border: 1px solid color-mix(in srgb, var(--border) 82%, transparent) !important;
        box-shadow: none !important;
      }
      .app .mutqin-modal-btn--success,
      .app .post-session-simple__btn--success {
        color: #fff !important;
        background: linear-gradient(135deg, var(--success), var(--success-strong)) !important;
        border-color: color-mix(in srgb, var(--success) 52%, transparent) !important;
      }
      .app .mutqin-modal-btn--danger,
      .app .mutqin-modal-btn--destructive,
      .app .session-exit-action-chip--end {
        color: #fff !important;
        background: var(--bs-danger, #dc2626) !important;
        border-color: var(--bs-danger, #dc2626) !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom),
      .app .action-btn.mutqin-btn--destructive,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) {
        color: #7a3b2e !important;
        -webkit-text-fill-color: #7a3b2e !important;
        background: #f4ebe7 !important;
        border: 1px solid #d7b2a7 !important;
        box-shadow: none !important;
        font-weight: 400 !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom):hover,
      .app .action-btn.mutqin-btn--destructive:hover,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        background: #9a4f3d !important;
        border-color: #8a4535 !important;
        box-shadow: none !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom) span,
      .app .action-btn-exit:not(.post-session-choice-custom) i,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) span,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) i {
        color: inherit !important;
        -webkit-text-fill-color: inherit !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom):hover span,
      .app .action-btn-exit:not(.post-session-choice-custom):hover i,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover span,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover i {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
      }
      [data-theme="dark"] .app .action-btn-exit:not(.post-session-choice-custom),
      [data-theme="dark"] .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) {
        color: #f0d2c8 !important;
        -webkit-text-fill-color: #f0d2c8 !important;
        background: rgba(154, 79, 61, 0.22) !important;
        border-color: rgba(240, 210, 200, 0.28) !important;
      }
      [data-theme="dark"] .app .action-btn-exit:not(.post-session-choice-custom):hover,
      [data-theme="dark"] .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        background: #9a4f3d !important;
        border-color: #b56a56 !important;
      }
    </style>
    <style id="mutqin-memorisation-hotfix-v131">
      .amd-mic-dot { display: none !important; }
    </style>
    <style id="mutqin-memorisation-hotfix-v118">
      /* v118 — WBW interlinear: per-column horizontal padding + compact vertical stack */
      html body .app .verse-arabic.word-by-word-meanings word,
      html body .app .verse-arabic.word-by-word-meanings .wbw-word,
      html body .app .mushaf-ayah-text.word-by-word-meanings word,
      html body .app .mushaf-ayah-text.word-by-word-meanings .wbw-word {
        gap: 0.1em !important;
        margin: 0 0.1em 0.55em !important;
        padding: 0 0.42em !important;
        line-height: 1.1 !important;
      }
      html body .app .verse-arabic.word-by-word-meanings .word-arabic-text,
      html body .app .verse-arabic.tajweed-enabled.word-by-word-meanings .word-arabic-text,
      html body .app .mushaf-ayah-text.word-by-word-meanings .word-arabic-text {
        padding: 0 0.04em 0.06em !important;
        margin: 0 !important;
        line-height: 1.22 !important;
      }
      html body .app .verse-arabic.word-by-word-meanings .word-meaning,
      html body .app .mushaf-ayah-text.word-by-word-meanings .word-meaning {
        margin: 0.08em auto 0 !important;
        padding: 0 0.06em !important;
        line-height: 1.28 !important;
      }
      html body .app.is-rtl .workspace-layout-toggle .view-mode-btn {
        min-width: max-content !important;
        flex: 1 1 auto !important;
        padding-inline: 0.95rem !important;
      }
      html body .app.is-rtl .workspace-layout-toggle .view-mode-btn span {
        overflow: visible !important;
        text-overflow: clip !important;
      }
    </style>
    <style id="mutqin-memorisation-hotfix-v115">
      /* Network-first hotfix v113 — themed toolbar chrome + cream Mushaf paper + hide U+06DF circles + ayah markers */
      /* Blank font wins only for ornament codepoints (unicode-range); body text uses --quran-font. */
      @font-face {
        font-family: 'MutqinHideQuranCircles';
        src: url('{{ asset('fonts/MutqinHideQuranCircles.ttf') }}') format('truetype');
        unicode-range: U+06DD, U+06DE, U+06DF, U+06E0, U+06E3, U+06E9, U+25CC;
        font-display: block;
      }
      html body .app .verse-arabic,
      html body .app .verse-arabic .wbw-word,
      html body .app .verse-arabic word,
      html body .app .verse-arabic .word-arabic-text,
      html body .app .verse-arabic .tajweed-mark,
      html body .app .verse-arabic [class*="tajweed-"],
      html body .app .mushaf-ayah-text,
      html body .app .amd-mushaf-stream,
      html body .app .self-check-modal-ayah,
      html body .app .memorisation-checker-ayah,
      html body .app .session-evaluation-ayah,
      html body .app .recitation-review-ayah {
        font-family: 'MutqinHideQuranCircles', var(--quran-font, 'UthmanicHafs', 'Amiri Quran', 'Amiri', 'Noto Naskh Arabic', serif) !important;
      }
      /* WBW + tajweed: keep each Arabic chip on one horizontal line */
      html body .app .verse-arabic.word-by-word-meanings .word-arabic-text,
      html body .app .verse-arabic.tajweed-enabled.word-by-word-meanings .word-arabic-text {
        display: block !important;
        white-space: nowrap !important;
      }
      html body .app .verse-arabic.word-by-word-meanings .word-arabic-text [class*="tajweed"],
      html body .app .verse-arabic.word-by-word-meanings .word-arabic-text .tajweed-mark {
        display: inline !important;
        white-space: nowrap !important;
        unicode-bidi: normal !important;
      }
      #mutqin-ui-build-pill { display: none !important; }
      html body .app .main:not(.mushaf-mode-active) .verses-grid .verse-arabic .verse-ayah-end-number,
      html body .app .main:not(.mushaf-mode-active) .verses-grid .verse-arabic-with-end .verse-ayah-end-number,
      html body .app .main:not(.mushaf-mode-active) .verse-arabic .verse-ayah-end-number,
      html body .app .verses-grid .verse-arabic .verse-ayah-end-number,
      html body .app .verses-grid .verse-arabic-with-end .verse-ayah-end-number,
      html body .app .amd-mushaf-stream .verse-ayah-end-number,
      html body .app .amd-mushaf-ayah--premium .verse-ayah-end-number {
        display: inline-block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 1.45em !important;
        height: 1.55em !important;
        max-width: none !important;
        max-height: none !important;
        margin-inline: 0.14em 0.08em !important;
        padding: 0 !important;
        border: 0 !important;
        overflow: hidden !important;
        pointer-events: none !important;
        font-size: 1em !important;
        line-height: 0 !important;
        vertical-align: -0.42em !important;
        background: transparent !important;
        background-image: none !important;
        box-shadow: none !important;
        filter: none !important;
        text-shadow: none !important;
        transform: translateY(0.12em) !important;
      }
      /* Only one theme image — never stack light+dark (dark was the ghost shadow).
         Include `.amd-overlay` — recitation modal is teleported outside `.app`. */
      html body .app .verse-ayah-end-number__img--light,
      html body .amd-overlay .verse-ayah-end-number__img--light {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        object-position: center center !important;
        position: absolute !important;
        inset: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        filter: none !important;
        box-shadow: none !important;
      }
      html body .app .verse-ayah-end-number__img--dark,
      html body .app .verse-ayah-end-number__digit,
      html body .amd-overlay .verse-ayah-end-number__img--dark,
      html body .amd-overlay .verse-ayah-end-number__digit {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
      }
      html[data-theme="dark"] body .app .verse-ayah-end-number__img--light,
      html[data-theme="dark"] body .amd-overlay .verse-ayah-end-number__img--light,
      html body .amd-overlay[data-theme="dark"] .verse-ayah-end-number__img--light {
        display: none !important;
        visibility: hidden !important;
        opacity: 0 !important;
        width: 0 !important;
        height: 0 !important;
      }
      html[data-theme="dark"] body .app .verse-ayah-end-number__img--dark,
      html[data-theme="dark"] body .amd-overlay .verse-ayah-end-number__img--dark,
      html body .amd-overlay[data-theme="dark"] .verse-ayah-end-number__img--dark {
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        width: 100% !important;
        height: 100% !important;
        object-fit: contain !important;
        object-position: center center !important;
        position: absolute !important;
        inset: 0 !important;
        margin: 0 !important;
        padding: 0 !important;
        border: 0 !important;
        filter: none !important;
        box-shadow: none !important;
      }
      /* Mushaf unicode/fallback end marks — LTR + slight downward nudge */
      html body .app .main.mushaf-mode-active .madani-word--end.madani-word--unicode,
      html body .app .main.mushaf-mode-active .madani-word--end.madani-word--fallback {
        display: inline !important;
        visibility: visible !important;
        opacity: 1 !important;
        direction: ltr !important;
        unicode-bidi: isolate;
        font-family: "Amiri Quran", "Amiri", "Scheherazade New", "Noto Naskh Arabic", serif !important;
        vertical-align: -0.22em !important;
        text-shadow: none !important;
        filter: none !important;
        box-shadow: none !important;
      }
      .amd-overlay {
        z-index: 20000 !important;
        pointer-events: auto !important;
      }
      .amd-overlay .mutqin-modal-dialog,
      .amd-overlay .amd-modal,
      .amd-overlay button {
        pointer-events: auto !important;
      }
      .app .verse-font-size-control,
      .app .verse-font-size-control--mobile,
      .app .verses-grid .verse-font-size-control {
        display: none !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom),
      .app .action-btn.mutqin-btn--destructive,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) {
        color: #7a3b2e !important;
        -webkit-text-fill-color: #7a3b2e !important;
        background: #f4ebe7 !important;
        border: 1px solid #d7b2a7 !important;
        box-shadow: none !important;
        font-weight: 400 !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom):hover,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
        background: #9a4f3d !important;
        border-color: #8a4535 !important;
        box-shadow: none !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom) span,
      .app .action-btn-exit:not(.post-session-choice-custom) i,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) span,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom) i {
        color: inherit !important;
        -webkit-text-fill-color: inherit !important;
      }
      .app .action-btn-exit:not(.post-session-choice-custom):hover span,
      .app .action-btn-exit:not(.post-session-choice-custom):hover i,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover span,
      .app .workspace-shell-actions .action-btn-exit:not(.post-session-choice-custom):hover i {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
      }

      /* Post-session: dashboard icon always visible */
      .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-wrap,
      .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-trigger {
        display: inline-flex !important;
        visibility: visible !important;
        opacity: 1 !important;
        pointer-events: auto !important;
      }
      /* Post-session choice — desktop ONLY: content-sized pills (like Start/End). */
      @media (min-width: 768px) {
        .app .workspace-shell--post-session-choice .workspace-shell-head {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 0.55rem !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          overflow: visible !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-copy {
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-actions,
        .app .workspace-shell--post-session-choice .workspace-shell-actions .action-buttons-group {
          display: flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 0.4rem !important;
          width: auto !important;
          max-width: none !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          overflow: visible !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls {
          display: inline-flex !important;
          flex: 0 0 auto !important;
          margin: 0 !important;
          width: auto !important;
          min-width: 0 !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair,
        .app .workspace-shell--post-session-choice .post-session-choice-pair.has-paired-actions {
          display: inline-flex !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 0.4rem !important;
          width: auto !important;
          max-width: none !important;
          min-width: 0 !important;
          flex: 0 0 auto !important;
          overflow: visible !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger,
        .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn,
        .app .workspace-shell-actions .post-session-choice-pair > .session-primary-action,
        .app .workspace-shell-actions .post-session-choice-pair > .action-btn-exit,
        .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.35rem !important;
          width: auto !important;
          min-width: max-content !important;
          max-width: none !important;
          flex: 0 0 auto !important;
          height: 38px !important;
          min-height: 38px !important;
          max-height: 38px !important;
          padding: 0 0.9rem !important;
          border-radius: 11px !important;
          white-space: nowrap !important;
          overflow: visible !important;
          box-sizing: border-box !important;
          font-size: 0.8rem !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger span,
        .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn span {
          display: inline !important;
          overflow: visible !important;
          text-overflow: clip !important;
          white-space: nowrap !important;
          color: inherit !important;
        }
      }
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn-exit.post-session-choice-custom {
        color: #2b241c !important;
        -webkit-text-fill-color: #2b241c !important;
        background: #ffffff !important;
        border: 1px solid rgba(31, 24, 18, 0.16) !important;
        box-shadow: none !important;
      }
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn-exit.post-session-choice-custom:hover {
        color: #2b241c !important;
        -webkit-text-fill-color: #2b241c !important;
        background: #f7f3ec !important;
        border-color: rgba(31, 24, 18, 0.22) !important;
      }
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom i,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom span,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover i,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover span {
        color: #2b241c !important;
        -webkit-text-fill-color: #2b241c !important;
      }
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover span,
      .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover i {
        color: #fff !important;
        -webkit-text-fill-color: #fff !important;
      }
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover span,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .session-primary-action:hover i {
        color: #1a120c !important;
        -webkit-text-fill-color: #1a120c !important;
      }
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover {
        color: #f6efe6 !important;
        -webkit-text-fill-color: #f6efe6 !important;
        background: rgba(255, 255, 255, 0.08) !important;
        border-color: rgba(246, 239, 230, 0.22) !important;
      }
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom i,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom span,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover i,
      [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom:hover span {
        color: #f6efe6 !important;
        -webkit-text-fill-color: #f6efe6 !important;
      }
      @media (max-width: 767.98px) {
        .app .workspace-shell--post-session-choice .workspace-shell-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          grid-template-rows: auto auto auto !important;
          gap: 0.45rem !important;
          overflow: visible !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-copy {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-width: 0 !important;
        }
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions,
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions .action-buttons-group {
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: stretch !important;
          grid-column: 1 / -1 !important;
          grid-row: 3 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
          box-sizing: border-box !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls {
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          grid-column: 2 !important;
          grid-row: 1 !important;
          justify-self: end !important;
          align-self: start !important;
          width: auto !important;
          min-width: 0 !important;
          height: auto !important;
          overflow: visible !important;
          pointer-events: auto !important;
          z-index: 90 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-font-wrap {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-controls-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-layout-icons,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-font-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-menu-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-ellipsis,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-trigger,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .view-mode-btn {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-wrap {
          order: 0 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-layout-icons {
          order: 1 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-font-wrap {
          order: 2 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-menu-wrap {
          order: 3 !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair.has-paired-actions,
        html body .app .workspace-shell-actions .top-card-session-actions.post-session-choice-pair,
        html body .app .workspace-shell-actions .top-card-session-actions.has-paired-actions.post-session-choice-pair {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: 1 1 100% !important;
          gap: 0.35rem !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair:not(.has-paired-actions) {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn,
        html body .app .workspace-shell-actions .post-session-choice-pair > .session-primary-action,
        html body .app .workspace-shell-actions .post-session-choice-pair > .action-btn-exit,
        html body .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom,
        html body .app .workspace-shell-actions .post-session-choice-pair .top-card-action-trigger {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: none !important;
          height: 36px !important;
          min-height: 36px !important;
          max-height: 36px !important;
          padding: 0 0.4rem !important;
          font-size: 0.7rem !important;
          overflow: hidden !important;
          justify-content: center !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger span,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn span {
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
      }
      .app .main.mushaf-mode-active {
        width: 100% !important;
        max-width: 1320px !important;
        margin-inline: auto !important;
      }
      .app .main.mushaf-mode-active .mushaf-workspace,
      .app .main.mushaf-mode-active .mushaf-workspace__fluid,
      .app .main.mushaf-mode-active .mushaf-shell {
        width: 100% !important;
        max-width: 100% !important;
        min-width: 0 !important;
        box-sizing: border-box !important;
      }
      .app .main.mushaf-mode-active .mushaf-shell__size-value,
      .app .verse-font-size-value {
        display: none !important;
      }
      .app .main.mushaf-mode-active .mushaf-translation-panel {
        display: none !important;
      }
      .live-practice-method,
      .live-practice-coach,
      .live-practice-guidance,
      .live-practice-guidance--mushaf {
        display: none !important;
      }
      /* Progress pills are mobile-only; desktop keeps the bottom metadata row */
      .app .workspace-shell-progress-pills {
        display: none !important;
      }
      @media (max-width: 767.98px) {
        .app .workspace-shell-bottom,
        .app .workspace-shell-bottom-pills,
        .app .workspace-shell-reading-toggles,
        .app .workspace-shell-compact-meta {
          display: none !important;
          min-height: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
        }
        .app .workspace-shell:not(.is-idle-card) {
          padding: 0.72rem 0.82rem 0.62rem !important;
        }
        .app .workspace-shell-head:not(.is-idle) {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) !important;
          grid-template-rows: auto auto !important;
          gap: 0.32rem !important;
          align-items: stretch !important;
        }
        .app .workspace-shell-head:not(.is-idle) > .workspace-shell-head-toolbar {
          grid-column: 1 / -1 !important;
          grid-row: 1 !important;
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          grid-template-rows: auto auto !important;
          align-items: center !important;
          column-gap: 0.5rem !important;
          row-gap: 0.4rem !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .app .workspace-shell-head-toolbar > .workspace-shell-copy {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-width: 0 !important;
        }
        .app .workspace-shell-head-utility-row {
          display: contents !important;
        }
        .app .workspace-shell-head-utility-row > .workspace-shell-actions,
        .app .workspace-shell-head-utility-row > .workspace-shell-head-actions {
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .app .workspace-shell-head-utility-row > .top-card-icon-controls {
          grid-column: 2 !important;
          grid-row: 1 !important;
          justify-self: end !important;
          align-self: center !important;
        }
        /*
         * Mobile session overview stack:
         * 1 = title + icons, session CTAs · 2 = progress pills
         */
        .app .workspace-shell-head:not(.is-idle) > .workspace-shell-progress-pills {
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          gap: 0.3rem !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0.15rem 0 0 !important;
          overflow-x: auto !important;
          overflow-y: hidden !important;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }
        .app .workspace-shell-head:not(.is-idle) > .workspace-shell-progress-pills::-webkit-scrollbar {
          display: none !important;
        }
        .app .workspace-shell-progress-pill {
          display: inline-flex !important;
          align-items: center !important;
          flex: 0 0 auto !important;
          max-width: 8.5rem !important;
          min-width: 0 !important;
          margin: 0 !important;
          padding: 0.14rem 0.48rem !important;
          border: 1px solid color-mix(in srgb, var(--border) 85%, transparent) !important;
          border-radius: 999px !important;
          background: color-mix(in srgb, var(--surface) 92%, var(--bg)) !important;
          color: color-mix(in srgb, var(--text) 72%, transparent) !important;
          font-size: 0.64rem !important;
          font-weight: 600 !important;
          line-height: 1.15 !important;
          white-space: nowrap !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          pointer-events: none !important;
          user-select: none !important;
        }
        html body .app .workspace-shell-head:not(.is-idle) > .workspace-shell-actions {
          grid-column: 1 / -1 !important;
          grid-row: 3 !important;
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          margin: 0 !important;
          pointer-events: auto !important;
        }
        html body .app .workspace-shell-actions .action-buttons-group {
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          width: 100% !important;
          min-width: 0 !important;
          gap: 0.35rem !important;
        }
        /* Post-session mobile: full-width 50/50 CTAs (avoid display:contents shrink-wrap). */
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions,
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions .action-buttons-group {
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: stretch !important;
          grid-column: 1 / -1 !important;
          grid-row: 3 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
          margin: 0 !important;
          padding: 0 !important;
          gap: 0 !important;
          box-sizing: border-box !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls {
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          grid-column: 2 !important;
          grid-row: 1 !important;
          justify-self: end !important;
          align-self: start !important;
          width: auto !important;
          min-width: 0 !important;
          height: auto !important;
          overflow: visible !important;
          pointer-events: auto !important;
          z-index: 90 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-font-wrap {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-controls-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-layout-icons,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-font-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-menu-wrap,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .view-mode-btn,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-trigger,
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-ellipsis {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-dashboard-wrap {
          order: 0 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-layout-icons {
          order: 1 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls .top-card-menu-wrap {
          order: 2 !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair.has-paired-actions {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: 1 1 100% !important;
          gap: 0.35rem !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: none !important;
        }
        .app .workspace-shell-copy {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-inline-size: 0 !important;
        }
        .app .workspace-shell-main-title {
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
        /* Mobile: sliders + mushaf layout toggle + ellipsis top-right (sliders left of stacked). */
        .app .top-card-icon-controls {
          --mq-top-icon: 36px;
          display: flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          justify-content: flex-end !important;
          gap: 6px !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
          flex-shrink: 0 !important;
          grid-column: 2 !important;
          grid-row: 1 !important;
          margin: 0 !important;
          justify-self: end !important;
          align-self: start !important;
          overflow: visible !important;
          z-index: 90 !important;
          pointer-events: auto !important;
        }
        .app .top-card-icon-controls .top-card-font-wrap {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          width: var(--mq-top-icon, 36px) !important;
          min-width: var(--mq-top-icon, 36px) !important;
          height: var(--mq-top-icon, 36px) !important;
          overflow: visible !important;
          pointer-events: auto !important;
        }
        .app .workspace-shell-actions .top-card-session-actions:not(.has-paired-actions):not(.post-session-choice-pair) {
          display: flex !important;
          flex: 1 1 auto !important;
          flex-wrap: nowrap !important;
          align-items: center !important;
          gap: 0.35rem !important;
          min-width: 0 !important;
          /* Stay inside the row-3 actions box — do not re-grid onto the head */
          grid-column: auto !important;
          grid-row: auto !important;
        }
        .app .workspace-shell-actions .top-card-session-actions.has-paired-actions:not(.post-session-choice-pair) {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          flex: 1 1 auto !important;
          gap: 0.35rem !important;
          width: 100% !important;
          min-width: 0 !important;
          grid-column: auto !important;
          grid-row: auto !important;
        }
        .app .workspace-shell-actions .top-card-session-actions.has-paired-actions:not(.post-session-choice-pair) > .session-primary-action {
          grid-column: 1 !important;
          grid-row: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .app .workspace-shell-actions .top-card-session-actions.has-paired-actions:not(.post-session-choice-pair) > .action-btn-exit {
          grid-column: 2 !important;
          grid-row: 1 !important;
          width: 100% !important;
          min-width: 0 !important;
        }
        .app .top-card-icon-controls .top-card-controls-wrap,
        .app .top-card-icon-controls .top-card-dashboard-wrap,
        .app .top-card-icon-controls .top-card-layout-icons,
        .app .top-card-icon-controls .top-card-menu-wrap {
          position: relative !important;
          display: inline-flex !important;
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          min-height: 36px !important;
          max-width: 36px !important;
          max-height: 36px !important;
          flex: 0 0 36px !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          box-sizing: border-box !important;
          pointer-events: auto !important;
        }
        .app .top-card-icon-controls .top-card-controls-wrap {
          order: 0 !important;
        }
        .app .top-card-icon-controls .top-card-dashboard-wrap {
          order: 1 !important;
        }
        .app .top-card-icon-controls .top-card-layout-icons {
          order: 2 !important;
        }
        .app .top-card-icon-controls .top-card-menu-wrap {
          order: 3 !important;
        }
        .app .top-card-icon-controls .top-card-controls-trigger,
        .app .top-card-icon-controls .top-card-dashboard-trigger,
        .app .top-card-icon-controls .view-mode-btn,
        .app .top-card-icon-controls .workspace-layout-btn,
        .app .top-card-icon-controls .top-card-ellipsis,
        .app .workspace-shell-actions .top-card-icon-controls .top-card-ellipsis {
          position: relative !important;
          inset: auto !important;
          width: 36px !important;
          height: 36px !important;
          min-width: 36px !important;
          min-height: 36px !important;
          max-width: 36px !important;
          max-height: 36px !important;
          padding: 0 !important;
          margin: 0 !important;
          border-radius: 999px !important;
          box-sizing: border-box !important;
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          transform: none !important;
          grid-column: auto !important;
          grid-row: auto !important;
        }
        .app .top-card-menu .top-card-menu-toggle--layout {
          display: none !important;
        }
        .app .workspace-shell-actions .top-card-action-trigger.session-primary-action,
        .app .workspace-shell-actions .top-card-action-trigger.action-btn-exit {
          min-height: 32px !important;
          height: 32px !important;
          padding: 0 0.5rem !important;
          font-size: 0.7rem !important;
          font-weight: 400 !important;
          border-radius: 9px !important;
          box-shadow: none !important;
          width: auto !important;
          min-width: 0 !important;
          max-width: none !important;
        }
        .app .workspace-shell-actions .post-session-choice-pair .top-card-action-trigger {
          min-height: 32px !important;
          height: 32px !important;
          padding: 0 0.4rem !important;
          font-size: 0.68rem !important;
          font-weight: 400 !important;
          border-radius: 9px !important;
          box-shadow: none !important;
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .app .workspace-shell-actions .post-session-choice-pair .top-card-action-trigger span {
          display: inline !important;
        }
        .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom.action-btn-exit {
          background: #ffffff !important;
          border: 1px solid rgba(31, 24, 18, 0.14) !important;
          color: #2b241c !important;
          font-weight: 400 !important;
        }
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom.action-btn-exit,
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom,
        [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom.action-btn-exit,
        [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(246, 239, 230, 0.22) !important;
          color: #f6efe6 !important;
          -webkit-text-fill-color: #f6efe6 !important;
        }
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom.action-btn-exit i,
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom.action-btn-exit span,
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom i,
        [data-theme="dark"] .app .workspace-shell-actions .post-session-choice-pair > .post-session-choice-custom span,
        [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom i,
        [data-theme="dark"] .app .workspace-shell--post-session-choice .post-session-choice-pair > .post-session-choice-custom span {
          color: #f6efe6 !important;
          -webkit-text-fill-color: #f6efe6 !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-copy {
          grid-column: 1 !important;
          grid-row: 1 !important;
        }
        .app .workspace-shell--post-session-choice .top-card-icon-controls {
          grid-column: 2 !important;
          grid-row: 1 !important;
        }
        .app .workspace-shell--post-session-choice .workspace-shell-actions,
        .app .workspace-shell--post-session-choice .action-buttons-group {
          display: block !important;
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          width: 100% !important;
          max-width: 100% !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          gap: 0.35rem !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair:not(.has-paired-actions) {
          grid-template-columns: minmax(0, 1fr) !important;
        }
        .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
        }
        .app .verses-grid .verse-ai-check-btn,
        .app .verses-grid .verse-ai-recite-btn {
          display: none !important;
        }
        .app .main.mushaf-mode-active {
          max-width: 100% !important;
          /* Mobile side breathing room (was forced to 0, which cancelled gutters) */
          padding-inline: clamp(16px, 4.8vw, 22px) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell {
          border-radius: 18px !important;
          border-inline: 1px solid var(--border, rgba(120, 78, 40, 0.18)) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell__page {
          display: block !important;
          justify-content: stretch !important;
          padding-inline: 0.35rem !important;
        }
        .app .main.mushaf-mode-active .mushaf-page--madani {
          padding: 0.55rem 0.85rem 1.1rem !important;
          width: 100% !important;
          max-width: 100% !important;
          margin-inline: 0 !important;
        }
        .app .main.mushaf-mode-active .madani-line--ayah,
        .app .main.mushaf-mode-active .madani-line--glyphs {
          display: contents !important;
        }
        .app .main.mushaf-mode-active .madani-page-sheet,
        .app .main.mushaf-mode-active .madani-page-sheet--unicode {
          display: block !important;
          flex-direction: unset !important;
          width: 100% !important;
          max-width: 100% !important;
          overflow-x: hidden !important;
          transform: none !important;
          margin-inline: 0 !important;
          padding-inline: 1.15rem !important;
          direction: rtl !important;
          gap: 0 !important;
          text-align: center !important;
          text-align-last: center !important;
          text-justify: none !important;
          justify-content: unset !important;
          line-height: 1.85 !important;
        }
        .app .main.mushaf-mode-active .madani-line--surah_name {
          display: none !important;
        }
        .app .main.mushaf-mode-active .madani-line--basmala,
        .app .main.mushaf-mode-active .madani-line--basmala_ayah,
        .app .main.mushaf-mode-active .madani-line--basmala-ayah {
          display: block !important;
          justify-content: center !important;
          align-items: center !important;
          text-align: center !important;
          text-align-last: center !important;
          width: 100% !important;
          max-width: 100% !important;
          flex: 0 0 auto !important;
          float: none !important;
          clear: both !important;
          margin: 0.55rem 0 0.45rem !important;
          padding: 0.25rem 0.35rem !important;
          border: 0 !important;
          background: transparent !important;
          white-space: normal !important;
          box-sizing: border-box !important;
        }
        .app .main.mushaf-mode-active .madani-line--basmala_ayah .madani-word,
        .app .main.mushaf-mode-active .madani-line--basmala-ayah .madani-word {
          display: inline !important;
          white-space: normal !important;
        }
        .app .main.mushaf-mode-active .madani-basmala {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          margin: 0 auto !important;
          padding: 0 !important;
          text-align: center !important;
          white-space: normal !important;
          font-size: calc(clamp(1.2rem, 4.8vw, 1.7rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          line-height: 1.55 !important;
          color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
          -webkit-text-fill-color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
        }
        .app .main.mushaf-mode-active .madani-word,
        .app .main.mushaf-mode-active .madani-word--glyph,
        .app .main.mushaf-mode-active .madani-word--unicode,
        .app .main.mushaf-mode-active .madani-word--fallback {
          display: inline-block !important;
          flex: none !important;
          width: auto !important;
          max-width: 100% !important;
          white-space: nowrap !important;
          font-size: calc(clamp(1.2rem, 4.8vw, 1.7rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          line-height: 1.85 !important;
          margin: 0 !important;
          margin-inline: 0.1em 0.02em !important;
          padding: 0 !important;
          word-spacing: normal !important;
          letter-spacing: normal !important;
          vertical-align: baseline !important;
          box-sizing: border-box !important;
        }
        .app .main.mushaf-mode-active .madani-surah-name {
          display: inline-block !important;
          margin-inline: auto !important;
          font-size: calc(clamp(1.32rem, 5.1vw, 1.9rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          line-height: 1.2 !important;
          text-align: center !important;
        }
        [data-theme="dark"] .app .top-card-icon-controls .top-card-icon-control,
        [data-theme="dark"] .app .top-card-icon-controls .view-mode-btn,
        [data-theme="dark"] .app .top-card-icon-controls .font-dropdown-trigger,
        [data-theme="dark"] .app .top-card-icon-controls .top-card-controls-trigger,
        [data-theme="dark"] .app .top-card-icon-controls .top-card-dashboard-trigger,
        [data-theme="dark"] .app .top-card-icon-controls .top-card-ellipsis {
          background: var(--toolbar-control-bg, #2a2521) !important;
          border-color: var(--toolbar-control-border, rgba(245, 242, 234, 0.14)) !important;
          color: var(--toolbar-control-fg, #f7ebdf) !important;
        }
      }
      @media (min-width: 768px) {
        /* Desktop: keep analytics icon beside controls (same size as other top-card icons) */
        html body .app .workspace-shell-head > .top-card-icon-controls {
          display: inline-flex !important;
          flex-flow: row nowrap !important;
          align-items: center !important;
          justify-content: flex-end !important;
          width: auto !important;
          min-width: max-content !important;
          max-width: none !important;
          flex-shrink: 0 !important;
          overflow: visible !important;
          height: 2.25rem !important;
          gap: 0.35rem !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-font-wrap {
          order: 1 !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-controls-wrap {
          order: 2 !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-wrap {
          order: 3 !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-menu-wrap {
          order: 4 !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-wrap,
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger {
          display: inline-flex !important;
          visibility: visible !important;
          opacity: 1 !important;
          pointer-events: auto !important;
          position: relative !important;
          inset: auto !important;
          width: 2.25rem !important;
          height: 2.25rem !important;
          min-width: 2.25rem !important;
          min-height: 2.25rem !important;
          max-width: 2.25rem !important;
          max-height: 2.25rem !important;
          flex: 0 0 2.25rem !important;
          flex-shrink: 0 !important;
          margin: 0 !important;
          padding: 0 !important;
          overflow: visible !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger {
          align-items: center !important;
          justify-content: center !important;
          border-radius: 999px !important;
          background: var(--toolbar-control-bg, #ffffff) !important;
          border: 1px solid var(--toolbar-control-border, rgba(28, 25, 23, 0.1)) !important;
          color: var(--toolbar-control-fg, #1c1917) !important;
          box-shadow: none !important;
          transform: none !important;
          cursor: pointer !important;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger:hover,
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger:focus-visible {
          background: var(--toolbar-control-hover-bg, color-mix(in srgb, #f0e9de 70%, #ffffff)) !important;
          border-color: color-mix(in srgb, var(--toolbar-control-border, rgba(28, 25, 23, 0.1)) 55%, var(--accent, #c48a4a)) !important;
          color: var(--toolbar-control-fg, #1c1917) !important;
          outline: none;
        }
        html body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger i {
          display: block !important;
          font-size: 1rem !important;
          line-height: 1 !important;
          visibility: visible !important;
          opacity: 1 !important;
          color: inherit !important;
        }
        html[data-theme="dark"] body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger,
        [data-theme="dark"] body .app .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger,
        body .app[data-theme="dark"] .workspace-shell-head > .top-card-icon-controls .top-card-dashboard-trigger {
          background: var(--toolbar-control-bg, #2a2521) !important;
          border: 1px solid var(--toolbar-control-border, rgba(245, 242, 234, 0.14)) !important;
          color: var(--toolbar-control-fg, #f7ebdf) !important;
        }
        .app .main.mushaf-mode-active .mushaf-workspace {
          margin: 0.55rem auto 1rem !important;
          padding-inline: clamp(1rem, 2.5vw, 2rem) !important;
          width: 100% !important;
          max-width: none !important;
          box-sizing: border-box !important;
        }
        /* Toolbar chrome + cream reading paper tokens (network-first hotfix) */
        :root {
          --zone-chrome-cream: #f0e9de;
          --mushaf-reading-surface: #f0e9de;
          --mushaf-reading-ink: #18181b;
          --workspace-card-surface:
            radial-gradient(circle at top right, color-mix(in srgb, #9a6738 10%, transparent), transparent 34%),
            linear-gradient(165deg, color-mix(in srgb, #f0e9de 90%, white 10%), #f0e9de);
          --toolbar-header-bg: var(--workspace-card-surface);
          --toolbar-header-bg-solid: #f0e9de;
          --toolbar-header-border: rgba(154, 103, 56, 0.18);
          --toolbar-control-bg: #ffffff;
          --toolbar-control-hover-bg: color-mix(in srgb, #f0e9de 70%, #ffffff);
          --toolbar-control-active-bg: #1c1917;
          --toolbar-control-active-fg: #fffaf3;
          --toolbar-control-border: rgba(28, 25, 23, 0.1);
          --toolbar-control-fg: #1c1917;
          --toolbar-control-muted-bg: rgba(255, 255, 255, 0.72);
        }
        .app .main.mushaf-mode-active .mushaf-shell,
        .app .main.mushaf-mode-active .mushaf-shell {
          background: var(--toolbar-header-bg) !important;
          background-color: var(--toolbar-header-bg-solid) !important;
          border: 1px solid var(--toolbar-header-border) !important;
          border-radius: 20px !important;
          box-shadow: 0 10px 28px rgba(63, 39, 18, 0.08) !important;
          overflow: hidden !important;
          width: 100% !important;
          max-width: none !important;
          color: var(--toolbar-control-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__bar {
          background: var(--toolbar-header-bg) !important;
          background-color: var(--toolbar-header-bg-solid) !important;
          border-bottom: 1px solid var(--toolbar-header-border) !important;
          color: var(--toolbar-control-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn {
          background: var(--toolbar-control-bg) !important;
          border: 1px solid var(--toolbar-control-border) !important;
          color: var(--toolbar-control-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:hover:not(:disabled),
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:focus-visible {
          background: var(--toolbar-control-hover-bg) !important;
          border-color: color-mix(in srgb, var(--toolbar-control-border) 55%, var(--accent, #9a6738)) !important;
          color: var(--toolbar-control-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn.is-active {
          background: var(--toolbar-control-active-bg) !important;
          border-color: var(--toolbar-control-active-bg) !important;
          color: var(--toolbar-control-active-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__size,
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager {
          background: var(--toolbar-control-muted-bg) !important;
          border-color: var(--toolbar-control-border) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager-label {
          color: var(--toolbar-control-fg) !important;
        }
        .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__page {
          background: var(--mushaf-reading-surface) !important;
          border: 0 !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          padding-inline: 0 !important;
          color: var(--mushaf-reading-ink) !important;
        }
        .app .main.mushaf-mode-active .mushaf-page--madani {
          background: var(--mushaf-reading-surface) !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          padding: 1rem clamp(1.25rem, 3.5vw, 2.75rem) 1.35rem !important;
          color: var(--mushaf-reading-ink) !important;
          --mushaf-bg: var(--mushaf-reading-surface);
          --mushaf-text: var(--mushaf-reading-ink);
          max-width: none !important;
          width: 100% !important;
          margin-inline: 0 !important;
          color-scheme: light;
        }
        .app .main.mushaf-mode-active .mushaf-page--madani::before,
        .app .main.mushaf-mode-active .mushaf-page--madani::after {
          display: none !important;
          content: none !important;
        }
        .app .main.mushaf-mode-active .madani-page-sheet,
        .app .main.mushaf-mode-active .madani-page-sheet--unicode {
          display: block !important;
          gap: 0 !important;
          overflow-x: hidden !important;
          width: 100% !important;
          max-width: none !important;
          margin-inline: 0 !important;
          padding-inline: 0 !important;
          background: transparent !important;
          border-radius: 0 !important;
          text-align: center !important;
          text-align-last: center !important;
          text-justify: none !important;
          justify-content: unset !important;
          line-height: 1.75 !important;
        }
        .app .main.mushaf-mode-active .madani-line--ayah,
        .app .main.mushaf-mode-active .madani-line--glyphs {
          display: contents !important;
        }
        .app .main.mushaf-mode-active .madani-word,
        .app .main.mushaf-mode-active .madani-word--unicode,
        .app .main.mushaf-mode-active .madani-word--fallback {
          display: inline-block !important;
          font-size: calc(clamp(1.45rem, 2.2vw, 2.1rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          margin-block: 0 !important;
          margin-inline: 0.12em 0.04em !important;
          padding-inline: 0 !important;
          letter-spacing: normal !important;
          line-height: 1.75 !important;
          white-space: nowrap !important;
          flex: none !important;
          width: auto !important;
          max-width: 100% !important;
          word-spacing: normal !important;
          vertical-align: baseline !important;
        }
        .app .main.mushaf-mode-active .madani-word--glyph {
          font-size: calc(clamp(1.5rem, 2.3vw, 2.2rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          margin-inline: 0.05em 0.02em !important;
          padding-inline: 0 !important;
          flex: none !important;
        }
        .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word:not(.highlighted):not(.phrase-highlighted),
        .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-basmala,
        .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-surah-name,
        .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--glyph:not(.highlighted):not(.phrase-highlighted) {
          color: #18181b !important;
          -webkit-text-fill-color: #18181b !important;
        }
        .app .main.mushaf-mode-active .madani-word.highlighted,
        .app .main.mushaf-mode-active .madani-word.phrase-highlighted {
          color: #b45309 !important;
          -webkit-text-fill-color: #b45309 !important;
          background: transparent !important;
        }
        .app .main.mushaf-mode-active .madani-page-sheet--tajweed .madani-word.highlighted.madani-word--glyph,
        .app .main.mushaf-mode-active .madani-page-sheet--tajweed .madani-word.phrase-highlighted.madani-word--glyph {
          color: unset !important;
          -webkit-text-fill-color: unset !important;
          filter: sepia(1) saturate(6) hue-rotate(-18deg) brightness(0.82);
        }
        .app .main.mushaf-mode-active .madani-line--surah_name {
          display: none !important;
        }
        .app .main.mushaf-mode-active .madani-line--basmala,
        .app .main.mushaf-mode-active .madani-line--basmala_ayah,
        .app .main.mushaf-mode-active .madani-line--basmala-ayah {
          display: block !important;
          text-align: center !important;
          text-align-last: center !important;
          width: 100% !important;
          max-width: 100% !important;
          flex: 0 0 auto !important;
          float: none !important;
          clear: both !important;
          margin: 0.55rem 0 0.45rem !important;
          padding: 0.25rem 0.35rem !important;
          border: 0 !important;
          background: transparent !important;
          white-space: normal !important;
          box-sizing: border-box !important;
        }
        .app .main.mushaf-mode-active .madani-line--basmala_ayah .madani-word,
        .app .main.mushaf-mode-active .madani-line--basmala-ayah .madani-word {
          display: inline !important;
          white-space: normal !important;
        }
        .app .main.mushaf-mode-active .madani-basmala {
          display: block !important;
          width: 100% !important;
          margin: 0 auto !important;
          text-align: center !important;
          white-space: normal !important;
          line-height: 1.55 !important;
          color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
          -webkit-text-fill-color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
        }
        /* Dark UI: Mushaf paper matches Session Overview / workspace-shell card */
        [data-theme="dark"] {
          --workspace-card-surface-dark:
            radial-gradient(circle at top right, color-mix(in srgb, #d4a574 10%, transparent), transparent 36%),
            linear-gradient(180deg, #221d19, color-mix(in srgb, #221d19 88%, #1a1714 12%));
          --toolbar-header-bg: var(--workspace-card-surface-dark);
          --toolbar-header-bg-solid: #221d19;
          --toolbar-header-border: rgba(208, 160, 107, 0.22);
          --toolbar-control-bg: #2a2521;
          --toolbar-control-hover-bg: color-mix(in srgb, #2a2521 80%, #d4a574 20%);
          --toolbar-control-active-bg: #d4a574;
          --toolbar-control-active-fg: #1a1208;
          --toolbar-control-border: rgba(245, 242, 234, 0.14);
          --toolbar-control-fg: #f7ebdf;
          --toolbar-control-muted-bg: rgba(255, 255, 255, 0.06);
          --mushaf-reading-surface: #221d19;
          --mushaf-reading-ink: #f7ebdf;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell,
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell {
          background: var(--toolbar-header-bg) !important;
          background-color: var(--toolbar-header-bg-solid) !important;
          border: 1px solid var(--toolbar-header-border) !important;
          border-radius: 20px !important;
          box-shadow: none !important;
          overflow: hidden !important;
          color: var(--toolbar-control-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__bar,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__bar {
          background: var(--toolbar-header-bg) !important;
          background-color: var(--toolbar-header-bg-solid) !important;
          border: 0 !important;
          border-bottom: 1px solid var(--toolbar-header-border) !important;
          box-shadow: none !important;
          border-radius: 0 !important;
          color: var(--toolbar-control-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn {
          background: var(--toolbar-control-bg) !important;
          border: 1px solid var(--toolbar-control-border) !important;
          color: var(--toolbar-control-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn i,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn i {
          color: inherit !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:hover:not(:disabled),
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:focus-visible,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:hover:not(:disabled),
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn:focus-visible {
          background: var(--toolbar-control-hover-bg) !important;
          border-color: color-mix(in srgb, var(--toolbar-control-border) 55%, #d4a574) !important;
          color: var(--toolbar-control-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn.is-active,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__btn.is-active {
          background: var(--toolbar-control-active-bg) !important;
          border-color: var(--toolbar-control-active-bg) !important;
          color: var(--toolbar-control-active-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__size,
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__size,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager {
          background: var(--toolbar-control-muted-bg) !important;
          border-color: var(--toolbar-control-border) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager-label,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__pager-label {
          color: var(--toolbar-control-fg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__page,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-shell .mushaf-shell__page,
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani,
        [data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani {
          background: var(--mushaf-reading-surface) !important;
          border: 0 !important;
          border-radius: 0 !important;
          box-shadow: none !important;
          color: var(--mushaf-reading-ink) !important;
          --mushaf-bg: var(--mushaf-reading-surface);
          --mushaf-text: var(--mushaf-reading-ink);
          --ayah-mark-ink: #f0e6d4;
          color-scheme: dark;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word:not(.highlighted):not(.phrase-highlighted),
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-basmala,
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-surah-name,
        [data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--glyph:not(.highlighted):not(.phrase-highlighted),
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word:not(.highlighted):not(.phrase-highlighted),
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-basmala,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-surah-name,
        .app[data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--glyph:not(.highlighted):not(.phrase-highlighted),
        [data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word:not(.highlighted):not(.phrase-highlighted),
        [data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-basmala,
        [data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-surah-name,
        [data-theme="dark"] .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--glyph:not(.highlighted):not(.phrase-highlighted) {
          color: var(--mushaf-reading-ink) !important;
          -webkit-text-fill-color: var(--mushaf-reading-ink) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .madani-page-sheet--tajweed,
        .app[data-theme="dark"] .main.mushaf-mode-active .madani-page-sheet--tajweed {
          /* COLR glyphs paint dark ink — invert so base ink reads light on dark paper */
          filter: invert(1) hue-rotate(180deg) !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .madani-word--end.madani-word--unicode,
        [data-theme="dark"] .app .main.mushaf-mode-active .madani-word--end.madani-word--fallback,
        .app[data-theme="dark"] .main.mushaf-mode-active .madani-word--end.madani-word--unicode,
        .app[data-theme="dark"] .main.mushaf-mode-active .madani-word--end.madani-word--fallback {
          --ayah-mark-ink: #f0e6d4;
          color: #f0e6d4 !important;
          -webkit-text-fill-color: #f0e6d4 !important;
        }
        [data-theme="dark"] .app .main.mushaf-mode-active .madani-word.highlighted,
        [data-theme="dark"] .app .main.mushaf-mode-active .madani-word.phrase-highlighted,
        .app[data-theme="dark"] .main.mushaf-mode-active .madani-word.highlighted,
        .app[data-theme="dark"] .main.mushaf-mode-active .madani-word.phrase-highlighted,
        [data-theme="dark"] .main.mushaf-mode-active .madani-word.highlighted,
        [data-theme="dark"] .main.mushaf-mode-active .madani-word.phrase-highlighted {
          color: inherit !important;
          -webkit-text-fill-color: inherit !important;
          background: color-mix(in srgb, #f0b35a 28%, transparent) !important;
          box-shadow: inset 0 -0.12em 0 color-mix(in srgb, #c47c1a 55%, transparent) !important;
        }
        /* FINAL: dark Mushaf must match workspace-shell (beat late Vue CSS) */
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell,
        html[data-theme="dark"] body .app .main.mushaf-mode-active .mushaf-shell {
          background: var(--workspace-card-surface-dark, #221d19) !important;
          background-color: #221d19 !important;
          color: #f7ebdf !important;
          --mushaf-reading-surface: #221d19;
          --mushaf-reading-ink: #f7ebdf;
          --mushaf-bg: #221d19;
          --mushaf-text: #f7ebdf;
        }
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-shell .mushaf-shell__page,
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani {
          background: #221d19 !important;
          color: #f7ebdf !important;
          --mushaf-bg: #221d19;
          --mushaf-text: #f7ebdf;
        }
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word:not(.highlighted):not(.phrase-highlighted),
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-basmala,
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--glyph:not(.highlighted):not(.phrase-highlighted),
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--unicode:not(.highlighted):not(.phrase-highlighted),
        html[data-theme="dark"] .app .main.mushaf-mode-active .mushaf-page--madani .madani-page-sheet:not(.madani-page-sheet--tajweed) .madani-word--fallback:not(.highlighted):not(.phrase-highlighted) {
          color: #f7ebdf !important;
          -webkit-text-fill-color: #f7ebdf !important;
        }
                [data-theme="dark"] .app .workspace-shell-metadata-pill,
        [data-theme="dark"] .app .workspace-shell-metadata-pill.is-readonly,
        [data-theme="dark"] .app .workspace-shell-metadata-pill.is-readonly strong,
        [data-theme="dark"] .app .workspace-shell-metadata-pill.is-readonly span,
        .app[data-theme="dark"] .workspace-shell-metadata-pill,
        .app[data-theme="dark"] .workspace-shell-metadata-pill.is-readonly,
        .app[data-theme="dark"] .workspace-shell-metadata-pill.is-readonly strong,
        .app[data-theme="dark"] .workspace-shell-metadata-pill.is-readonly span,
        [data-theme="dark"] .workspace-shell-metadata-pill,
        [data-theme="dark"] .workspace-shell-metadata-pill.is-readonly,
        [data-theme="dark"] .workspace-shell-metadata-pill.is-readonly strong,
        [data-theme="dark"] .workspace-shell-metadata-pill.is-readonly span {
          background: rgba(255, 255, 255, 0.08) !important;
          border-color: rgba(255, 255, 255, 0.16) !important;
          color: #ffffff !important;
        }
      }
      /* FINAL mobile: Bismillah stays on its own centred row (beats display:contents flow) */
      @media (max-width: 767.98px) {
        html body .app .main.mushaf-mode-active .madani-line--basmala,
        html body .app .main.mushaf-mode-active .madani-line--basmala_ayah,
        html body .app .main.mushaf-mode-active .madani-line--basmala-ayah,
        html body .main.mushaf-mode-active .madani-line--basmala,
        html body .main.mushaf-mode-active .madani-line--basmala_ayah,
        html body .main.mushaf-mode-active .madani-line--basmala-ayah {
          display: block !important;
          width: 100% !important;
          max-width: 100% !important;
          flex: 0 0 auto !important;
          float: none !important;
          clear: both !important;
          align-self: stretch !important;
          box-sizing: border-box !important;
          margin: 0.5rem 0 0.4rem !important;
          padding: 0.2rem 0.2rem !important;
          border: 0 !important;
          background: transparent !important;
          text-align: center !important;
          text-align-last: center !important;
          white-space: normal !important;
          line-height: 1.55 !important;
          overflow: visible !important;
        }
        html body .app .main.mushaf-mode-active .madani-line--basmala_ayah .madani-word,
        html body .app .main.mushaf-mode-active .madani-line--basmala-ayah .madani-word,
        html body .main.mushaf-mode-active .madani-line--basmala_ayah .madani-word,
        html body .main.mushaf-mode-active .madani-line--basmala-ayah .madani-word {
          display: inline !important;
          white-space: normal !important;
        }
        html body .app .main.mushaf-mode-active .madani-basmala,
        html body .main.mushaf-mode-active .madani-basmala {
          display: block !important;
          width: 100% !important;
          margin: 0 auto !important;
          text-align: center !important;
          white-space: normal !important;
          font-size: calc(clamp(1.2rem, 4.8vw, 1.7rem) * (var(--verse-font-percent, 120) * 0.01)) !important;
          line-height: 1.55 !important;
          color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
          -webkit-text-fill-color: var(--mushaf-reading-ink, var(--mushaf-text, #18181b)) !important;
        }
        html body .app .verse-basmala,
        html body .verse-basmala {
          display: block !important;
          width: 100% !important;
          text-align: center !important;
          margin: 0 0 0.45rem !important;
          padding: 0.1rem 0.15rem 0.3rem !important;
          white-space: normal !important;
        }
      }
      /* FINAL mobile: post-session CTAs must span full card width 50/50 */
      @media (max-width: 767.98px) {
        html body .app .workspace-shell--post-session-choice .workspace-shell-head {
          display: grid !important;
          grid-template-columns: minmax(0, 1fr) auto !important;
          grid-template-rows: auto auto !important;
          width: 100% !important;
        }
        html body .app .workspace-shell--post-session-choice .workspace-shell-copy {
          grid-column: 1 !important;
          grid-row: 1 !important;
          min-width: 0 !important;
        }
        html body .app .workspace-shell--post-session-choice .top-card-icon-controls {
          grid-column: 2 !important;
          grid-row: 1 !important;
          display: inline-flex !important;
        }
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions,
        html body .app .workspace-shell--post-session-choice .workspace-shell-actions .action-buttons-group {
          display: block !important;
          grid-column: 1 / -1 !important;
          grid-row: 2 !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
          margin: 0 !important;
          padding: 0 !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair.has-paired-actions,
        html body .app .workspace-shell-actions .top-card-session-actions.post-session-choice-pair {
          display: grid !important;
          grid-template-columns: 1fr 1fr !important;
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          flex: none !important;
          gap: 0.35rem !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn,
        html body .app .workspace-shell-actions .post-session-choice-pair > .top-card-action-trigger {
          width: 100% !important;
          min-width: 0 !important;
          max-width: 100% !important;
          flex: none !important;
          justify-content: center !important;
          overflow: hidden !important;
          box-sizing: border-box !important;
        }
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .top-card-action-trigger span,
        html body .app .workspace-shell--post-session-choice .post-session-choice-pair > .action-btn span {
          min-width: 0 !important;
          overflow: hidden !important;
          text-overflow: ellipsis !important;
          white-space: nowrap !important;
        }
      }
    </style>
    <style id="mutqin-post-session-site-theme-v2">
      /* Network-first: Session Complete uses site bronze theme + clear section rhythm */
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 {
        --ps-cream: var(--bg, #f3eee6) !important;
        --ps-ink: var(--text, #1f1a17) !important;
        --ps-muted: color-mix(in srgb, var(--text, #1f1a17) 62%, transparent) !important;
        --ps-label: var(--text, #1f1a17) !important;
        --ps-accent: var(--accent, #9a6738) !important;
        --ps-card: color-mix(in srgb, var(--surface, #fffaf3) 96%, #fff) !important;
        --ps-line: var(--border, rgba(78, 58, 38, 0.22)) !important;
        --ps-check-bg: color-mix(in srgb, var(--success, #2e7d64) 14%, #fff) !important;
        --ps-check-ink: var(--success, #2e7d64) !important;
        --ps-mint: var(--success, #2e7d64) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__dialog,
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__dialog--lg {
        width: min(44rem, calc(100vw - 2rem)) !important;
        max-width: min(44rem, calc(100vw - 2rem)) !important;
        background: var(--ps-cream) !important;
        border: 1px solid var(--ps-line) !important;
        border-radius: 1.15rem !important;
        color: var(--ps-ink) !important;
        box-shadow: 0 1px 2px color-mix(in srgb, var(--accent) 8%, transparent), 0 18px 48px color-mix(in srgb, #14231c 12%, transparent) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__header {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) !important;
        gap: 0.9rem !important;
        padding: 1.35rem 1.45rem 1rem !important;
        border-bottom: 1px solid var(--ps-line) !important;
        background: transparent !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__check {
        width: 2.55rem !important;
        height: 2.55rem !important;
        border-radius: 999px !important;
        background: var(--ps-check-bg) !important;
        color: var(--ps-check-ink) !important;
        border: 1px solid color-mix(in srgb, var(--success, #2e7d64) 28%, transparent) !important;
        box-shadow: none !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__kicker {
        display: none !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__title {
        margin: 0 !important;
        font-size: clamp(1.28rem, 3vw, 1.55rem) !important;
        line-height: 1.22 !important;
        font-weight: 680 !important;
        color: var(--ps-ink) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__subtitle {
        margin: 0.4rem 0 0 !important;
        max-width: 46ch !important;
        font-size: 0.94rem !important;
        line-height: 1.5 !important;
        color: var(--ps-muted) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__body {
        display: grid !important;
        gap: 1.15rem !important;
        padding: 1.15rem 1.45rem 1.25rem !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__ai-review--guided,
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .ps-rec-card,
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__panel--hero {
        display: grid !important;
        gap: 0.95rem !important;
        padding: 1.05rem 1.1rem !important;
        border-radius: 1rem !important;
        border: 1px solid var(--ps-line) !important;
        background: var(--ps-card) !important;
        box-shadow: none !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__section-kicker {
        margin: 0 0 0.25rem !important;
        font-size: 0.68rem !important;
        font-weight: 650 !important;
        letter-spacing: 0.05em !important;
        text-transform: uppercase !important;
        color: color-mix(in srgb, var(--accent) 78%, var(--ps-muted)) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__section-kicker--step {
        display: flex !important;
        align-items: center !important;
        gap: 0.5rem !important;
        margin: 0 0 0.4rem !important;
        font-size: 0.82rem !important;
        font-weight: 650 !important;
        letter-spacing: 0.01em !important;
        text-transform: none !important;
        color: var(--ps-ink) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__step-num {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        flex: 0 0 auto !important;
        width: 1.4rem !important;
        height: 1.4rem !important;
        border-radius: 999px !important;
        border: 1px solid color-mix(in srgb, var(--accent) 34%, transparent) !important;
        background: color-mix(in srgb, var(--accent) 12%, transparent) !important;
        color: var(--accent-strong, var(--accent)) !important;
        font-size: 0.74rem !important;
        font-weight: 700 !important;
        line-height: 1 !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__section-kicker--sub {
        margin: 0 0 0.3rem !important;
        font-size: 0.68rem !important;
        font-weight: 600 !important;
        letter-spacing: 0.06em !important;
        text-transform: uppercase !important;
        color: var(--ps-muted) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__support-block {
        margin-top: 0.5rem !important;
        padding-top: 0.8rem !important;
        border-top: 1px solid color-mix(in srgb, var(--ps-line) 70%, transparent) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__weak-spots-list--inline {
        display: flex !important;
        flex-wrap: wrap !important;
        gap: 0.4rem !important;
        margin: 0 !important;
        padding: 0 !important;
        list-style: none !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__weak-spots-list--inline > li {
        display: inline-flex !important;
        align-items: baseline !important;
        gap: 0.4rem !important;
        max-width: 100% !important;
        padding: 0.3rem 0.6rem !important;
        border-radius: 999px !important;
        border: 1px solid color-mix(in srgb, var(--ps-line) 85%, transparent) !important;
        background: color-mix(in srgb, #fff7f7 55%, var(--ps-card)) !important;
        font-size: 0.84rem !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__weak-spots-list--inline .post-session-simple__weak-spots-ayah {
        font-size: 0.8rem !important;
        white-space: nowrap !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__weak-spots-list--inline .post-session-simple__weak-spots-words {
        overflow: hidden !important;
        max-width: 22ch !important;
        font-size: 0.95rem !important;
        line-height: 1.4 !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__why-block {
        margin: 0.15rem 0 0 !important;
        padding: 0 0 0 0.7rem !important;
        border-top: 0 !important;
        border-inline-start: 2px solid color-mix(in srgb, var(--accent) 30%, transparent) !important;
        font-size: 0.9rem !important;
        line-height: 1.5 !important;
        color: var(--ps-muted) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__outcome-title,
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__action-label {
        margin: 0 !important;
        font-size: 1.12rem !important;
        font-weight: 650 !important;
        color: var(--ps-ink) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__scope-cards {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 0.65rem !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__scope-card {
        display: grid !important;
        gap: 0.3rem !important;
        padding: 0.85rem 0.9rem !important;
        border-radius: 0.9rem !important;
        border: 1px solid var(--ps-line) !important;
        background: color-mix(in srgb, var(--ps-card) 88%, var(--ps-cream)) !important;
        text-align: start !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__scope-card.is-selected {
        border-color: color-mix(in srgb, var(--accent) 42%, transparent) !important;
        background: color-mix(in srgb, var(--accent) 10%, #fff) !important;
        box-shadow: 0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent) !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__btn--primary {
        background: linear-gradient(135deg, var(--accent), var(--accent-strong)) !important;
        border-color: color-mix(in srgb, var(--accent) 48%, transparent) !important;
        color: #fff !important;
      }
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__btn--secondary,
      .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__btn--ghost {
        background: color-mix(in srgb, var(--surface) 96%, transparent) !important;
        border: 1px solid color-mix(in srgb, var(--border) 82%, transparent) !important;
        color: var(--text) !important;
      }
      @media (max-width: 720px) {
        .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__scope-cards {
          grid-template-columns: 1fr !important;
        }
        .post-session-simple.post-session-simple--premium.post-session-simple--calm-v2 .post-session-simple__actions--3 {
          grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        }
      }

      /* Idle hero ("Your place") — network-first v117 (wins over chunk CSS) */
      html body .app .workspace-shell-idle--fresh .workspace-shell-idle-watermark {
        display: none !important;
      }
      html body .app .workspace-shell-idle-actions--fresh {
        flex-direction: column !important;
        align-items: stretch !important;
        gap: 0.75rem !important;
        width: 100% !important;
      }
      html body .app .workspace-shell-idle-actions--fresh .workspace-shell-idle-quickstart {
        width: 100% !important;
        max-width: none !important;
      }
      html body .app .workspace-shell-idle-actions--fresh .workspace-shell-idle-links {
        width: 100% !important;
        justify-content: flex-start !important;
      }
      html body .app .workspace-shell.is-idle-card {
        width: min(calc(100% - 2 * clamp(0.65rem, 2vw, 1rem)), 880px) !important;
        max-width: 880px !important;
        margin-inline: auto !important;
        padding: clamp(0.9rem, 1.8vw, 1.15rem) clamp(1rem, 2vw, 1.25rem) !important;
        border-radius: 20px !important;
        border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border)) !important;
        background: linear-gradient(
          165deg,
          color-mix(in srgb, var(--accent-light, var(--surface)) 22%, var(--workspace-card-surface, var(--surface))) 0%,
          var(--workspace-card-surface, var(--surface)) 42%,
          color-mix(in srgb, var(--surface) 98%, var(--accent-light, transparent) 2%) 100%
        ) !important;
        box-shadow:
          0 1px 0 color-mix(in srgb, white 50%, transparent) inset,
          0 1px 2px color-mix(in srgb, var(--text) 4%, transparent),
          0 10px 28px color-mix(in srgb, var(--accent) 6%, transparent) !important;
        overflow: visible !important;
      }
      html body .app .workspace-shell-head.is-idle {
        display: block !important;
        padding-block: 0 !important;
      }
      html body .app .workspace-shell-idle-inner {
        display: flex !important;
        flex-wrap: nowrap !important;
        align-items: center !important;
        justify-content: space-between !important;
        gap: clamp(0.85rem, 2vw, 1.35rem) !important;
        width: 100% !important;
        min-width: 0 !important;
      }
      html body .app .workspace-shell-idle-main {
        display: grid !important;
        flex: 1 1 auto !important;
        min-width: 0 !important;
        max-width: min(36rem, 100%) !important;
        gap: 0.85rem !important;
      }
      html body .app .workspace-shell-idle--fresh .workspace-shell-idle-main {
        max-width: 100% !important;
      }
      html body .app .workspace-shell-idle-aside {
        display: flex !important;
        flex-direction: column !important;
        align-items: center !important;
        flex: 0 0 auto !important;
        margin-inline-start: auto !important;
        gap: 0.35rem !important;
        padding-inline-start: clamp(0.85rem, 2vw, 1.15rem) !important;
        border-inline-start: 1px solid color-mix(in srgb, var(--border) 72%, transparent) !important;
      }
      html body .app .workspace-shell-idle-aside-cta {
        display: block !important;
        width: 100% !important;
        min-width: 8.5rem !important;
      }
      html body .app .workspace-shell-idle-actions__start--inline {
        display: none !important;
      }
      html body .app .workspace-shell-idle-quickstart {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        gap: 0.65rem !important;
        width: min(100%, 32rem) !important;
      }
      html body .app .workspace-shell-idle-choice {
        display: grid !important;
        grid-template-columns: auto minmax(0, 1fr) auto !important;
        align-items: center !important;
        gap: 0.65rem !important;
        padding: 0.78rem 0.85rem !important;
        border-radius: 14px !important;
        border: 1px solid color-mix(in srgb, var(--border) 86%, transparent) !important;
        background: color-mix(in srgb, var(--surface) 98%, transparent) !important;
        text-align: start !important;
      }
      html body .app .workspace-shell-idle-choice--primary {
        border-color: color-mix(in srgb, var(--accent) 26%, var(--border)) !important;
        background: linear-gradient(
          180deg,
          color-mix(in srgb, var(--accent-light, var(--surface)) 38%, var(--surface)),
          color-mix(in srgb, var(--surface) 98%, transparent)
        ) !important;
      }
      html body .app .workspace-shell-idle-choice__icon {
        display: inline-flex !important;
        align-items: center !important;
        justify-content: center !important;
        width: 2rem !important;
        height: 2rem !important;
        border-radius: 10px !important;
        background: color-mix(in srgb, var(--accent-light, var(--surface)) 40%, transparent) !important;
        color: var(--accent-strong) !important;
        flex-shrink: 0 !important;
      }
      html body .app .workspace-shell-idle-choice__body strong {
        display: block !important;
        font-size: 0.875rem !important;
        font-weight: 650 !important;
        line-height: 1.25 !important;
        color: var(--text) !important;
      }
      html body .app .workspace-shell-idle-choice__body span {
        display: block !important;
        font-size: 0.75rem !important;
        line-height: 1.35 !important;
        color: var(--text-muted) !important;
      }
      html body .app .workspace-shell-idle-ring {
        width: 4.25rem !important;
        height: 4.25rem !important;
      }
      html body .app .workspace-shell-idle-watermark {
        display: block !important;
        opacity: 0.07 !important;
      }
      @media (max-width: 767.98px) {
        html body .app .workspace-shell.is-idle-card {
          width: 100% !important;
          max-width: 100% !important;
          margin-inline: 0 !important;
          padding: 0.85rem 0.95rem !important;
        }
        html body .app .workspace-shell-idle--fresh .workspace-shell-idle-inner {
          flex-direction: column !important;
          align-items: stretch !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-inner {
          flex-direction: column !important;
          align-items: stretch !important;
          gap: 0.75rem !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-main {
          display: contents !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-copy {
          order: 1 !important;
          width: 100% !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-aside {
          order: 2 !important;
          align-self: stretch !important;
          flex-direction: row !important;
          align-items: center !important;
          justify-content: flex-start !important;
          gap: 0.75rem !important;
          width: 100% !important;
          margin: 0 !important;
          padding: 0.68rem 0.78rem !important;
          border-radius: 14px !important;
          border: 1px solid color-mix(in srgb, var(--border) 80%, transparent) !important;
          background: color-mix(in srgb, var(--surface) 94%, var(--accent-light, transparent) 6%) !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-aside-meta {
          align-items: flex-start !important;
          flex: 1 1 auto !important;
          min-width: 0 !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-ring__label {
          max-width: none !important;
          text-align: start !important;
        }
        html body .app .workspace-shell-idle--continuing .workspace-shell-idle-actions {
          order: 3 !important;
          width: 100% !important;
        }
        html body .app .workspace-shell-idle-links--toolbar {
          display: grid !important;
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
          gap: 0 !important;
          width: 100% !important;
          border: 1px solid color-mix(in srgb, var(--border) 78%, transparent) !important;
          border-radius: 12px !important;
          overflow: hidden !important;
          background: color-mix(in srgb, var(--surface) 96%, transparent) !important;
        }
        html body .app .workspace-shell-idle-links--toolbar .workspace-shell-text-link-sep {
          display: none !important;
        }
        html body .app .workspace-shell-idle-links--toolbar .workspace-shell-text-link {
          display: inline-flex !important;
          align-items: center !important;
          justify-content: center !important;
          gap: 0.35rem !important;
          width: 100% !important;
          min-height: 2.5rem !important;
          padding: 0.55rem 0.65rem !important;
          border: none !important;
          border-radius: 0 !important;
          background: transparent !important;
        }
        html body .app .workspace-shell-idle-links--toolbar .workspace-shell-text-link-sep + .workspace-shell-text-link {
          border-inline-start: 1px solid color-mix(in srgb, var(--border) 78%, transparent) !important;
        }
        html body .app .workspace-shell-idle-aside {
          padding-inline-start: 0 !important;
          border-inline-start: 0 !important;
        }
        html body .app .workspace-shell-idle-aside-cta {
          display: none !important;
        }
        html body .app .workspace-shell-idle-actions__start--inline {
          display: block !important;
          width: 100% !important;
        }
        html body .app .workspace-shell-idle-actions__start--inline .session-idle-action {
          width: 100% !important;
          justify-content: center !important;
        }
        html body .app .workspace-shell-idle-quickstart {
          grid-template-columns: 1fr !important;
          width: 100% !important;
        }
        html body .app .workspace-shell-idle-watermark {
          display: none !important;
        }
        html body .app .workspace-shell-idle-ring {
          width: 3.75rem !important;
          height: 3.75rem !important;
        }
      }
      @media (min-width: 480px) and (max-width: 767.98px) {
        html body .app .workspace-shell-idle--fresh .workspace-shell-idle-quickstart {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }
    </style>
    <script>
      // Re-assert colour/hotfix lock after Vue injects chunk CSS (beats stale cached chunks).
      (function () {
        function pin() {
          ['mutqin-button-colour-semantics', 'mutqin-memorisation-hotfix-v131', 'mutqin-memorisation-hotfix-v117', 'mutqin-memorisation-hotfix-v116', 'mutqin-memorisation-hotfix-v115', 'mutqin-post-session-site-theme-v2'].forEach(function (id) {
            var el = document.getElementById(id);
            if (el && el.parentNode) el.parentNode.appendChild(el);
          });
        }
        window.addEventListener('load', function () {
          pin();
          setTimeout(pin, 0);
          setTimeout(pin, 500);
          setTimeout(pin, 2000);
        });
      })();
    </script>
    <script id="mutqin-strip-quran-circles">
      /**
       * Network-first DOM scrubber — survives stale memorisation.*.js chunks.
       * UthmanicHafs paints U+06DF as a solid disc + dashed ring (plain + tajweed).
       */
      (function () {
        var CIRCLE_RE = /[\u06DF\u06E0\u06E3\u06DD\u06DE\u06E9\u25CC]/g;
        var ROOT_SEL = [
          '.verse-arabic',
          '.mushaf-ayah-text',
          '.amd-mushaf-stream',
          '.self-check-modal-ayah',
          '.memorisation-checker-ayah',
          '.session-evaluation-ayah',
          '.recitation-review-ayah',
          '.verses-grid',
          '.quiz-prompt'
        ].join(',');
        var locking = false;
        var scheduled = false;

        function scrubRoot(root) {
          if (!root || root.nodeType !== 1) return;
          var walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, null);
          var node;
          while ((node = walker.nextNode())) {
            var value = node.nodeValue;
            if (!value || value.search(CIRCLE_RE) === -1) continue;
            CIRCLE_RE.lastIndex = 0;
            node.nodeValue = value.replace(CIRCLE_RE, '');
          }
        }

        function scrubAll() {
          if (locking || !document.body) return;
          locking = true;
          try {
            document.querySelectorAll(ROOT_SEL).forEach(scrubRoot);
          } finally {
            locking = false;
          }
        }

        function scheduleScrub() {
          if (scheduled) return;
          scheduled = true;
          requestAnimationFrame(function () {
            scheduled = false;
            scrubAll();
          });
        }

        function start() {
          scrubAll();
          if (!window.MutationObserver || !document.body) return;
          var obs = new MutationObserver(scheduleScrub);
          obs.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true
          });
          window.__mutqinStripQuranCircles = scrubAll;
          document.documentElement.dataset.mutqinCircleScrub = 'v109';
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', start);
        } else {
          start();
        }
        window.addEventListener('load', function () {
          scrubAll();
          setTimeout(scrubAll, 300);
          setTimeout(scrubAll, 1200);
          setTimeout(scrubAll, 3000);
          setTimeout(scrubAll, 6000);
        });
      })();
    </script>
    <script id="mutqin-session-only-mushaf-scrub">
      /**
       * Network-first: delete mushaf words outside the active session range.
       * Survives stale memorisation.js that still paints neighbouring-page ayahs
       * (e.g. Al-Alaq 13–15 before Bayyinah on page 598).
       *
       * Session is resolved from:
       *  1) documentElement / .main data-session-* attrs
       *  2) metadata pills ("Ayahs 1-6")
       *  3) majority chapter among in-range verse keys
       *
       * Chapter is preferred, but ayah-range alone is enough to drop markers
       * like ١٣–١٥ when the session is 1–6.
       */
      (function () {
        var scheduled = false;
        var locking = false;
        var EASTERN = {'٠':0,'١':1,'٢':2,'٣':3,'٤':4,'٥':5,'٦':6,'٧':7,'٨':8,'٩':9};

        function parseKey(verseKey) {
          var parts = String(verseKey || '').split(':');
          return {
            chapter: Number(parts[0]) || 0,
            ayah: Number(parts[1]) || 0
          };
        }

        function easternToNumber(text) {
          var raw = String(text || '').replace(/[^\u0660-\u0669]/g, '');
          if (!raw) return 0;
          var n = 0;
          for (var i = 0; i < raw.length; i += 1) {
            var d = EASTERN[raw.charAt(i)];
            if (d == null) return 0;
            n = (n * 10) + d;
          }
          return n;
        }

        function readSessionAttrs(el) {
          if (!el || !el.getAttribute) {
            return { chapter: 0, start: 0, end: 0 };
          }
          return {
            chapter: Number(el.getAttribute('data-session-chapter') || el.dataset && el.dataset.sessionChapter || 0) || 0,
            start: Number(el.getAttribute('data-session-start') || el.dataset && el.dataset.sessionStart || 0) || 0,
            end: Number(el.getAttribute('data-session-end') || el.dataset && el.dataset.sessionEnd || 0) || 0
          };
        }

        function resolveSession(root) {
          var fromHtml = readSessionAttrs(document.documentElement);
          var fromRoot = readSessionAttrs(root);
          var chapter = fromRoot.chapter || fromHtml.chapter || 0;
          var start = fromRoot.start || fromHtml.start || 0;
          var end = fromRoot.end || fromHtml.end || 0;

          if (!(chapter > 0)) {
            document.querySelectorAll('[data-session-chapter]').forEach(function (el) {
              var value = Number(el.getAttribute('data-session-chapter') || 0);
              if (value > 0) chapter = value;
            });
          }

          if (!(start > 0 && end >= start)) {
            document.querySelectorAll('.workspace-shell-metadata-pill, .workspace-shell-metadata, .session-meta, [data-ayah-range]').forEach(function (pill) {
              var text = String(pill.getAttribute('data-ayah-range') || pill.textContent || '');
              if (!/ayah|ayat|آية|آيات|range|\d+\s*[-–—]\s*\d+/i.test(text)) return;
              var m = text.match(/(\d+)\s*[-–—]\s*(\d+)/);
              if (!m) return;
              start = Number(m[1]) || start;
              end = Number(m[2]) || end;
            });
          }

          if (!(chapter > 0) && start > 0 && end >= start) {
            var counts = {};
            (root || document).querySelectorAll('.madani-word[data-verse-key]').forEach(function (el) {
              var parsed = parseKey(el.getAttribute('data-verse-key'));
              if (!parsed.chapter || parsed.ayah < start || parsed.ayah > end) return;
              counts[parsed.chapter] = (counts[parsed.chapter] || 0) + 1;
            });
            var best = 0;
            var bestCount = 0;
            Object.keys(counts).forEach(function (key) {
              if (counts[key] > bestCount) {
                best = Number(key);
                bestCount = counts[key];
              }
            });
            chapter = best;
          }

          return { chapter: chapter, start: start, end: end };
        }

        function shouldDrop(chapter, ayah, session) {
          if (!(session.start > 0 && session.end >= session.start)) return false;
          // Chapter is mandatory when present on the word — never keep another
          // surah's ayah just because its number falls inside the session range
          // (e.g. Bayyinah 6–7 on an Adiyat 1–11 page).
          if (session.chapter > 0 && chapter > 0 && chapter !== session.chapter) return true;
          if (session.chapter > 0 && chapter > 0 && ayah > 0) {
            return !(chapter === session.chapter && ayah >= session.start && ayah <= session.end);
          }
          // No chapter on the word: only drop clearly out-of-range end markers.
          if (ayah > 0 && (ayah < session.start || ayah > session.end)) return true;
          // With a known session chapter but unknown word chapter, drop unless
          // marked as a session word by the current app build.
          if (session.chapter > 0 && !chapter && ayah > 0) return true;
          return false;
        }

        function removeEl(el) {
          if (!el || !el.parentNode) return;
          try { el.parentNode.removeChild(el); } catch (e) {}
        }

        function scrub() {
          if (locking || !document.body) return;
          var root = document.querySelector('.main.mushaf-mode-active, .main.mushaf-mode-active')
            || document.querySelector('.madani-page-sheet, .mushaf-page--madani');
          if (!root) return;
          var session = resolveSession(root);
          // Chapter is required. Range-only incorrectly keeps prior-surah ayahs
          // whose numbers sit inside the session window (Bayyinah 6–7 on Adiyat 1–11).
          if (!(session.chapter > 0 && session.start > 0 && session.end >= session.start)) return;

          locking = true;
          try {
            var words = root.querySelectorAll('.madani-word');
            words.forEach(function (el) {
              var key = el.getAttribute('data-verse-key');
              var chapter = 0;
              var ayah = 0;
              if (key) {
                var parsed = parseKey(key);
                chapter = parsed.chapter;
                ayah = parsed.ayah;
              } else if (el.classList.contains('madani-word--end')) {
                ayah = easternToNumber(el.textContent || '');
              }

              if (shouldDrop(chapter, ayah, session)) {
                removeEl(el);
              }
            });

            root.querySelectorAll('.madani-line--ayah, .madani-line--basmala-ayah__line--ayah, .madani-line').forEach(function (line) {
              if (line.classList.contains('madani-line--basmala') || line.classList.contains('madani-line--surah_name')) return;
              var remaining = line.querySelectorAll('.madani-word');
              if (!remaining.length && (line.classList.contains('madani-line--ayah') || line.classList.contains('madani-line--basmala-ayah') || line.classList.contains('madani-line--glyphs'))) {
                removeEl(line);
              }
            });
          } finally {
            locking = false;
          }
        }

        function schedule() {
          if (scheduled) return;
          scheduled = true;
          requestAnimationFrame(function () {
            scheduled = false;
            scrub();
          });
        }

        function start() {
          scrub();
          if (!window.MutationObserver || !document.body) return;
          var obs = new MutationObserver(schedule);
          obs.observe(document.body, {
            childList: true,
            subtree: true,
            attributes: true,
            attributeFilter: [
              'data-verse-key',
              'data-session-chapter',
              'data-session-start',
              'data-session-end',
              'class'
            ]
          });
          window.__mutqinSessionOnlyMushafScrub = scrub;
          document.documentElement.dataset.mutqinSessionOnlyMushaf = 'v4';
        }

        if (document.readyState === 'loading') {
          document.addEventListener('DOMContentLoaded', start);
        } else {
          start();
        }
        window.addEventListener('load', function () {
          scrub();
          setTimeout(scrub, 200);
          setTimeout(scrub, 800);
          setTimeout(scrub, 2000);
          setTimeout(scrub, 5000);
        });
      })();
    </script>
    @endif
    <style>
        /* Theme Variables - NO SHADOWS */
        :root {
            color-scheme: light;
            --bg: #f6f3ee;
            --theme-color: #8b5e3c;
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
            --nav-h: 64px;
            --shell-max: 1400px;
            --profile-max: 1080px;
            --gutter: clamp(14px, 3.6vw, 32px);
            --gutter-tight: clamp(12px, 3vw, 24px);
            --radius: clamp(12px, 1.4vw, 16px);
            --tap: 44px;
            --nav-icon: 40px;
            --text-base: clamp(14px, 0.95vw + 10px, 16px);
            --text-sm: clamp(12px, 0.65vw + 9px, 14px);
        }

        html[data-theme="dark"],
        [data-theme="dark"] {
            color-scheme: dark;
            --bg: #14110f;
            --theme-color: #14110f;
            --surface: #181614;
            --surface-strong: #121212;
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
            --bg: #f1e7d8;
            --theme-color: #8b5e3c;
            --surface: #fff8eb;
            --surface-strong: #fff8eb;
            --surface-elevated: #fff4e3;
            --surface-soft: #efdfc8;
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

        html[data-theme="dark"] .btn-close,
        [data-theme="dark"] .btn-close {
            --bs-btn-close-filter: invert(1) grayscale(100%) brightness(200%);
            filter: invert(1) grayscale(100%) brightness(200%);
            opacity: 0.85;
        }

        /* Keep the mobile menu X visible on the solid-black drawer */
        html[data-theme="dark"] #primaryNavbar .btn-close,
        [data-theme="dark"] #primaryNavbar .btn-close {
            width: 1.25rem;
            height: 1.25rem;
            padding: 0.65rem;
            box-sizing: content-box;
            margin: 0;
            opacity: 0.9 !important;
            --bs-btn-close-filter: invert(1) grayscale(100%) brightness(200%);
            filter: invert(1) grayscale(100%) brightness(200%) !important;
            background-color: transparent !important;
            background-image: var(--bs-btn-close-bg) !important;
            background-position: center !important;
            background-repeat: no-repeat !important;
            background-size: 1em auto !important;
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
            padding: 0;
            position: sticky;
            top: 0;
            z-index: 1000;
            /* Push content below Dynamic Island / notch, not just flush under status icons */
            padding-top: max(0.55rem, calc(env(safe-area-inset-top, 0px) + 0.35rem));
            padding-inline: max(0.55rem, env(safe-area-inset-left, 0px)) max(0.55rem, env(safe-area-inset-right, 0px));
            box-shadow: none !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        [data-theme="dark"] .app-navbar {
            background: var(--surface-strong);
        }

        [data-theme="sepia"] .app-navbar {
            background: #fff8eb !important;
            background-color: #fff8eb !important;
            backdrop-filter: none !important;
            -webkit-backdrop-filter: none !important;
        }

        .navbar-shell {
            max-width: var(--shell-max);
            margin: 0 auto;
            padding: 8px max(var(--gutter), 14px);
            min-height: var(--nav-h);
            gap: 10px;
            align-items: center;
        }

        .navbar-brand {
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            min-width: 0;
            padding: 0;
            margin-inline-end: 0;
            line-height: 0;
        }

        .app-navbar-logo {
            height: 46px;
            width: auto;
            filter: none !important;
            mix-blend-mode: normal;
            opacity: 0.98;
            image-rendering: auto;
            object-fit: contain;
        }

        .app-navbar-logo--dark {
            display: none;
        }

        html[data-theme="dark"] .app-navbar-logo--light {
            display: none;
        }

        html[data-theme="dark"] .app-navbar-logo--dark {
            display: inline;
        }

        .app-navbar-logo--mark {
            display: none;
            width: auto;
            height: 36px;
            max-width: 36px;
            max-height: 36px;
            object-fit: contain;
        }

        .navbar-quick-actions {
            margin-inline-start: auto;
            align-items: center;
            gap: 4px !important;
        }

        .navbar-toggler {
            border: 1px solid var(--border);
            background: var(--surface);
            padding: 0;
            width: var(--nav-icon);
            height: var(--nav-icon);
            border-radius: 10px;
            color: var(--text);
            transition: all 0.2s ease;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-width: var(--tap);
            min-height: var(--tap);
        }

        .navbar-toggler:hover {
            background: var(--accent-light);
            border-color: var(--accent);
        }

        .navbar-toggler i {
            font-size: 20px;
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
        .app-navbar .nav-link-dashboard,
        .app-navbar .nav-link-dashboard:hover,
        .app-navbar .nav-link-dashboard:focus,
        .app-navbar .nav-link-dashboard:focus-visible,
        .app-navbar .nav-link-dashboard.active,
        .app-navbar .nav-link-memorisation,
        .app-navbar .nav-link-memorisation:hover,
        .app-navbar .nav-link-memorisation:focus,
        .app-navbar .nav-link-memorisation:focus-visible,
        .app-navbar .nav-link-memorisation.active {
            box-shadow: none !important;
        }

        .global-theme-switcher {
            position: relative;
            flex: 0 0 auto;
        }

        .app-theme-toggle {
            width: var(--nav-icon);
            height: var(--nav-icon);
            border-radius: 10px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;
            transition: background 0.2s ease, color 0.2s ease;
            min-width: var(--tap);
            min-height: var(--tap);
            padding: 0;
        }

        .app-theme-toggle:hover,
        .app-theme-toggle[aria-expanded="true"] {
            background: var(--accent-light);
            color: var(--accent);
        }

        .app-theme-toggle:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        .app-theme-menu {
            margin-top: 12px !important;
            min-width: 12.75rem;
            width: max-content;
            max-width: min(18rem, calc(100vw - 1.5rem));
            padding: 8px;
            border: 1px solid var(--border);
            border-radius: 16px;
            background: var(--surface-strong);
            color: var(--text);
            z-index: 5200;
        }

        .app-theme-menu .theme-btn {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            width: 100%;
            min-height: var(--tap);
            border-radius: 12px;
            padding: 0.55rem 0.7rem;
        }

        .app-theme-menu .theme-btn-swatch {
            width: 0.9rem;
            height: 0.9rem;
            border-radius: 999px;
            border: 1px solid var(--border-strong);
            flex-shrink: 0;
            box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--text) 8%, transparent);
        }

        .app-theme-menu .theme-btn-label {
            flex: 1 1 auto;
            text-align: start;
            font-size: 0.88rem;
            font-weight: 600;
        }

        .app-theme-menu .theme-btn-check {
            margin-inline-start: auto;
            font-size: 1rem;
            opacity: 0;
            color: var(--accent);
        }

        .app-theme-menu .theme-btn.active .theme-btn-check,
        .app-theme-menu .theme-btn[aria-checked="true"] .theme-btn-check {
            opacity: 1;
        }

        .app-theme-menu .theme-btn.active,
        .app-theme-menu .theme-btn[aria-checked="true"],
        .app-theme-menu .theme-btn:hover,
        .app-theme-menu .theme-btn:focus-visible {
            background: var(--accent-light) !important;
            color: var(--accent) !important;
        }

        .app-theme-menu .theme-btn:focus-visible {
            outline: 2px solid var(--accent) !important;
            outline-offset: 1px;
        }

        @media (max-width: 991.98px) {
            .navbar-quick-actions .global-theme-switcher .dropdown-menu {
                position: fixed !important;
                inset: auto 12px auto auto !important;
                transform: none !important;
                margin-top: 8px;
                max-height: min(60vh, 360px);
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            html[dir="rtl"] .navbar-quick-actions .global-theme-switcher .dropdown-menu {
                inset: auto auto auto 12px !important;
            }
        }

        .global-lang-switcher {
            min-width: 0;
            max-width: 100%;
        }

        .app-lang-toggle {
            min-height: var(--tap);
            height: var(--nav-icon);
            max-width: 100%;
            border-radius: 10px;
            background: var(--surface);
            border: 1px solid var(--border);
            color: var(--text);
            display: inline-flex;
            align-items: center;
            gap: 0.4rem;
            padding: 0 0.55rem 0 0.45rem;
            cursor: pointer;
            transition: all 0.2s ease;
        }

        .app-lang-flag,
        .lang-btn-flag {
            font-size: 1.05rem;
            line-height: 1;
            flex-shrink: 0;
        }

        .app-lang-label,
        .lang-btn-label {
            font-size: 0.82rem;
            font-weight: 600;
            line-height: 1.1;
            min-width: 0;
        }

        .app-lang-label {
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
        }

        .lang-btn-label {
            flex: 1 1 auto;
            text-align: start;
        }

        .app-lang-chevron {
            font-size: 0.65rem;
            line-height: 1;
            opacity: 0.72;
            flex-shrink: 0;
        }

        .app-lang-toggle:hover,
        .global-lang-switcher .lang-btn.active {
            background: var(--accent-light);
            color: var(--accent);
        }

        .app-lang-menu .lang-btn {
            display: flex;
            align-items: center;
            gap: 0.55rem;
            width: 100%;
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
        html[dir="rtl"] .app-lang-menu,
        html[dir="rtl"] .app-theme-menu {
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

        .app-lang-menu .lang-btn.active {
            background: var(--accent-light);
            color: var(--accent);
            font-weight: 600;
        }

        @media (max-width: 991.98px) {
            .navbar-quick-actions > .global-lang-switcher {
                width: auto !important;
                min-width: 0;
                max-width: min(42vw, 10.5rem);
            }

            .navbar-quick-actions .global-lang-switcher .app-lang-toggle {
                width: 100%;
                min-width: 0;
                padding-inline: 0.4rem;
                gap: 0.3rem;
            }

            .navbar-quick-actions .global-lang-switcher .dropdown-menu {
                position: fixed !important;
                inset: auto 12px auto auto !important;
                transform: none !important;
                margin-top: 8px;
                max-height: min(60vh, 360px);
                overflow-y: auto;
                -webkit-overflow-scrolling: touch;
            }

            html[dir="rtl"] .navbar-quick-actions .global-lang-switcher .dropdown-menu {
                inset: auto auto auto 12px !important;
            }
        }

        /* Dropdown Styles - NO SHADOWS */
        .dropdown {
            position: relative;
            display: inline-block;
        }

        .app-user-toggle {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 4px 12px 4px 6px;
            min-height: var(--tap);
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
            width: 30px;
            height: 30px;
            border-radius: 50%;
            background: var(--accent);
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            font-size: 13px;
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

        .dropdown-menu form {
            margin: 0;
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
            font-family: inherit;
            font-size: 14px;
            font-weight: 500;
            line-height: 1.25;
            text-align: start;
        }

        .dropdown-item i {
            font-size: 18px;
            width: 20px;
            flex-shrink: 0;
            line-height: 1;
        }

        .dropdown-item:hover {
            background: var(--accent-light);
            color: var(--accent);
        }

        button.dropdown-item:hover {
            background: var(--accent-light);
            color: var(--accent);
        }

        .dropdown-item--feedback,
        .dropdown-item--feedback:hover,
        .dropdown-item--feedback:focus,
        .dropdown-item--feedback:focus-visible,
        .dropdown-item--feedback:active,
        .dropdown-item--feedback.active {
            background: transparent !important;
            box-shadow: none !important;
            outline: none;
            -webkit-tap-highlight-color: transparent;
            color: var(--text);
        }

        .dropdown-item--feedback:hover,
        .dropdown-item--feedback:focus-visible {
            color: var(--accent);
        }

        button.dropdown-item,
        button.dropdown-item:hover,
        button.dropdown-item:focus,
        button.dropdown-item:focus-visible,
        button.dropdown-item:active {
            background: transparent;
            color: var(--text);
            box-shadow: none;
            outline: none;
            -webkit-tap-highlight-color: transparent;
        }

        button.dropdown-item:hover {
            background: var(--accent-light);
            color: var(--accent);
        }

        .app-navbar .offcanvas-body .mobile-nav-feedback {
            grid-template-columns: 44px minmax(0, 1fr);
            width: 100%;
            border: 0;
            background: transparent;
            color: inherit;
            text-align: start;
            -webkit-tap-highlight-color: transparent;
        }

        .app-navbar .offcanvas-body .mobile-nav-feedback:active,
        .app-navbar .offcanvas-body .mobile-nav-feedback:focus,
        .app-navbar .offcanvas-body .mobile-nav-feedback:focus-visible {
            background: color-mix(in srgb, var(--accent-light) 72%, transparent);
            box-shadow: none;
            outline: none;
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
                padding: 7px var(--gutter-tight);
            }

            .app-navbar-logo {
                height: 46px;
            }
        }

        @media (max-width: 768px) {
            :root {
                --nav-h: 64px;
            }

            .navbar-shell {
                gap: 8px;
            }

            .app-navbar-logo {
                height: 46px;
                max-width: none;
                flex-shrink: 0;
            }
        }

        @media (max-width: 480px) {
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

        .landing-page {
            animation: fadeIn 0.4s ease-out;
        }

        /* Auth page styles live in resources/sass/app.scss (.auth-page) */

        @media (max-width: 767.98px) {
            .navbar-shell {
                min-height: var(--nav-h);
                /* Physical insets so the trailing hamburger is never flush/clipped */
                padding-block: 8px;
                padding-left: max(0.85rem, env(safe-area-inset-left, 0px));
                padding-right: max(0.85rem, env(safe-area-inset-right, 0px));
                gap: 8px;
                flex-wrap: nowrap;
                align-items: center;
                /* Was overflow:hidden — clipped the toggler's right border/radius */
                overflow: visible;
            }

            .navbar-brand {
                flex: 1 1 auto;
                min-width: 0;
                max-width: 60%;
            }

            .app-navbar-logo {
                height: 40px;
                width: auto;
                max-width: none;
                object-fit: contain;
                flex-shrink: 0;
            }

            .app-navbar-logo--full.app-navbar-logo--light {
                display: block;
            }

            .app-navbar-logo--full.app-navbar-logo--dark {
                display: none;
            }

            html[data-theme="dark"] .app-navbar-logo--full.app-navbar-logo--light {
                display: none;
            }

            html[data-theme="dark"] .app-navbar-logo--full.app-navbar-logo--dark {
                display: block;
            }

            .app-navbar-logo--mark {
                display: none;
            }

            .navbar-quick-actions {
                flex: 0 0 auto;
                min-width: 0;
                gap: 2px !important;
                align-items: center;
            }

            .app-theme-toggle,
            .navbar-toggler,
            .app-user-toggle {
                width: var(--nav-icon);
                min-width: var(--tap);
                height: var(--nav-icon);
                min-height: var(--tap);
                padding: 0;
                border-radius: 10px;
                justify-content: center;
            }

            .navbar-quick-actions > .global-lang-switcher {
                max-width: min(40vw, 9rem);
            }

            .app-lang-label {
                font-size: 0.74rem;
                max-width: 3.75rem;
            }

            .app-user-toggle {
                gap: 0;
                width: var(--tap);
                min-width: var(--tap);
                height: var(--tap);
                min-height: var(--tap);
                padding: 0;
                border-radius: 10px;
                justify-content: center;
            }

            .app-user-toggle > span:last-of-type,
            .app-user-toggle .bi-chevron-down {
                display: none;
            }

            .app-user-avatar {
                width: 28px;
                height: 28px;
                font-size: 12px;
            }

            .app-navbar .offcanvas-lg {
                --bs-offcanvas-width: 100vw;
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
        }

        .billing-page {
            padding-block: 42px 64px;
        }

        .profile-page,
        .admin-page {
            padding-block: calc(var(--nav-h) + 16px) 32px;
        }

        .shell.profile-page,
        .profile-page.shell {
            max-width: var(--profile-max);
        }

        .profile-stage {
            display: grid;
            gap: 20px;
        }

        .profile-layout {
            display: grid;
            gap: 16px;
        }

        .profile-hero-identity {
            display: flex;
            gap: 14px;
            align-items: flex-start;
        }

        .profile-avatar {
            flex: 0 0 auto;
            width: 56px;
            height: 56px;
            border-radius: 16px;
            object-fit: cover;
            background: var(--accent-light);
            border: 1px solid color-mix(in srgb, var(--accent) 18%, var(--border));
        }

        .profile-avatar--initials {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            color: var(--accent-strong);
            font-weight: 800;
            letter-spacing: 0.02em;
        }

        .profile-field-label-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 12px;
            align-items: center;
            justify-content: space-between;
        }

        .profile-badge {
            display: inline-flex;
            align-items: center;
            min-height: 28px;
            padding: 0 10px;
            border-radius: 999px;
            font-size: 0.72rem;
            font-weight: 750;
            letter-spacing: 0.03em;
            text-transform: uppercase;
        }

        .profile-badge--verified {
            background: var(--success-bg);
            color: var(--success-text);
        }

        .profile-badge--unverified,
        .profile-badge--pending {
            background: var(--warning-bg);
            color: var(--warning-text);
        }

        .profile-inline-actions {
            display: flex;
            flex-wrap: wrap;
            gap: 8px 14px;
            margin-top: 12px;
        }

        .profile-inline-actions form {
            margin: 0;
        }

        .profile-text-btn {
            min-height: 44px;
            padding: 0 4px;
            border: 0;
            background: transparent;
            color: var(--accent-strong);
            font-size: 0.88rem;
            font-weight: 650;
            text-decoration: underline;
            text-underline-offset: 3px;
            cursor: pointer;
        }

        .profile-text-btn:hover,
        .profile-text-btn:focus-visible {
            color: var(--text);
            outline: none;
        }

        .profile-text-btn:focus-visible {
            box-shadow: 0 0 0 3px color-mix(in srgb, var(--accent) 28%, transparent);
            border-radius: 8px;
        }

        .profile-pref-stack,
        .profile-pref-grid {
            display: grid;
            gap: 20px;
        }

        .profile-pref-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .profile-pref-block {
            display: grid;
            gap: 10px;
            align-content: start;
        }

        .profile-pref-title {
            margin: 0;
            font-size: 0.95rem;
            font-weight: 750;
            letter-spacing: -0.01em;
        }

        .profile-pref-value {
            margin: 0;
            font-size: 1.05rem;
            font-weight: 650;
            letter-spacing: -0.02em;
            line-height: 1.4;
        }

        .profile-empty {
            display: grid;
            gap: 12px;
            padding: 14px 16px;
            border-radius: 16px;
            background: color-mix(in srgb, var(--surface-elevated) 80%, transparent);
            border: 1px dashed color-mix(in srgb, var(--border) 85%, transparent);
        }

        .profile-empty p {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.9rem;
            line-height: 1.55;
        }

        .profile-choice-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(7.5rem, 1fr));
            gap: 8px;
        }

        .profile-choice-grid--wrap {
            grid-template-columns: repeat(auto-fit, minmax(8.5rem, 1fr));
        }

        .profile-choice {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
            min-height: 44px;
            padding: 8px 12px;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            background: var(--field-bg);
            color: var(--text);
            font-size: 0.88rem;
            font-weight: 650;
            cursor: pointer;
            transition:
                background 160ms ease,
                border-color 160ms ease,
                color 160ms ease,
                box-shadow 160ms ease;
        }

        .profile-choice:hover {
            border-color: color-mix(in srgb, var(--accent) 35%, var(--border));
        }

        .profile-choice:focus-visible,
        .profile-form .form-control:focus-visible,
        .profile-password-toggle:focus-visible,
        .profile-submit-btn:focus-visible,
        .profile-action-btn:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
        }

        .profile-choice[aria-pressed="true"],
        .profile-choice[aria-checked="true"],
        .profile-choice.is-selected {
            border-color: var(--accent);
            background: var(--accent);
            color: var(--text-on-accent);
            box-shadow: none;
        }

        .profile-choice[aria-pressed="true"]:hover,
        .profile-choice[aria-checked="true"]:hover,
        .profile-choice.is-selected:hover {
            border-color: var(--accent-strong);
            background: var(--accent-strong);
            color: var(--text-on-accent);
        }

        .profile-choice:disabled {
            opacity: 0.55;
            cursor: wait;
        }

        .profile-security {
            display: flex;
            flex-wrap: nowrap;
            gap: 16px 32px;
            align-items: start;
        }

        .profile-link-google {
            color: var(--accent-strong);
            font-weight: 650;
            text-underline-offset: 3px;
        }

        .profile-link-google:focus-visible {
            outline: 2px solid var(--accent);
            outline-offset: 2px;
            border-radius: 4px;
        }

        .profile-account {
            display: grid;
            gap: 16px;
        }

        .profile-kicker-row {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
        }

        .profile-kicker--admin {
            background: color-mix(in srgb, var(--text) 10%, var(--surface-elevated));
            color: var(--text);
            border: 1px solid color-mix(in srgb, var(--border) 85%, transparent);
        }

        .profile-field-note {
            margin: 0;
            font-size: 0.8rem;
            color: var(--text-muted);
            line-height: 1.5;
        }

        .profile-signin-methods {
            margin: 0;
            padding: 2px 0 0;
            flex: 0 1 17.5rem;
            min-width: 0;
        }

        .profile-signin-methods__title {
            margin: 0 0 8px;
            font-size: 0.8rem;
            font-weight: 700;
            letter-spacing: -0.01em;
        }

        .profile-signin-methods__list {
            list-style: none;
            margin: 0;
            padding: 0;
            display: grid;
            gap: 8px;
        }

        .profile-signin-methods__list li {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            align-items: center;
            color: var(--text-muted);
            font-size: 0.82rem;
            line-height: 1.4;
        }

        .profile-signin-methods__list i {
            flex: 0 0 auto;
            color: var(--text);
            font-size: 0.9rem;
        }

        .profile-signin-methods__list span {
            flex: 1 1 8rem;
            min-width: 0;
        }

        .profile-signin-methods .profile-link-google {
            margin-inline-start: 0;
            font-size: 0.82rem;
        }

        .profile-danger {
            border: 1px dashed color-mix(in srgb, var(--border) 80%, #a35a4a 20%);
            background: color-mix(in srgb, var(--surface-strong) 94%, #a35a4a 3%);
        }

        .profile-danger-grid {
            display: grid;
            gap: 12px;
        }

        .profile-danger-item {
            display: flex;
            flex-wrap: wrap;
            gap: 12px 16px;
            align-items: center;
            justify-content: space-between;
            padding: 4px 0 0;
        }

        .profile-danger-item__copy {
            flex: 1 1 14rem;
            min-width: 0;
        }

        .profile-danger-item strong {
            display: block;
            margin-bottom: 4px;
            font-size: 0.98rem;
        }

        .profile-danger-item p {
            margin: 0;
            color: var(--text-muted);
            font-size: 0.86rem;
            line-height: 1.55;
            max-width: 48ch;
        }

        .profile-danger-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            min-height: 44px;
            padding: 0 16px;
            border-radius: 12px;
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            background: transparent;
            color: var(--text-muted);
            font-size: 0.86rem;
            font-weight: 650;
            cursor: pointer;
            white-space: nowrap;
            flex: 0 0 auto;
        }

        .profile-danger-btn:hover,
        .profile-danger-btn:focus-visible {
            color: var(--text);
            border-color: color-mix(in srgb, var(--border) 70%, var(--text-muted));
            outline: none;
        }

        .profile-danger-btn--delete {
            border-color: color-mix(in srgb, #a35a4a 35%, var(--border));
            color: #8b4a3c;
        }

        .profile-danger-btn--delete:hover,
        .profile-danger-btn--delete:focus-visible {
            border-color: color-mix(in srgb, #a35a4a 55%, var(--border));
            color: #7a3f34;
            background: color-mix(in srgb, #a35a4a 8%, transparent);
        }

        .profile-danger-btn:disabled {
            opacity: 0.45;
            cursor: not-allowed;
        }

        .profile-dialog {
            width: min(100% - 2rem, 420px);
            max-width: calc(100vw - 2rem);
            margin: auto;
            padding: 0;
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            border-radius: 20px;
            background: var(--surface-strong);
            color: var(--text);
            box-shadow: 0 24px 60px color-mix(in srgb, var(--text) 18%, transparent);
        }

        .profile-dialog::backdrop {
            background: color-mix(in srgb, var(--text) 35%, transparent);
        }

        .profile-dialog__panel {
            display: grid;
            gap: 14px;
            padding: 22px;
        }

        .profile-dialog__panel h2 {
            margin: 0;
            font-size: 1.25rem;
            letter-spacing: -0.02em;
        }

        .profile-dialog__panel > p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.6;
        }

        .profile-dialog__actions {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            justify-content: flex-end;
            margin-top: 4px;
        }

        .profile-dialog__actions .profile-danger-btn {
            flex: 1 1 auto;
            min-width: min(100%, 8.5rem);
        }

        @media (max-width: 767.98px) {
            .profile-danger-item {
                flex-direction: column;
                align-items: stretch;
                justify-content: flex-start;
            }

            /* Row flex-basis (14rem) becomes height in column mode — collapse it. */
            .profile-danger-item__copy {
                flex: 0 0 auto;
            }

            .profile-danger-btn,
            .profile-danger-btn--delete {
                width: 100%;
                margin-top: 0;
            }

            .profile-dialog__actions {
                flex-direction: column-reverse;
            }

            .profile-dialog__actions .profile-danger-btn {
                width: 100%;
            }
        }

        .profile-hero-card {
            display: grid;
            gap: 16px;
            align-items: stretch;
            position: relative;
            grid-template-columns: minmax(0, 1.25fr) minmax(240px, 0.75fr);
            padding: clamp(16px, 2.5vw, 22px);
            border-radius: 20px;
            overflow: hidden;
            background: color-mix(in srgb, var(--surface-strong) 94%, var(--surface-elevated));
            border: 1px solid color-mix(in srgb, var(--accent) 14%, var(--border));
        }

        .admin-page-head {
            display: flex;
            gap: 18px;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 24px;
        }

        .profile-hero-card::after {
            display: none;
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
            justify-items: stretch;
            padding: 14px 16px;
            border-radius: 18px;
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
            font-size: clamp(28px, 3.2vw, 40px);
            line-height: 1.05;
            letter-spacing: -0.04em;
        }

        .profile-hero-copy p,
        .admin-page-head p {
            max-width: 52ch;
            margin-bottom: 0;
            color: var(--text-muted);
            line-height: 1.55;
            font-size: 0.95rem;
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

        .profile-summary-copy {
            display: grid;
            gap: 10px;
            align-content: start;
        }

        .profile-summary-plan {
            font-size: clamp(20px, 2vw, 28px);
            line-height: 1.1;
            letter-spacing: -0.03em;
            color: var(--text);
        }

        .profile-summary-meta {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.55;
            font-size: 0.88rem;
        }

        .profile-hero-actions,
        .profile-subscription-actions,
        .admin-filter-tabs,
        .admin-message-actions {
            display: flex;
            gap: 12px;
            flex-wrap: wrap;
        }

        .profile-hero-actions {
            justify-content: flex-end;
            align-items: center;
            margin-top: 4px;
        }

        .profile-hero-actions .billing-primary-btn,
        .profile-hero-actions .billing-secondary-btn {
            display: inline-flex;
            align-items: center;
            gap: 0.45rem;
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

        .profile-hero-actions .profile-upgrade-btn,
        .profile-hero-actions .billing-primary-btn.profile-action-btn {
            width: auto;
            min-width: 0;
            flex: 0 0 auto;
            white-space: nowrap;
        }

        .profile-hero-actions .billing-secondary-btn.profile-action-btn {
            width: auto;
            min-width: 0;
            flex: 0 0 auto;
        }

        .profile-grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
            align-items: stretch;
        }

        .profile-card {
            padding: 0;
            border: 0;
            border-radius: 0;
            background: transparent;
        }

        .profile-pane {
            padding: 18px;
            border-radius: 20px;
            background: color-mix(in srgb, var(--surface-strong) 92%, var(--surface-elevated));
            border: 1px solid color-mix(in srgb, var(--accent) 10%, var(--border));
        }

        .profile-grid > .profile-pane {
            display: flex;
            flex-direction: column;
            height: 100%;
            min-height: 100%;
        }

        .profile-card--details .profile-form {
            flex: 1 1 auto;
            display: flex;
            flex-direction: column;
            gap: 14px;
        }

        .profile-card--details .profile-submit-btn--save {
            margin-top: auto;
            align-self: start;
        }

        .profile-card--password {
            padding: 16px 18px;
            width: fit-content;
            max-width: 100%;
            justify-self: start;
        }

        .profile-card--password .profile-card-head {
            margin-bottom: 12px;
            padding-bottom: 10px;
        }

        .profile-card--password .profile-card-head h2 {
            margin-bottom: 2px;
            font-size: 1.05rem;
        }

        .profile-card--password .profile-card-head p {
            font-size: 0.8rem;
            line-height: 1.4;
        }

        .profile-card--password .profile-password-form {
            display: grid;
            gap: 8px;
            flex: 0 0 20rem;
            width: 20rem;
            max-width: 100%;
        }

        .profile-card--password .profile-field {
            gap: 0.2rem;
        }

        .profile-card--password .profile-form .form-label {
            font-size: 0.8rem;
            font-weight: 650;
            margin-bottom: 0;
        }

        .profile-card--password .profile-form .form-control,
        .profile-card--password .profile-form .profile-password-input.form-control {
            min-height: 40px;
            border-radius: 10px;
            padding-inline: 12px;
        }

        .profile-card--password .profile-password-toggle {
            width: 34px;
            height: 34px;
        }

        .profile-card--password .profile-submit-btn {
            justify-self: start;
            width: auto;
            min-width: 0;
            min-height: 40px;
            padding-inline: 14px;
            border-radius: 10px;
            font-size: 0.86rem;
        }

        .profile-card-wide {
            width: 100%;
        }

        .profile-card-head {
            margin-bottom: 14px;
            padding-bottom: 12px;
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
            display: flex;
            align-items: center;
            gap: 0.55rem;
            margin-bottom: 4px;
            font-size: 1.15rem;
            letter-spacing: -0.02em;
        }

        .profile-card-head h2 i,
        .admin-message-title-row h2 i {
            flex: 0 0 auto;
            color: var(--accent-strong);
            font-size: 1rem;
        }

        .profile-card-head p,
        .admin-message-head p {
            margin: 0;
            color: var(--text-muted);
            line-height: 1.55;
            font-size: 0.9rem;
        }

        .profile-form {
            display: grid;
            gap: 14px;
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
            box-shadow: none;
        }

        .profile-form .form-control:hover {
            border-color: color-mix(in srgb, var(--border) 70%, var(--text-muted));
            background: color-mix(in srgb, var(--field-bg) 88%, var(--surface-elevated));
        }

        .profile-form .form-control:focus {
            border-color: var(--accent);
            background: var(--field-bg-strong);
            box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--accent) 18%, transparent);
            outline: none;
        }

        .profile-form .form-control.is-invalid {
            border-color: color-mix(in srgb, var(--danger-text) 55%, var(--border));
        }

        .profile-field {
            display: grid;
            gap: 0.45rem;
        }

        .profile-password-wrap {
            position: relative;
            display: grid;
        }

        .profile-password-input,
        .profile-form .profile-password-input.form-control {
            border: 1px solid color-mix(in srgb, var(--border) 90%, transparent);
            background: var(--field-bg);
            color: var(--text);
            padding-inline-end: 2.85rem;
            box-shadow: none;
        }

        .profile-password-input:hover,
        .profile-form .profile-password-input.form-control:hover {
            border-color: color-mix(in srgb, var(--border) 70%, var(--text-muted));
            background: color-mix(in srgb, var(--field-bg) 88%, var(--surface-elevated));
        }

        .profile-password-input:focus,
        .profile-form .profile-password-input.form-control:focus {
            border-color: var(--accent);
            background: var(--field-bg-strong);
            box-shadow: 0 0 0 0.2rem color-mix(in srgb, var(--accent) 18%, transparent);
            outline: none;
        }

        .profile-password-input.is-invalid,
        .profile-form .profile-password-input.form-control.is-invalid {
            border-color: color-mix(in srgb, var(--danger-text) 55%, var(--border));
        }

        .profile-submit-btn--save {
            justify-self: start;
            align-self: start;
        }

        .profile-password-toggle {
            position: absolute;
            inset-inline-end: 0.2rem;
            top: 50%;
            transform: translateY(-50%);
            width: 40px;
            height: 40px;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            border: 0;
            background: transparent;
            color: var(--text-muted);
            border-radius: 10px;
            cursor: pointer;
        }

        .profile-password-toggle:hover,
        .profile-password-toggle:focus-visible {
            color: var(--text);
            outline: none;
            background: color-mix(in srgb, var(--surface) 70%, transparent);
        }

        .profile-password-strength {
            display: grid;
            gap: 0.35rem;
            margin-top: 0.15rem;
        }

        .profile-password-strength__track {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            gap: 0.35rem;
        }

        .profile-password-strength__track span {
            height: 4px;
            border-radius: 999px;
            background: #e5e0db;
        }

        html[data-theme="dark"] .profile-password-strength__track span {
            background: color-mix(in srgb, var(--border) 80%, transparent);
        }

        .profile-password-strength[data-level="weak"] .profile-password-strength__track span:nth-child(1) {
            background: #c47a6a;
        }

        .profile-password-strength[data-level="fair"] .profile-password-strength__track span:nth-child(-n+2) {
            background: #c4a35a;
        }

        .profile-password-strength[data-level="strong"] .profile-password-strength__track span {
            background: #5f7d5a;
        }

        .profile-password-strength__label {
            margin: 0;
            font-size: 0.78rem;
            font-weight: 650;
            color: var(--text-muted);
        }

        .profile-password-strength[data-level="weak"] .profile-password-strength__label { color: #a35a4a; }
        .profile-password-strength[data-level="fair"] .profile-password-strength__label { color: #9a7a2f; }
        .profile-password-strength[data-level="strong"] .profile-password-strength__label { color: #4f6d4c; }

        .profile-field-error {
            min-height: 1.1em;
            margin: 0;
            font-size: 0.8rem;
            color: #a35a4a;
        }

        .profile-field-error:empty {
            display: none;
        }

        .profile-submit-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.45rem;
            transition:
                opacity 200ms ease,
                filter 200ms ease,
                transform 200ms ease,
                background 200ms ease,
                border-color 200ms ease,
                box-shadow 200ms ease;
        }

        .profile-submit-btn:disabled {
            opacity: 0.5;
            cursor: not-allowed;
            transform: none;
            filter: grayscale(0.15);
            box-shadow: none;
        }

        .profile-submit-btn:not(:disabled) {
            opacity: 1;
            filter: none;
        }

        .profile-submit-btn.is-loading,
        .profile-submit-btn.is-success {
            opacity: 1;
            cursor: wait;
        }

        .profile-submit-btn.is-success {
            cursor: default;
            border-color: color-mix(in srgb, #5f7d5a 55%, var(--accent));
            background: color-mix(in srgb, #5f7d5a 88%, var(--accent));
        }

        .profile-submit-btn__state {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 0.4rem;
        }

        .profile-submit-btn__spinner {
            display: inline-block;
            animation: profile-spin 0.8s linear infinite;
        }

        @keyframes profile-spin {
            to { transform: rotate(360deg); }
        }

        .profile-toast {
            position: sticky;
            top: calc(var(--nav-h, 64px) + 12px);
            z-index: 20;
            width: fit-content;
            max-width: min(100%, 28rem);
            margin-inline: auto;
            padding: 0.75rem 1rem;
            border-radius: 14px;
            border: 1px solid color-mix(in srgb, #5f7d5a 28%, var(--border));
            background: color-mix(in srgb, #5f7d5a 14%, var(--surface-strong));
            color: var(--text);
            font-size: 0.9rem;
            font-weight: 600;
            box-shadow: 0 8px 24px rgba(60, 53, 48, 0.08);
            opacity: 0;
            transform: translateY(-6px);
            transition: opacity 180ms ease, transform 180ms ease;
            pointer-events: none;
        }

        .profile-toast.is-visible {
            opacity: 1;
            transform: translateY(0);
        }

        .profile-subscription-grid {
            display: grid;
            grid-template-columns: repeat(3, minmax(0, 1fr));
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
            font-size: 18px;
            line-height: 1.35;
            font-weight: 650;
        }

        .profile-subscription-placeholder {
            color: var(--text-muted);
            font-size: 15px;
            font-weight: 500;
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

        /* Mobile drawer affordances stay inert outside the collapsed-nav breakpoint. */
        .nav-links-desktop .nav-link-icon,
        .nav-links-desktop .nav-link-chevron,
        .nav-links-desktop .nav-link-copy small,
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
                /* Shell owns horizontal inset — avoid double padding that squeezes actions */
                padding-inline: 0;
                z-index: var(--bs-offcanvas-zindex, 1045);
                overflow: visible;
            }

            /* Solid black navbar + drawer on mobile dark mode */
            html[data-theme="dark"] .app-navbar,
            [data-theme="dark"] .app-navbar {
                background: #000000 !important;
                background-color: #000000 !important;
                background-image: none !important;
            }

            .navbar-shell {
                box-sizing: border-box;
                width: 100%;
                max-width: 100%;
                margin: 0;
                overflow: visible;
            }

            .navbar-quick-actions {
                overflow: visible;
                /* Keep the hamburger fully inside the cell */
                padding-inline-end: 0.1rem;
            }

            .navbar-toggler {
                box-sizing: border-box;
                flex-shrink: 0;
            }

            .app-navbar-logo {
                height: 40px;
                max-width: none;
            }

            .app-navbar-logo--mark {
                max-width: 32px;
            }

            .app-navbar .offcanvas-lg {
                --bs-offcanvas-width: 100vw;
                width: 100vw !important;
                max-width: 100vw !important;
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
                padding-block: 16px 28px;
            }

            .profile-stage {
                gap: 16px;
            }

            .profile-account {
                gap: 16px;
            }

            .profile-account__header {
                display: grid;
                gap: 4px;
                padding-inline: 2px;
            }

            .profile-account__header h2 {
                font-size: 1.35rem;
                letter-spacing: -0.03em;
            }

            .profile-account .profile-card-head h2 {
                font-size: 1.15rem;
            }

            .profile-hero-card,
            .profile-grid,
            .profile-pref-grid,
            .billing-hero,
            .billing-grid {
                grid-template-columns: minmax(0, 1fr);
            }

            .profile-security {
                flex-wrap: wrap;
                flex-direction: column;
                gap: 16px;
            }

            .profile-card--password .profile-password-form,
            .profile-signin-methods {
                flex: 1 1 auto;
                max-width: none;
                width: 100%;
            }

            .profile-hero-card {
                gap: 16px;
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
                font-size: clamp(1.65rem, 7vw, 2.1rem);
                line-height: 1.08;
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
                gap: 16px;
            }

            .profile-card-head-split,
            .admin-page-head,
            .admin-message-head,
            .billing-confirmation {
                align-items: stretch;
                flex-direction: column;
            }

            .profile-hero-summary {
                display: flex;
                flex-direction: column;
                gap: 16px;
                align-items: stretch;
            }

            .profile-hero-actions,
            .profile-subscription-actions,
            .admin-message-actions,
            .billing-confirmation-actions {
                display: flex;
                flex-direction: column;
                gap: 12px;
                width: 100%;
                min-width: 0;
            }

            .profile-hero-actions form,
            .profile-subscription-actions form,
            .admin-message-actions form,
            .profile-action-btn,
            .profile-submit-btn,
            .profile-card--password .profile-submit-btn,
            .billing-confirmation-actions,
            .billing-confirmation-actions form {
                width: 100%;
                min-width: 0;
                justify-self: stretch;
            }

            .profile-hero-actions .profile-action-btn,
            .profile-hero-actions .profile-upgrade-btn {
                width: 100%;
                min-width: 0;
                min-height: 44px;
            }

            .profile-card--details {
                padding-bottom: calc(16px + env(safe-area-inset-bottom, 0px));
            }

            .profile-submit-btn--save {
                position: sticky;
                bottom: max(12px, env(safe-area-inset-bottom, 0px));
                z-index: 30;
                width: 100%;
                min-height: 48px;
                justify-self: stretch;
                box-shadow:
                    0 0 0 1px color-mix(in srgb, var(--accent) 18%, transparent),
                    0 10px 28px color-mix(in srgb, var(--text) 16%, transparent);
            }

            .profile-subscription-grid {
                grid-template-columns: 1fr;
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
                display: flex !important;
                flex-wrap: nowrap;
                align-items: center;
                justify-content: flex-end;
                gap: clamp(4px, 1.6vw, 8px) !important;
                min-width: 0;
                overflow: visible;
            }

            .navbar-quick-actions > .dropdown:not(.global-lang-switcher):not(.global-theme-switcher),
            .navbar-quick-actions > button:not(.app-lang-toggle) {
                flex: 0 0 auto;
                width: var(--tap);
                min-width: var(--tap);
                max-width: var(--tap);
                box-sizing: border-box;
            }

            .navbar-quick-actions > .global-theme-switcher {
                flex: 0 0 auto;
                width: var(--tap);
                min-width: var(--tap);
                max-width: var(--tap);
                overflow: visible;
            }

            .navbar-quick-actions > .global-lang-switcher {
                flex: 0 1 auto;
                width: auto !important;
                min-width: 0;
                max-width: min(44vw, 10rem);
            }

            .app-navbar .offcanvas-lg {
                display: grid;
                grid-template-rows: auto minmax(0, 1fr);
                --bs-offcanvas-width: 100vw;
                --bs-offcanvas-bg: var(--surface-strong);
                width: 100vw !important;
                max-width: 100vw !important;
                background: var(--surface-strong);
                background-image: none;
                border-inline-start: 0;
                box-shadow: none;
            }

            /* Solid black menu panel — translucent --surface was showing mushaf through */
            html[data-theme="dark"] .app-navbar .offcanvas-lg,
            [data-theme="dark"] .app-navbar .offcanvas-lg,
            html[data-theme="dark"] .app-navbar .offcanvas-lg.show,
            [data-theme="dark"] .app-navbar .offcanvas-lg.show,
            html[data-theme="dark"] .app-navbar .offcanvas-lg .offcanvas-header,
            [data-theme="dark"] .app-navbar .offcanvas-lg .offcanvas-header,
            html[data-theme="dark"] .app-navbar .offcanvas-lg .offcanvas-body,
            [data-theme="dark"] .app-navbar .offcanvas-lg .offcanvas-body,
            html[data-theme="dark"] #primaryNavbar,
            [data-theme="dark"] #primaryNavbar,
            html[data-theme="dark"] #primaryNavbar .offcanvas-header,
            [data-theme="dark"] #primaryNavbar .offcanvas-header,
            html[data-theme="dark"] #primaryNavbar .offcanvas-body,
            [data-theme="dark"] #primaryNavbar .offcanvas-body {
                --bs-offcanvas-bg: #000000;
                background: #000000 !important;
                background-color: #000000 !important;
                background-image: none !important;
                opacity: 1 !important;
            }

            .app-navbar .offcanvas-header {
                display: grid;
                grid-template-columns: minmax(0, 1fr) 44px;
                gap: 10px;
                align-items: center;
                min-height: 56px;
                padding: max(12px, env(safe-area-inset-top)) 16px 12px;
                border-bottom: 1px solid var(--border);
            }

            .mobile-nav-identity {
                display: flex;
                align-items: center;
                gap: 12px;
                min-width: 0;
            }

            .mobile-nav-identity-avatar {
                flex: 0 0 auto;
                width: 40px;
                height: 40px;
                font-size: 0.95rem;
            }

            .mobile-nav-identity-copy {
                min-width: 0;
            }

            .mobile-nav-identity .offcanvas-title {
                margin: 0;
                color: var(--text);
                font-size: 1.05rem;
                font-weight: 650;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
            }

            .mobile-nav-identity-meta {
                color: var(--text-muted);
                font-size: 0.74rem;
                line-height: 1.3;
            }

            /* Single menu trigger on phone: hide the separate profile control. */
            .navbar-quick-actions > #userDropdown {
                display: none !important;
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
                font-family: inherit;
                font-weight: 500;
                line-height: 1.2;
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
                margin: 0;
                min-width: 0;
            }

            .app-navbar .offcanvas-body .mobile-nav-logout {
                grid-template-columns: 44px minmax(0, 1fr);
                width: 100%;
                border: 0;
                background: transparent;
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
                justify-self: stretch;
            }

            .profile-card-head-split {
                display: grid;
                grid-template-columns: minmax(0, 1fr) auto;
                gap: 10px;
                align-items: start;
            }

            .profile-subscription-grid > * {
                grid-column: 1 / -1;
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

            /* Profile: override phone 4-col shell so plan CTA and sections stack cleanly */
            .profile-stage {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                grid-template-columns: unset !important;
            }

            .profile-account {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                grid-column: 1 / -1;
                min-width: 0;
            }

            .profile-hero-card {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                grid-template-columns: unset !important;
            }

            .profile-hero-copy,
            .profile-hero-summary {
                grid-column: auto !important;
                width: 100%;
            }

            .profile-hero-summary {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                grid-template-columns: unset !important;
            }

            .profile-summary-copy {
                width: 100%;
            }

            .profile-hero-actions {
                display: flex !important;
                flex-direction: column !important;
                gap: 12px !important;
                width: 100%;
                margin-top: 0;
                grid-template-columns: unset !important;
            }

            .profile-hero-actions > * {
                grid-column: auto !important;
                width: 100%;
            }

            .profile-grid {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px !important;
                grid-template-columns: unset !important;
            }

            .profile-pref-grid {
                display: grid !important;
                grid-template-columns: minmax(0, 1fr) !important;
                gap: 16px !important;
            }

            .profile-security {
                flex-wrap: wrap;
                flex-direction: column;
                gap: 16px;
            }

            .profile-hero-identity {
                align-items: center;
            }

            .profile-grid > * {
                grid-column: auto !important;
                width: 100%;
            }

            .profile-card-wide {
                margin-top: 0;
            }
        }

        @media (max-width: 479.98px) {
            .profile-hero-copy,
            .profile-hero-summary {
                grid-column: 1 / -1;
            }

            .profile-hero-summary {
                display: flex !important;
                flex-direction: column !important;
                gap: 16px;
                align-items: stretch;
            }

            .profile-summary-copy {
                grid-column: 1 / -1;
            }

            .profile-hero-summary > .profile-hero-actions {
                grid-column: 1 / -1;
                display: flex !important;
                flex-direction: column !important;
                justify-content: stretch;
                width: 100%;
            }

            .profile-hero-summary .profile-action-btn,
            .profile-hero-summary .profile-upgrade-btn {
                width: 100%;
                min-width: 0;
                min-height: 44px;
            }
        }

        @media (max-width: 349.98px) {
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

            .profile-subscription-grid > *,
            .billing-actions > * {
                grid-column: 1 / -1;
            }
        }
    </style>
    <style id="mutqin-mobile-fullbleed-nav-notes">
      /* Force full-bleed mobile menu + notes modal (last-wins over Bootstrap / inset chrome). */
      @media (max-width: 991.98px) {
        #primaryNavbar.offcanvas,
        #primaryNavbar.offcanvas-lg,
        .app-navbar #primaryNavbar {
          --bs-offcanvas-width: 100% !important;
          --bs-offcanvas-border-width: 0 !important;
          position: fixed !important;
          inset: 0 !important;
          width: 100% !important;
          max-width: 100% !important;
          height: 100% !important;
          max-height: 100% !important;
          border: 0 !important;
          transform: translateX(100%);
        }

        html[dir="rtl"] #primaryNavbar.offcanvas-end {
          transform: translateX(-100%);
        }

        #primaryNavbar.offcanvas.show,
        #primaryNavbar.offcanvas.showing,
        #primaryNavbar.offcanvas-lg.show,
        #primaryNavbar.offcanvas-lg.showing,
        html[dir="rtl"] #primaryNavbar.offcanvas-end.show,
        html[dir="rtl"] #primaryNavbar.offcanvas-end.showing {
          transform: none !important;
        }

        html[data-theme="dark"] #primaryNavbar,
        html[data-theme="dark"] #primaryNavbar .offcanvas-header,
        html[data-theme="dark"] #primaryNavbar .offcanvas-body,
        [data-theme="dark"] #primaryNavbar,
        [data-theme="dark"] #primaryNavbar .offcanvas-header,
        [data-theme="dark"] #primaryNavbar .offcanvas-body {
          --bs-offcanvas-bg: #000 !important;
          background: #000 !important;
          background-color: #000 !important;
          background-image: none !important;
        }

        .ayah-notes-modal-overlay.modal-overlay.mutqin-modal-overlay {
          padding: 0 !important;
          place-items: stretch !important;
          align-items: stretch !important;
          justify-items: stretch !important;
        }

        .ayah-notes-modal-overlay > .ayah-notes-dialog.mutqin-modal-dialog,
        .ayah-notes-dialog.mutqin-modal-dialog,
        .ayah-notes-dialog {
          width: 100% !important;
          max-width: 100% !important;
          min-width: 0 !important;
          inline-size: 100% !important;
          max-inline-size: 100% !important;
          height: 100% !important;
          max-height: 100dvh !important;
          margin: 0 !important;
          border-radius: 0 !important;
        }

        .mutqin-modal-surface.ayah-notes-modal {
          width: 100% !important;
          max-width: 100% !important;
          height: 100% !important;
          max-height: 100dvh !important;
          border-radius: 0 !important;
          border: 0 !important;
        }

        .ayah-notes-modal .ayah-notes-header,
        .mutqin-modal-surface.ayah-notes-modal > .ayah-notes-header.modal-header {
          padding-top: max(1rem, env(safe-area-inset-top, 0px)) !important;
        }

        .ayah-notes-modal-body,
        .mutqin-modal-surface.ayah-notes-modal .ayah-notes-modal-body {
          padding-bottom: max(1rem, env(safe-area-inset-bottom, 0px)) !important;
        }
      }
    </style>
</head>
<body dir="{{ $appDirection }}">
    <nav class="navbar navbar-expand-lg app-navbar" aria-label="{{ __('ui.primary_navigation') }}">
        <div class="container-fluid shell navbar-shell">
            <a class="navbar-brand" href="{{ route('home') }}" aria-label="{{ __('ui.mutqin_brand') }}">
                <img
                    src="/images/logo.png"
                    alt=""
                    class="app-navbar-logo app-navbar-logo--full app-navbar-logo--light"
                >
                <img
                    src="/images/dark_logo.png"
                    alt=""
                    class="app-navbar-logo app-navbar-logo--full app-navbar-logo--dark"
                >
                <img
                    id="appNavbarLogoMark"
                    src="/images/logo_main.png"
                    alt=""
                    class="app-navbar-logo app-navbar-logo--mark"
                >
            </a>

            <div class="offcanvas offcanvas-end offcanvas-lg" tabindex="-1" id="primaryNavbar" aria-labelledby="primaryNavbarLabel">
                <div class="offcanvas-header">
                    <div class="mobile-nav-identity">
                        @auth
                            <span class="app-user-avatar mobile-nav-identity-avatar" aria-hidden="true">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                            <div class="mobile-nav-identity-copy">
                                <h2 class="offcanvas-title h5 mb-0" id="primaryNavbarLabel">{{ Auth::user()->name ?? __('ui.user') }}</h2>
                                <p class="mobile-nav-identity-meta mb-0">{{ __('ui.menu') }}</p>
                            </div>
                        @else
                            <h2 class="offcanvas-title h5 mb-0" id="primaryNavbarLabel">{{ __('ui.menu') }}</h2>
                        @endauth
                    </div>
                    <button type="button" class="btn-close btn-close-white" data-bs-dismiss="offcanvas" data-bs-target="#primaryNavbar" aria-label="{{ __('ui.close_navigation') }}"></button>
                </div>
                <div class="offcanvas-body d-flex flex-column flex-lg-row align-items-lg-center gap-3 pt-3 pt-lg-0">
                    <div class="navbar-nav-shell d-flex justify-content-lg-center">
                        <div class="navbar-nav nav-links-desktop gap-2 gap-lg-3 justify-content-lg-center">
                            <a class="nav-link nav-link-home {{ request()->routeIs('home') ? 'active' : '' }}" href="{{ route('home') }}">
                                <i class="bi bi-house-door nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="home">{{ __('ui.home') }}</strong><small class="d-lg-none">{{ __('ui.nav_home_sub') }}</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link nav-link-memorisation {{ request()->routeIs('memorisation') ? 'active' : '' }}" href="{{ route('memorisation') }}">
                                <i class="bi bi-journal-bookmark nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="memorisation">{{ __('ui.memorisation') }}</strong><small class="d-lg-none">{{ __('ui.nav_memorisation_sub') }}</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            @auth
                            @if (Auth::user()->isAdmin())
                            <a class="nav-link nav-link-dashboard {{ request()->routeIs('admin.*') ? 'active' : '' }}" href="{{ route('admin.dashboard') }}" data-tour="nav-dashboard">
                                <i class="bi bi-speedometer2 nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="dashboard">{{ __('ui.dashboard') }}</strong><small class="d-lg-none">{{ __('ui.nav_admin_dashboard_sub') }}</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            @else
                            <a class="nav-link nav-link-dashboard {{ request()->routeIs('dashboard') ? 'active' : '' }}" href="{{ route('dashboard') }}" data-tour="nav-dashboard">
                                <i class="bi bi-speedometer2 nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong data-i18n="dashboard">{{ __('ui.dashboard') }}</strong><small class="d-lg-none">{{ __('ui.nav_dashboard_sub') }}</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron d-lg-none" aria-hidden="true"></i>
                            </a>
                            @endif
                            @endauth
                        </div>
                    </div>

                    @guest
                        <div class="app-auth-links d-flex flex-column flex-lg-row align-items-stretch align-items-lg-center gap-2 gap-lg-0">
                            <a class="nav-link" href="{{ route('login') }}"><i class="bi bi-box-arrow-in-right nav-link-icon d-lg-none" aria-hidden="true"></i><span data-i18n="login">{{ __('ui.login') }}</span></a>
                            <a class="nav-link" href="{{ route('register') }}"><i class="bi bi-person-plus nav-link-icon d-lg-none" aria-hidden="true"></i><span data-i18n="register">{{ __('ui.register') }}</span></a>
                        </div>
                    @endguest
                    @auth
                        <div class="mobile-nav-account mobile-nav-only" aria-label="{{ __('ui.account') }}">
                            <span class="mobile-nav-section-label">{{ __('ui.account') }}</span>
                            <a class="nav-link {{ request()->routeIs('profile.*') ? 'active' : '' }}" href="{{ route('profile.show') }}">
                                <i class="bi bi-person nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy">
                                    <strong>{{ __('ui.profile') }}</strong>
                                    <small>{{ Auth::user()->isAdmin() ? __('profile.account_settings_desc_admin') : __('profile.account_settings_desc') }}</small>
                                </span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                            <a class="nav-link" href="{{ route('profile.show') }}#settings">
                                <i class="bi bi-gear nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>{{ __('ui.settings') }}</strong><small>{{ __('profile.change_password') }}</small></span>
                                <i class="bi bi-chevron-right nav-link-chevron" aria-hidden="true"></i>
                            </a>
                            <button type="button" class="nav-link mobile-nav-feedback" data-feedback-trigger="menu">
                                <i class="bi bi-chat-left-text nav-link-icon" aria-hidden="true"></i>
                                <span class="nav-link-copy"><strong>{{ __('ui.send_feedback') }}</strong></span>
                            </button>
                            <form method="POST" action="{{ route('logout') }}" class="mobile-nav-logout-form">
                                @csrf
                                <button type="submit" class="nav-link mobile-nav-logout">
                                    <i class="bi bi-box-arrow-right nav-link-icon" aria-hidden="true"></i>
                                    <span class="nav-link-copy"><strong data-i18n="logout">{{ __('ui.logout') }}</strong></span>
                                </button>
                            </form>
                        </div>
                    @endauth
                </div>
            </div>

            <div class="d-flex align-items-center gap-2 navbar-quick-actions">
                <div class="global-lang-switcher dropdown" aria-label="{{ __('ui.language_switcher') }}">
                    <button class="btn app-lang-toggle lang-btn-group" type="button" data-bs-toggle="dropdown" aria-expanded="false" aria-label="{{ $activeLocaleOption['label'] }}">
                        <span class="app-lang-flag" aria-hidden="true">{{ $activeLocaleOption['flag'] }}</span>
                        <span class="app-lang-label">{{ $activeLocaleOption['label'] }}</span>
                        <i class="bi bi-chevron-down app-lang-chevron" aria-hidden="true"></i>
                    </button>
                    <ul class="dropdown-menu dropdown-menu-end app-lang-menu">
                        @foreach ($appLocaleOptions as $localeCode => $localeOption)
                        <li>
                            <button
                                type="button"
                                class="dropdown-item lang-btn"
                                data-locale="{{ $localeCode }}"
                                data-flag="{{ $localeOption['flag'] }}"
                                data-label="{{ $localeOption['label'] }}"
                            >
                                <span class="lang-btn-flag" aria-hidden="true">{{ $localeOption['flag'] }}</span>
                                <span class="lang-btn-label">{{ $localeOption['label'] }}</span>
                            </button>
                        </li>
                        @endforeach
                    </ul>
                </div>

                <div class="global-theme-switcher dropdown" id="globalThemeSwitcher">
                    <button
                        id="globalThemeToggle"
                        class="btn app-theme-toggle"
                        type="button"
                        data-bs-toggle="dropdown"
                        data-bs-offset="0,8"
                        aria-expanded="false"
                        aria-haspopup="menu"
                        aria-controls="globalThemeMenu"
                        aria-label="{{ __('ui.theme_switcher') }}: {{ __('ui.'.$activeThemeMode['label_key']) }}"
                    >
                        <i class="bi {{ $activeThemeMode['icon'] }} app-theme-toggle-icon" aria-hidden="true"></i>
                        <span class="visually-hidden" data-theme-current-label>{{ __('ui.'.$activeThemeMode['label_key']) }}</span>
                    </button>
                    <ul
                        class="dropdown-menu dropdown-menu-end app-theme-menu"
                        id="globalThemeMenu"
                        role="menu"
                        aria-label="{{ __('ui.theme_switcher') }}"
                    >
                        @foreach ($appThemeModes as $mode)
                        <li role="none">
                            <button
                                type="button"
                                class="dropdown-item theme-btn{{ $mode['id'] === $appTheme ? ' active' : '' }}"
                                role="menuitemradio"
                                aria-checked="{{ $mode['id'] === $appTheme ? 'true' : 'false' }}"
                                data-theme-id="{{ $mode['id'] }}"
                            >
                                <span class="theme-btn-swatch" style="background: {{ $mode['background_color'] }}" aria-hidden="true"></span>
                                <i class="bi {{ $mode['icon'] }}" aria-hidden="true"></i>
                                <span class="theme-btn-label" data-i18n="{{ $mode['label_key'] }}">{{ __('ui.'.$mode['label_key']) }}</span>
                                <i class="bi bi-check2 theme-btn-check" aria-hidden="true"></i>
                            </button>
                        </li>
                        @endforeach
                    </ul>
                </div>

                @auth
                    {{-- Desktop/tablet account menu; hidden on phone where the offcanvas owns account actions. --}}
                    <div class="dropdown d-none d-md-block" id="userDropdown">
                        <button class="btn app-user-toggle" type="button" id="dropdownToggle" aria-expanded="false" aria-haspopup="menu" aria-controls="dropdownMenu">
                            <span class="app-user-avatar" aria-hidden="true">{{ strtoupper(substr(Auth::user()->name ?? 'U', 0, 1)) }}</span>
                            <span class="d-none d-lg-inline">{{ Auth::user()->name ?? __('ui.user') }}</span>
                            <i class="bi bi-chevron-down" aria-hidden="true"></i>
                        </button>
                        <ul class="dropdown-menu" id="dropdownMenu" role="menu">
                            <li>
                                <a
                                    class="dropdown-item"
                                    href="{{ Auth::user()->isAdmin() ? route('admin.dashboard') : route('dashboard') }}"
                                    role="menuitem"
                                >
                                    <i class="bi bi-speedometer2" aria-hidden="true"></i>
                                    <span data-i18n="dashboard">{{ __('ui.dashboard') }}</span>
                                </a>
                            </li>
                            <li>
                                <a class="dropdown-item" href="{{ route('profile.show') }}" role="menuitem">
                                    <i class="bi bi-person" aria-hidden="true"></i> <span>{{ __('ui.profile') }}</span>
                                </a>
                            </li>
                            <li>
                                <button
                                    type="button"
                                    class="dropdown-item dropdown-item--feedback"
                                    role="menuitem"
                                    data-feedback-trigger="menu"
                                >
                                    <i class="bi bi-chat-left-text" aria-hidden="true"></i>
                                    <span>{{ __('ui.send_feedback') }}</span>
                                </button>
                            </li>
                            <li>
                                <form method="POST" action="{{ route('logout') }}" id="logoutForm">
                                    @csrf
                                    <button type="submit" class="dropdown-item" role="menuitem">
                                        <i class="bi bi-box-arrow-right" aria-hidden="true"></i>
                                        <span data-i18n="logout">{{ __('ui.logout') }}</span>
                                    </button>
                                </form>
                            </li>
                        </ul>
                    </div>
                @endauth

                <button
                    class="navbar-toggler"
                    type="button"
                    data-bs-toggle="offcanvas"
                    data-bs-target="#primaryNavbar"
                    aria-controls="primaryNavbar"
                    aria-expanded="false"
                    aria-label="{{ __('ui.open_navigation') }}"
                >
                    <i class="bi bi-list" aria-hidden="true"></i>
                </button>
            </div>
        </div>
    </nav>

    <div id="app">
        <a class="skip-link" href="#mainContent">{{ __('ui.skip_main') }}</a>
        <network-status-banner></network-status-banner>
        <main id="mainContent" tabindex="-1">
            @yield('content')
        </main>
    </div>

    @auth
    <script>
        window.mutqinFeedbackPendingOpen = false;
        window.mutqinRequestFeedback = function (options) {
            if (typeof window.mutqinOpenFeedback === 'function') {
                window.mutqinOpenFeedback(options || {});
                return;
            }
            window.mutqinFeedbackPendingOpen = options || true;
        };
        document.addEventListener('click', function (event) {
            var trigger = event.target && event.target.closest
                ? event.target.closest('[data-feedback-trigger]')
                : null;
            if (!trigger) return;
            event.preventDefault();
            event.stopPropagation();
            if (window.bootstrap && window.bootstrap.Dropdown) {
                var dropdown = trigger.closest('.dropdown');
                if (dropdown) {
                    var toggle = dropdown.querySelector('[data-bs-toggle="dropdown"]');
                    if (toggle) {
                        var instance = window.bootstrap.Dropdown.getInstance(toggle)
                            || window.bootstrap.Dropdown.getOrCreateInstance(toggle);
                        if (instance && typeof instance.hide === 'function') instance.hide();
                    }
                }
                var offcanvas = trigger.closest('.offcanvas');
                if (offcanvas) {
                    var offInstance = window.bootstrap.Offcanvas.getInstance(offcanvas);
                    if (offInstance && typeof offInstance.hide === 'function') offInstance.hide();
                }
            }
            window.mutqinRequestFeedback();
        }, true);
        window.addEventListener('mutqin:feedback-ready', function () {
            if (!window.mutqinFeedbackPendingOpen) return;
            var pending = window.mutqinFeedbackPendingOpen;
            window.mutqinFeedbackPendingOpen = false;
            if (typeof window.mutqinOpenFeedback === 'function') {
                window.mutqinOpenFeedback(typeof pending === 'object' ? pending : {});
            }
        });
    </script>
    @endauth

    <script src="{{ mix('js/app.js') }}" defer></script>
    
    <script>
        window.mutqinInitialLocale = @json($appLocale);
        window.mutqinLanguageEndonyms = @json($languageEndonyms);
        window.mutqinInitialDirection = @json($appDirection);
        window.mutqinForceInitialLocale = @json(request()->query('lang') ? true : false);
        window.mutqinAuthCheck = @json(Auth::check());
        window.mutqinUserId = @json(Auth::id());
        window.mutqinUiLabels = {
            en: @json(trans('ui', [], 'en')),
            fr: @json(trans('ui', [], 'fr')),
            ar: @json(trans('ui', [], 'ar')),
            id: @json(trans('ui', [], 'id')),
            tr: @json(trans('ui', [], 'tr')),
            es: @json(trans('ui', [], 'es')),
            ur: @json(trans('ui', [], 'ur')),
        };
        window.mutqinInitialThemePreference = @json($appThemePreference);
        window.mutqinInitialTheme = @json($appTheme);
        window.mutqinThemeModes = @json(\App\Support\Theme::clientCatalog());
        window.mutqinDefaultTheme = @json(\App\Support\Theme::DEFAULT);
        window.mutqinAudioPrivacy = @json(\App\Support\AudioPrivacy::clientConfig());
        window.mutqinAiAudioConsent = @json(
            Auth::check()
                ? app(\App\Services\Auth\AiAudioConsentService::class)->snapshot(Auth::user())
                : null
        );

        function runWhenReady(fn) {
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', fn);
                return;
            }
            fn();
        }

        // Theme management. Vue workspace uses resources/js/utils/theme.js;
        // keep this inline script in sync with App\Support\Theme / THEME_MODES.
        (function() {
            function safeGet(key) {
                try { return localStorage.getItem(key); } catch (e) { return null; }
            }
            function safeSet(key, value) {
                try { localStorage.setItem(key, value); } catch (e) {}
            }
            function safeRemove(key) {
                try { localStorage.removeItem(key); } catch (e) {}
            }
            const themeModes = Array.isArray(window.mutqinThemeModes) ? window.mutqinThemeModes : [];
            const defaultTheme = window.mutqinDefaultTheme || 'light';

            function findThemeMode(value) {
                const raw = String(value || '').toLowerCase();
                return themeModes.find((mode) => mode.id === raw || mode.preference === raw)
                    || themeModes.find((mode) => mode.id === defaultTheme)
                    || themeModes[0]
                    || { id: defaultTheme, preference: defaultTheme + '-mode', icon: 'bi-sun', labelKey: 'theme_light', themeColor: '#8b5e3c', colorScheme: 'light' };
            }

            function currentLocale() {
                return document.documentElement.getAttribute('lang') || window.mutqinInitialLocale || 'en';
            }

            function uiLabel(key, fallback) {
                const pack = (window.mutqinUiLabels && (window.mutqinUiLabels[currentLocale()] || window.mutqinUiLabels.en)) || {};
                return pack[key] || fallback || key;
            }

            function themeOwnerId() {
                if (!window.mutqinAuthCheck) return 'guest';
                if (window.mutqinUserId != null && String(window.mutqinUserId).trim() !== '') {
                    return String(window.mutqinUserId);
                }
                return 'guest';
            }
            function ownerThemeKey(ownerId) {
                return `mutqin-theme.${ownerId || 'guest'}`;
            }
            function ownerThemePreferenceKey(ownerId) {
                return `mutqin-theme-preference.${ownerId || 'guest'}`;
            }

            function persistThemeToServer(themePreference) {
                if (!window.mutqinAuthCheck) return;
                const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
                fetch('/api/profile/theme', {
                    method: 'PATCH',
                    headers: {
                        'Content-Type': 'application/json',
                        'Accept': 'application/json',
                        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
                    },
                    credentials: 'same-origin',
                    body: JSON.stringify({ theme: themePreference }),
                }).catch(function () {});
            }

            function syncThemeDropdown(theme) {
                const mode = findThemeMode(theme);
                const switcherLabel = uiLabel('theme_switcher', 'Colour mode');
                const modeLabel = uiLabel(mode.labelKey, mode.id);
                const button = document.getElementById('globalThemeToggle');
                if (button) {
                    const icon = button.querySelector('.app-theme-toggle-icon') || button.querySelector('i');
                    if (icon) icon.className = `bi ${mode.icon || 'bi-sun'} app-theme-toggle-icon`;
                    button.setAttribute('aria-label', `${switcherLabel}: ${modeLabel}`);
                    const currentLabel = button.querySelector('[data-theme-current-label]');
                    if (currentLabel) currentLabel.textContent = modeLabel;
                }
                document.querySelectorAll('#globalThemeMenu .theme-btn[data-theme-id]').forEach((item) => {
                    const selected = item.getAttribute('data-theme-id') === mode.id;
                    item.classList.toggle('active', selected);
                    item.setAttribute('aria-checked', selected ? 'true' : 'false');
                });
            }

            function setTheme(theme, options) {
                const persist = !options || options.persist !== false;
                const mode = findThemeMode(theme);
                const normalizedTheme = mode.id;
                const themePreference = mode.preference;
                const ownerId = themeOwnerId();

                document.documentElement.setAttribute('data-theme', normalizedTheme);
                document.documentElement.style.colorScheme = mode.colorScheme || 'light';
                safeSet(ownerThemeKey(ownerId), normalizedTheme);
                safeSet(ownerThemePreferenceKey(ownerId), themePreference);
                document.cookie = `mutqin_theme=${themePreference};path=/;max-age=31536000;samesite=lax`;
                if (window.mutqinAuthCheck) {
                    window.mutqinInitialTheme = normalizedTheme;
                    window.mutqinInitialThemePreference = themePreference;
                    safeRemove('mutqin-theme');
                    safeRemove('mutqin-theme-preference');
                } else {
                    safeSet('mutqin-theme', normalizedTheme);
                    safeSet('mutqin-theme-preference', themePreference);
                }
                var themeColorMeta = document.querySelector('meta[name="theme-color"]');
                if (themeColorMeta) {
                    themeColorMeta.setAttribute('content', mode.themeColor || '#8b5e3c');
                    themeColorMeta.removeAttribute('media');
                }
                var colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
                if (colorSchemeMeta) {
                    colorSchemeMeta.setAttribute('content', mode.colorScheme || 'light');
                }
                syncThemeDropdown(normalizedTheme);
                if (persist) {
                    persistThemeToServer(themePreference);
                }
                window.dispatchEvent(new CustomEvent('mutqin:theme-change', {
                    detail: { theme: normalizedTheme, ownerId: ownerId },
                }));

                const favicon = document.getElementById('appThemeFavicon');
                if (favicon) {
                    favicon.setAttribute('href', '/favicon-512.png?v=20260730c');
                }

                return normalizedTheme;
            }

            window.mutqinSetTheme = setTheme;

            // Authenticated: account theme from server only (never shared-device localStorage).
            // Guests: owner-scoped cache, then legacy keys / SSR cookie / light.
            const ownerId = themeOwnerId();
            const scopedTheme = safeGet(ownerThemeKey(ownerId));
            const scopedPreference = safeGet(ownerThemePreferenceKey(ownerId));
            const savedThemePreference = safeGet('mutqin-theme-preference');
            const savedTheme = safeGet('mutqin-theme');
            const initialTheme = window.mutqinAuthCheck
                ? (window.mutqinInitialTheme || window.mutqinInitialThemePreference || defaultTheme)
                : (scopedTheme || scopedPreference || savedTheme || savedThemePreference || window.mutqinInitialThemePreference || window.mutqinInitialTheme || defaultTheme);
            setTheme(initialTheme, { persist: false });

            function bindThemeDropdown() {
                const toggle = document.getElementById('globalThemeToggle');
                if (!toggle) return false;
                if (!window.bootstrap?.Dropdown) return false;
                window.bootstrap.Dropdown.getOrCreateInstance(toggle);
                document.querySelectorAll('#globalThemeMenu .theme-btn[data-theme-id]').forEach((btn) => {
                    if (btn.dataset.themeBound) return;
                    btn.dataset.themeBound = '1';
                    btn.addEventListener('click', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        setTheme(btn.getAttribute('data-theme-id'));
                        window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
                    });
                });
                return true;
            }

            function initThemeDropdown() {
                document.querySelectorAll('#globalThemeMenu .theme-btn[data-theme-id]').forEach((btn) => {
                    if (btn.dataset.themeBound) return;
                    btn.dataset.themeBound = '1';
                    btn.addEventListener('click', function (event) {
                        event.preventDefault();
                        event.stopPropagation();
                        setTheme(btn.getAttribute('data-theme-id'));
                        const toggle = document.getElementById('globalThemeToggle');
                        if (toggle && window.bootstrap?.Dropdown) {
                            window.bootstrap.Dropdown.getOrCreateInstance(toggle).hide();
                        }
                    });
                });
                if (!bindThemeDropdown()) {
                    window.addEventListener('load', bindThemeDropdown, { once: true });
                }
            }

            runWhenReady(initThemeDropdown);
            window.addEventListener('mutqin:theme-change', function (event) {
                const next = event?.detail?.theme || document.documentElement.getAttribute('data-theme');
                if (next) syncThemeDropdown(next);
            });
            window.addEventListener('mutqin:locale-change', function () {
                syncThemeDropdown(document.documentElement.getAttribute('data-theme') || defaultTheme);
            });
        })();

        // Auth password visibility toggles
        (function() {
            runWhenReady(function() {
                document.querySelectorAll('[data-password-toggle]').forEach(function(button) {
                    button.addEventListener('click', function() {
                        const inputId = button.getAttribute('data-password-toggle');
                        const input = inputId ? document.getElementById(inputId) : null;
                        if (!input) return;
                        const showing = input.type === 'text';
                        input.type = showing ? 'password' : 'text';
                        const icon = button.querySelector('i');
                        if (icon) {
                            icon.className = showing ? 'bi bi-eye' : 'bi bi-eye-slash';
                        }
                        button.setAttribute(
                            'aria-label',
                            showing ? @json(__('ui.show_password')) : @json(__('ui.hide_password'))
                        );
                    });
                });

                document.querySelectorAll('[data-auth-fill-test-account]').forEach(function(button) {
                    button.addEventListener('click', function() {
                        const emailInput = document.getElementById('email');
                        const passwordInput = document.getElementById('password');
                        if (!emailInput || !passwordInput) return;

                        emailInput.value = button.getAttribute('data-test-email') || '';
                        passwordInput.value = button.getAttribute('data-test-password') || '';
                        emailInput.dispatchEvent(new Event('input', { bubbles: true }));
                        passwordInput.dispatchEvent(new Event('input', { bubbles: true }));

                        if (button.hasAttribute('data-auth-submit-after-fill')) {
                            const form = emailInput.closest('form');
                            if (form) {
                                if (typeof form.requestSubmit === 'function') {
                                    form.requestSubmit();
                                } else {
                                    form.submit();
                                }
                                return;
                            }
                        }

                        emailInput.focus();

                        const defaultLabel = button.getAttribute('data-default-label') || @json(__('ui.auth_demo_use'));
                        button.classList.add('is-filled');
                        button.textContent = @json(__('ui.auth_demo_ready'));
                        window.setTimeout(function() {
                            button.classList.remove('is-filled');
                            button.textContent = defaultLabel;
                        }, 1800);
                    });
                });
            });
        })();

        // Custom dropdown functionality (desktop/tablet account menu)
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

                window.mutqinCloseUserDropdown = closeDropdown;
                
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
                        toggle.focus();
                    }
                });
                
                menu.addEventListener('click', function(e) {
                    e.stopPropagation();
                });

                menu.querySelectorAll('a[href]').forEach((link) => {
                    link.addEventListener('click', closeDropdown);
                });
            });
        })();

        (function() {
            runWhenReady(function() {
                const panel = document.getElementById('primaryNavbar');
                const toggler = document.querySelector('.navbar-toggler[data-bs-target="#primaryNavbar"]');
                if (!panel || !window.bootstrap?.Offcanvas) return;

                // One shared Offcanvas instance for this panel.
                const offcanvas = window.bootstrap.Offcanvas.getOrCreateInstance(panel);

                function hidePrimaryNav() {
                    if (!panel.classList.contains('show')) return;
                    offcanvas.hide();
                }

                panel.addEventListener('show.bs.offcanvas', function() {
                    if (typeof window.mutqinCloseUserDropdown === 'function') {
                        window.mutqinCloseUserDropdown();
                    }
                    if (toggler) {
                        toggler.setAttribute('aria-expanded', 'true');
                    }
                });

                panel.addEventListener('hidden.bs.offcanvas', function() {
                    if (toggler) {
                        toggler.setAttribute('aria-expanded', 'false');
                        if (document.activeElement === document.body || panel.contains(document.activeElement)) {
                            toggler.focus();
                        }
                    }
                });

                panel.querySelectorAll('a[href]').forEach((link) => {
                    link.addEventListener('click', hidePrimaryNav);
                });

                panel.querySelectorAll('form.mobile-nav-logout-form').forEach((form) => {
                    form.addEventListener('submit', hidePrimaryNav);
                });

                if (toggler && !toggler.hasAttribute('aria-expanded')) {
                    toggler.setAttribute('aria-expanded', 'false');
                }
            });
        })();
        
        // Global language switcher for all pages
        (function() {
            const supported = @json($supportedDocumentLocales);
            const labels = window.mutqinUiLabels || { en: {}, fr: {}, ar: {}, id: {}, tr: {}, es: {}, ur: {} };

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

            function updateLangToggles(locale) {
                const next = normalize(locale);
                const endonyms = window.mutqinLanguageEndonyms || {};
                document.querySelectorAll('.global-lang-switcher').forEach((wrap) => {
                    const activeBtn = wrap.querySelector(`.lang-btn[data-locale="${next}"]`);
                    const toggle = wrap.querySelector('.app-lang-toggle');
                    if (!toggle) return;
                    const flag = activeBtn?.dataset.flag || activeBtn?.querySelector('.lang-btn-flag')?.textContent || '';
                    const label = endonyms[next] || activeBtn?.dataset.label || activeBtn?.querySelector('.lang-btn-label')?.textContent || next;
                    const flagEl = toggle.querySelector('.app-lang-flag');
                    const labelEl = toggle.querySelector('.app-lang-label');
                    if (flagEl) flagEl.textContent = flag;
                    if (labelEl) labelEl.textContent = label;
                    toggle.setAttribute('aria-label', label);
                });
            }

            function setDocumentLocale(locale) {
                const next = normalize(locale);
                const rtl = next === 'ar' || next === 'ur';
                document.documentElement.setAttribute('lang', next);
                document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                if (document.body) document.body.setAttribute('dir', rtl ? 'rtl' : 'ltr');
                safeSet('mutqin.locale', next);
                document.cookie = `mutqin_locale=${next};path=/;max-age=31536000;samesite=lax`;
                document.querySelectorAll('.global-lang-switcher .lang-btn').forEach((btn) => {
                    btn.classList.toggle('active', btn.dataset.locale === next);
                });
                updateLangToggles(next);
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
                        // Blade auth pages need a reload so __('ui.*') strings re-render.
                        if (document.querySelector('.auth-page')) {
                            window.location.reload();
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
    @stack('page-scripts')
</body>
</html>
