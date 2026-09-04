/**
 * Account-level Qur'an / mushaf / memorisation / audio defaults.
 * Writes the same uiState keys the workspace already persists, plus a
 * timestamp so Settings can overlay newer defaults onto synced state.
 */

import {
  MODE_STORAGE_KEYS,
  STORAGE,
  offlineScopedLocalKey,
  readLocalJson,
  writeLocalJson,
} from '../../utils/mutqinStorageKeys.js'
import {
  applyQuranFontCssVariable,
  normaliseQuranFontId,
} from '../quran/quranFonts.js'
import { DEFAULT_TAJWEED_ENABLED } from '../session/sessionDefaults.js'

const DEFAULT_RECITER_ID = 'ar.alafasy'

export const SETTINGS_RECITER_OPTIONS = Object.freeze([
  { id: 'ar.alafasy', name: 'Mishari Rashid al-Afasy', supportsWordHighlighting: true },
  { id: 'ar.abdulbasitmurattal', name: 'Abdul Basit (Murattal)', supportsWordHighlighting: true },
  { id: 'ar.abdurrahmaansudais', name: 'Abdur-Rahman as-Sudais', supportsWordHighlighting: true },
  { id: 'ar.hanirifai', name: 'Hani ar-Rifai', supportsWordHighlighting: true },
  { id: 'ar.husary', name: 'Mahmoud Khalil Al-Husary', supportsWordHighlighting: true },
  { id: 'ar.minshawi', name: 'Mohamed Siddiq al-Minshawi', supportsWordHighlighting: true },
  { id: 'ar.saoodshuraym', name: "Sa'ud ash-Shuraym", supportsWordHighlighting: true },
  { id: 'ar.shaatree', name: 'Abu Bakr ash-Shatri', supportsWordHighlighting: true },
  { id: 'ar.mahermuaiqly', name: 'Maher Al Muaiqly', supportsWordHighlighting: true },
  { id: 'ar.hudhaify', name: 'Ali Al-Hudhaify', supportsWordHighlighting: true },
  { id: 'ar.abdullahbasfar', name: 'Abdullah Basfar', supportsWordHighlighting: true },
  { id: 'ar.muhammadayyoub', name: 'Muhammad Ayyoub', supportsWordHighlighting: true },
  { id: 'ar.muhammadjibreel', name: 'Muhammad Jibreel', supportsWordHighlighting: true },
  { id: 'ar.ahmedajamy', name: 'Ahmed ibn Ali al-Ajamy', supportsWordHighlighting: true },
  { id: 'ar.husarymujawwad', name: 'Husary (Mujawwad)', supportsWordHighlighting: false },
  { id: 'ar.minshawimujawwad', name: 'Minshawi (Mujawwad)', supportsWordHighlighting: false },
  { id: 'ar.abdulsamad', name: 'Abdul Basit (Mujawwad)', supportsWordHighlighting: false },
  { id: 'ar.ibrahimakhbar', name: 'Ibrahim Akhdar', supportsWordHighlighting: false },
  { id: 'ar.parhizgar', name: 'Shahriar Parhizgar', supportsWordHighlighting: false },
  { id: 'ar.aymanswoaid', name: 'Ayman Sowaid', supportsWordHighlighting: false },
])

export const WORKSPACE_PREF_KEYS = Object.freeze([
  'quranFont',
  'tajweedEnabled',
  'showTranslation',
  'showTransliteration',
  'showWordByWord',
  'defaultFontSize',
  'fontScale',
  'uiScale',
  'mushafBorder',
  'focusModeEnabled',
  'blurModeEnabled',
  'blurIntensity',
  'chainingEnabled',
  'chainingMethod',
  'gapBetweenVerses',
  'customGapSeconds',
  'defaultReciterId',
  'defaultSpeed',
  'reduceMotion',
])

export const SPEED_OPTIONS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 2])
export const GAP_OPTIONS = Object.freeze(['none', '1x', '3s', '5s', 'custom'])
export const MUSHAF_BORDERS = Object.freeze(['classic', 'fine', 'layered', 'emerald', 'ink'])
export const CHAINING_METHODS = Object.freeze(['', 'linking', 'cumulative'])
export const FONT_SIZE_MIN = 70
export const FONT_SIZE_MAX = 280
export const FONT_SIZE_STEP = 10
export const UI_SCALE_OPTIONS = Object.freeze([1, 1.1, 1.2])

export const DEFAULT_WORKSPACE_PREFERENCES = Object.freeze({
  quranFont: 'uthmanic',
  tajweedEnabled: DEFAULT_TAJWEED_ENABLED,
  showTranslation: true,
  showTransliteration: false,
  showWordByWord: false,
  defaultFontSize: 150,
  fontScale: 1,
  uiScale: 1,
  mushafBorder: 'classic',
  focusModeEnabled: false,
  blurModeEnabled: false,
  blurIntensity: 10,
  chainingEnabled: false,
  chainingMethod: '',
  gapBetweenVerses: '1x',
  customGapSeconds: 2,
  defaultReciterId: DEFAULT_RECITER_ID,
  defaultSpeed: 1,
  reduceMotion: false,
  updatedAt: 0,
})

function toBool(value, fallback) {
  if (value === true || value === 1 || value === '1' || value === 'on' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'off' || value === 'false') return false
  return fallback
}

function clampNumber(value, min, max, fallback) {
  const n = Number(value)
  if (!Number.isFinite(n)) return fallback
  return Math.min(max, Math.max(min, n))
}

function knownReciterId(value) {
  const id = String(value || '').trim()
  return SETTINGS_RECITER_OPTIONS.some((item) => item.id === id) ? id : DEFAULT_RECITER_ID
}

/**
 * @param {unknown} raw
 */
export function normaliseWorkspacePreferences(raw) {
  const src = raw && typeof raw === 'object' ? raw : {}
  const chainingMethod = CHAINING_METHODS.includes(src.chainingMethod)
    ? src.chainingMethod
    : DEFAULT_WORKSPACE_PREFERENCES.chainingMethod

  return {
    quranFont: normaliseQuranFontId(src.quranFont),
    tajweedEnabled: toBool(src.tajweedEnabled, DEFAULT_WORKSPACE_PREFERENCES.tajweedEnabled),
    showTranslation: toBool(src.showTranslation, DEFAULT_WORKSPACE_PREFERENCES.showTranslation),
    showTransliteration: toBool(src.showTransliteration, DEFAULT_WORKSPACE_PREFERENCES.showTransliteration),
    showWordByWord: toBool(src.showWordByWord, DEFAULT_WORKSPACE_PREFERENCES.showWordByWord),
    defaultFontSize: clampNumber(
      src.defaultFontSize,
      FONT_SIZE_MIN,
      FONT_SIZE_MAX,
      DEFAULT_WORKSPACE_PREFERENCES.defaultFontSize,
    ),
    fontScale: clampNumber(src.fontScale, 0.9, 1.2, DEFAULT_WORKSPACE_PREFERENCES.fontScale),
    uiScale: UI_SCALE_OPTIONS.includes(Number(src.uiScale))
      ? Number(src.uiScale)
      : DEFAULT_WORKSPACE_PREFERENCES.uiScale,
    mushafBorder: MUSHAF_BORDERS.includes(src.mushafBorder)
      ? src.mushafBorder
      : DEFAULT_WORKSPACE_PREFERENCES.mushafBorder,
    focusModeEnabled: toBool(src.focusModeEnabled, false),
    blurModeEnabled: toBool(src.blurModeEnabled, false),
    blurIntensity: clampNumber(src.blurIntensity, 4, 18, DEFAULT_WORKSPACE_PREFERENCES.blurIntensity),
    chainingEnabled: toBool(src.chainingEnabled, false),
    chainingMethod,
    gapBetweenVerses: GAP_OPTIONS.includes(src.gapBetweenVerses)
      ? src.gapBetweenVerses
      : DEFAULT_WORKSPACE_PREFERENCES.gapBetweenVerses,
    customGapSeconds: clampNumber(src.customGapSeconds, 0.5, 10, DEFAULT_WORKSPACE_PREFERENCES.customGapSeconds),
    defaultReciterId: knownReciterId(src.defaultReciterId || src.reciterId),
    defaultSpeed: SPEED_OPTIONS.includes(Number(src.defaultSpeed ?? src.speed))
      ? Number(src.defaultSpeed ?? src.speed)
      : DEFAULT_WORKSPACE_PREFERENCES.defaultSpeed,
    reduceMotion: toBool(src.reduceMotion, false),
    updatedAt: Number.isFinite(Number(src.updatedAt)) ? Number(src.updatedAt) : 0,
  }
}

function pickPrefFields(source) {
  const normalised = normaliseWorkspacePreferences(source)
  const picked = {}
  for (const key of WORKSPACE_PREF_KEYS) {
    picked[key] = normalised[key]
  }
  picked.updatedAt = normalised.updatedAt
  return picked
}

function resolveOwnerId(userId) {
  if (userId != null && String(userId).trim() !== '') return String(userId)
  if (typeof window !== 'undefined' && window.mutqinUserId != null) {
    return String(window.mutqinUserId)
  }
  return 'guest'
}

function uiStateKeys(userId) {
  const owner = resolveOwnerId(userId)
  return [
    offlineScopedLocalKey(STORAGE.uiState, owner),
    STORAGE.uiState,
  ].filter((key, index, list) => list.indexOf(key) === index)
}

function readUiStateBlob(userId) {
  for (const key of uiStateKeys(userId)) {
    const value = readLocalJson(key, null)
    if (value && typeof value === 'object') return { key, value }
  }
  return { key: uiStateKeys(userId)[0], value: {} }
}

/**
 * @param {string|number|null|undefined} userId
 */
export function readWorkspacePreferences(userId = null) {
  const { value } = readUiStateBlob(userId)
  return pickPrefFields(value)
}

/**
 * @param {unknown} patch
 * @param {{ userId?: string|number|null }} [options]
 */
export function patchWorkspacePreferences(patch, options = {}) {
  const userId = options.userId ?? null
  const current = readWorkspacePreferences(userId)
  const next = pickPrefFields({
    ...current,
    ...(patch && typeof patch === 'object' ? patch : {}),
    updatedAt: Date.now(),
  })

  const { value: existing } = readUiStateBlob(userId)
  const merged = {
    ...(existing && typeof existing === 'object' ? existing : {}),
    ...next,
    reciterId: next.defaultReciterId,
    speed: next.defaultSpeed,
  }

  for (const key of uiStateKeys(userId)) {
    writeLocalJson(key, merged)
  }

  patchModeAudioDefaults(next.defaultReciterId, next.defaultSpeed, userId)
  applyWorkspacePreferenceSideEffects(next)
  return next
}

export function resetWorkspacePreferences(options = {}) {
  return patchWorkspacePreferences({
    ...DEFAULT_WORKSPACE_PREFERENCES,
    updatedAt: Date.now(),
  }, options)
}

function patchModeAudioDefaults(reciterId, speed, userId) {
  const owner = resolveOwnerId(userId)
  for (const mode of Object.keys(MODE_STORAGE_KEYS)) {
    const rawKey = MODE_STORAGE_KEYS[mode]
    const keys = [
      offlineScopedLocalKey(rawKey, owner),
      rawKey,
    ].filter((key, index, list) => list.indexOf(key) === index)

    for (const key of keys) {
      const existing = readLocalJson(key, null)
      const base = existing && typeof existing === 'object' ? existing : {}
      writeLocalJson(key, {
        ...base,
        reciterId,
        speed,
        prefsAppliedAt: Date.now(),
      })
    }
  }
}

/**
 * Merge newer Settings defaults onto a workspace uiState snapshot.
 * @param {object|null} state
 * @param {string|number|null|undefined} userId
 */
export function applyWorkspacePreferenceOverlay(state, userId = null) {
  const overlay = readWorkspacePreferences(userId)
  if (!overlay.updatedAt) return state
  const applied = Number(state?.prefsAppliedAt || 0)
  if (overlay.updatedAt <= applied) return state

  const next = state && typeof state === 'object' ? { ...state } : {}
  for (const key of WORKSPACE_PREF_KEYS) {
    if (key === 'defaultReciterId' || key === 'defaultSpeed' || key === 'reduceMotion') continue
    next[key] = overlay[key]
  }
  next.prefsAppliedAt = overlay.updatedAt
  return next
}

/**
 * @param {object|null} modeState
 * @param {string|number|null|undefined} userId
 */
export function applyAudioDefaultsToModeState(modeState, userId = null) {
  const overlay = readWorkspacePreferences(userId)
  if (!overlay.updatedAt) return modeState
  const applied = Number(modeState?.prefsAppliedAt || 0)
  if (overlay.updatedAt <= applied) return modeState
  const next = modeState && typeof modeState === 'object' ? { ...modeState } : {}
  next.reciterId = overlay.defaultReciterId
  next.speed = overlay.defaultSpeed
  next.prefsAppliedAt = overlay.updatedAt
  return next
}

export function applyWorkspacePreferenceSideEffects(prefs) {
  const normalised = normaliseWorkspacePreferences(prefs)
  applyQuranFontCssVariable(normalised.quranFont)
  if (typeof document === 'undefined') return normalised
  const root = document.documentElement
  root.style.setProperty('--ui-scale', String(normalised.uiScale))
  if (normalised.reduceMotion) {
    root.setAttribute('data-reduce-motion', '1')
  } else {
    root.removeAttribute('data-reduce-motion')
  }
  return normalised
}

