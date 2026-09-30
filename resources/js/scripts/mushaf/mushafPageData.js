import { markRaw } from 'vue'
import {
  clampMushafPage,
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
  mushafPageJsonUrl,
} from './mushafLayouts.js'
import { buildIndopakPageLeaf } from './indopakPageAdapter.js'
import {
  INDOPAK_NASTALEEQ_FONT_FAMILY,
  INDOPAK_NASTALEEQ_FONT_URL,
} from './indopakNastaleeqFont.js'

/** @typedef {{ page: object, fontFamily: string, fontUrl: string, layoutId: string }} MushafPageLeaf */

/** @type {Map<string, MushafPageLeaf>} */
const pageDataCache = new Map()

/** @type {Map<string, Promise<MushafPageLeaf>>} */
const pageDataInflight = new Map()

function cacheKey(layoutId, pageNumber) {
  return `${layoutId}:${pageNumber}`
}

/**
 * @param {number} pageNumber
 * @param {string} [layoutId]
 */
export function mushafPageDataUrl(pageNumber, layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  const layout = getMushafLayout(layoutId)
  const page = clampMushafPage(pageNumber, layout)
  if (layout.id === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH) {
    return `/indopak/page/${page}/data`
  }
  return mushafPageJsonUrl(page, layout)
}

/**
 * @param {number} pageNumber
 * @param {string} [layoutId]
 */
export function getCachedMushafPageLeaf(pageNumber, layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  const layout = getMushafLayout(layoutId)
  const page = clampMushafPage(pageNumber, layout)
  return pageDataCache.get(cacheKey(layout.id, page)) || null
}

/**
 * @param {number} pageNumber
 * @param {MushafPageLeaf} leaf
 * @param {string} [layoutId]
 */
export function cacheMushafPageLeaf(pageNumber, leaf, layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  const layout = getMushafLayout(layoutId || leaf?.layoutId || MUSHAF_LAYOUT_MADANI_V2)
  const page = clampMushafPage(pageNumber, layout)
  if (!leaf?.page) return
  pageDataCache.set(cacheKey(layout.id, page), {
    page: markRaw(leaf.page),
    fontFamily: String(leaf.fontFamily || ''),
    fontUrl: String(leaf.fontUrl || ''),
    layoutId: layout.id,
  })
}

async function fetchIndopakEnvelope(page) {
  const response = await fetch(`/indopak/page/${page}/data`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!response.ok) {
    throw new Error(`IndoPak page ${page} data unavailable (${response.status})`)
  }
  const payload = await response.json()
  const leaf = buildIndopakPageLeaf(payload.page || payload)
  return {
    page: leaf.page,
    fontFamily: String(payload.font_family || leaf.fontFamily || INDOPAK_NASTALEEQ_FONT_FAMILY),
    fontUrl: String(payload.font_url || leaf.fontUrl || INDOPAK_NASTALEEQ_FONT_URL),
    layoutId: MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  }
}

async function fetchMadaniEnvelope(page) {
  const staticResponse = await fetch(mushafPageJsonUrl(page, MUSHAF_LAYOUT_MADANI_V2), {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  let payload
  if (staticResponse.ok) {
    payload = await staticResponse.json()
  } else {
    const fallback = await fetch(`/madani/page/${page}/data`, {
      headers: { Accept: 'application/json' },
      credentials: 'same-origin',
    })
    if (!fallback.ok) {
      throw new Error(`Madani page ${page} data unavailable (${fallback.status})`)
    }
    payload = await fallback.json()
  }
  return {
    page: payload.page,
    fontFamily: String(payload.font_family || ''),
    fontUrl: String(payload.font_url || ''),
    layoutId: MUSHAF_LAYOUT_MADANI_V2,
  }
}

/**
 * @param {number} pageNumber
 * @param {string} [layoutId]
 * @returns {Promise<MushafPageLeaf>}
 */
export async function loadMushafPageLeaf(pageNumber, layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  const layout = getMushafLayout(layoutId)
  const page = clampMushafPage(pageNumber, layout)
  const key = cacheKey(layout.id, page)
  const cached = pageDataCache.get(key)
  if (cached) return cached

  let inflight = pageDataInflight.get(key)
  if (!inflight) {
    inflight = (layout.id === MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH
      ? fetchIndopakEnvelope(page)
      : fetchMadaniEnvelope(page))
      .then((payload) => {
        const leaf = {
          page: markRaw(payload.page),
          fontFamily: String(payload.fontFamily || ''),
          fontUrl: String(payload.fontUrl || ''),
          layoutId: payload.layoutId || layout.id,
        }
        pageDataCache.set(key, leaf)
        return leaf
      })
      .finally(() => {
        pageDataInflight.delete(key)
      })
    pageDataInflight.set(key, inflight)
  }

  return inflight
}

/**
 * @param {number[]} pageNumbers
 * @param {string} [layoutId]
 */
export function prefetchMushafPageData(pageNumbers = [], layoutId = MUSHAF_LAYOUT_MADANI_V2) {
  const layout = getMushafLayout(layoutId)
  const unique = [...new Set(
    (pageNumbers || [])
      .map((n) => clampMushafPage(n, layout))
      .filter(Boolean),
  )]
  unique.forEach((page) => {
    const key = cacheKey(layout.id, page)
    if (pageDataCache.has(key) || pageDataInflight.has(key)) return
    void loadMushafPageLeaf(page, layout.id).catch(() => {})
  })
}

export function clearMushafPageDataCacheForTests() {
  pageDataCache.clear()
  pageDataInflight.clear()
}
