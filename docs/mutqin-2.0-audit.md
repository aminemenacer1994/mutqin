# Mutqin 2.0 — Functional & Architectural Audit

**Date:** 2026-11-25  
**Scope:** Individual (learner), Teacher, Student (connected), Parent platforms; auth; institutions; learning network; AI recitation; billing.

## Executive summary

Core memorisation, AI assessment, and the teacher–student–parent triangle (when feature flags are on) are **well tested** in PHPUnit. The architecture deliberately separates **account role**, **platform context**, and **relationship authorizers** (`StudentAccessAuthorizer`, `ParentAccessAuthorizer`). Institution membership does **not** grant teacher visibility; class membership + student analytics consent does.

This pass **fixed four verified P0/P1 issues** and added `tests/Feature/Mutqin20AuditFixesTest.php`. Remaining gaps are documented below by priority without broad rewrites.

---

## Classification legend

| Status | Meaning |
|--------|---------|
| **Working** | End-to-end flow exists; Feature/JS tests cover main paths |
| **Partial** | Implemented but gated, incomplete UX, or missing API surface |
| **Broken** | Confirmed defect (fixed in this pass if listed under fixes) |
| **Missing** | Intentionally out of scope or not built |
| **Duplicated** | Same rules implemented in multiple places |

---

## Platform matrix

### Individual learner

| Area | Status | Notes |
|------|--------|-------|
| Memorisation workspace | **Working** | Vue workspace + `/api/state`, sessions, progress |
| Dashboard / progress | **Working** | `DashboardController`, `ProgressOverviewService` |
| AI recite & memorisation check | **Working** | Quota-based freemium; `plan:pro` on weak-spots/retest only |
| Hifz plan / adaptive tools | **Partial** | `plan:premium` on API; needs paid tier in production |
| Teacher assignments | **Missing** (by design) | `/api/me/support` → 404 without learning network |
| Connect onboarding | **Working** | `ConnectionOnboardingController` + tests |

### Student (connected)

| Area | Status | Notes |
|------|--------|-------|
| Support hub / assignments | **Working** | Start, complete, corrections, evidence JSON |
| Class circle / consent | **Working** | Gates teacher access |
| Guardian approval | **Working** | `LearnerGuardianController` |
| Self-assessment | **Working** | Optional on complete |

### Teacher

| Area | Status | Notes |
|------|--------|-------|
| Dashboard / students / assignments | **Working** | Large `TeacherDashboardTest` suite |
| Recitation playback & human assess | **Working** | `TeacherRecitationPlaybackController` |
| Learning plans / revisions | **Working** | Linked to reminders |
| Institution admin (Phase 6) | **Working** | Staff invites, audit log |
| Feature flag default off | **Partial** | `MUTQIN_TEACHER_FEATURES_ENABLED` |

### Parent

| Area | Status | Notes |
|------|--------|-------|
| Shell / children / progress | **Working** | Permission-scoped 404 pattern |
| Invitations & link codes | **Working** | `ParentInvitationTest` |
| Reports & messaging | **Working** | Flag-gated |
| Supplemental parent role on teacher | **Working** | `ParentPlatformTest` |

### Admin

| Area | Status | Notes |
|------|--------|-------|
| Billing / growth / feedback | **Working** | `is_admin` + allowlist, not `AccountRole` |

---

## Authentication, roles, onboarding

| Item | Status | Priority |
|------|--------|----------|
| Sanctum SPA + verified | **Working** | — |
| Primary + supplemental `user_account_roles` | **Working** | — |
| Platform switch (`PlatformContextResolver`) | **Working** | — |
| Parent student check ignored supplemental role | **Broken → Fixed** | **P0** |
| `OrganisationPolicy::createGroup` ignored supplemental teacher | **Broken → Fixed** | **P1** |
| Org membership `reject` weaker than `approve` | **Broken → Fixed** | **P0** |
| `OrganisationPolicy::viewMembers` always false | **Working** (intentional) | — |

---

## Institutions, invitations, data isolation

| Item | Status | Notes |
|------|--------|-------|
| `organisation_memberships` + active org pointer | **Working** | |
| Class invites (token/code) | **Working** | |
| Teacher staff invites | **Working** | Phase 6 |
| Teacher → student via consent + shared class | **Working** | Not org id alone |
| Parent → student via approved link + permissions | **Working** | |
| Cross-institution transfer | **Missing** | Documented out of scope |
| Institution-wide learner roster | **Missing** (intentional) | |

---

## Assignments, assessments, recordings, notifications

| Item | Status | Notes |
|------|--------|-------|
| Assignment lifecycle | **Working** | Recipients, not separate submissions table |
| Teacher human assessment | **Working** | |
| AI memorisation assessments | **Working** | Idempotent keys |
| `ai_recite_attempts` audio | **Working** | |
| Cross-surface status sync (student/parent) | **Working** | Integration + `StudentLessonManagementWorkflowTest` |
| Cancel / reassign without losing history | **Working** | Lifecycle events on recipient |
| Parent attendance API | **Working** | Permission-gated read-only |
| DB notifications (`LearningTaskNotification`) | **Partial** | No unified `GET /notifications` |
| `LearningTaskNotifier` per-recipient `User::find` | **Duplicated → Reduced** | Batch load (P2) |
| `displayStatus` in teacher/parent/plan services | **Duplicated** | Safe consolidate later |

---

## AI recitation lifecycle

| Item | Status | Notes |
|------|--------|-------|
| Token mint + rate limit + usage cap | **Working** | |
| Browser alignment + POST assessment | **Working** | No Laravel queue on score path |
| Invalid attempts → no quota consume | **Working** | |
| `consumeFindAyah` never called on use | **Broken → Fixed** | Mint with `purpose=find_ayah` |
| `POST /assessments/failed` unused by frontend | **Partial** | Tests only; candidate removal |
| `recordFailedMemorisationAssessment` (JS) dead | **Duplicated** | Remove in cleanup phase |
| `MUTQIN_UNRESTRICTED_SUBSCRIPTION=true` default | **Partial** | **P0 deploy**: set `false` in production |
| Find Ayah 403 copy says `tier: pro` for premium | **Partial** | **P2** copy fix |

---

## Subscription entitlements

| Route pattern | Middleware | Free AI checks |
|---------------|------------|----------------|
| `/api/hifz-plan` (write) | `plan:premium` | — |
| `/api/recommendations/adaptive-assessment` | `plan:premium` | — |
| `/api/recommendations/ai-assessment` | `plan:pro` | — |
| `/api/memorisation/assessments` | throttle + daily quota | **By design** |
| `/memorisation/transcription-token` | caps + quota | **By design** |

---

## Fixes applied (this pass)

1. **`ParentAccessAuthorizer`** — use `User::isStudent()` and supplemental `user_account_roles` in list queries (parity with `StudentAccessAuthorizer`).
2. **`OrganisationPolicy::createGroup`** — use `isTeacher()`.
3. **`OrganisationMembershipService::reject`** — require approved teacher membership row (same as `approve`).
4. **Find Ayah quota** — `consumeFindAyah()` after successful Speechmatics mint when `purpose=find_ayah`.
5. **`LearningTaskNotifier`** — batch-load students for assignment/deadline/lesson notices.
6. **Assignment lifecycle** — `cancelled` / `reassigned` recipient states with append-only `completion_evidence.lifecycle_events`; teacher duplicate + reassign APIs; unified `AssignmentDisplayStatus` for teacher, learner and parent.
7. **Parent attendance** — `GET /api/parent/children/{student}/attendance` when `ViewAttendance` permission is granted (teachers in the student circle only).

**Regression tests:** `tests/Feature/Mutqin20AuditFixesTest.php`, `tests/Feature/StudentLessonManagementWorkflowTest.php`

---

## Remaining backlog (by priority)

### P0 — Security / data integrity

- [ ] **Production env:** `MUTQIN_UNRESTRICTED_SUBSCRIPTION=false` on Laravel Cloud (see `config/mutqin.php`).
- [ ] **Audit new teacher/parent routes** — ensure every student-scoped endpoint uses authorizer or 404 pattern.

### P1 — Broken or incomplete workflows

- [ ] **Teacher journey Playwright audit** — `phase4-teacher-journey-audit.cjs` still absent (see `docs/phase-4-teacher-onboarding.md`).
- [ ] **Unified notification inbox API** for learners (revision reminders exist; task notices in DB only).
- [ ] **ParentChildLearningService** per-row queries — consolidate with `presentRecipient` (performance under large assignment lists).

### P2 — Performance / usability

- [ ] **`TeacherDashboardService::learnerSupport`** — unbounded session/attempt history loads.
- [ ] **Consolidate `displayStatus` / overdue helpers** across teacher, parent, plan services.
- [ ] **Remove dead paths:** `assessments/failed` frontend wire-up or deprecate endpoint; delete unused `providerIdentity.js`.
- [ ] **Find Ayah error payload** — surface `premium` tier where appropriate.

### P3 — Documentation / QA

- [ ] Re-run `docs/phase-12-student-platform.md` checklist after student UI changes.
- [ ] Time-to-first-assignment metric (Phase 4 target &lt;10 min).

---

## Test gates

```bash
# Focused regression from this audit
php artisan test tests/Feature/Mutqin20AuditFixesTest.php

# Social graph (when changing authorizers)
php artisan test --filter=ParentPlatformTest
php artisan test --filter=OrganisationMembershipAndInviteTest
php artisan test --filter=StudentTeacherParentIntegrationTest

# AI / billing
php artisan test --filter=SpeechmaticsTranscriptionTokenTest
php artisan test --filter=SubscriptionBillingTest
```

**Note:** Full `composer test` may OOM on `PasswordResetFlowTest` in constrained environments; run targeted suites in CI shards or raise `memory_limit` locally.

---

## Architecture (unchanged principles)

```text
AccountRole (who you are)
    └── PlatformContext (which shell: learner / teacher / parent)
            └── Relationship graph (who you may see)
                    ├── group_memberships + analytics_consent → teacher analytics
                    ├── parent_student_links + permissions → parent views
                    └── organisation_memberships → affiliation only (not class data)
```

Do **not** widen teacher access via `organisation_id` alone. New features should extend existing authorizers and policies rather than parallel checks.

---

## Dependencies for subsequent phases

| Phase / doc | Depends on |
|-------------|------------|
| Phase 4 teacher onboarding | Journey audit script, teacher checklist UI |
| Phase 7 E2E QA | Playwright teacher journey |
| Billing hardening | `MUTQIN_UNRESTRICTED_SUBSCRIPTION=false`, Stripe webhooks live |
| Notification product | Inbox API + learner prefs server sync |
| Performance | `learnerSupport` pagination, parent presentation batching |