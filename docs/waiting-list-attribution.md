# Waiting-list attribution and Meta Pixel

## Deployment and consent integration

Deploy the migration before the application code that writes the new columns. It adds nullable columns and does not infer attribution for existing rows. The migration uses `MUTQIN_WAITING_LIST_DB_CONNECTION`, just like the waiting-list model; verify that this points to the actual registration database in each Laravel Cloud environment. If marketing and app deployments use separate migration repositories against the same waiting-list database, the migration checks for existing columns before adding them. Do not roll back one deployment while another uses the columns. Build the Mix assets as part of deployment.

**The repository does not contain a marketing-cookie consent interface. The Pixel and persistent attribution are off until one is connected.** The site's consent provider must set the following flag to the visitor's actual choice on every page load and whenever the choice changes:

```js
window.mutqinMarketingConsent = true; // only after valid affirmative marketing consent
window.dispatchEvent(new Event('mutqin:marketing-consent'));
```

For a refusal or withdrawal, set the flag to `false` and dispatch the same event. The application clears its waiting-list and legacy SEO attribution session storage and tells an already-loaded Pixel to revoke consent. Global Privacy Control also prevents Pixel use and storage. When consent is already known, set the flag before the shared Pixel partial runs, or dispatch the event when the provider restores the choice. Do not set it to true by default. There is deliberately no new consent banner or change to the signup form in this implementation.

Without marketing consent, the form can still submit campaign parameters and the referrer **hostname** present in the current page context, but it does not persist them in session storage or submit `fbclid`. Confirm the legal basis and privacy notice for this contextual collection before deployment in each jurisdiction. Ackee and Google Analytics retain their existing independent configuration; this integration does not implement consent for them.

The attribution session lasts for the current browser tab and is scoped to the current origin. It survives same-origin full page loads and SPA navigation, but does not bridge `mutqin.ai` and `app.mutqin.ai` as browser storage is origin-scoped. The marketing-host form sends the captured attribution in the existing signup request to the app host. A new tab, cleared storage, blocked JavaScript, stripped referrer, or cross-origin navigation can lose earlier touches. Values are visitor-supplied and may be missing, forged, or filtered; a referrer hostname is not proof of origin. The registered time is the existing server-side `created_at`. Reports use UTC calendar days, and old records with no data remain unknown.

Use explicit paid Meta campaign tags, for example `utm_source=facebook&utm_medium=paid_social&utm_campaign=launch`. Meta click IDs alone do not prove a paid ad; organic Facebook links can carry them too. Other UTM values and external referrer hostnames remain available in registration details. No full referrer path or query string is stored.

## Meta Events Manager

1. Select the existing Pixel/dataset `969768972218630` in Events Manager and configure the ad set to use its standard **Lead** event where appropriate. Inspect existing Event Setup Tool rules, tag managers, partner integrations, and Conversions API integrations for another Lead event on the same action; remove or coordinate duplicates. This change sends browser events only. If a future server integration sends the same event, it must use the same event name and event ID for Meta deduplication.
2. Review the Pixel's automatic advanced matching and automatic event settings in Events Manager. Disable any settings or other integrations that collect registration fields or create a second Lead. No name or email is passed by the application's Lead call, but Meta's script may collect page URL and browser metadata; do not put personal data in URLs or campaign parameters.
3. In **Test events**, open the deployed site through Meta's browser-testing flow. Grant marketing consent in the connected consent interface, start with a fresh test email, and visit a URL such as `/waiting-list?utm_source=facebook&utm_medium=paid_social&utm_campaign=qa_launch`. Confirm one PageView on the initial page and one per actual SPA path change, then submit the form and confirm one browser Lead with an event ID. The waiting-list admin details should show the campaign and Meta Ads source.
4. Refresh, submit the same email, and try a validation failure; none should produce another Lead. Repeat with consent declined and confirm the Pixel and attribution storage stay off. Test desktop and mobile, and remove test registrations through the admin interface afterwards. Meta's Test Events view requires access to the relevant Meta business account and cannot be verified from local unit tests.

Browser blockers, unavailable Meta scripts, lost responses, denied consent and network errors can prevent Meta from receiving a Lead even though registration succeeds. The server records each successful registration independently; exactly-once delivery to Meta is not guaranteed by a browser Pixel. Counts in Meta and the admin dashboard will therefore differ.
