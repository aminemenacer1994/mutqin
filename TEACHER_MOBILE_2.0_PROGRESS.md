# MUTQIN 2.0 — Teacher mobile reconstruction progress

**Date:** 27 Nov 2026  
**Scope:** Phases 1–14 from the master mobile-first teacher brief (incremental delivery).

## Phase 1 — Audit (completed baseline)

### Original mobile UX problems (repository + browser evidence)

| Area | Finding |
|------|---------|
| Navigation | Six primary bottom tabs (Overview, Students, Assignments, Plans, Reviews, Messages) plus Admin — crowded on 320–430px, no “More” grouping per brief |
| Home | Trend charts always expanded; pushes actionable queues below the fold on small phones |
| Home quick actions | Only “Assign task”; no one-tap attendance from hero |
| Shell | Log out occupied a 7th bottom slot on mobile |
| Harness | Stale selectors (`.teacher-task-add`, review block aria labels) blocked automated regression |
| Payments / tuition | No dedicated teacher payments route in Vue tree — correctly omitted from More menu |
| Help / analytics | Help links live in settings/tutorials; institution analytics in student profile tabs — not separate top-level routes |

### Route inventory

Unchanged SPA: `GET /teacher` with `?view=` for overview, students, student, plans, assignments, attendance, messages, reviews, settings.

## Phase 2 — Design system

Reused `TeacherDashboard.css` tokens, `TeacherNav`, `TeacherPageHeader`, `TeacherSectionPane`, `TeacherDialog` — no parallel mobile design system.

### Mobile vs desktop separation (critical)

| Layer | Mechanism |
|-------|-----------|
| Breakpoint | `TEACHER_SHELL_MOBILE_MQ` (`991.98px`) — same as sidebar / bottom nav |
| Shell | `data-teacher-viewport="mobile\|desktop"` + `teacher-dashboard--mobile\|--desktop` on root |
| State | `useTeacherViewport()` + `provide('teacherIsMobileShell')` + `teacherViewportMixin` |
| Nav | Separate `TeacherNav` instances (`variant="desktop"` vs filtered mobile primary + More) |
| CSS | Mobile-only rules under `[data-teacher-viewport="mobile"]` or `*--mobile-shell` classes |
| Tests | `tests/js/teacher-viewport-separation.test.mjs` |

Mobile-specific additions:

- `teacherMobilePrimaryNav()` / `teacherMobileMoreNav()` in `constants.js`
- `mobileLabel` keys for Home / Tasks
- `teacher-hero__actions` dual quick-action row
- Collapsible `details.teacher-overview-trends` on viewports &lt; 992px

## Phase 3 — Application shell (implemented)

| Destination | Mobile bottom bar | Desktop sidebar |
|-------------|-------------------|-----------------|
| Home | Yes | Overview |
| Students | Yes | Students |
| Tasks | Yes | Assignments |
| Messages | Yes | Messages |
| More sheet | Learning plans, Recitation reviews, Attendance, Account, Log out | Plans + Reviews in primary; Attendance + Account in admin footer |

Desktop sidebar unchanged (full `TEACHER_NAV` + `TEACHER_ADMIN_NAV`).

## Phase 4 — Teacher home (partial)

- Hero: Assign task + Attendance buttons (44px min-height on mobile)
- Overview trends: collapsed by default under 992px; expand via summary
- Existing today priorities, action queue, attention list preserved

Not yet: dedicated onboarding checklist component (Phase 11).

## Phases 5–14 — Status

| Phase | Status |
|-------|--------|
| 5 Students & classes | Existing mobile cards/tables; bulk/import preserved — no structural change this pass |
| 6 Assignments & plans | Existing task desk + `TeacherTaskSheet` wizard — harness selector fixes only |
| 7 Recitation review | Existing playback modal — mobile CSS already in `TeacherDashboard.css` |
| 8 Attendance | **Mobile card register** under 600px; 44px status controls; route in Playwright matrix |
| 9 Payments / reports | Payments N/A at route level; reports via student profile |
| 10 Messages | Existing desk pattern |
| 11 Beginner UX | **Dismissible `TeacherGettingStarted`** on home (students / assignment / attendance) |
| 12 Responsive / perf | Mix production build; Playwright matrix partial pass |
| 13 A11y | Inherited labels; logout moved to More sheet |
| 14 E2E | `teacher-workspace-responsive.cjs` **green** (390×10×3 overflow matrix + forms/playback) |

## Tests executed

| Command | Result |
|---------|--------|
| `node tests/js/teacher-sidebar-admin-verify.mjs` | **Pass** |
| `npx mix` / `npx mix --production` | **Pass** |
| `node tests/js/teacher-workspace-responsive.cjs` | **Pass** (390 responsive cases incl. attendance view) |

Screenshots (when harness runs): `tests/js/screenshots/teacher-mobile-2.0/`

## Changed files

- `resources/js/scripts/teacher/constants.js`
- `resources/js/views/TeacherDashboard.vue`
- `resources/js/views/TeacherDashboard.css`
- `resources/js/components/teacher/TeacherNav.vue`
- `resources/js/components/teacher/TeacherHero.vue`
- `resources/js/components/teacher/TeacherOverviewSection.vue`
- `resources/js/locales/en.json`
- `tests/js/teacher-sidebar-admin-verify.mjs`
- `tests/js/teacher-workspace-responsive.cjs`

## Desktop regression

No routes or business logic removed. Desktop nav still lists six primary items plus admin footer.

## Remaining blockers

1. Messages full-screen / keyboard polish (Phase 10).
2. Student list selection mode and profile tab mobile audit (Phase 5).
3. Optional `TeacherMoreHub.vue` full-page More (parent pattern) vs. bottom sheet.
4. Non-English copies for `getting_started_*` strings (EN only today).

## Next recommended steps

1. Fix review-section selectors and re-run `teacher-workspace-responsive.cjs` across all viewports/themes.
2. Attendance mobile week navigator (Phase 8).
3. Student profile mobile tab strip audit (Phase 5).
4. Wire walkthrough/onboarding to real completion events (Phase 11).