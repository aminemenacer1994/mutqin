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
- Future content prefixes (do **not** emit empty URLs): `/quran-memorization/*` remains reserved. `/features/*`, `/guides/*`, and `/tools/*` are live only for catalogued pages.

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
php artisan test --filter=MutqinDomainRoutingTest
node --experimental-vm-modules tests/js/seo-tools.test.mjs
npm run build
```

Vue navigation is still Laravel full-page loads plus islands (no vue-router). Memorisation / AI Recite / Mushaf routes are unchanged and noindex.

## Search Console / Bing (manual)

Full operating cadence, KPIs, and review template: [SEO monitoring](seo-monitoring.md). Do not guess rankings.

1. Verify both `https://mutqin.ai` and `https://app.mutqin.ai` (Domain property preferred; URL-prefix fallback).
2. Submit `https://mutqin.ai/sitemap.xml` in GSC and Bing Webmaster Tools.
3. Inspect home, waiting list, about, pricing, and launched `/features`, `/guides`, `/tools` URLs; confirm canonical and indexable.
4. Inspect `/login` and `/memorisation`; confirm noindex (do not request indexing).
5. Use URL Inspection after deploy; request indexing only for important public URLs that changed.
6. Bing: add the same sitemap; set canonical host to apex `mutqin.ai` (`www` already 301s).
