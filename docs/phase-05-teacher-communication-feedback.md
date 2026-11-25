# Phase 05 — Teacher communication & feedback

**Date:** 2026-11-25  
**Priority:** P1  
**Scope:** Student (and shared learner) messaging, feedback surfacing, playback, attribution, consolidated unread/deep links. Server authorisation unchanged.

`00-shared-rules.md` was not present in the repository; conventions follow existing phase docs and `docs/phase-12-student-platform.md`.

---

## Audit summary

| Requirement | Status | Evidence |
|-------------|--------|----------|
| Teacher-scoped threads, unread, search, reply | **Met** | `LearnerStudentMessages.vue`, `learnerStudentMessages.js`, `learner-student-messages.test.mjs` |
| Recent feedback on Home & Progress | **Met** | `studentHome.js` attention rows; `#progress-feedback` in `Dashboard.vue` |
| Links to assignments / feedback context | **Met** | `MessageBubble` assignment link; `openFeedbackFromPanel`; `openMessageAssignment` |
| Authorised teacher voice feedback & playback | **Met** | `TeacherAudioFeedbackPlayer`, `LearnerAttemptPlaybackModal`, `TeacherRecitationPlaybackTest` |
| Student recordings not default in Messages | **Met** | `allow-recording="false"` on Messages `TeacherTaskConversation` |
| Teacher vs AI vs system attribution | **Met** | `MessageBubble` `feedbackType`; Activity `teacher_feedback` vs AI blocks; AI wording pending until teacher review |
| Single Messages unread badge (feedback + DMs) | **Met** | `navBadges` in `Dashboard.vue` |
| Failed send / revoked / unavailable audio | **Met** | `learnerTaskThread.js` optimistic + retry; `can_message === false`; `voice_feedback_unavailable` |
| Notification deep links | **Improved this pass** | `LearningTaskNotifier::dashboardHref()` → `?tab=…&feedback=` / `assignment_recipient=`; `?teacher=` on dashboard load |

---

## Changes this pass

| File | Change |
|------|--------|
| `app/Services/Learning/LearningTaskNotifier.php` | Dashboard notice `href`s include `tab`, `feedback`, and `assignment_recipient` query params |
| `resources/js/views/Dashboard.vue` | `openTeacherMessage` → Messages pane; `openLinkedLearnerRecord` handles `?teacher=` |
| `tests/js/teacher-message-recovery.test.mjs` | Stub `.css` imports; fix support-refresh mock (`learner_learning_network_connected`) |
| `tests/js/phase-05-teacher-communication-verify.mjs` | Static phase gate |
| `tests/Feature/PersonalisedLearningTest.php` | Assert feedback notification href contains `feedback={id}` |

---

## Tests run

```bash
node --test tests/js/phase-05-teacher-communication-verify.mjs
node --test tests/js/learner-student-messages.test.mjs tests/js/student-home.test.mjs tests/js/learner-home.test.mjs tests/js/phase-6-student-polish-verify.mjs
node --experimental-vm-modules --test tests/js/teacher-message-recovery.test.mjs
php artisan test --filter=PersonalisedLearningTest
```

---

## Blockers / P2

- **`00-shared-rules.md`** not in repo — add or point agents to canonical path if required.
- **Feedback drawer vs Messages inbox** — assignment feedback inbox remains on My Learning (drawer); DMs live on Messages; consolidated badge only (by design after Phase 6).
- **Locale** — some `dashboard.messages_teachers_*` keys English-only (`phase-6-student-polish.md`).
- **In-app notification UI** — student bell/inbox consumption not wired; payloads and URLs are ready for a future shell.

`teacher-message-recovery.test.mjs`: **16/16 pass** (requires `node --experimental-vm-modules`).