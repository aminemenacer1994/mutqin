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

if [[ "${MUTQIN_SKIP_ASSET_BUILD:-0}" != "1" ]]; then
  if ! command -v npm >/dev/null 2>&1; then
    echo "npm is required to compile Vue assets (public/js is not in git). Install Node or set MUTQIN_SKIP_ASSET_BUILD=1 if assets were built elsewhere." >&2
    exit 1
  fi
  echo "==> Building frontend assets (npm ci && npm run build)"
  npm ci
  npm run build
  if [[ ! -f public/mix-manifest.json ]]; then
    echo "Asset build failed: public/mix-manifest.json missing." >&2
    exit 1
  fi
else
  echo "==> Skipping asset build (MUTQIN_SKIP_ASSET_BUILD=1)"
  if [[ ! -f public/mix-manifest.json ]]; then
    echo "Warning: public/mix-manifest.json missing — deploy will serve stale or broken JS." >&2
  fi
fi

echo "==> Running migrations (expand-only / backward-compatible expected)"
php artisan migrate --force

echo "==> Restarting queue workers (graceful — finishes current job, then exits)"
php artisan queue:restart

echo "==> Release DB stage complete"
