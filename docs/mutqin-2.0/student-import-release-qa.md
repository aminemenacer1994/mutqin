# Mutqin 2.0 — Intelligent student import release QA

**Date:** 2026-11-26  
**Scope:** Teacher class roster import (upload → review → organise → commit). Staging on private disk; live `users` / memberships written only after explicit commit.

**Canonical rules:** `docs/00-shared-rules.md`

---

## Verdict: **CONDITIONAL GO** (class roster v1)

| Gate | Result |
|------|--------|
| PHPUnit import feature + parser suite | **Pass** (`php artisan test tests/Feature/StudentImportTest.php tests/Unit/StudentImportParserTest.php`) |
| JS static wizard / API wiring | **Pass** (`node --test tests/js/teacher-student-import-verify.mjs`) |
| Cross-teacher batch access | **Pass** (`StudentImportBatchPolicy` + feature test) |
| Institution boundary on commit | **Pass** (foreign-org email → row `failed`) |
| Upload security (extension, mime, magic bytes) | **Pass** (unit + `StudentImportFileSecurity`) |
| Spreadsheet formula execution | **Pass** (`readDataOnly`, `formula_execution: false` provenance) |
| 100-row parse benchmark (CI) | **Pass** (< 5s assertion) |
| Live browser, dark mode, mobile layouts | **Not run** this pass |
| Playwright teacher journey | **Not run** this pass |
| ClamAV in production | **Config-only** (`MUTQIN_STUDENT_IMPORT_CLAMAV_SOCKET`) |

**NO-GO triggers** for automated roster import were not hit. Remaining gaps are **product scope** (see limitations), not blockers for staged roster onboarding.

---

## Reproduce

```bash
php artisan test tests/Feature/StudentImportTest.php tests/Unit/StudentImportParserTest.php
node --test tests/js/teacher-student-import-verify.mjs
php artisan mutqin:student-import-cleanup --dry-run
```

Optional larger local benchmarks (not in CI):

```bash
# Generate 500-row CSV and time process via tinker or a one-off script; expect sub-minute on typical hardware.
```

---

## Checklist (brief mapping)

| QA theme | Status | Evidence / notes |
|----------|--------|------------------|
| CSV, JSON, XLSX/XLS/ODS, DOCX, TXT/MD, PDF (text), pasted text | **Pass** | `StudentImportParserRegistry`, parser unit tests |
| Legacy `.doc` binary | **Pass** | Unsupported file status + user-facing message |
| Image-only / unreadable PDF | **Pass** | `PdfStudentImportParser` unsupported reason |
| Arabic / RTL headers | **Pass** | `StudentImportFieldAliases`, CSV unit test |
| Multilingual student names | **Pass** | UTF-8 detection in CSV/text parsers |
| Missing / invalid email | **Pass** | `StudentImportRowValidator` → `invalid` rows |
| Duplicate emails within batch | **Partial** | UI `duplicate` badge; server still accepts both until teacher skips/edits |
| Existing account (same org) | **Pass** | `matched_user_id` + pending group membership |
| Cross-institution email | **Pass** | Commit row `failed`, no membership change |
| Parent email field | **Partial** | Parsed, validated, counted in organise step; **not** linked to parent accounts on commit |
| Attendance / payments / assignments / Qur'an refs | **Out of scope v1** | No parsers or commit writers |
| AI extraction for unstructured docs | **Out of scope v1** | PDF = text extract + line/CSV heuristics only |
| Unregistered profiles / secure linking | **Partial** | New users get random password + pending membership; invitation flow separate |
| Partial row failures on commit | **Pass** | Per-row transaction; `failed` status + `error_summary` |
| Cancel import UI | **Partial** | Closes dialog / abandons UI state; **no** server-side batch delete endpoint |
| Post-commit rollback | **Out of scope v1** | Not supported |
| Retry processing job | **Pass** | Idempotent guard when staging rows already exist |
| Temp file cleanup | **Pass** | `mutqin:student-import-cleanup` scheduled; `expires_at` on batches |
| Malicious uploads (exe, mismatch mime) | **Pass** | `StudentImportFileSecurity` |
| CSV formula injection in product UI | **Low risk** | Values stored as strings; invalid emails rejected; exports are JSON templates |
| Review API row cap | **Limitation** | `show` loads max **500** rows; commit still processes **all** valid rows — review UI may truncate >500 |
| Async commit >50 valid rows | **Pass** | `CommitStudentImportBatchJob` |
| Teacher regression (unrelated modules) | **Not run** full suite this pass |

---

## Performance notes (representative sizes)

| Size | Automated | Observation |
|------|-----------|-------------|
| 10 | Via feature tests (1–few rows) | Sub-second |
| 50 | Async threshold boundary | Sync commit in tests |
| 100 | **CI benchmark** | Processing < 5s (`test_csv_import_benchmark_100_rows_under_five_seconds`) |
| 500 | Manual | Expected feasible; review UI shows first 500 rows only |

No N+1 issues observed in commit loop (per-row `User` lookup is intentional for clarity; batching optimisation deferred).

---

## Module integration after commit

| Destination | Behaviour |
|-------------|-----------|
| `users` | Create or match by email (same org) |
| `organisation_memberships` | Pending student membership if not already approved |
| `group_memberships` | Pending student in target class |
| Teacher Students list | Pending invites visible via existing class rosters |
| Parent portal | No automatic parent link from `parent_email` |
| Financial / attendance modules | Unaffected |

---

## Fixes applied during this QA pass

| Area | Change |
|------|--------|
| `PlainTextStudentImportParser` | First line with known column headers (paste/TXT/MD) maps to email/name like CSV |
| `TeacherStudentImportController::commit` | Response includes row outcomes after sync commit |
| `StudentImportProcessingService` | Skip re-processing when staging rows already exist (safe job retry / sync queue) |
| `tests/Feature/StudentImportTest.php` | Fake import jobs to avoid double-parse; expanded coverage (paste, existing user, foreign org, async commit, 100-row benchmark) |
| `tests/js/teacher-student-import-verify.mjs` | Static gate for wizard, API, a11y hooks |

---

## Remaining limitations (document honestly)

1. **Roster fields only** — email, name, parent email, phone, notes.
2. **No AI** for messy Word/PDF layouts; teachers should prefer CSV/XLSX templates.
3. **Parent emails** are advisory until a parent-linking commit path exists.
4. **No historical** attendance, payment, or assignment backfill.
5. **Review UI** capped at 500 rows per poll; very large files need split uploads or a follow-up pagination API.
6. **Abandoned batches** expire via retention job; no explicit “delete batch” API.
7. **Live UX** (mobile, dark, keyboard-only) should be spot-checked before marketing the feature broadly.

---

## Suggested follow-ups (post-release)

- Parent/guardian commit integration with verified relationships.
- Paginated `GET /imports/{id}` rows or cursor for >500 rows.
- `DELETE /imports/{id}` for explicit teacher cancellation.
- Optional AI assist behind feature flag for unstructured PDFs.
- Playwright: upload CSV → review → commit → student appears in class list.