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

Submitted assignments now contribute to the existing attention metric and
filter until reviewed. No new schema or API contract was introduced.

## Verification

Verified on the completed implementation: production build, import and theme
checks, Qur'anic integrity, 53 backend tests (629 assertions), 216 teacher/profile
and 24 learner viewport/theme cases, modal and recording workflows, loaded
Madani fonts and exact glyph order. The delayed-permission test confirms that
closing a conversation releases every microphone track. The final contrast
run passed all 57 sampled text/status combinations.

```sh
npm run build
npm run lint:imports
npm run test:theme
npm run test:quran-integrity
php artisan test --compact --filter='TeacherDashboardTest|TeacherRecitationPlaybackTest|LearningPlansTest|LearnerResourceAuthorizationTest|TeacherTaskStateTest'
npm run test:teacher:workspace
node tests/js/teacher-contrast-check.cjs
```

The browser suite requires an existing local demo classroom at
`http://localhost:8000`. It supports `MUTQIN_QA_BASE`, `MUTQIN_QA_EMAIL`,
`MUTQIN_QA_STUDENT_EMAIL`, `MUTQIN_QA_PASSWORD`, and `MUTQIN_QA_SHOTS`.
It reads persisted data, never uploads the synthetic microphone sample, and
writes screenshots/results to `/private/tmp/mutqin-workspace-qa` by default.
It checks eight widths, three themes, teacher/profile views, the learner
workspace, modal forms, focus, recording states and canonical glyph order.

The broad Node suite currently passes 212 of 227 files. The same 15 failing
files were reproduced against the unchanged Git source in an isolated
checkout: AI attempt feedback/review, chunk recovery, dashboard startup,
homepage carousel/footer, translation-key audit, mutashabihat display, controls
wiring, flow, combined fixes, parked-set lifecycle, post-session recommendation,
Madani reading tools and Madani selection. These failures remain outside this
workspace change; one requires network access and several assert older source
structures.

Real retained-recording playback still requires a consented recording; the
local demo provides historical assessment data without retained audio.
