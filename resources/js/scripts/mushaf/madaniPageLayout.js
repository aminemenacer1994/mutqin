import { qcfFontFamily } from './qcfFontLoader.js'

export const MADANI_LINES_PER_PAGE = 15
export const MADANI_TOTAL_PAGES = 604
export const MADANI_LAYOUT_VERSION = 3

/**
 * Standalone basmala before ayah 1 for every surah except Al-Fatihah
 * (ayah 1 is the basmala) — including At-Tawbah per product requirement.
 */
export function chapterHasBismillahPre(chapterId) {
  const id = Number(chapterId)
  return Number.isFinite(id) && id >= 2
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
  return findAllSurahStartsOnPage(verses)[0] || null
}

/** Every surah that begins on this page, ordered by first ayah line. */
export function findAllSurahStartsOnPage(verses = []) {
  const starts = []
  const seen = new Set()

  for (const verse of verses) {
    const key = String(verse?.verse_key || verse?.key || '')
    const match = key.match(/^(\d+):1$/)
    if (!match) continue
    const chapterId = Number(match[1])
    if (seen.has(chapterId)) continue
    seen.add(chapterId)
    const firstWord = (verse.words || []).find(w => Number(w?.position) === 1) || verse.words?.[0]
    const lineNumber = Number(firstWord?.line_number)
    starts.push({
      chapterId,
      verseKey: key,
      firstAyahLine: Number.isFinite(lineNumber) ? lineNumber : 1
    })
  }

  return starts.sort((a, b) => a.firstAyahLine - b.firstAyahLine)
}

function lineIsOccupied(lineNumber, ayahLineMap, claimedLines) {
  return lineNumber < 1 || ayahLineMap.has(lineNumber) || claimedLines.has(lineNumber)
}

/**
 * Place surah name (+ basmala) on the reserved Madani blank rows that sit
 * immediately above the first ayah line. Falls back to packing directly
 * before the ayah when those slots already hold ayah text.
 */
export function resolveSurahHeaderPlacement(start, ayahLineMap, claimedLines = new Set()) {
  const firstAyahLine = Number(start?.firstAyahLine) || 1
  const hasBasmalah = chapterHasBismillahPre(start?.chapterId)
  const preferredNameLine = hasBasmalah ? firstAyahLine - 2 : firstAyahLine - 1
  const preferredBasmalaLine = hasBasmalah ? firstAyahLine - 1 : null

  const reservedFree = !lineIsOccupied(preferredNameLine, ayahLineMap, claimedLines)
    && (preferredBasmalaLine == null || !lineIsOccupied(preferredBasmalaLine, ayahLineMap, claimedLines))

  if (reservedFree) {
    return {
      chapterId: start.chapterId,
      firstAyahLine,
      surahNameLine: preferredNameLine,
      basmalaLine: preferredBasmalaLine,
      mode: 'reserved'
    }
  }

  return {
    chapterId: start.chapterId,
    firstAyahLine,
    surahNameLine: firstAyahLine,
    basmalaLine: hasBasmalah ? firstAyahLine : null,
    mode: 'inline'
  }
}

/**
 * Build a Madani page model with surah header + basmala before every surah start.
 * Headers occupy the printed blank rows above the first ayah whenever possible,
 * so surah transitions never leave empty bordered slots.
 */
export function buildMadaniPageLayout(pageNumber, verses = [], options = {}) {
  const page = Math.max(1, Math.min(MADANI_TOTAL_PAGES, Number(pageNumber) || 1))
  const tajweed = !!options.tajweed
  const ayahLines = groupWordsByLine(verses)
  const ayahLineMap = new Map(ayahLines.map(line => [line.lineNumber, line]))
  const surahStarts = findAllSurahStartsOnPage(verses)

  const claimedLines = new Set()
  const placements = surahStarts.map(start => {
    const placement = resolveSurahHeaderPlacement(start, ayahLineMap, claimedLines)
    claimedLines.add(placement.surahNameLine)
    if (placement.basmalaLine != null) claimedLines.add(placement.basmalaLine)
    return placement
  })

  const surahNameByLine = new Map()
  const basmalaByLine = new Map()
  const inlineByLine = new Map()

  for (const placement of placements) {
    if (placement.mode === 'reserved') {
      surahNameByLine.set(placement.surahNameLine, placement)
      if (placement.basmalaLine != null) {
        basmalaByLine.set(placement.basmalaLine, placement)
      }
    } else {
      inlineByLine.set(placement.firstAyahLine, placement)
    }
  }

  const maxLine = Math.max(
    0,
    ...ayahLines.map(line => line.lineNumber),
    ...placements.map(placement => placement.firstAyahLine),
    ...placements.map(placement => placement.surahNameLine),
    ...[...basmalaByLine.keys()]
  )

  const lines = []
  for (let lineNumber = 1; lineNumber <= maxLine; lineNumber += 1) {
    const reservedSurah = surahNameByLine.get(lineNumber)
    if (reservedSurah) {
      lines.push({
        lineNumber,
        type: 'surah_name',
        chapterId: reservedSurah.chapterId,
        glyphText: surahNameGlyphText(reservedSurah.chapterId),
        words: []
      })
    }

    const reservedBasmala = basmalaByLine.get(lineNumber)
    if (reservedBasmala) {
      lines.push({
        lineNumber,
        type: 'basmala',
        chapterId: reservedBasmala.chapterId,
        words: []
      })
    }

    const inlinePlacement = inlineByLine.get(lineNumber)
    if (inlinePlacement) {
      lines.push({
        lineNumber,
        type: 'surah_name',
        chapterId: inlinePlacement.chapterId,
        glyphText: surahNameGlyphText(inlinePlacement.chapterId),
        words: []
      })
      if (inlinePlacement.basmalaLine != null) {
        lines.push({
          lineNumber,
          type: 'basmala',
          chapterId: inlinePlacement.chapterId,
          words: []
        })
      }
    }

    const ayahLine = ayahLineMap.get(lineNumber)
    if (ayahLine) {
      lines.push(ayahLine)
    }
  }

  const visibleLines = lines.filter(line => line && line.type !== 'empty')

  const verseKeys = [...new Set(
    ayahLines.flatMap(line => line.words.map(word => word.verseKey).filter(Boolean))
  )]

  const firstVerse = verses[0] || null
  const firstKey = String(firstVerse?.verse_key || firstVerse?.key || verseKeys[0] || '')
  const primaryChapterId = Number(firstKey.split(':')[0]) || surahStarts[0]?.chapterId || null
  const juzNumber = Number(firstVerse?.juz_number)
    || Number(verses.find(verse => Number(verse?.juz_number) > 0)?.juz_number)
    || null

  return {
    pageNumber: page,
    layoutVersion: MADANI_LAYOUT_VERSION,
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

const EASTERN_ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Convert Western digits in a string to Eastern Arabic numerals. */
export function toEasternArabicDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, digit => EASTERN_ARABIC_DIGITS[Number(digit)])
}

/**
 * Label for ayah-end markers when not using QCF page glyphs.
 * Prefers API `textQpc` digits; falls back to the ayah number from verseKey.
 */
export function formatMadaniAyahEndLabel(word = {}) {
  const raw = String(word.textQpc || word.text_qpc_hafs || word.text || '').trim()
  const digits = raw.replace(/[^\d٠-٩]/g, '')
  if (digits) return toEasternArabicDigits(digits)

  const ayah = Number(String(word.verseKey || word.verse_key || '').split(':')[1])
  if (Number.isFinite(ayah) && ayah > 0) return toEasternArabicDigits(ayah)

  return raw
}
