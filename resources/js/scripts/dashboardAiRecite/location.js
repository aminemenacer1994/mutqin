import { SURAH_AYAH_COUNTS, SURAH_NAMES } from '../engine/hifz_session_engine.js'
import { userScopedMutqinKey, readLocalJson, writeLocalJson } from '../../utils/mutqinStorageKeys.js'

export const DASHBOARD_AI_RECITE_SOURCE = 'dashboard_ai_recite'

export function surahCatalog() {
  return SURAH_NAMES.map((name, index) => ({
    id: index + 1,
    name,
    ayahCount: Number(SURAH_AYAH_COUNTS[index] || 0),
  }))
}

export function ayahCountForSurah(surah) {
  const id = Number(surah) || 0
  if (id < 1 || id > SURAH_AYAH_COUNTS.length) return 0
  return Number(SURAH_AYAH_COUNTS[id - 1] || 0)
}

export function surahName(surah) {
  const id = Number(surah) || 0
  if (id < 1 || id > SURAH_NAMES.length) return ''
  return SURAH_NAMES[id - 1] || ''
}

export function clampAyah(surah, ayah) {
  const max = ayahCountForSurah(surah)
  const value = Number(ayah) || 1
  if (max <= 0) return 1
  return Math.min(max, Math.max(1, value))
}

export function lastLocationStorageKey(userId) {
  return userScopedMutqinKey('dashboardAiRecite.lastLocation', userId)
}

export function readStoredLastLocation(userId) {
  const raw = readLocalJson(lastLocationStorageKey(userId), null)
  const surah = Number(raw?.surah_number || raw?.surah || 0)
  const ayah = Number(raw?.ayah || raw?.ayah_start || 0)
  if (surah < 1 || ayah < 1) return null
  return {
    surah_number: surah,
    ayah: clampAyah(surah, ayah),
    surah_name: raw?.surah_name || surahName(surah),
  }
}

export function writeStoredLastLocation(userId, location) {
  const surah = Number(location?.surah_number || location?.surah || 0)
  const ayah = Number(location?.ayah || location?.ayah_start || 0)
  if (surah < 1 || ayah < 1) return
  writeLocalJson(lastLocationStorageKey(userId), {
    surah_number: surah,
    ayah: clampAyah(surah, ayah),
    surah_name: location?.surah_name || surahName(surah),
  })
}

/**
 * Preferred session location, then last tested, stored, memorisation progress, then Al-Fatihah 1.
 */
export function resolveDefaultLocation({
  preferred = null,
  lastTested = null,
  progress = null,
  stored = null,
} = {}) {
  const candidates = [preferred, lastTested, stored, {
    surah_number: Number(progress?.current_surah_number || 0),
    ayah: Number(progress?.current_ayah || progress?.ayah_start || 0),
    surah_name: progress?.current_surah_name || '',
  }]

  for (const candidate of candidates) {
    const surah = Number(candidate?.surah_number || candidate?.surah || 0)
    const ayah = Number(candidate?.ayah || candidate?.ayah_start || 0)
    if (surah >= 1 && ayah >= 1) {
      return {
        surah_number: surah,
        ayah: clampAyah(surah, ayah),
        surah_name: candidate?.surah_name || surahName(surah),
      }
    }
  }

  return {
    surah_number: 1,
    ayah: 1,
    surah_name: surahName(1),
  }
}

export function nextAyahLocation(surah, ayah) {
  const current = clampAyah(surah, ayah)
  const max = ayahCountForSurah(surah)
  if (current >= max) return null
  return {
    surah_number: Number(surah) || 1,
    ayah: current + 1,
    surah_name: surahName(surah),
  }
}
