# MUTQIN 2.0 — Attendance, communication & parent integration

**Date:** 27 Nov 2026  
**Scope:** Polish existing modules (no rebuild).

## Attendance

| Requirement | Status | Notes |
|-------------|--------|-------|
| Workspace audit | Done | `TeacherAttendanceSection.vue`, `TeacherEvidence.css` |
| Compact week + optional month | Done | Week strip + calendar dialog |
| Single consolidated toolbar | Done | `teacher-attendance__nav-card` merges class, lesson, search, status, mark-all + week controls |
| Lesson schedule modal | Done | `TeacherDialog` |
| Compact rows + segmented status | Done | Unmarked vs absent; tap-active to clear |
| Bulk / notes / history / export | Done | Existing API paths |
| Mobile shell | Done | Card layout under `teacher-attendance--mobile-shell` |

## Communication

| Requirement | Status | Notes |
|-------------|--------|-------|
| Teacher ↔ student messages | Done | `TeacherDirectMessageService`, profile + desk UI |
| Teacher ↔ parent threads | Done | `ParentTeacherConversationService`, `TeacherMessagesSection` parent tab |
| Notification reuse + dedup | Done | `ParentNoticeService::once()` / `source_key` |
| Duplicate send guard | Done | `client_message_id` on parent + teacher sends |
| Context links | Done | Task thread + `messages_about_task` in profile messages |
| Authorisation | Done | `StudentAccessAuthorizer`, `ParentAccessAuthorizer` (404, not 403) |

## Parent

| Requirement | Status | Notes |
|-------------|--------|-------|
| Permission-gated child data | Done | `ParentPlatformTest`, `ParentChildLearningService` |
| Weekly/monthly auto reports | Done | `ParentLearningReportReader` |
| Teacher-approved report sharing | Done | `StudentProgressReport` + **parent UI** (`ParentFamilyReports` teacher pills + PDF) |
| Private teacher notes hidden | Done | `presentForParent(..., includePrivateTeacherNotes: false)` |
| Actionable summaries | Done | Highlights + collapsible detail on Reports |

## QA (this pass)

```bash
php artisan test --compact \
  tests/Feature/StudentTeacherParentIntegrationTest.php \
  tests/Feature/ParentPlatformTest.php \
  tests/Feature/StudentProgressReportTest.php \
  tests/Feature/StudentLessonManagementWorkflowTest.php

node --test \
  tests/js/parent-home-dashboard.test.mjs \
  tests/js/phase-05-teacher-communication-verify.mjs \
  tests/js/mutqin-20-ecosystem-design-system.test.mjs
```

## Changed files (27 Nov 2026)

- `resources/js/components/teacher/TeacherAttendanceSection.vue` — consolidated register toolbar
- `resources/js/views/TeacherEvidence.css` — nav card + table density + mobile mark-all
- `resources/js/components/parent/ParentFamilyReports.vue` — teacher-approved reports
- `resources/js/scripts/parent/reportsView.js` — map teacher report payload
- `resources/js/scripts/api/learning.js` — parent progress-report API client
- `resources/js/locales/en.json` — parent report copy
- `tests/Feature/StudentLessonManagementWorkflowTest.php` — `forceFill` for guarded assignment

## Remaining (optional)

- Full Playwright matrix with live server (`teacher-workspace-responsive.cjs`, `phase4-parent-platform-audit.cjs`)
- Locale sync for new parent strings (`audit:i18n`)
- Messages mobile keyboard polish (see `TEACHER_MOBILE_2.0_PROGRESS.md`)