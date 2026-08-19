/**
 * Build i18n-workspace-patches.mjs from pending keys and translation pipeline.
 * Usage: node scripts/i18n-build-workspace-patches.mjs
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'

const script = path.resolve('scripts/_build-all-patches.mjs')
const result = spawnSync(process.execPath, [script], { stdio: 'inherit' })
process.exit(result.status ?? 1)
