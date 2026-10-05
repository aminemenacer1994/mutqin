import { QURAN_TOTALS, SURAH_AYAH_COUNTS } from '../engine/hifz_session_engine.js'

/**
 * Standard 30 Juz start points (surah:ayah), same table used across Madani prints.
 * Inclusive start of each Juz.
 */
export const JUZ_STARTS = Object.freeze([
  [1, 1], [2, 142], [2, 253], [3, 93], [4, 24],
  [4, 148], [5, 82], [6, 111], [7, 88], [8, 41],
  [9, 93], [11, 6], [12, 53], [15, 1], [17, 1],
  [18, 75], [21, 1], [23, 1], [25, 21], [27, 56],
  [29, 46], [33, 31], [36, 28], [39, 32], [41, 47],
  [46, 1], [51, 31], [58, 1], [67, 1], [78, 1],
])

export function ayahsInSurah(surah) {
  const id = Number(surah) || 0
  if (id < 1 || id > 114) return 0
  return Number(SURAH_AYAH_COUNTS[id - 1] || 0)
}

export function cumulativeAyahsBeforeSurah(surah) {
  const id = Math.max(1, Math.min(115, Number(surah) || 1))
  let total = 0
  for (let i = 1; i < id; i += 1) total += ayahsInSurah(i)
  return total
}

export function ayahOrdinal(surah, ayah) {
  const max = ayahsInSurah(surah)
  const n = Math.max(1, Math.min(max || 1, Number(ayah) || 1))
  return cumulativeAyahsBeforeSurah(surah) + n
}

export function previousAyahRef(surah, ayah) {
  const s = Number(surah) || 1
  const a = Number(ayah) || 1
  if (a > 1) return { surah: s, ayah: a - 1 }
  if (s <= 1) return { surah: 1, ayah: 1 }
  return { surah: s - 1, ayah: ayahsInSurah(s - 1) }
}

export function inclusiveAyahCount(fromSurah, fromAyah, toSurah, toAyah) {
  const start = ayahOrdinal(fromSurah, fromAyah)
  const end = ayahOrdinal(toSurah, toAyah)
  if (end < start) return 0
  return end - start + 1
}

export function juzBounds(juz) {
  const n = Math.max(1, Math.min(30, Number(juz) || 1))
  const [startSurah, startAyah] = JUZ_STARTS[n - 1]
  if (n === 30) {
    return { startSurah, startAyah, endSurah: 114, endAyah: ayahsInSurah(114) }
  }
  const [nextSurah, nextAyah] = JUZ_STARTS[n]
  const end = previousAyahRef(nextSurah, nextAyah)
  return { startSurah, startAyah, endSurah: end.surah, endAyah: end.ayah }
}

export function ayahsInJuzRange(fromJuz, toJuz) {
  const from = Math.max(1, Math.min(30, Number(fromJuz) || 1))
  const to = Math.max(from, Math.min(30, Number(toJuz) || from))
  const start = juzBounds(from)
  const end = juzBounds(to)
  return inclusiveAyahCount(start.startSurah, start.startAyah, end.endSurah, end.endAyah)
}

export function ayahsThroughSurah(surah) {
  const id = Math.max(0, Math.min(114, Number(surah) || 0))
  if (id < 1) return 0
  return cumulativeAyahsBeforeSurah(id + 1)
}

export function ayahsFromPages(pages) {
  const p = Math.max(0, Math.min(QURAN_TOTALS.pages, Number(pages) || 0))
  if (p <= 0) return 0
  if (p >= QURAN_TOTALS.pages) return QURAN_TOTALS.ayahs
  return Math.max(1, Math.round((p / QURAN_TOTALS.pages) * QURAN_TOTALS.ayahs))
}

export function scaleFromAyahs(ayahs) {
  const n = Math.max(0, Math.min(QURAN_TOTALS.ayahs, Number(ayahs) || 0))
  const ratio = n / QURAN_TOTALS.ayahs
  return {
    ayahs: n,
    percent: Math.round(ratio * 1000) / 10,
    pages: n <= 0 ? 0 : Math.max(1, Math.round(ratio * QURAN_TOTALS.pages)),
    juz: n <= 0 ? 0 : Math.max(0.1, Math.round(ratio * QURAN_TOTALS.juz * 10) / 10),
    remainingAyahs: QURAN_TOTALS.ayahs - n,
  }
}

export function juzAmmaAyahCount() {
  return inclusiveAyahCount(78, 1, 114, ayahsInSurah(114))
}
