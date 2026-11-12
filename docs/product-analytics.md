# Product analytics (GA4, Meta, PostHog, and first-party events)

The admin growth dashboard reads first-party `product_events` plus existing `users` and `user_sessions`. Event names, triggers, and what is not stored are in [product-events.md](product-events.md). GA4, Meta, and PostHog are optional browser sinks. They are not the source for the admin cohort numbers.

Mutqin measures acquisition, activation and retention with the existing GA4 tag (`partials/google-analytics.blade.php`) and, when `POSTHOG_KEY` is set, PostHog EU Cloud. There is no Firebase Analytics SDK and no Vue Router. SPA path changes (History API, including Madani page changes) send one extra GA4 `page_view` and one PostHog `$pageview` after the first full load. PostHog also records the first view. The GA tag's own `config` call already records that first GA view, so the app does not send it again.

Meta Pixel stays the existing snippet. It still loads only after `window.mutqinMarketingConsent === true` and only when Global Privacy Control is off. This repository does not contain a consent banner, so Pixel events stay off until a consent provider sets that flag. GA4 and PostHog product events keep the current measurement behaviour: events are sent unless the visitor has explicitly refused (`mutqinMarketingConsent === false`) or the browser sends Global Privacy Control. Session replay is stricter and stays off until that flag is explicitly `true`. Analytics failures never block registration, practice or assessment.

## PostHog EU

The browser SDK is initialised once in `resources/js/scripts/analytics/posthog.js`. Project `347076` uses EU Cloud. Laravel reads `POSTHOG_KEY` and passes it to the page as `window.mutqinPosthog` in a small inline script **immediately before** the deferred `app.js` tag so the key exists when the bundle boots. Ingestion is always `https://eu.i.posthog.com`.

Leave `POSTHOG_KEY` empty to keep the SDK unloaded. After changing analytics JavaScript, run `npm run build` and deploy the new `public/js` assets (including the `posthog.*.js` chunk). Key-only changes need only a PHP config reload (`php artisan config:clear` or a fresh `config:cache` with `POSTHOG_KEY` set).

Mutqin has no Vue Router. `$pageview` follows the existing History API hook, and PostHog's automatic pageview capture is off.

After sign-in, the person id is the numeric account id. Logout calls `posthog.reset()`. Names, emails, passwords, notes, card fields, microphone audio, and request bodies are not sent.

| Action | PostHog event |
| --- | --- |
| Registration | `registration_completed` |
| Onboarding | `onboarding_started`, `onboarding_completed`, `onboarding_skipped` |
| First practice | `first_practice_started` once per learner, `practice_day_active` once per UTC day |
| Sitting | `session_started`, `session_paused`, `session_resumed`, `session_completed`, `session_ended_early` |
| AI Recite | `ai_recite_started`, `ai_recite_completed` |
| Progressive Hiding | `progressive_hiding_used` |
| Reading aids | `translation_toggled`, `transliteration_toggled`, `tajweed_colours_toggled` |
| Practice setup | `audio_repetition_used`, `mushaf_layout_changed`, `revision_recommendation_accepted`, `saved_session_resumed`, `mr_mutqin_used` |

`session_type` is `new`, `revision`, `sample`, or `planner`. First-touch `utm_source`, `utm_medium`, and `utm_campaign` stay on later events.

There is a server-side Query API for the admin growth page only. It uses `POSTHOG_PERSONAL_API_KEY` (a `phx_` personal key with query read access) and `POSTHOG_PROJECT_ID` (`347076`) against `POST https://eu.posthog.com/api/projects/347076/query/`. The project token in `POSTHOG_KEY` cannot read analytics and is never sent as that credential. The personal key is not passed to the browser, Webpack, or the growth JSON. If the key is missing or the query fails, the growth page says so and keeps the database metrics. PostHog person counts are not the registered-user total.

The browser events above can be explored in PostHog as well:

1. **Onboarding** — funnel `landing_page_viewed` → `signup_started` → `registration_completed` → `onboarding_started` → `onboarding_completed` → `first_practice_started`. Breakdown by `utm_source`.
2. **Retention** — retention insight on `practice_day_active` or `session_started`, returning on day 1, 7, and 30. Cohort is `registration_completed`.
3. **Features** — trends for `ai_recite_started`, `progressive_hiding_used`, `translation_toggled`, `transliteration_toggled`, `tajweed_colours_toggled`, `audio_repetition_used`, `mushaf_layout_changed`, `mr_mutqin_used`.
4. **Completion** — funnel `session_started` → `session_completed`, and a trend of `session_ended_early` and `session_paused`.
5. **Acquisition** — trends of `registration_completed` and `session_started` broken down by `utm_source`, `utm_medium`, and `utm_campaign`.

Web analytics uses `$pageview`. Session replay stays off until `window.mutqinMarketingConsent === true`. In project settings, discard client IP data.

Live events: `https://eu.posthog.com/project/347076/activity/explore`.

## Events the app sends

| Event | When | Safe parameters |
|-------|------|-----------------|
| `sign_up` | Account created (`mutqin_just_registered`), once per tab | `method` (`email` or `google`), first-touch `utm_source`, `utm_medium`, `utm_campaign` |
| `login` | Existing user signed in, once per login | `method` (`email`, `google` or `demo`) |
| `onboarding_complete` | First transition to completed onboarding | `session_type`, `learning_mode`, `surah_id` when known |
| `session_started` | Practice sitting actually started | `session_type`, `learning_mode`, `surah_id` |
| `session_completed` | Range finished | those, plus `duration_seconds` |
| `session_abandoned` | Early end, discard, or switch away from an unfinished sitting | those, plus `duration_seconds` |
| `revision_started` | A started sitting whose type is revision | same as `session_started` |
| `recitation_started` | Microphone recording actually started | `session_type`, `learning_mode`, `surah_id` |
| `ai_assessment_completed` | A usable assessment result was produced | those, plus `duration_seconds` |
| `page_view` | Pathname changed after the initial load | `page_path`, `page_location` (no query string) |

`session_type` is `new`, `revision`, `sample` or `planner`. `learning_mode` is `auto`, `manual`, `follow`, `beginner`, `advanced` or `planner`.

Not sent: audio, transcripts, ayah text, names, emails, passwords, `fbclid`, or full referrer URLs. First-touch UTM labels are kept in `sessionStorage` for the tab so they are still present on `/register` and onboarding. They are deleted if consent is refused.

Paused / save-for-later, cancelled confirms, mic denial, invalid audio and failed requests do not emit the matching event.

## GA4 Admin (cannot be done in code)

In **Admin → Data display → Events**, mark these as key events:

1. `sign_up`
2. `session_started`
3. `session_completed`

Until they are marked, GA4 can show active users and sessions while **Key events** stays at 0. Recommended events are not key events until someone marks them. New event names appear after the first production hit, which can take a few hours.

In **Admin → Data streams → Web → Enhanced measurement**, turn **off** “Page changes based on browser history events”. The app now sends that `page_view` itself. Leaving the toggle on counts each SPA navigation twice. Leave the normal page-view measurement on so the first full load is still counted.

Confirm the stream measurement ID matches `GOOGLE_ANALYTICS_ID`. The tag is omitted when analytics is disabled, the ID is not a `G-` ID, or the request is an embed.

## Meta Events Manager (cannot be done in code)

The Pixel id is `969768972218630`.

- Map the standard **CompleteRegistration** event to the registration campaign, and **Lead** to the waiting list. The app already sends those through the existing Pixel bridge.
- Session start and session complete are the existing custom events `MutqinMemorisationSessionStarted` and `MutqinMemorisationSessionCompleted`.
- Do not enable automatic advanced matching. The app does not pass name or email.
- None of these Pixel calls run until a consent provider sets `window.mutqinMarketingConsent = true` and dispatches `mutqin:marketing-consent`. Do not default that flag to true.
- Test Events needs access to the Meta business account. A browser blocker or a refused consent choice means Meta stays at zero even when GA4 recorded the action.
