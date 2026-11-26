# Group F — Labelled demo sandbox

**Depends on:** Groups A and B.

## Goal

Ship `/preview/demo` (or subroutes) with **clearly labelled** synthetic data for interactive marketing demonstrations.

## Requirements

- Server-side preview gate on all demo routes and APIs
- Synthetic records, simulated assessments and demo media labelled in UI
- Reuse existing sandbox/demo infrastructure where present (`TeacherDemoCatalog`, etc.) without exposing production data

## Deliverables

1. Demo route(s) and entry from preview homepage
2. Documentation of what is simulated vs live
3. Browser or Playwright capture evidence in `IMPLEMENTATION_PROGRESS.md`

## Acceptance criteria

- Non-allowlisted users receive 404
- No production PII in demo fixtures

## Out of scope

Public unauthenticated demo, automated deploy.