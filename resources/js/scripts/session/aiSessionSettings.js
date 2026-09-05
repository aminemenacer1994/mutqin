/**
 * Per-user AI Recite + AMD (Check memorisation) settings.
 * Server is source of truth when authenticated; local cache is user-scoped.
 */

import { userScopedMutqinKey } from '../../utils/mutqinStorageKeys.js'
import {
  AMD_DIFFICULTY_PREF_KEY,
  DEFAULT_DIFFICULTY_PERCENT,
  DIFFICULTY_PERCENTS,
  normaliseDifficultyPercent,
} from '../memorisationDetection/hiddenWords.js'
import {
  AMD_MISTAKE_SOUND_PREF_KEY,
  MISTAKE_HANDLING_MODES,
  normaliseMistakeSoundEnabled,
} from '../memorisationDetection/mistakeFeedback.js'

export const AI_SESSION_SETTINGS_STORAGE_SUFFIX = 'aiSessionSettings'

export const AMD_HIDE_PERCENTS = Object.freeze([...DIFFICULTY_PERCENTS])

export const DEFAULT_AI_SESSION_SETTINGS = Object.freeze({
  ai_recite: Object.freeze({
    recall_mode_enabled: false,
    strict_progression: false,
    persist_mistakes: false,
  }),
  amd: Object.freeze({
    hide_percent: DEFAULT_DIFFICULTY_PERCENT,
    mistake_sound_enabled: true,
    mistake_handling_mode: MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW,
  }),
})

/**
 * @param {string|number|null|undefined} userId
 * @returns {string}
 */
export function aiSessionSettingsStorageKey(userId = 'guest') {
  return userScopedMutqinKey(AI_SESSION_SETTINGS_STORAGE_SUFFIX, userId)
}

/**
 * @param {unknown} value
 * @param {boolean} fallback
 * @returns {boolean}
 */
function toBool(value, fallback) {
  if (value === true || value === 1 || value === '1' || value === 'on' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'off' || value === 'false') return false
  if (value == null) return fallback
  return fallback
}

/**
 * Whitelist + normalise. Unknown keys are dropped; invalid values use defaults.
 * @param {unknown} raw
 * @returns {{
 *   ai_recite: {
 *     recall_mode_enabled: boolean,
 *     strict_progression: boolean,
 *     persist_mistakes: boolean,
 *   },
 *   amd: {
 *     hide_percent: 10|25|50|75|100,
 *     mistake_sound_enabled: boolean,
 *     mistake_handling_mode: string,
 *   },
 * }}
 */
export function normaliseAiSessionSettings(raw) {
  const defaults = DEFAULT_AI_SESSION_SETTINGS
  const src = raw && typeof raw === 'object' ? raw : {}
  const ai = src.ai_recite && typeof src.ai_recite === 'object' ? src.ai_recite : {}
  const amd = src.amd && typeof src.amd === 'object' ? src.amd : {}

  return {
    ai_recite: {
      recall_mode_enabled: toBool(ai.recall_mode_enabled, defaults.ai_recite.recall_mode_enabled),
      strict_progression: toBool(ai.strict_progression, defaults.ai_recite.strict_progression),
      persist_mistakes: toBool(ai.persist_mistakes, defaults.ai_recite.persist_mistakes),
    },
    amd: {
      hide_percent: normaliseDifficultyPercent(
        amd.hide_percent ?? defaults.amd.hide_percent,
      ),
      mistake_sound_enabled: normaliseMistakeSoundEnabled(
        amd.mistake_sound_enabled,
        defaults.amd.mistake_sound_enabled,
      ),
      mistake_handling_mode: MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW,
    },
  }
}

/**
 * @param {unknown} existing
 * @param {unknown} patch
 */
export function mergeAiSessionSettings(existing, patch) {
  const base = normaliseAiSessionSettings(existing)
  const src = patch && typeof patch === 'object' ? patch : {}
  const ai = src.ai_recite && typeof src.ai_recite === 'object' ? src.ai_recite : null
  const amd = src.amd && typeof src.amd === 'object' ? src.amd : null

  if (ai) {
    if (Object.prototype.hasOwnProperty.call(ai, 'recall_mode_enabled')) {
      base.ai_recite.recall_mode_enabled = toBool(ai.recall_mode_enabled, base.ai_recite.recall_mode_enabled)
    }
    if (Object.prototype.hasOwnProperty.call(ai, 'strict_progression')) {
      base.ai_recite.strict_progression = toBool(ai.strict_progression, base.ai_recite.strict_progression)
    }
    if (Object.prototype.hasOwnProperty.call(ai, 'persist_mistakes')) {
      base.ai_recite.persist_mistakes = toBool(ai.persist_mistakes, base.ai_recite.persist_mistakes)
    }
  }
  if (amd) {
    if (Object.prototype.hasOwnProperty.call(amd, 'hide_percent')) {
      const next = Number(amd.hide_percent)
      if (AMD_HIDE_PERCENTS.includes(next)) {
        base.amd.hide_percent = next
      }
    }
    if (Object.prototype.hasOwnProperty.call(amd, 'mistake_sound_enabled')) {
      base.amd.mistake_sound_enabled = normaliseMistakeSoundEnabled(
        amd.mistake_sound_enabled,
        base.amd.mistake_sound_enabled,
      )
    }
    if (Object.prototype.hasOwnProperty.call(amd, 'mistake_handling_mode')) {
      base.amd.mistake_handling_mode = MISTAKE_HANDLING_MODES.CONTINUE_AND_REVIEW
    }
  }
  return base
}

/**
 * @param {string|number|null|undefined} userId
 * @param {Storage|null} [storage]
 */
export function readLocalAiSessionSettings(userId = 'guest', storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return null
  try {
    const raw = storage.getItem(aiSessionSettingsStorageKey(userId))
    if (!raw) return null
    return normaliseAiSessionSettings(JSON.parse(raw))
  } catch {
    return null
  }
}

/**
 * @param {string|number|null|undefined} userId
 * @param {unknown} settings
 * @param {Storage|null} [storage]
 */
export function writeLocalAiSessionSettings(userId, settings, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return false
  try {
    storage.setItem(
      aiSessionSettingsStorageKey(userId),
      JSON.stringify(normaliseAiSessionSettings(settings)),
    )
    return true
  } catch {
    return false
  }
}

/**
 * One-time migration from unscoped mutqin.amd.* into the user-scoped store.
 * @param {string|number|null|undefined} userId
 * @param {Storage|null} [storage]
 */
export function migrateLegacyAmdPrefsIntoAiSessionSettings(
  userId = 'guest',
  storage = typeof localStorage !== 'undefined' ? localStorage : null,
) {
  if (!storage) {
    return { migrated: false, settings: null }
  }

  const existing = readLocalAiSessionSettings(userId, storage)
  let hideRaw = null
  let soundRaw = null
  try {
    hideRaw = storage.getItem(AMD_DIFFICULTY_PREF_KEY)
  } catch { /* ignore */ }
  try {
    soundRaw = storage.getItem(AMD_MISTAKE_SOUND_PREF_KEY)
  } catch { /* ignore */ }

  if (hideRaw == null && soundRaw == null) {
    return { migrated: false, settings: existing }
  }

  const patch = { amd: {} }
  if (hideRaw != null) {
    patch.amd.hide_percent = normaliseDifficultyPercent(hideRaw)
  }
  if (soundRaw != null) {
    patch.amd.mistake_sound_enabled = normaliseMistakeSoundEnabled(soundRaw, true)
  }

  const merged = mergeAiSessionSettings(existing || DEFAULT_AI_SESSION_SETTINGS, patch)
  writeLocalAiSessionSettings(userId, merged, storage)

  try { storage.removeItem(AMD_DIFFICULTY_PREF_KEY) } catch { /* ignore */ }
  try { storage.removeItem(AMD_MISTAKE_SOUND_PREF_KEY) } catch { /* ignore */ }

  return { migrated: true, settings: merged }
}

/**
 * Resolve settings: bootstrap (auth) → local scoped → defaults.
 * Migrates legacy AMD keys once.
 *
 * @param {{
 *   userId?: string|number|null,
 *   bootstrap?: unknown,
 *   storage?: Storage|null,
 * }} [options]
 */
export function resolveAiSessionSettings(options = {}) {
  const userId = options.userId != null && String(options.userId).trim() !== ''
    ? options.userId
    : 'guest'
  const storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)

  migrateLegacyAmdPrefsIntoAiSessionSettings(userId, storage)

  if (options.bootstrap != null) {
    const fromBootstrap = normaliseAiSessionSettings(options.bootstrap)
    writeLocalAiSessionSettings(userId, fromBootstrap, storage)
    return fromBootstrap
  }

  const local = readLocalAiSessionSettings(userId, storage)
  if (local) return local
  return normaliseAiSessionSettings(DEFAULT_AI_SESSION_SETTINGS)
}

/**
 * Whether AMD hide% should rebuild the live mask immediately.
 * Deferred while listening / starting / processing so a running check is not disrupted.
 *
 * @param {string|null|undefined} amdStage
 * @param {boolean} [amdOpen]
 * @returns {boolean}
 */
export function shouldApplyAmdHidePercentImmediately(amdStage, amdOpen = true) {
  if (!amdOpen) return true
  const stage = String(amdStage || '')
  return !['listening', 'starting', 'processing', 'analysing'].includes(stage)
}

/**
 * Persist locally and PATCH the server when authenticated.
 *
 * @param {{
 *   userId?: string|number|null,
 *   authenticated?: boolean,
 *   patch: unknown,
 *   current?: unknown,
 *   storage?: Storage|null,
 *   fetchImpl?: typeof fetch,
 * }} options
 */
export async function persistAiSessionSettings(options = {}) {
  const userId = options.userId != null && String(options.userId).trim() !== ''
    ? options.userId
    : 'guest'
  const storage = options.storage ?? (typeof localStorage !== 'undefined' ? localStorage : null)
  const merged = mergeAiSessionSettings(options.current, options.patch)
  writeLocalAiSessionSettings(userId, merged, storage)

  const authenticated = options.authenticated === true
    || (typeof window !== 'undefined' && !!window.mutqinAuthCheck)
  if (!authenticated) {
    return { settings: merged, synced: false }
  }

  const fetchImpl = options.fetchImpl
    || (typeof fetch !== 'undefined' ? fetch : null)
  if (!fetchImpl) {
    return { settings: merged, synced: false }
  }

  try {
    const csrf = typeof document !== 'undefined'
      ? document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
      : null
    const response = await fetchImpl('/api/profile/ai-session-settings', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify(options.patch || {}),
    })
    if (!response.ok) {
      return { settings: merged, synced: false }
    }
    const data = await response.json()
    const normalised = normaliseAiSessionSettings(data)
    writeLocalAiSessionSettings(userId, normalised, storage)
    return { settings: normalised, synced: true }
  } catch {
    return { settings: merged, synced: false }
  }
}
