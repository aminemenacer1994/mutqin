import { getSurahEdition } from '../lib/quranApis'
import { surahName } from './location'

const surahCache = new Map()

function verseNumber(item) {
  return Number(item?.numberInSurah || item?.number_in_surah || item?.ayah || 0)
}

function verseText(item) {
  return String(item?.text || item?.arabic || '').replace(/\s+/g, ' ').trim()
}

export async function loadSurahAyahs(surah) {
  const id = Number(surah) || 0
  if (id < 1) return []
  if (surahCache.has(id)) return surahCache.get(id)

  const response = await getSurahEdition(id, 'quran-uthmani')
  const payload = response?.data?.data || response?.data || {}
  const list = Array.isArray(payload?.ayahs) ? payload.ayahs : []
  const ayahs = list.map((item) => ({
    ayah: verseNumber(item),
    text: verseText(item),
    surah_number: id,
    surah_name: payload?.englishName || surahName(id),
  })).filter((item) => item.ayah > 0 && item.text)

  surahCache.set(id, ayahs)
  return ayahs
}

export async function loadAyah(surah, ayah) {
  const ayahs = await loadSurahAyahs(surah)
  const number = Number(ayah) || 0
  return ayahs.find((item) => item.ayah === number) || null
}
