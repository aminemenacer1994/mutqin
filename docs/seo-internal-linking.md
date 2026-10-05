# SEO internal linking report

Snapshot after the internal-linking pass (contextual prose links, related sections, homepage deep links).

## Inventory (indexable public SEO surfaces)

| Cluster | Paths |
|---------|--------|
| Marketing | `/`, `/waiting-list` |
| Company | `/about`, `/our-mission`, `/pricing`, `/privacy`, `/donate` |
| Features | `/features`, `/features/ai-recite`, `/features/mutashabihat`, `/features/mushaf`, `/features/hifz-plan`, `/features/quran-revision`, `/features/hifz-progress`, `/features/find-an-ayah` |
| Guides | `/guides`, five cornerstone guides, `/guides/practice-between-lessons` |
| Tools | `/tools`, planner, progress calculator, memorization test, find-an-ayah |

All launch SEO pages already had breadcrumbs. File articles keep `Home → Guides → …`.

## Links added in this pass

**Contextual prose** (`[anchor](/path)` → crawlable `<a>` in SSR + Vue):

- How to memorize → planner, Mushaf hiding, mutashabihat guide/feature, revision, public test, practice-between-lessons
- Beginners → planner, techniques, revision, practice article, public test, Hifz plan
- Revision guide → progress calculator, revision/progress features, plan/beginners, practice article
- Plan guide → planner, beginners, revision, Hifz plan feature
- Similar ayahs → Mutashābihāt feature, techniques, revision, Mushaf, AI Recite
- Feature ↔ tool pairs (plan/planner, progress/calculator, AI Recite/test, Find ayah voice/typed)
- Practice-between-lessons article → planner, test, Mushaf, techniques, revision

**Related blocks** (only where useful): Related guides / tools / features on cornerstone guides, matching features/tools, and the practice article.

**Hubs / home**

- Homepage SSR + footer: deep links to techniques, revision, planner, and key features/tools
- Guides hub footer: practice-between-lessons
- About: links to guides + tools hubs

## Remaining orphans / weak links

**No true orphans** among `/features/*`, `/guides/*`, or `/tools/*` — each has ≥2 inbound crawlable links from hubs, related pages, or homepage SSR.

| Page | Status | Notes |
|------|--------|--------|
| `/guides/practice-between-lessons` | Fixed (was weak) | Now linked from beginners, techniques, revision, plan guide, guides hub, and homepage cluster via guides hub |
| `/tools/find-an-ayah` | Adequate | Linked from Find-ayah feature, tools hub, quiz tool, homepage SSR; no dedicated “Find an ayah guide” yet (not required) |
| `/features/find-an-ayah` | Adequate | Hub + tool + related; fewer guide deep-links than AI Recite (intentional — utility feature) |
| `/donate` | Weak by design | Company support page; linked from About; not part of Hifz intent graph |
| `/our-mission` | Weak by design | Linked from About + homepage footer |
| `/privacy` | Supporting | Linked from AI Recite, Find ayah, tools; not a Hifz topic page |
| `/waiting-list` | Strong CTA | Many CTAs; not an educational orphan |
| `/quran-memorization/*` | Intentionally empty | Reserved prefix; no live hub yet ([keyword map](seo-keyword-map.md)) |

## Intentional non-links

- Noindex product screens (`/memorisation`, `/dashboard`) are not used as SEO internal targets.
- Tool vs feature vs guide URLs stay distinct; links explain the difference instead of collapsing intents.

## Maintenance

- Prefer 1–3 contextual prose links per long section, plus a short Related block — avoid stuffing the footer `links` list.
- New file articles: set `related_slugs`, optional `related_tools` / `related_features`, and at least one inbound link from a cornerstone guide or hub.
- Inline prose links use `[anchor text](/path)` (see `App\Support\Seo\SeoProse`).
