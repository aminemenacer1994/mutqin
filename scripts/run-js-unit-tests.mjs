#!/usr/bin/env node
/**
 * Runs all Node-based unit tests under tests/js/*.test.mjs.
 * Playwright / live-server suites are excluded (see npm run test:mutqin:mobile, etc.).
 */
import { spawnSync } from 'node:child_process'
import { readdirSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(fileURLToPath(new URL('.', import.meta.url)), '..')
const testsDir = join(root, 'tests/js')

/** Locale parity audits — run via npm run audit:i18n / audit:i18n:fr-es */
const LOCALE_AUDIT = new Set([
  'i18n-fr-es.test.mjs',
  'i18n-full-audit.test.mjs',
])

/** Requires pinned integrity fixtures under resources/quran/integrity/ — see npm run test:quran-integrity */
const INTEGRITY_FIXTURES = new Set([
  'quran-content-integrity.test.mjs',
])

/** Needs running app + Playwright — not unit tests. */
const INTEGRATION_ONLY = new Set([
  'mobile-horizontal-overflow.test.mjs',
  'mobile-scroll.test.mjs',
  'mutqin-mobile-responsive.test.mjs',
  'i18n-screens.test.mjs',
])

const extraExclude = (process.env.MUTQIN_JS_TEST_EXCLUDE || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean)

const files = readdirSync(testsDir)
  .filter((name) => name.endsWith('.test.mjs'))
  .filter((name) => !INTEGRATION_ONLY.has(name))
  .filter((name) => !LOCALE_AUDIT.has(name))
  .filter((name) => !INTEGRITY_FIXTURES.has(name))
  .filter((name) => !extraExclude.includes(name))
  .sort()

if (!files.length) {
  console.error('No JS unit test files found.')
  process.exit(1)
}

const noVm = new Set([
  'speechmatics-noise-vocabulary.test.mjs',
  'mutqin-controls-wiring.test.mjs',
  'madani-page-layout.test.mjs',
  'mushaf-session-only.test.mjs',
  'saved-sessions-tab-state.test.mjs',
  'word-by-word-meanings.test.mjs',
  'i18n-full-audit.test.mjs',
  'i18n-fr-es.test.mjs',
  'billing.test.mjs',
  'p2-combined-fixes.test.mjs',
  'amd-stt-stall-recovery.test.mjs',
  'amd-skip-hole-soft-continue.test.mjs',
  'voiceNoteLiveAnalyser.test.mjs',
  'mutashabihat-load-more.test.mjs',
])

let failed = 0
const failedFiles = []
for (const file of files) {
  const rel = join('tests/js', file)
  const args = noVm.has(file)
    ? [rel]
    : ['--experimental-vm-modules', rel]
  process.stdout.write(`\n▶ ${file}\n`)
  const result = spawnSync(process.execPath, args, {
    cwd: root,
    stdio: 'inherit',
    env: process.env,
  })
  if (result.status !== 0 || result.error) {
    failed += 1
    failedFiles.push(file)
    if (process.env.MUTQIN_JS_TEST_BAIL === '1') break
  }
}

console.log(`\n${files.length - failed}/${files.length} JS unit test files passed.`)
if (failed > 0) {
  console.error(`\n${failed} test file(s) failed:`)
  for (const name of failedFiles) console.error(`  - ${name}`)
  process.exit(1)
}
