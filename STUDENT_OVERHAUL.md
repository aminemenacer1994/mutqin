# Student overhaul

## Scope and implementation groups

Group 01 implements the visual foundation at `/dashboard` (including its `/progress` alias). Teacher and Parent are the authoritative references. Teacher, Parent, Admin, authentication, public pages and standalone memorisation must retain their behaviour and appearance.

| Group | Scope | Status |
| --- | --- | --- |
| 01 | Student design system and visual foundation | Final modal verification |
| 02 | Brief not supplied | Not started |
| 03 | Brief not supplied | Not started |
| 04 | Brief not supplied | Not started |
| 05 | Brief not supplied | Not started |
| 06 | Brief not supplied | Not started |
| 07 | Brief not supplied | Not started |
| 08 | Brief not supplied | Not started |

The repository's older thirteen-phase index is historical context; it is not a substitute for the seven outstanding group briefs. No unrelated feature work is included.

## Audit — 25 November 2026

- No `AGENTS.md` exists in this checkout or its ancestor directories. Read `README.md`, `docs/00-shared-rules.md`, package scripts and existing Student browser checks. Laravel 12, Vue 3, Bootstrap 5 and Laravel Mix are the established stack.
- Working tree initially contained modified `public/css/student-dashboard.css`, modified `public/css/teacher-dashboard.css`, and untracked `public/css/vue-styles.css.map`. Originals were preserved in `/tmp/mutqin-group01-original` before building.
- Shared shell: `layouts/app.blade.php`, `TeacherNav.vue`, `.teacher-dashboard__shell.container`, `.teacher-dashboard__layout`, `.teacher-view-stage`.
- Shared primitives: `TeacherPageHeader`, `TeacherSectionPane`, `TeacherKpiGrid`, `TeacherEmpty`, `TeacherDialog`, Bootstrap controls/alerts, shared theme tokens in `TeacherDashboard.css` and `workspace-modern.css`.
- Before this work, Student loaded those shared styles, then three contradictory style layers. These replace shared surfaces, radius, typography and navigation with separate definitions. `Dashboard.student-experience.css` alone contains several successive “final” override layers.
- Reviewed the existing `phase1-student-my-learning-audit` screenshot set (desktop learning/light) and `phase11-student-audit` set (desktop Home/dark and narrow Home). The pasted attachment contains the brief only; no separate image attachments are present. These are the two available Student audit sets, not assumed to be additional supplied files.
- Baseline and after evidence: `tests/js/screenshots/group01-student-foundation/{before,after}/`. Capture uses real local demo accounts without seeding or changing learning data.

## Architectural decisions

1. Reuse the existing Teacher/Parent components and their live cascade, including `workspace-modern.css`. Do not invent a neutral palette in place of the established warm brand. Remove extra Student beige card fills and black selected controls.
2. Use the common Teacher shell spacing (32px layout gap, shared `--content-max`, `--space-7`, existing responsive insets). Parent's 48px gap is a Parent-specific exception; changing it would violate preservation.
3. Preserve all seven requested destinations, existing authorisation checks, role switching, query/hash deep links, history state and unread badge sources.
4. Keep domain styles for Qur'anic text, recitation evidence, practice and feedback. Legacy Student aliases may point to Teacher tokens; they must not define a competing palette or redefine Teacher tokens.
5. Remove conflicting declarations at their source. Do not append a further “final parity” override layer.

6. Compose the Continue card from shared `teacher-pane`, `teacher-metric__icon`, typography and Bootstrap button primitives. This small Student content component owns only content arrangement; it does not introduce a theme.
7. Remove `user-dashboard--progress` from the Student root. That obsolete root activated a conflicting font and multi-column layout in the shared historical stylesheet. Keep the historical shared file untouched for other consumers.
8. `--info` and the Teacher badge's `info` mapping currently use warm/amber colours. Use the existing blue `--sem-info-ink` / `--sem-info-bg` tokens for Student feedback, with Teacher warning tokens for pending work and success tokens for completion. The inconsistency is documented rather than changing Teacher/Parent.
9. Keep Teacher's existing 992px mobile-navigation breakpoint and horizontal scrolling tabs. Remove the additional My Learning stylesheet's four-column tab grid, which squeezed tab labels into one another.

## Implementation — 26 November 2026

- Reused `TeacherNav` on desktop/mobile, `TeacherPageHeader`, `TeacherKpiGrid`, shared loading skeletons, pane surfaces, Bootstrap controls and semantic alerts. Student modal roots inherit `teacher-dialog` tokens; existing focus-trap, Escape, scroll-lock and return-focus logic remains intact.
- Replaced competing Student theme definitions with compatibility aliases to shared tokens. Deleted `Dashboard.student-premium.css`, `Dashboard.student-experience.css`, unused `StudentPageHeading.vue` and unused `AppButton.vue`. Domain composition lives in `Dashboard.student.css`; Arabic/recitation feedback styles remain.
- Fixed the Home metric structure with shared KPI markup and an auto-fitting grid; removed outer metric/tool cards. Added a responsive Continue composition and balanced Practice tool columns.
- Removed duplicated page breadcrumbs and Progress/Practice introductions. Kept the seven destinations, role gates, role switcher, existing URL/history/scroll handling and unread sources. Mobile Messages uses the same label as desktop.
- Converted remaining Student settings, circle and task actions to the shared Bootstrap classes. Removed hardcoded Student colour literals, uppercase presentation and excessive weight in the touched foundation styles. Preserved Qur'anic font and RTL rules.
- Achievement progress now uses brand colour until unlocked and success green when unlocked; achievement artwork remains unchanged.

## Defect register

| Defect | Resolution / status |
| --- | --- |
| Student shell uses `container-fluid` and repeated bespoke spacing | Fixed: shared container and responsive insets |
| Shared navigation polluted by legacy `dash-jump` aliases | Fixed: shared TeacherNav without conflicting aliases |
| Home metrics put icon, value, label and unit in competing layout tracks | Fixed: shared KPI component and natural label wrapping |
| Progress pane inherits legacy multi-column grid | Fixed: one stage flow |
| Repeated heading/breadcrumb/page labels | Fixed: shared page headers |
| Black active filters and inconsistent semantic progress colours | Fixed: shared selection/status semantics |
| Repeated card wrappers and Student-specific padding/radius overrides | Fixed: removed conflicting foundation layers and redundant wrappers |
| Sticky header, mobile navigation and RTL | Passed: shared breakpoint, sticky clearance, all seven destinations, RTL and overflow checks |

## Validation

- Browser launch requires sandbox escalation on macOS (`bootstrap_check_in` otherwise denied). Local Playwright audit launched through the available approval mechanism.

| Check | Result |
| --- | --- |
| Production `npm run build` + theme-built CSS gate | Passed |
| JavaScript import verification | Passed, 508 files |
| Targeted Laravel regression suite | Passed, 142 tests / 2,106 assertions |
| Full JavaScript suite | 272/275 files passed in the full run; all three remaining files passed after updating obsolete markup assertions and rerunning the manifest check after compilation. All 275 validated. |
| Final foundation, spacing, typography and My Learning static checks | Passed |
| Final visual/computed-style audit | Passed, 72 cases: 56 Student, 8 Teacher, 8 Parent |
| Student/Teacher shared primitive comparison | Exact match for font family, size, weight, line height, padding, radius, backgrounds and shadow on the sampled root, heading, active navigation and card at all four widths in both themes |
| Responsive and RTL | Passed at 320, 390, 768 and 1440px; explicit 991/992px navigation breakpoint; sticky sidebar clears header; no horizontal overflow; Home metric copy has natural wrapping space |
| Navigation regression | Passed: seven tabs, preserved query parameters, scroll restoration, back/forward, reload, deep links |
| Control states | Passed: active navigation/tabs, primary hover/focus/disabled states, light/dark shared surfaces, zero runtime exceptions |
| Assignment modal accessibility | Passed at 390/1440px, light/dark: viewport fit, no horizontal overflow, focus trap, Escape and focus restoration (four cases) |
| Protected-route browser smoke | Passed seven cases: public and login at 1440/390px; standalone memorisation at 1440/834/390px. Student stylesheet absent; memorisation setup controls present; no unexpected browser errors. |
| Source/asset preservation | Teacher/Parent/shared shell, backend, routes and standalone memorisation source unchanged. Pre-existing Teacher compiled CSS and source map restored byte-for-byte. See `after/preservation.json`. |
| Whitespace/diff check | Passed |

The PHP suite covered Dashboard, TeacherDashboard, ParentFamilyDashboard, LearnerResourceAuthorization, StudentTeacherParentIntegration, AuthPageRender and AdminDashboard tests. The full JS suite also includes authorisation-sensitive UI flows, modal utilities, Arabic text and standalone memorisation behaviour.

The final browser tests are `group01-student-foundation-browser.cjs`, `student-dashboard-design-system-browser.cjs`, `student-dashboard-navigation-browser.cjs` and `group01-protected-browser.cjs` in `tests/js/`. They inspect the existing local demo accounts; the Activity navigation fixture is intercepted in the browser.

### Screenshots and evidence

Evidence directory: [Group 01 screenshots](tests/js/screenshots/group01-student-foundation/).

- [Student Home before](tests/js/screenshots/group01-student-foundation/before/student-home-1440-light.png) and [after](tests/js/screenshots/group01-student-foundation/after/student-home-1440-light.png).
- [My Learning mobile](tests/js/screenshots/group01-student-foundation/after/student-learning-390-light.png), [Practice desktop](tests/js/screenshots/group01-student-foundation/after/student-practice-1440-light.png), [Progress dark](tests/js/screenshots/group01-student-foundation/after/student-progress-1440-dark.png).
- [Assignment modal mobile/dark](tests/js/screenshots/group01-student-foundation/after/student-assignment-modal-390-dark.png).
- [Teacher reference](tests/js/screenshots/group01-student-foundation/after/teacher-home-1440-light.png) and [Parent reference](tests/js/screenshots/group01-student-foundation/after/parent-home-1440-light.png).
- [Final measurements](tests/js/screenshots/group01-student-foundation/after/report.json), [protected-route report](tests/js/screenshots/group01-student-foundation/after/protected-report.json), [preservation hashes](tests/js/screenshots/group01-student-foundation/after/preservation.json).

Baseline capture contains 66 cases: its older mobile Messages label prevented six Messages captures. Final capture includes all 72 cases. Baseline was captured on 25 November and final evidence on 26 November; live task dates/content and asynchronously drawn charts can change total content heights. Reference comparison therefore checks painted styles and stable geometry, excluding content-dependent container/card height and inherited border colour on borderless containers. It is not a claim of pixel-identical live data across dates. Shared source and the original compiled Teacher CSS are additionally verified unchanged.

### Limits and blockers

- No implementation blocker remains for Group 01. Groups 02–08 await their briefs and were not started.
- No additional screenshot attachments were present; the two available repository audit sets were reviewed as recorded above.
- The older standalone smoke script treats all console messages as failures and stops on existing local CSP IPv6 `form-action` warnings and PostHog's bot-agent notice. These application/environment settings were left unchanged. The focused protected-route audit records those exact diagnostics separately and passes the rendering, controls, stylesheet-isolation and overflow checks; it fails on any other console error or runtime exception.
- The seeded Home has no visible feedback-conversation shortcut, so that optional branch of the older interaction test was not exercised. Assignment dialogs were tested explicitly in all four viewport/theme combinations; existing modal utility and Teacher playback regression tests also passed.
- The production compiler reports an outdated Browserslist dataset notice; compilation and the CSS gate pass. No dependency updates were included.
