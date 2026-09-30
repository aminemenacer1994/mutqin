import {
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from './mushafLayouts.js'
import { INDOPAK_NASTALEEQ_FONT_FAMILY, INDOPAK_NASTALEEQ_FONT_URL } from './indopakNastaleeqFont.js'
import { isMushafOrnamentWordText } from './madaniWordSync.js'

/**
 * Normalize a generated IndoPak page into the shared mushaf renderer shape.
 * Preserves printed line breaks and per-word DOM identity — never regroups ayahs.
 *
 * @param {object} raw
 * @returns {{ page_number: number, lines: object[], layout_id: string }}
 */
export function normalizeIndopakPage(raw = {}) {
  const pageNumber = Math.trunc(Number(raw.pageNumber ?? raw.page_number) || 0)
  const sourceLines = Array.isArray(raw.lines) ? [...raw.lines] : []

  sourceLines.sort((a, b) => {
    const left = Math.trunc(Number(a?.lineNumber ?? a?.line_number) || 0)
    const right = Math.trunc(Number(b?.lineNumber ?? b?.line_number) || 0)
    return left - right
  })

  const lines = sourceLines.map((line) => normalizeIndopakLine(line, pageNumber))

  return {
    page_number: pageNumber,
    lines,
    layout_id: MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  }
}

/**
 * @param {object} line
 * @param {number} pageNumber
 */
function normalizeIndopakLine(line = {}, pageNumber = 0) {
  const lineNumber = Math.trunc(Number(line.lineNumber ?? line.line_number) || 0)
  const type = String(line.type ?? line.line_type ?? '')
  const centered = line.centered === true
    || line.centered === 1
    || line.is_centered === 1
    || line.is_centered === true
  const surahNumber = line.surahNumber ?? line.surah_number ?? null
  const rawWords = Array.isArray(line.words) ? line.words : []

  // Keep source word order exactly — do not sort or redistribute across lines.
  const words = rawWords.map((word) => normalizeIndopakWord(word, pageNumber, lineNumber))

  return {
    line_number: lineNumber,
    line_type: type,
    type,
    is_centered: centered ? 1 : 0,
    centered,
    surah_number: surahNumber == null || surahNumber === '' ? null : Number(surahNumber),
    first_word_id: line.firstWordId ?? line.first_word_id ?? null,
    last_word_id: line.lastWordId ?? line.last_word_id ?? null,
    words,
  }
}

/**
 * @param {object} word
 * @param {number} pageNumber
 * @param {number} lineNumber
 */
function normalizeIndopakWord(word = {}, pageNumber = 0, lineNumber = 0) {
  const location = String(word.location || '').trim()
  const verseKey = String(word.verseKey || word.verse_key || '').trim()
  const parts = location.split(':')
  const fromLocation = {
    surah: Number(parts[0]),
    ayah: Number(parts[1]),
    word: Number(parts[2]),
  }
  const verseParts = verseKey.split(':')
  const surah = Number.isFinite(fromLocation.surah) && fromLocation.surah > 0
    ? Math.trunc(fromLocation.surah)
    : Math.trunc(Number(verseParts[0]) || 0)
  const ayah = Number.isFinite(fromLocation.ayah) && fromLocation.ayah > 0
    ? Math.trunc(fromLocation.ayah)
    : Math.trunc(Number(verseParts[1]) || 0)
  const wordPosition = Math.trunc(
    Number(word.wordPosition ?? word.word_position ?? word.word ?? fromLocation.word) || 0,
  )
  const id = Math.trunc(Number(word.wordIndex ?? word.word_index ?? word.id) || 0)
  const resolvedLocation = location
    || (surah && ayah && wordPosition ? `${surah}:${ayah}:${wordPosition}` : '')
  const resolvedVerseKey = verseKey
    || (surah && ayah ? `${surah}:${ayah}` : '')
  const text = String(word.text || '')
  const isEnd = isMushafOrnamentWordText(text)

  return {
    id,
    wordIndex: id,
    location: resolvedLocation,
    verseKey: resolvedVerseKey,
    verse_key: resolvedVerseKey,
    wordPosition,
    word_position: wordPosition,
    surah,
    ayah,
    word: wordPosition,
    page: pageNumber,
    line: lineNumber,
    text,
    isEnd,
    charType: isEnd ? 'end' : 'word',
  }
}

/**
 * Build a renderer leaf for IndoPak (Unicode text + single Nastaleeq face).
 *
 * @param {object} rawPage
 * @returns {{ page: object, fontFamily: string, fontUrl: string, layoutId: string }}
 */
export function buildIndopakPageLeaf(rawPage) {
  const page = normalizeIndopakPage(rawPage)
  return {
    page,
    fontFamily: INDOPAK_NASTALEEQ_FONT_FAMILY,
    fontUrl: INDOPAK_NASTALEEQ_FONT_URL,
    layoutId: MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  }
}

/**
 * @param {string | { id?: string } | null | undefined} layoutIdOrLayout
 */
export function isIndopakMushafLayout(layoutIdOrLayout) {
  const id = typeof layoutIdOrLayout === 'object' && layoutIdOrLayout
    ? String(layoutIdOrLayout.id || '')
    : String(layoutIdOrLayout || '')
  return id === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH
}

/**
 * @param {string | { id?: string } | null | undefined} layoutIdOrLayout
 */
export function mushafLayoutUsesUnicodeFont(layoutIdOrLayout) {
  try {
    const layout = getMushafLayout(layoutIdOrLayout || MUSHAF_LAYOUT_MADANI_V2)
    return layout.fontStrategy === 'unicode-text'
  } catch {
    return false
  }
}
