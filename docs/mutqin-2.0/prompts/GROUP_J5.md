# Group J5 — Sandbox conversion & final QA

**Depends on:** Groups J1–J4 (sandbox sessions, toolbar, guided tours).

## Goal

Close the sandbox loop with respectful conversion paths, a clear exit menu, automated QA coverage, and a final implementation report — without enabling public sandbox access or live billing changes.

## Deliverables

1. Persistent **Get started** with role-specific labels (`PreviewSandboxToolbar`)
2. Post-tour conversion sheet + optional plan compare (`PreviewSandboxConversionSheet`)
3. Exit menu: continue, demo hub, plans, register, preview landing (`PreviewSandboxExitMenu`)
4. `POST /preview/demo/exit` destinations (`hub`, `landing`, `pricing`)
5. PHPUnit + JS static tests; optional Playwright `preview-sandbox:qa`
6. `IMPLEMENTATION_PROGRESS.md` Group J5 + Group H re-check

## Acceptance criteria

- No intrusive registration popups during exploration; conversion appears after guided tour **Done** or via toolbar CTA
- Premium described as tools on the same account; teacher/student/parent classroom access stays free in copy
- `MUTQIN_PREVIEW_SANDBOX_PUBLIC` remains **false**; checkout still blocked in sandbox
- No production deploy or homepage cutover in this group

## Out of scope

- Public unauthenticated demos
- Stripe / live subscription changes
- Full WCAG audit or committed responsive PNG sweep (optional scripts only)