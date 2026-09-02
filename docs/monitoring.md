# Production health & uptime monitoring

Mutqin runs on **Laravel Cloud** (`https://app.mutqin.ai`). Monitoring uses the platform you already have — **Laravel Cloud** (deploy / resource / Slack alerts, automatic SSL) and **Sentry** (exceptions + health/alert probes) — plus a small in-app health surface for external uptime checkers. Do **not** add a second APM or self-hosted uptime package.

## Endpoints

| Endpoint | Audience | Purpose | Response |
|---|---|---|---|
| `GET /up` | Framework / platform | Shallow liveness — process is responding | Laravel default (no dependency checks) |
| `GET /health` | External uptime monitors | Readiness with **minimal** body | `{ "status": "ok" \| "degraded" \| "unavailable" }` — **no** check details |
| `GET /internal/health` | Operators / private monitors | Same checks with safe per-check codes | `{ "status", "checks": { … } }` |
| `GET /internal/alert-test` | Staging only | Safe alert probe (log + Sentry) | `{ "status": "ok", "logged", "sentry" }` |
| `GET /internal/error-test` | Staging / admin | Exception → Sentry (see [ERROR_TRACKING.md](./ERROR_TRACKING.md)) | Friendly 500 JSON |

### HTTP status codes

| Overall `status` | Public `/health` | Meaning |
|---|---|---|
| `ok` | **200** | Critical dependencies healthy; heartbeats fresh |
| `degraded` | **200** | App is serving; non-critical issue (stale scheduler/worker, Speechmatics misconfig, …) |
| `unavailable` | **503** | Critical failure (database, cache, required Redis, or storage write) |

Point the primary uptime monitor at **`https://app.mutqin.ai/health`** and alert on **non-200** (i.e. `unavailable`). Optionally keep a second check on `/up` for pure process liveness. Do **not** require the JSON body to equal `"ok"` — `degraded` is still “up”.

### What is never exposed

Public and internal health responses never include:

- DB credentials, env values, stack traces
- Internal hostnames, Redis URLs, SQL, provider keys
- Exception messages or filesystem absolute paths beyond safe reason **codes** (`unreachable`, `stale_heartbeat`, `not_configured`, …)

Internal routes return **404** when denied (same pattern as `/internal/error-test`).

### Access control (`/internal/*`)

| Environment | `/internal/health` | `/internal/alert-test` |
|---|---|---|
| Non-production | Open (unless `MONITORING_PROBE_ENABLED=false`) | Open; if `MONITORING_INTERNAL_TOKEN` is set, token required |
| Production | Verified allowlisted **admin** session **or** `MONITORING_INTERNAL_TOKEN` | **Always 404** |

Token headers (either):

```http
X-Mutqin-Monitoring-Token: <token>
Authorization: Bearer <token>
```

Set `MONITORING_INTERNAL_TOKEN` only in the host environment — never commit it.

## Checks

| Check | Critical? | How it works |
|---|---|---|
| **database** | Yes → `unavailable` | PDO + `select 1` |
| **cache** | Yes → `unavailable` | Put/get/forget probe on the configured cache store (covers Redis when `CACHE_STORE=redis`) |
| **redis** | Yes only if Redis is the cache/queue/session driver | `PING` when required; otherwise `skipped` |
| **storage** | Yes → `unavailable` | Write/delete under learner-audio temp path + default filesystem disk |
| **scheduler** | No → `degraded` | Age of last successful `mutqin:health-heartbeat` (not “scheduler config exists”) |
| **queue_worker** | No → `degraded` | Age of last processed `RecordWorkerHeartbeatJob`; `skipped` for `sync`/`null`/`deferred` |
| **speechmatics** | Signal only | Config presence (`api_key` + `region`). Never calls Speechmatics. Missing key → `skipped`. Misconfigured → `degraded`. **Never alone makes the app `unavailable`.** |

Heartbeats:

1. Scheduler runs `mutqin:health-heartbeat` **every minute** → writes scheduler timestamp to cache.
2. That command dispatches `RecordWorkerHeartbeatJob` when an async queue driver is used → worker freshness.
3. `mutqin:health-evaluate` every five minutes logs/alerts on non-ok status (rate-limited by `MONITORING_ALERT_COOLDOWN`).

Enable the **Laravel Cloud scheduler** on the environment or heartbeats stay missing and health stays `degraded`.

## Alert ownership

| Signal | Owner / channel | Action |
|---|---|---|
| HTTP `/health` → 503 | On-call / engineering (external uptime → Slack/email) | Check Laravel Cloud app status, DB resource, recent deploy |
| `monitoring.health.unavailable` / `.degraded` | Engineering (logs + Sentry, tag `feature=monitoring`) | Inspect `/internal/health` codes; fix dependency or workers |
| `monitoring.alert_test` | Staging verification only | Confirm routing into Sentry / log drain |
| Sentry exceptions / `provider.request.failed` | Engineering (existing Sentry project) | See [ERROR_TRACKING.md](./ERROR_TRACKING.md) |
| Speechmatics capacity / rate limits | Engineering | See [speechmatics-capacity.md](./speechmatics-capacity.md) — AI soft-fail, not whole-app downtime |
| Deploy failed / resource CPU·RAM·disk | Platform owner | **Laravel Cloud** email + Slack “Resource Alerts” |
| SSL certificate | **Laravel Cloud** | Auto-issued and auto-renewed for custom domains — no in-app SSL monitor |
| Domain **registration** expiry | Platform owner | Registrar / DNS provider calendar reminder (Cloud does not own domain registration) |

### Laravel Cloud (use what the platform provides)

1. Connect **Slack** and enable **Resource Alerts** + failed deployment notifications.
2. Keep **Sentry** DSN set (`SENTRY_LARAVEL_DSN`) — already the single error provider.
3. Optional: Laravel Cloud **Nightwatch** one-click integration — only if you deliberately adopt it; Mutqin does **not** require installing Nightwatch to get health/uptime coverage.
4. Enable **scheduler** on the App cluster; ensure a **Worker** cluster (or background process) runs `queue:work` when `QUEUE_CONNECTION` is not `sync`.

### External uptime + SSL / domain docs

Laravel Cloud renews TLS automatically. For belt-and-suspenders:

1. Create one monitor against `https://app.mutqin.ai/health` (expect **200**; follow redirects off).
2. Enable the provider’s **SSL certificate expiry** check on `app.mutqin.ai` if offered.
3. Track **domain registration** expiry at your registrar (e.g. 30/14/7 day reminders) — separate from TLS.

Do not run Spatie Uptime Monitor (or similar) inside the Mutqin app itself.

## Env reference

```
# Optional — disable all /internal monitoring probes
# MONITORING_PROBE_ENABLED=true

# Optional machine token for /internal/health (production) and /internal/alert-test (staging)
# MONITORING_INTERNAL_TOKEN=

# Heartbeat freshness windows (seconds)
# MONITORING_SCHEDULER_MAX_AGE=180
# MONITORING_WORKER_MAX_AGE=300

# Rate-limit repeated health alerts
# MONITORING_ALERT_COOLDOWN=300

# Scheduled evaluate + Sentry/log emit
# MONITORING_EVALUATE_ENABLED=true
```

## Manual verification

### Production / staging uptime

```bash
curl -sS -o /tmp/mutqin-health.json -w "%{http_code}\n" https://app.mutqin.ai/health
cat /tmp/mutqin-health.json
# Expect HTTP 200 and {"status":"ok"} or {"status":"degraded"} after scheduler is on.
# Expect HTTP 503 only when critical deps fail.

curl -sS -o /dev/null -w "%{http_code}\n" https://app.mutqin.ai/up
# Expect 200
```

### Detailed checks (staging)

```bash
curl -sS https://staging.example/internal/health | jq .
# Optional token:
curl -sS -H "X-Mutqin-Monitoring-Token: $MONITORING_INTERNAL_TOKEN" \
  https://staging.example/internal/health | jq .
```

### Heartbeats

```bash
php artisan mutqin:health-heartbeat
php artisan queue:work --once   # if using database/redis queue
php artisan mutqin:health-evaluate
curl -sS http://127.0.0.1:8000/internal/health | jq .checks
```

### Safe alert test (staging only)

1. Set `APP_ENV=staging`, `APP_DEBUG=false`, and `SENTRY_LARAVEL_DSN` for staging.
2. If `MONITORING_INTERNAL_TOKEN` is set, pass it on the request.

```bash
curl -sS -H "Accept: application/json" \
  -H "X-Mutqin-Monitoring-Token: $MONITORING_INTERNAL_TOKEN" \
  https://staging.example/internal/alert-test
```

3. Confirm:
   - JSON `logged: true`
   - Log line `monitoring.alert_test` with `probe: true`
   - Sentry event “Mutqin monitoring alert test” tagged `feature=monitoring`, `probe=true`
4. Confirm production returns **404**:

```bash
curl -sS -o /dev/null -w "%{http_code}\n" https://app.mutqin.ai/internal/alert-test
```

## Related

- [ERROR_TRACKING.md](./ERROR_TRACKING.md) — Sentry, `/up` vs exception probe
- [database-deploy-safety.md](./database-deploy-safety.md) — release / migrate / queue restart
- [speechmatics-capacity.md](./speechmatics-capacity.md) — AI capacity signals (degraded AI ≠ app down)
