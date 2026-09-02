#!/usr/bin/env bash
# Mutqin production release DB stage.
# Safe path: preflight → migrate --force → queue:restart.
# Never runs migrate:fresh, db:wipe, migrate:refresh, or seeders.
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$ROOT"

STAGE="${MUTQIN_DEPLOY_STAGE:-${APP_ENV:-}}"

if [[ "${STAGE}" != "production" && "${STAGE}" != "prod" && "${STAGE}" != "staging" ]]; then
  echo "Refusing production migrate: set MUTQIN_DEPLOY_STAGE=production|staging (or APP_ENV) for the release stage." >&2
  echo "Current stage: '${STAGE:-<empty>}'" >&2
  exit 1
fi

echo "==> Deploy preflight (${STAGE})"
php artisan mutqin:deploy-preflight

echo "==> Running migrations (expand-only / backward-compatible expected)"
php artisan migrate --force

echo "==> Restarting queue workers (graceful — finishes current job, then exits)"
php artisan queue:restart

echo "==> Release DB stage complete"
