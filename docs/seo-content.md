# SEO content system (file-based guides)

Lightweight articles for Mutqin **without** a database or admin CMS. Extends the existing `SeoLaunchPages` + Blade + Vue island pattern.

Related: [Technical SEO](seo.md), [Keyword map](seo-keyword-map.md), [Monitoring](seo-monitoring.md).

## How it fits

| Piece | Role |
|-------|------|
| Launch guides/features/tools | Still defined in `App\Support\Seo\SeoLaunchPages` |
| New long-form guides | PHP files in `content/seo/articles/*.php` |
| `/guides` index | `SeoGuideIndex` merges launch guides + file articles, with `?category=` |
| Routes | Auto-registered from `SeoArticles::paths()` |
| Sitemap / robots / JSON-LD | `SeoCatalog` merges `SeoArticles::catalogDefinitions()` |
| UI | Same `seo-launch-page` island + `info-pages` / `seo-pages` styles |

Do **not** invent a second `/quran-memorization/*` tree for the same articles. Canonical path is `/guides/{slug}` on `app.mutqin.ai`.

## Add a new article

1. Copy `content/seo/articles/_template.php` to `content/seo/articles/{slug}.php`  
   Example: `content/seo/articles/weak-ayahs-return.php`
2. Set `slug` to match the filename (letters, numbers, hyphens only).
3. Fill `title`, `description`, `h1`, `lede`, `sections`, `category`, dates, related feature/CTA.
4. Keep copy teacher-safe (no ijāzah claims, no invented stats). Check the [keyword map](seo-keyword-map.md) so you do not cannibalise an existing URL.
5. **Draft (default in template):** `published => false` — no route, not in sitemap.
6. **Publish for preview without SEO:** `published => true`, `indexable => false` — live URL, `noindex`, omitted from sitemap.
7. **Publish for search:** `published => true`, `indexable => true`.
8. Deploy. Routes and sitemap pick up the file automatically (no migration).

Slug **must not** collide with an existing launch guide (e.g. `quran-memorization-for-beginners`). The loader throws if it does.

## Edit an article

1. Open `content/seo/articles/{slug}.php`.
2. Change copy, `updated_at`, related links, or CTA.
3. Deploy. No cache clear is required in normal app boot (articles load from disk per request; PHP opcache may delay until reload).

## Unpublish

- Set `published => false` and deploy — public URL 404s.
- Or set `indexable => false` to keep the page for humans but drop sitemap + use `noindex`.

## Fields

| Field | Required | Notes |
|-------|----------|--------|
| `slug` | Yes | Becomes `/guides/{slug}` |
| `title` | Yes | `<title>` / OG title |
| `description` | Yes | Meta description |
| `h1` / `lede` | Yes | Visible hero |
| `author` | No | Default `Mutqin` |
| `published_at` / `updated_at` | Yes for publish | `YYYY-MM-DD` |
| `featured_image` | No | Site-root path; default hero image |
| `category` | Yes | `beginners`, `techniques`, `revision`, `planning`, `practice`, `mutashabihat` |
| `published` | Yes | Route visibility |
| `indexable` | Yes | Sitemap + `index, follow` |
| `sections` | Yes | `h2` + `paragraphs` (+ optional `subs`) |
| `related_slugs` | No | Other article slugs **or** launch guide path slugs |
| `related_feature` | No | Contextual CTA into a Mutqin feature/tool |
| `cta` / `cta_secondary` | No | Primary/secondary buttons |
| `links` | No | Footer-style related links |
| `canonical_path` | No | Override only if you know why |
| `sitemap_priority` | No | Default `0.7` |

## `/guides` index filters

- All: `/guides`
- Category: `/guides?category=revision` (etc.)
- SSR HTML lists filtered entries for crawlers; Vue shows the same chips/list.

Categories with zero entries are hidden from the chip row.

## Structured data

Published articles emit:

- `Article` with `headline`, `datePublished`, `dateModified`, `image`, `author`, `publisher`
- `BreadcrumbList` (Home → Guides → article)
- Organization when configured on the definition

## Tests

```bash
php artisan test --filter=SeoArticlesTest
php artisan test --filter=SeoPagesTest
```

## Checklist before publishing

- [ ] Unique intent vs keyword map (no duplicate of home/feature)
- [ ] Real product links only (features/tools that exist)
- [ ] `published` + `indexable` set intentionally
- [ ] Related feature CTA points at the right Mutqin surface
- [ ] After deploy: GSC URL Inspection once (see [seo-monitoring.md](seo-monitoring.md))
