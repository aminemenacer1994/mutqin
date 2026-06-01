<!doctype html>
<html lang="en" data-theme="dark">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">
    <title>Mutqin - Preserve Your Hifz</title>
    <link rel="icon" type="image/svg+xml" href="/favicon.svg">
    <link rel="icon" type="image/x-icon" href="/favicon.ico">
    <link rel="icon" type="image/png" sizes="96x96" href="/favicon-96x96.png">
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:opsz,wght@14..32,300;14..32,400;14..32,500;14..32,600;14..32,700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css">
    <link rel="stylesheet" href="{{ mix('css/app.css') }}">
    <style>
        :root {
            color-scheme: dark;
            --bg: #171c1a;
            --surface: rgba(28, 33, 31, 0.96);
            --surface-strong: rgba(22, 27, 25, 0.98);
            --border: rgba(109, 160, 145, 0.18);
            --text: #edf3f0;
            --text-muted: #b6c3be;
            --accent: #4f9d8a;
            --accent-strong: #5ca794;
            --accent-light: rgba(79, 157, 138, 0.14);
            --shadow-md: 0 18px 42px rgba(0, 0, 0, 0.28);
            --shadow-lg: 0 28px 60px rgba(0, 0, 0, 0.34);
            --radius-xl: 26px;
            --radius-lg: 20px;
        }

        * {
            box-sizing: border-box;
        }

        html, body {
            margin: 0;
            min-height: 100%;
            background:
                radial-gradient(circle at top, rgba(79, 157, 138, 0.12), transparent 42%),
                linear-gradient(180deg, #171c1a, #121615);
            color: var(--text);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        }

        body {
            min-height: 100dvh;
        }

        .guest-onboarding-shell {
            min-height: 100dvh;
            display: grid;
            place-items: center;
            padding: clamp(20px, 4vw, 48px);
        }

        .onboarding-topbar {
            position: fixed;
            top: 16px;
            right: 16px;
            z-index: 20;
        }

        html[dir="rtl"] .onboarding-topbar {
            right: auto;
            left: 16px;
        }

        .lang-switcher {
            display: inline-flex;
            align-items: center;
            border: 1px solid var(--border);
            border-radius: 12px;
            overflow: hidden;
            background: rgba(28, 33, 31, 0.92);
            backdrop-filter: blur(8px);
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

        .guest-onboarding-card {
            width: min(1040px, 100%);
            padding: clamp(24px, 4.5vw, 54px);
            border-radius: var(--radius-xl);
            background: linear-gradient(180deg, var(--surface), var(--surface-strong));
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            animation: onboardingFade 260ms ease-out;
        }

        .guest-onboarding-grid {
            display: grid;
            grid-template-columns: 1.05fr 0.95fr;
            gap: clamp(22px, 4vw, 54px);
            align-items: start;
        }

        .guest-onboarding-kicker {
            display: inline-flex;
            align-items: center;
            gap: 8px;
            min-height: 34px;
            padding: 0 12px;
            border-radius: 999px;
            font-size: 0.72rem;
            letter-spacing: 0.08em;
            text-transform: uppercase;
            font-weight: 700;
            color: #bde5d9;
            background: rgba(79, 157, 138, 0.12);
            border: 1px solid rgba(79, 157, 138, 0.2);
        }

        .guest-onboarding-card h1 {
            margin: 16px 0 10px;
            font-size: clamp(1.65rem, 3.2vw, 2.6rem);
            line-height: 1.08;
            letter-spacing: -0.03em;
        }

        .guest-onboarding-card p {
            margin: 0;
            max-width: 66ch;
            color: var(--text-muted);
            font-size: clamp(0.98rem, 1.2vw, 1.08rem);
            line-height: 1.65;
        }

        .guest-onboarding-list {
            margin: 26px 0 0;
            padding-left: 18px;
            display: grid;
            gap: 12px;
            color: #d7e3de;
        }

        .guest-onboarding-list li {
            line-height: 1.55;
        }

        .guest-onboarding-list i {
            color: rgba(189, 229, 217, 0.92);
            margin-right: 10px;
        }

        .guest-onboarding-actions {
            margin-top: 34px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .guest-onboarding-btn {
            min-height: 46px;
            padding: 0 18px;
            border-radius: 16px;
            text-decoration: none;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            font-weight: 600;
            transition: transform 0.18s ease, background 0.18s ease, color 0.18s ease, border-color 0.18s ease;
        }

        .guest-onboarding-btn-primary {
            background: var(--accent);
            border: 1px solid var(--accent-strong);
            color: #f4fbf8;
            gap: 10px;
        }

        .guest-onboarding-btn-soft {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #d9e3de;
            gap: 10px;
        }

        .guest-onboarding-btn:hover {
            transform: translateY(-1px);
        }

        .guest-onboarding-example {
            border-radius: var(--radius-lg);
            border: 1px solid rgba(109, 160, 145, 0.22);
            background: rgba(255, 255, 255, 0.03);
            box-shadow: var(--shadow-md);
            overflow: clip;
        }

        .guest-onboarding-example img {
            width: 100%;
            height: auto;
            display: block;
        }

        .guest-onboarding-example-caption {
            padding: 14px 16px 16px;
            border-top: 1px solid rgba(109, 160, 145, 0.14);
            color: rgba(237, 243, 240, 0.86);
            font-size: 0.93rem;
            line-height: 1.5;
        }

        .guest-onboarding-example-caption strong {
            color: var(--text);
            font-weight: 650;
        }

        @keyframes onboardingFade {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @media (max-width: 900px) {
            .guest-onboarding-grid {
                grid-template-columns: 1fr;
            }
        }

        @media (max-width: 640px) {
            .guest-onboarding-actions {
                flex-direction: column;
            }

            .guest-onboarding-btn {
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div class="onboarding-topbar">
        <div class="lang-switcher" id="globalLangSwitcher" role="group" aria-label="Language switcher">
            <button type="button" class="lang-btn" data-locale="en">EN</button>
            <button type="button" class="lang-btn" data-locale="ar">AR</button>
            <button type="button" class="lang-btn" data-locale="fr">FR</button>
        </div>
    </div>
    <main class="guest-onboarding-shell">
        <article class="guest-onboarding-card">
            <div class="guest-onboarding-grid">
                <section>
                    <span class="guest-onboarding-kicker" data-i18n="kicker">Memorisation Companion</span>
                    <h1 data-i18n="title">Preserve your hifz with calm, session-based repetition.</h1>
                    <p data-i18n="intro">Pick a small ayah range, repeat with structure, then switch into recall, self-check, and review. Mutqin keeps the flow simple so you can show up consistently.</p>

            <ul class="guest-onboarding-list" aria-label="Key features">
                        <li><i class="bi bi-clock"></i> <span data-i18n="feature1">Short sessions that feel like a real memorisation sitting</span></li>
                        <li><i class="bi bi-signpost-split"></i> <span data-i18n="feature2">Clear steps: listen, repeat, then recall and self-check</span></li>
                        <li><i class="bi bi-cloud-check"></i> <span data-i18n="feature3">Saved progress so you can pause and resume without friction</span></li>
                        <li><i class="bi bi-check2-circle"></i> <span data-i18n="feature4">Review context that helps you return later with confidence</span></li>
            </ul>

                    <div class="guest-onboarding-actions">
                        <a href="{{ route('register') }}" class="guest-onboarding-btn guest-onboarding-btn-primary">
                            <span data-i18n="getStarted">Get Started</span> <i class="bi bi-arrow-right-short" aria-hidden="true"></i>
                        </a>
                        <a href="{{ route('login') }}" class="guest-onboarding-btn guest-onboarding-btn-soft">
                            <span data-i18n="login">Login</span> <i class="bi bi-box-arrow-in-right" aria-hidden="true"></i>
                        </a>
                    </div>
                </section>

                <aside class="guest-onboarding-example" aria-label="Example session">
                    <img src="/images/onboarding-example.png" alt="Example Mutqin memorisation session with listen, repeat, and recall steps">
                    <div class="guest-onboarding-example-caption">
                        <strong data-i18n="exampleTitle">Example session:</strong> <span data-i18n="exampleCopy">choose a range, set repeats, then transition into recall. The goal is steady progress, not overload.</span>
                    </div>
                </aside>
            </div>
        </article>
    </main>
</body>
<script>
  (function() {
    const supported = ['en', 'ar', 'fr'];
    const messages = {
      en: {
        kicker: 'Memorisation Companion',
        title: 'Preserve your hifz with calm, session-based repetition.',
        intro: 'Pick a small ayah range, repeat with structure, then switch into recall, self-check, and review. Mutqin keeps the flow simple so you can show up consistently.',
        feature1: 'Short sessions that feel like a real memorisation sitting',
        feature2: 'Clear steps: listen, repeat, then recall and self-check',
        feature3: 'Saved progress so you can pause and resume without friction',
        feature4: 'Review context that helps you return later with confidence',
        getStarted: 'Get Started',
        login: 'Login',
        exampleTitle: 'Example session:',
        exampleCopy: 'choose a range, set repeats, then transition into recall. The goal is steady progress, not overload.'
      },
      ar: {
        kicker: 'رفيق الحفظ',
        title: 'حافظ على حفظك بتكرار هادئ ومنظم.',
        intro: 'اختر نطاقا صغيرا من الآيات، وكرر بمنهجية، ثم انتقل إلى الاسترجاع والمراجعة الذاتية. يجعل متقن سير الجلسة بسيطا لتستمر بثبات.',
        feature1: 'جلسات قصيرة تشبه مجلس الحفظ الحقيقي',
        feature2: 'خطوات واضحة: استماع، تكرار، ثم استرجاع ومراجعة ذاتية',
        feature3: 'حفظ التقدم لتتوقف وتكمل دون تعقيد',
        feature4: 'سياق مراجعة يساعدك على العودة بثقة',
        getStarted: 'ابدأ الآن',
        login: 'تسجيل الدخول',
        exampleTitle: 'مثال جلسة:',
        exampleCopy: 'اختر نطاقا، واضبط التكرار، ثم انتقل إلى الاسترجاع. الهدف تقدم ثابت بلا إرهاق.'
      },
      fr: {
        kicker: 'Compagnon de mémorisation',
        title: 'Préservez votre hifz avec une répétition calme et structurée.',
        intro: 'Choisissez une petite plage d\'ayahs, répétez avec structure, puis passez au rappel, à l\'auto-vérification et à la révision. Mutqin garde le flux simple pour vous aider à rester régulier.',
        feature1: 'Des sessions courtes qui ressemblent à une vraie séance de mémorisation',
        feature2: 'Des étapes claires : écouter, répéter, puis rappeler et vérifier',
        feature3: 'Une progression enregistrée pour reprendre sans friction',
        feature4: 'Un contexte de révision pour revenir avec confiance',
        getStarted: 'Commencer',
        login: 'Connexion',
        exampleTitle: 'Exemple de session :',
        exampleCopy: 'choisissez une plage, réglez les répétitions, puis passez au rappel. L\'objectif est une progression régulière, sans surcharge.'
      }
    };
    function normalize(locale) { return supported.includes(locale) ? locale : 'en'; }
    function apply(locale) {
      const next = normalize(locale);
      const rtl = next === 'ar';
      document.documentElement.setAttribute('lang', next);
      document.documentElement.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      document.body.setAttribute('dir', rtl ? 'rtl' : 'ltr');
      localStorage.setItem('mutqin.locale', next);
      document.querySelectorAll('#globalLangSwitcher .lang-btn').forEach((btn) => {
        btn.classList.toggle('active', btn.dataset.locale === next);
      });
      document.querySelectorAll('[data-i18n]').forEach((el) => {
        const key = el.getAttribute('data-i18n');
        if (messages[next] && messages[next][key]) el.textContent = messages[next][key];
      });
    }
    function init() {
      apply(localStorage.getItem('mutqin.locale') || 'en');
      document.querySelectorAll('#globalLangSwitcher .lang-btn').forEach((btn) => {
        btn.addEventListener('click', () => apply(btn.dataset.locale));
      });
    }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
  })();
</script>
</html>
