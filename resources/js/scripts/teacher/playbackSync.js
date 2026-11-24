import { normaliseTeacherWordStatus } from './wordReviewClass.js'

function readSeconds(value) {
  if (typeof value === 'boolean' || value == null || value === '') return null
  const number = Number(value)
  if (!Number.isFinite(number) || number < 0) return null
  return number
}

export function wordKey(word) {
  const ayah = Number(word?.ayah ?? word?.ayah_number)
  const index = Number(word?.word_index ?? word?.ayah_word_index)
  if (!Number.isInteger(ayah) || ayah < 1 || !Number.isInteger(index) || index < 0) return ''
  return `${ayah}:${index}`
}

/** Stored start/end only. A missing end stays null instead of a guessed duration. */
export function wordWindow(word) {
  const start = readSeconds(word?.start ?? word?.start_time ?? word?.startTime)
  if (start == null) return null
  let end = readSeconds(word?.end ?? word?.end_time ?? word?.endTime)
  if (end != null && end < start) end = null
  return { start, end }
}

function timedWords(words) {
  const timed = []
  for (const word of words || []) {
    const window = wordWindow(word)
    const key = wordKey(word)
    if (!window || !key) continue
    timed.push({ word, key, start: window.start, end: window.end })
  }
  timed.sort((left, right) => left.start - right.start || left.key.localeCompare(right.key))
  return timed
}

/**
 * The word whose stored timing contains currentTime.
 * When an end is missing, the next stored start is the boundary.
 * A gap after a stored end has no active word.
 * The last timed word with no end stays active from its start.
 */
export function activeWordAt(words, currentTime) {
  const time = readSeconds(currentTime)
  if (time == null) return null
  const timed = timedWords(words)
  let active = null
  for (let index = 0; index < timed.length; index += 1) {
    const item = timed[index]
    if (time < item.start) break
    const next = timed[index + 1]
    const end = item.end != null ? item.end : (next ? next.start : null)
    if (end == null || time < end) active = item
    else active = null
  }
  return active
}

export function isFlaggedWord(word) {
  return normaliseTeacherWordStatus(word) === 'incorrect'
}

export function isAttentionWord(word) {
  const status = normaliseTeacherWordStatus(word)
  return status === 'incorrect' || status === 'partial' || status === 'omitted' || status === 'skipped'
}

function flaggedWithTime(words) {
  return timedWords(words).filter((item) => isFlaggedWord(item.word))
}

/** Next or previous checker-flagged word that has a stored start. */
export function flaggedWordAt(words, currentTime, direction) {
  const time = readSeconds(currentTime) ?? 0
  const flagged = flaggedWithTime(words)
  if (direction < 0) {
    for (let index = flagged.length - 1; index >= 0; index -= 1) {
      if (flagged[index].start < time - 0.05) return flagged[index]
    }
    return null
  }
  return flagged.find((item) => item.start > time + 0.05) || null
}

/**
 * Stored bounds for replaying one ayah.
 * The end is the next ayah's stored start, or the last stored end in this ayah.
 * A missing end means the recording has no reliable stop point.
 */
export function ayahRepeatWindow(words, ayah) {
  const start = ayahStartTime(words, ayah)
  if (start == null) return null
  const target = Number(ayah)
  const next = ayahStartTime(words, target + 1)
  if (next != null && next > start) return { start, end: next }
  const ends = timedWords(words)
    .filter((item) => Number(item.word?.ayah ?? item.word?.ayah_number) === target)
    .map((item) => item.end)
    .filter((value) => value != null)
  return { start, end: ends.length ? Math.max(...ends) : null }
}

export function ayahStartTime(words, ayah) {
  const target = Number(ayah)
  if (!Number.isInteger(target) || target < 1) return null
  const starts = timedWords(words)
    .filter((item) => Number(item.word?.ayah ?? item.word?.ayah_number) === target)
    .map((item) => item.start)
  if (!starts.length) return null
  return Math.min(...starts)
}

export function ayahAtTime(words, currentTime) {
  const active = activeWordAt(words, currentTime)
  if (active) return Number(active.word.ayah ?? active.word.ayah_number)
  const time = readSeconds(currentTime)
  if (time == null) return null
  let ayah = null
  for (const item of timedWords(words)) {
    if (item.start > time) break
    const end = item.end
    if (end != null && time >= end) continue
    ayah = Number(item.word.ayah ?? item.word.ayah_number)
  }
  return ayah
}

export function msToSeconds(ms) {
  const value = Number(ms)
  if (!Number.isFinite(value) || value < 0) return null
  return value / 1000
}

export function secondsToMs(seconds) {
  const value = Number(seconds)
  if (!Number.isFinite(value) || value < 0) return null
  return Math.round(value * 1000)
}

/** True when 0 <= start < end and end fits duration when known. */
export function isValidSegmentMs(startMs, endMs, durationMs = null) {
  const start = Number(startMs)
  const end = Number(endMs)
  if (!Number.isFinite(start) || !Number.isFinite(end) || start < 0 || end <= start) return false
  const duration = Number(durationMs)
  if (Number.isFinite(duration) && duration > 0 && end > duration) return false
  return true
}

export function playbackSummary(words) {
  const counts = { flagged: 0, uncertain: 0, skipped: 0, correct: 0 }
  const ayahs = new Map()
  const items = []
  for (const word of words || []) {
    const status = normaliseTeacherWordStatus(word)
    if (status === 'incorrect') counts.flagged += 1
    else if (status === 'partial') counts.uncertain += 1
    else if (status === 'omitted' || status === 'skipped') counts.skipped += 1
    else if (status === 'correct') counts.correct += 1
    if (!isAttentionWord(word)) continue
    const ayah = Number(word?.ayah ?? word?.ayah_number)
    const window = wordWindow(word)
    if (Number.isInteger(ayah) && ayah > 0) {
      const bucket = ayahs.get(ayah) || { ayah, start: null }
      if (window && (bucket.start == null || window.start < bucket.start)) bucket.start = window.start
      ayahs.set(ayah, bucket)
    }
    items.push({
      key: wordKey(word) || `word-${items.length}`,
      ayah: Number.isInteger(ayah) ? ayah : null,
      wordIndex: Number.isInteger(Number(word?.word_index)) ? Number(word.word_index) : null,
      status,
      text: typeof word?.text === 'string' && word.text.trim() ? word.text.trim() : '',
      recognised: typeof word?.recognised === 'string' && word.recognised.trim()
        ? word.recognised.trim()
        : (typeof word?.detected === 'string' && word.detected.trim() ? word.detected.trim() : ''),
      start: window ? window.start : null,
    })
  }
  return {
    counts,
    ayahs: [...ayahs.values()].sort((left, right) => left.ayah - right.ayah),
    items,
  }
}
