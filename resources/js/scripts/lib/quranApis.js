import axios from 'axios'

/**
 * Quran text clients.
 *
 * Upstream hosts (api.alquran.cloud / api.quran.com) often block browser CORS
 * from localhost / app origins. All requests go through the Laravel same-origin
 * proxy at /memorisation/quran-proxy/{provider}/...
 */

function readCsrfToken() {
  if (typeof document === 'undefined') return ''
  return document.head?.querySelector('meta[name="csrf-token"]')?.content || ''
}

function createProxyClient(provider) {
  const client = axios.create({
    baseURL: `/memorisation/quran-proxy/${provider}`,
    headers: {
      Accept: 'application/json',
    },
    withCredentials: true,
  })

  client.interceptors.request.use((config) => {
    const csrf = readCsrfToken()
    if (csrf) {
      config.headers = config.headers || {}
      config.headers['X-CSRF-TOKEN'] = csrf
      config.headers['X-Requested-With'] = 'XMLHttpRequest'
    }
    return config
  })

  return client
}

const alquranClient = createProxyClient('alquran')
const quranComClient = createProxyClient('qurancom')

const MADANI_MUSHAF_ID = 1
const madaniPageCache = new Map()
const madaniChapterPageCache = new Map()
const madaniChapterVerseCache = new Map()

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
  return quranComClient.get(`/chapter_recitations/${recitationId}/${normalizedSurah}`)
}

export function getSurahEdition(surahNumber, edition) {
  return alquranClient.get(`/surah/${surahNumber}/${edition}`)
}

/** Quran.com chapter list via same-origin proxy (avoids browser CORS). */
export function getChapters(params = { language: 'en' }) {
  return quranComClient.get('/chapters', { params })
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
    const response = await quranComClient.get(`/verses/by_chapter/${chapterId}`, {
      params: {
        language: 'en',
        words: true,
        word_fields: 'text_uthmani,transliteration,translation',
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
      word_fields: 'code_v2,text_qpc_hafs,text_uthmani,line_number,page_number,translation'
    }
  })

  const verses = response.data?.verses || []
  madaniPageCache.set(cacheKey, verses)
  return verses
}

/**
 * Fetch Madani glyph verses for a chapter ayah range only.
 * Never includes neighbouring-surah ayahs that share a printed page.
 */
export async function getMadaniChapterRangeVerses(chapterId, rangeStart = 1, rangeEnd = 286, options = {}) {
  const chapter = Math.max(1, Math.min(114, Number(chapterId) || 1))
  const start = Math.max(1, Number(rangeStart) || 1)
  const end = Math.max(start, Number(rangeEnd) || start)
  const mushaf = Number(options.mushaf) || MADANI_MUSHAF_ID
  const cacheKey = `${mushaf}:${chapter}:${start}:${end}:verses`
  if (!options.force && madaniChapterVerseCache.has(cacheKey)) {
    return madaniChapterVerseCache.get(cacheKey)
  }

  const perPage = Math.max(1, Math.min(50, Number(options.perPage) || 50))
  const startApiPage = Math.max(1, Math.ceil(start / perPage))
  const endApiPage = Math.max(startApiPage, Math.ceil(end / perPage))
  const collected = []

  for (let apiPage = startApiPage; apiPage <= endApiPage; apiPage += 1) {
    const response = await quranComClient.get(`/verses/by_chapter/${chapter}`, {
      params: {
        language: 'en',
        words: true,
        mushaf,
        page: apiPage,
        per_page: perPage,
        word_fields: 'code_v2,text_qpc_hafs,text_uthmani,line_number,page_number,translation'
      }
    })
    const verses = response.data?.verses || []
    for (const verse of verses) {
      const verseNumber = Number(verse?.verse_number)
      if (!Number.isFinite(verseNumber) || verseNumber < start || verseNumber > end) continue
      collected.push(verse)
    }
  }

  madaniChapterVerseCache.set(cacheKey, collected)
  return collected
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
  madaniChapterVerseCache.clear()
}
