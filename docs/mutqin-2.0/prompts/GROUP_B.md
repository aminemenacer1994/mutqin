# Group B — Preview homepage: ecosystem and authentic classroom story

**Depends on:** Group A complete.

**Routes:** `/preview` only (reuse `Homepage.vue` with `landingPreview`).

## Goal

Extend the private preview homepage with:

- A clear **ecosystem narrative** (teacher, student, parent, personal learning, institution) on one account
- **Authentic teacher UI** from `docs/mutqin-2.0/reference/screenshots/`
- British English copy under `homepage.preview.*`
- No changes to public `/`

## Deliverables

1. **Protected assets** — PNGs in `resources/marketing/preview-2.0/`, served via `GET /preview/assets/{file}.png` with the same middleware as other preview routes (`LandingPreviewAssets`).
2. **Preview-only sections** in `Homepage.vue`:
   - Ecosystem list (`#ecosystem`)
   - Classroom spotlights (`#classroom`) with real screenshots
   - Preview hero uses desktop browser frame, not phone mock-ups
3. **Locale** — `en.json` → `homepage.preview.ecosystem.*`, `homepage.preview.classroom.*`, updated hero pillars and title
4. **Styles** — `Homepage.css` (`.preview-browser`, ecosystem and classroom sections)
5. **Tests** — extend `LandingPreviewAccessTest` and `landing-preview-homepage.test.mjs`

## Product authenticity

- Caption that screens are from the live app (local capture, dated)
- No invented metrics, testimonials or partnership claims
- Do not present sandbox/demo data as production

## Acceptance criteria

- Guest and non-allowlisted users cannot load `/preview` or `/preview/assets/*.png`
- Public `/` HTML and assets unchanged
- Allowlisted user sees new sections on `/preview`
- PHPUnit and JS static tests pass

## Out of scope

Dedicated `/preview/teachers` page (Group C), pricing claim verification (Group E), interactive demo (Group F).