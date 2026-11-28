# MUTQIN 2.0 — Parent homework workspace

**Date:** 28 Nov 2026  
**Scope:** Parent-facing homework on existing assignment / recipient infrastructure (no duplicate homework engine).

## Status summary

| Requirement | Status | Notes |
|-------------|--------|-------|
| Homework for linked children | Done | `ParentChildLearningService::assignments`, `ParentFamilyLearning.vue` |
| Multi-child switching | Done | `ParentChildContextBar` + merged rows in `ParentDashboard.vue` |
| Title, Qur'an range, category, teacher, instructions, deadline, status | Done | `presentAssignmentRow` + detail modal |
| Lifecycle (to do → completed / overdue) | Done | `display_status` via `TeacherAssignmentService` |
| Instructions, voice notes, recitation demos | Done | `voice_instructions` on assignment payload |
| Published feedback | Done | `published_feedback` + `ParentAssessmentCard` |
| Mushaf annotations (published, passage-scoped) | Done (28 Nov) | `mushaf_annotations` on assignment row when `ViewProgress` granted |
| Interactive Mushaf page UI in parent modal | Partial | List + categories; full `MadaniSpread` overlay not embedded yet |
| Optional parent supervised-practice acknowledgement | Done (28 Nov) | `parent_homework_supervisions` + `POST …/assignments/{recipient}/supervision` |
| Acknowledgement isolated from student/teacher workflow | Done | Does not mutate recipient status |
| Weekly overview + upcoming on home | Done | `ParentFamilyOverview.vue` homework pane |
| Reminders | Done | `ParentNoticeService`, `LearningTaskNotifier` |
| Cross-platform sync | Done | Shared recipient rows; `refreshSharedStatuses` on parent fetch |
| Navigation “Homework” | Done | `parent.nav_learning` |
| Security (links, read-only, hidden private notes) | Done | `ParentChildLearningTest`, `ParentAccessAuthorizer` |

## QA

```bash
php artisan migrate --force
php artisan test --compact tests/Feature/ParentChildLearningTest.php tests/Feature/ParentCommunicationTest.php tests/Feature/TeacherAssignmentVoiceInstructionTest.php

node --test tests/js/parent-family-learning.test.mjs tests/js/parent-homework-groups.test.mjs tests/js/parent-home-dashboard.test.mjs
```

## Remaining blockers / optional

- **Full interactive Mushaf** in the homework detail modal (Madani spread + word overlays, parity with teacher playback) — annotations are listed today; reuse `TeacherMushafMarkingWorkspace` read-only when product priority allows.
- **`publishedForStudent` on student app** is not yet wired to learner assignment APIs (teacher-only mushaf routes); parent path uses the same published query server-side.
- Locale sync for new strings (`audit:i18n`).
- Playwright parent homework matrix (`tests/js/screenshots/phase4-parent-platform-audit/`).

## Files (28 Nov 2026 pass)

- `database/migrations/2026_11_28_130000_create_parent_homework_supervisions.php`
- `app/Models/ParentHomeworkSupervision.php`
- `app/Services/Parent/ParentChildLearningService.php` — supervision + mushaf payload
- `app/Http/Controllers/Api/Parent/ParentChildController.php` — acknowledge endpoint
- `routes/api.php`
- `resources/js/components/parent/ParentFamilyLearning.vue` — supervision + mushaf list
- `resources/js/components/parent/ParentAssessmentCard.vue` — feedback segments
- `resources/js/scripts/api/learning.js`
- `resources/js/locales/en.json`
- `tests/Feature/ParentChildLearningTest.php`