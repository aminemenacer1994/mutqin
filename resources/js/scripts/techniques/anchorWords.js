/**
 * Shared anchor-word index selection. Used by stacked cards, legacy mushaf,
 * and QPC Madani so the same count/positions apply in every reading view.
 */
export function resolveAnchorIndices(totalWords, anchorCount = 1) {
  const total = Number(totalWords)
  if (!Number.isFinite(total) || total <= 0) return []
  const count = Math.trunc(total)
  if (count === 1) return [0]
  if (count === 2) return [0, 1]

  const requested = Number(anchorCount)
  if (requested === 1) {
    return [Math.floor(count / 2)]
  }
  if (requested === 2) {
    return [0, count - 1]
  }

  const positions = [
    Math.floor(count * 0.2),
    Math.floor(count * 0.5),
    Math.floor(count * 0.8),
  ]
  return [...new Set(positions)].sort((left, right) => left - right)
}
