/**
 * Clean ayah strings for Mutashābihāt display + diff (Al Quran Cloud).
 * Strips waqf/stop glyphs that fonts render as black circles and normalises spacing.
 */

/** Waqf, pause marks, tatweel, and PUAs that break Naskh fonts. */
const MUTASHABIHAT_STRIP_RE = /[\u0610-\u061A\u0640\u06D6-\u06ED\u08F0-\u08FF]/g

/**
 * @param {string} text
 * @returns {string}
 */
export function sanitizeMutashabihatAyahText(text) {
  let value = String(text || '')
  if (!value) return ''
  value = value.normalize('NFKC')
  value = value.replace(MUTASHABIHAT_STRIP_RE, '')
  value = value.replace(/\s+/g, ' ').trim()
  return value
}
