import assert from 'node:assert/strict'
import {
  AI_AUDIO_CONSENT_STATUS,
  isAiAudioConsentDeclined,
  needsAiAudioConsent,
  needsRegistrationAiAudioConsent,
  normalizeConsentRecord,
  shouldPromptAiAudioConsent,
  aiAudioConsentStorageKey,
} from '../../resources/js/scripts/audio/aiAudioConsent.js'
import {
  isTemporaryAudioExpired,
  prepareAudioRetentionPayload,
  shouldDiscardAudioAfterProcessing,
  stripRawAudioFields,
  sweepExpiredAudioEntries,
  sanitizeAudioLogContext,
} from '../../resources/js/scripts/audio/audioRetention.js'
import { resolveMicDeniedGuidance } from '../../resources/js/scripts/audio/recordingResilience.js'

// --- Consent: first registration only ---

assert.equal(needsRegistrationAiAudioConsent(null), true, 'first registration needs consent')
assert.equal(needsAiAudioConsent(null), true)
assert.equal(needsRegistrationAiAudioConsent({ status: AI_AUDIO_CONSENT_STATUS.DECLINED, version: '2026-09-01' }), false)
assert.equal(
  needsRegistrationAiAudioConsent({ status: AI_AUDIO_CONSENT_STATUS.ACCEPTED, version: '2026-09-01' }),
  false,
  'answered consent should not re-prompt',
)
assert.equal(
  needsRegistrationAiAudioConsent({ status: AI_AUDIO_CONSENT_STATUS.ACCEPTED, version: 'old' }),
  false,
  'policy version change must not re-open registration modal',
)
assert.equal(isAiAudioConsentDeclined({ status: 'declined' }), true)
assert.equal(isAiAudioConsentDeclined({ status: 'accepted' }), false)
assert.equal(isAiAudioConsentDeclined(null), false)

const normalized = normalizeConsentRecord({
  ai_audio_consent_status: 'accepted',
  ai_audio_consent_version: '2026-09-01',
  ai_audio_consent_at: '2026-09-01T12:00:00Z',
})
assert.equal(normalized.status, 'accepted')
assert.equal(normalized.version, '2026-09-01')

assert.equal(aiAudioConsentStorageKey(42), 'mutqin.aiAudioConsent.42')
assert.equal(aiAudioConsentStorageKey(null), 'mutqin.aiAudioConsent.guest')

assert.equal(
  shouldPromptAiAudioConsent({
    serverSnapshot: { status: 'accepted', version: 'stale' },
  }),
  false,
)
assert.equal(
  shouldPromptAiAudioConsent({
    serverSnapshot: null,
  }),
  true,
)

// --- Mic denied guidance ---

const safariGuidance = resolveMicDeniedGuidance((key) => key, {
  userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15',
})
assert.match(safariGuidance, /Safari|iPhone|Microphone/i)

const chromeGuidance = resolveMicDeniedGuidance((key) => key, {
  userAgent: 'Mozilla/5.0 Chrome/120.0.0.0 Safari/537.36',
})
assert.match(chromeGuidance, /Chrome|Microphone|site settings/i)

// --- Temporary-file / retention cleanup ---

const stripped = stripRawAudioFields({
  id: 'r1',
  audioSrc: 'data:audio/webm;base64,AAAA',
  audioBlob: { size: 12 },
  transcript: 'بسم',
})
assert.equal(stripped.audioSrc, '')
assert.equal(stripped.audioBlob, null)
assert.equal(stripped.transcript, 'بسم')

const neverPayload = prepareAudioRetentionPayload(
  { sessionId: 's1', audioBlob: 'blob', audioSrc: 'blob:http://x' },
  { mode: 'never' },
)
assert.equal(neverPayload.audioBlob, null)
assert.equal(neverPayload.audioSrc, '')

const tempPayload = prepareAudioRetentionPayload(
  { sessionId: 's1', audioBlob: 'blob' },
  { mode: 'temporary', now: new Date('2026-09-01T00:00:00Z') },
)
assert.ok(tempPayload.audioExpiresAt)
assert.equal(shouldDiscardAudioAfterProcessing({ mode: 'temporary', failed: true }), true)
assert.equal(shouldDiscardAudioAfterProcessing({ mode: 'temporary', failed: false }), false)
assert.equal(shouldDiscardAudioAfterProcessing({ mode: 'never', failed: false }), true)

const expired = {
  id: 'old',
  audioBlob: 'x',
  cachedAt: '2026-08-01T00:00:00Z',
}
const fresh = {
  id: 'new',
  audioBlob: 'y',
  cachedAt: '2026-09-01T12:00:00Z',
  audioExpiresAt: '2026-09-02T12:00:00Z',
}
assert.equal(isTemporaryAudioExpired(expired, { now: Date.parse('2026-09-01T13:00:00Z'), ttlMs: 3600_000 }), true)
const swept = sweepExpiredAudioEntries([expired, fresh], {
  mode: 'temporary',
  now: Date.parse('2026-09-01T13:00:00Z'),
  ttlMs: 24 * 3600_000,
})
assert.equal(swept.removed, 1)
assert.equal(swept.kept[0].audioBlob, null)
assert.equal(swept.kept[1].audioBlob, 'y')

const providerFailureSweep = sweepExpiredAudioEntries(
  [{ id: 'fail', audioBlob: 'pcm', cachedAt: '2020-01-01T00:00:00Z' }],
  { mode: 'temporary', now: Date.now(), ttlMs: 1 },
)
assert.equal(providerFailureSweep.removed, 1)
assert.equal(providerFailureSweep.kept[0].audioBlob, null)

const logSafe = sanitizeAudioLogContext({
  context: 'provider_failure',
  audioBlob: 'secret',
  transcript: 'secret-text',
  status: 503,
})
assert.equal(logSafe.audioBlob, undefined)
assert.equal(logSafe.transcript, undefined)
assert.equal(logSafe.status, 503)

console.log('ai-audio-consent-retention.test.mjs: ok')
