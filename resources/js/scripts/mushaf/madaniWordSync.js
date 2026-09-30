/**
 * Align mushaf page words with session audio word indices used by WordSyncEngine.
 * Mapping key is always verseKey:wordPosition (layout-agnostic).
 */

export function buildAudioIndexMap(verses = []) {
  const map = new Map()
  for (const verse of verses) {
    const verseKey = String(verse?.key || '')
    if (!verseKey || !Array.isArray(verse.words)) continue
    let audioIndex = 0
    for (const sourceWord of verse.words) {
      const arabic = String(sourceWord?.ar || sourceWord?.text || '').trim()
      if (!arabic) continue
      const position = Number(sourceWord?.position)
      if (Number.isFinite(position) && position > 0) {
        map.set(`${verseKey}:${position}`, audioIndex)
      }
      map.set(`${verseKey}:#${audioIndex}`, audioIndex)
      audioIndex += 1
    }
    map.set(`${verseKey}:__count`, audioIndex)
  }
  return map
}

export function resolveAudioWordIndex(word, audioIndexMap = new Map()) {
  if (!word || word.isEnd) return null
  const verseKey = String(word.verseKey || '')
  if (!verseKey) return null
  const position = Number(word.position ?? word.wordPosition ?? word.word)
  if (Number.isFinite(position) && position > 0 && audioIndexMap.has(`${verseKey}:${position}`)) {
    return audioIndexMap.get(`${verseKey}:${position}`)
  }
  if (Number.isFinite(position) && position > 0) {
    return Math.max(0, position - 1)
  }
  return null
}

export function getAudioWordCount(verse, audioIndexMap = new Map()) {
  const verseKey = String(verse?.key || '')
  if (verseKey && audioIndexMap.has(`${verseKey}:__count`)) {
    return Number(audioIndexMap.get(`${verseKey}:__count`)) || 0
  }
  if (!Array.isArray(verse?.words)) return 0
  return verse.words.filter(word => String(word?.ar || word?.text || '').trim()).length
}

/**
 * True when token text has no spoken Arabic letters (ayah-end / pause ornaments).
 * Used by Unicode mushaf adapters so end marks keep layout width without joining
 * Progressive Hide / word-audio index streams.
 */
export function isMushafOrnamentWordText(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return true
  // Arabic letters only — combining marks, digits, and pause glyphs do not count.
  return !/[\u0621-\u063A\u0641-\u064A\u066E\u066F\u0671-\u06D3\u06EE\u06EF\u06FA-\u06FF\u0750-\u077F\u08A0-\u08FF]/.test(raw)
}
