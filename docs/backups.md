# Mutqin backups

Production recovery for Mutqin user data. Hosting target: **Laravel Cloud** (`https://app.mutqin.ai`).

This document describes what is configured in-repo, what you must enable in the Laravel Cloud dashboard, and how to verify restores on staging. **Do not assume backups are live** until the dashboard checks and (if used) `MUTQIN_BACKUP_ENABLED` path below are completed.

## What is backed up

| Data | Where it lives | Backup layer |
|------|----------------|--------------|
| Users, learning state, assessments metadata, feedback rows, billing, sessions/queue tables | Managed MySQL (production) | **Laravel Cloud MySQL snapshots** (primary) + optional Spatie DB dump |
| Feedback screenshots | Private disk (`MUTQIN_USER_FILES_DISK`) | Private Object Storage persistence + optional Spatie archive |
| AI learner audio | Browser IndexedDB / `storage/app/tmp/learner-audio` | **Excluded** (ephemeral; default retention is temporary) |
| Caches, logs, Mix build output, sourcemaps | Local / build | **Excluded** |

Laravel Cloud application disks are **ephemeral**. Feedback screenshots must use a **private** Object Storage bucket in production (`MUTQIN_USER_FILES_DISK`), not the local filesystem.

## Layer 1 — Laravel Cloud MySQL (required)

Provider-native, private snapshots (not public URLs).

1. Laravel Cloud → **Org → Resources → Databases** → select the production MySQL cluster → **Backups**.
2. Set backup type to **Daily backups**.
3. Set retention to **30 days** (platform max for automated daily; also reflected as `MUTQIN_CLOUD_MYSQL_BACKUP_RETENTION_DAYS` for ops docs).
4. Optionally create a **manual** snapshot before risky migrations (`php artisan mutqin:deploy-preflight --require-backup` + `MUTQIN_BACKUP_CONFIRMED=1`).

Automated window: roughly **3AM–6AM EDT** (see [Laravel MySQL docs](https://cloud.laravel.com/docs/resources/databases/laravel-mysql)).

Cloud snapshots are internal platform objects — not downloadable `mysqldump` files. To obtain a SQL export: restore a snapshot into a **new** cluster, enable its public endpoint if needed, then dump from a trusted machine.

## Layer 2 — Persistent user files (required on Cloud)

1. Create / attach a **private** Laravel Object Storage bucket to the environment (Cloudflare R2 via Cloud).
2. Install is already covered by `league/flysystem-aws-s3-v3` in Composer.
3. Set `MUTQIN_USER_FILES_DISK` to the attached disk name (often `s3` or a custom name from the canvas).
4. Redeploy so injected `AWS_*` / disk wiring apply.
5. Confirm screenshots are not publicly listable (private bucket visibility in the dashboard).

App code stores screenshots via `App\Support\UserFilesDisk` (feedback only).

## Layer 3 — Encrypted app archives (optional, Spatie)

Uses `spatie/laravel-backup` when explicitly enabled. Archives go to the private `backups` disk (local under `storage/app/private/backups`, or a **separate** private S3/R2 bucket via `BACKUP_DISK_DRIVER=s3` + `BACKUP_AWS_*`).

### Retention tiers (config / env)

| Env | Default | Meaning |
|-----|---------|---------|
| `BACKUP_KEEP_ALL_DAYS` | 7 | Keep every archive |
| `BACKUP_KEEP_DAILY_DAYS` | 16 | Then one per day |
| `BACKUP_KEEP_WEEKLY_WEEKS` | 8 | Then one per week |
| `BACKUP_KEEP_MONTHLY_MONTHS` | 12 | Then one per month |
| `BACKUP_KEEP_YEARLY_YEARS` | 2 | Then one per year |
| `BACKUP_MAX_STORAGE_MB` | 10240 | Cap total archive size |

Defined in `config/backup.php` (Spatie default cleanup strategy).

### Enable checklist

1. Private destination credentials in the host env (never commit).
2. Strong `BACKUP_ARCHIVE_PASSWORD` (AES zip encryption; `BACKUP_REQUIRE_ENCRYPTION=true`).
3. `BACKUP_NOTIFICATION_MAIL` + working `MAIL_*` (failures also emit `backup.run.failed` / Sentry when DSN set).
4. For MySQL dumps from the app host: `mysqldump` on PATH (or `BACKUP_DB_DUMP_BINARY_PATH`). If the Cloud runtime has no dump binary, keep relying on Layer 1 for DB and use `php artisan mutqin:backup --only-files` only after verifying the binary situation.
5. Enable the **Laravel Cloud scheduler**.
6. Set `MUTQIN_BACKUP_ENABLED=true`.
7. Run `php artisan mutqin:backup-health` then a one-off `php artisan mutqin:backup`.

Schedule (UTC, when enabled):

- `01:00` — `backup:clean`
- `01:30` — `mutqin:backup`
- `02:00` — `backup:monitor`

## Failure monitoring

- Spatie failure notifications → `BACKUP_NOTIFICATION_MAIL` (when set).
- `App\Listeners\LogBackupEvents` → structured logs (`backup.run.failed`, `backup.monitor.unhealthy`, …) and `report()` → Sentry when configured.
- Scheduler `onFailure` hooks log `backup.schedule.*_failed`.

## Restore procedure

### A. Database via Laravel Cloud snapshot

1. In the database cluster → Backups → **Restore** the chosen snapshot into a **new** cluster (do not overwrite production blindly).
2. Attach the restored database to a **staging** environment (or temporarily point staging `DB_*` at it).
3. Run staging verification (below).
4. Only after verification, plan production cutover (maintenance window, swap DB attachment / credentials, `php artisan config:cache`, `queue:restart`).

### B. Database via Spatie archive

1. Download the encrypted zip from the private backup bucket (Cyberduck / AWS CLI with the backup credentials).
2. Unzip with `BACKUP_ARCHIVE_PASSWORD`.
3. Restore the `.sql` dump into a staging MySQL instance (`mysql … < dump.sql`). Prefer a fresh schema.
4. Point staging at that database and verify.

### C. Feedback screenshots

1. From the Spatie zip: restore files under `feedback-screenshots/` onto the staging `MUTQIN_USER_FILES_DISK`.
2. Or sync from the production private user-files bucket into staging’s private bucket.
3. Open an admin feedback item that has a screenshot and confirm it loads.

## Staging restore verification

On a staging environment that is **not** serving real users:

1. `php artisan migrate --force` against the restored DB (should be no-op or additive only).
2. `php artisan mutqin:deploy-preflight` — expect green checks; demo accounts off if this host has real-like data.
3. Sign in (Google or a known staging user) → Memorisation loads prior state (`GET /api/state`).
4. Admin → Feedback: list items, open a screenshot if present.
5. Spot-check billing customer ids / subscription flags if Stripe test data exists.
6. Confirm no public URL lists the backup bucket or screenshot objects without auth.
7. Record the snapshot/archive id and time in the incident / change notes.

## Commands

```bash
php artisan mutqin:backup-health          # config readiness (does not prove Cloud snapshots exist)
php artisan mutqin:backup                 # encrypted archive (requires MUTQIN_BACKUP_ENABLED=true)
php artisan mutqin:backup --only-db
php artisan mutqin:backup --only-files
php artisan backup:list                   # Spatie listing on BACKUP_DISK
php artisan backup:monitor
php artisan mutqin:deploy-preflight --require-backup
```

## Secrets

Never commit `BACKUP_ARCHIVE_PASSWORD`, `BACKUP_AWS_*`, production `DB_*`, or Object Storage keys. Placeholders live only in `.env.example`.
