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
  root.style.setProperty('--font-ar', family)
  root.setAttribute('data-quran-font', normaliseQuranFontId(fontId))
  return family
}
