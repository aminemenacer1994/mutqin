/** Resolve an ayah's finite repeat count from its session and optional override. */
export function resolveSessionAyahRepeatCount({
  verse = null, chapterId = 0, repetitionsPerStep = 1,
  individualAyahRepeatCounts = {}, chainingEnabled = false, chainingRepetitions = 1,
} = {}) {
  const clamp = (value, max) => Math.max(1, Math.min(max, Math.round(Number(value) || 1)))
  if (chainingEnabled) return clamp(chainingRepetitions, 5)

  const key = String(verse?.key || verse?.verse_key || verse?.verse?.key || '').trim()
  const surah = Number(chapterId)
  const ayah = Number(verse?.number || verse?.verse_number || key.split(':')[1] || 0)
  const direct = Number(individualAyahRepeatCounts?.[key])
  if (key && Number.isFinite(direct) && direct > 0) return clamp(direct, 50)
  const composed = Number(surah > 0 && ayah > 0
    ? individualAyahRepeatCounts?.[`${surah}:${ayah}`]
    : undefined)
  if (Number.isFinite(composed) && composed > 0) return clamp(composed, 50)
  return clamp(repetitionsPerStep, 50)
}

/** Add exactly the configured number of complete passes to the playback queue. */
export function appendRepeatedSessionEntries(queue, entries, repetitions) {
  const count = Math.max(1, Math.min(50, Math.round(Number(repetitions) || 1)))
  for (let repeat = 1; repeat <= count; repeat += 1) {
    for (const entry of entries) {
      queue.push({ ...entry, repeatCount: repeat, totalRepeats: count })
    }
  }
  return queue
}

function entryVerseKey(entry) {
  return String(entry?.verse?.key || entry?.key || entry?.ayahId || '')
}

/** Completed guided plays, excluding the currently selected pass until it ends. */
export function countCompletedSessionRepeats({
  queue = [], queueIndex = 0, queuePlaybackExhausted = false, versePlayCounts = {},
} = {}) {
  if (!Array.isArray(queue) || !queue.length) return 0
  const index = Math.max(0, Math.min(queue.length - 1, Number(queueIndex) || 0))
  const completedThrough = index + (queuePlaybackExhausted && index === queue.length - 1 ? 1 : 0)
  const countedByVerse = new Map()
  let completed = 0
  for (const entry of queue.slice(0, completedThrough)) {
    const key = entryVerseKey(entry)
    if (!key) continue
    const nextCount = (countedByVerse.get(key) || 0) + 1
    countedByVerse.set(key, nextCount)
    // A manually skipped queue entry has no actual play. Older sessions may
    // lack per-verse counters, so retain their queue progress as a fallback.
    if (versePlayCounts && Object.hasOwn(versePlayCounts, key)
      && nextCount > Number(versePlayCounts[key] || 0)) continue
    completed += 1
  }
  return completed
}

/** Completed passes for the current ayah (and chaining group). */
export function activeAyahRepeatProgress({ queue = [], queueIndex = 0, queuePlaybackExhausted = false } = {}) {
  if (!Array.isArray(queue) || !queue.length) return { completed: 0, total: 1 }
  const index = Math.max(0, Math.min(queue.length - 1, Number(queueIndex) || 0))
  const entry = queue[index]
  const key = entryVerseKey(entry)
  const chainKey = String(entry?.chainKey || '')
  const total = Math.max(1, Number(entry?.totalRepeats || 1))
  let groupStart = index
  while (groupStart > 0) {
    const previous = queue[groupStart - 1]
    if (String(previous?.chainKey || '') !== chainKey) break
    if (!chainKey && entryVerseKey(previous) !== key) break
    groupStart -= 1
  }
  let completed = queue.slice(groupStart, index).filter((candidate) => (
    entryVerseKey(candidate) === key
  )).length
  if (queuePlaybackExhausted && index === queue.length - 1) completed += 1
  return { completed: Math.min(total, completed), total }
}
