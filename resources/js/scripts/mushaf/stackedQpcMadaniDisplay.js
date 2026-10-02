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
import { mapWithConcurrency, selectPriorityPages } from './sessionPageLoad.js'

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
 * Split a session's printed pages into a small first-paint set and the remainder.
 * Ranges of a few pages stay eager so short surahs do not flash in two passes.
 * @param {object[]} verses
 * @param {Record<string, number>} index
 * @param {number} focusPage
 * @param {{ radius?: number, fullThreshold?: number }} [options]
 */
export function planStackedQpcPageFetch(verses = [], index = {}, focusPage = 0, options = {}) {
  const keys = (Array.isArray(verses) ? verses : [])
    .map((verse) => String(verse?.key || '').trim())
    .filter(Boolean)
  const pages = collectQpcPagesForVerseKeys(keys, index)
  const threshold = Math.max(1, Math.trunc(Number(options.fullThreshold) || 3))
  if (pages.length <= threshold) {
    return { pages, priority: pages, rest: [] }
  }
  const priority = selectPriorityPages(pages, focusPage, options.radius ?? 1)
  const prioritySet = new Set(priority)
  return {
    pages,
    priority,
    rest: pages.filter((page) => !prioritySet.has(page)),
  }
}

/**
 * Load page leaves covering the given ayahs, then return ayah → mushaf words.
 * `options.pages` limits the fetch to a window. `options.concurrency` caps
 * parallel page JSON downloads (0 keeps a single Promise.all).
 * @param {object[]} verses
 * @param {Record<string, number>} index
 * @param {{ pages?: number[], concurrency?: number }} [options]
 */
export async function loadStackedQpcWordsForVerses(verses = [], index = {}, options = {}) {
  const keys = (Array.isArray(verses) ? verses : [])
    .map((verse) => String(verse?.key || '').trim())
    .filter(Boolean)
  let pages = collectQpcPagesForVerseKeys(keys, index)
  if (Array.isArray(options.pages)) {
    const allow = new Set(
      options.pages.map((page) => Math.trunc(Number(page))).filter((page) => page > 0),
    )
    pages = pages.filter((page) => allow.has(page))
  }
  if (!pages.length) return new Map()

  const concurrency = Math.max(0, Math.trunc(Number(options.concurrency) || 0))
  const loadOne = async (page) => {
    try {
      return [page, await loadMadaniPageLeaf(page)]
    } catch {
      return [page, null]
    }
  }
  const leaves = concurrency > 0
    ? await mapWithConcurrency(pages, concurrency, (page) => loadOne(page))
    : await Promise.all(pages.map((page) => loadOne(page)))
  /** @type {Record<number, object>} */
  const leavesByPage = {}
  for (const entry of leaves) {
    const page = entry?.[0]
    const leaf = entry?.[1]
    if (leaf?.page) leavesByPage[page] = leaf
  }
  return collectStackedQpcWordsFromLeaves(leavesByPage, keys)
}
