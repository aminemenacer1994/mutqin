# Mutqin 2.0: Master requirements

**Last updated:** 26 November 2026

## Objective

Build a premium, welcoming, responsive Qur'an education SaaS website using the existing Notion-inspired landing page as the visual foundation.

Preserve completed work. Audit existing implementation before rebuilding anything.

## Source material

Review:

- `docs/mutqin-2.0/reference/Mutqin_2.0_Business_Plan.pdf`
- `docs/mutqin-2.0/reference/Mutqin_2.0_Business_Model.pdf`
- Mutqin Qur'an Learning Ecosystem diagram (when supplied)
- `docs/mutqin-2.0/reference/screenshots/`
- Official light logo: `public/images/logo.png` (and related assets in `public/images/`)
- Official dark logo: `public/images/dark_logo.png`
- Existing Notion-inspired landing page (`resources/js/views/Homepage.vue`)
- Existing Laravel application

Business documents contain proposed features and pricing. Verify implementation and commercial configuration before publishing claims.

## Private development environment

All new marketing development must remain under `/preview` and protected subroutes.

Only authenticated, verified accounts on `MUTQIN_LANDING_PREVIEW_EMAILS` (default `menacer72@gmail.com`) may access this environment.

Enforce server-side authorisation for pages, APIs, media and sandbox routes.

Do not replace the existing homepage or publish automatically.

See `docs/mutqin-2.0-audit.md` for product architecture and `docs/mutqin-2.0-ecosystem-integration.md` for in-app integration notes.

## Design direction

| Reference | Weight | Use for |
|-----------|--------|---------|
| [Notion](https://www.notion.com) | 85% | Simplicity, typography, responsive layouts, navigation, warmth, fluidity, product storytelling |
| [Attio](https://www.attio.com) | 15% | Product showcases, interactive demonstrations, refined micro-interactions |

Keep the existing Notion-inspired landing page structure wherever it already meets requirements.

## Branding

Use official supplied logos without modification.

Preserve existing warm ivory, beige, brown, forest-green and espresso colour tokens.

Support system theme preference and manual light/dark mode.

## Product architecture

Mutqin supports:

- Teacher-led learning
- Student learning
- Parent visibility
- Independent personal Qur'an learning
- Institutional education

Independent Premium is a subscription entitlement, not a separate authentication role.

One account may access permitted classroom roles and personal learning tools.

Essential teacher-led student learning and parental access remain free.

Personal Premium subscriptions are optional.

Do not introduce duplicate accounts or unnecessary new roles.

## Product authenticity

Use actual application interfaces, genuine recordings and verified functionality.

Never fabricate screenshots, product statistics, testimonials, partnerships, or AI assessment results presented as genuine.

Clearly label synthetic demonstration records and simulated assessments inside the isolated sandbox.

Never expose production user information.

## Design requirements

**Prioritise:** premium typography, generous whitespace, natural editorial layouts, large authentic product showcases, minimal navigation, smooth interactions, responsive behaviour, accessible interfaces, practical benefit-driven content.

**Avoid:** glassmorphism, excessive gradients and glowing effects, generic purple or blue AI branding, repetitive cards and bento grids, excessively rounded components, oversized decorative icons, floating decorations, unnecessary Islamic ornaments, stock photography, excessive badges, heavy animations, rigid corporate layouts, generic AI-generated SaaS aesthetics.

## Copywriting

Use concise, natural British English.

Remove em dashes and unnecessary en dashes from marketing copy.

Retain necessary grammatical hyphens, numerical ranges and technical syntax.

Avoid exaggerated claims, repetitive slogans, corporate jargon and generic AI phrases.

Explain actual functionality and practical educational benefits.

## Architecture

Retain existing Laravel infrastructure.

Preserve existing public website, teacher, student and parent platforms, independent learning tools, authentication, permissions, subscriptions, user accounts, learning histories, production data, and Qur'an content and recordings.

Avoid unrelated refactoring and destructive migrations.

Stage changes to shared functionality behind appropriate configuration or feature flags.

## MCP usage

Where available:

- Mobbin: design research
- Context7: technical documentation
- Playwright: browser inspection, authentic captures and testing
- BrowserStack: cross-browser and responsive testing

## Execution groups (A–H)

| Group | Focus | Prompt |
|-------|--------|--------|
| **A** | Private preview gate, audit, route scaffold | `prompts/GROUP_A.md` |
| **B** | Preview homepage: ecosystem story and authentic teacher UI | `prompts/GROUP_B.md` |
| **C** | Audience pages: teachers, students, parents | `prompts/GROUP_C.md` |
| **D** | Personal learning and institutions on preview | `prompts/GROUP_D.md` |
| **E** | Pricing and entitlements vs business PDFs | `prompts/GROUP_E.md` |
| **F** | Labelled demo sandbox | `prompts/GROUP_F.md` |
| **G** | Resources, responsive and cross-browser evidence | `prompts/GROUP_G.md` |
| **H** | Launch QA gate and approval (no auto deploy) | `prompts/GROUP_H.md` |

Work incrementally through groups A–H.

Audit, reuse and refine completed functionality rather than rebuilding it.

Maintain `IMPLEMENTATION_PROGRESS.md`.

Complete and test each group before proceeding.

Record implementation evidence, limitations and test results.

Do not claim untested functionality is complete.

Never deploy or publish automatically.