import { calculatePlanForecast } from '../engine/hifz_session_engine.js'
import {
  ayahsFromPages,
  ayahsInJuzRange,
  ayahsThroughSurah,
  scaleFromAyahs,
} from './quranCorpus.js'
import { clampDailyAyahs } from './planner.js'

export function resolveMemorizedAyahs({ mode = 'pages', pages = 0, fromJuz = 1, toJuz = 1, throughSurah = 0 } = {}) {
  if (mode === 'juz') return ayahsInJuzRange(fromJuz, toJuz)
  if (mode === 'surah') return ayahsThroughSurah(throughSurah)
  return ayahsFromPages(pages)
}

export function buildHifzProgressSummary(input = {}) {
  const ayahs = resolveMemorizedAyahs(input)
  const scaled = scaleFromAyahs(ayahs)
  const daily = clampDailyAyahs(input.dailyAyahs || 3)
  const remainingForecast = calculatePlanForecast(
    { goalSettings: { dailyNewAyahs: { min: daily, max: daily, exact: daily } } },
    { totalAyahs: scaled.ayahs + scaled.remainingAyahs, completedAyahs: scaled.ayahs },
  )
  return {
    ...scaled,
    dailyTarget: daily,
    remainingDays: remainingForecast.estimatedDays,
    remainingDuration: remainingForecast.estimatedDuration,
    remainingDate: remainingForecast.estimatedCompletionDate,
  }
}
