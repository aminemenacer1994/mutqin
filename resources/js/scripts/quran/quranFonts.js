/**
 * Canonical Qur’anic font preference for Mushaf + stacked layouts.
 * Keep this as the single mapping source — do not duplicate stacks elsewhere.
 */

export const QURAN_FONT_IDS = Object.freeze([
  'uthmanic',
  'amiri',
  'naskh',
  'scheherazade',
  'lateef',
])

export const QURAN_FONT_DEFAULT = 'uthmanic'

/** Arabic-friendly fallback after the selected family. */
export const QURAN_FONT_FALLBACK =
  "'Amiri Quran', 'Amiri', 'Noto Naskh Arabic', 'Traditional Arabic', serif"

/**
 * Mixed/UI Arabic (labels, chrome, Latin+Arabic strings).
 * Never put a Quran-only face here — KFGQPC Uthmanic Hafs has a ~0 Latin space,
 * so "Change Quran font" paints as "CHANGEQURANFONT".
 */
export const QURAN_UI_ARABIC_FONT =
  `'Amiri', 'Noto Naskh Arabic', 'Scheherazade New', serif`

/**
 * @type {Readonly<Record<string, string>>}
 */
export const QURAN_FONT_FAMILIES = Object.freeze({
  amiri: `'Amiri Quran', 'Amiri', 'Noto Naskh Arabic', serif`,
  naskh: `'Noto Naskh Arabic', 'Amiri', serif`,
  scheherazade: `'Scheherazade New', 'Noto Naskh Arabic', serif`,
  lateef: `'Lateef', 'Amiri', serif`,
  uthmanic: `'KFGQPC Uthmanic Script HAFS', 'UthmanicHafs', 'Amiri Quran', 'Amiri', 'Noto Naskh Arabic', serif`,
})

/**
 * Primary family name used for FontFace loading / document.fonts checks.
 * @type {Readonly<Record<string, string>>}
 */
export const QURAN_FONT_PRIMARY = Object.freeze({
  amiri: 'Amiri Quran',
  naskh: 'Noto Naskh Arabic',
  scheherazade: 'Scheherazade New',
  lateef: 'Lateef',
  uthmanic: 'UthmanicHafs',
})

/**
 * @param {unknown} value
 * @returns {string}
 */
export function normaliseQuranFontId(value) {
  const raw = String(value || '').trim().toLowerCase()
  // Historical seed typo: script edition id "uthmani" vs font id "uthmanic"
  if (raw === 'uthmani') return 'uthmanic'
  return QURAN_FONT_IDS.includes(raw) ? raw : QURAN_FONT_DEFAULT
}

/**
 * @param {unknown} fontId
 * @returns {string}
 */
export function resolveQuranFontFamily(fontId) {
  const id = normaliseQuranFontId(fontId)
  return QURAN_FONT_FAMILIES[id] || QURAN_FONT_FAMILIES[QURAN_FONT_DEFAULT]
}

/**
 * Apply the selected Qur’anic font as a document CSS variable so all layouts
 * (stacked, mushaf, post-session Arabic) share one source of truth.
 * @param {unknown} fontId
 * @param {ParentNode|Document|null} [root]
 */
export function applyQuranFontCssVariable(fontId, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root || typeof root.style?.setProperty !== 'function') return resolveQuranFontFamily(fontId)
  const family = resolveQuranFontFamily(fontId)
  root.style.setProperty('--quran-font', family)
  // Reset any previous leak. --font-ar is UI Arabic, not the Mushaf face.
  root.style.setProperty('--font-ar', QURAN_UI_ARABIC_FONT)
  root.setAttribute('data-quran-font', normaliseQuranFontId(fontId))
  return family
}

/**
 * Mark whether the selected Qur’an font face is ready so CSS can hide ayah
 * text until the correct face paints (avoids fallback flash).
 * @param {boolean} ready
 * @param {ParentNode|Document|null} [root]
 */
export function setQuranFontReadyAttribute(ready, root = typeof document !== 'undefined' ? document.documentElement : null) {
  if (!root || typeof root.setAttribute !== 'function') return
  if (ready) root.setAttribute('data-quran-font-ready', '1')
  else root.removeAttribute('data-quran-font-ready')
}

function safeParseJson(raw) {
  if (!raw || typeof raw !== 'string') return null
  try {
    const value = JSON.parse(raw)
    return value && typeof value === 'object' ? value : null
  } catch {
    return null
  }
}

function readQuranFontFromStorageKey(storage, key) {
  if (!storage || !key) return null
  try {
    const blob = safeParseJson(storage.getItem(key))
    if (!blob || blob.quranFont == null) return null
    return normaliseQuranFontId(blob.quranFont)
  } catch {
    return null
  }
}

/**
 * Resolve the persisted Qur’anic font preference synchronously so the first
 * paint uses the user's choice (not the component default).
 * @param {{ userId?: string|number|null, storage?: Storage|null }} [options]
 * @returns {string}
 */
export function readPersistedQuranFontId(_options = {}) {
  // Product lock: Mushaf/stacked Arabic always uses Uthmanic Hafs (QCF).
  return QURAN_FONT_DEFAULT
}

/**
 * Apply the persisted font CSS variables as early as possible (before Vue
 * hydrates Memorisation), so CSS consumers never briefly use another Mutqin font.
 * @param {{ userId?: string|number|null, storage?: Storage|null, root?: Element|null }} [options]
 * @returns {string}
 */
export function bootPersistedQuranFont(options = {}) {
  const fontId = readPersistedQuranFontId(options)
  applyQuranFontCssVariable(fontId, options.root)
  setQuranFontReadyAttribute(false, options.root)
  return fontId
}

/**
 * Wait until the selected Qur’an font face is available (or timeout).
 * Does not block the rest of the page — callers gate ayah text only.
 * @param {unknown} fontId
 * @param {{ timeoutMs?: number, documentRef?: Document }} [options]
 * @returns {Promise<boolean>}
 */
export async function ensureQuranFontFacesLoaded(fontId, options = {}) {
  const id = normaliseQuranFontId(fontId)
  const primary = QURAN_FONT_PRIMARY[id] || QURAN_FONT_PRIMARY[QURAN_FONT_DEFAULT]
  const doc = options.documentRef
    ?? (typeof document !== 'undefined' ? document : null)
  const timeoutMs = Number.isFinite(options.timeoutMs) ? options.timeoutMs : 2500

  if (!doc?.fonts?.load) {
    setQuranFontReadyAttribute(true)
    return true
  }

  const probe = `48px "${primary}"`
  let settled = false
  const markReady = (ok) => {
    if (settled) return ok
    settled = true
    setQuranFontReadyAttribute(true)
    return ok
  }

  try {
    const loadPromise = doc.fonts.load(probe).then(() => true).catch(() => false)
    const timeoutPromise = new Promise((resolve) => {
      setTimeout(() => resolve(false), Math.max(0, timeoutMs))
    })
    const loaded = await Promise.race([loadPromise, timeoutPromise])
    if (loaded || doc.fonts.check?.(probe)) return markReady(true)
    // Soft timeout: still reveal text so a slow CDN cannot blank ayahs forever.
    return markReady(true)
  } catch {
    return markReady(true)
  }
}
