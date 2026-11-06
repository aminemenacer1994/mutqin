# Product analytics (GA4 and Meta)

Mutqin measures acquisition, activation and retention with the existing GA4 tag (`partials/google-analytics.blade.php`). There is no Firebase Analytics SDK and no Vue Router. SPA path changes (History API, including Madani page changes) send one extra GA4 `page_view` after the first full load. The tag's own `config` call already records that first view.

Meta Pixel stays the existing snippet. It still loads only after `window.mutqinMarketingConsent === true` and only when Global Privacy Control is off. This repository does not contain a consent banner, so Pixel events stay off until a consent provider sets that flag. GA4 keeps its current behaviour: events are sent unless the visitor has explicitly refused (`mutqinMarketingConsent === false`) or the browser sends Global Privacy Control. Analytics failures never block registration, practice or assessment.

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
