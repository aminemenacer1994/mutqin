# Error tracking

Mutqin uses **Sentry** as the single error-tracking provider (`sentry/sentry-laravel` on the backend). The Vue app does not add a second vendor SDK. Browser failures are sanitized and posted to `POST /api/client-errors`, which writes the same structured log and, when a DSN is set, the same Sentry project.

## Where errors are visible

| Surface | What you see | Contains |
|---|---|---|
| **Sentry** (staging/production) | Exceptions, provider failures, client events | Environment, release, route, feature area, request ID, user **ID only** |
| **`storage/logs/laravel.log`** | `exception.reported`, `client.exception.reported`, `provider.request.failed`, `api.request.completed` | Same context via `MutqinLog` — works even without a DSN |
| **`X-Request-Id` response header** | Correlation ID on web + API | Echoed from `AssignRequestId` |
| **Production 500 page / API JSON** | Friendly copy only | `message` + `request_id` (no stack, no class names) |
| **Learner UI** | Existing i18n banners / `NetworkFallback` | Never technical provider/token/audio details |

Sentry is silent until `SENTRY_LARAVEL_DSN` (or `SENTRY_DSN`) is set in the host environment. Never commit a DSN.

## What is never sent

Redaction runs on both sides (`SensitiveDataRedactor` / `sanitizeErrorPayload.js`) and again in Sentry `before_send`:

- Passwords, reset tokens, auth/JWT/CSRF tokens, API keys
- Raw microphone audio, `data:audio` / `blob:` payloads, transcripts
- Email, phone, and long Arabic runs (Qur'an text / notes)
- SQL bindings and HTTP-client breadcrumbs (disabled in `config/sentry.php`)

User context is `{ id }` only. `send_default_pii` stays `false`.

Expected failures are **not** reported as exceptions: validation `422`, auth `401`/`403`, `404`, `419`, and other 4xx `HttpException`s. `429` and `5xx` provider/API failures **are** captured with status + latency only.

## Staging verification

1. Set in the staging environment (Laravel Cloud or `.env`):

   ```
   APP_ENV=staging
   APP_DEBUG=false
   SENTRY_LARAVEL_DSN=https://...@....ingest.sentry.io/...
   SENTRY_ENVIRONMENT=staging
   SENTRY_RELEASE=<git-sha-or-build>
   MUTQIN_ASSET_BUILD=v165
   ```

2. **Backend probe** (non-production is open; production requires a verified admin):

   ```
   curl -i -H "Accept: application/json" https://staging.example/internal/error-test
   ```

   Expect HTTP 500, JSON `{ "message": "Something went wrong. Please try again.", "request_id": "..." }`, and `X-Request-Id`. In Sentry, look for `ErrorTrackingProbeException` tagged `feature=error_tracking`, `probe=true`. In logs: `exception.reported`.

3. **Frontend ingest**

   Open staging, DevTools → Console, then:

   ```js
   Promise.reject(new Error('mutqin-staging-client-probe'))
   ```

   Expect `client.exception.reported` in Laravel logs and a Sentry event tagged `layer=frontend`. The user still sees the normal workspace (unhandled rejections are not shown as technical stacks).

4. **Provider failure**

   Temporarily break a Quran/Mushaf upstream (or use a throwaway host allowlist miss). Confirm `provider.request.failed` with `status` / `latency_ms` / `provider` and **no** response body or verse text.

5. **Validation is quiet**

   Submit an empty `POST /api/state` while signed in. Expect `422` and **no** `exception.reported` / Sentry issue.

## Releases and source maps

- Release string: `SENTRY_RELEASE` or `MUTQIN_RELEASE`, else the asset build stamp (`MUTQIN_ASSET_BUILD`, default `v165`). The same value is in `<meta name="mutqin-release">`.
- Production Mix builds emit **hidden** source maps (`hidden-source-map`, no `sourceMappingURL` in public JS) and **move** `*.map` to `storage/app/sourcemaps/` so they are not web-served.
- After a production build, upload maps if you want readable frontend stacks in Sentry:

  ```
  sentry-cli sourcemaps upload --release "$SENTRY_RELEASE" storage/app/sourcemaps
  ```

  Do not copy maps back into `public/`.

## Health vs probe

- `GET /up` — Laravel health (liveness). Not an exception probe.
- `GET /internal/error-test` — authorized exception probe. Disabled entirely with `ERROR_TRACKING_PROBE_ENABLED=false`. In production it returns **404** unless the caller is a verified allowlisted admin.

## Dedup

- Backend: one structured log + Sentry capture per exception object / provider fingerprint / client fingerprint per request.
- Frontend: `__mutqinReported` on the Error plus an 8s fingerprint window so Vue `errorHandler`, `unhandledrejection`, and the Axios interceptor do not triple-report the same failure.
- `POST /api/client-errors` is not written to `api.request.completed` access logs.
