# Mutqin 2.0 — Ecosystem integration & UI/UX consistency

**Date:** 2026-11-25  
**Visual reference:** Teacher / Parent ivory–brown system (`TeacherDashboard.css`, shared `TeacherNav`, student `Dashboard.learner-teacher.css` control layer).

## Summary

| Surface | Shell | Nav | Design-system gate |
|---------|-------|-----|-------------------|
| Individual memorisation | Learner workspace (no `data-platform-shell`) | App navbar + dashboard jump | Workspace CSS + billing tests |
| Student (connected) | `data-platform-shell="student"` | `TeacherNav` mobile/desktop | `student-dashboard-design-system.test.mjs` |
| Teacher | `data-platform-shell="teacher"` | `TEACHER_NAV` | `TeacherDashboard.css` tokens |
| Parent | `data-platform-shell="parent"` | `PARENT_NAV` (incl. mobile Reports) | `mutqin-20-ecosystem-design-system.test.mjs` |
| Auth / connect | Blade + `ConnectionOnboarding.vue` | — | `phase4-teacher-onboarding-verify.mjs` |
| Public marketing | Blade SEO pages | — | Manual / `landing-page-visitor-test-checklist.md` |

Functional architecture and authorizer fixes are documented in [mutqin-2.0-audit.md](./mutqin-2.0-audit.md).

---

## Standardisation (this pass)

### Layouts & navigation

- Parent **Reports** restored on tablet/mobile bottom nav (was desktop-only via `mobile: false`), with shared `TeacherNav` and compact label `parent.nav_reports_short`.
- Keyboard **focus-visible** rings added for teacher/parent/student shell nav links (`TeacherNav`).
- Parent mobile content inset bumped (`--teacher-mobile-nav-offset`) for the seven-tab bar.

### Tokens & components

- Student dashboard continues to inherit teacher control heights, radii, semantic colours (`student-dashboard-design-system.test.mjs`).
- Parent/student/teacher dashboards all use `user-dashboard teacher-dashboard` + platform shell attribute.

### Accessibility

- Shell nav focus rings (teacher family).
- Student Phase 11 Playwright audit may still flag the *first* pane button in each view when tab-testing arbitrary controls — primary interactive controls use `:focus-visible` in the student design-system layer.

### Arabic / RTL

- Parent platform audit includes `ar` theme screenshots (`phase4-parent-platform-audit.cjs`).
- Student shell RTL inherits teacher nav and dash-jump patterns; full locale parity tracked via `npm run audit:i18n`.

---

## Verification matrix

| Check | Command / artifact | Status |
|-------|-------------------|--------|
| Authorizer regression | `php artisan test tests/Feature/Mutqin20AuditFixesTest.php` | Pass |
| Student design system | `node --test tests/js/student-dashboard-design-system.test.mjs` | Pass |
| Ecosystem shells & nav | `node --test tests/js/mutqin-20-ecosystem-design-system.test.mjs` | Pass (after this pass) |
| Teacher onboarding static | `node --test tests/js/phase4-teacher-onboarding-verify.mjs` | Pass (after this pass) |
| Role / platform switch | `php artisan test --filter=ParentPlatformTest` | Run in CI |
| Parent responsive UI | `node tests/js/phase4-parent-platform-audit.cjs` (needs local server) | Re-run after Reports nav fix |
| Teacher time-to-assignment | `node tests/js/phase4-teacher-journey-audit.cjs` (needs local server) | New artifact `journey.json` |
| Student responsive | `node tests/js/phase11-student-responsiveness-audit.cjs` | Environment-dependent |

---

## Remaining backlog (not blocking merge)

- **P0 deploy:** `MUTQIN_UNRESTRICTED_SUBSCRIPTION=false` in production.
- **P1:** Unified learner notification inbox API.
- **P2:** Consolidate `displayStatus` helpers; parent report strings in non-English locales still literal “Reports” in some files.
- **P2:** Default Laravel `welcome.blade.php` is not routed for production marketing (SPA/SEO routes own the public site).
- **P3:** Measure teacher time-to-first-assignment from `phase4-teacher-journey-audit.cjs` in CI with seeded credentials.

---

## Recommended local gate (UI + integration)

```bash
npm run build
node --test tests/js/student-dashboard-design-system.test.mjs
node --test tests/js/mutqin-20-ecosystem-design-system.test.mjs
node --test tests/js/phase4-teacher-onboarding-verify.mjs
php artisan test tests/Feature/Mutqin20AuditFixesTest.php
php artisan test --filter=ParentPlatformTest
# With php artisan serve + demo users:
# node tests/js/phase4-parent-platform-audit.cjs
# node tests/js/phase4-teacher-journey-audit.cjs
```

Do not widen teacher visibility via `organisation_id` alone; extend existing authorizers (see architecture diagram in `mutqin-2.0-audit.md`).