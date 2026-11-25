# Shared rules — Mutqin Student Platform

Read once per agent session before editing student (or related) surfaces.

## Engineering

- Inspect relevant routes, views, components, services, schemas, and tests before editing.
- Use Teacher and Parent implementations as the visual reference; reuse shared primitives and tokens.
- Extend existing functionality — no duplicate routes, models, or engines.
- Enforce server-side ownership, role/institution isolation, authorised relationships, and private audio access.
- Use real persisted data; distinguish AI wording match from teacher-verified progress and supported Tajweed evidence.
- Never invent metrics or silently mark incomplete practice as complete.
- Backward-compatible migrations only; avoid destructive data changes.
- Targeted tests and browser checks; report changed files, results, gaps, and blockers. Do not claim tests passed if not run.

## Product / UX

- Support mobile, desktop, dark mode, keyboard access, Arabic/RTL, and loading/empty/error states.
- Student primary destinations: **Home**, **My Learning**, **Practice**, **Progress**, **Messages** (Settings in account).
- Preserve working individual learning tools, Quran text/ayah IDs, entitlements, and teacher-linked free core learning.
- Each phase in the student platform checklist is **implementation**, not recommendations-only.

## Student phase index

| Phase | Focus |
|------:|-------|
| 01 | UI/UX & shared design system |
| 02 | Navigation & information architecture |
| 03 | Home & daily dashboard |
| 04 | Teacher assignments & lesson management |
| 05 | Unified Qur’an learning & practice |
| 06 | Hifz / Sabaq / Sabqi / Manzil |
| 07 | Personalised revision |
| 08 | AI Recite & assessment |
| 09 | Progress & mistake tracking |
| 10 | Teacher feedback & communication |
| 11 | Notifications & motivation |
| 12 | Onboarding & accessibility |
| 13 | Ecosystem E2E release QA |

Detailed acceptance criteria live in product phase briefs; internal completion notes are in `docs/phase-*-student*.md`, `docs/phase-12-student-platform.md`, and release QA in `docs/phase-13-student-ecosystem-release-qa.md` (`npm run test:student:phase13`).