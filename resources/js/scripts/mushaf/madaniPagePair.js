import {
  clampMushafPage,
  DEFAULT_MUSHAF_LAYOUT_ID,
  getMushafLayout,
  MUSHAF_LAYOUT_MADANI_V2,
} from './mushafLayouts.js'
import {
  MADANI_TWO_PAGE_MIN_WIDTH as INDOPAK_SHARED_MADANI_TWO_PAGE,
  mushafTwoPageMinWidth,
  shouldShowTwoMushafPages,
} from './indopakPageTypography.js'

const MADANI_LAYOUT = getMushafLayout(MUSHAF_LAYOUT_MADANI_V2)

export const MADANI_MIN_PAGE = 1
export const MADANI_MAX_PAGE = MADANI_LAYOUT.pageCount

/** Two pages only when each leaf stays at least this wide (Madani V2). */
export const MADANI_TWO_PAGE_MIN_WIDTH = INDOPAK_SHARED_MADANI_TWO_PAGE

export function clampMadaniPage(page) {
  return clampMushafPage(page, MUSHAF_LAYOUT_MADANI_V2)
}

/**
 * RTL open-mushaf pair: odd page on the right, even page on the left.
 * Page bounds come from activeLayout.pageCount (Madani 604 vs IndoPak 610).
 *
 * @param {number|string} page
 * @param {string | { id?: string, pageCount?: number } | null | undefined} [layoutId]
 * @returns {{ right: number, left: number | null, pages: number[] }}
 */
export function resolveMushafSpread(page, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  const maxPage = layout.pageCount
  const current = clampMushafPage(page, layout)
  const right = current % 2 === 1 ? current : current - 1
  const left = right + 1
  if (left > maxPage) {
    return { right, left: null, pages: [right] }
  }
  return { right, left, pages: [right, left] }
}

/**
 * RTL open-mushaf pair for Madani V2: (1,2) … (pageCount-1, pageCount).
 */
export function resolveMadaniSpread(page) {
  return resolveMushafSpread(page, MUSHAF_LAYOUT_MADANI_V2)
}

export function previousMadaniSpread(page) {
  const right = resolveMadaniSpread(page).right
  return right > MADANI_MIN_PAGE ? right - 2 : null
}

export function nextMadaniSpread(page) {
  const layout = getMushafLayout(MUSHAF_LAYOUT_MADANI_V2)
  const spread = resolveMadaniSpread(page)
  const last = spread.left ?? spread.right
  return last < layout.pageCount ? last + 1 : null
}

export function previousMushafPage(page, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const current = clampMushafPage(page, layoutId)
  return current > 1 ? current - 1 : null
}

export function nextMushafPage(page, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  const current = clampMushafPage(page, layout)
  return current < layout.pageCount ? current + 1 : null
}

export function previousMushafSpread(page, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const right = resolveMushafSpread(page, layoutId).right
  return right > 1 ? right - 2 : null
}

export function nextMushafSpread(page, layoutId = DEFAULT_MUSHAF_LAYOUT_ID) {
  const layout = getMushafLayout(layoutId)
  const spread = resolveMushafSpread(page, layout)
  const last = spread.left ?? spread.right
  return last < layout.pageCount ? last + 1 : null
}

export function previousMadaniPage(page) {
  return previousMushafPage(page, MUSHAF_LAYOUT_MADANI_V2)
}

export function nextMadaniPage(page) {
  return nextMushafPage(page, MUSHAF_LAYOUT_MADANI_V2)
}

export function shouldShowTwoMadaniPages(width) {
  return shouldShowTwoMushafPages(width, MUSHAF_LAYOUT_MADANI_V2)
}

export { mushafTwoPageMinWidth, shouldShowTwoMushafPages }

function uniqueSortedPages(pages = []) {
  return [...new Set(
    (Array.isArray(pages) ? pages : [])
      .map((page) => Number(page))
      .filter((page) => Number.isFinite(page) && page > 0),
  )].sort((left, right) => left - right)
}

/**
 * Pair session pages for a two-page reader: earlier page on the right.
 * Avoids showing a blank leaf when the printed odd/even partner is outside the session.
 */
export function pairSessionPages(sessionPages = []) {
  const pages = uniqueSortedPages(sessionPages)
  const pairs = []
  for (let index = 0; index < pages.length; index += 2) {
    const right = pages[index]
    const left = pages[index + 1] ?? null
    pairs.push({
      right,
      left,
      pages: left != null ? [right, left] : [right],
    })
  }
  return pairs
}

export function resolveSessionAwareSpread(currentPage, sessionPages = []) {
  const pages = uniqueSortedPages(sessionPages)
  const current = Number(currentPage)
  if (!pages.length) {
    return {
      right: current,
      left: null,
      pages: Number.isFinite(current) && current > 0 ? [current] : [],
    }
  }
  const pairs = pairSessionPages(pages)
  return pairs.find((pair) => pair.pages.includes(current)) || pairs[0]
}

export function previousSessionSpreadPage(currentPage, sessionPages = []) {
  const pairs = pairSessionPages(sessionPages)
  const index = pairs.findIndex((pair) => pair.pages.includes(Number(currentPage)))
  if (index <= 0) return null
  return pairs[index - 1].right
}

export function nextSessionSpreadPage(currentPage, sessionPages = []) {
  const pairs = pairSessionPages(sessionPages)
  const index = pairs.findIndex((pair) => pair.pages.includes(Number(currentPage)))
  if (index < 0 || index >= pairs.length - 1) return null
  return pairs[index + 1].right
}

/**
 * Desktop two-page reader uses consecutive session pages when the printed
 * partner is outside the session (e.g. Baqarah 2+3 instead of empty page 1).
 */
export function resolveSpreadLeafPageNumbers({
  spreadPages = [],
  sessionPageNumbers = [],
  currentPage = 0,
  keepPrintedPair = false,
} = {}) {
  const session = uniqueSortedPages(sessionPageNumbers)
  if (keepPrintedPair && session.length) {
    return resolveSessionAwareSpread(currentPage || session[0], session).pages
  }
  const pair = uniqueSortedPages(spreadPages)
  if (!session.length) return pair
  const inSession = pair.filter((page) => session.includes(page))
  return inSession.length ? inSession : pair
}

/**
 * RTL mushaf spreads: the reader's first page is on the right.
 * When only one side of the pair has loaded content, show that leaf on the right.
 */
export function orderMadaniSpreadLeavesForOpening(leaves = []) {
  if (!Array.isArray(leaves) || leaves.length !== 2) return leaves
  const populated = leaves.filter((leaf) => leaf?.page)
  const empty = leaves.filter((leaf) => !leaf?.page)
  if (populated.length === 1 && empty.length === 1) {
    return [populated[0], empty[0]]
  }
  return leaves
}
