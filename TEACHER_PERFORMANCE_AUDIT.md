# Mutqin teacher platform — performance audit

Source of truth: `http://localhost:8000/teacher` (Vue SPA + `routes/api.php` teacher prefix).

Work follows the Mutqin 2.0 teacher performance mastery brief (21 phases in 9 groups). This file is the living deliverable: baselines, bottlenecks, optimisations, and remaining work.

## Group status

| Group | Scope | Status |
| --- | --- | --- |
| 1 | Audit & baseline | **In progress** — inventory re-used from [TEACHER_OVERHAUL.md](TEACHER_OVERHAUL.md); bundle + API tooling wired |
| 2 | Database & backend | **Started** — `metricsFor` aggregation; attendance cache invalidation fix |
| 3 | Caching | Partial — overview uses `teacher.overview.v8.*` (60s TTL); `TeacherOverviewCache` centralises invalidation |
| 4 | Frontend rendering | **Started** — redundant API calls trimmed; message polling respects tab visibility |
| 5 | Page-specific | Pending |
| 6 | Assets, network, mobile | Pending |
| 7 | Queues & AI | Pending |
| 8 | Production & monitoring | Pending |
| 9 | Benchmarking & regression QA | Pending |

---

## Phase 1 — Architecture inventory (summary)

| Layer | Location |
| --- | --- |
| Web entry | `GET /teacher` → `teacher/dashboard.blade.php` → `teacher-dashboard` bundle |
| API | `Route::prefix('teacher')` in `routes/api.php` (~80 endpoints) |
| Services | `TeacherDashboardService` (3.5k LOC), `TeacherAssignmentService`, `TeacherAttendanceService`, … |
| Frontend | 85 Vue components under `resources/js/components/teacher/` |
| Styles | `resources/js/views/TeacherDashboard.css` → `public/css/teacher-dashboard.css` |

### Initial bottleneck findings

| Area | Evidence | Severity |
| --- | --- | --- |
| Overview payload builder | Single cached response aggregates KPIs, charts, hifz, review queue, roster, surahs | High CPU on cold cache; acceptable warm path (60s TTL) |
| `metricsFor()` | Per-student metrics for all authorised students on overview **and** students list | Scales O(students × related rows); runs on every cold overview |
| Session/AI day counting (fixed) | Loaded every `UserSession` + `AiReciteAttempt` row for roster | **Fixed** — `COUNT(DISTINCT day)` via union subquery |
| Progress row scan (fixed) | Full `memorisation_progress` per student | **Fixed** — grouped `COUNT` / `SUM` |
| Attendance → overview cache (fixed) | `TeacherAttendanceService` forgot `teacher.overview.{id}.{days}` but cache key is `teacher.overview.v8.*` | **Fixed** — `TeacherOverviewCache::forget()` |
| Duplicate HTTP on overview | After `GET /teacher/overview`, `loadAttentionPreview()` always called `GET /teacher/students?attention=1&per_page=100` | **Mitigated** — skipped when `kpis.needs_attention === 0` |
| Messages tab | `openView('messages')` also called `loadOverview()` | **Removed** — messages desk does not consume overview |
| Message polling | 10s interval on profile/thread UIs regardless of tab visibility | **Mitigated** — `pollWhenVisible.js` |
| JS bundle | `teacher-dashboard.*.js` ≈ **1.37 MiB** (threshold 950 KiB in `analyze-bundles.mjs`) | High transfer cost; route-level splits not yet applied |
| `TeacherDashboardService` size | God-service pattern; hard to reason about query budgets | Maintenance / further decomposition |

---

## Phase 2 — Baseline measurements (26 Nov 2026)

### Frontend bundles (`npm run perf:bundles:json`)

| Chunk | Size |
| --- | --- |
| `teacher-dashboard.*.js` | 1.37 MiB (**over budget**) |
| `teacher-dashboard.css` | (run `npm run build` after CSS edits) |
| Shared `app.js` | ~971 KiB |

### Existing learner API baseline (`scripts/perf/results/baseline.json`)

Captured with `php artisan mutqin:perf-benchmark` for **learner** hot paths (not teacher). Teacher-specific benchmark extension is tracked below.

### Tooling

```bash
npm run perf:bundles:json
php artisan mutqin:perf-benchmark --seed --json
npm run test:teacher:workspace   # responsive / nav smoke
php artisan test --filter=TeacherDashboardTest
php artisan test --filter=MetricConsistencyTest
```

Lighthouse / Playwright CWV matrix for `/teacher` — **pending** authenticated harness (upgrade modal, teacher demo login).

---

## Implemented optimisations (this pass)

1. **`TeacherAttendanceService`** — correct overview cache invalidation via `TeacherOverviewCache`.
2. **`TeacherDashboardService::metricsFor`** — aggregated active-day and memorisation progress queries (fewer rows loaded into PHP).
3. **`useTeacherDashboard.js`** — skip attention preview fetch when no students need attention; stop loading full overview when opening Messages.
4. **Message components** — visibility-aware 10s polling (`pollWhenVisible.js`).
5. **`TeacherDashboardTest`** — regression test that attendance updates invalidate cached overview snapshot.

### Files changed

- `app/Services/Teacher/TeacherAttendanceService.php`
- `app/Services/Teacher/TeacherDashboardService.php`
- `resources/js/scripts/composables/useTeacherDashboard.js`
- `resources/js/scripts/teacher/pollWhenVisible.js` (new)
- `resources/js/components/teacher/profile/TeacherStudentProfileMessages.vue`
- `resources/js/components/teacher/LearnerTaskThreadPanel.vue`
- `resources/js/components/teacher/LearnerStudentMessages.vue`
- `tests/Feature/TeacherDashboardTest.php`
- `TEACHER_PERFORMANCE_AUDIT.md` (this file)

---

## Remaining high-value work (prioritised)

1. **Extend `mutqin:perf-benchmark`** with teacher routes (`/api/teacher/overview`, `/students`, `/assignments`) and CI query budgets.
2. **Overview cold-path query budget** — further consolidate `metricsFor` + `refreshStatuses` on students list; consider embedding `attention_students` in overview to drop second HTTP call entirely.
3. **Bundle diet** — lazy-load chart/PDF/jspdf paths; audit locale chunks loaded on teacher boot; enforce `perf:bundles` gate in teacher release QA.
4. **Student profile** — tab-scoped API payloads (do not load all tabs on `students.show`).
5. **Lighthouse targets** — desktop ≥95 / mobile ≥90 on `/teacher` with throttled 4G (Phase 20).

---

## Non-negotiables (checklist)

- [x] Measure before optimising (bundles + existing benchmark tooling)
- [x] No security / tenancy regression
- [x] No stale financial or assessment data introduced by caching changes
- [ ] Full functional regression matrix (Phase 21)
- [ ] Documented before/after route latency for teacher APIs