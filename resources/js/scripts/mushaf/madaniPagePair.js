export const MADANI_MIN_PAGE = 1
export const MADANI_MAX_PAGE = 604

/** Two pages only when each leaf stays at least this wide. */
export const MADANI_TWO_PAGE_MIN_WIDTH = 1080

export function clampMadaniPage(page) {
  const n = Number(page)
  if (!Number.isFinite(n)) return MADANI_MIN_PAGE
  return Math.max(MADANI_MIN_PAGE, Math.min(MADANI_MAX_PAGE, Math.trunc(n)))
}

/**
 * RTL open-mushaf pair: odd page on the right, even page on the left.
 * Spreads are (1,2) … (603,604). Never returns 0 or 605.
 */
export function resolveMadaniSpread(page) {
  const current = clampMadaniPage(page)
  const right = current % 2 === 1 ? current : current - 1
  const left = right + 1
  if (left > MADANI_MAX_PAGE) {
    return { right, left: null, pages: [right] }
  }
  return { right, left, pages: [right, left] }
}

export function previousMadaniSpread(page) {
  const right = resolveMadaniSpread(page).right
  return right > MADANI_MIN_PAGE ? right - 2 : null
}

export function nextMadaniSpread(page) {
  const spread = resolveMadaniSpread(page)
  const last = spread.left ?? spread.right
  return last < MADANI_MAX_PAGE ? last + 1 : null
}

export function previousMadaniPage(page) {
  const current = clampMadaniPage(page)
  return current > MADANI_MIN_PAGE ? current - 1 : null
}

export function nextMadaniPage(page) {
  const current = clampMadaniPage(page)
  return current < MADANI_MAX_PAGE ? current + 1 : null
}

export function shouldShowTwoMadaniPages(width) {
  return Number(width) >= MADANI_TWO_PAGE_MIN_WIDTH
}
