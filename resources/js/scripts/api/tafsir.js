import { http } from './learning'

const ayahCache = new Map()
const chapterCache = new Map()

function ayahCacheKey({ surah_number, ayah_number, resource_id }) {
  return `${resource_id || 'default'}:${surah_number}:${ayah_number}`
}

function chapterCacheKey({ surah_number, resource_id }) {
  return `${resource_id || 'default'}:chapter:${surah_number}`
}

/**
 * Fetch normalised tafsir for a single ayah via the Laravel service layer.
 */
export async function getAyahTafsir({ surah_number, ayah_number, resource_id } = {}) {
  const surah = Number(surah_number)
  const ayah = Number(ayah_number)
  if (!surah || !ayah) {
    throw new Error('surah_number and ayah_number are required')
  }

  const key = ayahCacheKey({ surah_number: surah, ayah_number: ayah, resource_id })
  if (ayahCache.has(key)) {
    return ayahCache.get(key)
  }

  const params = { surah_number: surah, ayah_number: ayah }
  if (resource_id) params.resource_id = resource_id

  const response = await http.get('/quran/tafsir', { params })
  const payload = response.data || {}
  ayahCache.set(key, payload)
  return payload
}

/**
 * Fetch normalised English tafsir for a full surah via the Laravel service layer.
 */
export async function getChapterTafsir({ surah_number, resource_id } = {}) {
  const surah = Number(surah_number)
  if (!surah) {
    throw new Error('surah_number is required')
  }

  const key = chapterCacheKey({ surah_number: surah, resource_id })
  if (chapterCache.has(key)) {
    return chapterCache.get(key)
  }

  const params = { surah_number: surah }
  if (resource_id) params.resource_id = resource_id

  const response = await http.get('/quran/tafsir', { params })
  const payload = response.data || {}
  chapterCache.set(key, payload)
  return payload
}

export function clearAyahTafsirCache() {
  ayahCache.clear()
}

export function clearTafsirCache() {
  ayahCache.clear()
  chapterCache.clear()
}

export default {
  getAyahTafsir,
  getChapterTafsir,
  clearAyahTafsirCache,
  clearTafsirCache,
}
