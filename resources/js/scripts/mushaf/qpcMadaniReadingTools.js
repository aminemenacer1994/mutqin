import { qcfFontFamily } from './qcfFontLoader.js'

/**
 * QPC page layout (KFGQPC V2) + Quran.com code_v2 coloured QCF v4 fonts per word location.
 */
export const QPC_MADANI_TAJWEED_SUPPORTED = true

/** True when `text` is a QCF page glyph (Presentation Forms / tajweed codepoint). */
export function isQcfPageGlyphText(text = '') {
  const value = String(text || '').trim()
  if (!value) return false
  return /[\uFB50-\uFDFF\uFE70-\uFEFF]/.test(value)
}

/**
 * @param {Array<{ key?: string, verse_key?: string, words?: Array<{ position?: number, word?: number, location?: string, code_v2?: string }> }>} verses
 * @returns {Record<string, string>}
 */
export function buildQpcMadaniCodeV2ByLocation(verses = []) {
  /** @type {Record<string, string>} */
  const map = Object.create(null)
  for (const verse of verses) {
    const verseKey = String(verse?.key || verse?.verse_key || '').trim()
    const [surah, ayah] = verseKey.split(':')
    const words = Array.isArray(verse?.words) ? verse.words : []
    for (const word of words) {
      const position = Number(word?.position ?? word?.word)
      if (!Number.isFinite(position) || position < 1) continue
      const location = String(word?.location || '').trim()
        || (surah && ayah ? `${surah}:${ayah}:${position}` : '')
      const codeV2 = String(word?.code_v2 || word?.codeV2 || '').trim()
      if (location && codeV2) {
        map[location] = codeV2
      }
    }
  }
  return map
}

/**
 * @param {{ word?: { location?: string, text?: string, page?: number }, tajweedEnabled?: boolean, codeV2ByLocation?: Record<string, string> }} options
 */
export function resolveQpcMadaniWordGlyph({
  word = {},
  tajweedEnabled = false,
  codeV2ByLocation = {},
} = {}) {
  const baseText = String(word?.text || '')
  if (!tajweedEnabled) {
    return {
      text: baseText,
      useTajweedFont: false,
      fontFamily: '',
    }
  }
  const location = String(word?.location || '').trim()
  const fromMap = location ? String(codeV2ByLocation[location] || '').trim() : ''
  const codeV2 = fromMap || (isQcfPageGlyphText(baseText) ? baseText : '')
  const page = Number(word?.page)
  if (!codeV2 || !Number.isFinite(page) || page < 1) {
    return {
      text: baseText,
      useTajweedFont: false,
      fontFamily: '',
    }
  }
  return {
    text: codeV2,
    useTajweedFont: true,
    fontFamily: qcfFontFamily(page, { tajweed: true }),
  }
}

export function resolveQpcMadaniTajweedPresentation(requested = false) {
  const requestedOn = !!requested
  return {
    supported: QPC_MADANI_TAJWEED_SUPPORTED,
    requested: requestedOn,
    effectiveEnabled: requestedOn && QPC_MADANI_TAJWEED_SUPPORTED,
  }
}

export function shouldShowQpcMadaniReadingAids() {
  return false
}

/**
 * Build location → code_v2 map from Quran.com Madani page/chapter API verses.
 * @param {Array<{ verse_key?: string, words?: Array<{ position?: number, location?: string, code_v2?: string }> }>} apiVerses
 */
export function buildQpcMadaniCodeV2FromMadaniApiVerses(apiVerses = []) {
  /** @type {Record<string, string>} */
  const map = Object.create(null)
  for (const verse of apiVerses) {
    const verseKey = String(verse?.verse_key || '').trim()
    const [surah, ayah] = verseKey.split(':')
    const words = Array.isArray(verse?.words) ? verse.words : []
    for (const word of words) {
      const position = Number(word?.position)
      if (!Number.isFinite(position) || position < 1) continue
      const location = String(word?.location || '').trim()
        || (surah && ayah ? `${surah}:${ayah}:${position}` : '')
      const codeV2 = String(word?.code_v2 || word?.codeV2 || '').trim()
      if (location && codeV2) {
        map[location] = codeV2
      }
    }
  }
  return map
}

/** @param {Record<string, string>[]} maps */
export function mergeQpcMadaniCodeV2Maps(...maps) {
  return Object.assign(Object.create(null), ...maps.filter(Boolean))
}
