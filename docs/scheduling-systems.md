# Mutqin scheduling systems

Mutqin uses several complementary scheduling mechanisms. They are intentionally separate today; unification is planned incrementally.

## Personalisation

`PersonalizedRecommendationEngine` builds a learner snapshot and attaches evidence-backed `why` / `why_summary` / `why_points` to every next-session recommendation.

Intelligence **compounds** as data arrives. Session evidence always wins; history is unlocked in tiers:

| Tier | Typical data | What changes |
|------|----------------|--------------|
| **sparse** | 0–2 sessions, little AI Recite | Follow this sitting only. Do not lock a favourite technique or pull overdue murājaʿah from a single strong pass (unless the Hifz plan is `revisionPriority` / `weakAyahFocus`). |
| **forming** | ~3+ sessions, or 2+ AI Recites / weak spots | Blend this session with recency-weighted technique memory and high-severity overdue spots. |
| **rich** | ~9+ sessions plus AI history or chronic weak spots | Rank overdue clusters by attempt count, prefer/avoid techniques from accepts and dismissals, and mention AI Recite trend in the why. |

Signals counted: completed sessions, AI Recite assessments, technique accept/dismiss, open weak spots, ayahs with progress. Weights live on `payload.personalisation.maturity`.

Overdue murājaʿah can outrank “continue” when `focusMode` is `revisionPriority` or `weakAyahFocus`, or when the learner is at least **forming**, the just-finished range was strong, and high-severity spots sit outside that range.

## Authoritative systems

| System | Location | When it applies |
|--------|----------|-----------------|
| **Post-session recommendations** | `app/Services/NextSessionRecommendationService.php` | After a session completes; server is source of truth |
| **Recommendation types mirror** | `app/Enums/RecommendationType.php` ↔ `resources/js/scripts/recommendations/nextSessionRecommendation.js` | Shared vocabulary; keep enums in sync when adding types |
| **In-session retention zones** | `resources/js/scripts/engine/useRetentionZones.js` | Fresh → Stable → Strong intervals during live practice |
| **Ayah progress intervals** | `resources/js/scripts/engine/spaced_repetition_memory.js` | Per-ayah mastery and next review in engine blob |
| **Adaptive assessment scheduling** | `resources/js/scripts/assessment/ReviewSchedulingService.js` | Client quiz follow-ups fed back via `/api/recommendations/adaptive-assessment` |

## Client blob persistence

Authenticated users sync engine state (including ayah progress and workspace prefs) via:

- `GET /api/state`
- `POST /api/state`

The Laravel `LearningStateDeriver` projects sessions, progress, and analytics from that blob.

## Removed / deprecated

- **Quiz SM-2 stub** — Previously loaded `telawa.sm2` in the workspace but never updated card intervals, so all quiz cards were treated as due. Removed in favour of simple verse ordering until a full scheduler is wired to retention zones.
- **Legacy web sync** — `/memorisation/sync-state` removed; use `/api/state` only.

## When changing scheduling rules

1. Post-session behaviour → change PHP `NextSessionRecommendationService` and add PHPUnit coverage.
2. In-session review timing → change retention zones / ayah progress modules and JS tests under `tests/js/`.
3. Adaptive quiz outcomes → change assessment policy services and mirror into recommendation API payloads if needed.
