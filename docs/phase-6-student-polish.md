# Phase 6 — Student Modals, Messaging & Global UI/UX Polish

**Date:** 2026-11-24  
**Scope:** Student dashboard modals, Messages pane, and Settings controls aligned with Teacher/Parent patterns. Business logic and safeguarding rules unchanged.

---

## Files changed

| File | Change |
|------|--------|
| `resources/js/components/teacher/LearnerStudentMessages.vue` | New Messages workspace: teacher threads + feedback inbox |
| `resources/js/components/teacher/LearnerStudentMessages.css` | Student messages layout and list styling |
| `resources/js/components/teacher/LearnerTeacherSection.vue` | Submission on `DashModalRoot`; assignment modal footer; `openDirectThreadByTeacherId` |
| `resources/js/views/Dashboard.vue` | Messages pane, Settings `dash-btn`, self-assessment sticky footer |
| `resources/js/views/Dashboard.learner-teacher.css` | Shared `dash-modal__foot`, assignment/submission modal grids |
| `resources/js/views/Dashboard.student-experience.css` | Messages pane premium spacing |
| `resources/js/locales/en.json` | Student messages copy |
| `tests/js/phase-6-student-polish-verify.mjs` | Static verification for modal + messaging polish |

---

## UI fixes

### Modals

- Submission detail uses `DashModalRoot` (focus trap, Escape, scroll lock, return focus).
- Assignment detail modal includes a sticky footer with **Message** and primary task action.
- Self-assessment modal actions moved to a sticky `dash-modal__foot` so long forms do not hide buttons.
- Shared `dash-modal__foot` / `dash-student-dialog--has-foot` tokens for centered student dialogs.

### Messaging

- **Messages** tab shows teacher direct-message threads alongside the feedback inbox (previously feedback only).
- Opening feedback from Messages keeps the user on that tab instead of switching to My learning.
- Circle **Message** action correctly opens the teacher thread (`openTeacherThread`).

### Global design

- Student **Settings** actions use `dash-btn` variants instead of Bootstrap outline buttons.

---

## Tests run

```bash
node --test tests/js/phase-6-student-polish-verify.mjs
node --test tests/js/student-dashboard-design-system.test.mjs
node --test tests/js/student-dashboard-navigation.test.mjs
node --test tests/js/assignment-self-assessment.test.mjs
```

Browser screenshot compare (Teacher vs Student Messages at desktop/tablet/mobile, dark/light) was **not** re-run in this pass; use `tests/js/phase1-student-my-learning-audit.cjs` as the baseline harness when doing visual QA.

---

## Remaining limitations

- Teacher/Parent parity screenshots for the new Messages layout are not checked in yet.
- Non-English locale files do not include the three new `dashboard.messages_teachers_*` keys (English fallback applies).
- Assignment task threads are still opened from My learning cards or feedback links; there is no separate “assignment threads” inbox on Messages.
- Live keyboard/RTL verification of every modal was not repeated in a browser this pass (covered structurally via `DashModalRoot` and existing navigation tests).