import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const sanitize = await import(pathToFileURL(join(root, 'resources/js/scripts/observability/sanitizeErrorPayload.js')).href)

test('redacts passwords, tokens, audio, and scripture from client payloads', () => {
  const clean = sanitize.redactPayload({
    password: 'secret12',
    access_token: 'eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.signaturepart',
    reset_token: 'reset-me',
    raw_audio: 'data:audio/webm;base64,AAAA',
    user_id: 9,
    feature: 'memorisation',
    ayah: `${'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ '.repeat(8)}`,
  })

  assert.equal(clean.password, '[redacted]')
  assert.equal(clean.access_token, '[redacted]')
  assert.equal(clean.reset_token, '[redacted]')
  assert.equal(clean.raw_audio, '[redacted]')
  assert.equal(clean.user_id, 9)
  assert.equal(clean.feature, 'memorisation')
  assert.equal(clean.ayah, '[redacted]')
})

test('classifies feature areas and expected HTTP statuses', () => {
  assert.equal(sanitize.featureFromPath('/memorisation/transcription-token'), 'speechmatics')
  assert.equal(sanitize.featureFromPath('/memorisation'), 'memorisation')
  assert.equal(sanitize.featureFromPath('/api/admin/users'), 'admin')
  assert.equal(sanitize.isExpectedHttpStatus(422), true)
  assert.equal(sanitize.isExpectedHttpStatus(401), true)
  assert.equal(sanitize.isExpectedHttpStatus(429), false)
  assert.equal(sanitize.isExpectedHttpStatus(500), false)
  assert.equal(sanitize.shouldReportHttpFailure({ status: 422 }), false)
  assert.equal(sanitize.shouldReportHttpFailure({ status: 503 }), true)
  assert.equal(sanitize.shouldReportHttpFailure({ aborted: true }), false)
  assert.equal(sanitize.shouldReportHttpFailure({ offline: true, status: 0 }), false)
})

test('fingerprints matching events so layers can dedupe', () => {
  const first = sanitize.fingerprintEvent({
    kind: 'vue',
    name: 'TypeError',
    message: 'x is not a function',
    feature: 'memorisation',
    status: '',
    route: '/memorisation',
  })
  const second = sanitize.fingerprintEvent({
    kind: 'vue',
    name: 'TypeError',
    message: 'x is not a function',
    feature: 'memorisation',
    status: '',
    route: '/memorisation',
  })
  assert.equal(first, second)
})
