# Mutqin growth audit

Date: 12 November 2026. Scope is the application as it exists in this repository: routes, Vue workspace, dashboards, billing, teacher APIs, analytics, and the PWA. No production database is present here (no SQLite snapshot, no exported counts), so this document freezes the measurement contract. It does not invent current user counts.

Do not start growth implementation until the baseline in [§2](#2-measurable-baseline) has been read from the live admin dashboard and stored beside this file. Server tables are the source of truth. Browser analytics currently mis-name and, in one path, mis-fire events.

## 1. What the product actually does

Mutqin is a single application host (`routes/web/app.php`). `routes/web/marketing.php` is not loaded. `MutqinDomains::restrictMarketingHost()` is always false, so the homepage hero offers registration, not a waiting list.

A new visitor can:

1. Open `/` and follow **Start your first session**, which goes to `/register?intent=first` (`Homepage.vue`, `publicRegisterHref`).
2. Create an email account or continue with Google. Email verification is off unless `AUTH_REQUIRE_EMAIL_VERIFICATION` is set. After signup, `AuthRedirect` sends the learner to `/memorisation` and, for `intent=first`, sets `mutqin_start_first_session`.
3. Practise in the memorisation workspace (new learning, revision, planner, sample). Sessions persist in `user_sessions` (`active`, `paused`, `interrupted`, `ended_early`, `completed`, `abandoned`).
4. Run AI Recite from the workspace or after a session. Free accounts are limited by `FeatureUsageCounter` (`ai_assessment`, default 5/day in `config/billing.php`) and an optional lifetime cap on `users.ai_recite_lifetime_limit`. Core memorisation and revision are not plan-gated. Pro gates audio download.
5. Return through `/dashboard` (the same page as `/progress`): a continue card, murajaah, and AI Recite history.

Teacher organisations, groups, assignments, attendance, and messages exist and default **off** (`MUTQIN_TEACHER_FEATURES_ENABLED=false`). Post-session recommendation plans default **off** (`SHOW_RECOMMENDATION_PLAN=false`).

Stripe billing, password auth, Google auth, and existing learner rows must stay intact.

## 2. Measurable baseline

Capture this from a signed-in admin via `GET /api/admin/dashboard` (`AdminDashboardService::buildSnapshot` and `buildLearningOverview`) **before any growth change**. Record the UTC timestamp and the raw `snapshot` object. This repository cannot supply the numbers.

### 2.1 Already computed

| Key | Meaning | Window |
| --- | --- | --- |
| `snapshot.users_total` | Accounts (`users`, soft-deleted excluded) | all-time, plus new in the selected 7- or 30-day window vs the previous equal window |
| `snapshot.active_users` | Distinct users with `last_login_at` or a non-example `user_sessions.last_activity_at` in the last 7 days | 7 days, with share of all users |
| `snapshot.sessions_completed` | `user_sessions.status = completed`, `is_onboarding_example = false` | all-time and selected window |
| `snapshot.ai_recite_attempts` | Rows in `ai_recite_attempts` | all-time |
| `snapshot.waiting_list_total` | `waiting_list_entries` when that connection is configured | all-time and window |
| `learning.learners_with_progress` | Distinct `memorisation_progress.user_id` | all-time |
| `learning.memorised_ayahs` / `learning_ayahs` | Progress rows in `memorised`/`mastered` vs `learning`/`reviewing` | all-time |
| `learning.assessments` | `memorisation_assessments` count | all-time |
| `ai_health.last_7d` / `avg_accuracy` | Recent AI Recite volume and mean `accuracy_percent` of valid scored attempts | 7 days / all-time |

Activation and return are **not** in that payload. Compute them from the same tables. Exclude `is_onboarding_example = 1`. Exclude soft-deleted users.

| Metric | Definition | Why it is the baseline |
| --- | --- | --- |
| Activation | Share of accounts with at least one non-example `user_sessions` row whose `started_at` is not null | A registration that never starts practice |
| Completion | Share of those accounts with at least one `status = completed` session | Practice that never finishes a range |
| AI check | Share of activated accounts with at least one `ai_recite_attempts` row | The check feature is built and easy to miss |
| D1 return | Share of accounts whose first non-example `user_sessions.started_at` is followed by another non-example session on a later `learning_analytics.session_date` | The repeat-usage gap |
| D7 return | Same, with the second `session_date` within 7 days of the first | Habit, not a single extra visit |
| Consistency | Distinct users with `learning_analytics.streak_day >= 2` | The streak is already stored and not shown to the learner |

Waiting-list acquisition, when the table is available, is `waiting_list_entries.first_source`, `last_source`, and `last_campaign`. Registered accounts have **no** UTM or referral columns (`User` fillable list). First-touch `utm_source`, `utm_medium`, and `utm_campaign` live only in `sessionStorage` (`mutqin_acq_attr`) and are attached to GA4 events for that tab.

### 2.2 Do not use the current browser events as the baseline

`docs/product-analytics.md` lists `session_started` and `session_completed`. The workspace emits `memorisation_started` or `revision_started`, and `memorisation_completed` or `revision_completed` (`Memorisation.js`). These names are defined in `productEvents.js` and never sent: `session_started`, `session_completed`, `recitation_started`, `ai_assessment_completed`.

`onboarding_complete` fires from `markOnboardingCompleted()` the first time that flag flips. On a ten-minute hero entry the call is `if (isTenMinuteHeroEntry && this.requiresFirstTimeOnboarding)` **without invoking the method**. A function is always truthy, so the event can fire while `requiresFirstTimeOnboarding()` still returns `false` and no tour ran.

Ackee and the Meta Pixel (consent-gated, id `969768972218630`) record overlapping names (`register_completed`, `CompleteRegistration`, `MutqinMemorisationSessionStarted`). There is no consent banner in this repo. Pixel stays off until `window.mutqinMarketingConsent === true`.

Until the bootstrap bug below is fixed, compare any GA4 movement with `user_sessions`, not with `onboarding_complete`.

### 2.3 Baseline status

| Item | Status on 12 November 2026 |
| --- | --- |
| Metric definitions | Frozen above, mapped to existing tables and `GET /api/admin/dashboard` |
| Numeric snapshot | **Not captured.** No database in this workspace. Read production before implementation and paste the snapshot here. |
| GA4 key events | Unreliable until Admin marks the events the app actually sends: `sign_up`, `memorisation_started`, `revision_started`, `memorisation_completed`, `revision_completed` |

## 3. Findings

### 3.1 Unnecessary friction

**The first-session path does not run.** In `Memorisation.js` bootstrap (~11593–11664) these locals use the method objects, not their return values:

- `needsFirstTimeOnboarding = authenticatedWorkspace && this.requiresFirstTimeOnboarding`
- `shouldAutoOpenOnboarding = authenticatedWorkspace && this.shouldAutoOpenOnboarding`

Both methods return `false` when called. Both locals are true whenever `learningBackendEnabled()` is true, which is the normal signed-in workspace (`auth.check` and the learning API still available). Consequences:

- `consumeDashboardEntryIntent()` is skipped, so `mutqin_start_first_session` and `?journey=ten_minute` never set `_pendingTenMinuteHeroStart`. The hero preset (`buildTenMinuteHeroSessionConfig`, full Al-Fatiha, 3 repetitions) never auto-starts.
- The `shouldAutoOpenOnboarding` branch always runs. `shouldAutoRestorePersistedSession` is hardcoded `false`, so this happens after resume hydration. `applyFirstOnboardingSessionConfig()` writes Al-Fatiha 1–5 (`buildFirstOnboardingSessionConfig`) and persists UI and central session state.
- Welcome Back is skipped because it requires `!needsFirstTimeOnboarding`.
- `skipOnboarding()` returns immediately for the same reason, so that skip control cannot complete.

`ensureEmptyWorkspaceEntrySurface()` is intentionally empty, so the learner is not even handed an open setup sheet after this reset.

**Signup is split.** The homepage CTA carries `intent=first`. The login page’s create-account link uses `BillingIntent` only (`login.blade.php`) and does not. Google on the login page is `auth.google.redirect`. Google on the register page is `auth.google.prepare`, which is what stores the first-session intent. A learner who signs up from login never gets the intended first sitting.

**Other friction, smaller:** password reset reports success for Google-only accounts because mail is sent only when `hasSetPassword()` is true. Demo login exists at `POST /login/demo` and is 404 unless `SHOW_DEMO_ACCOUNTS` is on. `GET /memorisation/demo` can play a sample with no account, and the homepage does not link to it. The PWA manifest `start_url` is `/memorisation`, which requires `auth` and `verified`.

### 3.2 Where new users abandon

| Step | What happens | Likely drop |
| --- | --- | --- |
| Homepage | Hero, feature carousel, FAQ, contact. Secondary CTA is `/features`, a long SEO page. | Visitors who wanted to try a page of Qur’an, not read about it |
| Register | Name, email, password confirm. Organisation UI hidden while teacher features are off. | Extra fields before any ayah; Google-from-login skips the first-session flag |
| Verify | Hard gate only when `AUTH_REQUIRE_EMAIL_VERIFICATION=true` | Everyone, when that env is on, before any practice |
| `/memorisation` | Bootstrap overwrites the workspace to Al-Fatiha 1–5 and does not start it | The intended “first session” never begins. This is the activation break. |
| First AI check | Microphone consent (`aiAudioConsent.js`) then daily quota | Consent or a 429 before the learner has a reason to upgrade |
| Paywall | Memorisation itself is free. Upgrade is a later audio-download / AI-quota wall | Fine for activation; do not put it in front of the first sitting |

`GET /waiting-list` is a 301 to `/`. `POST /waiting-list` and `POST /join-waiting-list` still create `waiting_list_entries`. `WaitingList.vue` is still bundled. Copy in locales and some SEO pages still talks about joining a list. Old links and old copy dead-end into the homepage or a form that is not the product.

### 3.3 Why there is little reason to return

The dashboard already builds a return brief and does not show it. `DashboardService` returns `retention.streak_days`, `retention.todays_focus`, `retention.upcoming_review`, and `retention.incomplete_session`. `Dashboard.vue` has no `retention` or streak binding. The visible return hooks are the continue card, a murajaah block, and AI Recite **history**.

`SHOW_RECOMMENDATION_PLAN` is false, so `SessionController::end` does not attach `NextSessionRecommendationService::recommendForCompletedSession()`. The engine, `session_recommendations`, and post-session CTA mapping exist. The default completed-session path sends the learner back to the dashboard without a next range.

Reminders are device-local (`notificationPreferences.js`). `practiceReminders` defaults to false. The file states Mutqin does not send email campaigns. Mail that exists: `VerifyEmail`, `ResetPassword`, `WaitingListLaunchMail`, `RegisteredUserBroadcastMail`. Nothing scheduled reminds a learner who missed a day. `routes/console.php` drains campaign mail; it does not run a practice reminder.

Streak data is for a quiet consistency line (“you revised yesterday”), not points, badges, or confetti. Post-session confetti already exists in `Memorisation.vue` and should stay off the return loop.

### 3.4 Features that are built and hard to find

| Feature | Where it lives | Exposure |
| --- | --- | --- |
| Progressive hiding | Setup control `blur_mode`, copy “Gradually hide the text”; runtime in `qpcMadaniTechniques.js` | Buried in the setup sheet. Mutually exclusive with focus mode. SEO and tutorial video `progressive-hiding` describe it; the first sitting does not. |
| AI Recite | Workspace dock, post-session check, `POST /api/memorisation/assessments` | Dashboard emphasises past results (`#ai-recite-results`), not “check this page”. |
| Saved sessions | Memorisation tab `saved`, `MemorisationSyncState`, plus unfinished `user_sessions` counted by `DashboardService::countSavedSessions` | Two stores. The dashboard links `?panel=saved` but the continue card is the only prominent resume. |
| Recommendations | `GET /api/recommendations/next`, practice plans, post-session CTAs | Server plan flow off by default. |
| Guest sample | `GET /memorisation/demo` auto-plays a sample | Not on the homepage. |
| Hifz plan | `HifzPlanCreatorModal`, `hifz_plans` | Inside the workspace, not the return dashboard. |
| Workspace tour | Eight steps, still callable from the menu (`openOnboardingFromTopMenu`) | `shouldAutoStartWorkspaceTour()` returns false. The broken bootstrap still seeds onboarding config. |
| Teacher loop | Assignments, attendance, messages, recitation evidence | Flag off. Learner group-request helpers in `learning.js` have no Vue caller. `TeacherDashboardService::studentGroups()` is unused. |
| Articles share | `ArticleShare.vue` (WhatsApp, native share, copy) | Shares the URL only. No referrer token. |
| PWA | `public/sw.js`, `manifest.webmanifest`, install UI on `/login` and `/register` | Install is taught at auth, not after a successful sitting. The worker caches icons, not the app, and does not intercept API calls. No push. |

### 3.5 Referrals and partnerships that are missing

Present and worth keeping:

- Waiting-list attribution (`WaitingListAttribution`, columns `attribution`, `first_source`, `last_source`, `last_campaign`).
- Tab-scoped registration UTMs on GA4 events.
- Article share.
- Organisations and groups for a real halaqah, including consent before a teacher sees analytics (`group_memberships`).

Absent:

- No referral code, invite token, or partner id on `users`.
- No shareable group or teacher invite URL. A student joins only by picking an organisation name at registration (directory auto-enrol for three seeded names) or, when the flag is on, by requesting a group the UI never lists.
- Article and testimonial “share” do not attribute a later signup. The testimonial control submits a quote; it does not share a link.
- No partner landing distinct from SEO tool UTMs (`utm_source=seo_tool` on planner, progress, quiz, and find-ayah pages).

A partnership loop should be a link that uses the existing organisation and membership APIs, with the learner’s consent step kept. It should not be a new social product.

### 3.6 Duplicated or conflicting journeys

| Conflict | Evidence | Direction |
| --- | --- | --- |
| First session vs hidden onboarding | Methods return false; bootstrap treats them as true and overwrites the range | One path: start the ten-minute sitting. Leave the tour in the menu. |
| `/dashboard` and `/progress` | Both call `DashboardController::index` | One canonical URL. Redirect the other. |
| Named saved sessions vs `user_sessions` | Client sync blob and lifecycle rows are both “saved” | Resume from `user_sessions`. Keep named bookmarks as bookmarks. |
| Recommendation surfaces | Engine, post-session CTAs, dashboard `continue`, `retention.todays_focus` | One “next” on the dashboard, fed by data already returned. |
| Waiting list vs register | Public GET redirects home; POST, Vue, admin, and launch mail remain | Register is the public action. Keep the table, unsubscribe, and admin for people already on the list. |
| `routes/web/marketing.php` | Not loaded by `bootstrap/app.php` | Leave the file until a deploy check confirms no host includes it. Do not maintain a second homepage there. |
| SEO tools vs the app | `/tools/quran-memorization-planner`, progress calculator, quiz, find-ayah (`SeoLaunchPages.php`) | Keep as acquisition pages. Do not rebuild them inside the app. |
| About | Live `/about` renders `content.about-us` (`<about-us-page>`). `/about-us` 301s there. `AboutUsController` still returns `about.blade.php`, which mounts the older `<about>` component, and no web route calls that controller. | Keep the live About Us page. Retire the unused controller view only after confirming nothing else renders it. |
| Analytics names | Doc, `PRODUCT_EVENTS`, Ackee, and Meta each use their own session-start name | One GA4 pair, documented to match the calls. |

## 4. Implementation inventory

Ordered for activation and return. Each item is modular. None of them replace Stripe, passwords, Google sign-in, or stored learner data.

### Reuse as-is

- Email registration, Google sign-in, verification flag, password reset, and `AuthRedirect`.
- Stripe checkout, portal, webhooks, and `stripe_webhook_events`.
- `user_sessions` lifecycle (`SessionLifecycleService`, pause, resume, complete, abandon) and `GET/POST /api/continue`.
- AI Recite assessment, consent, daily quota, and lifetime cap.
- Dashboard continue card and murajaah lists.
- `DashboardService` retention payload (show it; do not recompute it).
- `NextSessionRecommendationService` and `session_recommendations` when a next range is needed. Turn the existing flag on only after the first-session bug is fixed and the dashboard can show one next action.
- Hifz plans, ayah notes, mutashabihat, Madani mushaf, and progressive hiding runtime.
- Admin snapshot, Ackee, and the consent-gated Meta Pixel.
- Waiting-list storage, attribution columns, launch mail, and unsubscribe.
- Article share component.
- Teacher schema and APIs, still behind the existing flag.
- PWA manifest, service worker, and the current install instructions.
- SEO guides and feature pages as the public explanation of the product.

### Improve

1. **Fix the memorisation bootstrap booleans.** Call `requiresFirstTimeOnboarding()` and `shouldAutoOpenOnboarding()`. Then `intent=first` can consume the ten-minute intent, Welcome Back can show for returning logins, and a refresh can stop rewriting the range to Al-Fatiha 1–5. This is the activation fix. Add a test that a signed-in bootstrap with `mutqinStartFirstSession` sets `_pendingTenMinuteHeroStart` and does not call `applyFirstOnboardingSessionConfig`.
2. **Put `intent=first` on the login page’s create-account link**, and send login-page Google through the same intent storage as register when the person is new.
3. **Show `retention.todays_focus` on the dashboard**, with the unfinished session first and the open recommendation second. The API already chooses that order. Add the stored streak as a single quiet line. No badges.
4. **After the first completed session, offer AI Recite and gradual hiding as the next action** inside the existing post-session actions. Both already exist. Hiding stays optional and reversible.
5. **Point the public analytics doc at the events that are sent**, and either emit `session_started` / `session_completed` as aliases or stop listing them. Keep parameters free of ayah text, audio, and email.
6. **Offer the PWA install after a completed sitting**, reusing `pwa.js`. The prompt already exists on the auth pages.
7. **Link the homepage secondary action to `/memorisation/demo`** (the existing guest sample) or to register. `/features` can stay in the page, lower down.

### Consolidate

- Canonicalise `/progress` to `/dashboard` with a redirect.
- Treat unfinished `user_sessions` as the resume object. Keep the saved-sessions panel for named bookmarks only, and make the dashboard count use one definition.
- One learner-facing “next”: dashboard focus, fed by the continue row and, when the flag is on, `session_recommendations`. Retire duplicate copy that implies a second planner.
- Public acquisition copy: register. Keep waiting-list admin and mail for existing rows. Stop mounting `WaitingList.vue` on any public route (none serves it today).
- One GA4 session-start and session-complete pair, shared by Ackee event names where they already mirror the action.

### Build new

Only where the repository has no mechanism. Keep each behind the current design (light theme default, bronze accent, no score chasing).

| Gap | Smallest build | Uses |
| --- | --- | --- |
| Signup attribution | Persist the three UTMs already captured in `productEvents.js` onto the account at registration | New nullable columns or a side row. Do not overload `waiting_list_entries`. Do not store `fbclid` or the full referrer. |
| Learner share | After a completed sitting, share a link to `/register` with `utm_source=learner` and a campaign label. Reuse `articleShare.js`. | No reward, no public ayah score. |
| Halaqah invite | When teacher features are on, a signed group link that calls `POST /me/groups/{group}/request` and still requires consent plus teacher approval | Existing membership API. No parallel invite table until that link needs revocation. |
| Return prompt | A single in-app line on the next visit (“Continue Al-Fatiha”) using `retention.todays_focus`. Optional browser notification stays opt-in and local. | No new mailer until the in-app line is measured. |
| Activation report | Extend the admin snapshot with the five rates in §2.1 | Same tables. Read-only. |

Do not build a second quiz, planner, or progress calculator. The SEO tools and the in-app workspace already cover those jobs.

### Remove only if proven redundant

Nothing user-facing should be deleted in the first change.

| Candidate | Why it is not removed yet |
| --- | --- |
| Onboarding tour and sample-session code | The menu can still open the tour. Bootstrap currently *depends* on the onboarding branch because of the boolean bug. Delete only after that call is fixed and a test covers first-run and return. |
| `WaitingList.vue`, `POST /waiting-list`, launch mail | Existing entries, attribution, and admin export still use them. The public page is already redirected. |
| `routes/web/marketing.php` | Unused by `bootstrap/app.php`. Confirm no other host loads it before deletion. |
| `About.vue` and `AboutUsController` | The live route mounts `AboutUs.vue`. The controller still returns `resources/views/about.blade.php` (`<about>`), and `routes/web/app.php` does not call it. Remove that pair only after a route search stays empty. |
| Unsent `PRODUCT_EVENTS` names | Remove from the allow-list only when the doc and GA4 key events match the calls. |
| Post-session confetti | Leave it. Do not add more of it, and do not put it on the dashboard. |

## 5. Suggested order

1. Record the §2 snapshot from production.
2. Fix the bootstrap method calls and cover them with a test. This is activation.
3. Align the login and Google entry with `intent=first`.
4. Show today’s focus from the existing dashboard payload.
5. Reconcile analytics names so the next snapshot can be compared.
6. Only then: UTM persistence, a plain share link, and the admin activation rates.

Teacher invites wait until `MUTQIN_TEACHER_FEATURES_ENABLED` is deliberately on. Recommendation plans wait until the first sitting reliably starts and the dashboard has one next action.

## 6. Out of scope for that sequence

- New gamification, public leaderboards, or streak badges.
- Replacing Stripe, auth, or session history.
- A new memorisation mode, a second AI pipeline, or an offline mushaf.
- Rebuilding SEO calculators inside the logged-in app.
- Turning on teacher features or `SHOW_RECOMMENDATION_PLAN` as a side effect of a copy change.
