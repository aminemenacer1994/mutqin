# Group A — Private preview and architectural foundation

**Status target:** Complete before Group B.

Read `MASTER_REQUIREMENTS.md` and `IMPLEMENTATION_PROGRESS.md`.

Implement Phases 01–03 only.

## Phase 01: Private preview environment

Create or verify the protected `/preview` route.

Only authenticated users with verified email on `MUTQIN_LANDING_PREVIEW_EMAILS` (default `menacer72@gmail.com`) may access it.

Implement:

- Server-side Laravel authorisation (`LandingPreviewAccess`, `landing.preview` middleware)
- Configurable exact email allowlist
- Login redirect for unauthenticated visitors; 404 for unauthorised authenticated visitors
- Protection of preview subroutes
- Private, no-store cache headers where appropriate
- `X-Robots-Tag: noindex` and `Disallow: /preview` in `robots.txt`
- Exclusion from public navigation and sitemap

Do not rely on frontend restrictions. Preserve the existing public homepage.

## Phase 02: Repository and functionality audit

Inspect Laravel architecture, public website, platforms, auth, subscriptions, AI recitation, and media.

Review business PDFs and reference screenshots.

Document findings in `docs/mutqin-2.0-audit.md` (and related ecosystem docs).

Do not rebuild functioning components unnecessarily.

## Phase 03: Implementation architecture

Prepare protected marketing routes (adapt names to conventions):

- `/preview`, `/preview/pricing` (required in A)
- `/preview/teachers`, `/preview/students`, `/preview/parents`, `/preview/learning`, `/preview/institutions`, `/preview/demo`, `/preview/resources` (scaffold in later groups)

Shared marketing design tokens remain in `Homepage.vue` / `Homepage.css`.

Preserve all existing application routes, accounts and data. Do not modify live billing.

## Acceptance criteria

- Only the authorised verified account can access preview HTML routes
- Public homepage unchanged
- Existing platforms remain functional
- Access-control tests pass
- `IMPLEMENTATION_PROGRESS.md` updated

## Out of scope

Replacing the public homepage, deploy, or production host changes without explicit approval.