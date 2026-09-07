import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const csrf = readFileSync(join(root, 'resources/js/scripts/http/csrf.js'), 'utf8')
const voice = readFileSync(join(root, 'resources/js/scripts/askMutqin/voiceSession.js'), 'utf8')
const interpret = readFileSync(join(root, 'resources/js/scripts/askMutqin/interpretClient.js'), 'utf8')

assert.match(csrf, /buildCsrfHeaders/, 'shared CSRF header builder exists')
assert.match(csrf, /X-XSRF-TOKEN/, 'XSRF cookie is sent on requests')
assert.match(csrf, /ensureCsrfCookie/, 'Sanctum csrf-cookie refresh helper exists')
assert.match(csrf, /withCsrfRetry/, '419 retry helper exists')
assert.match(csrf, /force:\s*true/, '419 retry forces cookie refresh')

assert.match(voice, /buildCsrfHeaders|withCsrfRetry/, 'Ask Mutqin token fetch uses shared CSRF helpers')
assert.match(voice, /ensureCsrfCookie/, 'Ask Mutqin warms CSRF before transcription-token')
assert.doesNotMatch(
  voice,
  /const headers = \{[\s\S]*X-CSRF-TOKEN[\s\S]*const post = \(\) => axios\.post/,
  'Ask Mutqin no longer reuses a stale headers object across 419 retries',
)

assert.match(interpret, /withCsrfRetry/, 'Ask Mutqin interpret uses CSRF retry')
assert.match(interpret, /buildCsrfHeaders/, 'Ask Mutqin interpret rebuilds CSRF headers')

console.log('csrf-retry.test.mjs: ok')
