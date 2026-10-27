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

function persistedArabicWords(words = []) {
  return words
    .filter((word) => /[\u0600-\u06ff]/u.test(String(word?.text || '')))
    .map((word) => ({ ...word, text: String(word.text).trim() }))
    .filter((word) => word.text)
}

function wordStatusKey(word) {
  const ayah = Number(word?.ayah)
  const index = Number(word?.word_index)
  return Number.isInteger(ayah) && ayah > 0 && Number.isInteger(index) && index >= 0
    ? `${ayah}:${index}`
    : ''
}

/**
 * Build review text from the canonical quran-uthmani ayahs, then attach only
 * persisted assessment statuses by their ayah/word identity. Recognition text
 * is never used as Quran display text.
 */
export async function teacherCanonicalEvidenceWords(evidence = {}) {
  const range = evidence?.range || {}
  const surah = Number(range.surah)
  const from = Number(range.from)
  const to = Math.max(from, Number(range.to || from))
  const persisted = Array.isArray(evidence?.words) ? evidence.words : []

  if (!Number.isInteger(surah) || surah < 1 || !Number.isInteger(from) || from < 1) {
    return persistedArabicWords(persisted)
  }

  try {
    const ayahs = (await loadSurahAyahs(surah))
      .filter((ayah) => ayah.ayah >= from && ayah.ayah <= to)
      .sort((left, right) => left.ayah - right.ayah)
    if (!ayahs.length) return persistedArabicWords(persisted)

    const statuses = new Map()
    for (const word of persisted) {
      const key = wordStatusKey(word)
      if (key) statuses.set(key, word)
    }

    return ayahs.flatMap((ayah) => ayah.text.split(/\s+/u).filter(Boolean).map((text, wordIndex) => {
      const status = statuses.get(`${ayah.ayah}:${wordIndex}`) || {}
      return {
        text,
        ayah: ayah.ayah,
        word_index: wordIndex,
        status: status.status || 'unknown',
        type: status.type || null,
        detected: status.detected || null,
      }
    }))
  } catch {
    // A review can still show genuine persisted expected words while the Quran
    // proxy is unavailable, but placeholders and recognition guesses stay hidden.
    return persistedArabicWords(persisted)
  }
}
