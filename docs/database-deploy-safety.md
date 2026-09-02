# Database & deployment safety

Mutqin production releases must never destroy learner data. This document is the
source of truth for migration design, deploy steps, rollback limits, and
demo-seed protections.

## Hard rules

1. **Never** run `migrate:fresh`, `migrate:refresh`, `migrate:reset`, `db:wipe`,
   or test-only reset helpers against production.
2. **Never** run `db:seed`, `DemoDataSeeder`, or `PracticeAccountSeeder` in
   production. Seeders abort when `APP_ENV=production`.
3. Production deploys run **`php artisan migrate --force` only** (via
   `scripts/deploy/production-release.sh` or the equivalent Laravel Cloud stage).
4. After schema-sensitive deploys, run **`php artisan queue:restart`** so workers
   reload code/schema-compatible jobs.
5. **Do not** paper over a failed migration with `Schema::hasColumn` /
   `hasTable` “already done” skips that mark the migration complete while
   leaving partial/inconsistent state. Additive retry guards belong only in
   carefully reviewed expand migrations — prefer failing loudly.
6. Explicitly destructive production changes require a **fresh backup** first
   (`MUTQIN_BACKUP_CONFIRMED=1` + `php artisan mutqin:deploy-preflight --require-backup`).

Laravel also calls `DB::prohibitDestructiveCommands()` when
`APP_ENV=production`, which blocks wipe/fresh/refresh/reset/rollback artisan
commands at the framework layer.

## Expand / contract (preferred)

For risky schema changes, ship two (or more) releases:

| Phase | Safe actions | Unsafe in the same release |
| --- | --- | --- |
| **Expand** | Add nullable columns, add tables, add indexes, dual-write | Drop columns, tighten NOT NULL without backfill |
| **Migrate data** | Backfill in batches/transactions; keep old reads working | Long locks that rewrite entire hot tables inline |
| **Contract** | Remove old columns/code after dual-read window | Instant drop of columns still read by old workers |

### New required columns

1. Add **nullable** (or with a DB default) in an expand migration.
2. Deploy app code that writes the new column.
3. Backfill existing rows (batched; transactional where safe).
4. Only later enforce `NOT NULL` once backfill is verified.

Example already in tree: `users.last_login_at` is nullable; `User::touchLastLogin()`
fills it after login. Admin activity filters tolerate `NULL` as “never logged in”.

### Indexes

Add indexes in expand migrations **before** (or with) the release that makes
those filters hot-path — e.g. `users_last_login_at_index` for admin activity
queries. Prefer online-friendly index builds on large MySQL/Postgres tables when
available; avoid wrapping long index builds and huge data rewrites in one
lock-heavy migration.

### Data migrations

- Prefer a dedicated migration (or artisan command) separate from DDL when the
  backfill is large.
- Wrap small, atomic updates in `DB::transaction()` when the driver supports it
  (see `2026_09_02_160000_promote_primary_google_admin`).
- Chunk large updates; never hold a multi-minute lock on `users` or session
  tables during peak traffic.
- If a data migration fails, leave it pending — do not mark success manually.

## Migration audit notes (existing)

| Area | Status | Notes |
| --- | --- | --- |
| `2026_06_01_103104_recreate_users_table_*` | Neutralized | Historically dropped/recreated `users`; now a no-op. **Do not revive table rebuilds.** |
| `change()` password nullability | Historical | Prefer expand/contract for future type changes on MySQL. |
| `down()` `dropColumn` / `dropIfExists` | Normal | Rollback helpers only — not for production reset. |
| Enhance migrations with `hasColumn` | Legacy | Added for SQLite/dev re-runs; new migrations should not rely on this to hide failures. |
| Seeders | Guarded | Production abort + demo-domain email checks. |

## Rollback limits

- `migrate:rollback` is **prohibited in production** by framework policy.
- Even when rollback is available (staging), **do not promise** rollback for:
  - Dropped columns/tables
  - Irreversible data transforms / anonymization
  - Backfills that cannot reconstruct prior values
- Document irreversible migrations in the PR and release notes.
- Recovery path for irreversible changes: **restore from backup**, not `migrate:rollback`.

## Demo / seed protections

- Reserved demo email suffixes: `@mutqin.test`, `@example.com`, `@example.org`,
  `@example.net` (`App\Support\DatabaseDeploySafety`).
- Seeders refuse non-demo emails and refuse `APP_ENV=production`.
- `SHOW_DEMO_ACCOUNTS` is forced **off** when `APP_ENV=production`.
- `EnsureDemoLoginAccount` refuses production and refuses non-demo
  `DEMO_LOGIN_EMAIL` values (prevents overwriting a real user’s password).

Local / staging only:

```bash
php artisan migrate --seed
php artisan db:seed --class=DemoDataSeeder
```

## Deploy workflow

### Laravel Cloud / production stage

Use the release script (or mirror its steps in the platform deploy hooks):

```bash
MUTQIN_DEPLOY_STAGE=production ./scripts/deploy/production-release.sh
```

What it does:

1. Refuses to run unless stage is `production` / `prod` / `staging`.
2. Refuses production if `SHOW_DEMO_ACCOUNTS` is enabled.
3. Runs `php artisan mutqin:deploy-preflight`.
4. Runs `php artisan migrate --force` only.
5. Runs `php artisan queue:restart`.

`composer setup` may call `migrate --force` for **local bootstrap** — that is not
a production deploy path.

### Preflight checklist

Run before every production release that includes migrations:

```bash
php artisan mutqin:deploy-preflight
# Before intentionally destructive ops:
MUTQIN_BACKUP_CONFIRMED=1 php artisan mutqin:deploy-preflight --require-backup
```

Manual checklist:

- [ ] Backup taken / provider point-in-time restore verified (or `MUTQIN_BACKUP_CONFIRMED=1` for gated ops) — see [docs/backups.md](backups.md)
- [ ] `php artisan migrate:status` reviewed — understand every Pending migration
- [ ] Pending migrations are expand-safe (nullable/default/index) or have an explicit maintenance plan
- [ ] Large data backfills split from DDL; estimate lock/time risk
- [ ] Rollback limits documented in the PR (especially irreversible downs)
- [ ] `SHOW_DEMO_ACCOUNTS` is false on production
- [ ] Queue workers will receive `queue:restart` after migrate
- [ ] App code is compatible with **old** schema during expand (and with **new** schema after)
- [ ] Maintenance window scheduled only if a migration cannot be online-safe

## Operator commands (safe vs blocked)

| Command | Production |
| --- | --- |
| `php artisan migrate --force` | Allowed (intended) |
| `php artisan mutqin:deploy-preflight` | Allowed |
| `php artisan queue:restart` | Allowed / required after migrate |
| `migrate:fresh` / `db:wipe` / `migrate:refresh` / `migrate:reset` | **Blocked** |
| `migrate:rollback` | **Blocked** (use backup restore) |
| `db:seed` / Demo seeders | **Blocked** (abort) |

## Related

- [docs/backups.md](backups.md) — Laravel Cloud MySQL snapshots, encrypted Spatie archives, restore & staging verification
- [README.md](../README.md) — high-level deploy notes
- [docs/TESTER_GUIDE.md](TESTER_GUIDE.md) — local/staging demo accounts only
