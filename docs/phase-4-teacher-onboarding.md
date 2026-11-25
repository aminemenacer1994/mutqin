# Phase 4 — Teacher Onboarding & UI/UX Simplification

**Date:** 2026-11-25  
**Goal:** A first-time teacher can create their first meaningful assignment in **under 10 minutes** (measured, not assumed).  
**Scope:** Registration, connection setup, teacher workspace first-run, student/parent linking guidance, assignment defaults, navigation polish. Preserve auth, permissions, role switching, and Teacher/Parent/Student design system (ivory/brown, typography, RTL, dark mode).

**Out of scope (unless demo exists):** Secure sandbox-demo teacher entry point.

---

## Executive summary

The teacher workspace is **functionally mature** (`TeacherDashboard.vue`, unified shell, overview → students → assignments → reviews). Post-auth routing sends verified teachers **directly to the dashboard**; connection setup is **optional** (`AuthRedirect`).

Connection onboarding (`/onboarding/connections`) covers institution → class → invite with skip/revisit state on `User.connection_onboarding`. Independent teachers can skip institution, but **class creation in Connect still requires an approved organisation**, and “Work independently” **finishes Connect immediately**—so the ideal journey **Academy (optional) → Students → First assignment** is **not surfaced as one checklist inside the workspace**.

**Phase 4 pass criteria: not met yet.** No automated journey timing, no teacher-first-run checklist, no teacher Phase 4 audit harness beyond incidental screenshots in `phase4-parent-platform-audit.cjs`.

---

## 1. Spec mapping (requirements 1–12)

| # | Requirement | Current state | Gap / notes |
|---|-------------|---------------|-------------|
| 1 | Simplified teacher registration & profile | 2-step register (account → role cards) in `register.blade.php`; teacher is one role option, same fields as others | No teacher-only shortened path; profile edits live in teacher Settings + optional Connect |
| 2 | Setup journey: Academy → Students → First assignment | Connect steps: `institution` → `class` → `invite` (`ConnectionOnboarding.vue`) | Dashboard does not guide or persist workspace setup toward **first assignment** |
| 3 | Independent teachers without institution | Skip institution + `connections_work_independently`; `ConnectPrompt` on overview | `saveTeacherClass` blocks without approved org; skip-institution calls `finish()` and bypasses class/invite |
| 4 | Short, skippable first-use checklist | `connection_onboarding` tracks Connect steps only | No in-dashboard checklist component or API for teacher workspace steps |
| 5 | Role-specific video onboarding | `TutorialCarousel` / homepage tutorials | Not embedded in teacher dashboard or Connect |
| 6 | Sandbox-demo entry | Memorisation demo route exists; teacher isolated demo **not found** | Defer per spec |
| 7 | Reusable assignment defaults/templates | `defaultAssignmentForm()` in `constants.js` (surah/range defaults) | No saved templates, presets UI, or “use last assignment” product surface |
| 8 | Guidance for student + parent linking | Student profile guardians tab; invite/resend APIs; optional parent step in Connect for learners | Weak overview-level copy for **new teachers with zero students**; guardian flow not in first-run checklist |
| 9 | Contextual help on complex tools | `TeacherTabGuide.vue` (sparse use) | Plans, recite review, AI assessment, attendance need more inline descriptions |
| 10 | Onboarding progress, skip, revisit | Strong for **Connect** (`completed` / `skipped` / `finished`) | Workspace steps (first student, first assignment) not tracked; revisit via Settings → Connect link only |
| 11 | Empty states & first-action CTAs | `TeacherEmpty`, hero **Assign task**, overview queues | Zero-student assignment path unclear; institution-pending vs independent states easy to confuse |
| 12 | Simple navigation, compact filters, accessible modals | `TEACHER_NAV`, `TeacherDialog`, shared tokens in `TeacherDashboard.css` | Phase 4 is journey cohesion, not full nav redesign |

---

## 2. Architecture & key files

| Area | Paths |
|------|--------|
| Teacher shell | `resources/js/views/TeacherDashboard.vue`, `resources/js/scripts/composables/useTeacherDashboard.js` |
| Nav & defaults | `resources/js/scripts/teacher/constants.js` (`TEACHER_NAV`, `defaultAssignmentForm`) |
| Overview / hero | `resources/js/components/teacher/TeacherHero.vue`, `TeacherOverviewSection.vue` |
| Assignments | `resources/js/components/teacher/TeacherAssignmentsSection.vue`, `TeacherTaskSheet.vue` |
| Students & guardians | `TeacherStudentsSection.vue`, `profile/TeacherStudentProfileGuardians.vue` |
| Settings / Connect link | `TeacherSettingsSection.vue` → `/onboarding/connections` |
| Connect UI | `resources/js/views/ConnectionOnboarding.vue` |
| Connect API | `app/Http/Controllers/Onboarding/ConnectionOnboardingController.php` |
| Auth redirect | `app/Support/AuthRedirect.php` (teachers → `teacher.dashboard`, Connect never forced) |
| Registration | `resources/views/auth/register.blade.php`, `App\Support\Registration\RegistrationProfile` |
| Persistence | `app/Models/User.php` (`connection_onboarding`, `onboarding_completed_at`) |
| Design system | `resources/sass/teacher-dashboard.scss`, `TeacherDashboard.css`, shared `user-dashboard` / `dash-btn` patterns |
| Backend | `TeacherDashboardService.php`, `TeacherAssignmentService.php`, organisation/group invitation services |

**Data note:** `onboarding_completed_at` is oriented to memorisation first-run (`ProfileController::updateOnboarding`, product events). Do not overload it for teacher workspace checklist without an explicit product decision.

---

## 3. Teacher surfaces audit

| Surface | Purpose | First-run relevance |
|---------|---------|---------------------|
| Overview | KPIs, action queue, create assignment CTA | Primary landing; should host checklist |
| Students | Filters, roster, bulk assign | Step 2: add/invite learners |
| Assignments desk | List + create/edit form (`formOpen`) | Step 3: first meaningful assignment |
| Reviews | Audio/recitation queue | Post-setup; not first-10-min critical path |
| Plans | Learning plans hub | Advanced; contextual help only |
| Settings | Account, Connect, org roster | Revisit Connect; platform switch |
| Student profile | Tasks, guardians, messages, AI | Guardian linking guidance lives here |
| Connect (standalone) | Institution/class/invite | Optional; should align with dashboard checklist |

**Nav items (desktop/mobile):** overview, students, assignments, reviews (`TEACHER_NAV`).

---

## 4. Journeys to test

### 4.1 Personas

| Persona | Setup | Success signal |
|---------|-------|----------------|
| **New teacher** | Fresh register, role = teacher, email verified | Lands on overview; can open assignment form and save a task (with or without students per product rules) |
| **Independent teacher** | Skip institution in Connect | Class + invite possible **without** approved academy; dashboard reflects independent state |
| **Academy teacher** | Join/create org, approved membership | Class create + class invite code; org name on hero |
| **Returning teacher** | `connection_onboarding.finished` or partial skipped | No blocking modals; checklist collapsed or hidden when complete |
| **Multi-role** | Teacher + parent and/or student | Role switch preserves teacher progress; Connect steps role-aware |

### 4.2 Critical workflow chain

```text
Register (teacher) → verify email → /teacher
  → [optional] Connect: institution | skip independent
  → [optional] class + invite code
  → add/approve students (invite or roster)
  → create assignment (overview CTA or assignments desk)
  → [optional] invite guardian from student profile
```

**Independent-teacher bug to verify in implementation:**

- `ConnectionOnboarding.vue` `skipInstitutionIndependently()` → `patch({ skip })` + **`finish()`** (exits before class/invite).
- `saveTeacherClass()` requires `institution?.status === 'approved'` while server `update()` only creates a group when `$user->organisation_id` is set (`ConnectionOnboardingController`).

### 4.3 Time-to-first-assignment (manual + optional telemetry)

| Step | Measure |
|------|---------|
| T0 | Account created (teacher role) |
| T1 | First paint of teacher dashboard |
| T2 | Assignment form opened |
| T3 | Assignment saved (HTTP 2xx, row visible on desk) |

**Do not claim &lt;10 minutes until** at least three recorded runs per persona (median + p90). Optional: `productEvents` / PostHog custom props on `teacher_assignment_created` with `seconds_since_register` if/when instrumented.

---

## 5. Regression & quality gates

### 5.1 Existing automated coverage

| Check | Relevance to Phase 4 |
|-------|----------------------|
| `tests/Feature/TeacherDashboardTest.php` | Assignments, students, overview APIs, permissions |
| `tests/Feature/AuthPageRenderTest.php` | Register UI strings incl. `connections_work_independently` |
| `tests/Feature/LearnerCircleSettingsTest.php` | Circle/institution presentation (student settings; patterns for teachers) |
| `tests/js/phase4-parent-platform-audit.cjs` | Parent nav screenshots + **limited** teacher desktop screenshot (not journey) |
| Student phase verify scripts | Design-system patterns to **mirror**, not teacher onboarding |

### 5.2 Proposed Phase 4 gates (to add)

| Gate | Intent |
|------|--------|
| `tests/js/phase4-teacher-onboarding-verify.mjs` | Static: checklist component wired, hero CTA, Connect skip paths, locale keys |
| `tests/Feature/ConnectionOnboardingTeacherTest.php` | Independent skip → class without org; invite issuance; state JSON |
| `tests/js/phase4-teacher-journey-audit.cjs` | Playwright: register or seeded new teacher → open assignment form → screenshot + step timestamps |
| Extend `useTeacherDashboard` tests | `defaultAssignmentForm` used on first open; zero-student messaging |

### 5.3 UI/UX parity checklist (manual or Playwright)

- Viewports: 1440, 768, 390 (match student/parent audits).
- Themes: light, dark; **RTL (ar)** on Connect + teacher hero/checklist.
- Horizontal overflow: `documentElement.scrollWidth` ≤ clientWidth + 2.
- Modals: assignment sheet/dialog focus trap, Escape, return focus (`TeacherDialog` / sheet patterns).
- No jargon in first-run copy; forms remain compact (auth-page / teacher-pane, not oversized card stacks).

### 5.4 Recommended command batch (baseline before/after Phase 4 work)

```bash
npm run lint:imports
npm run build
composer test -- --filter=TeacherDashboard
composer test -- --filter=ConnectionOnboarding
node --test tests/js/phase4-teacher-onboarding-verify.mjs   # once added
```

---

## 6. Implementation backlog (prioritized)

| Priority | Item | Touches |
|----------|------|---------|
| P0 | Independent teacher: class + invite without approved org; do not `finish()` on institution skip until class/invite skipped or done | `ConnectionOnboarding.vue`, `ConnectionOnboardingController`, group service |
| P0 | In-dashboard **setup checklist** (3–4 steps, skippable, persisted) ending in `startAssignment` | New Vue component, extend `User` state or reuse `connection_onboarding` with new keys |
| P1 | Zero-student assignment UX + clear copy (invite students vs assign when roster empty) | `TeacherAssignmentsSection`, `TeacherHero`, locales |
| P1 | Guardian linking hint from checklist or first student empty state | `TeacherStudentsSection`, guardians tab copy |
| P2 | Assignment templates / “duplicate last” / saved defaults | `TeacherTaskSheet`, API if persisted server-side |
| P2 | Teacher tutorial embed (link or modal from existing homepage tutorials) | `TeacherOverviewSection` or checklist |
| P2 | `TeacherTabGuide` on plans, reviews, attendance entry points | respective components |
| P3 | Journey audit script + timing report artifact | `tests/js/phase4-teacher-journey-audit.cjs` |
| — | Sandbox teacher demo | Only if isolated demo is implemented |

**Constraints (from spec):** Preserve authentication, permissions, role switching, relationships. Use **exact** Teacher/Parent/Student design tokens—no parallel teacher theme.

---

## 7. Known issues & risks

### P0 / P1 (onboarding path)

| Issue | Severity | Notes |
|-------|----------|-------|
| Independent institution skip exits Connect early | High | Blocks class/invite in intended journey |
| Class save gated on approved institution in UI | High | Conflicts with independent teachers |
| No workspace checklist | High | Connect optional; new teachers lack guided path to first assignment |
| `onboarding_completed_at` meaning | Medium | Teacher checklist needs separate state or documented reuse |

### P2 / follow-up

| Issue | Severity | Notes |
|-------|----------|-------|
| Non-English teacher onboarding strings | Medium | EN in `en.json` / `lang/en/ui.php`; sync AR/FR/ES/UR/TR/ID when copy lands |
| No teacher journey timing in analytics | Low | Add when checklist ships |
| Tutorial mapping teacher vs memorisation | Low | Curate playlist IDs |
| `phase4-parent-platform-audit.cjs` teacher section minimal | Low | Replace with dedicated teacher journey audit |

### Unverified

- Full register → verify → assign path on production-like env with real email.
- Academy **pending** approval: teacher can still reach assignment while waiting (product decision).
- Multi-role switch mid-checklist.

---

## 8. Success criterion

**Target (Phase 4 complete):**

1. Measured median time register → first saved assignment **&lt;10 minutes** for new and independent teachers in QA (documented runs).
2. Checklist skippable and revisitable; Connect and workspace progress consistent.
3. Independent teachers operate without institution; academy teachers retain existing flows.
4. Automated gates: PHP connection onboarding tests + JS verify script + journey audit (screenshots, no horizontal overflow on checklist/hero).
5. Premium visual consistency with Teacher/Parent/Student; RTL and dark mode on new UI.

**Current status:** **Not met** — audit and test plan only (this document).

---

## 9. Related documents

| Doc | Relation |
|-----|----------|
| `docs/phase-12-student-platform.md` | Design-system and regression gate pattern to mirror |
| `docs/phase-6-student-polish.md` | Modal/nav polish conventions |
| `docs/product-events.md` | Onboarding event naming if timing is instrumented |

---

## 10. Changelog

| Date | Change |
|------|--------|
| 2026-11-25 | Initial Phase 4 audit, gap analysis, and test plan |