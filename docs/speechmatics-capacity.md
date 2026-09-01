# Speechmatics capacity before production traffic

Mutqin cannot raise your Speechmatics account limit from code. This document states **what you must change in the Speechmatics portal**, how **application-side guards** relate to that cap, and how to **verify** readiness before real traffic.

## What Mutqin uses Speechmatics for

Each AI Recite / Check memorisation session mints a **short-lived realtime (RT) token** via `POST /memorisation/transcription-token`. One successful mint ≈ one AI voice-check session (default token TTL: `SPEECHMATICS_TOKEN_TTL`, 120 seconds). Mutqin counts mints — not audio bytes — and never stores learner audio on the server for this path.

## Provider hard cap (manual — Speechmatics dashboard)

You must raise the **account / contract usage limit** for **Realtime transcription** in the Speechmatics portal before launch. Mutqin has **no API** to read or change this limit.

| What to raise | Where | Notes |
|---------------|-------|--------|
| **Realtime (RT) usage allowance** | Speechmatics Portal → your organisation / billing / usage (exact menu varies by plan) | This is the **provider hard cap**. When exceeded, Speechmatics rejects new RT sessions regardless of Mutqin settings. |
| **Valid API key with RT scope** | Portal → API keys | Production key must be able to mint RT tokens (`POST https://mp.speechmatics.com/v1/api_keys?type=rt`). |

**Do not** copy guessed paid-plan numbers into Mutqin. After you agree a limit with Speechmatics, record it in env as a **reference only**:

```env
# Example: if your contract allows 10,000 RT minutes/day and TTL=120s → ~5000 mints/day
SPEECHMATICS_PROVIDER_DAILY_SESSION_MINUTES=10000
# or explicitly:
# SPEECHMATICS_PROVIDER_DAILY_TOKEN_MINTS=5000
```

Leave these **unset** until you have a real number from Speechmatics. Unset reference vars disable provider-reference alerts only; application caps still apply.

### How to verify the provider cap

1. **Portal** — Confirm RT usage / quota shows the raised limit (or “unlimited” per your contract).
2. **Smoke mint** — On staging with production-like env, sign in as a Pro user and start AI Recite once. Expect `200` with `access_token` from `POST /memorisation/transcription-token`.
3. **Upstream rejection** — If the key or account is over limit, Mutqin logs `Speechmatics token request was rejected.` with `status` from Speechmatics (e.g. 401/403/429). Learners see a generic unavailable message (no provider details).
4. **Load spot-check** — Mint several tokens in quick succession; per-user **rate limits** should return HTTP 429 before you hit the provider cap (see below).

## Application limits (env — enforced by Mutqin)

Set these **below** your provider reference so Mutqin stops minting before Speechmatics hard-stops traffic.

| Variable | Purpose | Default (tester) |
|----------|---------|------------------|
| `SPEECHMATICS_DAILY_USER_TOKEN_MINTS` | Per-user daily mint cap | `30` (~60 min @ 120s TTL) |
| `SPEECHMATICS_DAILY_GLOBAL_TOKEN_MINTS` | Global daily mint cap (emergency budget) | `200` (~400 min) |
| `SPEECHMATICS_EMERGENCY_GLOBAL_TOKEN_MINTS` | Optional **stricter** kill-switch (must be **lower** than global) | unset |
| `SPEECHMATICS_USAGE_WARN_PERCENT` | Log warning when usage ≥ this % of a limit | `80` |
| `SPEECHMATICS_USAGE_CRITICAL_PERCENT` | Log critical when usage ≥ this % | `95` |
| `SPEECHMATICS_USAGE_CAP_ENABLED` | Master switch for daily caps | `true` |

Session-minute alternatives (`SPEECHMATICS_DAILY_*_SESSION_MINUTES`, `SPEECHMATICS_PROVIDER_DAILY_SESSION_MINUTES`) convert using `SPEECHMATICS_TOKEN_TTL`. If both mints and minutes are set, the **tighter** limit wins.

When a cap is hit, new AI checks are rejected with a learner-safe JSON payload (`available: false`, `reason: usage_cap`). Messages:

- **User cap** — “try again tomorrow”
- **Global / emergency cap** — “temporarily unavailable due to high demand”

Per-user **rate limiting** (`SPEECHMATICS_RATE_LIMIT_*`) remains active even if you raise global/provider caps. It protects against retry storms and is independent of daily budgets.

## Monitoring and metrics (no audio stored)

Mutqin emits structured logs via `MutqinLog` (search your log stack for `service=mutqin`):

| Event | When |
|-------|------|
| `speechmatics.usage.mint_recorded` | After each successful mint — includes `global_mints_today`, estimated session-minutes, limits |
| `speechmatics.usage.threshold.warning` | Usage crossed `SPEECHMATICS_USAGE_WARN_PERCENT` |
| `speechmatics.usage.threshold.critical` | Usage crossed `SPEECHMATICS_USAGE_CRITICAL_PERCENT` |
| `speechmatics.usage.cap.reached` | Hard deny (user, global, or emergency scope) |
| `speechmatics.usage.daily_snapshot` | Scheduled UTC end-of-day snapshot |
| `Speechmatics token rate limit hit.` | Per-minute / burst limit (HTTP 429) |

Legacy plain-text lines (`Speechmatics usage cap approaching.`, `Speechmatics usage cap reached.`) are kept for existing alert rules.

**Daily snapshot command** (also scheduled at 23:50 UTC when usage cap is enabled):

```bash
php artisan mutqin:speechmatics-usage-report
```

Use `global_mints_today` and `estimated_global_session_minutes` to estimate checks/day and provider consumption.

**Misconfiguration alerts:**

- Application global cap **greater than** `SPEECHMATICS_PROVIDER_*` reference → `speechmatics.usage.misconfigured` (`app_cap_exceeds_provider_reference`)
- Emergency cap not lower than global cap → logged once and ignored

## Recommended production checklist

1. [ ] Raise **Realtime usage** in Speechmatics portal per your contract (manual).
2. [ ] Set `SPEECHMATICS_PROVIDER_DAILY_SESSION_MINUTES` or `SPEECHMATICS_PROVIDER_DAILY_TOKEN_MINTS` to that agreed value.
3. [ ] Set `SPEECHMATICS_DAILY_GLOBAL_TOKEN_MINTS` **below** the provider reference (headroom for spikes).
4. [ ] Set `SPEECHMATICS_DAILY_USER_TOKEN_MINTS` for expected learner behaviour.
5. [ ] Keep `SPEECHMATICS_RATE_LIMIT_ENABLED=true` (do not disable for launch).
6. [ ] Configure log alerts on `speechmatics.usage.threshold.critical` and `speechmatics.usage.cap.reached`.
7. [ ] Run smoke mint on staging, then `php artisan mutqin:speechmatics-usage-report` and confirm snapshot fields.
8. [ ] After env changes: `php artisan config:clear` (and `config:cache` in production).

## Related files

- `config/services.php` — Speechmatics provider reference, usage cap, rate limit
- `app/Services/SpeechmaticsUsageCap.php` — daily caps, soft thresholds, metrics
- `app/Services/SpeechmaticsRateLimit.php` — per-user / per-IP burst limits
- `.env.example` — all `SPEECHMATICS_*` variables
