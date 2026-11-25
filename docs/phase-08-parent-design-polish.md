# Phase 08 — Shared design system & responsive polish

**Date:** 2026-11-25  
**Priority:** P1  
**Scope:** Align Parent views with Teacher shell tokens, simplify hierarchy, standardise states, tighten mobile-safe layout.

`00-shared-rules.md` was not present in the repository; conventions follow existing phase docs.

---

## Audit summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Reuse Teacher shell, typography, spacing, states | **Met** | All primary parent views use `teacher-page-header`, `teacher-stack`, `TeacherEmpty`, `NetworkFallback` |
| One page title + clear sections | **Improved** | Legacy `parent-page` icons/titles removed; duplicate home status bar removed |
| No ornamental gradients / heavy chrome | **Improved** | Parent shell background is flat `var(--teacher-bg)`; report heads drop extra shadow |
| Compact filters / no horizontal overflow risk | **Improved** | `parent-filters` padding/radius aligned with teacher cards (`16px`) |
| Standard loading / empty / error states | **Improved** | Messages & reports use `NetworkFallback` + skeletons |
| Progressive disclosure on analytics | **Met** | Reports/progress already fold long prose (`details`, KPI vs period split) |
| Dark mode & RTL readiness | **Met** | Existing parent dark tokens unchanged; text uses `overflow-wrap` on shell |

---

## Changes this pass

| File | Change |
|------|--------|
| `ParentFamilyOverview.vue` | Teacher page header; removed duplicate status bar |
| `ParentFamilyLearning.vue` | Teacher page header + `teacher-stack` |
| `ParentFamilyMessages.vue` | Header parity; `NetworkFallback`; skeleton loading; flat pane without duplicate title |
| `ParentFamilyReports.vue` | Header parity; `NetworkFallback` |
| `ParentFamilyMore.vue` | Removed ornamental header icon |
| `ParentChildMessages.vue` | Header parity; `NetworkFallback`; skeleton loading |
| `ParentChildProfile.vue` | Teacher page header layout |
| `TeacherDashboard.css` | Flat parent background; compact filters/report head; hub action wrapping |
| `tests/js/phase-08-parent-design-polish-verify.mjs` | Static phase gate |

---

## Tests run

```bash
node --test tests/js/phase-08-parent-design-polish-verify.mjs
node --test tests/js/mutqin-20-ecosystem-design-system.test.mjs
node --test tests/js/phase1-parent-platform-navigation.test.mjs
node --test tests/js/phase-07-parent-reports-verify.mjs
node --test tests/js/parent-home-dashboard.test.mjs
node --test tests/js/parent-progress-view.test.mjs
node --test tests/js/parent-reports-view.test.mjs
```

---

## Blockers / notes

- **`00-shared-rules.md`** not in repo.
- **Playwright screenshot audit** (`tests/js/phase4-parent-platform-audit.cjs`) not re-run here — needs `MUTQIN_QA_*` credentials and a running app.
- **Production CSS bundle** (`public/css/teacher-dashboard.css`) — run `npm run dev` or `npm run production` before browser QA so compiled CSS matches `TeacherDashboard.css`.
- **Home quick actions** remain three compact hub buttons (homework, progress, messages) — primary nav still handles wayfinding; reducing to one CTA would be a product call beyond polish.