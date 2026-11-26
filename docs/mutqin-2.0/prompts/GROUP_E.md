# Group E — Pricing and commercial alignment

**Depends on:** Group A (`/preview/pricing` exists).

## Goal

Align `/preview/pricing` (and future public pricing) with `Mutqin_2.0_Business_Model.pdf` and live billing configuration.

## Deliverables

1. Manual reconciliation table in `IMPLEMENTATION_PROGRESS.md`: PDF claim → config/plan key → test evidence
2. `pricingPage.preview.*` copy updates only where verified
3. No changes to Stripe products or production `/pricing` without explicit approval

## Acceptance criteria

- No published preview copy for unverified limits, prices or feature gates
- PHPUnit covers pricing page preview gate (existing) and any new entitlement assertions added

## Out of scope

Launching public pricing, coupon experiments, institution contracts.