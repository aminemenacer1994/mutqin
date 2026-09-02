# Frontend assets & deploy freshness (Laravel Mix)

Mutqin compiles the Vue app with **Laravel Mix** (not Vite). Production builds emit contenthashed lazy chunks plus a versioned `public/mix-manifest.json`. This document covers how to avoid blank screens / `ChunkLoadError` after releases.

## How assets are versioned

| Asset | Production URL shape | Cache policy |
| --- | --- | --- |
| Entry JS/CSS | `/js/app.js?id=<hash>`, `/css/app.css?id=<hash>` via `mix()` | `no-cache, must-revalidate` (file rewritten in place) |
| Lazy chunks | `/js/<name>.<contenthash8>.js` | `public, max-age=31536000, immutable` |
| `mix-manifest.json` | `/mix-manifest.json` | `no-cache, must-revalidate` |
| HTML documents | Blade via Laravel | `no-cache, no-store` (`PreventStaleHtmlCache`) |
| Service worker | `/sw.js` | `no-cache, must-revalidate` |

Production Mix config (`webpack.mix.cjs`):

- `chunkFilename: 'js/[name].[contenthash:8].js'`
- `mix.version()` writes query hashes into `public/mix-manifest.json`
- Prune keeps the **newest 2 generations** per chunk family so in-place deploys do not immediately delete files still referenced by open tabs

Blade must always load entries through Mix:

```blade
<link rel="stylesheet" href="{{ mix('css/app.css') }}">
<script src="{{ mix('js/app.js') }}" defer></script>
```

Never hard-code `/js/app.js` without the manifest query id in production HTML.

## Environment

| Variable | Purpose |
| --- | --- |
| `APP_URL` | Canonical HTTPS origin (`https://app.mutqin.ai` in production) |
| `ASSET_URL` | Optional CDN origin for `mix()` / `asset()`. Leave empty to serve from `APP_URL`. Must be HTTPS and publicly reachable |
| `MUTQIN_ASSET_BUILD` | Client stamp; when bumped, browsers clear Mutqin SW caches (no forced reload loop) |
| `SENTRY_RELEASE` / `MUTQIN_RELEASE` | Observability release label (prefer git SHA) |

After changing these: `php artisan config:clear && php artisan config:cache`.

## Deployment order (safe)

1. Build assets: `npm ci && npm run build` (creates new hashed chunks + updates `mix-manifest.json`).
2. Deploy code + `public/js`, `public/css`, `public/mix-manifest.json`, `public/sw.js` together.
3. Prefer atomic / release-directory deploys (Laravel Cloud, Envoyer-style): keep the **previous release directory** until the new release is the live symlink. Do **not** wipe `public/js` before the new HTML is live.
4. Run migrations / config cache as usual (`scripts/deploy/production-release.sh` for DB safety).
5. Optionally bump `MUTQIN_ASSET_BUILD` when you need clients to drop old SW cache names.

### In-place single directory deploys

If the host rewrites `public/` in place:

- Rely on the 2-generation chunk keep in `webpack.mix.cjs`.
- Never delete `public/js` before the new `mix-manifest.json` and Blade HTML are serving.
- Confirm HTML cache headers are not overridden by a CDN (HTML must revalidate).

## Service worker / PWA

- Mobile-only registration (`resources/js/pwa.js`).
- `public/sw.js` **never caches HTML documents** (network-only).
- Entry bundles + `mix-manifest.json` are network-only.
- Contenthashed chunks may be cache-first (immutable).
- Cache names are versioned (`mutqin-shell-v84`, …); activate deletes older Mutqin caches.
- On `MUTQIN_ASSET_BUILD` change, layout script unregisters SWs and deletes `mutqin-*` caches without forcing a navigation reload.

## Client recovery (`ChunkLoadError`)

`resources/js/utils/chunkLoadRecovery.js`:

1. Detects webpack / dynamic-import chunk failures.
2. Retries briefly (covers Mix watch races).
3. Clears Mutqin caches and performs **at most one** controlled reload per tab (`sessionStorage`).
4. If still failing → recoverable error UI (Retry / Return Home). No infinite refresh.

All lazy pages in `resources/js/app.js` use loading + error fallbacks.

## Verification checklist

Run after every production/staging frontend release:

- [ ] `test -f public/mix-manifest.json`
- [ ] Manifest maps `/js/app.js` and `/css/app.css` to `?id=` URLs
- [ ] Lazy files exist as `/js/<name>.<8-hex>.js` and match hashes referenced inside `public/js/app.js`
- [ ] View source of `/` shows `mix()` URLs with `?id=`, not bare `/js/app.js`
- [ ] `curl -I https://app.mutqin.ai/` → `Cache-Control` includes `no-cache` / `no-store`
- [ ] `curl -I` a hashed chunk → `max-age=31536000` + `immutable` (when Apache headers module is active)
- [ ] `curl -I /js/app.js` → `no-cache` / must-revalidate
- [ ] `curl -I /sw.js` → `no-cache`
- [ ] `APP_URL` / `ASSET_URL` are HTTPS and match the browser origin
- [ ] Open site, hard-refresh once, confirm no console `ChunkLoadError`
- [ ] Simulate stale tab: keep an old HTML tab, deploy, trigger a lazy route → **one** reload or error UI, **never** a blank infinite loop

### Local simulation

```bash
npm run build
# Serve the app, open /memorisation, note a hashed chunk URL from DevTools Network.
# Delete that chunk file from public/js/ (or rename), then trigger the lazy path again.
# Expect: brief “Updating Mutqin…”, one reload (or error card if already reloaded).
node --experimental-vm-modules tests/js/chunk-load-recovery.test.mjs
```

## Related

- Database release safety: [database-deploy-safety.md](./database-deploy-safety.md)
- Error tracking: [ERROR_TRACKING.md](./ERROR_TRACKING.md)
