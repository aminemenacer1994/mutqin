/**
 * Prioritised loading for a session that spans many mushaf pages.
 * The active page (and its neighbours) paint first; the rest of the range
 * loads with a small concurrency cap so a long surah does not freeze the UI.
 */

function uniqueSortedPages(pages) {
  const seen = new Set()
  const ordered = []
  for (const value of pages || []) {
    const page = Math.trunc(Number(value))
    if (!Number.isFinite(page) || page < 1 || seen.has(page)) continue
    seen.add(page)
    ordered.push(page)
  }
  ordered.sort((left, right) => left - right)
  return ordered
}

/**
 * Reading order, but the focus page is first and distance grows outward.
 * @param {number[]} pages
 * @param {number} focusPage
 * @returns {number[]}
 */
export function orderPagesAroundFocus(pages, focusPage) {
  const ordered = uniqueSortedPages(pages)
  const focus = Math.trunc(Number(focusPage))
  const index = ordered.indexOf(focus)
  if (index < 0) return ordered
  const result = [ordered[index]]
  for (let distance = 1; distance < ordered.length; distance += 1) {
    const after = ordered[index + distance]
    const before = ordered[index - distance]
    if (after) result.push(after)
    if (before) result.push(before)
  }
  return result
}

/**
 * Pages that should block first paint: the focus page plus `radius` neighbours.
 * @param {number[]} pages
 * @param {number} focusPage
 * @param {number} [radius]
 * @returns {number[]}
 */
export function selectPriorityPages(pages, focusPage, radius = 1) {
  const ordered = uniqueSortedPages(pages)
  if (!ordered.length) return []
  const focus = Math.trunc(Number(focusPage))
  const index = ordered.indexOf(focus)
  const center = index >= 0 ? index : 0
  const span = Math.max(0, Math.trunc(Number(radius)) || 0)
  return ordered.slice(Math.max(0, center - span), center + span + 1)
}

/**
 * @template T
 * @param {T[]} items
 * @param {number} concurrency
 * @param {(item: T, index: number) => Promise<unknown>} worker
 * @param {() => boolean} [shouldContinue]
 */
export async function mapWithConcurrency(items, concurrency, worker, shouldContinue = () => true) {
  const list = Array.isArray(items) ? items : []
  if (!list.length) return []
  const limit = Math.max(1, Math.min(list.length, Math.trunc(Number(concurrency)) || 1))
  const results = new Array(list.length)
  let cursor = 0

  async function run() {
    while (cursor < list.length) {
      if (!shouldContinue()) return
      const index = cursor
      cursor += 1
      try {
        results[index] = await worker(list[index], index)
      } catch (error) {
        results[index] = error
      }
    }
  }

  await Promise.all(Array.from({ length: limit }, () => run()))
  return results
}
