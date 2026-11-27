# Student overhaul progress — full eight-group contract

Source of truth: user's Complete Student Platform Reconstruction brief (26 November 2026). Existing `STUDENT_OVERHAUL.md` describes earlier Group 01 work only; its test claims are historical until rerun here. Preserve all pre-existing edits. Initial hashes and diff: `/tmp/mutqin-student-overhaul-start/`.

## Gates

| Group | Requirements | Status |
| --- | --- | --- |
| 01 | Exact Teacher/Parent primitives, shell, tokens, typography, navigation; baseline/reference comparison | in progress |
| 02 | Learning-first Home, canonical assignments/filtering/pagination, unified dialogs, valid submissions, optional assessment | in progress |
| 03 | Existing practice/resume/Hifz/revision integration, scoped valid progress and achievements | in progress |
| 04 | Activity, messaging, structured settings, authorised relationships | in progress |
| 05 | Canonical data/CRUD/permissions, incremental lists, failure recovery, concise translated copy | in progress |
| 06 | Nine viewport widths, dark/light, keyboard/RTL/reflow, reference parity | in progress |
| 07 | Evidence-backed capability matrix and smallest supported integrations | in progress |
| 08 | Independent release review, lifecycle/ownership/regression tests, evidence and remaining blockers | in progress |

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
- Still partial: relationship-list pagination. `StudentCircleService::present()` supplies the full teacher/membership graph to Settings and messaging eligibility; safe server paging requires replacing that shared payload with scoped counts and separate stable cursors, while preserving invitation/consent and guardian actions. A UI-only slice would hide relationships without reducing the query cost. Existing guardian/join policies remain unchanged. Mobile keyboard and conversation checks now pass; see Group 06 evidence.

## Group 05 — in progress

- Added owner-scoped assignment detail lookup so old notification/activity links can open records outside loaded pages. No permission broadening or task lifecycle writes.
- Support evidence queries now restrict sessions/attempts to preview recipient IDs. Weekly goal/completion and due counts use full scoped recipient queries, independent of the 50-row preview. Closed assignments excluded from weekly goals; frontend consumes this canonical summary.
- Home preview prioritises actionable work; exact semantic sorting and unbounded metadata scan performance still require large-history QA. List service scans metadata in chunks, then presents only requested rows; presentation remains the canonical assignment service. Feedback history is currently a 12-conversation support preview assembled from task notes, general notes and recipient correction evidence; it cannot gain a truthful `Load more` by slicing the preview. A new owner-scoped cursor source must preserve that grouping and read state before the drawer can paginate.
- No personal-task CRUD exists in the current domain; no speculative endpoint/action added. Existing profile, saved-session, self-assessment, invitation and guardian services retained.

### Group 05 validation / Group 06 preparation

- Optional assessment now uses TeacherDialog's busy state, input draft protection and focus management; choices use native radio inputs with keyboard behaviour. Shared TeacherDialog source remains unchanged.
- Deep-link lookup and list mutations still pass through owner-scoped services. No lifecycle, subscription, Qur'an text or protected UI source changed by this task.
- Established isolated browser QA: newly created `/tmp/mutqin-student-qa-*.sqlite`, migrated and seeded using existing PlatformDemoSeeder on an empty database. `APP_ENV=testing`, array cache/mail, separate session cookie, localhost:8001. Original database and localhost:8000 configuration remain untouched. Preview mode disabled only for this isolated test process; normal password authentication remains enabled.
- Browser runner: `tests/js/student-overhaul-browser.cjs`; all seven destinations at 320, 375, 390, 430, 768, 1024, 1280, 1440, 1920 in light/dark, Teacher/Parent references, sampled computed styles, navigation, RTL, overflow. Initial run stopped before completion because asset compilation was still running; no verification claim from that run.

## Group 06 — browser verification and repairs

- Isolated normal-authentication audit completed **162 cases**: Student seven destinations plus Teacher/Parent Home, nine requested widths, light/dark; no page horizontal overflow, no JavaScript exceptions, no narrow Student metric labels. Shared font/heading/navigation/pane samples match Teacher; 991/992px navigation, history and RTL checks passed. Evidence: `tests/js/screenshots/student-overhaul/after/report.json` and adjacent PNGs. This is sampled parity, not full WCAG certification or a protected-platform before/after comparison.
- Manual screenshot review caught defects the geometric assertions missed: mobile filter rows stretched by inherited column flex direction; Progress/Settings tabs lacked Bootstrap `nav-link`; progress metrics had concatenated labels; shared-dialog conversions retained legacy overlay width and duplicate body padding. Corrected by reusing shared tabs/KPI grid/dialog sizing and deleting obsolete progress metric/tab CSS. Mobile filters now use TeacherDialog with a single rendered set of controls.
- Actual reverse-Tab failure from TeacherDialog's initially focused root led to a compatible shared `modalFocus.js` fix. Hidden ancestor controls are excluded and Tab/Shift+Tab from the root enters the correct boundary. `modal-focus-boundary.test.mjs` passed in Chromium; `modal-reading-position.test.mjs` passed. Protected-role focus regression remains part of the final suite.
- Feedback, submission and assignment conversation surfaces now use actual TeacherDialog; assessment closes submission before opening. Conversation text and voice drafts are guarded. Direct conversation polling is limited to the opened conversation and paused when the document is hidden; browsing My Learning no longer marks every contact's messages read.
- Focused browser runner: `tests/js/student-overhaul-interactions.cjs`. It now passes ten interaction checks with no page exceptions or unexpected API errors: mobile/desktop assignment details in both themes, filter sheet, assignment conversation with one dialog, all five status tabs, search/failure/retry, Progress keyboard/history, Settings sections, mobile messages and optional assessment draft protection. Assessment coverage uses the actual mounted component with a seeded assignment and does **not** claim successful audio submission E2E. Evidence: `tests/js/screenshots/student-overhaul/interactions/report.json` and adjacent PNGs.
- Manual mobile screenshot review caught an empty assignment-detail body for new tasks with no conditional feedback. The shared dialog now always shows teacher/class, due date, attempts and the real practice requirement. An untranslated attempts label was fixed. The learning-plan card moved below the task list so the primary assignment is visible before the supporting plan on phones; the browser runner asserts that order.

## Group 07 — capability audit and supported integrations

| Capability | State and evidence | Integration / limits |
| --- | --- | --- |
| Daily priorities, deadlines, learning plan | Implemented: `learnerHome.js`, `LearningPlanService`, `LearnerLearningPlan` and assignment recipients | Home promotes one real eligible task; plans use persisted assignments. No invented daily goal. |
| Verification, eligibility, attempt history, revision/resubmission | Implemented: `TeacherAssignmentService`, `SessionLifecycleService`, recipient completion evidence; workflow/integration tests | Owner-scoped historic detail lookup and five presentation states added. Actual recording/browser lifecycle still requires a valid audio fixture. |
| Reminders | Implemented backend: `RevisionReminderQueryService`, `SpacedRevisionScheduler`, notification inbox | Existing delivery/scheduling preserved; notification cursors and mark-all tested. External delivery not exercised. |
| Saved practice and resume | Implemented: `SessionLifecycleService`, `SessionController`, `savedSessionAutosave.js`, `studentPractice.js` | Existing mode/passage/settings routes retained; quota and lifecycle tests passed. Historical session API uses existing limits; not converted into a new Student store. |
| Weak ayahs, smart/targeted revision | Implemented evidence services: `WeaknessAnalysisService`, `PracticePlanRecommendationService`, `ProgressOverviewService`, `RevisionRecommendationService` | Published teacher corrections and AI word-alignment evidence stay distinct. No mastery/prediction inference. Existing scan caps remain disclosed. |
| Sabaq/Sabqi/Manzil, Qari and techniques | Implemented: `StudentHifzProgressService`, `LearningPlanService`, assignment session settings, standalone engine | Existing routes reused. Empty Hifz stages collapsed; reading/Tajweed no longer acquire memorisation labels from legacy stage defaults. |
| Optional assessment and help | Implemented: existing self-assessment endpoint/model and teacher help workflow | Shared dialog, radio choices, optional comment, Save/Skip, busy/draft protection; no approval or AI score changes. |
| AI wording history and teacher-confirmed progress | Implemented: `SessionAnalysisQueryService`, `ProgressOverviewService`, `StudentHifzProgressService` | Fixed null/zero, achievement placeholders and mismatched Home aggregation. AI checks require valid completed assessment evidence; raw history legitimately has broader scope. |
| Feedback, timestamps, audio and corrections | Implemented: canonical notes/attempts and shared audio/conversation components | Corrected message-to-recipient link; latest-message previews plus exact unread totals and 30-message cursor pages. Missing fixture audio remains explicitly unavailable. |
| Tajweed assessment | Partial: supported teacher learning category/assessment and feedback | No automated Tajweed accuracy added or implied from AI wording scores. |
| Weekly/monthly reporting and attendance | Existing: `TeacherReportService`, Parent report collector/exporter, `TeacherAttendanceService`, Student attendance summary | Student period selector labelled as rolling 7/30 days; lifetime metrics separate. No new export/report authorisation introduced. |
| Certificates | Missing: no certificate model/service/route found in inspected application sources | Deferred infrastructure: issuance, eligibility, signing/storage and authorised verification must exist before a real Student action can be added. |
| Multiple classes/teachers and guardians | Implemented policies: `StudentCircleService`, `StudentAccessAuthorizer`, `StudentMessagingPolicy`, Parent links | Stable grouped Settings, consent/invitation/join actions retained. Distinct learning-area metadata replaces loading all assignment rows for relationship labels. Relationship/conversation directory paging remains partial. |
| Independent and teacher-led entitlements | Existing: practice routing, entitlement middleware and shared canonical records | No paid gate added to teacher-led learning; saved-session quota and independent routing tests passed. |
| Student personal tasks | Missing supporting domain/CRUD | Add task intentionally absent; teacher-owned CRUD is not exposed. Requires a genuine student-owned model/policy/lifecycle before implementation. |

### Group 07 executed validation

`MUTQIN_LANDING_PREVIEW_ENABLED=false php artisan test --compact tests/Feature/LearningPlansTest.php tests/Feature/HifzPlanTest.php tests/Feature/RevisionRemindersTest.php tests/Feature/PracticePlanIsolationTest.php tests/Feature/NextSessionRecommendationTest.php tests/Feature/SessionLifecycleTest.php tests/Feature/SavedSessionSyncQuotaTest.php tests/Feature/MemorisationRoutingTest.php` — **121 tests / 748 assertions passed**. The flag applies to this test process only.

## Group 08 — independent release review (in progress)

- Re-read all eight groups and final acceptance. Examined new Home/My Learning/Progress desktop/mobile images and historical reference screenshots. Passing geometry alone was insufficient; visual defects described above were fixed before accepting the gate.
- Broad protected/backend run: Dashboard, Dashboard AI, Student Progress/Hifz/AI feedback, Recitation guard, Achievements, Notifications, cross-role integration/authorisation, Parent family, auth render and Admin — **130 tests / 1,712 assertions passed** with preview disabled in the test process (`/tmp/mutqin-student-regression.log`).
- Following unread-summary changes: workflow, Teacher Dashboard, cross-role integration and resource authorisation — **66 tests / 946 assertions passed** (`/tmp/mutqin-student-final-php.log`). Circle, Parent and Settings regression — **11 tests / 92 assertions passed** (`/tmp/mutqin-circle-regression.log`). An earlier new detail test used the wrong response key (`recipient` instead of `assignment`); corrected test passed. No endpoint changed to satisfy that mistaken assertion.
- Full JS final run: **287/291 files passed** (`/tmp/mutqin-student-js-final2.log`). One failure, `mix-chunk-prune-guard`, was caused by running during a build; it passed immediately after compilation. The remaining three failing source assertions are `homepage-features-carousel`, `tutorial-carousel` and `teacher-formatters` against separately modified protected public/Teacher sources. Those sources were not rewritten to satisfy stale assertions. Assessment and Teacher message recovery tests now pass. Import lint passes for 532 files.
- Final `npm run build` and postbuild theme CSS gate passed (`/tmp/mutqin-student-release-build.log`), with one pre-existing CSS extraction ordering warning for preview/homepage styles. `git diff --check` passes. No deployment, commit, push, original database reset, or original server configuration change performed by this task.
- Final data-ready browser audit: **162/162 cases passed** (`/tmp/mutqin-student-browser-realwait.log` and `tests/js/screenshots/student-overhaul/after/report.json`). Seven Student destinations plus Teacher/Parent Home at 320–1920px and light/dark had no JavaScript exceptions, navigation blockers or page overflow. The sampled Student font, headings, nav and pane styles matched Teacher; RTL and 991/992px navigation passed. The report's narrow-metric findings concern the protected Teacher reference only; Student metrics passed. The isolated QA server was stopped after evidence capture.
- Remaining acceptance work: directory and feedback-list server paging; all modal/state variants and long translated Arabic; full real-audio teacher-led and independent browser E2E; original historical account metric diagnosis (isolated fixtures cannot prove the original account's data); original-server preview/auth integration; protected visual before/after baseline. Do not claim production readiness while these remain unverified.
