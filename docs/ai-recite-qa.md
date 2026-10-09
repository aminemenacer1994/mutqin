# Mutqin AI Recite — Comprehensive QA Audit

Generated: 2026-10-09

## Scope

- Feature: AI Recite (Qur’an memorisation **word accuracy** — not Tajweed/harakat).
- Provider: **Speechmatics** (unchanged).
- Matrix source: `tests/js/fixtures/ai-recite-qa-matrix.mjs` (AIR-001 … AIR-100).
- Runner: `tests/js/ai-recite-qa-matrix.test.mjs` + linked suites / `npm run audit:recitation-scenarios`.

## Entry points

| Entry | Path | Notes |
|---|---|---|
| Workspace session CTA | `Memorisation.vue` → `openWorkspaceAiRecite` → AMD modal | Primary start path; saves as `dashboard_ai_recite` |
| Post-session adaptive check | Post-session modal AI Recite prompt | Session-linked assessment |
| Progress / dashboard results | `Dashboard.vue` `#ai-recite-results` | History/stats/listen — **no** start CTA |
| Orphan modal (not mounted) | `DashboardAiReciteModal.vue` | Recording helpers remain; modal not mounted on Dashboard (by design) |

## Architecture (brief)

1. Browser mic → Speechmatics realtime (`transcription-token` + websocket).
2. `stabilizeRecognitionEvent` commits high-confidence words; rejects low-confidence into `rejectedWords`.
3. Live: `buildQuranAlignment(..., { lifecycle: "live" })` — unread tail `UNASSESSED`/`pending`.
4. Final: `buildDeterministicRecitationResult` / PHP `QuranAlignmentService::align` — omissions as `DELETION`/`omitted` (not `incorrect`).
5. `classifyRecitationAttempt` / PHP `RecitationAttemptClassifier` gate scoring + mastery + plans.
6. Persist: `/api/memorisation/assessments` (+ `/api/ai-recite-attempts*` for audio/stats).

## Summary

| Status | Count |
|---|---:|
| PASS | 90 |
| FAIL | 0 |
| BLOCKED | 8 |
| NOT TESTED | 2 |
| **Total** | **100** |

### Confirmed defects fixed this pass

| ID | Severity | Finding | Fix |
|---|---|---|---|
| AIR-040 / QA-AIR-1 | High | ASR tokens below the confidence floor were dropped, then the attempt looked like **silence** (“didn’t hear any recitation”). | Propagate `rejectedWords` on assessment results; `resolveInsufficientAudioReason` returns `low_confidence` when rejected/raw low-confidence tokens exist. Regression in `recitation-attempt-guard.test.mjs` + matrix runner. |
| AIR-068 / QA-AIR-2 | Medium | `accuracyPracticeBand` test expected 88% as focused after strong floor moved to 85%. | Aligned `ai-recite-practice-plan.test.mjs` with `RECITATION_THRESHOLDS` (strong ≥ 85, focused ≥ 68). |
| QA-AIR-3 | High | Persist path accepted `alignment_lifecycle=live`, so provisional live could write completed assessments / mastery. | Reject live lifecycle on `RecitationAssessmentService::create` as `cancelled_stale` / `provisional_live`; stop using `completion_state` as a lifecycle signal. |
| QA-AIR-4 | High | Transcript-only tokens used confidence `0.5` (> uncertain floor `0.42`), so mismatches became definite mistakes. | `TRANSCRIPT_ONLY_CONFIDENCE = 0.40` so mismatches stay UNASSESSED. |
| QA-AIR-5 | High | `SessionAnalysisQueryService::forAttempt` preferred the session’s latest assessment over the attempt’s linked assessment. | Prefer `assessmentForAttempt`, then fall back to session latest. |

### Remaining risks (not production-blocking for automated path)

1. **Device / live Speechmatics** cells (AIR-054, AIR-055, AIR-092–AIR-097) are BLOCKED until filled on staging per [recitation-device-qa.md](./recitation-device-qa.md).
2. **Mic disconnect mid-record** (AIR-098) has no `devicechange` listener — documented non-blocking in [production-qa.md](./production-qa.md).
3. **Orphan** `DashboardAiReciteModal.vue` is unused; workspace path is the start surface (intentional).
4. Do **not** claim live ASR accuracy from fixture scores alone.

### Production readiness

**Not ready for production cutover** until BLOCKED device/live-provider cells Pass on staging (especially AIR-054, AIR-055, AIR-092, AIR-094, AIR-095).

**Automated path:** ready — Critical/High fixture, guard, persistence, and parity suites Pass; no open Critical automated FAIL.

## How to re-run

```bash
node --experimental-vm-modules tests/js/ai-recite-qa-matrix.test.mjs
npm run audit:recitation-scenarios
php artisan test --filter='AiRecite|RecitationAttempt|QuranAlignment|Speechmatics|DashboardAiRecite'
npm run test:production-qa
```

## Scenario matrix

| Test ID | Scenario | Expected | Actual | Status | Automated test | Severity (if fail) | Fix applied | Manual remaining |
|---|---|---|---|---|---|---|---|---|
| AIR-001 | Perfect short phrase (Al-Fatiha fragment) | All MATCH/correct; accuracy 100; strong | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `perfect_fatiha_fragment`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-002 | Substitution (wrong last word) | Final word SUBSTITUTION/partial; accuracy ~80 | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `substitution_wrong_word`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-003 | Omission / skipped middle word | DELETION/omitted for skipped slot; later words still MATCH | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `skipped_middle_word`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-004 | Insertion (extra spoken word) | Target words remain MATCH; INSERTION in extras | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `insertion_extra_word`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-005 | Repetition / stutter | Accuracy 100; stutter not counted as unresolved mistake | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `repetition_stutter`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-006 | Self-correction (wrong then right after pause) | SELF_CORRECTION extra; final statuses all correct | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `self_correction`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-007 | Restart from beginning | RESTART extras; final statuses correct | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `restart_from_beginning`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-008 | Hesitation / long pause between correct words | Pause is not an omission; accuracy 100 | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `hesitation_long_pause`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-009 | Drift then realignment | DIVERGENCE then REALIGNMENT; later words green | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `drift_realignment`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-010 | Ayah drift (similar ayah) then return | Drift classified; return realigns without cascade | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `ikhlas_drift_return`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-011 | Speechmatics glued basmala token | Glued token expands; accuracy 100 | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `basmala_glued_token`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-012 | Low-confidence noise filtered (not insertion) | Noise token UNASSESSED/filtered; accuracy 100 | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `low_confidence_noise_filtered`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-013 | Out-of-range words after ayah | OUT_OF_RANGE extras; target remains correct | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `out_of_range_tail`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-014 | Fast skip middle word | Skipped middle DELETION; accuracy ~75 | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `fast_skip_middle`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-015 | Clear word error (صمد vs أحد) | SUBSTITUTION/incorrect on wrong word | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `clear_ikhlas_error`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-016 | Unresolved substitution (no correction) | Middle SUBSTITUTION remains incorrect | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `unresolved_substitution`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-017 | Early stop — trailing unread words | Trailing DELETION/omitted (not incorrect); spoken prefix correct | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `early_stop_trailing_omission`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-018 | Wrong ayah (Ikhlas vs Basmala) | Low accuracy; no false strong; mistakes not cascading forever | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `wrong_ayah_ikhlas_vs_basmala`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-019 | Single middle error does not cascade | Only one incorrect; following words MATCH | Matches expected behaviour via automated suite `recitation-edge-scenarios.test.mjs` (edge: `cascade_single_error_no_spread`). | PASS | `recitation-edge-scenarios.test.mjs` | — | — | None |
| AIR-020 | JS/PHP edge-scenario accuracy parity | Speechmatics path and PHP probe match expected fixtures | Matches expected behaviour via automated suite `scripts/recitation-scenario-accuracy.mjs`. | PASS | `scripts/recitation-scenario-accuracy.mjs` | — | — | None |
| AIR-021 | Live early stop keeps unread tail pending | lifecycle=live → UNASSESSED/pending/neutral, never red incorrect | Matches expected behaviour via automated suite `speechmatics-edge-scenarios.test.mjs`. | PASS | `speechmatics-edge-scenarios.test.mjs` | — | — | None |
| AIR-022 | Live skipped middle word stays UNASSESSED until final | Live: UNASSESSED; final: DELETION | Matches expected behaviour via automated suite `speechmatics-edge-scenarios.test.mjs`. | PASS | `speechmatics-edge-scenarios.test.mjs` | — | — | None |
| AIR-023 | Live opening restart holds unread tail pending | Restart keeps prefix green; unread tail pending | Matches expected behaviour via automated suite `speechmatics-edge-scenarios.test.mjs`. | PASS | `speechmatics-edge-scenarios.test.mjs` | — | — | None |
| AIR-024 | Return after next ayah does not lock onto following ayah | Realtime preview realigns without false lock | Matches expected behaviour via automated suite `speechmatics-edge-scenarios.test.mjs`. | PASS | `speechmatics-edge-scenarios.test.mjs` | — | — | None |
| AIR-025 | Lost-lock garbage does not paint unread tail red | Unread tail stays pending after lost lock | Matches expected behaviour via automated suite `recitation-mistake-detection.test.mjs`. | PASS | `recitation-mistake-detection.test.mjs` | — | — | None |
| AIR-026 | AMD Al-Fatiha live alignment | Live paint progresses through Fatiha without thrash | Matches expected behaviour via automated suite `amd-al-fatiha-live-alignment.test.mjs`. | PASS | `amd-al-fatiha-live-alignment.test.mjs` | — | — | None |
| AIR-027 | Live cursor confirmed / soft-continue skip holes | Confirmed index advances; skip holes soft-continue | Matches expected behaviour via automated suite `live-cursor-confirmed.test.mjs`. | PASS | `live-cursor-confirmed.test.mjs` | — | — | None |
| AIR-028 | AMD live paint isolation from final scoring | Provisional live paint does not mutate final score path | Matches expected behaviour via automated suite `amd-live-paint-isolation.test.mjs`. | PASS | `amd-live-paint-isolation.test.mjs` | — | — | None |
| AIR-029 | Delayed / out-of-order segment supersession | Later segment supersedes earlier; no duplicate commits | Matches expected behaviour via automated suite `recitation-pipeline.test.mjs`. | PASS | `recitation-pipeline.test.mjs` | — | — | None |
| AIR-030 | STT stall recovery (AMD) | Stall recovers without false completion | Matches expected behaviour via automated suite `amd-stt-stall-recovery.test.mjs`. | PASS | `amd-stt-stall-recovery.test.mjs` | — | — | None |
| AIR-031 | Skip-hole soft continue | Soft-continue across skip holes without cascade reds | Matches expected behaviour via automated suite `amd-skip-hole-soft-continue.test.mjs`. | PASS | `amd-skip-hole-soft-continue.test.mjs` | — | — | None |
| AIR-032 | Both-ends highlight (AMD) | Highlight paints correctly at range ends | Matches expected behaviour via automated suite `amd-both-ends-highlight.test.mjs`. | PASS | `amd-both-ends-highlight.test.mjs` | — | — | None |
| AIR-033 | Backend alignment handoff (live→final types) | UNASSESSED maps to pending; final deletions preserved | Matches expected behaviour via automated suite `backend-alignment-handoff.test.mjs`. | PASS | `backend-alignment-handoff.test.mjs` | — | — | None |
| AIR-034 | Replay determinism (same stream → same score) | Identical recognition events yield identical analysis | Matches expected behaviour via automated suite `recitation-replay.test.mjs`. | PASS | `recitation-replay.test.mjs` | — | — | None |
| AIR-035 | Timing buffer / adaptive pace | Pace observer clamps silence auto-stop; no false end | Matches expected behaviour via automated suite `recitation-timing-buffer.test.mjs`. | PASS | `recitation-timing-buffer.test.mjs` | — | — | None |
| AIR-036 | Microphone permission denied | MICROPHONE_DENIED; no scoring / mastery write | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-037 | Silence / no speech | SILENCE_NO_SPEECH; invalid; no progress | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-038 | Recording too short | RECORDING_TOO_SHORT; not needs_practice | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-039 | Empty / low-confidence transcript | EMPTY_LOW_CONFIDENCE_TRANSCRIPT; no scoring | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-040 | All tokens filtered below confidence floor | Classified as low-confidence (not silence); retry guidance clear | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | High: filtered low-confidence tokens were classified as silence; now EMPTY_LOW_CONFIDENCE_TRANSCRIPT via rejectedWords/rawRecognitionWords in resolveInsufficientAudioReason + result.rejectedWords propagation. | None |
| AIR-041 | Provider network / timeout failure | PROVIDER_NETWORK_ERROR; session safe; no progress | Matches expected behaviour via automated suite `recording-resilience.test.mjs`. | PASS | `recording-resilience.test.mjs` | — | — | None |
| AIR-042 | Usage cap (429 usage_cap) | USAGE_CAP failure kind; learner-safe message | Matches expected behaviour via automated suite `recording-resilience.test.mjs`. | PASS | `recording-resilience.test.mjs` | — | — | None |
| AIR-043 | Rate limit (429 rate_limit) | RATE_LIMIT; no mint abuse; safe message | Matches expected behaviour via automated suite `recording-resilience.test.mjs`. | PASS | `recording-resilience.test.mjs` | — | — | None |
| AIR-044 | Cancelled / stale attempt response | Stale response dropped; CANCELLED_STALE not scored | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-045 | Concurrent attempts — accept only active id | acceptRecitationProviderResponse rejects mismatched ids | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-046 | Empty / invalid recording blob | validateRecordingBlob fails; too short / unusable | Matches expected behaviour via automated suite `recording-resilience.test.mjs`. | PASS | `recording-resilience.test.mjs` | — | — | None |
| AIR-047 | Background speakers — primary diarization | Primary speaker retained when clear; competing → unreliable | Matches expected behaviour via automated suite `speechmatics-edge-scenarios.test.mjs`. | PASS | `speechmatics-edge-scenarios.test.mjs` | — | — | None |
| AIR-048 | Noise / stutter resilience fixtures | Noise/stutter fixtures do not invent false mistakes | Matches expected behaviour via automated suite `recitation-noise-stutter.test.mjs`. | PASS | `recitation-noise-stutter.test.mjs` | — | — | None |
| AIR-049 | Silent AI evaluation never writes SR | Invalid silence/provider → spacedRepetitionUpdated false | Matches expected behaviour via automated suite `silent-ai-evaluation-guard.test.mjs`. | PASS | `silent-ai-evaluation-guard.test.mjs` | — | — | None |
| AIR-050 | Lifecycle interrupt mid-recite | Interrupt discards in-flight attempt; no duplicate persist | Matches expected behaviour via automated suite `recitation-lifecycle-interrupt.test.mjs`. | PASS | `recitation-lifecycle-interrupt.test.mjs` | — | — | None |
| AIR-051 | Microphone help copy / constraints | Mic help guidance present; constraints exported | Matches expected behaviour via automated suite `microphone-permission-help.test.mjs`. | PASS | `microphone-permission-help.test.mjs` | — | — | None |
| AIR-052 | Speechmatics token rate limit (PHP) | 429 when per-user/IP exceeded; guest blocked | Matches expected behaviour via automated suite `SpeechmaticsRateLimitTest.php`. | PASS | `SpeechmaticsRateLimitTest.php` | — | — | None |
| AIR-053 | Speechmatics usage cap (PHP) | Daily/global/emergency caps block mints safely | Matches expected behaviour via automated suite `SpeechmaticsUsageCapTest.php`. | PASS | `SpeechmaticsUsageCapTest.php` | — | — | None |
| AIR-054 | Real mic — quiet room Al-Fatiha | Live paint + strong/high accuracy on staging device | Not executed — iPhone Safari + Android Chrome on staging; see docs/recitation-device-qa.md quiet-room cell. | BLOCKED | `docs/recitation-device-qa.md` | Critical | — | iPhone Safari + Android Chrome on staging; see docs/recitation-device-qa.md quiet-room cell. |
| AIR-055 | Real mic — noisy room / lock-screen resume | Completes or guidance; no silence scored as practice; no duplicate attempt | Not executed — Device QA: noisy room + lock 10s resume cells in docs/recitation-device-qa.md. | BLOCKED | `docs/recitation-device-qa.md` | Critical | — | Device QA: noisy room + lock 10s resume cells in docs/recitation-device-qa.md. |
| AIR-056 | Silence does not create plan or progress (PHP) | invalid_attempt; accuracy null; 0 progress rows | Matches expected behaviour via automated suite `RecitationAttemptGuardTest.php`. | PASS | `RecitationAttemptGuardTest.php` | — | — | None |
| AIR-057 | Valid incorrect recitation is scored (PHP) | Real spoken mistakes persist as scored assessment | Matches expected behaviour via automated suite `RecitationAttemptGuardTest.php`. | PASS | `RecitationAttemptGuardTest.php` | — | — | None |
| AIR-058 | History accuracy excludes failed checks (PHP) | Failed/invalid attempts omitted from accuracy aggregates | Matches expected behaviour via automated suite `RecitationAttemptGuardTest.php`. | PASS | `RecitationAttemptGuardTest.php` | — | — | None |
| AIR-059 | Dashboard AI Recite saves attempt without plan (PHP) | ai_attempt saved; practice_plan null for dashboard source | Matches expected behaviour via automated suite `DashboardAiReciteTest.php`. | PASS | `DashboardAiReciteTest.php` | — | — | None |
| AIR-060 | Broken dashboard attempt not saved as success (PHP) | invalid_attempt / failed status; no success write | Matches expected behaviour via automated suite `DashboardAiReciteTest.php`. | PASS | `DashboardAiReciteTest.php` | — | — | None |
| AIR-061 | AI Recite attempt audio owner isolation (PHP) | Owner streams audio; other user 403; never-retention deletes | Matches expected behaviour via automated suite `AiReciteAttemptAudioTest.php`. | PASS | `AiReciteAttemptAudioTest.php` | — | — | None |
| AIR-062 | Idempotent AMD assessment submit | Same idempotency key returns cached submit; no duplicate write | Matches expected behaviour via automated suite `ai-recitation-reliability.test.mjs`. | PASS | `ai-recitation-reliability.test.mjs` | — | — | None |
| AIR-063 | Mastery write gated by attemptAffectsScoring | Invalid attempts → 0 mastery writes | Matches expected behaviour via automated suite `recitation-attempt-guard.test.mjs`. | PASS | `recitation-attempt-guard.test.mjs` | — | — | None |
| AIR-064 | Recitation mastery banding | Mastery updates only for valid scored attempts | Matches expected behaviour via automated suite `recitation-mastery.test.mjs`. | PASS | `recitation-mastery.test.mjs` | — | — | None |
| AIR-065 | Result state banding (strong/developing/needs_practice) | Insufficient audio never bands as needs_practice | Matches expected behaviour via automated suite `recitation-result-state.test.mjs`. | PASS | `recitation-result-state.test.mjs` | — | — | None |
| AIR-066 | Quran alignment unit coverage (PHP) | Early stop, mid-ayah, live UNASSESSED, self-correction cases pass | Matches expected behaviour via automated suite `QuranAlignmentServiceTest.php`. | PASS | `QuranAlignmentServiceTest.php` | — | — | None |
| AIR-067 | Captured session fixtures (redacted AddTranscript) | Captured fixtures score within agreed expectedAccuracy | Matches expected behaviour via automated suite `recitation-captured-sessions.test.mjs`. | PASS | `recitation-captured-sessions.test.mjs` | — | — | None |
| AIR-068 | Practice plan from AI Recite | Invalid attempts produce no practice plan; valid produce scoped plan | Matches expected behaviour via automated suite `ai-recite-practice-plan.test.mjs`. | PASS | `ai-recite-practice-plan.test.mjs` | — | — | None |
| AIR-069 | Workspace AI Recite result view | Result modal builds error counts / assessed scope correctly | Matches expected behaviour via automated suite `workspace-ai-recite-result-view.test.mjs`. | PASS | `workspace-ai-recite-result-view.test.mjs` | — | — | None |
| AIR-070 | Dashboard stats view + results section wiring | Stats view builds; progress page loads AI Recite results | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-071 | Workspace session AI Recite CTA entry | Memorisation exposes workspace-ai-recite CTA → AMD modal | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-072 | Progress page results (no orphan start CTA) | Dashboard shows results section; does not mount orphan start modal | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-073 | Post-session adaptive AI Recite prompt | Post-session can open AI Recite check | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-074 | Light / sepia / dark CTA palettes | Theme-specific gold palettes for workspace CTA | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-075 | Theme chrome (light/sepia/dark) | Theme modes registered; chrome variables applied | Matches expected behaviour via automated suite `theme-chrome.test.mjs`. | PASS | `theme-chrome.test.mjs` | — | — | None |
| AIR-076 | Live word presentation a11y marks | Status marks use underline/border styles per status; theme colours differ | Matches expected behaviour via automated suite `live-word-presentation-a11y.test.mjs`. | PASS | `live-word-presentation-a11y.test.mjs` | — | — | None |
| AIR-077 | Accessibility production pass | Production a11y contracts for workspace surfaces | Matches expected behaviour via automated suite `accessibility-production-pass.test.mjs`. | PASS | `accessibility-production-pass.test.mjs` | — | — | None |
| AIR-078 | Reduced motion respected on AI Recite CTA | prefers-reduced-motion disables glow animation | Matches expected behaviour via automated suite `dashboard-ai-recite.test.mjs`. | PASS | `dashboard-ai-recite.test.mjs` | — | — | None |
| AIR-079 | Mobile responsive workspace / overflow | No horizontal overflow; touch targets OK | Matches expected behaviour via automated suite `mutqin-mobile-responsive.test.mjs`. | PASS | `mutqin-mobile-responsive.test.mjs` | — | — | None |
| AIR-080 | Mobile scroll during AI Recite mushaf | Normal vertical scroll; AMD mushaf overflow handled | Matches expected behaviour via automated suite `amd-mushaf-overflow.test.mjs`. | PASS | `amd-mushaf-overflow.test.mjs` | — | — | None |
| AIR-081 | Session workspace scroll | Workspace scroll contracts hold during session | Matches expected behaviour via automated suite `session-workspace-scroll.test.mjs`. | PASS | `session-workspace-scroll.test.mjs` | — | — | None |
| AIR-082 | AI memorisation modal layout | AMD modal layout contracts; no redundant ready copy | Matches expected behaviour via automated suite `ai-memorisation-modal-layout.test.mjs`. | PASS | `ai-memorisation-modal-layout.test.mjs` | — | — | None |
| AIR-083 | AI audio consent / retention | Consent + retention options respected for attempt audio | Matches expected behaviour via automated suite `ai-audio-consent-retention.test.mjs`. | PASS | `ai-audio-consent-retention.test.mjs` | — | — | None |
| AIR-084 | Tashkil display not used for scoring | Diacritics display-only; scoring strips harakat | Matches expected behaviour via automated suite `recitation-tashkil-display.test.mjs`. | PASS | `recitation-tashkil-display.test.mjs` | — | — | None |
| AIR-085 | No Tajweed scoring in AI Recite path | Word accuracy path does not introduce Tajweed score denominator | Matches expected behaviour via automated suite `ai-recitation-reliability.test.mjs`. | PASS | `ai-recitation-reliability.test.mjs` | — | — | None |
| AIR-086 | Speechmatics remains the streaming provider | Transcription token + realtime path use Speechmatics (not swapped) | Matches expected behaviour via automated suite `SpeechmaticsTranscriptionTokenTest.php`. | PASS | `SpeechmaticsTranscriptionTokenTest.php` | — | — | None |
| AIR-087 | Pause detection (Speechmatics) | Hesitation events detected from timing; not scored as omissions | Matches expected behaviour via automated suite `speechmatics-pause-detection.test.mjs`. | PASS | `speechmatics-pause-detection.test.mjs` | — | — | None |
| AIR-088 | Noise vocabulary filtering | Non-Qur’anic noise vocabulary not scored as insertions | Matches expected behaviour via automated suite `speechmatics-noise-vocabulary.test.mjs`. | PASS | `speechmatics-noise-vocabulary.test.mjs` | — | — | None |
| AIR-089 | Last-word edge cases | Final word of ayah assessed without premature cut | Matches expected behaviour via automated suite `recitation-last-word.test.mjs`. | PASS | `recitation-last-word.test.mjs` | — | — | None |
| AIR-090 | Validation / incomplete recitation contracts | Validation helpers keep incomplete fair | Matches expected behaviour via automated suite `recitation-validation.test.mjs`. | PASS | `recitation-validation.test.mjs` | — | — | None |
| AIR-091 | QPC Madani recitation display integrity | Madani word sync does not break alignment indexes | Matches expected behaviour via automated suite `qpc-madani-recitation.test.mjs`. | PASS | `qpc-madani-recitation.test.mjs` | — | — | None |
| AIR-092 | Real Speechmatics ASR accuracy (live provider) | Live provider accuracy on staging corpus | Not executed — Do not claim ASR accuracy from fixtures. Run staging live Speechmatics + redacted capture into recitation-captured-sessions.mjs. | BLOCKED | `docs/recitation-device-qa.md` | Critical | — | Do not claim ASR accuracy from fixtures. Run staging live Speechmatics + redacted capture into recitation-captured-sessions.mjs. |
| AIR-093 | Real audio sample corpus scoring | Repository WAV/WebM samples score within band | Not executed — No committed real-audio corpus in repo. Add redacted captures per docs/recitation-device-qa.md. | BLOCKED | `tests/js/fixtures/` | High | — | No committed real-audio corpus in repo. Add redacted captures per docs/recitation-device-qa.md. |
| AIR-094 | iPhone Safari end-to-end AI Recite | Mic → live paint → result → no duplicate progress | Not executed — Fill iPhone Safari column in docs/recitation-device-qa.md on staging. | BLOCKED | `docs/recitation-device-qa.md` | Critical | — | Fill iPhone Safari column in docs/recitation-device-qa.md on staging. |
| AIR-095 | Android Chrome end-to-end AI Recite | Mic → live paint → result → no duplicate progress | Not executed — Fill Android Chrome column in docs/recitation-device-qa.md on staging. | BLOCKED | `docs/recitation-device-qa.md` | Critical | — | Fill Android Chrome column in docs/recitation-device-qa.md on staging. |
| AIR-096 | Desktop Chrome end-to-end AI Recite | Mic denied automated; quiet-room cell still manual | Not executed — Desktop Chrome quiet/noisy cells remain manual; mic-denied covered by recording-resilience. | BLOCKED | `docs/recitation-device-qa.md` | High | — | Desktop Chrome quiet/noisy cells remain manual; mic-denied covered by recording-resilience. |
| AIR-097 | Backgrounding / tab freeze recovery (device) | reconcileRecitationMediaAfterForeground; no duplicate scored attempt | Not executed — Source wiring automated; real backgrounding must be confirmed on iOS/Android. | BLOCKED | `ai-recitation-reliability.test.mjs` | High | — | Source wiring automated; real backgrounding must be confirmed on iOS/Android. |
| AIR-098 | Mic disconnect mid-record (device) | Error on stop; invalid attempt; no progress | Deferred — No devicechange listener (documented non-blocking in production-qa). Manually unplug headset mid-record on staging. | NOT TESTED | `docs/production-qa.md` | High | — | No devicechange listener (documented non-blocking in production-qa). Manually unplug headset mid-record on staging. |
| AIR-099 | Production QA gate includes recitation suites | npm run test:production-qa / audit:recitation-scenarios green | Matches expected behaviour via automated suite `scripts/production-qa-gate.mjs`. | PASS | `scripts/production-qa-gate.mjs` | — | — | None |
| AIR-100 | AI Recite production readiness roll-up | Critical/High automated PASS; device cells filled before cutover | Deferred — Roll-up: require AIR-054/055/092/094/095 Pass on staging before declaring production-ready. | NOT TESTED | `docs/ai-recite-qa.md` | Critical | — | Roll-up: require AIR-054/055/092/094/095 Pass on staging before declaring production-ready. |

## Accuracy requirements checklist

| Requirement | Result | Evidence |
|---|---|---|
| Never mark unspoken remaining as **incorrect** | PASS | Live `UNASSESSED`/`pending`; final `DELETION`/`omitted` (AIR-017/021) |
| Never claim mistake without confidence | PASS | Low-confidence filtered / UNASSESSED; AIR-012/040 |
| Self-correction & backtracking consistent | PASS | AIR-006/007 + PHP alignment tests |
| No false completion / duplicate progress writes | PASS | Idempotency + attempt id guards (AIR-044/045/062) |
| Provisional live ≠ final scoring | PASS | AIR-028 live paint isolation |
| Conservative poor audio / background speakers | PASS | AIR-047/048 + audio gate |
| No fabricated ASR accuracy claims | PASS | AIR-092/093 BLOCKED until live captures |

## Related docs

- [ai-recite-real-passages-qa.md](./ai-recite-real-passages-qa.md) — real surah/ayah mocked-recognition matrix (Quraysh, Fatihah, Ikhlas, …)
- [recitation-device-qa.md](./recitation-device-qa.md)
- [production-qa.md](./production-qa.md)
- [speechmatics-capacity.md](./speechmatics-capacity.md)

