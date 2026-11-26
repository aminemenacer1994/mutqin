# Student overhaul progress — full eight-group contract

Source of truth: user's Complete Student Platform Reconstruction brief (26 November 2026). Existing `STUDENT_OVERHAUL.md` describes earlier Group 01 work only; its test claims are historical until rerun here. Preserve all pre-existing edits. Initial hashes and diff: `/tmp/mutqin-student-overhaul-start/`.

## Gates

| Group | Requirements | Status |
| --- | --- | --- |
| 01 | Exact Teacher/Parent primitives, shell, tokens, typography, navigation; baseline/reference comparison | blocked |
| 02 | Learning-first Home, canonical assignments/filtering/pagination, unified dialogs, valid submissions, optional assessment | in progress |
| 03 | Existing practice/resume/Hifz/revision integration, scoped valid progress and achievements | in progress |
| 04 | Activity, messaging, structured settings, authorised relationships | pending |
| 05 | Canonical data/CRUD/permissions, incremental lists, failure recovery, concise translated copy | pending |
| 06 | Nine viewport widths, dark/light, keyboard/RTL/reflow, reference parity | pending |
| 07 | Evidence-backed capability matrix and smallest supported integrations | pending |
| 08 | Independent release review, lifecycle/ownership/regression tests, evidence and remaining blockers | pending |

## Group 01

- Inspected ancestor/repository instructions (no AGENTS.md found), README, `docs/00-shared-rules.md`, package scripts and test configuration. User's seven destinations override older five-destination documentation.
- Reuse: TeacherNav, TeacherPageHeader, TeacherKpiGrid, TeacherSectionPane, TeacherDialog/Student dialog adapter, Bootstrap 5 and Teacher theme tokens. Retain existing implementation and protected role differences documented in `STUDENT_OVERHAUL.md`.
- Initial runtime: localhost:8000 unavailable from sandbox. Checking local server/browser access; no authentication bypass or database reseed.
- Existing screenshots: `tests/js/screenshots/{phase1-student-my-learning-audit,phase11-student-audit,group01-student-foundation}`. These are historical evidence, not verification of this task.
- Tests/results, new screenshots, defects and changed files: pending.

## Groups 02–08

Requirements remain as supplied in the full brief. Each group will record inspected capability evidence, implementation, actual commands/results, remaining defects, screenshots and dependencies here before proceeding.

## Readiness

Not release-ready: current implementation and all eight gates require verification. No commit, push, publication, database reset or destructive operation authorised.

### Group 01 actual verification

- Passed: `node tests/js/student-dashboard-design-system.test.mjs`, `student-dashboard-spacing.test.mjs`, `student-dashboard-typography.test.mjs`.
- Inspected historical Student Home desktop, narrow legacy Home, and Teacher desktop screenshots. Existing shared foundation retained.
- Blocker: `node tests/js/group01-student-foundation-browser.cjs` fails at login. Browser diagnosis reports existing preview-sandbox rejection: “The preview demo session ended. Sign in with your preview allowlist account to continue.” No access controls changed. Local HTTP needs sandbox escalation; existing server is running. No new authenticated screenshots/computed-style claims. The failed existing audit overwrote its `after/report.json` with an incomplete report; historical PNGs remain.
- Continue independent Group 02 work per contract.

## Group 02 — implementation and gate

- Changed `Dashboard.vue`: removed redundant Home eyebrow/refresh; placed compact notifications after learning priorities, upcoming assignments and progress; upcoming rows retain category/teacher alongside deadline.
- Changed `LearnerStudentNotifications.vue`: one instance (no remount on expand), unread count, server cursor Load more, deduplication, ten-row full pages and guarded mark-all.
- Added `StudentAssignmentListService`, Student list controller/API route/client. Uses canonical `TeacherAssignmentService` lifecycle/presenter and `StudentAccessAuthorizer`; metadata iterates in bounded chunks, only ten requested rows receive detailed evidence. Five workflow states, teacher/search/category/deadline/sort, accurate filtered status counts, stable tie-breakers, no teacher CRUD. Cancelled/reassigned history is retained in Activity rather than presented as To do.
- Changed `LearnerTeacherSection.vue` / `learnerLearningView.js`: single toolbar, persisted filters, stale-response guard, explicit retry, server-backed Load more, ten rows, Needs revision tab, no deadline filter for reviewed/completed work. Assignment details reuse actual TeacherDialog; opening conversation/playback closes details to avoid competing backdrops. No “Much more” section found in current source.
- Existing optional self-assessment values and submission validation retained. No supported student-owned personal-task model/controller found; Add task is deferred rather than exposing teacher CRUD.
- Passed: `php artisan test --compact tests/Feature/StudentLessonManagementWorkflowTest.php tests/Feature/StudentTeacherParentIntegrationTest.php tests/Feature/LearnerResourceAuthorizationTest.php` — 17 tests / 179 assertions, including >50 assignments, ownership and pagination regression. Earlier workflow + notification checks — 7 tests / 54 assertions. `node --experimental-vm-modules tests/js/learner-learning-view.test.mjs` and `node tests/js/student-home.test.mjs` passed.
- Remaining: full modal-state browser coverage blocked by preview access; mobile filter-sheet parity and arbitrary historical deep-link lookup require further work. Support summary still capped at 50 assignments and bulk-loads practice history; list endpoint fixes browsing but does not yet fix that summary architecture. Group remains in progress, not verified.

## Group 03 — in progress

- Existing practice links reuse `studentPractice.js` and the standalone engine; no engine or entitlement changes planned. Hifz and revision services already exist.
- Confirmed presentation defects: `Number(null)` showed missing metrics as zero, actual zeros were replaced by dashes, Home hid all zero metrics, and its check total used `Math.max` across incompatible sources. Achievement summary is translated before `{earned}`/`{total}` parameters are supplied, losing the values.
- Historical check investigation: `ProgressOverviewService` requires both a valid attempt and completed linked assessment; raw history uses a broader attempt scope. Preserve validation and explain the difference rather than promoting unverified historical scores.

### Group 03 gate results

- Fixed null/zero metric presentation and removed Home's incompatible `Math.max` reconciliation. Home keeps all four shared KPI cards, including real zeros. Achievement translation now retains named placeholders for the component's real totals.
- Practice grouped into core learning / techniques / utilities; uses existing launch links. Progress uses shared Teacher tabs with keyboard navigation, one visible section and URL/history state.
- Passed: progress helper (8 cases), phase6 Progress source, phase5 Learning source and practice routing tests.
- Backend run: 25 passed; 7 RecitationAttemptGuard tests failed because pre-existing PreviewSandbox code calls `session()` on a stateless test request. Re-ran those seven with `MUTQIN_LANDING_PREVIEW_ENABLED=false` **only in the test process**: 7 passed / 61 assertions. No preview/authentication source or application environment changed. This pre-existing integration defect remains a release blocker.
- Runtime parity and original-history diagnosis remain pending real authenticated data; do not infer that all historical checks should be scored. Existing analytics scan caps remain explicitly represented by `capped`.

## Group 04 — implementation and gate

- Settings: five reference-style navigation sections; no repeated Settings eyebrow; supported profile/preferences/security deep links; native expandable institution/class groups retain stable IDs, existing invitation/consent/guardian workflows. Removed nested guardian connection heading; Bootstrap success/error alerts.
- Messages: Student-only latest-first pages (30 messages) with older-message cursor and canonical shared conversation composer. Added active-thread identity check against stale responses. Shared Teacher message API keeps original default behaviour.
- Activity already has server pagination and filters; added ID deduplication and visible failure on Load more.
- Passed in combined Group 04/05 run: workflow, Activity, circle and Teacher dashboard tests — 56 tests / 835 assertions; includes newest/older message paging and foreign cursor rejection.
- Still partial: conversation-list and relationship-list pagination; support currently includes full relationship metadata and message previews. Browser keyboard/phone checks pending. Existing guardian/join policies unchanged.

## Group 05 — in progress

- Added owner-scoped assignment detail lookup so old notification/activity links can open records outside loaded pages. No permission broadening or task lifecycle writes.
- Support evidence queries now restrict sessions/attempts to preview recipient IDs. Weekly goal/completion and due counts use full scoped recipient queries, independent of the 50-row preview. Closed assignments excluded from weekly goals; frontend consumes this canonical summary.
- Home preview prioritises actionable work; exact semantic sorting and unbounded metadata scan performance still require large-history QA. List service scans metadata in chunks, then presents only requested rows; presentation remains the canonical assignment service.
- No personal-task CRUD exists in the current domain; no speculative endpoint/action added. Existing profile, saved-session, self-assessment, invitation and guardian services retained.

### Group 05 validation / Group 06 preparation

- Optional assessment now uses TeacherDialog's busy state, input draft protection and focus management; choices use native radio inputs with keyboard behaviour. Shared TeacherDialog source remains unchanged.
- Deep-link lookup and list mutations still pass through owner-scoped services. No lifecycle, subscription, Qur'an text or protected UI source changed by this task.
- Established isolated browser QA: newly created `/tmp/mutqin-student-qa-*.sqlite`, migrated and seeded using existing PlatformDemoSeeder on an empty database. `APP_ENV=testing`, array cache/mail, separate session cookie, localhost:8001. Original database and localhost:8000 configuration remain untouched. Preview mode disabled only for this isolated test process; normal password authentication remains enabled.
- Browser runner: `tests/js/student-overhaul-browser.cjs`; all seven destinations at 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 in light/dark, Teacher/Parent references, sampled computed styles, navigation, RTL, overflow. Initial run stopped before completion because asset compilation was still running; no verification claim from that run.
