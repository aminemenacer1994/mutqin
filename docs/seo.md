# Technical SEO (Laravel + Vue islands + Mix)

Mutqin is **not** a Vite/Nuxt app. Production assets are **Laravel Mix** (`webpack.mix.cjs`, `npm run build`). Public pages are Laravel Blade documents that mount Vue islands (`<homepage>`, `<about-us-page>`, …). Authenticated product screens stay ordinary SPA-style islands on their own Laravel routes.

This is the crawlable HTML strategy: **server-printed metadata + in-document copy** on public routes. There is no Playwright/Nuxt prerender step, so Laravel Cloud stays `composer` + `npm run build` with Mix hashing.

## Hosts

| Host | Role | Indexable HTML |
|------|------|----------------|
| `https://mutqin.ai` | Marketing (home, waiting list, robots, sitemap) | Yes |
| `https://app.mutqin.ai` | Application (auth, workspace, remaining public pages) | Public marketing-style pages yes; product/auth no |

`www.*` 301s to the apex host. Trailing slashes 301 to the slash-free path. `/about-us` 301s to `/about`. `/home` 301s to `/`.

Canonical hosts:

- Home and waiting list → `https://mutqin.ai…`
- About, pricing, privacy, mission, support → `https://app.mutqin.ai…`

## Central catalog

All titles, descriptions, robots, canonicals, Open Graph, Twitter, hreflang placeholders, and JSON-LD graphs come from `App\Support\Seo\SeoCatalog` / `SeoDocument`.

- Blade: `resources/views/partials/seo-head.blade.php` (included once from `layouts.app`)
- Client sync (no duplicate tags): `resources/js/seo/useSeo.js` (`data-mutqin-seo`)
- Future content prefixes (do **not** emit empty URLs): `/quran-memorization/*` remains reserved. `/features/*`, `/guides/*`, and `/tools/*` are live only for catalogued pages. New long-form guides: [seo-content.md](seo-content.md). Internal linking: [seo-internal-linking.md](seo-internal-linking.md). SEO → signup GA4 events: [seo-analytics.md](seo-analytics.md).

Locale is cookie/query based today. `hreflang` is `x-default` + `en` on the canonical URL until prefixed locale routes exist.

## Crawlable body HTML

Each public view nests a `partials/seo-ssr-*` article inside the Vue custom element. Crawlers that read the first HTML see headings, copy, and `<a href>` links. After Vue mounts, that fallback is discarded (no default slot) so users do not see a second H1.

Do not generate thin pages for reserved prefixes.

## Indexable vs noindex

**Indexable (`index, follow`)**

- `/` (home)
- `/waiting-list`
- `/about` (canonical; `/about-us` redirects)
- `/pricing`
- `/privacy`
- `/our-mission`
- `/donate` (Help and support)
- `/features`, `/guides`, `/tools` hubs and their launched child pages (see `SeoLaunchPages`)
- File-based guides in `content/seo/articles/` when `published` + `indexable` (see [seo-content.md](seo-content.md))

**noindex (`noindex, follow`)** — HTML meta + `X-Robots-Tag`

- Auth: `/login`, `/register`, `/password/*`, `/email/*`, `/auth/*`
- Product: `/dashboard`, `/profile`, `/memorisation`, `/billing`, `/checkout`
- Admin / internal: `/admin/*`, `/internal/*`, `/health`, `/up`
- Assets/API: `/madani/*`, `/indopak/*`, `/audio/*`, `/api/*`
- Unknown HTML and error pages (`layouts.error`)

`/robots.txt` is served by `RobotsController` (there is **no** `public/robots.txt`, so Laravel Cloud cannot static-file the policy). `/sitemap.xml` lists only indexable URLs.

## Schema

Used only where it matches the page:

- `Organization`, `WebSite`, `SoftwareApplication` on home (and software again on pricing)
- `BreadcrumbList` when there is more than Home
- `Article` on launched guides
- No `aggregateRating` / review spam

Homepage title: **Quran Memorization App with AI | Mutqin**. Visible copy still uses the existing product voice; English hero description names Quran memorization, Hifz, and AI recitation.

## Core Web Vitals (public home)

- Hero copy and screenshots are **not** `data-reveal` (those start at `opacity: 0` and delayed LCP/CLS).
- Hero LCP image is preloaded from `home.blade.php`; shots have width/height, `decoding`, and lazy/eager split.
- Navbar logos declare width/height.
- Mix remains the bundler; do not add a second frontend toolchain for SEO.

## Verification

```bash
php artisan test --filter=SeoPagesTest
php artisan test --filter=SeoCatalogTest
php artisan test --filter=SeoVerifyCommandTest
php artisan test --filter=MutqinDomainRoutingTest
node --experimental-vm-modules tests/js/seo-tools.test.mjs
npm run build

# Catalog + local document checks (CI-safe)
php artisan mutqin:seo-verify

# Against production hosts (after deploy; needs network)
php artisan mutqin:seo-verify --live
```

Vue navigation is still Laravel full-page loads plus islands (no vue-router). Memorisation / AI Recite / Mushaf routes are unchanged and noindex.

There is **no** catch-all SPA fallback that returns 200 for unknown paths — unknown HTML uses the error layout with **noindex**. Public pages are real Laravel routes with Blade SSR inside Vue custom elements.

## Search Console / Bing verification tokens

Optional HTML meta tags (URL-prefix fallback when DNS Domain verification is not used):

| Env var | Meta tag |
|---------|----------|
| `SEO_GOOGLE_SITE_VERIFICATION` | `google-site-verification` |
| `SEO_BING_SITE_VERIFICATION` | `msvalidate.01` |

Leave both empty until you paste **real** tokens from GSC / Bing. Empty = no meta tag emitted. Prefer **Domain** property + DNS TXT when possible (covers apex, www, and subdomains).

## Search Console / Bing (manual)

Full operating cadence, KPIs, and review template: [SEO monitoring](seo-monitoring.md). Do not guess rankings.

### You must configure manually

1. **DNS / Domain property (preferred):** Add Domain property `mutqin.ai` in Google Search Console; add the TXT record at your DNS host. In Bing Webmaster Tools, import GSC or verify the same domain.
2. **URL-prefix fallback:** If DNS is delayed, add `https://mutqin.ai/` and `https://app.mutqin.ai/`, set `SEO_GOOGLE_SITE_VERIFICATION` / `SEO_BING_SITE_VERIFICATION` in **Laravel Cloud** (both marketing and app envs if you use meta tags on each host), redeploy / `config:cache`, then click verify.
3. Submit **`https://mutqin.ai/sitemap.xml`** in GSC and Bing (robots already advertises this URL).
4. Inspect home, waiting list, about, pricing, and sample `/features`, `/guides`, `/tools` URLs; confirm canonical + indexable.
5. Inspect `/login` and `/memorisation`; confirm noindex (do not request indexing).
6. Bing: preferred host / canonical = apex `mutqin.ai` (`www` already 301s via `RedirectWwwHost`).
7. **Laravel Cloud:** `APP_URL=https://app.mutqin.ai`, `MUTQIN_MARKETING_HOST=mutqin.ai`, `MUTQIN_APP_HOST=app.mutqin.ai`, HTTPS only; marketing app must serve `/` + `/waiting-list` + `/robots.txt` + `/sitemap.xml` (no static `public/robots.txt`).

### Engineering already provides

- Dynamic `/robots.txt` and `/sitemap.xml` (indexable catalog only)
- Canonicals, robots meta, `X-Robots-Tag`, OG/Twitter, JSON-LD
- www → apex 301; trailing-slash 301; `/about-us` → `/about`
- Prerendered titles, descriptions, and SSR body copy on public pages