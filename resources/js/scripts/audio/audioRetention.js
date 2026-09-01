/**
 * Learner audio retention helpers.
 * Enforces never / temporary / retain for client-side blobs and synced library entries.
 * Never include raw audio in logs or sync backups accidentally.
 */

import { readAudioPrivacyConfig } from './aiAudioConsent.js'

export const RAW_AUDIO_FIELD_KEYS = Object.freeze([
  'audioBlob',
  'audioSrc',
  'audio_src',
  'blob',
  'recordingBlob',
  'recording_blob',
  'rawAudio',
  'raw_audio',
  'pcm',
  'chunks',
])

/**
 * @returns {'never'|'temporary'|'retain'}
 */
export function rawRecordingRetentionMode() {
  return readAudioPrivacyConfig().raw_recording_retention
}

/**
 * @returns {number}
 */
export function temporaryRecordingTtlMs() {
  return Math.max(1, readAudioPrivacyConfig().temporary_ttl_hours) * 60 * 60 * 1000
}

/**
 * @param {Record<string, unknown>} entry
 * @param {{ now?: number, ttlMs?: number }} [options]
 * @returns {boolean}
 */
export function isTemporaryAudioExpired(entry = {}, options = {}) {
  const now = Number.isFinite(options.now) ? options.now : Date.now()
  const ttlMs = Number.isFinite(options.ttlMs) ? options.ttlMs : temporaryRecordingTtlMs()
  const explicitExpiry = Date.parse(String(entry.audioExpiresAt || entry.expiresAt || ''))
  if (Number.isFinite(explicitExpiry)) return explicitExpiry <= now

  const stamped = Date.parse(String(
    entry.cachedAt
    || entry.savedAt
    || entry.recordedAt
    || entry.createdAt
    || '',
  ))
  if (!Number.isFinite(stamped)) return false
  return (stamped + ttlMs) <= now
}

/**
 * Strip raw audio fields for sync / localStorage / backup safety.
 *
 * @param {Record<string, unknown>} recording
 * @returns {Record<string, unknown>}
 */
export function stripRawAudioFields(recording = {}) {
  if (!recording || typeof recording !== 'object' || Array.isArray(recording)) return recording
  const next = { ...recording }
  for (const key of RAW_AUDIO_FIELD_KEYS) {
    if (!(key in next)) continue
    if (key === 'audioSrc' || key === 'audio_src') next[key] = ''
    else next[key] = null
  }
  // Drop large data-URL audioSrc variants that used a different key.
  for (const [key, value] of Object.entries(next)) {
    if (typeof value === 'string' && value.startsWith('data:audio')) {
      next[key] = ''
    }
  }
  return next
}

/**
 * Prepare an IndexedDB / history payload according to retention mode.
 * - never: remove audio blobs before write
 * - temporary: keep blob + stamp expiry
 * - retain: keep blob without forced expiry
 *
 * @param {Record<string, unknown>} entry
 * @param {{ mode?: string, now?: Date }} [options]
 * @returns {Record<string, unknown>}
 */
export function prepareAudioRetentionPayload(entry = {}, options = {}) {
  const mode = options.mode || rawRecordingRetentionMode()
  const now = options.now instanceof Date ? options.now : new Date()
  const base = { ...entry }

  if (mode === 'never') {
    return stripRawAudioFields(base)
  }

  if (mode === 'temporary') {
    const ttlMs = temporaryRecordingTtlMs()
    return {
      ...base,
      cachedAt: base.cachedAt || now.toISOString(),
      audioExpiresAt: new Date(now.getTime() + ttlMs).toISOString(),
    }
  }

  return base
}

/**
 * After processing success or failure: decide whether the in-memory / cache audio should be dropped.
 *
 * @param {{ mode?: string, failed?: boolean }} [options]
 * @returns {boolean} true when caller should discard blobs immediately
 */
export function shouldDiscardAudioAfterProcessing(options = {}) {
  const mode = options.mode || rawRecordingRetentionMode()
  if (mode === 'never') return true
  // Temporary + retain may keep a short-lived local copy for review; failures still drop ephemeral chunks.
  if (options.failed && mode === 'temporary') return true
  return false
}

/**
 * Filter IDB-like entries, removing expired temporary audio payloads.
 *
 * @param {Array<Record<string, unknown>>} entries
 * @param {{ mode?: string, now?: number, ttlMs?: number }} [options]
 * @returns {{ kept: Array<Record<string, unknown>>, removed: number }}
 */
export function sweepExpiredAudioEntries(entries = [], options = {}) {
  const mode = options.mode || rawRecordingRetentionMode()
  const list = Array.isArray(entries) ? entries : []
  if (mode === 'retain') {
    return { kept: list.slice(), removed: 0 }
  }
  if (mode === 'never') {
    const kept = list.map(entry => stripRawAudioFields(entry))
    return { kept, removed: list.length }
  }

  let removed = 0
  const kept = []
  for (const entry of list) {
    if (!entry || typeof entry !== 'object') continue
    if (isTemporaryAudioExpired(entry, options)) {
      removed += 1
      kept.push(stripRawAudioFields(entry))
      continue
    }
    kept.push(entry)
  }
  return { kept, removed }
}

/**
 * Safe technical log context — never includes audio payloads.
 *
 * @param {Record<string, unknown>} [context]
 * @returns {Record<string, unknown>}
 */
export function sanitizeAudioLogContext(context = {}) {
  const next = { ...context }
  for (const key of RAW_AUDIO_FIELD_KEYS) {
    delete next[key]
  }
  delete next.transcript
  delete next.notes
  delete next.note
  return next
}
