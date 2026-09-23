import { markRaw } from 'vue'
import {
  clampMadaniPage,
  nextMadaniSpread,
  previousMadaniSpread,
  resolveMadaniSpread,
} from './madaniPagePair.js'

/** @typedef {{ page: object, fontFamily: string, fontUrl: string }} MadaniPageLeaf */

/** @type {Map<number, MadaniPageLeaf>} */
const pageDataCache = new Map()

/** @type {Map<number, Promise<MadaniPageLeaf>>} */
const pageDataInflight = new Map()

export const MADANI_V2_PAGES_BASE = '/quran/madani-v2/pages'

export function madaniPageJsonUrl(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  return `${MADANI_V2_PAGES_BASE}/${String(page).padStart(3, '0')}.json`
}

export function getCachedMadaniPageLeaf(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  return pageDataCache.get(page) || null
}

/**
 * Seed the shared cache (e.g. SSR/blade embedded first page).
 * @param {number} pageNumber
 * @param {MadaniPageLeaf} leaf
 */
export function cacheMadaniPageLeaf(pageNumber, leaf) {
  const page = clampMadaniPage(pageNumber)
  if (!leaf?.page) return
  pageDataCache.set(page, {
    page: markRaw(leaf.page),
    fontFamily: String(leaf.fontFamily || ''),
    fontUrl: String(leaf.fontUrl || ''),
  })
}

async function fetchPageEnvelope(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  const staticResponse = await fetch(madaniPageJsonUrl(page), {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (staticResponse.ok) {
    return staticResponse.json()
  }
  const fallback = await fetch(`/madani/page/${page}/data`, {
    headers: { Accept: 'application/json' },
    credentials: 'same-origin',
  })
  if (!fallback.ok) {
    throw new Error(`Madani page ${page} data unavailable (${fallback.status})`)
  }
  return fallback.json()
}

/**
 * @param {number} pageNumber
 * @returns {Promise<MadaniPageLeaf>}
 */
export async function loadMadaniPageLeaf(pageNumber) {
  const page = clampMadaniPage(pageNumber)
  const cached = pageDataCache.get(page)
  if (cached) {
    return cached
  }

  let inflight = pageDataInflight.get(page)
  if (!inflight) {
    inflight = fetchPageEnvelope(page)
      .then((payload) => {
        const leaf = {
          page: markRaw(payload.page),
          fontFamily: String(payload.font_family || ''),
          fontUrl: String(payload.font_url || ''),
        }
        pageDataCache.set(page, leaf)
        return leaf
      })
      .finally(() => {
        pageDataInflight.delete(page)
      })
    pageDataInflight.set(page, inflight)
  }

  return inflight
}

function uniquePages(numbers) {
  return [...new Set(numbers.map((n) => clampMadaniPage(n)).filter(Boolean))]
}

/**
 * @param {number[]} pageNumbers
 */
export function prefetchMadaniPageData(pageNumbers) {
  uniquePages(pageNumbers).forEach((page) => {
    if (pageDataCache.has(page) || pageDataInflight.has(page)) return
    void loadMadaniPageLeaf(page).catch(() => {})
  })
}

/**
 * @param {'single'|'spread'} mode
 * @param {number} currentPage
 */
export function preloadMadaniNavigationTargets(mode, currentPage) {
  const page = clampMadaniPage(currentPage)
  if (mode === 'single') {
    prefetchMadaniPageData([page - 1, page + 1])
    return
  }

  const spread = resolveMadaniSpread(page)
  const targets = [...spread.pages]
  const previousSpreadAnchor = previousMadaniSpread(spread.right)
  if (previousSpreadAnchor) {
    targets.push(...resolveMadaniSpread(previousSpreadAnchor).pages)
  }
  const lastVisible = spread.left ?? spread.right
  const nextSpreadAnchor = nextMadaniSpread(lastVisible)
  if (nextSpreadAnchor) {
    targets.push(...resolveMadaniSpread(nextSpreadAnchor).pages)
  }
  prefetchMadaniPageData(targets)
}

export function clearMadaniPageDataCacheForTests() {
  pageDataCache.clear()
  pageDataInflight.clear()
}
