import { qcfFontFamily } from './qcfFontLoader.js'

export const MADANI_LINES_PER_PAGE = 15
export const MADANI_TOTAL_PAGES = 604
export const MADANI_LAYOUT_VERSION = 7

/** Al-Fatihah ayah 1 is itself the basmala — isolate it onto its own row. */
export function isFatihahBasmalaVerseKey(verseKey) {
  return String(verseKey || '') === '1:1'
}

/**
 * Standalone basmala before ayah 1 for every surah except Al-Fatihah
 * (ayah 1 is the basmala) — including At-Tawbah per product requirement.
 */
export function chapterHasBismillahPre(chapterId) {
  const id = Number(chapterId)
  return Number.isFinite(id) && id >= 2
}

/** True when a verse/line already carries the basmala in its Arabic text. */
export function textStartsWithBasmala(text = '') {
  const raw = String(text || '').trim()
  if (!raw) return false
  const variants = [
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
    'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
    'بسم الله الرحمن الرحيم'
  ]
  if (variants.some(variant => raw.startsWith(variant))) return true
  const normalized = raw
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/[ٱ]/g, 'ا')
    .replace(/[ـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
  return normalized.startsWith('بسم الله الرحمن الرحيم')
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
  const textUthmani = String(word.text_uthmani || '').trim()
  const textQpcHafs = String(word.text_qpc_hafs || '').trim()
  return {
    id: word.id ?? null,
    position: Number(word.position) || 0,
    verseKey: String(verseKey || word.verseKey || word.verse_key || ''),
    charType,
    isEnd: charType === 'end',
    codeV2: String(word.code_v2 || word.text || ''),
    textUthmani,
    textQpc: textUthmani || textQpcHafs || String(word.text || ''),
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
  const firstAyahWords = ayahLineMap.get(firstAyahLine)?.words || []
  const firstAyahText = firstAyahWords.map(word => word.textQpc || word.codeV2 || '').join(' ')
  // Never synthesize a basmala row when ayah text already contains it.
  const hasBasmalah = chapterHasBismillahPre(start?.chapterId) && !textStartsWithBasmala(firstAyahText)
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

  // Inline fallback still emits basmala as its own line entry before the
  // ayah words (never merged into the ayah word list).
  return {
    chapterId: start.chapterId,
    firstAyahLine,
    surahNameLine: firstAyahLine,
    basmalaLine: hasBasmalah ? firstAyahLine : null,
    mode: 'inline'
  }
}

/**
 * Pull Al-Fatihah 1:1 (the basmala ayah) out of continuous ayah flow into a
 * dedicated centred row. Keeps the real words so highlighting/audio still work.
 */
export function isolateFatihahBasmalaLines(lines = []) {
  const result = []
  for (const line of lines) {
    if (!line || line.type !== 'ayah' || !Array.isArray(line.words) || !line.words.length) {
      result.push(line)
      continue
    }
    const basmalaWords = []
    const otherWords = []
    for (const word of line.words) {
      if (isFatihahBasmalaVerseKey(word.verseKey)) basmalaWords.push(word)
      else otherWords.push(word)
    }
    if (basmalaWords.length) {
      result.push({
        ...line,
        type: 'basmala_ayah',
        chapterId: 1,
        words: basmalaWords
      })
    }
    if (otherWords.length) {
      result.push({
        ...line,
        type: 'ayah',
        words: otherWords
      })
    }
    if (!basmalaWords.length && !otherWords.length) {
      result.push(line)
    }
  }
  return result
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

  const visibleLines = isolateFatihahBasmalaLines(
    lines.filter(line => line && line.type !== 'empty')
  )

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

/**
 * Build a Set of `chapter:ayah` keys for the active session range.
 * The declared chapter + ayah range is the source of truth so neighbouring
 * Madani-page ayahs never leak in via a broader verses array.
 */
export function buildSessionVerseKeySet(verses = [], { chapterId = 0, rangeStart = 0, rangeEnd = 0 } = {}) {
  const chapter = Number(chapterId)
  const start = Number(rangeStart)
  const end = Number(rangeEnd)
  if (Number.isFinite(chapter) && chapter >= 1 && Number.isFinite(start) && Number.isFinite(end) && end >= start && start >= 1) {
    const keys = new Set()
    for (let ayah = start; ayah <= end; ayah += 1) {
      keys.add(`${chapter}:${ayah}`)
    }
    return keys
  }

  const fromVerses = (Array.isArray(verses) ? verses : [])
    .map(verse => String(verse?.key || verse?.verse_key || '').trim())
    .filter(Boolean)
  return new Set(fromVerses)
}

export function isVerseInteractiveOnPage(verseKey, sessionKeys) {
  // null / true = no session filter (show everything)
  if (sessionKeys == null || sessionKeys === true) return true
  const key = String(verseKey || '').trim()
  if (!key) return false
  if (sessionKeys instanceof Set) return sessionKeys.has(key)
  if (Array.isArray(sessionKeys)) return sessionKeys.includes(key)
  if (typeof sessionKeys?.has === 'function') return !!sessionKeys.has(key)
  // Any session-shaped object without a working membership check is restrictive.
  return false
}

/**
 * Keep only verses whose keys are in the active session set.
 */
export function filterVersesToSession(verses = [], sessionKeys) {
  if (sessionKeys == null || sessionKeys === true) return Array.isArray(verses) ? verses : []
  const size = sessionKeys instanceof Set
    ? sessionKeys.size
    : (Array.isArray(sessionKeys) ? sessionKeys.length : Number(sessionKeys?.size || 0))
  if (!size) return []
  return (Array.isArray(verses) ? verses : []).filter(verse => (
    isVerseInteractiveOnPage(verse?.verse_key || verse?.key, sessionKeys)
  ))
}

/**
 * Keep only session ayah words (+ the matching basmala) for mushaf layout.
 * Out-of-range ayahs from the printed Madani page are removed entirely.
 */
export function filterMadaniLinesToSession(lines = [], sessionKeys) {
  // null / true = no session filter (legacy full-page paint).
  if (sessionKeys == null || sessionKeys === true) return Array.isArray(lines) ? lines : []
  const size = sessionKeys instanceof Set
    ? sessionKeys.size
    : (Array.isArray(sessionKeys) ? sessionKeys.length : Number(sessionKeys?.size || 0))
  // Empty session set must never fall back to the full Madani page.
  if (!size) return []

  const filtered = (Array.isArray(lines) ? lines : [])
    .filter(line => line && line.type !== 'empty' && line.type !== 'surah_name')
    .map((line) => {
      if (line.type === 'basmala') return { ...line, words: [] }
      const words = (line.words || []).filter(word => (
        isVerseInteractiveOnPage(word?.verseKey || word?.verse_key, sessionKeys)
      ))
      return { ...line, words }
    })
    .filter((line) => {
      if (line.type === 'ayah' || line.type === 'basmala_ayah') {
        return Array.isArray(line.words) && line.words.length > 0
      }
      return true
    })
    .filter((line, _idx, all) => {
      if (line.type === 'ayah' || line.type === 'basmala_ayah') return true
      if (line.type === 'basmala') {
        const chapterId = Number(line.chapterId)
        if (!Number.isFinite(chapterId) || chapterId < 2) return false
        return all.some(other => (
          (other.type === 'ayah' || other.type === 'basmala_ayah')
          && Array.isArray(other.words)
          && other.words.some(word => Number(String(word.verseKey || word.verse_key || '').split(':')[0]) === chapterId)
        ))
      }
      return all.some(other => (
        (other.type === 'ayah' || other.type === 'basmala_ayah') && other.words?.length
      ))
    })
    .filter((line, idx, all) => {
      if (line.type !== 'basmala') return true
      const chapterId = Number(line.chapterId)
      const firstIdx = all.findIndex(other => (
        other.type === 'basmala' && Number(other.chapterId) === chapterId
      ))
      return firstIdx === idx
    })

  return filtered
}

const EASTERN_ARABIC_DIGITS = '٠١٢٣٤٥٦٧٨٩'

/** Convert Western digits in a string to Eastern Arabic numerals. */
export function toEasternArabicDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, digit => EASTERN_ARABIC_DIGITS[Number(digit)])
}

/**
 * Label for ayah-end markers when not using QCF page glyphs.
 * Always prefer the per-surah ayah index from verseKey (`2:1` → 1).
 * Never use global Quran-wide ids (alquran `ayah.number` / Quran.com `verse.id`).
 * Prefixed with U+06DD so Amiri/Scheherazade draw the ornate frame with
 * the Eastern digit centered inside (same as stacked layout markers).
 */
export function formatMadaniAyahEndLabel(word = {}) {
  const ayah = Number(String(word.verseKey || word.verse_key || '').split(':')[1])
  if (Number.isFinite(ayah) && ayah > 0) return `\u06DD${toEasternArabicDigits(ayah)}`

  const raw = String(word.textQpc || word.text_qpc_hafs || word.text || '').trim()
  const digits = raw.replace(/[^\d٠-٩]/g, '')
  if (digits) return `\u06DD${toEasternArabicDigits(digits)}`

  return raw
}
