# Teacher and learner workspace

The teacher workspace uses `TeacherDashboard.css` for shared theme tokens,
layout, navigation, lists, forms, conversations, audio and coaching.
`TeacherEvidence.css` retains specialised evidence, print-report and attendance
styles. The former premium/refined override layers have been removed. Both the
application and teacher Sass entry points import the same sources. Learner
learning surfaces remain in `Dashboard.learner-teacher.css`.

`TeacherDialog` owns viewport containment, scrolling, focus return, keyboard
trapping, backdrop handling, busy state and an inline unsaved-change prompt.
`TeacherSurahSelect` uses the existing canonical surah metadata. Task and plan
forms continue to submit to the existing endpoints. Plan editing preserves the
backend's append-only activity history.

The coaching workspace renders page-specific Madani V2 glyphs. The collector
rejects conflicting canonical locations and collapses duplicate leaves by
location, never by the displayed word. Verse-end glyphs are excluded from
word selection. Audio controls use retained recordings and stored timings;
missing media does not prevent assessment or word coaching.

The compact polish pass groups review actions in a single cell, removes repeated
profile/recitation summaries and form-header pills, and gives task/plan forms a
shared responsive grid. Modal and toolbar buttons size to their labels rather
than inheriting the practice page’s flexible primary-button width. Empty task
lists no longer display an unrelated feedback composer. Conversations and
recording actions share a compact footer, and the global Plans page has one
creation action for the selected context. Selectorless legacy evidence rules
have been removed.

Submitted assignments now contribute to the existing attention metric and
filter until reviewed. No new schema or API contract was introduced.

The final teacher/student pass uses the global 4px/8px spacing, control and
surface tokens. Student Home selects a real actionable assignment and linked
teacher feedback; My Learning retains assignment context and backend completion
rules. Progress uses compact responsive metrics, while Activity puts learning
history before achievements. Reveal animations no longer fade active content,
and the learner navigation tracks the actual application-header height.

The studio exposes assessment counts, selected-word correction, student-visible
feedback, private notes, revision and review status as distinct sections. A single
scrollable body keeps the full Qur'an passage and every action reachable within
90dvh. The legacy practice-modal rule now excludes teacher dialogs. All canonical
previews use verified Madani V2 references; recognition transcripts remain
separately labelled evidence.

Task and direct conversations use shared modal focus and scroll ownership.
Composers grow with content; recoverable errors retain their input. Assignment
retries preserve the same client UUID through every callback and the API payload,
and stale GET responses cannot erase confirmed messages. Direct conversations show selected persisted feedback even when it is outside
the chat history, update incoming replies while open, protect unsent drafts and cannot close during submission. Learner direct messages
offer text because the existing endpoint accepts text only; task voice notes
and teacher audio feedback remain available.

Basic and Advanced analytics share responsive surfaces and accessible charts.
Advanced requests are sequenced, custom dates apply once, empty charts are hidden,
and PDF exports use a print palette and restore keyboard focus. Existing access
rules are unchanged.

## Main changed files

- `resources/sass/app.scss`: shared spacing, control and surface tokens.
- `resources/js/views/TeacherDashboard.css`, `TeacherEvidence.css` and
  `Memorisation.css`: teacher layouts, forms, studio, canonical evidence and
  isolation from legacy practice-modal sizing.
- `resources/js/views/Dashboard.vue` and `Dashboard.learner-teacher.css`:
  actionable learner Home, My Learning, Progress, Activity and conversations.
- Shared `TeacherDialog.vue`, `DashModalRoot.vue`, `TeacherTaskConversation.vue`,
  `LearnerTaskThreadPanel.vue`, `autoGrow.js` and `modalScrollLock.js`:
  responsive overlays, input growth, draft protection, focus and message delivery.
- Teacher profile, directory, task and plan components; canonical Madani builders;
  `TeacherRecitationPlaybackReview.vue` and `TeacherReciteMushafAyahs.vue`.
- Basic/Advanced analytics components, shared `AnalyticsChart.vue`, report builder
  and PDF palette; English, French and Spanish interface copy.
- Focused JavaScript behavior tests and responsive browser regression scripts.

## Verification

Verified on the final implementation:

- Production build, production CSS palette gate and production chunk guard passed
  in `/private/tmp/mutqin-production-verify`, using an identical resource tree.
  The running development watcher was preserved; a separate development build
  refreshed the local app and passed its chunk guard.
- Import verification passed for 440 files; source theme checks and Qur'anic
  content integrity passed.
- 56 backend tests passed (665 assertions), covering teacher access, playback,
  plans, learner authorization, task states and advanced analytics access.
- 41 focused JavaScript behavioral checks passed, including real SFC/API callback
  execution for retry identity, stale response rejection and unsent direct drafts.
- 288 teacher/profile/form/studio, 96 learner-page, 24 direct-conversation and
  18 Basic analytics viewport/theme cases passed against the running local app.
- 36 Advanced analytics cases passed in an isolated component harness using
  persisted read-only reports. This covered chart sizing, empty AI states,
  custom dates, accessible chart values and a real PDF download.
- 58 sampled teacher text/status/tab contrast combinations passed AA text
  contrast. Keyboard navigation, focus return, draft protection and delayed
  microphone permission/track cleanup passed; no browser runtime errors occurred.
- Rendered recitation glyphs and ayah ends matched the canonical corpus exactly,
  with unique word identities and loaded page-specific Madani font faces.

```sh
npm run build
npm run lint:imports
npm run test:theme
npm run test:quran-integrity
php artisan test --compact --filter='TeacherDashboardTest|TeacherRecitationPlaybackTest|LearningPlansTest|LearnerResourceAuthorizationTest|TeacherTaskStateTest|AdvancedAnalyticsTest'
npm run test:teacher:workspace
node tests/js/teacher-contrast-check.cjs
node tests/js/analytics-workspace-responsive.cjs
node --experimental-vm-modules tests/js/teacher-message-recovery.test.mjs
```

The browser suite requires an existing local demo classroom at
`http://localhost:8000`. It supports `MUTQIN_QA_BASE`, `MUTQIN_QA_EMAIL`,
`MUTQIN_QA_STUDENT_EMAIL`, `MUTQIN_QA_PASSWORD`, and `MUTQIN_QA_SHOTS`.
It reads persisted data, never uploads the synthetic microphone sample, and
writes screenshots/results to `/private/tmp/mutqin-workspace-qa` by default.
It checks eight widths (320–1920px), three themes, teacher/profile views, all four
learner panes, modal forms, focus, recording states and canonical glyph order.
Final screenshots and JSON reports are in `/private/tmp/mutqin-final-qa`.
Run the built CSS gate after a production build: its required-selector pattern
expects minified production CSS, rather than the development watch format.

The final broad Node run passed 218 of 233 test files. The same 15 failing
files were reproduced against the unchanged Git source in an isolated
checkout: AI attempt feedback/review, chunk recovery, dashboard startup,
homepage carousel/footer, translation-key audit, mutashabihat display, controls
wiring, flow, combined fixes, parked-set lifecycle, post-session recommendation,
Madani reading tools and Madani selection. These failures remain outside this
workspace change; one requires network access and several assert older source
structures.

Real retained-recording playback still requires a consented recording; the
local demo provides historical assessment data without retained audio.

Advanced analytics was not exercised through a live entitled admin session;
the ordinary learner API correctly returned 403 and exposed no Advanced entry.
The isolated harness verified the component and export without bypassing that
production restriction. No live messages, feedback, assignments or recordings
were created by browser verification.
