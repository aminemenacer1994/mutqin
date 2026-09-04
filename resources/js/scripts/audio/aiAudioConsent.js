/**
 * AI microphone / processing consent helpers.
 * Registration shows a one-time consent modal; AI Recite does not re-open it.
 */

export const AI_AUDIO_CONSENT_STORAGE_KEY = 'mutqin.aiAudioConsent'

export const AI_AUDIO_CONSENT_STATUS = Object.freeze({
  ACCEPTED: 'accepted',
  DECLINED: 'declined',
})

/**
 * @returns {{
 *   policy_version: string,
 *   processor_name: string,
 *   raw_recording_retention: string,
 *   temporary_ttl_hours: number,
 *   privacy_policy_url: string
 * }}
 */
export function readAudioPrivacyConfig() {
  const raw = typeof window !== 'undefined' ? window.mutqinAudioPrivacy : null
  const policyVersion = String(raw?.policy_version || '2026-09-01').trim() || '2026-09-01'
  const processorName = String(raw?.processor_name || 'Speechmatics').trim() || 'Speechmatics'
  const retention = String(raw?.raw_recording_retention || 'temporary').trim().toLowerCase()
  const ttl = Number(raw?.temporary_ttl_hours)
  return {
    policy_version: policyVersion,
    processor_name: processorName,
    raw_recording_retention: ['never', 'temporary', 'retain'].includes(retention) ? retention : 'temporary',
    temporary_ttl_hours: Number.isFinite(ttl) && ttl > 0 ? Math.floor(ttl) : 24,
    privacy_policy_url: String(raw?.privacy_policy_url || '/privacy').trim() || '/privacy',
  }
}

/**
 * @param {string|number|null|undefined} userId
 * @returns {string}
 */
export function aiAudioConsentStorageKey(userId = 'guest') {
  const id = userId != null && String(userId).trim() !== '' ? String(userId) : 'guest'
  return `${AI_AUDIO_CONSENT_STORAGE_KEY}.${id}`
}

/**
 * @param {unknown} value
 * @returns {{ status: string|null, version: string|null, acceptedAt: string|null }|null}
 */
export function normalizeConsentRecord(value) {
  if (!value || typeof value !== 'object') return null
  const status = String(value.status || value.ai_audio_consent_status || '').trim().toLowerCase()
  const version = String(value.version || value.ai_audio_consent_version || value.policy_version || '').trim()
  const acceptedAt = String(value.acceptedAt || value.accepted_at || value.ai_audio_consent_at || '').trim() || null
  if (!status && !version) return null
  return {
    status: status || null,
    version: version || null,
    acceptedAt,
  }
}

/**
 * One-time registration prompt: show only until the learner has answered once.
 *
 * @param {{ status?: string|null, version?: string|null }|null|undefined} record
 * @returns {boolean}
 */
export function needsRegistrationAiAudioConsent(record) {
  const normalized = normalizeConsentRecord(record)
  return !normalized?.status
}

/** @deprecated Use needsRegistrationAiAudioConsent — kept for older call sites/tests. */
export function needsAiAudioConsent(record, _policyVersion) {
  return needsRegistrationAiAudioConsent(record)
}

/**
 * Explicit decline blocks AI mic features; unanswered (legacy) does not.
 *
 * @param {{ status?: string|null }|null|undefined} record
 * @returns {boolean}
 */
export function isAiAudioConsentDeclined(record) {
  return normalizeConsentRecord(record)?.status === AI_AUDIO_CONSENT_STATUS.DECLINED
}

/**
 * @param {string|number|null|undefined} userId
 * @returns {{ status: string|null, version: string|null, acceptedAt: string|null }|null}
 */
export function readLocalAiAudioConsent(userId = 'guest') {
  if (typeof localStorage === 'undefined') return null
  try {
    const raw = localStorage.getItem(aiAudioConsentStorageKey(userId))
    if (!raw) return null
    return normalizeConsentRecord(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * @param {string|number|null|undefined} userId
 * @param {{ status: string, version: string, acceptedAt?: string|null }} record
 */
export function writeLocalAiAudioConsent(userId, record) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(aiAudioConsentStorageKey(userId), JSON.stringify({
      status: record.status,
      version: record.version,
      acceptedAt: record.acceptedAt || new Date().toISOString(),
    }))
  } catch {
    // Ignore quota / private-mode failures — server snapshot still applies when authenticated.
  }
}

/**
 * Prefer server bootstrap snapshot for authenticated users; fall back to localStorage.
 *
 * @param {{ userId?: string|number|null, serverSnapshot?: unknown }} [options]
 * @returns {{ status: string|null, version: string|null, acceptedAt: string|null }|null}
 */
export function resolveAiAudioConsentRecord(options = {}) {
  const server = normalizeConsentRecord(options.serverSnapshot ?? (typeof window !== 'undefined' ? window.mutqinAiAudioConsent : null))
  if (server?.status) return server
  return readLocalAiAudioConsent(options.userId)
}

/**
 * @param {{ userId?: string|number|null, serverSnapshot?: unknown }} [options]
 * @returns {boolean}
 */
export function shouldPromptAiAudioConsent(options = {}) {
  return needsRegistrationAiAudioConsent(resolveAiAudioConsentRecord(options))
}

/**
 * @param {{ processorName?: string }} [options]
 * @returns {{ processorName: string, privacyPolicyUrl: string }}
 */
export function aiAudioConsentMeta(options = {}) {
  const config = readAudioPrivacyConfig()
  return {
    processorName: String(options.processorName || config.processor_name || 'Speechmatics'),
    privacyPolicyUrl: config.privacy_policy_url,
  }
}

/**
 * Persist an explicit accept/decline locally and on the server when signed in.
 *
 * @param {{
 *   accepted: boolean,
 *   userId?: string|number|null,
 *   fetchImpl?: typeof fetch,
 * }} options
 */
export async function persistAiAudioConsentDecision(options = {}) {
  const accepted = !!options.accepted
  const policyVersion = readAudioPrivacyConfig().policy_version
  const status = accepted ? AI_AUDIO_CONSENT_STATUS.ACCEPTED : AI_AUDIO_CONSENT_STATUS.DECLINED
  const record = {
    status,
    version: policyVersion,
    acceptedAt: new Date().toISOString(),
  }
  writeLocalAiAudioConsent(options.userId, record)

  const snapshot = {
    status: record.status,
    version: record.version,
    accepted_at: record.acceptedAt,
    policy_version: policyVersion,
    needs_consent: false,
  }

  if (typeof window !== 'undefined') {
    window.mutqinAiAudioConsent = snapshot
  }

  const authenticated = typeof window !== 'undefined' && !!window.mutqinAuthCheck
  if (!authenticated) {
    return { snapshot, synced: false }
  }

  const fetchImpl = options.fetchImpl
    || (typeof fetch !== 'undefined' ? fetch : null)

  if (!fetchImpl) {
    return { snapshot, synced: false }
  }

  try {
    const csrf = typeof document !== 'undefined'
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      : null
    const response = await fetchImpl('/api/profile/ai-audio-consent', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ accepted }),
    })
    if (!response.ok) {
      return { snapshot, synced: false }
    }
    const data = await response.json()
    if (typeof window !== 'undefined' && data) {
      window.mutqinAiAudioConsent = data
    }
    return { snapshot: data || snapshot, synced: true }
  } catch {
    return { snapshot, synced: false }
  }
}
