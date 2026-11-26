# Preview demo sandbox (Groups F, J1, J2 and J3)

## Routes (allowlist + verified, or resumed owner session)

| Path | Purpose |
|------|---------|
| `/preview/demo` | Persona picker |
| `/preview/demo/memorisation` | Guest memorisation (`demo_mode`) |
| `GET /preview/demo/status` | JSON readiness |
| `POST /preview/demo/enter` | Start persona (rate limited) |
| `GET /preview/demo/capabilities` | JSON capability audit (live / partial / simulated) |
| `POST /preview/demo/entitlement` | Session-only tier overlay (`free`, `premium`, `pro`) |
| `POST /preview/demo/reset` | Confirmed reset (quotas; optional catalogue restore) |
| `POST /preview/demo/exit` | End session; restore preview owner. Optional `destination`: `hub` (default), `landing`, `pricing` |

`MUTQIN_PREVIEW_SANDBOX_PUBLIC=false` keeps the hub closed to guests until marketing enables open demos.

## Sandbox sessions (J1)

Each enter creates or resumes a row in `preview_sandbox_sessions`:

- Tied to the verified preview **owner** (`mutqin_landing_preview_owner_id` in session)
- Synthetic logins never gain preview allowlist permissions
- Teacher, student and parent platform personas share `classroom_key=platform_demo`
- Guest memorisation uses `personal_learning` without classroom membership
- Expired rows are removed hourly via `mutqin:preview-sandbox-cleanup`

## Catalogues

| Persona | Source | Marker |
|---------|--------|--------|
| Org halaqa teacher/student | `OrganisationNetworkCatalog` | `cus_mutqin_org_network_*` |
| Platform teacher/student/parent | `PlatformDemoCatalog` | `cus_mutqin_platform_demo_*` |
| Guest memorisation | `memorisation.demo` route | Session only |

`ParentDemoCatalog` remains **excluded** (child fixture used a real mailbox).

## Seed locally

```bash
php artisan mutqin:seed-organisation-network
php artisan mutqin:seed-platform-demo
```

Passwords: `OrganisationDemo1!` (org network), see `PlatformDemoSeeder` output for platform demo.

## Security (J1)

| Control | Implementation |
|---------|----------------|
| Preview gate | `landing.preview` + `LandingPreviewAccess::allowedForRequest` |
| Synthetic login | `EnsureActivePreviewSandbox` + DB session row |
| Mail / checkout | `MessageSending` cancel + `BlockPreviewSandboxSideEffects` |
| AI quota | `PreviewSandboxService::consumeAiAssessmentQuota` (configurable) |

## Simulated vs live

See `previewDemo.simulated` / `previewDemo.live` in `en.json`, the capabilities endpoint, and the notes block on `/preview/demo`.

## Group J3 — Functional demonstrations

- **Experiences:** teacher / student / parent / personal entry (`LandingPreviewDemo::experiences()`).
- **Toolbar:** Switch persona (same classroom), guided walkthrough coach, tier preview, reset with confirm.
- **Reset:** `confirm=1` required. Pass `restore_catalog=1` to re-run `mutqin:seed-platform-demo` or `mutqin:seed-organisation-network` for the bound catalogue only.
- **Entitlements:** Overlay is session-only; never writes to the preview owner’s subscription columns.

## Group J4 — Guided tours and recordings

- Launch **Guided experience** on `/preview/demo`, or choose **Full classroom loop** (`connected`) for the cross-role tour.
- Interactive overlay: spotlight, progress, skip / pause / back; advances on real clicks and role switches where detectable.
- Record marketing clips locally:

```bash
npm run preview-sandbox:rehearse   # headless dry run
npm run preview-sandbox:record     # writes public/preview-sandbox-recordings/*/*.webm (+ .mp4 when ffmpeg is available)
```

Requires allowlisted login (`MUTQIN_PREVIEW_EMAIL`, `MUTQIN_PREVIEW_PASSWORD`) and seeded demo data.