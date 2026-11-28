# MUTQIN 2.0 — Interactive Mushaf mistake marking

**Status:** Teacher playback + manual live marking (Nov 2026)  
**Constraints:** Manual teacher assessment only; no AI Tajweed/Makharij scores.

## Implemented

| Area | Notes |
|------|-------|
| Authentic Madani page mushaf in playback studio | `TeacherMushafMarkingWorkspace` + `MadaniSpread` |
| Reading vs Mark mistakes modes | Toolbar in workspace; reading seeks audio, marking opens coaching |
| Passage lines vs Mushaf pages | Toggle in `TeacherRecitationPlaybackReview` |
| Non-destructive overlays | `MadaniWord` semantic underlines; Tajweed ink unchanged |
| Categories | memorisation, tajweed, makharij, pronunciation, hesitation, fluency, other |
| AI vs teacher distinction | Dashed tentative underlines for wording-match flags |
| Multiple annotations / undo | Corrections per word; soft-delete via `DELETE …/corrections/{id}` |
| Manual marking without recording | `mushaf_annotations` + `TeacherMushafManualMarkPanel` |
| Recurring mistakes | Existing `TeacherWordCoachingService::recurringForLearner` (stable surah/ayah/word ids) |

## APIs

- `POST/GET/DELETE /api/teacher/students/{student}/mushaf-annotations` — manual / live contexts
- Extended `POST …/playback/words` with `category`, `severity`, `publish`
- `DELETE …/playback/corrections/{correction}` — remove annotation (undo)

## Unsupported granularities

- **Letter-level selection:** no validated glyph→letter map in Madani v2 assets (spec §1).
- **Live lesson dedicated route:** use manual panel with `context_type=manual_live` until lesson rooms ship.
- **Examination-specific shell:** reuse playback + assignment review; no separate exam mushaf chrome yet.

## Tests

```bash
php artisan test tests/Feature/MushafAnnotationMarkingTest.php
node --test tests/js/mushaf-annotation-marking.test.mjs
```

## Manual QA

1. Open teacher playback studio → switch **Mushaf pages** → **Mark mistakes**.
2. Tap a word → choose category → send correction → underline appears.
3. Confirm AI dashed underline differs from solid teacher underline.
4. Toggle **Reading** → tap word → playback seeks.
5. Optional: embed `TeacherMushafManualMarkPanel` on a student profile for live marking without audio.