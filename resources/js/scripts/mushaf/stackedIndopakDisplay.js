import { isIndopakMushafLayout } from './indopakPageAdapter.js'
import {
  INDOPAK_NASTALEEQ_FONT_FAMILY,
  INDOPAK_NASTALEEQ_FONT_STACK,
} from './indopakNastaleeqFont.js'
import { isMushafOrnamentWordText } from './madaniWordSync.js'
import { MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH } from './mushafLayouts.js'
import { getCachedMushafPageLeaf, loadMushafPageLeaf } from './mushafPageData.js'
import { resolveMushafPageForVerseKey } from './qpcMadaniVersePage.js'
import { mapWithConcurrency, selectPriorityPages } from './sessionPageLoad.js'

/**
 * Stacked ayah cards use the same IndoPak Unicode text + Nastaleeq face as mushaf.
 */
export function shouldUseStackedIndopakText({ readingViewMode, mushafLayoutId } = {}) {
  return readingViewMode === 'stacked' && isIndopakMushafLayout(mushafLayoutId)
}

export function stackedIndopakFontFamily() {
  return INDOPAK_NASTALEEQ_FONT_STACK
}

function ayahKeyFromPageWord(word = {}) {
  const fromLocation = String(word?.location || '').trim()
  if (fromLocation) {
    const [surah, ayah] = fromLocation.split(':')
    if (surah && ayah) return `${Number(surah)}:${Number(ayah)}`
  }
  const fromKey = String(word?.verseKey || word?.verse_key || '').trim()
  if (fromKey) {
    const [surah, ayah] = fromKey.split(':')
    if (surah && ayah) return `${Number(surah)}:${Number(ayah)}`
  }
  const surah = Number(word?.surah)
  const ayah = Number(word?.ayah)
  if (surah > 0 && ayah > 0) return `${surah}:${ayah}`
  return ''
}

export function verseHasStackedIndopakWords(verse) {
  if (verse?.indopakWords !== true) return false
  const words = Array.isArray(verse?.words) ? verse.words : []
  return words.some((word) => String(word?.text || '').trim() && !word?.isEnd)
}

export function collectIndopakPagesForVerseKeys(verseKeys = [], index = {}) {
  /** @type {Set<number>} */
  const pages = new Set()
  for (const key of verseKeys) {
    const start = resolveMushafPageForVerseKey(key, index, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
    if (!start) continue
    pages.add(start)
    pages.add(start + 1)
  }
  return [...pages].sort((a, b) => a - b)
}

export function collectIndopakPagesFromVerses(verses = []) {
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

/**
 * Pull the exact page-JSON words mushaf paints, keyed by ayah.
 * @param {Record<number, { page?: object, fontFamily?: string }>} leavesByPage
 * @param {Set<string>|string[]} verseKeys
 */
export function collectStackedIndopakWordsFromLeaves(leavesByPage = {}, verseKeys = []) {
  const wanted = verseKeys instanceof Set
    ? verseKeys
    : new Set((verseKeys || []).map((key) => String(key || '').trim()).filter(Boolean))
  /** @type {Map<string, object[]>} */
  const byKey = new Map()

  for (const [pageKey, leaf] of Object.entries(leavesByPage || {})) {
    const pageNumber = Math.trunc(Number(pageKey) || Number(leaf?.page?.page_number) || 0)
    const fontFamily = String(leaf?.fontFamily || INDOPAK_NASTALEEQ_FONT_FAMILY)
    const lines = Array.isArray(leaf?.page?.lines) ? leaf.page.lines : []
    for (const line of lines) {
      for (const word of line?.words || []) {
        const verseKey = ayahKeyFromPageWord(word)
        if (!verseKey || (wanted.size && !wanted.has(verseKey))) continue
        const text = String(word?.text || '').trim()
        if (!text) continue
        const isEnd = word?.isEnd === true || isMushafOrnamentWordText(text)
        const next = {
          ...word,
          verseKey,
          verse_key: verseKey,
          page: Number(word?.page || pageNumber) || pageNumber,
          page_number: Number(word?.page || pageNumber) || pageNumber,
          fontFamily,
          text,
          isEnd,
        }
        const list = byKey.get(verseKey) || []
        list.push(next)
        byKey.set(verseKey, list)
      }
    }
  }
  return byKey
}

export function joinStackedIndopakAyahText(words = []) {
  return (Array.isArray(words) ? words : [])
    .filter((word) => !word?.isEnd && String(word?.text || '').trim())
    .map((word) => String(word.text).trim())
    .join(' ')
}

export function planStackedIndopakPageFetch(verses = [], index = {}, focusPage = 0, options = {}) {
  const keys = (Array.isArray(verses) ? verses : [])
    .map((verse) => String(verse?.key || '').trim())
    .filter(Boolean)
  const pages = collectIndopakPagesForVerseKeys(keys, index)
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
 * Load IndoPak page leaves covering the given ayahs, then return ayah → mushaf words.
 * @param {object[]} verses
 * @param {Record<string, number>} index
 * @param {{ pages?: number[], concurrency?: number }} [options]
 */
export async function loadStackedIndopakWordsForVerses(verses = [], index = {}, options = {}) {
  const keys = (Array.isArray(verses) ? verses : [])
    .map((verse) => String(verse?.key || '').trim())
    .filter(Boolean)
  let pages = collectIndopakPagesForVerseKeys(keys, index)
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
      return [page, await loadMushafPageLeaf(page, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)]
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
  return collectStackedIndopakWordsFromLeaves(leavesByPage, keys)
}

export function getCachedStackedIndopakLeaf(pageNumber) {
  return getCachedMushafPageLeaf(pageNumber, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
}
