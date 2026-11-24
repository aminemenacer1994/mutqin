# Phase 12 — Student Platform Integration, QA & Polish

**Date:** 2026-11-23  
**Scope:** Audit and refine the Student Platform against the shared Teacher/Parent design system. Preserve Teacher/Parent behaviour. Do not claim untested surfaces as working.

---

## 1. Completed features

The student platform is production-shaped and already integrated with teacher/parent surfaces:

| Area | Status | Notes |
|------|--------|-------|
| Registration → first memorisation onboarding | Present | `mutqin_start_first_session`; `/onboarding` redirects to memorisation |
| Connection onboarding (class / parent) | Present | `/onboarding/connections` + `ConnectionOnboarding.vue` |
| Teacher link + My Learning | Present | `/api/me/*` under `learner.teacher.section`; `LearnerTeacherSection.vue` |
| Teacher creates assignment → student Home/My Learning | Present | Shared `TeacherAssignment` / recipient model |
| Parent authorised child tasks | Present | `ParentChildLearningService` + permission gates |
| Mushaf / AI Recite practice | Present | `Memorisation.vue` + Madani / Speechmatics stack |
| Student submit + AI analysis | Present | Complete + AI recite attempt flows |
| Teacher review + correction | Present | Approve / correction APIs; shared status with student/parent |
| Teacher feedback → student | Present | Circle submissions + task threads |
| Parent feedback/progress | Present | Shell + child detail APIs; revoked/limited parents blocked |
| Targeted revision | Present | Published `RevisionRecommendation` only; pending hidden from student |
| Progress tracking across dashboards | Present | Shared status / `review_state` assertions in integration tests |
| Shared shell (sidebar, header, tokens, dark mode) | Present | `TeacherNav` + `teacher-dashboard` CSS bundle + student parity CSS |

**This session’s refinements**

- Activity → memorisation deep links now set `return_tab=activity` so exit returns to Activity (not Home).
- Student English copy aligned on **assignment** (Teacher term). Parent **homework** left intentional. Nav label remains **My learning**.

---

## 2. Shared design components reused

Student does **not** use a separate design system. It reuses the teacher workspace shell:

| Layer | Shared asset |
|-------|----------------|
| Global chrome | `resources/views/layouts/app.blade.php` |
| Layout / nav | `TeacherNav.vue`, `teacher-dashboard__layout`, `teacher-view-stage` |
| Stylesheet bundle | `resources/sass/teacher-dashboard.scss` → `public/css/teacher-dashboard.css` (loaded on student `/dashboard`) |
| Tokens | `resources/sass/app.scss` (`--surface*`, `--control-height`, `--radius-*`, themes) |
| Workspace palette | `resources/js/styles/workspace-modern.css` |
| Teacher semantic CSS | `TeacherDashboard.css` (`--teacher-*`) |
| Student mapping | `Dashboard.student-experience.css`, control system in `Dashboard.learner-teacher.css` |
| Buttons / cards / modals | `.dash-btn*`, `.teacher-pane`, `DashModalRoot`, `TeacherDialog` patterns |
| Breakpoints | Same 992px nav flip and shared pane gutters |

`data-platform-shell="student"` scopes parity overrides without forking layout.

---

## 3. End-to-end workflows verified

Verification method is noted. **Code + automated tests** are evidence; live browser / mic / network chaos were **not** re-run in this pass.

| # | Workflow | Verified how | Result |
|---|----------|--------------|--------|
| 1 | Register + onboarding | Code path (`RegisterController`, memorisation first-session); JS onboarding tests exist | Covered in code/tests; **not** manually exercised this pass |
| 2 | Join / link teacher | Integration + TeacherFeatures / consent tests | Pass |
| 3 | Teacher creates assignment | `TeacherDashboardTest` / `TeacherAssignmentService` | Pass |
| 4 | Student sees task in Home / My Learning | Learner home/learning JS tests + support API | Pass |
| 5 | Parent sees authorised child task | `StudentTeacherParentIntegrationTest` | Pass |
| 6 | Practise Mushaf / AI Recite | Existing AI recite / memorisation tests in suite; device QA docs separate | Automated coverage present; **live mic not retested** |
| 7 | Student submits work | Complete endpoint + lock/idempotency | Pass |
| 8 | AI analysis where applicable | `DashboardAiRecite` / memorisation detection tests (filter suite) | Pass in filtered run where included |
| 9 | Teacher reviews submission | Correction / approve flows | Pass |
| 10 | Student receives feedback | Support payload hides private notes; shows teacher feedback | Pass |
| 11 | Parent sees authorised feedback/progress | Limited/revoked parents denied; approved see shared status | Pass |
| 12 | Teacher assigns revision | Published revision targets only in student circle | Pass |
| 13 | Student continues revision / progress | Revision + progress view tests | Pass (unit); **not** live E2E |
| 14 | Three dashboards consistent statuses | Same `status` / `review_state` student↔parent after submit/correction | Pass |

---

## 4. Test results

### PHP (filtered student / parent / teacher / billing / AI)

```
Tests: 1 failed, 204 passed (2029 assertions)
```

- **Pass:** `StudentTeacherParentIntegrationTest` (3), Teacher dashboard/features, Parent*, MetricConsistency, Speechmatics*, RevisionReminders, DashboardAiRecite, Student* feature tests in filter.
- **Fail (unrelated to student shell):** `SubscriptionBillingTest::test_pricing_and_billing_pages_include_the_public_plans` — pricing HTML no longer contains literal `£0/month` (marketing copy change). Not a student dashboard regression.

### JavaScript (student / learner unit)

```
14 passed, 0 failed
```

Including: design-system, navigation, spacing, typography, home, practice, progress, activity (`return_tab`), AI feedback, learner home/learning/thread/upcoming, assignment self-assessment (where run).

### Design-system assertions

`student-dashboard-design-system.test.mjs` confirms shared tokens (control height, radii, semantic surfaces, focus, dark mode) and that student CSS does not override Qur’an word colours.

### Not run this pass

- Full `npm run build` / Mix production compile
- Browser scripts (`student-dashboard-design-system-browser.cjs`, `learner-workspace-responsive.cjs`, teacher workspace browser)
- Live mic denial / silence / timeout / backgrounding
- Visual side-by-side Student vs Teacher vs Parent at every viewport in a browser
- Full `composer test` without filter

---

## 5. Remaining security / UX issues

### Security / access (known good from tests)

- Student cannot message removed teachers; school age-safeguarding blocks DMs.
- Other students cannot read assignment threads.
- Parent private threads, staff private notes, teacher-only plan notes, pending revisions, guardian emails are stripped from student support payload.
- Limited permission / revoked parents cannot load child assignments.
- Teacher playback gated by `StudentAccessAuthorizer`; AI audio gated for owner / authorised teacher / authorised parent.

### Subscription / limits

| Issue | Severity | Notes |
|-------|----------|-------|
| `MUTQIN_UNRESTRICTED_SUBSCRIPTION` defaults **true** | Launch config | Local env currently `unrestricted=true`. Production must set `false` before relying on paid gates. |
| Free **saved-session** cap helpers exist but no SessionController enforcement found | Launch risk | Marketing / entitlement expose a Free cap; runtime save path not wired in audited controllers. |
| `canStartAiAssessment()` always returns true | Medium | Real gate is usage (`UserAiReciteUsageService`); plan_required branch is effectively dead. |

### UX / polish

| Issue | Severity | Notes |
|-------|----------|-------|
| Non-English locales still use older “lesson/task” student strings | Medium | English aligned this pass; AR/FR/ES/… not synced. |
| Student settings reuses some `parent.*` account keys | Low | Copy is generic (“Manage profile”, “Switch workspace”). |
| `/dashboard` vs `/progress` dual URLs | Low | Same controller; memorisation exit sometimes hardcodes `/dashboard`. |
| Client double-submit on complete | Low | Server idempotent; UI only blocks in-flight via `assignmentSavingId`. |
| Device/lock-screen “no duplicate progress” cells | Open | Still marked blocked in `docs/recitation-device-qa.md` / AI recite QA. |

---

## 6. Outstanding improvements and launch blockers

### Launch blockers (config / product gates)

1. Confirm production `MUTQIN_UNRESTRICTED_SUBSCRIPTION=false` (and related teacher/parent feature flags) before launch.
2. Decide whether Free **saved-session** limit must be enforced server-side before marketing Free vs Pro; if yes, wire `SubscriptionEntitlement::freeSavedSessionsLimit()` into the session save path and cover with a feature test.
3. Re-run browser responsive parity scripts and a short visual pass (desktop / tablet / mobile + dark) on Student Home, My Learning, Progress next to Teacher/Parent shells.

### High-value follow-ups (non-blocking if documented)

4. Sync student assignment terminology in non-English locale files.
5. Manual mic / silence / timeout / slow-network recovery checklist from `docs/ai-recite-qa.md` and `docs/recitation-device-qa.md`.
6. Fix or update `SubscriptionBillingTest` pricing assertions to match current pricing page copy.
7. Optional: set `return_tab` consistently on all memorisation exit paths that currently omit it.

### Explicitly out of scope / preserved

- No Teacher/Parent layout refactor.
- No rename of `teacher-*` BEM classes used by the student shell.
- No change to assignment completion business rules beyond deep-link return behaviour.

---

## VERIFY checklist (Phase 12)

| Check | Result |
|-------|--------|
| No duplicate submissions / scores / progress writes (server) | **OK** — assignment complete locked + early return; AI idempotency keys; product events `firstOrCreate` |
| No unauthorised parent/student/teacher data access | **OK** — covered by integration + teacher/parent tests |
| No broken deep links / orphaned student routes | **Mostly OK** — Activity return_tab fixed; remaining dual `/dashboard`/`/progress` is intentional |
| No inconsistent assignment terminology (EN student) | **Improved** — EN uses assignment; parent homework kept |
| Recording / access safeguards | **Present in code**; live mic not retested this pass |
| No regression claimed in Qur’an tools / ASR | **Not re-validated live**; existing unit/feature coverage remains |
| No duplicated analytics calculations | **Guarded** in product events; Ackee + product analytics are separate sinks by design |
| Subscription / usage limits | **Partial** — AI usage enforced when unrestricted=false; saved-session Free cap not wired |

---

## Files touched this pass

- `resources/js/views/Dashboard.vue` — Activity practice links include `return_tab=activity`
- `resources/js/locales/en.json` — Student assignment terminology alignment
- `tests/js/student-activity.test.mjs` — Asserts Activity return_tab
- `docs/phase-12-student-platform.md` — This report
