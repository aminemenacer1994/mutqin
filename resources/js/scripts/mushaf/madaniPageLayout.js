import { qcfFontFamily } from './qcfFontLoader.js'

export const MADANI_LINES_PER_PAGE = 15
export const MADANI_TOTAL_PAGES = 604

/** Chapters that print a standalone basmala line before ayah 1 (not Al-Fatihah, not At-Tawbah). */
export function chapterHasBismillahPre(chapterId) {
  const id = Number(chapterId)
  return Number.isFinite(id) && id >= 2 && id !== 9
}

export function surahNameGlyphText(chapterId) {
  const id = Math.max(1, Math.min(114, Number(chapterId) || 1))
  return `${String(id).padStart(3, '0')}surah`
}

/**
 * Flatten Quran.com page verses into sorted Madani lines (ayah words only).
 */
export function groupWordsByLine(verses = []) {
  const lines = new Map()

  for (const verse of verses) {
    const verseKey = String(verse?.verse_key || verse?.key || '')
    const words = Array.isArray(verse?.words) ? verse.words : []
    for (const word of words) {
      const lineNumber = Number(word?.line_number)
      if (!Number.isFinite(lineNumber) || lineNumber < 1) continue
      if (!lines.has(lineNumber)) lines.set(lineNumber, [])
      lines.get(lineNumber).push(normalizeMadaniWord(word, verseKey))
    }
  }

  return [...lines.entries()]
    .sort((a, b) => a[0] - b[0])
    .map(([lineNumber, words]) => ({
      lineNumber,
      type: 'ayah',
      words
    }))
}

export function normalizeMadaniWord(word = {}, verseKey = '') {
  const charType = String(word?.char_type_name || 'word')
  return {
    id: word.id ?? null,
    position: Number(word.position) || 0,
    verseKey: String(verseKey || word.verseKey || word.verse_key || ''),
    charType,
    isEnd: charType === 'end',
    codeV2: String(word.code_v2 || word.text || ''),
    textQpc: String(word.text_qpc_hafs || word.text_uthmani || word.text || ''),
    pageNumber: Number(word.page_number) || null,
    lineNumber: Number(word.line_number) || null,
    translation: word.translation?.text || word.en || ''
  }
}

/**
 * Detect which chapter (if any) begins on this Madani page.
 */
export function findSurahStartOnPage(verses = []) {
  for (const verse of verses) {
    const key = String(verse?.verse_key || verse?.key || '')
    const match = key.match(/^(\d+):1$/)
    if (!match) continue
    const chapterId = Number(match[1])
    const firstWord = (verse.words || []).find(w => Number(w?.position) === 1) || verse.words?.[0]
    const lineNumber = Number(firstWord?.line_number)
    return {
      chapterId,
      verseKey: key,
      firstAyahLine: Number.isFinite(lineNumber) ? lineNumber : 1
    }
  }
  return null
}

/**
 * Build a full 15-line Madani page model with surah header / basmala injection.
 */
export function buildMadaniPageLayout(pageNumber, verses = [], options = {}) {
  const page = Math.max(1, Math.min(MADANI_TOTAL_PAGES, Number(pageNumber) || 1))
  const tajweed = !!options.tajweed
  const ayahLines = groupWordsByLine(verses)
  const ayahLineMap = new Map(ayahLines.map(line => [line.lineNumber, line]))
  const surahStart = findSurahStartOnPage(verses)

  const decorative = []
  if (surahStart) {
    decorative.push({
      lineNumber: Math.max(1, surahStart.firstAyahLine - (chapterHasBismillahPre(surahStart.chapterId) ? 2 : 1)),
      type: 'surah_name',
      chapterId: surahStart.chapterId,
      glyphText: surahNameGlyphText(surahStart.chapterId),
      words: []
    })
    if (chapterHasBismillahPre(surahStart.chapterId)) {
      decorative.push({
        lineNumber: Math.max(1, surahStart.firstAyahLine - 1),
        type: 'basmala',
        chapterId: surahStart.chapterId,
        words: []
      })
    }
  }

  const lines = []
  for (let lineNumber = 1; lineNumber <= MADANI_LINES_PER_PAGE; lineNumber += 1) {
    const deco = decorative.find(item => item.lineNumber === lineNumber)
    if (deco) {
      lines.push({ ...deco, lineNumber })
      continue
    }
    const ayahLine = ayahLineMap.get(lineNumber)
    if (ayahLine) {
      lines.push(ayahLine)
      continue
    }
    lines.push({
      lineNumber,
      type: 'empty',
      words: []
    })
  }

  // Match printed/screenshot pages: drop trailing empty ruled rows after last content.
  let lastContentIndex = lines.length - 1
  while (lastContentIndex >= 0 && lines[lastContentIndex].type === 'empty') {
    lastContentIndex -= 1
  }
  const visibleLines = lastContentIndex >= 0 ? lines.slice(0, lastContentIndex + 1) : lines

  const verseKeys = [...new Set(
    ayahLines.flatMap(line => line.words.map(word => word.verseKey).filter(Boolean))
  )]

  const firstVerse = verses[0] || null
  const firstKey = String(firstVerse?.verse_key || firstVerse?.key || verseKeys[0] || '')
  const primaryChapterId = Number(firstKey.split(':')[0]) || surahStart?.chapterId || null
  const juzNumber = Number(firstVerse?.juz_number)
    || Number(verses.find(verse => Number(verse?.juz_number) > 0)?.juz_number)
    || null

  return {
    pageNumber: page,
    fontFamily: qcfFontFamily(page, { tajweed }),
    tajweed,
    lines: visibleLines,
    verseKeys,
    primaryChapterId,
    juzNumber: Number.isFinite(juzNumber) && juzNumber > 0 ? juzNumber : null,
    verses: verses.map(verse => ({
      key: String(verse.verse_key || verse.key || ''),
      number: Number(verse.verse_number || String(verse.verse_key || '').split(':')[1]) || 0,
      pageNumber: Number(verse.page_number) || page,
      juzNumber: Number(verse.juz_number) || null
    }))
  }
}

/**
 * Inclusive list of Madani page numbers covering a verse page span.
 */
export function madaniPageRange(startPage, endPage) {
  const start = Math.max(1, Math.min(MADANI_TOTAL_PAGES, Number(startPage) || 1))
  const end = Math.max(start, Math.min(MADANI_TOTAL_PAGES, Number(endPage) || start))
  const pages = []
  for (let page = start; page <= end; page += 1) pages.push(page)
  return pages
}

/**
 * Resolve Madani pages from session verses that already carry page_number,
 * or from a Quran.com page lookup map keyed by verse key.
 */
export function resolveMadaniPagesForVerses(verses = [], pageByVerseKey = null) {
  const pages = new Set()
  for (const verse of verses) {
    const key = String(verse?.key || verse?.verse_key || '')
    const fromMap = pageByVerseKey instanceof Map ? pageByVerseKey.get(key) : null
    const page = Number(verse?.madaniPage || verse?.page_number || verse?.page || fromMap)
    if (Number.isFinite(page) && page >= 1 && page <= MADANI_TOTAL_PAGES) {
      pages.add(page)
    }
  }
  return [...pages].sort((a, b) => a - b)
}

export function isVerseInteractiveOnPage(verseKey, sessionKeys) {
  if (!sessionKeys || sessionKeys === true) return true
  if (sessionKeys instanceof Set) return sessionKeys.has(verseKey)
  if (Array.isArray(sessionKeys)) return sessionKeys.includes(verseKey)
  return true
}
