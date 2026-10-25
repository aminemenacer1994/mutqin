import { getChapters } from '../lib/quranApis'
import { loadSurahAyahs } from '../dashboardAiRecite/ayahText'

// Keep common demo chapters readable even when the upstream Quran proxy is offline.
const fallbackNames = {
  1: 'الفاتحة', 2: 'البقرة', 18: 'الكهف', 36: 'يس', 55: 'الرحمن',
  67: 'الملك', 93: 'الضحى', 103: 'العصر', 108: 'الكوثر', 112: 'الإخلاص',
  113: 'الفلق', 114: 'الناس',
}
let chapterPromise = null
const versePromises = new Map()

export async function teacherArabicSurahNames() {
  if (!chapterPromise) {
    chapterPromise = getChapters({ language: 'en' })
      .then((response) => {
        const chapters = response?.data?.chapters || response?.data?.data?.chapters || []
        return Object.fromEntries(chapters.map((chapter) => [Number(chapter.id), chapter.name_arabic]))
      })
      .catch(() => fallbackNames)
  }
  return { ...fallbackNames, ...await chapterPromise }
}

export async function teacherArabicAyah(surah, ayah) {
  try {
    const id = Number(surah)
    if (!versePromises.has(id)) versePromises.set(id, loadSurahAyahs(id).catch(() => []))
    return (await versePromises.get(id)).find((item) => item.ayah === Number(ayah))?.text || ''
  } catch {
    return ''
  }
}
