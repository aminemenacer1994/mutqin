# Mutqin SEO monitoring

Phase 6: **evidence after deploy**, not scores or guessed rankings. This file is the operating manual. Related: [Technical SEO](seo.md), [Keyword map](seo-keyword-map.md), [Authority plan](seo-authority-plan.md).

Do **not** invent positions, CTR, or traffic. If Search Console (GSC) or Analytics has no data yet (new property, new URL, 48-hour delay, privacy thresholds), write **“insufficient data”** and wait. Never paste third-party “estimated rank” as Mutqin’s rank.

**Hosts**

| Host | Typical indexable HTML |
|------|------------------------|
| `https://mutqin.ai` | Home, waiting list, `robots.txt`, `sitemap.xml` |
| `https://app.mutqin.ai` | About, pricing, privacy, mission, donate, `/features/*`, `/guides/*`, `/tools/*` |

`www` 301s to the apex host. Canonicals are set in `SeoCatalog`. Product/auth routes are **noindex** — do not request indexing for them.

---

## Google Search Console — setup readiness

Manual owner work in the Google account that should own the properties. Engineering has already published sitemap, robots, canonicals, and `index`/`noindex`.

### 1. Domain verification (preferred)

1. In GSC, add a **Domain** property: `mutqin.ai` (covers apex, `www`, and typically `app` if it is a subdomain of the same domain — confirm in the property’s URL list after DNS verifies).
2. Verify with a **DNS TXT** record at the registrar (or DNS host). Keep the TXT record permanently.
3. If DNS is not available yet, use **URL-prefix** properties as a fallback:
   - `https://mutqin.ai/`
   - `https://app.mutqin.ai/`
   Verify with the HTML tag **or** (better) Google Analytics / Google Tag if the same Google account owns GA4 **and** the tag fires on that host. Mutqin injects gtag from `resources/views/partials/google-analytics.blade.php` when `services.google_analytics` is enabled and the ID matches `G-…`.
4. After a Domain property exists, you can still keep URL-prefix properties for host-specific filters, or use hostname filters inside Performance.

**Do not** add a second competing Domain property in another employee’s personal account without sharing. Use a shared Google group / company account.

### 2. Sitemap submission

1. Submit **`https://mutqin.ai/sitemap.xml`** (this is the URL `SeoCatalog::robotsTxt` advertises).
2. Confirm GSC shows the sitemap as **Success** and that discovered URLs match indexable routes (home, waiting list, app public pages). It will **not** list `/memorisation` or `/dashboard` if they are absent from the sitemap — that is correct.
3. Re-submit only after a **real** sitemap change (new `/tools` or `/guides` URLs), not on a weekly ritual.
4. If GSC reports “Couldn’t fetch”, check that `robots.txt` is Laravel-served (no static `public/robots.txt` overriding policy) and that the marketing host allows `/sitemap.xml`.

### 3. Indexing monitoring

Monthly (and after each SEO deploy):

- **Pages** report: indexed vs not indexed, reasons.
- **URL Inspection** on a sample of canonicals: home, `/waiting-list`, one feature, one guide, one tool, `/pricing`.
- Compare **sitemap URL count** vs **Indexed** count. A gap is normal (recrawl lag). A growing “Crawled — currently not indexed” or “Duplicate, Google chose different canonical” list needs a ticket.

Request indexing **only** for important **indexable** URLs after a meaningful content change. Do not bulk-request `/login`, `/memorisation`, or every query GSC ever showed.

### 4. Page indexing issues (what to do)

| GSC reason (typical) | Mutqin meaning | Action |
|----------------------|----------------|--------|
| Excluded by `noindex` | Auth/product/error as designed | No fix if the URL should stay private |
| Alternate with proper canonical | `www` or trailing slash → canonical | Confirm 301s still work ([seo.md](seo.md)) |
| Duplicate, Google chose different canonical | Host mix (`mutqin.ai` vs `app.mutqin.ai`) | Check `SeoCatalog` canonical_host; do not create a second copy of the page |
| Crawled — currently not indexed | Quality / recrawl, not a 500 | Improve uniqueness; wait; do not spam inspect |
| Discovered — currently not indexed | Budget / new URL | Ensure sitemap + internal links; request inspect once |
| Soft 404 / 404 | Wrong path or deleted launch page | Restore or 301 to the real canonical |
| Blocked by robots | Accidental `Disallow` | Fix `SeoCatalog::robotsTxt` — never `Disallow: /` the public site |
| Redirect error | Chain or host loop | Fix middleware (`RedirectWwwHost`, `RedirectTrailingSlash`, marketing policy) |

Export the Coverage/Pages table. Do not “fix” noindex on `/dashboard`.

### 5. Core Web Vitals

Use GSC **Experience → Core Web Vitals** (CrUX, **field** data, phone vs desktop, URL groups). That is the monitoring source of truth.

- **LCP / INP / CLS** “Poor” or “Needs improvement” on **indexable** URL groups → investigate real templates (home, tools, guides), not Lighthouse vanity scores.
- Known product choices: Mix (not Vite); crawlable SSR on public pages; hero LCP work is documented in [seo.md](seo.md).
- Lab tools (PageSpeed Insights, local Lighthouse) are **diagnostics**, not KPIs.
- Do not chase a 100 PSI score. Fix field regressions that affect real users on public URLs.

If CrUX says “not enough data”, record that. Do not substitute a single lab run as “our CWV”.

### 6. HTTPS

- GSC **HTTPS** / page experience: both hosts should be HTTPS with valid certs (Laravel Cloud / load balancer).
- Confirm no mixed-content console errors on public pages (canonical, OG image `https://mutqin.ai/images/landing/hero-center.jpg`).
- `www` → apex is 301. Do not serve indexable HTTP.

### 7. Search queries, impressions, clicks, CTR, average position

GSC **Performance** (Search results):

- Date range: default **28 days** for weekly glance; **16 months** when comparing months (GSC retention).
- Search type: **Web**.
- Dimensions: **Queries**, **Pages**, **Countries**, **Devices**.
- Metrics: **Clicks**, **Impressions**, **CTR**, **Average position**.
- Average position is an **impression-weighted average of the highest position shown**, not “we rank #N everywhere”. It is noisy at low impressions. Never report it to one decimal as a fake precision KPI when the query has 20 impressions.

**Filters you must use**

- **Branded:** query contains `mutqin` (and obvious typos if they appear: `mutken`, `mutqin.ai`).
- **Non-branded:** exclude those. Discovery work is judged on **non-branded** clicks and impressions.
- **Page:** hostname or path (`/tools/`, `/guides/`, `/`) so home does not hide tool queries.

Export CSV for the monthly review. Do not screenshot a 7-day spike and call it a trend.

---

## Bing Webmaster Tools

1. Sign in at Bing Webmaster Tools with a work account.
2. Add **`https://mutqin.ai`** and **`https://app.mutqin.ai`** (or import from GSC if Bing offers it — still confirm sitemaps).
3. Verify (DNS or Bing file/meta — prefer DNS aligned with GSC).
4. Submit **`https://mutqin.ai/sitemap.xml`**.
5. Set preferred domain / canonical host to apex **`mutqin.ai`** for the marketing site (`www` already 301s).
6. Monthly: crawl errors, index explorer vs sitemap, a sample of the same URLs as GSC.
7. Bing volume will usually be much smaller than Google. Do not treat Bing position as Google position.

Optional later: Yandex / DuckDuckGo have little Mutqin-specific tooling; do not build a process around them until they show material clicks in Analytics.

---

## What “organic conversion” means here

GSC has **no** conversion metric.

| Signal | Source | Honest use |
|--------|--------|------------|
| Organic clicks to a URL | GSC Performance → Pages | Demand and CTR |
| Sessions with `source = google` / `organic` | GA4 (when gtag is enabled) | Behaviour after the click |
| Waiting-list rows | Admin waiting list / DB | **Total** signups, not organic unless attributed |
| Public tool use | GA4 events `seo_tool_*` (`event_category: seo_tool`) | Engagement, not signup |
| Register / login | Product analytics if instrumented | Separate from waiting list |

**Today:** waiting-list join is a Laravel POST (`/join-waiting-list`) and does **not** emit a dedicated `generate_lead` gtag event. Until that exists, **do not report “organic waiting-list conversion rate” as a precise GA4 funnel**. Proxies:

- GSC clicks on `/waiting-list` and `/` vs admin waiting-list **count in the same calendar month** (correlation, not attribution).
- GA4: landing page + session source/medium `google / organic` + waiting-list page `form_submit` **if** you add an event later.

**Tool → signup:** treat as `seo_tool_*` (or landing `/tools/…`) **then** a later waiting-list or register event **in the same session** only if GA4 actually records both. If it does not, KPI = “organic landings on `/tools/*`” + “waiting-list totals”, labelled as incomplete attribution.

Never use Search Console to invent a conversion rate.

---

## Monthly analysis process

Run this on a **fixed day** (e.g. first Monday). Compare **this 28 days vs previous 28 days**, and vs the same 28 days last year when GSC has it. Note site changes (new tools, title edits) in the log.

### 1. Queries gaining impressions

- Performance → Queries, sort by **impressions**, then look at **largest impression delta**.
- Split branded vs non-branded.
- For each rising non-branded query: which **Page** got the impressions? Is that the URL in the [keyword map](seo-keyword-map.md)?
- **Action:** if the intended page is ranking, strengthen it. If a **wrong** page is getting the impressions, cannibalisation (below).

### 2. Rankings around positions 4–20

- Filter queries with **average position 4–20** and **enough impressions** (set a floor, e.g. ≥50 in 28 days — raise/lower when volume exists; if nothing qualifies, skip).
- These are “close” only **if** impression volume is real.
- **Action (optimisation rules):** improve **content, internal links, and relevant citations** on the **mapped** URL. Do not spawn a new URL for the same intent.

### 3. High impressions, low CTR

- Queries or pages with high impressions and CTR **well below** the page’s own history (or below similar Mutqin pages). Do not use a global “Google average CTR by position” as law.
- **Action:** rewrite **title and meta description** in `SeoCatalog` / `SeoLaunchPages` so the snippet matches intent (Hifz, teacher-safe, tool vs product). Check the actual SERP (sitelinks, other Mutqin results). Do not stuff keywords.

### 4. Keyword cannibalisation

- Same query, **two+ Mutqin URLs** with material impressions.
- Known intended splits (do **not** merge these):
  - `/` vs feature pages (home owns “Quran memorization app”).
  - `/features/hifz-plan` vs `/tools/quran-memorization-planner` vs `/guides/hifz-plan`.
  - `/features/ai-recite` vs `/tools/quran-memorization-test`.
  - `/features/find-an-ayah` vs `/tools/find-an-ayah`.
- **Action:** if two pages fight for **one** intent, pick a canonical in the keyword map, differentiate titles/H1s, and point internal links at the winner. If they are **intentionally split**, confirm titles still distinguish tool vs product vs guide.

### 5. Declining pages

- Pages with a clear drop in **clicks or impressions** vs the previous period, not a seasonal dip you cannot judge yet.
- Check: indexing, canonical, title change, CWV, outage, competitor — in that order.
- **Action:** revert accidental title harm; restore internal links; do not delete a page that still matches intent.

### 6. Indexing failures

- Pages report + URL Inspection sample (section above).
- Ticket anything new on **indexable** URLs.

### 7. Core Web Vitals

- GSC field groups for `/` and any `/tools` or `/guides` groups with data.
- **Action:** only if Poor/Needs improvement on real URL groups.

### 8. Backlinks

- GSC **Links** (top linking sites, top linked pages) — incomplete vs Ahrefs/Semrush if you subscribe; **do not guess** counts you did not export.
- Cross-check [authority tracker](seo-authority-plan.md): “Link obtained” URLs still live?
- **KPI:** referring domains / links **you verified**. Ignore “Domain Rating” as a goal.

### 9. Top landing pages

- GSC Pages by clicks; GA4 Landing page × `google / organic` if available.
- Expect early: `/`, `/waiting-list`, later `/tools/…` and `/guides/…`.
- **Action:** if a tool ranks but users bounce with no `seo_tool_*`, the widget or copy may be failing — product, not “more keywords”.

### 10. Conversions from organic search

- Use the attribution honesty table above.
- **Action if traffic without waiting-list movement:** clearer CTA on that landing page (already on launch pages). Do not add fake testimonials.

### New content rule

A query with impressions and **no dedicated page** → **evaluate** against the keyword map:

- Attach to an existing primary URL if intent matches.
- New URL only if unique intent, real copy, and no cannibalisation.
- **Do not create a page for every GSC query** (typos, one-word “quran”, navigational `mutqin login`, etc.).

---

## Optimisation rules (when you have data)

| Evidence | Do this | Do not |
|----------|---------|--------|
| High impressions + low CTR | Improve title/meta; match SERP intent; unique H1 already on page | Keyword stuffing; changing canonical host casually |
| Average position ~5–15 + real impressions | Deepen the **mapped** page; internal links from hub/home footer; relevant citations ([authority plan](seo-authority-plan.md)) | Ten new near-duplicate URLs |
| Two URLs, one query | Resolve cannibalisation or reaffirm intentional split | Ignore and publish a third URL |
| Organic landings, weak waiting-list/register | Stronger CTA, tool→workspace explanation, less vague copy | Fake reviews; crippling the free tool |
| Useful query, no fitting page | Brief: unique intent? then one real page | Mass GSC-query landers |
| Indexing exclusion on noindex product URL | None | Request indexing |
| CWV Poor on public group | Fix the template/assets | Chase Lighthouse 100 |
| Branded clicks down | Check outage, brand SERP, sitelinks | Panic-rewrite the homepage for “Quran app” |

Ship title/description changes through `SeoCatalog` / `SeoLaunchPages` so SSR and client `useSeo` stay one source of truth.

---

## SEO KPIs

Record **numbers from GSC/GA4/exports only**. Leave cells blank if the property is new.

**Branded vs non-branded:** always split clicks, impressions, and “ranking keywords”. Branded includes `mutqin`, `mutqin.ai`, and close misspellings that appear in GSC. Non-branded is everything else (Hifz, Quran memorization, tool queries).

| KPI | Source | Notes |
|-----|--------|--------|
| Organic clicks | GSC | Total + branded + non-branded |
| Organic impressions | GSC | Same split |
| Non-branded clicks | GSC filter | Primary **discovery** KPI |
| Ranking keywords | GSC queries with impressions > 0 | Count is not a vanity target; quality of queries matters |
| Top 3 / top 10 rankings | GSC average position **and** enough impressions | Position-only with 5 impressions is not a “top 3 keyword” |
| Indexed valuable pages | GSC Pages + sitemap | Count **indexable** catalog URLs that show Indexed — not `/login` |
| Organic waiting-list / registrations | GA4 if attributed; else proxy (see above) | Label methodology |
| Tool → signup | GA4 `seo_tool_*` then join/register | Incomplete until join is an event |
| Backlinks / referring domains | GSC Links + verified outreach log | Not purchased links |
| Core Web Vitals | GSC CrUX | % URL groups Good / NI / Poor, mobile vs desktop |

**Not KPIs:** Moz DA, “SEO score” extensions, Lighthouse performance, word count.

---

## Monthly SEO review template

Copy into a doc or spreadsheet. Fill only from exports.

```
# Mutqin SEO review — [Month YYYY]
Date: 
Properties: mutqin.ai / app.mutqin.ai (GSC) · Bing
Compared to: previous 28 days / previous year (if data)

## Data quality
- GSC delay / “insufficient data”: 
- Deploys this period (titles, new URLs, incidents): 

## Snapshot (paste numbers)
- Clicks total / branded / non-branded: 
- Impressions total / branded / non-branded: 
- CTR overall (do not over-interpret): 
- Indexed valuable pages (sitemap vs indexed): 
- CWV mobile/desktop (Good / NI / Poor): 
- Referring domains (source): 
- Waiting-list entries this month (admin): 
- GA4 organic sessions (if any): 
- seo_tool_* event counts (if any): 

## Queries
- Rising impressions (non-branded): 
- Position 4–20 with volume: 
- High impression / weak CTR: 
- Cannibalisation pairs: 

## Pages
- Top landings: 
- Decliners: 
- Indexing issues (indexable only): 

## Decisions (max 5)
1. 
Each: evidence → change (catalog/title/content/links) → URL → how we will know next month

## Do not do
- Pages not created this month (and why): 
- Indexing requests declined: 

## Next month owner
```

Keep a running **change log** (date, URL, title/meta/H1, why) so next month’s drop can be attributed.

---

## Cadence: weekly / monthly / quarterly

### Weekly (15–30 min)

- GSC **Overview**: unusual click/impression collapse (outage, indexing accident).
- **Pages** “Why pages aren’t indexed”: new **errors** on public URLs only.
- After a production SEO deploy: URL Inspection on the changed canonicals; sitemap status if URLs were added.
- Bing: glance at crawl errors if email alerts fire.
- Do **not** retune titles every week off noisy position.

### Monthly (the full process)

- Everything in **Monthly analysis process**.
- Fill the **review template**.
- Branded vs non-branded KPI row.
- Authority tracker stewardship ([seo-authority-plan.md](seo-authority-plan.md)) — dead links, overclaims.
- Keyword map: mark intents **Live** vs still empty; still no mass pages from GSC.
- Confirm `robots.txt` / sitemap still match the catalog after deploys.

### Quarterly

- 16-month GSC look: non-branded clicks trend, not one month.
- Indexable URL inventory vs `SeoLaunchPages` / `SeoCatalog` (orphans, thin pages, intentional noindex).
- CWV: mobile vs desktop, any new poor groups after feature weight (e.g. Find an ayah chunk).
- Cannibalisation review of tools vs features vs guides.
- Conversion instrumentation: still missing `generate_lead`? Decide whether to add it (product change, not this doc).
- Bing vs Google mix (if Bing ever matters).
- Refresh 90-day authority plan from **verified** links only.
- Search Console users: who has access; DNS TXT still present.

---

## Owner and tools

| Work | Tool |
|------|------|
| Queries, index, CWV, links (Google) | Google Search Console |
| Crawl/index (Bing) | Bing Webmaster Tools |
| Behaviour, events | GA4 via existing gtag (when enabled) |
| Waiting-list volume | Admin waiting list |
| Titles, canonicals, sitemap | `SeoCatalog`, `SeoLaunchPages`, deploy |
| Outreach links | Authority spreadsheet |

The goal is **continuous, evidence-based improvement**: change one thing you can measure next month. It is not chasing an arbitrary SEO score.
