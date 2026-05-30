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

        .guest-onboarding-card {
            width: min(820px, 100%);
            padding: clamp(24px, 4.5vw, 48px);
            border-radius: 24px;
            background: linear-gradient(180deg, var(--surface), var(--surface-strong));
            border: 1px solid var(--border);
            box-shadow: var(--shadow-lg);
            animation: onboardingFade 260ms ease-out;
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
            margin: 22px 0 0;
            padding-left: 20px;
            display: grid;
            gap: 10px;
            color: #d7e3de;
        }

        .guest-onboarding-actions {
            margin-top: 28px;
            display: flex;
            flex-wrap: wrap;
            gap: 12px;
        }

        .guest-onboarding-btn {
            min-height: 46px;
            padding: 0 16px;
            border-radius: 14px;
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
        }

        .guest-onboarding-btn-soft {
            background: rgba(255, 255, 255, 0.05);
            border: 1px solid rgba(255, 255, 255, 0.12);
            color: #d9e3de;
        }

        .guest-onboarding-btn:hover {
            transform: translateY(-1px);
        }

        @keyframes onboardingFade {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
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
    <main class="guest-onboarding-shell">
        <article class="guest-onboarding-card">
            <span class="guest-onboarding-kicker">Memorisation Companion</span>
            <h1>Mutqin helps you memorise Quran through calm, session-based repetition.</h1>
            <p>Choose a small ayah range, repeat with structure, then return for recall, self-check, and review without overload.</p>

            <ul class="guest-onboarding-list" aria-label="Key features">
                <li>Build around short, focused sessions</li>
                <li>Use repetition that matches a real memorisation sitting</li>
                <li>Switch from listening to recall and self-check</li>
                <li>Return later with saved progress and review context</li>
            </ul>

            <div class="guest-onboarding-actions">
                <a href="{{ route('register') }}" class="guest-onboarding-btn guest-onboarding-btn-primary">Get Started</a>
                <a href="{{ route('login') }}" class="guest-onboarding-btn guest-onboarding-btn-soft">Login</a>
            </div>
        </article>
    </main>
</body>
</html>
