# Group J1 — Sandbox architecture and security

**Depends on:** Groups A, E, and F (`/preview/demo` scaffold).

## Goal

A complete, server-enforced demonstration environment on the real Mutqin application with isolated sandbox sessions, synthetic classrooms, and blocked production side effects.

## Deliverables

1. `preview_sandbox_sessions` persistence with TTL, manual reset and scheduled cleanup
2. Preview owner identity stored separately from synthetic demo logins
3. Teacher, student and parent personas on the same `PlatformDemoCatalog` classroom
4. Guest memorisation without classroom membership
5. Mail, billing checkout, and related side-effect guards
6. PHPUnit coverage for gate, cross-session, and persona binding
7. `IMPLEMENTATION_PROGRESS.md` Group J1 section

## Acceptance criteria

- Only verified allowlist accounts may open `/preview/demo` while public access remains disabled
- Synthetic accounts cannot be used without an active sandbox session row
- Demo role switching never mutates the preview owner’s persisted permissions
- No production PII in demo fixtures

## Out of scope

- Enabling public unauthenticated demo (`public_access_enabled` stays false)
- Homepage cutover (Group H)