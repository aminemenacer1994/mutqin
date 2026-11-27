# Mutqin 2.0 editorial master prompt — completion summary

**Date:** 26 Nov 2026  
**Overall status:** **Partially complete** (editorial homepage refinement + theme lock tests delivered; full §11 visual/motion/media evidence not re-run in this session)  
**Preview ready for owner review:** **Yes, for editorial structure and copy** — sign in as allowlisted verified account, open `/preview`

## Completion checklist

| Requirement / checkpoint | Status | Delivered | Evidence |
|--------------------------|--------|-----------|----------|
| §0 Colour lock + regression test | **Partial** | Scoped CSS tokens + static regression test | `resources/js/styles/preview-editorial-tokens.css`, `docs/mutqin-2.0/preview-theme-locked-tokens.json`, `tests/js/landing-preview-theme-regression.test.mjs` |
| §4 Typography (Newsreader) | **Partial** | Preview-only display/body stacks + font preload on `/preview` | `resources/views/preview/home.blade.php`, `preview-editorial-tokens.css` |
| §5 Seven-section IA | **Passed** | Hero, workflow, product explorer, personal learning, sandbox, pricing teaser, FAQ + closing CTA; public carousel/features/contact hidden on preview | `resources/js/views/Homepage.vue` |
| §6 Hero / explorer choreography | **Partial** | Dual `PreviewHeroShowcase` (roles + teacher tasks); workflow component retained | `Homepage.vue`, `PreviewHeroShowcase.vue` |
| §7 Automated media | **Not run** | Existing scripts unchanged | `docs/mutqin-2.0/IMPLEMENTATION_PROGRESS.md` (Group J4) |
| §11 Acceptance screenshots / video | **Not run** | — | Re-run Playwright capture scripts when app server available |
| Protected `/preview` boundary | **Passed** | No changes outside preview scope except shared showcase component | `LandingPreviewAccessTest` |
| Public `/` preserved | **Passed** | — | `LandingPreviewAccessTest` |

## Key changes this session

- Editorial hero copy and CTAs (`Get started for free`, `Try the demo`).
- Replaced four-up classroom cards with single **product explorer** canvas (students, assignments, reviews, learning plans).
- Added **personal learning**, **pricing teaser**, and **closing CTA** sections; removed redundant preview ecosystem list.
- Locked marketing light/dark palette under `.homepage--preview` without altering production dashboard tokens.
- Preview FAQ aligned to trust questions (AI scope, classroom free access, demo, parents).
- `PreviewHeroShowcase` supports arbitrary tab ids (not only teacher/student/parent/personal).

## Verification (this session)

```bash
node --test tests/js/landing-preview-homepage.test.mjs \
  tests/js/landing-preview-theme-regression.test.mjs \
  tests/js/landing-preview-motion.test.mjs
php artisan test tests/Feature/LandingPreviewAccessTest.php
```

| Suite | Result |
|-------|--------|
| JS preview homepage / theme / motion | 3/3 passed |
| `LandingPreviewAccessTest` | 14/14 passed |

Theme token CSS regression: **zero diff vs locked JSON** for primary light/dark variables tested.

## Deliverables

| Artifact | Path |
|----------|------|
| Local preview | `http://127.0.0.1:8000/preview` (after `php artisan serve` + front-end build as usual) |
| Progress log | `docs/mutqin-2.0/IMPLEMENTATION_PROGRESS.md` |
| Locked tokens | `docs/mutqin-2.0/preview-theme-locked-tokens.json` |
| Theme regression test | `tests/js/landing-preview-theme-regression.test.mjs` |

## Remaining work

1. Re-capture §11 before/after screenshots and hero walkthrough video at 1440px light/dark.
2. Compare Newsreader vs Source Serif 4 in rendered captures and record choice in progress notes.
3. Optional Playwright computed-style snapshot test in browser (static CSS test does not replace rendered QA).
4. Interactive Mushaf demo block on homepage (brief §6.3) — detail remains on `/preview/learning`.
5. Institutional/commercial copy pass against live `config/billing.php` before public release.

## Release status

- Public homepage, production dashboards, and billing: **unchanged**.
- No deployment, no public sandbox activation, no `/` replacement.