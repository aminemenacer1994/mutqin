/**
 * Render recommendation and practice-plan ayah snippets with the same
 * Madani Mushaf page glyphs the printed QPC V2 reader uses.
 * Unicode Uthmani text is not a substitute: only Presentation-Form
 * glyphs painted with the matching QCF page face are returned.
 */
import { ensureQpcMadaniPageFont } from './qpcMadaniFontLoader.js'
import { loadMadaniPageLeaf } from './qpcMadaniPageData.js'
import { isQcfPageGlyphText } from './qpcMadaniReadingTools.js'
import {
  loadMushafVersePageIndex,
  resolveMadaniPage,
} from './qpcMadaniVersePage.js'
import { MUSHAF_LAYOUT_MADANI_V2 } from './mushafLayouts.js'

/** @type {Map<string, Promise<object[]>>} */
const glyphCache = new Map()

/**
 * @param {{ page?: object, fontFamily?: string }|null} leaf
 * @param {number|string} surah
 * @param {number|string} ayah
 */
export function collectMadaniAyahGlyphsFromLeaf(leaf, surah, ayah) {
  const page = leaf?.page
  const fontFamily = String(leaf?.fontFamily || page?.font_family || '').trim()
  if (!page || !fontFamily) return []

  const surahN = Number(surah)
  const ayahN = Number(ayah)
  if (!Number.isFinite(surahN) || !Number.isFinite(ayahN) || surahN < 1 || ayahN < 1) return []

  /** @type {Array<{ word: number, text: string, fontFamily: string, page: number|null }>} */
  const glyphs = []
  for (const line of page.lines || []) {
    for (const word of line?.words || []) {
      if (Number(word?.surah) !== surahN || Number(word?.ayah) !== ayahN) continue
      const position = Number(word?.word)
      if (!Number.isFinite(position) || position < 1) continue
      const text = String(word?.text || '').trim()
      if (!isQcfPageGlyphText(text)) continue
      glyphs.push({
        word: position,
        text,
        fontFamily,
        page: Number(word?.page || page.page_number) || null,
      })
    }
  }

  glyphs.sort((a, b) => a.word - b.word)
  return glyphs
}

/**
 * Paint the same words with Madani page glyphs.
 * `ayahWordIndex` / `wordIndex` are 0-based within the ayah.
 * `phraseStart` is the 0-based first token when the phrase is a window.
 *
 * @param {Array<object>} parts
 * @param {Array<{ word: number, text: string, fontFamily: string, page?: number|null }>} glyphs
 * @param {{ phraseStart?: number }} [options]
 */
export function applyMadaniGlyphsToParts(parts, glyphs, options = {}) {
  const list = Array.isArray(parts) ? parts : []
  const byWord = new Map()
  for (const glyph of Array.isArray(glyphs) ? glyphs : []) {
    const position = Number(glyph?.word)
    if (!Number.isFinite(position) || position < 1 || !glyph?.fontFamily || !isQcfPageGlyphText(glyph.text)) continue
    byWord.set(position, glyph)
  }
  if (!byWord.size || !list.length) return list

  const phraseStart = Math.max(0, Number(options.phraseStart) || 0)
  return list.map((part, index) => {
    const raw = part?.ayahWordIndex ?? part?.wordIndex
    const hasExplicit = raw !== undefined && raw !== null && raw !== ''
      && Number.isFinite(Number(raw))
      && Number(raw) >= 0
    const local = hasExplicit
      ? Number(raw)
      : (options.contiguous === true
        ? phraseStart + (Number.isFinite(Number(part?.tokenIndex)) ? Number(part.tokenIndex) : index)
        : null)
    if (local == null) return part
    const glyph = byWord.get(local + 1)
    if (!glyph) return part
    return {
      ...part,
      text: glyph.text,
      fontFamily: glyph.fontFamily,
      madaniGlyph: true,
      page: glyph.page ?? null,
    }
  })
}

/**
 * Load Madani V2 glyphs for one ayah, including a continuation page.
 * @param {number|string} surah
 * @param {number|string} ayah
 * @returns {Promise<object[]>}
 */
export async function loadMadaniAyahGlyphs(surah, ayah) {
  const surahN = Number(surah)
  const ayahN = Number(ayah)
  if (!Number.isFinite(surahN) || !Number.isFinite(ayahN) || surahN < 1 || ayahN < 1) return []

  const key = `${surahN}:${ayahN}`
  const cached = glyphCache.get(key)
  if (cached) return cached

  const promise = (async () => {
    const index = await loadMushafVersePageIndex(MUSHAF_LAYOUT_MADANI_V2)
    const startPage = resolveMadaniPage(surahN, ayahN, index, MUSHAF_LAYOUT_MADANI_V2)
    if (!startPage) return []

    const pages = [startPage]
    if (startPage < 604) pages.push(startPage + 1)

    /** @type {Map<number, object>} */
    const merged = new Map()
    await Promise.all(pages.map(async (page) => {
      const leaf = await loadMadaniPageLeaf(page)
      const family = String(leaf?.fontFamily || '').trim()
      const url = String(leaf?.fontUrl || '').trim()
      if (family && url) {
        await ensureQpcMadaniPageFont(page, family, url)
      }
      for (const glyph of collectMadaniAyahGlyphsFromLeaf(leaf, surahN, ayahN)) {
        merged.set(glyph.word, glyph)
      }
    }))

    return [...merged.values()].sort((a, b) => a.word - b.word)
  })().catch((error) => {
    glyphCache.delete(key)
    throw error
  })

  glyphCache.set(key, promise)
  return promise
}
