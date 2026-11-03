/**
 * Resolve the exact configured ayah window from session verses, displayed
 * Mushaf verses, or the playback queue. A partial page or an old queue must
 * never become a partial AI Recite test for a different session.
 */
export function selectCompleteSessionVerseRange({ chapterId, rangeStart, rangeEnd, sources = [] } = {}) {
  const surah = Number(chapterId)
  const from = Number(rangeStart)
  const to = Number(rangeEnd)
  if (![surah, from, to].every(Number.isInteger) || surah < 1 || from < 1 || to < from) return []

  const byAyah = new Map()
  for (const source of sources) {
    if (!Array.isArray(source)) continue
    for (const item of source) {
      const verse = item?.verse || item
      const key = String(verse?.key || item?.ayahId || '').trim()
      const match = /^(\d+):(\d+)$/.exec(key)
      if (!match || Number(match[1]) !== surah) continue
      const ayah = Number(match[2])
      if (ayah < from || ayah > to || byAyah.has(ayah)) continue
      byAyah.set(ayah, verse?.key ? verse : { ...verse, key })
    }
  }

  const selected = []
  for (let ayah = from; ayah <= to; ayah += 1) {
    const verse = byAyah.get(ayah)
    if (!verse) return []
    selected.push(verse)
  }
  return selected
}
