import { getCachedMadaniPageLeaf, loadMadaniPageLeaf } from './qpcMadaniPageData.js'
import { ensureQpcMadaniPageFont } from './qpcMadaniFontLoader.js'
import { loadQcfPageFont, qcfFontFamily } from './qcfFontLoader.js'
import {
  isQcfPageGlyphText,
  resolveQpcMadaniWordGlyph,
} from './qpcMadaniReadingTools.js'
import { isIndopakMushafLayout } from './indopakPageAdapter.js'
import { resolveMushafPageForVerseKey } from './qpcMadaniVersePage.js'
import { MUSHAF_LAYOUT_MADANI_V2 } from './mushafLayouts.js'

/**
 * Stacked ayah cards use the same QCF Madani page fonts as madani_mushaf (not Unicode Uthmanic).
 */
export function shouldUseStackedQpcMadaniGlyphs({ readingViewMode, mushafLayoutId } = {}) {
  if (readingViewMode !== 'stacked') return false
  return !isIndopakMushafLayout(mushafLayoutId)
}

export function verseWordsSupportQpcMadani(verse) {
  const words = Array.isArray(verse?.words) ? verse.words : []
  if (!words.length) return false
  return words.some((word) => {
    const glyph = String(word?.text || word?.code_v2 || word?.codeV2 || '').trim()
    return isQcfPageGlyphText(glyph)
  })
}

export function collectQpcPagesFromVerses(verses = []) {
  /** @type {Set<number>} */
  const pages = new Set()
  for (const verse of verses) {
    if (!verse || typeof verse !== 'object') continue
    for (const word of verse.words || []) {
      const page = Number(word?.page ?? word?.page_number ?? word?.pageNumber)
      if (Number.isFinite(page) && page > 0) pages.add(Math.trunc(page))
    }
  }
  return [...pages].sort((a, b) => a - b)
}

export function collectQpcPagesForVerseKeys(verseKeys = [], index = {}) {
  /** @type {Set<number>} */
  const pages = new Set()
  for (const key of verseKeys) {
    const start = resolveMushafPageForVerseKey(key, index, MUSHAF_LAYOUT_MADANI_V2)
    if (!start) continue
    pages.add(start)
    pages.add(start + 1)
  }
  return [...pages].sort((a, b) => a - b)
}

function ayahKeyFromPageWord(word = {}) {
  const fromLocation = String(word?.location || '').trim()
  if (fromLocation) {
    const [surah, ayah] = fromLocation.split(':')
    if (surah && ayah) return `${Number(surah)}:${Number(ayah)}`
  }
  const surah = Number(word?.surah)
  const ayah = Number(word?.ayah)
  if (surah > 0 && ayah > 0) return `${surah}:${ayah}`
  return ''
}

/**
 * Pull the exact page-JSON words mushaf paints, keyed by ayah.
 * @param {Record<number, { page?: object, fontFamily?: string }>} leavesByPage
 * @param {Set<string>|string[]} verseKeys
 */
export function collectStackedQpcWordsFromLeaves(leavesByPage = {}, verseKeys = []) {
  const wanted = verseKeys instanceof Set
    ? verseKeys
    : new Set((verseKeys || []).map((key) => String(key || '').trim()).filter(Boolean))
  /** @type {Map<string, object[]>} */
  const byKey = new Map()

  for (const [pageKey, leaf] of Object.entries(leavesByPage || {})) {
    const pageNumber = Math.trunc(Number(pageKey) || Number(leaf?.page?.page_number) || 0)
    const fontFamily = String(leaf?.fontFamily || leaf?.page?.font_family || '').trim()
    const lines = Array.isArray(leaf?.page?.lines) ? leaf.page.lines : []
    for (const line of lines) {
      for (const word of line?.words || []) {
        const verseKey = ayahKeyFromPageWord(word)
        if (!verseKey || (wanted.size && !wanted.has(verseKey))) continue
        if (!isQcfPageGlyphText(word?.text)) continue
        const next = {
          ...word,
          verseKey,
          verse_key: verseKey,
          page: Number(word?.page || pageNumber) || pageNumber,
          page_number: Number(word?.page || pageNumber) || pageNumber,
          fontFamily,
        }
        const list = byKey.get(verseKey) || []
        list.push(next)
        byKey.set(verseKey, list)
      }
    }
  }
  return byKey
}

/** Same page font family name the mushaf reader loads from Madani page JSON. */
export function resolveStackedQpcPageFontFamily(pageNumber, word = {}) {
  const fromWord = String(word?.fontFamily || '').trim()
  if (fromWord) return fromWord
  const page = Math.trunc(Number(pageNumber) || 0)
  if (page < 1) return ''
  const leaf = getCachedMadaniPageLeaf(page)
  return String(leaf?.fontFamily || qcfFontFamily(page, { tajweed: false }))
}

/**
 * Resolve ink + font the same way MadaniWord does:
 * plain = page JSON `text` + leaf `QCF2xxx`; tajweed = code_v2 + pN-v4.
 */
export function resolveStackedQpcWordInk(rawWord, options = {}) {
  const page = Math.trunc(Number(rawWord?.page || rawWord?.page_number || 0))
  const tajweedEnabled = !!options.tajweedEnabled
  const glyph = resolveQpcMadaniWordGlyph({
    word: rawWord,
    tajweedEnabled,
    codeV2ByLocation: options.codeV2ByLocation || {},
  })
  if (glyph.useTajweedFont && glyph.text) {
    return {
      text: glyph.text,
      fontFamily: glyph.fontFamily || qcfFontFamily(page, { tajweed: true }),
      tajweedGlyph: true,
    }
  }
  return {
    text: String(glyph.text || rawWord?.text || '').trim(),
    fontFamily: resolveStackedQpcPageFontFamily(page, rawWord),
    tajweedGlyph: false,
    isQcfGlyph: isQcfPageGlyphText(rawWord?.text || glyph.text),
  }
}

/** Load the same woff2 page faces MadaniPage uses before painting stacked QCF text. */
export async function ensureStackedQpcMadaniPageFonts(pages = [], { tajweed = false } = {}) {
  const unique = [...new Set(
    pages.map((p) => Math.trunc(Number(p) || 0)).filter((p) => p > 0),
  )]
  await Promise.all(unique.map(async (page) => {
    try {
      const leaf = await loadMadaniPageLeaf(page)
      if (leaf?.fontFamily && leaf?.fontUrl) {
        await ensureQpcMadaniPageFont(page, leaf.fontFamily, leaf.fontUrl)
      }
    } catch {
      // Non-fatal: ayah text falls back until a retry succeeds.
    }
    if (tajweed) {
      try {
        await loadQcfPageFont(page, { tajweed: true })
      } catch {
        // v4 prefetch is best-effort; page JSON glyphs still paint.
      }
    }
  }))
}

/**
 * Load page leaves covering the given ayahs, then return ayah → mushaf words.
 */
export async function loadStackedQpcWordsForVerses(verses = [], index = {}) {
  const keys = (Array.isArray(verses) ? verses : [])
    .map((verse) => String(verse?.key || '').trim())
    .filter(Boolean)
  const pages = collectQpcPagesForVerseKeys(keys, index)
  if (!pages.length) return new Map()

  const leaves = await Promise.all(pages.map(async (page) => {
    try {
      return [page, await loadMadaniPageLeaf(page)]
    } catch {
      return [page, null]
    }
  }))
  /** @type {Record<number, object>} */
  const leavesByPage = {}
  for (const [page, leaf] of leaves) {
    if (leaf?.page) leavesByPage[page] = leaf
  }
  return collectStackedQpcWordsFromLeaves(leavesByPage, keys)
}
