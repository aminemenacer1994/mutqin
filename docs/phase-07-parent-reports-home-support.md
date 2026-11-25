# Phase 07 — Reports & practical home support

**Date:** 2026-11-25  
**Priority:** P2  
**Scope:** Parent weekly/monthly learning reports, home-practice guidance, Progress/More entry points, PDF export.

`00-shared-rules.md` was not present in the repository; conventions follow existing phase docs.

---

## Audit summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Weekly/monthly reports from verified data | **Met** | `RecordParentLearningReportCollector`, `ParentLearningReportGenerator`, `mutqin:generate-parent-reports` |
| Attendance, homework, practice, feedback, memorisation | **Improved this pass** | Attendance period snapshot; existing assignment/activity/feedback/hifz collectors |
| Reports from Progress and More (no duplicated logic) | **Improved this pass** | `ParentFamilyProgress` → `open-reports`; `ParentFamilyMore` tile; single API `getParentReports` |
| What to practise at home (teacher-approved only) | **Improved this pass** | `home_practice` payload + `ParentFamilyReports` section |
| AI vs teacher evidence & missing data | **Met** | `sources`, narrative disclaimers, `reports_evidence_note`, insufficient flag |
| PDF download/print | **Met** | `ParentReportController::download`, `ParentLearningReportExporter` |
| Access isolation & revoked links | **Met** | `ParentLearningReportReader`, `ParentLearningReportTest` |
| Core reports free (no new paywalls) | **Met** | Gated by `ParentFeatures` + guardian permissions only |
| Historical periods & date range | **Met** | Stored `ParentLearningReport` rows, period picker (12 periods) |

---

## Changes this pass

| File | Change |
|------|--------|
| `app/Services/Parent/RecordParentLearningReportCollector.php` | Period attendance; `home_practice` from open homework + teacher revision tasks |
| `app/Services/Parent/ParentLearningReportReader.php` | Permission-aware attendance/home practice; attendance-only report access |
| `resources/js/components/parent/ParentFamilyReports.vue` | Attendance panel, home practice, evidence note |
| `resources/js/components/parent/ParentFamilyProgress.vue` | Link to Reports view |
| `resources/js/views/ParentDashboard.vue` | Wire `open-reports` |
| `resources/js/locales/en.json` | New report strings |
| `resources/views/parent/learning-report.blade.php` | PDF sections for attendance and home practice |
| `tests/Feature/ParentLearningReportTest.php` | Assert `home_practice` on open homework |
| `tests/js/phase-07-parent-reports-verify.mjs` | Static phase gate |

---

## Tests run

```bash
node --test tests/js/phase-07-parent-reports-verify.mjs
node --test tests/js/parent-reports-view.test.mjs
php artisan test --filter=ParentLearningReportTest
```

---

## Blockers / notes

- **`00-shared-rules.md`** not in repo.
- **Parent → student practice tools** — not linked (parents lack student app role); home practice stays descriptive per teacher tasks.
- **Attendance in reports** requires teacher circle membership (same as Progress attendance API).