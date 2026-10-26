/**
 * Mirrors {@link App\Services\Memorisation\QuranTextNormalizer} (quran-normalizer-v2).
 * Display ayah text stays canonical; this is for compare / alignment only.
 */

export const QURAN_NORMALIZER_VERSION = 'quran-normalizer-v2'

const TASHKEEL_RE = /[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g
const ALEF_VARIANTS_RE = /[إأآٱ]/g
const DISPLAY_STRIP_RE = /[^\u0621-\u064A\u0671\u0670\u064B-\u065F\u06D6-\u06ED\s]/g
const COMPARISON_STRIP_RE = /[^\u0621-\u064A\s]/g

/**
 * @param {string} text
 * @returns {string}
 */
export function normalizeComparisonText(text) {
  let value = String(text || '').replace(/\u0670/g, 'ا')
  value = value.replace(TASHKEEL_RE, '')
  value = value.replace(/\u0640/g, '')
  value = value.replace(ALEF_VARIANTS_RE, 'ا')
  value = value
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
  value = value.replace(/([او])ء/g, '$1')
  value = value.replace(/ء/g, '')
  value = value.replace(COMPARISON_STRIP_RE, ' ')
  value = value.replace(/\s+/g, ' ').trim()
  return value
}

/**
 * Whitespace word tokens from canonical display text (harakat preserved).
 *
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeDisplayText(text) {
  let cleaned = String(text || '').replace(/<[^>]+>/g, ' ')
  cleaned = cleaned.replace(DISPLAY_STRIP_RE, ' ')
  cleaned = cleaned.replace(/\s+/g, ' ').trim()
  if (!cleaned) return []
  return cleaned.split(/\s+/).filter(Boolean)
}

/**
 * @param {string} text
 * @returns {string[]}
 */
export function tokenizeComparisonText(text) {
  const normalized = normalizeComparisonText(text)
  if (!normalized) return []
  return normalized.split(' ').filter(Boolean)
}
