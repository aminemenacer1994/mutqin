# Mutqin

Mutqin is a Quran memorisation workspace: practise short ayah ranges, use memorisation techniques (Focus, Blur, Chaining, Anchor), check recitation with AI, and get personalised next-session recommendations.

**Production:** [https://app.mutqin.ai](https://app.mutqin.ai)

## Stack

- **Backend:** PHP 8.2, Laravel 12, Sanctum (SPA cookie auth)
- **Frontend:** Vue 3, Bootstrap 5, Laravel Mix 6
- **Speech:** Speechmatics (server-minted realtime tokens)
- **Payments:** Stripe subscriptions (Free / Premium / Pro)

## Requirements

- PHP 8.2+
- Composer 2
- Node.js 20+ and npm
- SQLite (local default) or MySQL/PostgreSQL for production

## Quick start

```bash
# One-shot bootstrap (install deps, .env, key, migrate, build assets)
composer setup

# Or step by step:
cp .env.example .env
composer install
php artisan key:generate
touch database/database.sqlite   # if using SQLite
php artisan migrate
npm install
npm run build
php artisan serve
```

Open [http://127.0.0.1:8000](http://127.0.0.1:8000).

### Demo accounts (local / staging)

```bash
php artisan migrate --seed
# Or demo data only:
php artisan db:seed --class=DemoDataSeeder
```

See [docs/TESTER_GUIDE.md](docs/TESTER_GUIDE.md) for test flows, demo logins, and feature checklist.

## Development

```bash
# App server + queue + logs + Mix watch (concurrent)
composer dev

# Or separately:
php artisan serve
npm run watch
```

## Testing

```bash
# PHP (203+ tests, in-memory SQLite)
composer test

# JavaScript unit tests
npm run test:mutqin
node tests/js/billing.test.mjs

# Optional Playwright smoke / mobile checks (requires running app)
npm run test:mutqin:browser
npm run test:mutqin:mobile
```

CI runs PHPUnit, JS tests, and a production asset build on push/PR (see `.github/workflows/test.yml`).

## Environment variables

Copy `.env.example` to `.env` and configure:

| Variable | Purpose |
|----------|---------|
| `APP_URL` | App URL (local: `http://127.0.0.1:8000`) |
| `SPEECHMATICS_API_KEY` | Live transcription for AI recite (Pro) |
| `SPEECHMATICS_REGION` | `eu` or `us` |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth login |
| `STRIPE_*` | Publishable/secret keys, webhook secret, price IDs |
| `MUTQIN_ADMIN_EMAILS` | Comma-separated admin emails |

**Never commit real secrets.** Stripe keys in `.env.example` are placeholders only.

### Subscription tiers

Canonical feature lists live in `config/billing.php`:

- **Free** — Focus mode, basic sessions, limited saves
- **Premium** — Blur, Chaining, Anchor, Hifz plan, spaced retention, adaptive revision
- **Pro** — AI recitation check, AI memorisation checker, unlimited saves

Server middleware enforces tiers on AI and premium API routes.

## Frontend build

Assets are compiled with **Laravel Mix** (not Vite):

```bash
npm run dev      # development build
npm run build    # production build (mix --production)
```

Compiled files go to `public/js/` and `public/css/app.css`. These paths are **gitignored** — run `npm run build` after clone and on deploy.

`public/mix-manifest.json` maps Mix entry points to hashed bundles.

## Deployment (Laravel Cloud)

1. Set production env vars in the Laravel Cloud dashboard (see comments in `.env.example`).
2. Run migrations: `php artisan migrate --force`
3. Build assets during deploy: `npm ci && npm run build`
4. Configure Stripe webhook: `POST /api/stripe/webhook`
5. Enable scheduler if using learning-history retention (`routes/console.php`)

After env changes: `php artisan config:clear && php artisan config:cache`

## Observability

API routes log structured JSON via `LogMutqinApiRequest` middleware and `App\Support\MutqinLog`:

- Every API request: `api.request.completed` (route, status, duration_ms, user_id)
- Session lifecycle: `learning.session.started`, `learning.session.end`
- Assessments: `memorisation.assessment.submitted`, `recommendation.ai_assessment.submitted`, `recommendation.adaptive_assessment.submitted`
- Stripe: `billing.webhook.received`

Responses include an `X-Request-Id` header for correlation.

**Production error tracking:** wire [Sentry](https://sentry.io) or Bugsnag to Laravel’s log channel in `.env` (`LOG_CHANNEL`, `SENTRY_LARAVEL_DSN`). No DSN is committed — add it in Laravel Cloud when ready.

## Project layout

| Path | Purpose |
|------|---------|
| `app/Services/` | Recommendation engine, dashboard, alignment, billing |
| `resources/js/views/Memorisation.js` | Main memorisation workspace |
| `resources/js/scripts/` | Session engine, recitation analysis, API clients |
| `routes/api.php` | Authenticated learning + billing API |
| `tests/Feature/` | PHP integration tests |
| `tests/js/` | Node ESM unit tests |
| `docs/` | Tester guide, performance notes |

## Learning state API

Authenticated clients sync full engine state via:

- `GET /api/state` — fetch blob
- `POST /api/state` — upsert blob (derives sessions, progress, analytics)

Legacy `/memorisation/sync-state` web routes were removed; use `/api/state` only.

### Hifz plans (Premium)

- `GET /api/hifz-plan` — fetch saved plan
- `PUT /api/hifz-plan` — create/update (Premium+)
- `DELETE /api/hifz-plan` — remove plan

See also [docs/scheduling-systems.md](docs/scheduling-systems.md) for how review/recommendation scheduling works.

## License

Proprietary — Mutqin.
