# Homepage flip runbook (manual only)

**Do not run without explicit product-owner approval.** Group H does not deploy or repoint DNS.

## Preconditions

- [ ] `IMPLEMENTATION_PROGRESS.md` Group H QA signed off (no open blockers).
- [ ] Stakeholder records approval date and name in `IMPLEMENTATION_PROGRESS.md` (section **Homepage cutover approval**).
- [ ] Full regression on staging: preview suite + teacher/parent/auth smoke tests (commands in Group H results).
- [ ] SEO review: sitemap, canonicals, and marketing host behaviour unchanged except the deliberate homepage swap.

## What stays the same today

| URL | View / component | Notes |
|-----|------------------|--------|
| `GET /` | `resources/views/home.blade.php` | `Homepage.vue` without `landing-preview` |
| `GET /pricing` | `resources/views/content/pricing.blade.php` | Public marketing pricing |
| `GET /preview/*` | `resources/views/preview/*` | Allowlisted accounts only; `noindex` |

## Option A — Promote preview copy on `/` (keep two URLs)

1. **Backup** current `home.blade.php` and any public-only `homepage.*` strings you may retire.
2. Change `resources/views/home.blade.php` to pass preview mode, mirroring `preview/home.blade.php`:
   - Set `window.mutqinLandingPreview = true` in `@push('head')` if ecosystem sections depend on it.
   - Use `<homepage v-bind:landing-preview="true">` **or** move shared SSR partial to one blade.
3. **Do not** remove `landing.preview` middleware from `/preview`; keep the private reviewer environment until you intentionally sunset it.
4. Reconcile **public** pricing copy separately if homepage links still point to `/features` vs `/preview/pricing` — public `/pricing` is unchanged unless a second approved change is made.
5. Run:
   ```bash
   php artisan test tests/Feature/SeoPagesTest.php tests/Feature/LandingPreviewAccessTest.php
   node --test tests/js/landing-preview-homepage.test.mjs
   ```
6. Manually verify `/` is `index, follow` and `/preview` remains `noindex`.
7. Deploy through your normal release process (not automated from this repo).

## Option B — Redirect `/` to `/preview` (not recommended)

Would expose a login-gated URL as the public homepage. **Avoid** unless the product intentionally becomes private-first.

## Option C — Dual marketing (status quo)

No code change. Reviewers use `/preview`; the public site keeps the phone-hero homepage.

## Rollback

1. Restore backed-up `home.blade.php` (and any `en.json` keys if edited).
2. Redeploy.
3. Confirm `GET /` returns `X-Robots-Tag: index, follow` and sitemap still lists `/`.

## Configuration reminders

- Allowlist: `MUTQIN_LANDING_PREVIEW_EMAILS` in `.env` / `config/mutqin.php`.
- `robots.txt`: `Disallow: /preview` via `App\Support\Seo\SeoCatalog::robotsTxt()`.
- Billing: no Stripe or `config/billing.php` edits are required for a homepage copy flip.