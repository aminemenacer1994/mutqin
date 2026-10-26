/**
 * Plain Unicode ayah text from Quran.com Madani (QPC Hafs) word payloads.
 */

function isAyahEndMarker(word = {}) {
  const charType = String(word?.char_type_name || '').toLowerCase()
  return charType === 'end' || Number(word?.word) === 0
}

function madaniWordText(word = {}) {
  return String(
    word?.text_qpc_hafs
    || word?.textQpc
    || word?.text_uthmani
    || word?.text
    || '',
  ).trim()
}

/**
 * @param {{ verse_key?: string, words?: object[] }} verse
 * @returns {string}
 */
export function buildMadaniAyahArabicFromVerse(verse) {
  const words = Array.isArray(verse?.words) ? verse.words : []
  const parts = []
  for (const word of words) {
    if (isAyahEndMarker(word)) continue
    const text = madaniWordText(word)
    if (text) parts.push(text)
  }
  return parts.join(' ')
}
