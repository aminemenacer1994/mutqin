/**
 * One dashboard action. Saved work wins, then revision when the current set
 * is not still in progress, then continuation, then a first memorisation.
 */
export function pickDashboardPrimaryKind({
  hasSaved = false,
  review = null,
  journey = null,
  continueActionType = '',
  remembered = null,
  rangeTotal = null,
} = {}) {
  if (hasSaved) return 'saved'

  const type = String(continueActionType || '')
  const unfinished = type === 'resume_session'
    || type === 'continue_session'
    || type === 'continue_incomplete'
  const rememberedCount = Number(remembered)
  const total = Number(rangeTotal)
  const hasRangeProgress = Number.isFinite(rememberedCount)
    && Number.isFinite(total)
    && total > 0
  const stillLearning = hasRangeProgress && rememberedCount < total
  const continuationWithoutProgress = !hasRangeProgress && (
    type === 'continue_range'
    || type === 'follow_recommendation'
  )

  if (review?.href && !unfinished && !stillLearning && !continuationWithoutProgress) return 'revise'
  if (journey?.href) return 'journey'
  return 'fresh'
}
