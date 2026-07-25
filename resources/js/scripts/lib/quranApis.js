import axios from 'axios'

const alquranClient = axios.create({
  baseURL: 'https://api.alquran.cloud/v1',
  headers: {
    Accept: 'application/json'
  }
})

const quranComClient = axios.create({
  baseURL: 'https://api.quran.com/api/v4',
  headers: {
    Accept: 'application/json'
  }
})

delete alquranClient.defaults.headers.common['X-Requested-With']
delete alquranClient.defaults.headers.common['X-CSRF-TOKEN']
delete quranComClient.defaults.headers.common['X-Requested-With']
delete quranComClient.defaults.headers.common['X-CSRF-TOKEN']

const MADANI_MUSHAF_ID = 1
const madaniPageCache = new Map()
const madaniChapterPageCache = new Map()

export function getAyahTajweed(ayahNumber) {
  return alquranClient.get(`/ayah/${ayahNumber}/quran-tajweed`)
}

export function getEditions(params = {}) {
  return alquranClient.get('/edition', { params })
}

export function getEditionsByLanguage(language, params = {}) {
  return alquranClient.get(`/edition/language/${language}`, { params })
}

export function getChapterRecitation(recitationId, normalizedSurah) {
  return axios.get(`https://api.quran.com/api/v4/chapter_recitations/${recitationId}/${normalizedSurah}`)
}

export function getSurahEdition(surahNumber, edition) {
  return alquranClient.get(`/surah/${surahNumber}/${edition}`)
}

export function getSurahEditions(surahNumber, reciterEdition) {
  const editions = `${reciterEdition},quran-tajweed`
  return alquranClient.get(`/surah/${surahNumber}/editions/${editions}`)
}

export function getSurahTransliteration(surahNumber, transliterationIdentifier) {
  return alquranClient.get(`/surah/${surahNumber}/${transliterationIdentifier}`)
}

export function getQuranEdition(edition) {
  return alquranClient.get(`/quran/${edition}`)
}

/**
 * Quran.com word-by-word glosses (English meaning under each Arabic word).
 * Filters out ayah-end markers; paginates to cover the requested verse range.
 */
export async function getChapterWordByWordMeanings(chapterId, rangeStart = 1, rangeEnd = 286, options = {}) {
  const perPage = Math.max(1, Math.min(50, Number(options.perPage) || 50))
  const start = Math.max(1, Number(rangeStart) || 1)
  const end = Math.max(start, Number(rangeEnd) || start)
  const startPage = Math.max(1, Math.ceil(start / perPage))
  const endPage = Math.max(startPage, Math.ceil(end / perPage))
  const byVerseNumber = new Map()

  for (let page = startPage; page <= endPage; page += 1) {
    const response = await axios.get(`https://api.quran.com/api/v4/verses/by_chapter/${chapterId}`, {
      params: {
        language: 'en',
        words: true,
        word_fields: 'text_uthmani,transliteration',
        page,
        per_page: perPage
      }
    })
    const verses = response.data?.verses || []
    for (const verse of verses) {
      const verseNumber = Number(verse?.verse_number)
      if (!Number.isFinite(verseNumber) || verseNumber < start || verseNumber > end) continue
      const words = (verse.words || [])
        .filter(word => word?.char_type_name === 'word')
        .map(word => ({
          ar: word.text_uthmani || word.text || '',
          en: word.translation?.text || '',
          transliteration: word.transliteration?.text || '',
          audio: word.audio_url || null
        }))
      byVerseNumber.set(verseNumber, words)
    }
  }

  return byVerseNumber
}

/**
 * Fetch a Madani (QCF V2) page with glyph codes + line numbers.
 * Cached in-memory for the session.
 */
export async function getMadaniPageVerses(pageNumber, options = {}) {
  const page = Math.max(1, Math.min(604, Number(pageNumber) || 1))
  const mushaf = Number(options.mushaf) || MADANI_MUSHAF_ID
  const cacheKey = `${mushaf}:${page}`
  if (!options.force && madaniPageCache.has(cacheKey)) {
    return madaniPageCache.get(cacheKey)
  }

  const response = await quranComClient.get(`/verses/by_page/${page}`, {
    params: {
      language: 'en',
      words: true,
      mushaf,
      per_page: 50,
      word_fields: 'code_v2,text_qpc_hafs,text_uthmani,line_number,page_number'
    }
  })

  const verses = response.data?.verses || []
  madaniPageCache.set(cacheKey, verses)
  return verses
}

/**
 * Resolve Madani page numbers covering a chapter ayah range.
 */
export async function getMadaniPagesForChapterRange(chapterId, rangeStart = 1, rangeEnd = 286, options = {}) {
  const chapter = Math.max(1, Math.min(114, Number(chapterId) || 1))
  const start = Math.max(1, Number(rangeStart) || 1)
  const end = Math.max(start, Number(rangeEnd) || start)
  const mushaf = Number(options.mushaf) || MADANI_MUSHAF_ID
  const cacheKey = `${mushaf}:${chapter}:${start}:${end}`
  if (!options.force && madaniChapterPageCache.has(cacheKey)) {
    return madaniChapterPageCache.get(cacheKey)
  }

  const perPage = Math.max(1, Math.min(50, Number(options.perPage) || 50))
  const startApiPage = Math.max(1, Math.ceil(start / perPage))
  const endApiPage = Math.max(startApiPage, Math.ceil(end / perPage))
  const pageNumbers = new Set()
  const pageByVerseKey = new Map()

  for (let apiPage = startApiPage; apiPage <= endApiPage; apiPage += 1) {
    const response = await quranComClient.get(`/verses/by_chapter/${chapter}`, {
      params: {
        language: 'en',
        words: true,
        mushaf,
        page: apiPage,
        per_page: perPage,
        word_fields: 'page_number,line_number,code_v2'
      }
    })
    const verses = response.data?.verses || []
    for (const verse of verses) {
      const verseNumber = Number(verse?.verse_number)
      if (!Number.isFinite(verseNumber) || verseNumber < start || verseNumber > end) continue
      const key = String(verse.verse_key || `${chapter}:${verseNumber}`)
      const pageFromVerse = Number(verse.page_number)
      const pageFromWord = Number(verse.words?.[0]?.page_number)
      const page = Number.isFinite(pageFromVerse) ? pageFromVerse : pageFromWord
      if (Number.isFinite(page) && page >= 1 && page <= 604) {
        pageNumbers.add(page)
        pageByVerseKey.set(key, page)
      }
    }
  }

  const result = {
    pages: [...pageNumbers].sort((a, b) => a - b),
    pageByVerseKey
  }
  madaniChapterPageCache.set(cacheKey, result)
  return result
}

export function clearMadaniPageCaches() {
  madaniPageCache.clear()
  madaniChapterPageCache.clear()
}
