# Product events

First-party events live in `product_events`. The admin growth page is `/admin/growth` (`GET /api/admin/growth`, admin only). GA4 still receives the browser event names it already used. When `VITE_POSTHOG_KEY` is set, the same browser actions are also sent to PostHog EU under the names in [product-analytics.md](product-analytics.md). Ackee is unchanged.

Nothing before this table existed is backfilled. Registration, activation, daily activity, retention, and completed-session averages are calculated from `users` and `user_sessions`, which already existed. Feature use, abandonment, and referral opens come only from events stored after collection started.

## Privacy

Browser events are sent only when the existing measurement gate allows them: not when `mutqinMarketingConsent === false`, and not when the browser sends Global Privacy Control.

Server events are written when the account action itself succeeds. They are the same class of record as `user_sessions`: the fact that a sitting started or finished, not what was recited.

Never stored: microphone audio, transcripts, ayah text, names, emails, passwords, `fbclid`, or full referrer URLs. Campaign fields are `utm_source`, `utm_medium`, `utm_campaign`, and a short `ref` code. Properties are an allow-list: `session_type`, `learning_mode`, `method`, `surah_id`, `duration_seconds`, `session_id`, `recommendation_id`, `feedback_id`, `attempt_id`, `assessment_id`, `feature_id`, `video_id`, `stage`, `achievement_id`, `achievement_category`, `progress_percentage`, `unlock_source`.

`POST /api/product-events` accepts only the browser events below. Completion of signup, sessions, AI Recite, recommendations, referrals, and feedback is rejected from the browser and written on the server after the action succeeds. Repeating an idempotency key does not create a second row.

## Browser events

| Event | When it is recorded | Not recorded when |
| --- | --- | --- |
| `landing_page_viewed` | The homepage path `/` is shown, once per tab | A button is clicked |
| `signup_started` | `/register` is shown, once per tab | The homepage call-to-action is clicked |
| `onboarding_started` | First-time Step 1 (goal) or intent-driven Step 2 (passage) is shown. Also if the workspace tour is opened manually at step 0 | Bootstrap merely loads for a returning learner |
| `onboarding_step_viewed` | A first-time step is shown (`feature_id`: `goal` or `passage`) | The learner is not in the first-time path |
| `onboarding_step_completed` | A goal is chosen or Start begins practice (`feature_id`: `goal` or `passage`) | The panel is only opened |
| `onboarding_abandoned` | Setup is closed or Skip is used without completing practice (`feature_id` last step; `stage` `abandoned` or `discarded`) | Start succeeds |
| `onboarding_completed` | `markOnboardingCompleted()` runs for the first time (usually when the first real sitting starts from the first-time path) | The first-time gate is still required |
| `progressive_hiding_used` | A sitting has started with gradual hiding on, or hiding is turned on during that sitting. Once per sitting | The setup switch is toggled before a sitting starts |
| `ai_recite_started` | Microphone recording has started | The AI Recite button is pressed before recording begins |
| `referral_link_opened` | The page has `ref`, `utm_medium=referral`, or `utm_source=learner` | A normal visit |
| `referral_shared` | The learner shares their invite link (`feature_id`: `whatsapp` \| `copy` \| `native` \| `email`) | The referrals page is only opened |
| `tutorial_played` | A tutorial video starts playback | The carousel is only seen |
| `tutorial_completed` | Playback passes 90 percent, once per playback | A progress tick below that |
| `daily_mutqin_started` | Daily Mutqin starts a real sitting (`feature_id`: `daily-mutqin`) | The empty-state card is only shown |
| `daily_mutqin_step_viewed` | A guide step is shown (`feature_id`: `listen` \| `repeat` \| `hide` \| `recite` \| `finish`) | The guide is collapsed |
| `daily_mutqin_completed` | A Daily Mutqin sitting ends with the range complete (`feature_id`: `daily-mutqin`). Complements server `session_completed` | The sitting is abandoned early |
| `achievement_viewed` | The achievements drawer is opened on Progress | Once per tab via idempotency key |
| `achievement_progress_viewed` | Achievement progress is shown in that drawer | Once per tab via idempotency key |

`onboarding_complete` and `ai_recitation_started` remain the GA4 names. The server stores `onboarding_completed` and `ai_recite_started`.

## Server events

| Event | When it is recorded | Idempotency |
| --- | --- | --- |
| `signup_completed` | Email or Google account creation succeeds | `user:{id}:signup` |
| `referral_signup_completed` | That account stored a `ref` code | `user:{id}:referral-signup` |
| `referral_activated` | A referred account completes its first real sitting (range complete). Credited to the referrer | `referral:{id}:activated` |
| `session_started` | `SessionLifecycleService::start` creates or reasserts a real sitting | `session:{id}:started` |
| `revision_started` | That sitting is revision (`memorisation_mode` or metadata `sessionMode`) | `session:{id}:revision-started` |
| `progressive_hiding_used` | That sitting's metadata already has blur enabled | `session:{id}:blur` |
| `user_returned` | The new sitting is on a later calendar day than an earlier real sitting | `user:{id}:return:{date}` |
| `session_completed` | The sitting ends with the range completed | `session:{id}:completed` |
| `revision_completed` | That completed sitting is revision | `session:{id}:revision-completed` |
| `session_abandoned` | The sitting ends early or is abandoned. Pause is not abandonment | `session:{id}:abandoned` |
| `ai_recite_completed` | A scored assessment is stored. Failed or unusable audio is not a completion | `assessment:{id}:ai-recite` |
| `recommendation_followed` | `POST /api/recommendations/start` succeeds | `recommendation:{id}:followed` |
| `feedback_submitted` | `POST /api/feedback` stores a row | `feedback:{id}` |
| `achievement_unlocked` | A stable achievement id is earned from genuine history | `achievement:{userId}:{achievementId}` |

Achievement properties may include `achievement_id`, `achievement_category`, `progress_percentage`, and `unlock_source`. They never include ayah text, transcripts, or audio.

Signup also copies `utm_source`, `utm_medium`, `utm_campaign`, and `ref` onto `users.signup_utm_*` and `users.signup_referral_code` when the register request or the session captured them. Accounts created before those columns existed stay empty and are shown as unattributed, not as Direct. The anonymous id on the register form attaches earlier browser events from that tab to the new account. It is not an email or a name.

## Growth metrics

The admin page is `/admin/growth`. `GET /api/admin/growth?from=YYYY-MM-DD&to=YYYY-MM-DD` is limited to super admins (`access-admin`) and to 120 days. Dates are Europe/London calendar days. The response is cached on the server for 90 seconds. `refresh=1` rebuilds it.

Account totals come from non-deleted `users`, the same population as the Users dashboard total. Practice comes from non-example `user_sessions`. Feature use comes from `product_events`. PostHog is queried on the server only when `POSTHOG_PERSONAL_API_KEY` is set, and only to compare `registration_completed` events. It does not replace the registered-user count. Missing PostHog data stays null. Nothing is backfilled.

The event names, human labels, and what is deliberately not collected are in [growth-event-dictionary.md](growth-event-dictionary.md).
