/**
 * Align mushaf page words with session audio word indices used by WordSyncEngine.
 * Mapping key is always verseKey:wordPosition (layout-agnostic).
 */

export function spokenAudioWordText(word) {
  if (word == null) return ''
  if (typeof word === 'string') return String(word).trim()
  return String(
    word.ar
    || word.text_uthmani
    || word.textUthmani
    || word.text_qpc_hafs
    || word.textQpc
    || word.text
    || ''
  ).trim()
}

export function spokenAudioWordPosition(word, fallbackPosition = 0) {
  const position = Number(
    word?.position
    ?? word?.word_position
    ?? word?.wordPosition
    ?? word?.word
  )
  if (Number.isFinite(position) && position > 0) return Math.trunc(position)
  const fallback = Number(fallbackPosition)
  return Number.isFinite(fallback) && fallback > 0 ? Math.trunc(fallback) : 0
}

export function isSpokenAudioWord(word) {
  if (word == null) return false
  if (typeof word === 'string') return !!String(word).trim()
  if (word.isEnd === true) return false
  const charType = String(word.char_type_name || word.charType || '').toLowerCase()
  if (charType === 'end') return false
  if (Number(word.word) === 0) return false
  return !!spokenAudioWordText(word)
}

export function listSpokenAudioWords(verse = {}) {
  const words = Array.isArray(verse?.words) ? verse.words : []
  const spoken = []
  for (const word of words) {
    if (!isSpokenAudioWord(word)) continue
    spoken.push({
      text: spokenAudioWordText(word),
      position: spokenAudioWordPosition(word, spoken.length + 1),
      word,
    })
  }
  return spoken
}

export function buildEstimatedWordTimings(sourceWords = [], duration = 0, options = {}) {
  const words = (Array.isArray(sourceWords) ? sourceWords : [])
    .map((word) => String(word || '').trim())
    .filter(Boolean)
  if (!words.length) return []

  const safeDuration = Number(duration)
  const usableDuration = Number.isFinite(safeDuration) && safeDuration > 0 ? safeDuration : 0
  const cleanedWords = words.map((word) => word.replace(/<[^>]+>/g, '').replace(/[^\u0621-\u064A]/g, ''))
  const weightedUnits = cleanedWords.map((cleanWord, index) => {
    const charCount = Math.max(1, cleanWord.length)
    const leadInBoost = index === 0 ? 1.14 : 1
    const shortWordLift = charCount <= 2 ? 1.18 : 1
    return (charCount + 0.75) * leadInBoost * shortWordLift
  })
  const totalUnits = weightedUnits.reduce((sum, unit) => sum + unit, 0) || 1
  // With no recording-specific segments, a linear text estimate tends to
  // advance too early because real reciters elongate and pause more near the
  // beginning/middle of an ayah. A curve below 1 moves interior boundaries
  // later while still ending exactly with the media file.
  const boundaryCurve = Math.max(0.65, Math.min(1, Number(options.boundaryCurve) || 1))
  const boundaries = [0]
  let consumedUnits = 0
  for (let index = 0; index < weightedUnits.length - 1; index += 1) {
    consumedUnits += weightedUnits[index]
    const progress = Math.max(0, Math.min(1, consumedUnits / totalUnits))
    boundaries.push(usableDuration * Math.pow(progress, boundaryCurve))
  }
  boundaries.push(usableDuration)

  const timestamps = weightedUnits.map((_, index) => ({
    index,
    start: boundaries[index],
    end: boundaries[index + 1],
  }))

  return timestamps
}

/**
 * Convert Quran.com's word segments into the local ayah-audio timeline.
 * Ayah-file segments retain their native leading-silence offset; chapter-file
 * segments can opt into rebasing at their first spoken word.
 *
 * Incomplete segment rows (the API may include marker-only `[position]` rows)
 * deliberately return no timeline. Callers can then use their non-authoritative
 * estimate instead of applying a shifted or incomplete highlight map.
 */
export function buildAuthoritativeWordTimings(segments = [], expectedWordCount = 0, options = {}) {
  const expected = Math.max(0, Math.trunc(Number(expectedWordCount) || 0))
  if (!expected || !Array.isArray(segments)) return []

  const byIndex = new Map()
  for (const segment of segments) {
    if (!Array.isArray(segment) || segment.length < 3) continue
    // Chapter tracks use [position, start, end]; ayah tracks include the
    // zero-based segment index first: [index, position, start, end].
    const offset = segment.length >= 4 ? 1 : 0
    const position = Math.trunc(Number(segment[offset]))
    const startMs = Number(segment[offset + 1])
    const endMs = Number(segment[offset + 2])
    const index = position - 1
    if (
      !Number.isFinite(position) || position < 1 || index >= expected
      || !Number.isFinite(startMs) || !Number.isFinite(endMs) || endMs <= startMs
      || byIndex.has(index)
    ) continue
    byIndex.set(index, { index, startMs, endMs })
  }

  if (byIndex.size !== expected) return []
  const rows = Array.from(byIndex.values()).sort((a, b) => a.index - b.index)
  if (rows.some((row, index) => row.index !== index)) return []

  const originMs = options.relativeToFirstSegment === true ? rows[0].startMs : 0
  return rows.map((row) => ({
    index: row.index,
    start: Math.max(0, (row.startMs - originMs) / 1000),
    end: Math.max(0.01, (row.endMs - originMs) / 1000),
  }))
}

export function buildAudioIndexMap(verses = []) {
  const map = new Map()
  for (const verse of verses) {
    const verseKey = String(verse?.key || '')
    if (!verseKey || !Array.isArray(verse.words)) continue
    let audioIndex = 0
    for (const sourceWord of verse.words) {
      if (!isSpokenAudioWord(sourceWord)) continue
      const position = spokenAudioWordPosition(sourceWord, audioIndex + 1)
      if (position > 0) {
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
  return listSpokenAudioWords(verse).length
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
