import { HAFS_AYAH_COUNTS_PER_SURAH } from '../mutashabihat/hafsAyahCounts.js'

function positiveInteger(value) {
  if (!['number', 'string'].includes(typeof value) || String(value).trim() === '') return null
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null
}

/** Use stored references only; Arabic prose and titles cannot identify an ayah. */
export function recordAyahRange(row = {}) {
  const range = row?.range || {}
  const surah = positiveInteger(range.surah ?? range.surah_number ?? row?.firstSurah ?? row?.surah_number)
  const from = positiveInteger(range.from ?? range.ayah_start ?? row?.ayah ?? row?.ayah_number)
  const to = positiveInteger(range.to ?? range.ayah_end ?? from)
  const ayahCount = HAFS_AYAH_COUNTS_PER_SURAH[(surah || 0) - 1]
  if (!ayahCount || !from || !to || to < from || from > ayahCount || to > ayahCount) return null
  return { surah, from, to }
}
