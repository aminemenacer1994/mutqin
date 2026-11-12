# Growth event dictionary

The admin growth page reads three stores. They are not interchangeable.

| Question | Store | Not used for |
| --- | --- | --- |
| How many accounts exist, and how many were created in the selected dates | `users` | PostHog person counts |
| Who practised, finished, abandoned, or returned | `user_sessions` where `is_onboarding_example` is false | Page views, admin navigation |
| Which product features were used | `product_events` | Raw browser names on the dashboard |

Dates on the dashboard are Europe/London calendar days. Timestamps stay in UTC in the database. A missing number is left empty. It is not replaced with zero, and historical events are not invented.

## Account and practice metrics

| Metric | Calculation |
| --- | --- |
| Total registered users | Non-deleted `users`. Same count as the Users dashboard total. |
| New registrations | `users.created_at` inside the selected London dates. |
| Activated users | New accounts in that period with at least one real session started. |
| Active learners | Distinct non-deleted accounts who started or completed a real session in the period. |
| Session completion rate | Sessions with status `completed` divided by sessions whose `started_at` is in the period. No rate when none started. |
| Started / completed / abandoned | Sittings that started in each day or week. Abandoned includes `abandoned` and `ended_early`. |
| Day 1, 7, 30 retention | A real session starts on the London date that many days after signup. Signups that have not reached that date are excluded. The card says "Not enough historical data yet" when nobody is eligible. |
| Returned in the funnel | A real session on a later London day, within 7 days of signup. Accounts younger than 7 days are excluded. |

## Feature labels

The dashboard never shows the stored event name.

| Label | Counted event | Empty state |
| --- | --- | --- |
| Progressive Hiding | `progressive_hiding_used` | No data collected yet |
| AI Recite | `ai_recite_started` when any start exists, otherwise `ai_recite_completed` | No data collected yet |
| Daily Mutqin | `daily_mutqin_started` when any start exists, otherwise `daily_mutqin_completed` | No data collected yet |
| Personalised Revision | `recommendation_followed` | No data collected yet |
| Saved Sessions | Not stored in `product_events` | No data collected yet |
| Listen & Repeat | `daily_mutqin_step_viewed` with `feature_id` `listen` or `repeat` | No data collected yet |

Unique accounts and total uses are separate. A start and a completion for the same feature are not both added when the start event exists.

## Sources

Each new account has one primary source, taken from `signup_utm_source`, `signup_utm_medium`, and `signup_referral_code`.

| Label | Stored value |
| --- | --- |
| Referrals | A referral code, `utm_medium=referral`, or source `referral`, `learner`, or `invite` |
| Direct | The stored source is explicitly direct or none |
| Organic search | Google, Bing, DuckDuckGo, Yahoo, Ecosia, `organic`, `search`, `seo`, or `seo_tool`, unless the medium is paid |
| Instagram, Facebook, LinkedIn, WhatsApp | That network's stored source |
| Other | Any other non-empty stored source, shown with its own label |
| Unattributed | Nothing was stored |

An empty source is not Direct and not WhatsApp.

## Identity, consent, and what is not sent

- PostHog `identify` uses the numeric account id. Logout calls `posthog.reset()`.
- The same browser events go to `product_events` only for the allow-list in `ProductEventName`. Signup, session completion, AI Recite completion, recommendations, referrals, and feedback are written on the server after the action succeeds.
- `session_completed` is written when the sitting ends with the range completed. Daily Mutqin completion is `daily_mutqin_completed` and is not a session start.
- Admin paths (`/admin` and `/admin/…`) do not emit the analytics page view.
- Measurement stays off when marketing consent is explicitly false or the browser sends Global Privacy Control. Session replay stays off until consent is explicitly true.
- The browser registers a coarse `environment` property: `production`, `local`, `testing`, or `other`. Events recorded before that property existed cannot be split.
- Not sent and not stored: Qur'an recordings, microphone audio, transcripts, ayah text, names, emails, passwords, private notes, card fields, `fbclid`, or full referrer URLs.

## PostHog reporting

`POSTHOG_KEY` is the public ingestion token. Reading analytics uses `POSTHOG_PERSONAL_API_KEY` on the server, with query read access for project `347076`, sent only to `https://eu.posthog.com/api/projects/347076/query/`. The growth page compares `registration_completed` counts with database registrations. A missing key, a project token in the personal-key variable, or a failed query leaves those counts null and shows an admin warning.
