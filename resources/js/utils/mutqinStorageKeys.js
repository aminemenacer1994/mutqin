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

/**
 * Unscoped legacy keys that must never bleed across accounts on the same browser.
 * Scoped caches (`mutqin_state:{userId}`, `mutqin.*.{userId}`, `*.u.{userId}`) are kept.
 */
export const SHARED_MUTQIN_LOCAL_STORAGE_KEYS = Object.freeze([
  STORAGE.uiState,
  STORAGE.continueSession,
  STORAGE.audioState,
  CENTRAL_SESSION_STORAGE_KEY,
  MODE_STORAGE_KEYS.beginner,
  MODE_STORAGE_KEYS.advanced,
  MODE_STORAGE_KEYS.planner,
  SESSION_STORAGE_KEYS.beginner,
  SESSION_STORAGE_KEYS.advanced,
  SESSION_STORAGE_KEYS.planner,
  STORAGE.defaultFontSize,
  STORAGE.verseFontSizes,
  STORAGE.masteredWeekly,
  STORAGE.events,
  STORAGE.planner,
  STORAGE.todayPlan,
  STORAGE.metrics,
  STORAGE.analytics,
  STORAGE.activity,
  STORAGE.recordings,
  STORAGE.recordingsLibrary,
  'mutqin_hifz_plan',
  'mutqin_hifz_app_state',
  'mutqin_hifz_plan_archives',
  'mutqin_ayah_progress',
  'mutqin_spaced_repetition_memory',
  'mutqin_sessions',
  'mutqin_ai_memorisation_checker',
  'mutqin.adaptiveAssessment.session',
  'mutqin.adaptiveAssessment.mastery',
  'mutqin.adaptiveAssessment.effectiveness',
  'mutqin.adaptiveAssessment.events',
  'mutqin.persistentWordWeakness',
  'mutqin.tajweedPractice.weaknessCounts.v1',
  'mutqin.practiceFocusWeakWords',
  'mutqin.dashboardEntryIntent.v1',
  'offline_surah_catalog',
  'migration_complete',
  'memorisation_state_v2',
])

export const SHARED_MUTQIN_SESSION_STORAGE_KEYS = Object.freeze([
  ACTIVE_SESSION_SNAPSHOT_KEY,
  'mutqin.practiceFocusWeakWords',
  'mutqin.dashboardEntryIntent.v1',
])

/**
 * Namespace a bare storage key for an owner. Already-scoped keys are returned unchanged.
 * @param {string} localKey
 * @param {string|number|null|undefined} userId
 * @returns {string}
 */
export function offlineScopedLocalKey(localKey, userId = 'guest') {
  if (!localKey || typeof localKey !== 'string') return localKey
  const id = userId != null && String(userId).trim() !== '' ? String(userId) : 'guest'
  if (localKey.endsWith(`.${id}`) || localKey.endsWith(`.u.${id}`)) return localKey
  if (localKey.startsWith('mutqin_state:')) return localKey
  return `${localKey}.${id}`
}

/**
 * Clear shared (unscoped) browser residue on logout / account switch.
 * Does NOT wipe per-user caches — User A's `mutqin_state:{id}` survives User B.
 * @param {{ localStorage?: Storage|null, sessionStorage?: Storage|null }} [stores]
 * @returns {{ localRemoved: number, sessionRemoved: number }}
 */
export function clearSharedMutqinBrowserResidue(stores = {}) {
  const local = stores.localStorage
    ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const session = stores.sessionStorage
    ?? (typeof sessionStorage !== 'undefined' ? sessionStorage : null)

  let localRemoved = 0
  let sessionRemoved = 0

  const removeExact = (store, key) => {
    if (!store || !key) return false
    try {
      if (store.getItem(key) == null) return false
      store.removeItem(key)
      return true
    } catch {
      return false
    }
  }

  for (const key of SHARED_MUTQIN_LOCAL_STORAGE_KEYS) {
    if (removeExact(local, key)) localRemoved += 1
  }
  for (const key of SHARED_MUTQIN_SESSION_STORAGE_KEYS) {
    if (removeExact(session, key)) sessionRemoved += 1
  }

  // Drop ephemeral offline_* blobs that are not user-suffixed.
  if (local) {
    try {
      const keys = []
      for (let index = 0; index < local.length; index += 1) {
        const key = local.key(index)
        if (key) keys.push(key)
      }
      for (const key of keys) {
        if (!key.startsWith('offline_surah_')) continue
        if (/\.\d+$/.test(key) || key.endsWith('.guest')) continue
        if (removeExact(local, key)) localRemoved += 1
      }
      for (const key of keys) {
        if (!key.startsWith('mutqin.apiCache.')) continue
        // Unscoped api cache entries look like mutqin.apiCache.{name} without a trailing user id.
        // Keep mutqin.apiCache.*.{userId} / .guest.
        if (/\.\d+$/.test(key) || key.endsWith('.guest')) continue
        if (removeExact(local, key)) localRemoved += 1
      }
    } catch {
      // ignore enumeration failures
    }
  }

  return { localRemoved, sessionRemoved }
}
