/**
 * Canonical browser storage keys for Mutqin (replaces legacy telawa.* prefix).
 * Run migrateTelawaLocalStorageKeys() once on workspace boot.
 */

export const MUTQIN_SCHEMA_VERSION_KEY = 'mutqin.schemaVersion'

export const ACTIVE_SESSION_SNAPSHOT_KEY = 'mutqin.activeSession.v1'

export const MODE_STORAGE_KEYS = {
  beginner: 'mutqin.mode.beginner',
  advanced: 'mutqin.mode.advanced',
  planner: 'mutqin.mode.planner',
}

export const SESSION_STORAGE_KEYS = {
  beginner: 'mutqin.sessionState.beginner',
  advanced: 'mutqin.sessionState.advanced',
  planner: 'mutqin.sessionState.planner',
}

export const CENTRAL_SESSION_STORAGE_KEY = 'mutqin.sessionState'

/** @type {Record<string, string>} */
export const STORAGE = Object.freeze({
  uiState: 'mutqin.uiState',
  continueSession: 'mutqin.continueSession',
  audioState: 'mutqin.audioState',
  defaultFontSize: 'mutqin.defaultFontSize',
  verseFontSizes: 'mutqin.verseFontSizes',
  masteredWeekly: 'mutqin.masteredWeekly',
  events: 'mutqin.events',
  planner: 'mutqin.planner',
  todayPlan: 'mutqin.todayPlan',
  metrics: 'mutqin.metrics',
  analytics: 'mutqin.analytics',
  activity: 'mutqin.activity',
  recordings: 'mutqin.recordings',
  recordingsLibrary: 'mutqin.recordingsLibrary',
  schemaVersion: MUTQIN_SCHEMA_VERSION_KEY,
})

/**
 * @param {string} key
 * @returns {string}
 */
export function mutqinStorageKey(key) {
  if (!key || typeof key !== 'string') return key
  if (key.startsWith('mutqin.')) return key
  if (key.startsWith('telawa.')) return key.replace(/^telawa\./, 'mutqin.')
  return key
}

/**
 * @param {string} suffix
 * @param {string|number|null|undefined} userId
 * @returns {string}
 */
export function userScopedMutqinKey(suffix, userId = 'guest') {
  const id = userId != null && String(userId).trim() !== '' ? String(userId) : 'guest'
  return `mutqin.${suffix}.${id}`
}

/**
 * Read JSON from localStorage using mutqin key, falling back to legacy telawa key.
 * @template T
 * @param {string} modernKey
 * @param {T} fallback
 * @returns {T}
 */
export function readLocalJson(modernKey, fallback = null) {
  if (typeof localStorage === 'undefined') return fallback
  const keys = [modernKey, mutqinStorageKey(modernKey)].filter((value, index, list) => list.indexOf(value) === index)
  for (const key of keys) {
    try {
      const raw = localStorage.getItem(key)
      if (raw) return JSON.parse(raw)
    } catch {
      // try next key
    }
  }
  return fallback
}

/**
 * @param {string} modernKey
 * @param {unknown} value
 */
export function writeLocalJson(modernKey, value) {
  if (typeof localStorage === 'undefined') return false
  try {
    localStorage.setItem(modernKey, JSON.stringify(value))
    const legacyKey = modernKey.startsWith('mutqin.')
      ? modernKey.replace(/^mutqin\./, 'telawa.')
      : null
    if (legacyKey && localStorage.getItem(legacyKey) != null) {
      localStorage.removeItem(legacyKey)
    }
    return true
  } catch {
    return false
  }
}

/**
 * One-time migration: copy telawa.* entries to mutqin.* and remove legacy keys.
 * @returns {{ migrated: number }}
 */
export function migrateTelawaLocalStorageKeys() {
  if (typeof localStorage === 'undefined') return { migrated: 0 }

  let migrated = 0
  const keys = []
  for (let index = 0; index < localStorage.length; index += 1) {
    const key = localStorage.key(index)
    if (key) keys.push(key)
  }

  for (const key of keys) {
    if (!key.startsWith('telawa.')) continue
    const nextKey = mutqinStorageKey(key)
    if (localStorage.getItem(nextKey) == null) {
      const value = localStorage.getItem(key)
      if (value != null) localStorage.setItem(nextKey, value)
    }
    localStorage.removeItem(key)
    migrated += 1
  }

  return { migrated }
}

/**
 * @param {string|number|null|undefined} userId
 * @returns {string}
 */
export function activeSessionSnapshotKey(userId = null) {
  const id = userId != null && String(userId).trim() !== '' ? String(userId) : 'guest'
  return `${ACTIVE_SESSION_SNAPSHOT_KEY}.${id}`
}
