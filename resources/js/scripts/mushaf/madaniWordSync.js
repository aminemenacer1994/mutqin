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

export function buildEstimatedWordTimings(sourceWords = [], duration = 0) {
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
  const timestamps = []
  let currentTime = 0

  weightedUnits.forEach((unit, index) => {
    const wordDuration = index === weightedUnits.length - 1
      ? Math.max(0, usableDuration - currentTime)
      : usableDuration * (unit / totalUnits)

    timestamps.push({
      index,
      start: currentTime,
      end: currentTime + wordDuration,
    })
    currentTime += wordDuration
  })

  return timestamps
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
