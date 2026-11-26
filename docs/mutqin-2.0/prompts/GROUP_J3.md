# Group J3 — Full functional sandbox experiences

**Depends on:** Groups F, J1 and J2 (`/preview/demo` hub, sandbox sessions, experience picker).

## Goal

Demonstrate the real Mutqin teacher, student, parent and personal workspaces with audited capabilities, connected classroom fixtures, safe entitlement previews and reversible reset — never imitation dashboards.

## Deliverables

1. `PreviewSandboxCapabilities` audit (live / partial / simulated labels)
2. Catalog restore on reset (`PreviewSandboxCatalogRestore`) without touching non-demo accounts
3. Session entitlement overlay (`PreviewSandboxEntitlement`) for Free / Premium / Premium Plus previews
4. Guided walkthrough coach + toolbar persona switching (existing platform demo classroom)
5. Sandbox AI quota wiring in `SubscriptionEntitlement`
6. PHPUnit + JS tests for capabilities, connected fixtures and entitlement safety
7. `IMPLEMENTATION_PROGRESS.md` Group J3 section

## Acceptance criteria

- Every advertised sandbox path uses production Vue routes and APIs
- Teacher → student → parent flows share one seeded classroom (`PlatformDemoCatalog` or org network)
- Reset confirms data loss; optional catalog restore re-runs demo seeders only
- Preview owner subscription columns never change when tier overlay is used
- Capabilities endpoint omits unimplemented features (marked partial/simulated)

## Out of scope

- Public unauthenticated demos (`MUTQIN_PREVIEW_SANDBOX_PUBLIC` stays false)
- Stripe checkout or live charges in sandbox sessions