# Mutqin 2.0 — Implementation progress

| Group | Scope | Status | Verified |
|-------|--------|--------|----------|
| A | `/preview` gate, copy overrides, robots, tests | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| B | Ecosystem + authentic teacher UI on `/preview` | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| C | `/preview/teachers`, `students`, `parents` | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| D | `/preview/learning`, `institutions` | **Complete** | Re-audited 26 Nov 2026 (PHPUnit + JS static + claim checks) |
| E | Pricing vs business PDFs | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| F | `/preview/demo` sandbox | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| G | Resources + responsive evidence | **Complete** | Static + optional Playwright (26 Nov 2026) |
| H | Launch QA gate | **Complete** | PHPUnit + JS static + regression smoke (26 Nov 2026) |
| J1 | Sandbox architecture and security | **Complete** | PHPUnit (26 Nov 2026) |
| J2 | Sandbox UI/UX and entry (`/preview/demo`) | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| J3 | Full functional sandbox experiences | **Complete** | PHPUnit + JS static (26 Nov 2026) |
| J4 | Sandbox guided tours, motion, Playwright recordings | **Complete** | JS static + recording scripts (26 Nov 2026) |
| J5 | Sandbox conversion, exit menu, final QA | **Complete** | PHPUnit + JS static; Playwright optional (26 Nov 2026) |
| I | Motion design and UI smoothness (`/preview` only) | **Complete** | JS static + preview regression (26 Nov 2026) |

## Documentation sync (26 Nov 2026)

- `MASTER_REQUIREMENTS.md` aligned with full user brief (Groups A–H, design, authenticity rules).
- `prompts/GROUP_A.md` through `GROUP_H.md` and `prompts/README.md` added.

## Group A — Results (26 Nov 2026)

### Audit (public site preserved)

- `/` still serves `resources/views/home.blade.php` → `Homepage.vue` without `landingPreview`.
- Existing indexable SEO metadata unchanged for `/`.
- Teacher, student, parent dashboards untouched.

### Implemented

| Area | Files |
|------|--------|
| Allowlist | `app/Support/LandingPreviewAccess.php`, `config/mutqin.php` |
| Middleware | `app/Http/Middleware/EnsureLandingPreviewAccess.php` |
| Routes | `GET /preview`, `GET /preview/pricing` |
| Views | `resources/views/preview/home.blade.php`, `preview/pricing.blade.php` |
| Copy | `homepage.preview.*`, `pricingPage.preview.*` |
| SEO | `Disallow: /preview`; preview HTML `noindex` |

### Tests

```bash
php artisan test tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-homepage.test.mjs
```

## Group B — Results (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Protected PNGs | `resources/marketing/preview-2.0/*.png` (from `reference/screenshots/`) |
| Asset delivery | `LandingPreviewAssets`, `LandingPreviewAssetController`, `GET /preview/assets/{asset}` |
| Preview UI | `Homepage.vue` — ecosystem list, classroom spotlights, preview hero browser frame |
| Styles | `Homepage.css` — `.preview-browser`, `.preview-ecosystem`, `.preview-classroom` |
| Copy | `en.json` — `homepage.preview.ecosystem.*`, `classroom.*`, hero pillars |

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-homepage.test.mjs
```

### How to review

1. Sign in as `menacer72@gmail.com` (verified).
2. Open `http://127.0.0.1:8000/preview`.
3. Confirm ecosystem section, four classroom spotlights, and hero teacher overview image load from `/preview/assets/overview.png`.
4. Confirm `/` still shows the original phone hero fan (no preview sections).

## Group C — Results (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Routes | `/preview/teachers`, `/preview/students`, `/preview/parents` |
| Views | `resources/views/preview/teachers.blade.php`, `students.blade.php`, `parents.blade.php` |
| UI | `PreviewAudiencePage.vue`, `PreviewAudiencePage.css` |
| Copy | `previewTeachers.*`, `previewStudents.*`, `previewParents.*` in `en.json` |
| Cross-links | Ecosystem role titles on `/preview` link to audience pages |

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-audience.test.mjs
node --test tests/js/landing-preview-homepage.test.mjs
```

## Group D — Results (26 Nov 2026, re-audit same day)

### Implemented

| Area | Files |
|------|--------|
| Routes | `/preview/learning`, `/preview/institutions` |
| Views | `resources/views/preview/learning.blade.php`, `institutions.blade.php` |
| UI | Extended `PreviewAudiencePage.vue` (`learning`, `institutions`, public + protected images) |
| Copy | `previewLearning.*`, `previewInstitutions.*`; Premium callout links to `/preview/pricing` |
| Cross-links | Ecosystem personal + institution rows on `/preview` |

### Re-audit (26 Nov 2026)

Cross-checked against `docs/mutqin-2.0-audit.md`, `config/billing.php`, `LandingPreviewAssets`, and organisation admin services.

| Check | Result |
|-------|--------|
| Memorisation + connect-on-one-account claims | Match learner workspace + `ConnectionOnboardingController` |
| AI recite daily allowance | Matches `billing.limits.*.ai_assessments_per_day` via `UserAiReciteUsageService` |
| Premium note (entitlement, not role) | Aligned; copy no longer implies saved history is premium-only |
| Institution staff invites + audit | Match `OrganisationInstitutionService` / invitation audit records |
| Cross-institution transfer | Explicitly marked unavailable in copy |
| Teacher feature gate | Institution footnote mentions teacher features must be enabled |
| Screenshots | Learning: `public/images/landing/2026-11-*`; institutions: protected `students` + `assignments` PNGs (Nov 2026 teacher captures) |
| Duplicate signup flows | None on audience pages |

### Fixes applied (re-audit)

- `previewLearning.premium.note` and AI capability copy aligned with billing limits (not marketing-only FAQ numbers).
- `previewInstitutions` staff + footnote tightened for configuration / teacher-feature gating.
- Added `tests/js/landing-preview-group-d.test.mjs`; extended audience + homepage JS static tests.
- Refreshed all `resources/marketing/preview-2.0/*.png` from Nov 2026 teacher session captures; manifest in `docs/mutqin-2.0/reference/screenshots/MANIFEST.md`.
- Institutions spotlight secondary → `assignments`; `/preview` classroom uses `overview-priorities` + `assignment-create`; teachers spotlight → `review-detail`.

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-audience.test.mjs
node --test tests/js/landing-preview-homepage.test.mjs
node --test tests/js/landing-preview-group-d.test.mjs
```

### Limitations

- Individual commercial claims reconciled on preview pricing (Group E); teacher/institution PDF tiers still not sold.
- Optional Playwright captures: run `landing-preview-responsive-audit.cjs` with preview credentials.
- Institution admin UI not shown; copy states staff invites and audit exist where enabled.

### Blockers / notes

- Phase 03 route scaffold for `/preview/teachers` etc. completed in Group C.

## Group E — Results (26 Nov 2026)

### Goal

Align `/preview/pricing` with `Mutqin_2.0_Business_Model.pdf` and live `config/billing.php` without changing Stripe products or public `/pricing`.

### Implemented

| Area | Files |
|------|--------|
| Preview copy | `pricingPage.preview.*` — disclaimer, teacher/institution honesty, PDF mismatch note |
| UI | `PricingPage.vue` — preview-only commercial notes block |
| Styles | `pricing-page.css` — `.pricing-preview-notes` |
| Tests | `LandingPreviewPricingAlignmentTest.php`, `landing-preview-pricing.test.mjs` |

### PDF → config reconciliation

Source: `docs/mutqin-2.0/reference/Mutqin_2.0_Business_Model.pdf` (proposals; PDF states prices are not confirmed live plans).

| Business model claim | Config / code | Status | Test evidence |
|----------------------|---------------|--------|---------------|
| Individual Free £0 | `billing.plans.free` | **Verified** | `LandingPreviewPricingAlignmentTest::test_billing_display_amounts_match_audited_config` |
| Individual Premium £2.99/mo | `premium_monthly` → 299 pence | **Verified** | Same + layout `mutqinBilling.premiumMonthly` |
| Individual Premium Plus £5.99/mo (proposed) | `premium_plus_monthly` → **£4.99** (499 pence) | **Mismatch (disclosed on preview)** | Preview `pdfMismatchNote`; no public copy change |
| Free: limited AI + saved sessions | `billing.limits.free.*` | **Verified** | `SubscriptionBillingTest`, `LandingPreviewPricingAlignmentTest::test_entitlement_limits_match_billing_config` |
| Premium: higher AI + tools | `billing.limits.premium.*`, `SubscriptionEntitlement` | **Verified** | `SubscriptionBillingTest` (FIND_AYAH, WORD_BY_WORD gates) |
| Premium Plus: unlimited AI / analytics | `User::hasProAccess()` → null daily limit | **Verified** | `SubscriptionBillingTest` (pro tier AI limit null) |
| Teacher Free £0 (class essentials) | No teacher plan keys; teacher features flag | **Verified (free)** | No teacher keys in `config/billing.plans`; preview `teacherNote` |
| Teacher Pro £7.99 | Not in Stripe config | **Not sold** | `test_no_teacher_or_institution_checkout_plans_in_config` |
| Institution from £24.99 | Not in Stripe config | **Not sold** | Same; org features code-only where enabled |
| Students/parents/class core free | Product architecture | **Verified** | `MASTER_REQUIREMENTS.md`, preview copy Groups B–D |
| Annual 25% / lifetime 50% discounts | `billing.php` math | **Verified** | `BillingCheckoutTest` (annual gate) |

### Fixes applied

- Preview pricing page states limits are config-driven and calls out PDF vs live price gaps (Premium Plus £5.99 proposal vs £4.99 config).
- Explicit notes that teacher Pro and institution licence checkout are not live.

### Not changed (per scope)

- Public `/pricing` route and `pricingPage.*` marketing strings (except shared `preview` namespace used only when `landingPreview`).
- Stripe price IDs, `expected_unit_amount`, or checkout flows.

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewAccessTest.php tests/Feature/LandingPreviewPricingAlignmentTest.php tests/Feature/SubscriptionBillingTest.php
node --test tests/js/landing-preview-pricing.test.mjs tests/js/landing-preview-homepage.test.mjs
```

### Limitations

- Business PDF teacher/institution tiers remain roadmap; institution pilots are commercial, not self-serve checkout.
- Regional pricing and sponsored accounts (PDF §04) not implemented.

## Group F — Results (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Hub | `GET /preview/demo` → `PreviewDemoPage.vue` |
| Personas | `LandingPreviewDemo`, `LandingPreviewDemoController` |
| Subroutes | `/preview/demo/memorisation`, `GET|POST` status/enter, `POST /preview/demo/exit` |
| Labelling | `partials/preview-demo-banner.blade.php` on teacher/student dashboards + guest memorisation |
| Docs | `docs/mutqin-2.0/PREVIEW_DEMO.md` |
| Entry | Preview home “Interactive demo sandbox” → `/preview/demo` |

### Simulated vs live

| Simulated | Live |
|-----------|------|
| Org/platform demo accounts (`@example.com`, `@mutqin.test` markers) | Vue apps, APIs, entitlements on real accounts |
| AI scores, assignment counts from seeders | Preview allowlist gate (`landing.preview`) |
| Guest memorisation (`demo_mode`) | Stripe/billing unchanged |

Parent demo excluded (`ParentDemoCatalog` links a real child mailbox).

### Capture evidence

Manual (allowlisted session): `/preview` → “Open demo hub” → enter **Organisation halaqa teacher** after `mutqin:seed-organisation-network` → banner visible on `/teacher` → **End demo** returns to login.

Automated: `LandingPreviewDemoTest`, `LandingPreviewAccessTest` (demo route).

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewDemoTest.php tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-demo.test.mjs tests/js/landing-preview-homepage.test.mjs
```

## Group G — Results (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Resources hub | `GET /preview/resources` → `PreviewResourcesPage.vue` |
| Downloads | `GET /preview/resources/files/{business-model\|business-plan}.pdf` (gated) |
| Responsive CSS | `Homepage.css` — `homepage--preview` clip, mobile preview nav/browser rules |
| Accessibility | `main#main-content` on audience, demo, resources pages; existing `focus-visible` on nav |
| Capture tooling | `tests/js/landing-preview-responsive-audit.cjs` → `reference/screenshots/preview-responsive/` |
| Entry | Preview home **Reviewer resources** button |

### Verification matrix

| Width | Theme | Method |
|-------|-------|--------|
| 390 | light/dark | Playwright audit (optional) |
| 768 | light/dark | Playwright audit (optional) |
| 1280 | light/dark | Playwright audit (optional) |
| 1440 | light/dark | Playwright audit (optional) |

Static: `landing-preview-responsive.test.mjs` asserts overflow-related CSS and landmarks (always run).

### Limitations

- Not a full WCAG 2.2 audit; contrast spot-check only via existing theme tokens.
- Playwright PNGs are not committed until the audit script is run locally with credentials.

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewResourcesTest.php tests/Feature/LandingPreviewAccessTest.php
node --test tests/js/landing-preview-resources.test.mjs tests/js/landing-preview-responsive.test.mjs
```

## Group H — Launch QA gate (26 Nov 2026)

### Checklist (see `prompts/GROUP_H.md`)

| Item | Result |
|------|--------|
| Groups A–G requirements | Met in-tree; deferred items documented per group (teacher/institution checkout, WCAG full audit, optional Playwright PNGs) |
| Public `/` and `/pricing` | Unchanged: `home` vs `preview/home`; `content.pricing` vs `preview/pricing` |
| SEO | `Disallow: /preview` in robots; preview HTML `noindex`; `/` remains `index, follow` |
| Business PDF alignment | Group E tests + `LandingPreviewPricingAlignmentTest` (re-run below) |
| Social proof | `TESTIMONIALS_SECTION_ENABLED = false`; placeholders `published: false`; no testimonial block on preview home |
| Product-owner homepage approval | **Not recorded** — required before any cutover (see runbook) |

### Visual / screenshot evidence

| Source | Path |
|--------|------|
| Teacher UI reference (Nov 2026) | `docs/mutqin-2.0/reference/screenshots/` (+ `MANIFEST.md`) |
| Marketing PNGs served on preview | `resources/marketing/preview-2.0/*.png` |
| Responsive audit output (optional, local) | `docs/mutqin-2.0/reference/screenshots/preview-responsive/` |
| Reviewer session uploads (26 Nov 2026) | Cursor attachment assets under project `assets/Screenshot_2026-11-26_*` |

Uploaded captures match preview storytelling: teacher overview, students list, review detail, assignments, learning-plan modal, parent/guardians tab, demo flows — consistent with protected assets, not synthetic UI mocks.

### Regression smoke (core app untouched by preview routes)

```bash
php artisan test \
  tests/Feature/LandingPreviewAccessTest.php \
  tests/Feature/LandingPreviewPricingAlignmentTest.php \
  tests/Feature/LandingPreviewDemoTest.php \
  tests/Feature/LandingPreviewResourcesTest.php \
  tests/Feature/SeoPagesTest.php \
  tests/Feature/SubscriptionBillingTest.php \
  tests/Feature/AuthPageRenderTest.php \
  tests/Feature/ParentPlatformTest.php \
  tests/Feature/TeacherDashboardTest.php

node --test \
  tests/js/landing-preview-homepage.test.mjs \
  tests/js/landing-preview-audience.test.mjs \
  tests/js/landing-preview-group-d.test.mjs \
  tests/js/landing-preview-pricing.test.mjs \
  tests/js/landing-preview-demo.test.mjs \
  tests/js/landing-preview-resources.test.mjs \
  tests/js/landing-preview-responsive.test.mjs
```

**Result (26 Nov 2026):** all commands above passed in local CI-style run (PHPUnit ~28 preview-focused + 71 regression assertions batches; JS 7/7).

### Known limitations (unchanged from A–G)

- Teacher Pro / institution licence not in Stripe; disclosed on `/preview/pricing`.
- Premium Plus PDF price (£5.99) vs config (£4.99) disclosed on preview only.
- Full WCAG audit and committed responsive PNGs remain optional.
- Parent demo persona excluded by design (`LandingPreviewDemoTest`).

### Blockers

- **Homepage cutover:** awaiting signed product-owner approval (checklist item in `GROUP_H.md`).
- **No auto-deploy:** flipping `/` requires manual steps in `HOMEPAGE_FLIP_RUNBOOK.md`.

### Homepage cutover approval

| Field | Value |
|-------|--------|
| Approved by | _Pending_ |
| Date | — |
| Notes | Public marketing routes remain canonical until this row is filled. |

## Group J1 — Sandbox architecture and security (26 Nov 2026)

### Audit (pre-change)

| Area | Finding |
|------|---------|
| Group F hub | Persona enter logged into synthetic users but dropped preview owner allowlist |
| Parent persona | Missing from hub; only teacher/student org + platform teacher |
| Session isolation | Browser session flag only; no server row or cross-visitor boundary |
| Side effects | Billing and mail not globally gated during demo impersonation |

### Implemented

| Area | Files |
|------|--------|
| Persistence | `preview_sandbox_sessions` migration, `PreviewSandboxSession` model |
| Session service | `PreviewSandbox`, `PreviewSandboxService` |
| Middleware | `EnsureActivePreviewSandbox`, `BlockPreviewSandboxSideEffects`; `LandingPreviewAccess::allowedForRequest` |
| Controller | `LandingPreviewDemoController` — owner binding, exit restore, `POST /preview/demo/reset` |
| Personas | `platform_classroom_student`, `platform_classroom_parent` (shared `platform_demo` classroom) |
| Config | `mutqin.preview_sandbox.*` (public access default **false**) |
| Mail guard | `MessageSending` listener when `suppress_outbound_mail` |
| Cleanup | `mutqin:preview-sandbox-cleanup` (hourly schedule) |
| Docs | `prompts/GROUP_J1.md`, `PREVIEW_DEMO.md` |

### Security checks (PHPUnit)

| Test | Evidence |
|------|----------|
| Hub while impersonating | `LandingPreviewSandboxTest::test_preview_hub_accessible_while_impersonating_demo_via_owner_session` |
| Owner restored on exit | `test_demo_exit_restores_preview_owner` |
| Synthetic login without row | `test_synthetic_user_without_sandbox_session_is_rejected` |
| Cross-owner session | `test_cross_owner_sandbox_session_is_rejected` |
| Classroom binding | `test_classroom_persona_mismatch_returns_forbidden` |
| Billing blocked | `test_billing_checkout_blocked_during_sandbox` |
| TTL cleanup | `test_cleanup_command_removes_expired_rows` |

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewSandboxTest.php tests/Feature/LandingPreviewDemoTest.php tests/Feature/LandingPreviewAccessTest.php
```

### Limitations

- Shared seeded classrooms (not per-visitor DB clones); isolation is session authorisation + owner binding.
- Public no-registration demos prepared via `MUTQIN_PREVIEW_SANDBOX_PUBLIC` but intentionally off.
- Full queue/storage boundary tests deferred; mail and checkout guards are in place.

## Group J2 — Sandbox UI/UX and entry experience (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Entry hub | `PreviewDemoPage.vue`, `PreviewDemoPage.css` — Notion-style picker, live screenshots, explore vs guided launch |
| Experiences | `LandingPreviewDemo::experiences()`, `resolveExperiencePersonaId()` — Teacher, Student, Parent, Personal learning |
| Toolbar | `PreviewSandboxToolbar.vue`, `partials/preview-demo-banner.blade.php` — fixed bottom bar on teacher, student, parent, guest memorisation |
| API | `LandingPreviewDemoController` — `experience` enter, `switch`, `guided`, `walkthrough/restart`; status returns `experiences` |
| Copy | `en.json` — `previewDemo.hero`, `experiences.*`, `launch.*`, `toolbar.*` |
| Routes | `preview.demo.switch`, `guided`, `walkthrough.restart` |

### UX

- Headline **Try Mutqin for yourself** with role list and authentic PNG/JPG previews (`/preview/assets/*`, landing session shot).
- **Launch demo** posts `experience` + optional `guided` flag; no forced onboarding.
- Toolbar: demo indicator, role switcher (classroom-bound), guided toggle, restart walkthrough, reset, exit, get started; session expiry hint when under 30 minutes.
- Restores preview owner when opening personal learning from an impersonated role (Group J1 owner binding preserved).

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewDemoTest.php
node --test tests/js/landing-preview-demo.test.mjs
```

## Group J4 — Interactive guided tours and sandbox motion (26 Nov 2026)

### Implemented

| Area | Files |
|------|--------|
| Tour engine | `composables/sandboxWalkthroughSteps.js`, `composables/useSandboxWalkthrough.js` |
| Overlay UI | `components/preview/PreviewSandboxWalkthrough.vue` (replaces passive coach tips) |
| Sandbox motion | `styles/sandbox-motion.css`, `styles/sandbox-walkthrough.css` |
| Wiring | `partials/preview-demo-banner.blade.php`, `PreviewSandboxToolbar.vue` (`data-sandbox-tour` on role switch) |
| Dashboard hooks | `TeacherNav.vue`, `TeacherHero.vue`, `Dashboard.vue` — `data-sandbox-tour` targets |
| Experiences | `connected` experience + `LandingPreviewDemo::resolveWalkthroughId()` |
| Session | `WALKTHROUGH_ID_SESSION_KEY` on guided enter / restart |
| Recordings | `scripts/preview-sandbox/record-all.mjs`, `lib/demo-session.mjs`; npm `preview-sandbox:record` |
| Copy | `en.json` — `previewDemo.walkthrough.*`, `experiences.connected` |
| Tests | `landing-preview-sandbox-walkthrough.test.mjs` |

### Tours

- **Teacher / Student / Parent / Personal** — contextual spotlight, progress, skip, pause, back; click- and role-switch-advance where possible.
- **Connected** — nine-step cross-persona flow (assignment → student → review → parent) with shared sandbox state.
- **Non-blocking** — scrim does not trap scroll; reduced-motion disables transitions.

### Recording outputs

- WebM (+ optional FFmpeg MP4) under `public/preview-sandbox-recordings/{teacher,student,parent,personal,connected}/` (not `public/preview/` — that path shadows Laravel’s `/preview` hub on `php artisan serve`).
- Requires local preview allowlist login + seeded demo data (`MUTQIN_PREVIEW_EMAIL` / `MUTQIN_PREVIEW_PASSWORD`).

### Tests run

```bash
node --test tests/js/landing-preview-sandbox-walkthrough.test.mjs \
  tests/js/landing-preview-demo.test.mjs
php artisan test tests/Feature/LandingPreviewDemoTest.php
```

### Limitations

- Connected tour advances on genuine UI actions where detectable; complex assignment save/submit may need manual **Continue** on optional steps.
- Automated recordings not committed as binary artefacts in git; scripts produce media on demand.
- Captions/narration tracks deferred; screenshots + video only in this pass.

## Group J3 — Full functional sandbox experiences (26 Nov 2026)

### Audit (pre-change)

| Area | Finding |
|------|---------|
| Marketing demos | Needed explicit live vs simulated labelling per experience |
| Connected flows | Platform/org seeders already link teacher assignments to students |
| Entitlements | No safe way to preview Free / Premium / Premium Plus without Stripe |
| Reset | Cleared quotas only; no optional catalogue restore or confirm step |
| Guided tours | Toolbar flag existed but no in-app coach steps |

### Implemented

| Area | Files |
|------|--------|
| Capability audit | `PreviewSandboxCapabilities`, `GET /preview/demo/capabilities` |
| Catalogue restore | `PreviewSandboxCatalogRestore` (org + platform seeders only) |
| Entitlement overlay | `PreviewSandboxEntitlement`, `POST /preview/demo/entitlement`, `SubscriptionEntitlement` integration |
| Guided coach | `PreviewSandboxWalkthroughCoach.vue`, walkthrough copy in `en.json` |
| Toolbar | Persona switch, tier selector, confirm reset + optional restore |
| Guest memorisation | `demo-memorisation.blade.php` uses overlay tiers for Vue auth props |
| Docs | `prompts/GROUP_J3.md`, `PREVIEW_DEMO.md` (J3 section) |

### Connected state (verified)

| Flow | Evidence |
|------|----------|
| Teacher assignments → students | `LandingPreviewSandboxExperienceTest::test_platform_demo_links_teacher_work_to_students` |
| Persona switch same classroom | `LandingPreviewDemo::switchablePersonas` + toolbar switch |
| Owner subscription untouched | `LandingPreviewSandboxExperienceTest::test_entitlement_preview_does_not_mutate_owner_subscription` |

### Tests run

```bash
php artisan test tests/Feature/LandingPreviewSandboxExperienceTest.php tests/Feature/LandingPreviewSandboxTest.php tests/Feature/LandingPreviewDemoTest.php
node --test tests/js/landing-preview-demo.test.mjs
```

### Limitations

- Bulk CSV import and institution checkout remain outside the sandbox story (marked simulated/partial in capabilities JSON).
- Catalogue restore re-runs demo seeders only; production rows are never deleted.
- Mr. Mutqin voice and full analytics marked partial until feature flags/config allow.

## Group I — Motion design overhaul (26 Nov 2026)

Phases 25–33 (preview environment only). Public `/` and dashboards unchanged. No new animation npm dependencies.

### Implemented

| Area | Files |
|------|--------|
| Motion tokens + utilities | `resources/js/styles/preview-motion.css` |
| Shared observer / page enter / hero staging | `resources/js/composables/usePreviewMotion.js` |
| Hero platform switcher | `components/preview/PreviewHeroShowcase.vue` |
| Connected workflow demo | `components/preview/PreviewWorkflowDemo.vue` |
| Preview home wiring | `Homepage.vue` — staged hero, showcase, workflow section |
| Audience, pricing, demo, resources | `PreviewAudiencePage.vue`, `PricingPage.vue`, `PreviewDemoPage.vue`, `PreviewResourcesPage.vue` |
| Copy | `en.json` — `homepage.preview.heroShowcase.*`, `homepage.preview.workflow.*` |
| Tests | `landing-preview-motion.test.mjs`, extended `landing-preview-homepage.test.mjs` |

### Motion system

- Duration tokens: 100–760 ms band (press, hover, tab, product, reveal, hero).
- Easing: shared `--motion-ease-out` / `--motion-ease-enter` (CSS only; no GSAP/Motion).
- Scroll reveals: `bindRevealObserver` (IntersectionObserver, stagger, reduced-motion instant reveal).
- Preview-only suppression of infinite hero glow / float loops.
- `prefers-reduced-motion`: disables transitions, workflow autoplay, and shot crossfades.

### Performance and accessibility

| Check | Result |
|-------|--------|
| Transform/opacity-first transitions | Yes — reveals, tabs, shots |
| No extra animation libraries | Confirmed — `package.json` unchanged |
| Keyboard workflow controls | Step buttons + tablist arrows on hero showcase |
| Workflow autoplay pauses off-screen | IntersectionObserver in workflow component |
| Public homepage animation path | Unchanged when `landingPreview` is false |

### Measurements

- Lighthouse / LCP not re-run in this session (no local preview server in CI). Prior Group G/H static gates unchanged.
- Bundle impact: two small Vue SFCs + one CSS module; no new webpack entries beyond existing preview mounts.

### Visual QA

- Authentic PNGs only (`/preview/assets/*` + existing landing JPG for student practice and personal hero).
- No synthetic dashboards or fabricated assessment UI.

### Remaining limitations

- Phase 29 automated Playwright marketing videos not wired on `/preview` (tutorial carousel unchanged).
- Full 60 FPS device sweep and Lighthouse 90+ not committed in this pass; optional `landing-preview-responsive-audit.cjs` still applies.
- Workflow / hero copy English-only until locale sync (`audit:i18n`).

### Tests run

```bash
node --test tests/js/landing-preview-motion.test.mjs \
  tests/js/landing-preview-homepage.test.mjs \
  tests/js/landing-preview-audience.test.mjs \
  tests/js/landing-preview-responsive.test.mjs \
  tests/js/landing-preview-pricing.test.mjs \
  tests/js/landing-preview-demo.test.mjs
```

### Group H re-check after Group I

| Item | Result |
|------|--------|
| Public `/` and `/pricing` | Still separate routes and bundles; preview-only classes on `landingPreview` |
| `/preview` gate and `noindex` | Unchanged |
| No auto-deploy | Unchanged |
| Product-owner homepage approval | Still **pending** |

## Group J5 — Sandbox conversion & final QA (26 Nov 2026)

### Audit (Groups J1–J4)

| Area | Finding |
|------|---------|
| Conversion | Generic register CTA only; no post-tour messaging |
| Exit | Single POST to demo hub; no landing / plans path |
| Tours | `complete` fired only on connected flow |
| QA | PHPUnit covered session security; no conversion/exit regression suite |
| Public sandbox | `MUTQIN_PREVIEW_SANDBOX_PUBLIC` still **false** |

### Implemented

| Area | Files |
|------|--------|
| Conversion sheet | `PreviewSandboxConversionSheet.vue` — after tour `Done`, optional plan compare |
| Exit menu | `PreviewSandboxExitMenu.vue` + toolbar trigger (`<dialog>`) |
| Toolbar | Role-specific Get started label; exit dialog; link prefetch; `useSandboxMediaPause` |
| API | `LandingPreviewDemoController::exit` — `destination=hub\|landing\|pricing` |
| Banner config | `conversionExperience`, `pricingUrl`, `demoHubUrl`, `registerUrl` |
| Tours | `complete: true` on teacher/student/parent/personal final steps |
| Copy | `en.json` — `previewDemo.conversion.*`, `previewDemo.exit.*` |
| Playwright | `scripts/preview-sandbox/qa-smoke.mjs` — `npm run preview-sandbox:qa` (env-gated) |
| Docs | `prompts/GROUP_J5.md` |

### Conversion UX

- Persistent **Get started** in toolbar; label follows experience (teacher / student / parent / personal).
- Non-blocking conversion region after guided tour completion (session-dismiss per walkthrough id).
- Copy states Premium is add-on tooling on the same account; classroom teacher/student/parent access described as free.

### Sandbox exit

| Action | Behaviour |
|--------|-----------|
| Continue exploring | Closes dialog |
| Return to demo hub | Navigates to `/preview/demo` (owner still in preview allowlist) |
| View plans | Link to `/preview/pricing` |
| Start registration | Link to `/register` (no live checkout in sandbox) |
| Return to landing | Exit POST → `/preview` |
| End demo + hub | Exit POST → `/preview/demo` (default) |

### Security & billing (unchanged)

- Live Stripe checkout remains blocked during sandbox (`LandingPreviewSandboxTest`).
- Owner subscription columns untouched by entitlement overlay (`LandingPreviewSandboxExperienceTest`).
- No automatic deploy; public `/` unchanged.

### Automated QA

```bash
php artisan test \
  tests/Feature/LandingPreviewSandboxTest.php \
  tests/Feature/LandingPreviewSandboxExperienceTest.php \
  tests/Feature/LandingPreviewSandboxConversionTest.php \
  tests/Feature/LandingPreviewDemoTest.php \
  tests/Feature/LandingPreviewAccessTest.php

node --test \
  tests/js/landing-preview-sandbox-conversion.test.mjs \
  tests/js/landing-preview-sandbox-walkthrough.test.mjs \
  tests/js/landing-preview-demo.test.mjs

# Optional (running app + MUTQIN_PREVIEW_EMAIL/PASSWORD):
npm run preview-sandbox:qa
```

Recording commands (J4, unchanged): `npm run preview-sandbox:record` / `preview-sandbox:rehearse`.

### Performance

- `prefetch` for register + preview pricing from toolbar mount.
- Pause `video`/`audio` when tab hidden during sandbox.
- Role switch still full POST navigation (shared classroom state); no unsafe client-only impersonation.

### Limitations

- Full cross-role Playwright classroom loop not in CI (smoke only).
- Lighthouse / 60 FPS device sweep not re-run; use `landing-preview-responsive-audit.cjs` when server available.
- Locale sync for conversion copy pending `audit:i18n`.

### Group H re-check after Group J5

| Item | Result |
|------|--------|
| Public `/` and `/pricing` | Unchanged; conversion links target preview routes only |
| `/preview` gate and `noindex` | Unchanged |
| `MUTQIN_PREVIEW_SANDBOX_PUBLIC` | **false** |
| Live billing in sandbox | Still blocked |
| No auto-deploy | Unchanged |
| Product-owner homepage approval | Still **pending** |