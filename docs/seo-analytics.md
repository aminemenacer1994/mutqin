# SEO conversion analytics (GA4)

Mutqin measures SEO → signup funnels with the **existing Google Analytics 4** tag (`partials/google-analytics.blade.php`, `GOOGLE_ANALYTICS_ID`). No second marketing analytics platform.

Implementation: `resources/js/scripts/seoTools/track.js` (loaded via public Vue islands + `app.js` boot).

## Privacy rules

**Never** send to GA4 for marketing:

- Quran Arabic / ayah text / transcripts
- Microphone / audio payloads
- Emails, passwords, names
- Full referrer URLs (host only)

Allowed: path, page kind/id, tool id, CTA id, UTM fields, referrer **host**, booleans/numbers, short ASCII labels (≤80 chars, no Arabic).

## Session attribution (`sessionStorage`)

Key `mutqin_seo_attr` (plus `mutqin_seo_tool` for last public tool):

| Field | Meaning |
|-------|---------|
| `landing_path` | First path in the tab session |
| `page_path` | Current path when the event fired |
| `referrer_host` | `document.referrer` hostname (no query) |
| `utm_source` / `utm_medium` / `utm_campaign` | First-touch UTMs in the session |
| `traffic_source` | `organic` \| `referral` \| `direct` \| `campaign` \| `paid` \| … |
| `organic_likely` | Best-effort flag (see below) |
| `tool` | Last public SEO tool id |
| `guide_path` | Last guide/article path |
| `page_kind` / `page_id` | Last SEO page classification |

These parameters are merged into SEO conversion events so explorers can break down by landing page and campaign.

### Organic search

`organic_likely` / `traffic_source=organic` when:

- `utm_medium=organic`, or
- Referrer host looks like Google/Bing/DuckDuckGo/Yahoo/Yandex/Baidu/Ecosia **and** medium is not paid

Many SERPs omit referrer. Treat this as **supplementary**; use GA4’s own **Session source / medium** (`google / organic`) as the primary organic filter.

## Events

| Event | When | Notes |
|-------|------|--------|
| `seo_landing_view` | Home, SEO launch pages, waiting list | `page_kind`: home, hub, feature, guide, article, tool, waiting_list |
| `seo_guide_view` | Guide or file article | Also fires with landing view |
| `seo_tool_view` | Tool page open | Legacy-compatible |
| `seo_tool_start` | User runs planner/progress/quiz/find | |
| `seo_tool_complete` | Result produced | Quiz complete; planner/progress calculate; find matched/none |
| `seo_cta_click` | Primary/secondary/feature/home CTAs | `cta_id`, `dest`, `href_path` |
| `seo_waiting_list_click` | CTA whose href is `/waiting-list` | |
| `generate_lead` | Waiting-list join success | `method=waiting_list` |
| `seo_tool_signup` | Join or register after a tool touch | |
| `seo_registration_start` | `/register` viewed | |
| `seo_registration_complete` + `sign_up` | First page after `mutqin_just_registered` | `method` email\|google; once per tab |

Legacy widget events (`seo_tool_planner`, `seo_tool_progress`, `seo_tool_quiz_*`, `seo_tool_find_ayah`) still fire for existing reports.

## Answering the five questions (GA4)

Create explorations (or mark conversions) with `event_category` ≈ `seo_conversion` / `seo_tool` / `conversion`:

1. **Which SEO pages bring users?**  
   Free-form: `seo_landing_view` by `page_path` or `page_id`, optionally filtered `traffic_source=organic` or GA4 session source = google/organic.

2. **Which guides generate tool usage?**  
   Funnel or path: `seo_guide_view` → `seo_tool_start`, dimension `guide_path` on tool events (session-attributed).

3. **Which tools generate registrations?**  
   `seo_tool_start` / `seo_tool_complete` → `generate_lead` or `seo_registration_complete` / `seo_tool_signup`, break down by `tool`.

4. **Which landing pages have poor conversion?**  
   Rate: (`generate_lead` + `sign_up`) / `seo_landing_view` by `landing_path`. Low rate + high views = fix CTA/copy.

5. **Which CTAs perform best?**  
   `seo_cta_click` by `cta_id` / `dest`, then assisted conversions to `generate_lead` or `sign_up`.

## Ops

- Enable `GOOGLE_ANALYTICS_ID` (`G-…`) in Laravel Cloud; tag is omitted when disabled/invalid.
- After deploy: `npm run build` so `seo-launch` / `homepage` / `waiting-list` / `app` chunks pick up `track.js`.
- Mark `generate_lead` and `sign_up` as key events in GA4 Admin if not already.
- Do **not** send Quran content into custom dimensions “for richer reports”.
