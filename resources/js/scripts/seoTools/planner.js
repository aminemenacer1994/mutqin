import {
  calculatePlanForecast,
  QURAN_TOTALS,
  SURAH_AYAH_COUNTS,
  SURAH_NAMES,
} from '../engine/hifz_session_engine.js'
import { ayahsInSurah, inclusiveAyahCount, juzAmmaAyahCount, scaleFromAyahs } from './quranCorpus.js'

export function clampDailyAyahs(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 3
  return Math.max(1, Math.min(10, Math.floor(n)))
}

export function clampDaysPerWeek(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 7
  return Math.max(3, Math.min(7, Math.floor(n)))
}

export function targetAyahCount({ target = 'quran', surah = 1, from = 1, to = 0 } = {}) {
  if (target === 'juz-amma') return juzAmmaAyahCount()
  if (target === 'surah') {
    const id = Math.max(1, Math.min(114, Number(surah) || 1))
    const max = ayahsInSurah(id)
    const start = Math.max(1, Math.min(max, Number(from) || 1))
    const end = Math.max(start, Math.min(max, Number(to) || max))
    return inclusiveAyahCount(id, start, id, end)
  }
  return QURAN_TOTALS.ayahs
}

/**
 * Public planner: same daily-ayah math as Mutqin’s Hifz forecast, plus days-per-week.
 */
export function buildPublicMemorizationPlan({
  target = 'quran',
  surah = 1,
  from = 1,
  to = 0,
  dailyAyahs = 3,
  daysPerWeek = 7,
  completedAyahs = 0,
  now = new Date(),
} = {}) {
  const totalAyahs = targetAyahCount({ target, surah, from, to })
  const daily = clampDailyAyahs(dailyAyahs)
  const weekDays = clampDaysPerWeek(daysPerWeek)
  const forecast = calculatePlanForecast(
    { goalSettings: { dailyNewAyahs: { min: daily, max: daily, exact: daily } } },
    { totalAyahs, completedAyahs, now },
  )
  const practiceDays = forecast.estimatedDays
  const calendarDays = weekDays >= 7 || practiceDays === 0
    ? practiceDays
    : Math.ceil(practiceDays * (7 / weekDays))
  const firstSittingCount = Math.min(daily, Math.max(0, forecast.remainingAyahs))
  let firstSittingLabel = `${firstSittingCount} ayah${firstSittingCount === 1 ? '' : 's'} in the first sitting`
  if (target === 'juz-amma') firstSittingLabel = `Juz ʿAmma · ${firstSittingLabel}`
  if (target === 'surah') {
    const id = Math.max(1, Math.min(114, Number(surah) || 1))
    const max = ayahsInSurah(id)
    const start = Math.max(1, Math.min(max, Number(from) || 1))
    const end = Math.min(max, start + firstSittingCount - 1)
    firstSittingLabel = `${SURAH_NAMES[id - 1] || `Surah ${id}`} ${start}–${end}`
  }

  return {
    ...forecast,
    daysPerWeek: weekDays,
    calendarDays,
    firstSittingCount,
    firstSittingLabel,
    scaled: scaleFromAyahs(totalAyahs),
    surahOptions: SURAH_NAMES.map((name, index) => ({
      id: index + 1,
      name,
      ayahs: SURAH_AYAH_COUNTS[index],
    })),
  }
}
