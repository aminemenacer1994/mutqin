# Mutqin performance & load testing

Repeatable baselines, staged load scenarios, and launch-blocking regression thresholds. **Run against staging or local only** — do not load-test production.

## Quick start

```bash
# 1. Seed realistic learner data (local/staging DB)
php artisan db:seed --class=PerformanceLoadSeeder

# 2. In-process API benchmark (latency p50/p95/p99, query counts, payload sizes)
php artisan mutqin:perf-benchmark --seed --json > scripts/perf/results/baseline.json

# 3. CI query-count guardrails
php artisan test --filter=PerformanceBaselineTest

# 4. Frontend bundle thresholds (after build)
npm run build
npm run perf:bundles

# 5. HTTP load (pick one)
#    k6 (recommended for 50/100/500 VUs)
PERF_BASE_URL=http://127.0.0.1:8000 PERF_VUS=50 k6 run scripts/perf/k6/main.js
PERF_VUS=100 k6 run scripts/perf/k6/staged.js
PERF_VUS=500 k6 run scripts/perf/k6/staged.js

#    autocannon smoke (no k6 install)
PERF_CONNECTIONS=50 node scripts/perf/autocannon-smoke.mjs
```

Default perf user: `perf-user-1@mutqin-load.test` / `password` (seeded by `PerformanceLoadSeeder`).

---

## What we measure

| Signal | Tool | Notes |
|--------|------|-------|
| API latency p50/p95/p99 | `mutqin:perf-benchmark`, k6 | Per-endpoint, in-process or HTTP |
| DB query count | PHPUnit baselines, benchmark cmd | Cold vs cached paths |
| Response payload size | Benchmark cmd | JSON bytes |
| Slow queries | Enable `DB_LOG_SLOW_QUERIES` in staging | >100ms logged |
| Memory peak | Benchmark cmd | PHP peak during sweep |
| Bundle/chunk sizes | `analyze-bundles.mjs` | `public/js` after `npm run build` |
| Concurrent users | k6 `main.js` / `staged.js` | 50 / 100 / 500 VU profiles |

---

## Scenarios covered

| Area | Endpoints / behaviour |
|------|------------------------|
| Login/register | k6 login flow + `/sanctum/csrf-cookie` |
| Dashboard | `GET /api/dashboard`, warm-cache path |
| Mushaf / ayah | `/memorisation/quran-proxy/qurancom/verses/by_page/{n}` (1h server cache) |
| Session lifecycle | `/api/session/current`, `/api/sessions/history`, start/save via state sync |
| Progress stats | `GET /api/progress` (paginated, default limit 500) |
| Spaced retention | Client-side due queue; persisted via `/api/state` + `/api/progress` |
| AI Recite | `GET /api/ai-recite-attempts`, assessment POST throttled 20/min |
| Speechmatics | `POST /memorisation/transcription-token` — bounded by `SpeechmaticsRateLimit` + `SpeechmaticsUsageCap` (not load-tested against real upstream) |
| Saved sessions | Counted from `user_sessions` lifecycle table; fallback sync blob only when empty |
| Translations | Proxy `alquran/surah/{n}/{edition}`, word-by-word via quran.com proxy |

---

## Baseline thresholds (launch-blocking regressions)

These limits are enforced in CI via `tests/Feature/PerformanceBaselineTest.php` and bundle analysis.

### API query budgets (cold path, seeded perf user)

| Endpoint | Max queries |
|----------|-------------|
| `GET /api/dashboard` (cold) | 52 |
| `GET /api/dashboard` (warm, 45s cache) | 3 |
| `GET /api/state` (recent pull, no write) | 2 |
| `GET /api/session/current` | 4 |
| `GET /api/sessions/history` | 3 |
| `GET /api/recommendations/next` | 16 |
| `POST /api/state` (unchanged hash) | 3 |

### Payload limits

| Endpoint | Max response |
|----------|--------------|
| `GET /api/dashboard` | 120 KB |
| `GET /api/progress` | 2000 rows / request (paginate with `limit` + `offset`) |
| `GET /api/ayah-notes` | 500 rows |

### Bundle limits (production build)

| Chunk | Max size |
|-------|----------|
| `app.js` | 2.1 MiB |
| `dashboard.*.js` | 330 KiB |
| `homepage.*.js` | 65 KiB |
| `memorisation.*.js` (lazy route) | 3.9 MiB |
| `admin-dashboard.*.js` | 250 KiB |

`memorisation` is lazy-loaded; initial route load is dominated by `app.js` + page chunk.

### k6 HTTP thresholds (staging)

| Profile | p95 latency | Error rate |
|---------|-------------|------------|
| 50 VUs | < 800 ms | < 5% |
| 100 VUs | < 1200 ms | < 5% |
| 500 VUs | < 2000 ms | < 8% |

---

## Optimisations applied (measured)

### Before → after (representative, seeded perf user on SQLite CI)

| Change | Before | After | Evidence |
|--------|--------|-------|----------|
| Dashboard snapshot counts | 8 separate `COUNT(*)` queries | 4 aggregated queries | `DashboardService::buildSnapshot` |
| Progress list unbounded | Full table scan per user | Default `limit=500`, max 2000 + `meta.total` | `ProgressController` |
| State read polling | Write on every GET | Write at most every 5 min | `StateSyncController::show` |
| Dashboard API | Refetch on every mount/focus | 45s private cache + skip mount refetch when SSR data present | `DashboardService`, Dashboard.vue |
| Unfinished session lookup | Full history scan | Status-filtered, capped 25 + legacy 10 | `SessionLifecycleService` |
| Quran proxy | Upstream every request | 1h cache + 3 retries | `QuranProxyController` |

Re-run `php artisan mutqin:perf-benchmark --seed --json` after changes and commit updated `scripts/perf/results/baseline.json` when thresholds shift intentionally.

### Sample baseline (local, seeded perf user, 2026-09-03)

See `scripts/perf/results/baseline.json`. Representative cold-path numbers:

| Endpoint | Queries | p50 ms | Response |
|----------|---------|--------|----------|
| dashboard | 49 | 2.2 | 6.5 KB |
| state | 2 | 2.0 | 4.6 KB |
| progress | 2 | 10.0 | 23 KB (120 ayahs, limit 500) |
| session/current | 1 | 2.5 | 752 B |
| recommendations/next | 10 | 2.9 | 2.3 KB |

---

## Caching policy

| Data | Cached? | Scope |
|------|---------|-------|
| Dashboard aggregates | Yes, 45s | Per user (`dashboard:v1:{userId}:{days}`) |
| Quran proxy responses | Yes, 1h | Global (public text, safe) |
| User state / sessions | **No** global cache | Private per user only |
| AI recite results | **No** | Accuracy must be fresh |
| Recommendations | **No** long TTL | Stale plans avoided |

---

## Deployment-dependent limits

These are **not** fully simulated in CI:

- **Speechmatics**: Real-time token mint hits external API; rate limits in `config/services.php`. Load tests should mock upstream or cap VUs on token endpoint.
- **Database cache store**: Default `CACHE_STORE=database` may bottleneck under high concurrency — prefer Redis in staging/production for load tests.
- **Quran upstream**: First proxy miss per page is ~200–800 ms; cached hits are local.
- **memorisation.js (~3.7 MiB)**: Acceptable as lazy chunk; further splitting is deferred (high risk).
- **PHP-FPM workers / DB connections**: Size for target VUs × avg request time.

---

## Seeder tuning

```bash
PERF_SEED_USERS=100 PERF_SEED_AYAHS=200 PERF_SEED_SESSIONS=40 \
  php artisan db:seed --class=PerformanceLoadSeeder
```

---

## Files

| Path | Purpose |
|------|---------|
| `app/Console/Commands/PerformanceBenchmarkCommand.php` | In-process benchmark |
| `database/seeders/PerformanceLoadSeeder.php` | Realistic test data |
| `tests/Feature/PerformanceBaselineTest.php` | CI query/payload guardrails |
| `scripts/perf/analyze-bundles.mjs` | Chunk size report |
| `scripts/perf/k6/main.js` | Authenticated learner scenario |
| `scripts/perf/k6/staged.js` | 50/100/500 VU ramp |
| `scripts/perf/autocannon-smoke.mjs` | Lightweight HTTP smoke |
| `docs/performance-session-recitation.md` | Session/AMD-specific notes |

---

## Related commands

```bash
composer test:perf          # PHPUnit performance baselines
php artisan mutqin:perf-benchmark --seed
npm run perf:bundles
npm run perf:smoke
```
