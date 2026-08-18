# Mutqin scheduling systems

Mutqin uses several complementary scheduling mechanisms. They are intentionally separate today; unification is planned incrementally.

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
