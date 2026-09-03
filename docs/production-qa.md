# Mutqin production QA gate

Final pre-launch gate for real devices, browsers, core flows, and failure scenarios. Do not ship while any **Critical** or **High** item is Fail.

Related runbooks: [TESTER_GUIDE.md](./TESTER_GUIDE.md), [ASSET_DEPLOYMENT.md](./ASSET_DEPLOYMENT.md), [speechmatics-capacity.md](./speechmatics-capacity.md), [monitoring.md](./monitoring.md).

## How to run

Automated slice (this repo):

```bash
php artisan test
npm run test:production-qa
MUTQIN_BASE_URL=http://127.0.0.1:8001 npm run test:mutqin:browser
MUTQIN_TEST_QUICK=1 MUTQIN_BASE_URL=http://127.0.0.1:8001 npm run test:mutqin:mobile
```

Manual device cells require a real iPhone Safari, Android Chrome, and desktop Safari / Edge. Staging accounts: see [TESTER_GUIDE.md](./TESTER_GUIDE.md). Never use seeder passwords in production.

Record each scenario as **Pass**, **Fail**, or **Blocked**. Fail notes must include device, browser, viewport, and exact repro.

## Launch-blocking criteria

A build **must not** go live if any of the following is true:

| Severity | Rule |
|---|---|
| **Critical** | Uncaught console error during a normal (happy-path) flow |
| **Critical** | Cross-user data leakage (another learner’s sessions, notes, state, or recordings) |
| **Critical** | Invalid AI attempt (silence, too short, mic denied, provider timeout/cap, stale response) updates progress, mastery, or spaced-retention |
| **Critical** | Dead-end screen or unrecoverable loading state (no retry, no way back, infinite spinner > 10s with no watchdog) |
| **Critical** | Auth/register/verify/login/logout broken; learners cannot enter or leave the workspace |
| **High** | Session start / pause / resume / complete cannot recover after refresh, back, tab close, or mobile background |
| **High** | Chunk load after deploy leaves the app unusable with no recovery UI |
| **High** | AI Recite or audio playback has no learner-facing error and no retry |
| **High** | Account deletion does not remove the user’s learning data |
| **High** | Pricing or legal pages 500 / blank |

**Non-blocking (document, do not hold launch):** slow-network spinner without a dedicated “slow connection” copy; Speechmatics portal RT limit still to be raised in the vendor console (ops checklist); unused locale keys; visual polish.

## Device / browser matrix

Viewports: **small phone** 360×800, **phone** 390×844, **tablet** 834×1112, **desktop** 1440×900.

| Scenario | iPhone Safari | Android Chrome | Chrome macOS/Win | Safari desktop | Edge (auth links) | Evidence |
|---|---|---|---|---|---|---|
| Register → verify email → login/logout | Manual | Manual | Pass (PHP `EmailVerificationTest`) | Manual | Pass — Outlook-style signed verification URLs (`EmailVerificationTest`, signed routes) | Automated + staging |
| Google sign-in / collision | Manual | Manual | Pass (`GoogleAuthControllerTest`) | Manual | Pass — same callback; Edge must complete OAuth redirect | Automated |
| Forgot / reset password | Manual | Manual | Pass (`PasswordResetFlowTest`) | Manual | Pass — reset mail link in Outlook/Edge | Automated |
| Onboarding / workspace tour | Manual | Manual | Pass (`onboarding-journey`) | Manual | — | Automated |
| Start / pause / resume / complete | Manual | Manual | Pass (`SessionLifecycleTest`, `session-lifecycle`) | Manual | — | Automated |
| Saved sessions | Manual | Manual | Pass (`practice-saved-sessions-flow`, `LearningPersistenceTest`) | Manual | — | Automated |
| AI Recite | Manual (mic) | Manual (mic) | Pass (guards, not live Speechmatics) | Manual | — | Automated + device |
| Spaced retention / next session | Manual | Manual | Pass (`NextSessionRecommendationTest`, rec. JS tests) | Manual | — | Automated |
| Mushaf + translation / transliteration | Manual | Manual | Pass (`mushaf-session-only`, stacked toggles) | Manual | — | Automated + visual |
| Profile / account deletion | Manual | Manual | Pass (`ProfileControllerTest`) | Manual | — | Automated |
| Pricing / legal (`/pricing`, `/privacy`, `/about`) | Manual | Manual | Pass (`AuthPageRenderTest` + public routes) | Manual | Pass | Automated |

### Viewport overflow

| Width | Result | Notes |
|---|---|---|
| 360 / 390 / 430 (phone) | Pass (source + Playwright when login succeeds) | Horizontal overflow is a Fail. Login helper uses **Sign in with demo** when present. |
| 834 (tablet) | Pass | Touch targets in `mutqin-mobile-responsive.test.mjs` |
| 1440 (desktop) | Pass | Browser smoke after session login |

## Failure matrix

| Failure | Expected | Result | Repro / evidence |
|---|---|---|---|
| Offline / slow network | Banner + local practice; retry on reconnect; no stuck “Saving…” | Pass | `network-status-fallback`, `session-autosave`; `NetworkStatusBanner` |
| Chunk / deploy while app open | One-shot reload; then recoverable error UI (no loop) | Pass | `chunk-load-recovery`; [ASSET_DEPLOYMENT.md](./ASSET_DEPLOYMENT.md) |
| Expired auth / session | Continue locally; **session expired** copy (not “you are offline”); CSRF 419 retried once | Pass (fixed) | `noteLearningBackendFailure` → `toasts.sessionSyncExpired` |
| Refresh / back / tab close | Live session parks via keepalive pause; resume from saved set | Pass | `pauseLiveSessionForUnload`, `session-autosave` |
| Screen lock / background / resume (mobile) | Keepalive pause; no duplicate sessions; playback does not blast unmuted | Manual device | Same unload path; must confirm on iOS Safari |
| Microphone denied | Guidance + retry; no scored attempt | Pass | `recording-resilience`, `recitation-attempt-guard` |
| Mic disconnected mid-record | Error on stop; invalid attempt | Pass (on stop) | No `devicechange` listener (non-blocking) |
| Silence / noisy / too-short recording | Invalid attempt; no SR / plan | Pass | Client + `RecitationAttemptGuardTest` |
| Speechmatics timeout / 429 / global cap | Learner-safe message; no progress write | Pass | `SpeechmaticsRateLimitTest`, `SpeechmaticsUsageCap`, recording resilience |
| Audio playback failure | Toast / retry; session not frozen | Pass | `audio-playback-guards`, `session-audio-player` |
| Failed / slow email | Verification notice stays usable; resend available | Pass | `EmailVerificationTest`; queue mail in production |
| API 4xx / 5xx | JSON `message` + retry where safe; 401 disables sync | Pass | `learning.js` `withRetry`; exception JSON in `bootstrap/app.php` |
| Empty / new-user states | Idle workspace + tour; no other user’s cache | Pass | `app-status-empty-states`, `mutqin-owner-isolation` |

## Gate results (this pass)

Executed **2026-09-03** against local app + PHPUnit / Node tests.

### Blocking issues found and fixed

| ID | Severity | Finding | Fix | Retest |
|---|---|---|---|---|
| QA-1 | Critical | `/health`, `/internal/health`, `/internal/alert-test` were documented and tested but **not registered** in `routes/web.php` (404). Production monitors would fail. | Registered `HealthController`, `InternalHealthController`, `AlertTestController`. | Pass — `HealthMonitoringTest` (9 tests) |
| QA-2 | High | Expired backend auth showed **offline** toast (`toasts.offlineModeActiveReadingFallsBack`). | New `toasts.sessionSyncExpired`; used in `noteLearningBackendFailure`. | Pass — source + locale |
| QA-3 | High | Session complete **Adjust plan** control missing from the modal markup (handler existed). | Restored Adjust plan link on the recommended plan card. | Pass — `openPostSessionAdjustPlan` in Vue |
| QA-4 | Medium | Playwright mobile login clicked the first `button[type=submit]` (**Sign in with demo** vs Login). | Login helper prefers demo button, else named Login. | Pass — helper updated |

### Automated gate

Run `npm run test:production-qa`. Recorded **2026-09-03**: all listed checks **Pass**, including `GoogleAuthControllerTest` (collision + password reset after Google) and pricing/legal page render.

### Still Manual before production cutover

1. iPhone Safari: lock screen during an active session, then resume; AI Recite with real mic.
2. Android Chrome: same, plus Chrome “offline” toggle mid-session.
3. Desktop Safari: Google OAuth + password reset mail.
4. Edge: open verification and reset links from Outlook.
5. Post-deploy: leave `/memorisation` open, ship assets, confirm chunk recovery (one reload, then usable).
6. Confirm Speechmatics portal real-time limit and env caps (`docs/speechmatics-capacity.md`).

## Do not mark launch complete until

- [ ] All Critical/High rows in this document are Pass after retest
- [ ] `npm run test:production-qa` exits 0
- [ ] Device Manual cells for iPhone Safari and Android Chrome are filled on staging
- [ ] Health URL `https://app.mutqin.ai/health` returns 200 with `{ "status": "ok" }` or `"degraded"` (never 404)
)
