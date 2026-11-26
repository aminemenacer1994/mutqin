# Teacher platform — responsiveness & dark mode (Mutqin 2.0)

Source of truth: `http://localhost:8000/teacher` (single-page Vue workspace).

Work proceeds in the eight groups from the master brief. This file holds the Phase 1 inventory and tracks group status.

## Group status

| Group | Scope | Status |
| --- | --- | --- |
| 1 | Platform-wide audit (routes, baseline browser) | In progress |
| 2 | Global responsive foundation (shell, sidebar) | Pending |
| 3 | Element-by-element responsiveness | Pending |
| 4 | Page-by-page reconstruction | Pending |
| 5 | Complete dark mode audit | Pending |
| 6 | Professional polish | Pending |
| 7 | Exhaustive QA & regression | Pending |
| 8 | Final release gate | Pending |

## Phase 1 — Route and component inventory (26 Nov 2026)

### Web entry

| Route | Blade / mount | Notes |
| --- | --- | --- |
| `GET /teacher` | `resources/views/teacher/dashboard.blade.php` → `<teacher-dashboard>` | Auth + teacher features middleware |
| `GET /teachers` | `preview.teachers` | Marketing preview, out of workspace scope |
| Learner teacher sections | `Dashboard.vue` + `LearnerTeacherSection.vue` etc. | Student workspace “teacher” tab; shares nav/CSS primitives |

### In-app views (`?view=` query, `TEACHER_VIEWS`)

| View id | Primary component | Nested / modals |
| --- | --- | --- |
| `overview` | `TeacherHero`, `TeacherOverviewSection` | KPI grid, attention list, trend charts, quick actions |
| `students` | `TeacherStudentsSection`, `TeacherStudentTable` | Filters, pagination, bulk assign |
| `student` | `TeacherStudentProfileSection` | Tabs: ai, tasks, attendance, plan, messages, guardians; learning subviews |
| `plans` | `TeacherPlansView` | Embedded `TeacherStudentProfilePlan`, plan composer `TeacherDialog` |
| `assignments` | `TeacherAssignmentsSection` | `TeacherTaskSheet`, task rows, `TeacherTaskConversation` |
| `attendance` | `TeacherAttendanceSection` | Calendar, lesson picker, register grid |
| `messages` | `TeacherMessagesSection` | Inbox + thread desk (`teacher-messages-desk__*`) |
| `reviews` | `TeacherReviewsSection` | Queue tied to overview API |
| `settings` | `TeacherSettingsSection` | Account, classes, export; optional `TeacherInstitutionAdminPanel` |

### Navigation (`TeacherNav.vue`, `constants.js`)

- Primary: overview, students, assignments, plans, reviews, messages.
- Admin footer (collapsible): attendance, settings (account). Log out POST below Admin.
- **Spec note:** Brief lists Messages under Admin; product code keeps Messages in primary nav (`tests/js/teacher-sidebar-admin-verify.mjs` enforces this).

### Shared layout & styles

- Shell: `TeacherDashboard.vue` → `.teacher-dashboard__layout` (desktop sidebar + main + mobile bottom nav).
- Design system: `resources/js/views/TeacherDashboard.css` (built to `public/css/teacher-dashboard.css`).
- Shared chrome: `layouts/app.blade.php`, `workspace-modern.css`, theme via `html[data-theme]`.
- Dialogs: `TeacherDialog.vue` (task, plan, playback, evidence modals).

### Component count (teacher tree)

85 Vue files under `resources/js/components/teacher/` (sections, profile tabs, learner-embedded teacher UI, audio/recitation, organisation).

### Automated checks (existing)

| Script | Purpose |
| --- | --- |
| `tests/js/teacher-workspace-responsive.cjs` | Multi-viewport overflow, nav swap @992px, forms |
| `tests/js/teacher-sidebar-admin-verify.mjs` | Admin nav structure |
| `tests/js/teacher-microphone-lifecycle.cjs` | Voice note UX |
| `tests/js/mobile-horizontal-overflow.test.mjs` | Page-level overflow (shared) |
| `tests/js/theme-chrome.test.mjs` | Theme tokens |
| `npm run test:teacher:workspace` | Bundle of teacher responsive scripts |

### Known baseline blockers (26 Nov 2026)

1. **Billing upgrade modal** — Global `#mutqin-upgrade-modal` can cover workspace during QA when demo hits AI limits; tests should dismiss via “Maybe later”.
2. **Plans hub rename** — UI moved from `.teacher-plans-view__*` to `.teacher-plan-hub__*`; responsive harness updated accordingly.
3. **Built CSS** — Edit `TeacherDashboard.css`, then `npx mix` so `public/css/teacher-dashboard.css` matches.

## Non-negotiables (from brief)

Preserve desktop quality, existing architecture, theme provider, and business logic. No new design system, no `overflow-x: hidden` page hacks, no dashboard-only fixes.