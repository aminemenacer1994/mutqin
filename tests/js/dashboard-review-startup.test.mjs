import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(
  source,
  /canStartSession\(\) \{[\s\S]{0,900}dashboard review[\s\S]{0,900}!this\.chainingEnabled/,
  'a ready dashboard review must be allowed to start before bootstrap flips appReady',
)
assert.doesNotMatch(
  source,
  /canStartSession\(\) \{[\s\S]{0,180}this\.appReady/,
  'appReady is set after dashboard intent consumption and must not block it',
)
assert.match(
  source,
  /entry\.review[\s\S]{0,900}autoStart:\s*true/,
  'dashboard due and practice links must still request a revision auto-start',
)

console.log('dashboard-review-startup.test.mjs: ok')
