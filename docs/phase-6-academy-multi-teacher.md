# Phase 6 — Academy & Multi-Teacher Management

## Scope delivered

- **Institution admin role** on `organisation_memberships.is_institution_admin` (first approved teacher per org is admin; backfilled on migrate).
- **Institution profile** (`organisations.profile_summary`, admin rename via API).
- **Teacher invitations** (`organisation_teacher_invitations`) with token accept flow.
- **Staff lifecycle**: revoke staff, promote/demote admin (cannot remove last admin).
- **Audit trail** for admin actions (`organisation_admin_audit_logs`).
- **Teacher UI**: institution roster on overview; institution admin panel under Settings.

Independent teacher workflows are unchanged. Student data access still requires class membership and analytics consent (`StudentAccessAuthorizer`).

## APIs (behind `teacher.features`)

| Method | Path | Notes |
|--------|------|--------|
| GET | `/api/organisations/active/institution` | Dashboard: profile, staff, invites, audit |
| PATCH | `/api/organisations/active/institution` | Admin: name, profile_summary |
| POST | `/api/organisations/active/teacher-invitations` | Admin: invite by email |
| POST | `/api/organisations/active/teacher-invitations/{id}/revoke` | Admin |
| POST | `/api/organisations/teacher-invitations/accept` | Invited teacher (authenticated) |
| POST | `/api/organisations/active/staff/{membership}/revoke` | Admin |
| POST | `/api/organisations/active/staff/{membership}/admin` | Admin: `{ "admin": true\|false }` |

## Not in this slice

- Cross-institution student transfers
- Institution-wide student roster without consent
- Payroll / finance
- Shared curriculum templates at institution scope (assignments remain teacher-scoped)

## Verify

```bash
php artisan migrate
php artisan test --filter=OrganisationInstitutionAdminTest
php artisan test --filter=OrganisationMembershipAndInviteTest
```

Enable `MUTQIN_TEACHER_FEATURES_ENABLED` and exercise Settings → Institution administration and Overview → Institution roster.