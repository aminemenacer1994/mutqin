/**
 * Playback speed bands for next-session / practice plans.
 * New ayah ranges stay slow (0.75×–1.0×).
 * Review ranges and strong (>90%) recall use faster audio (1.25×–1.5×).
 */

export const NEW_RANGE_SPEEDS = Object.freeze([0.75, 1])
export const REVIEW_RANGE_SPEEDS = Object.freeze([1.25, 1.5])

/**
 * @param {object} [input]
 * @param {string} [input.rangeKind] new | repeated | …
 * @param {string} [input.sessionMode] new_learning | revision | …
 * @param {string} [input.type] recommendation type
 * @param {number|null} [input.accuracyPercent]
 * @param {boolean} [input.isReview]
 * @param {boolean} [input.isNew]
 * @returns {boolean}
 */
export function isReviewPlaybackContext(input = {}) {
  if (input.isReview === true) return true
  if (input.isNew === true) return false
  const kind = String(input.rangeKind || '').toLowerCase()
  const mode = String(input.sessionMode || '').toLowerCase()
  const type = String(input.type || '').toLowerCase()
  if (kind === 'new' || mode === 'new_learning') return false
  if (kind === 'repeated' || mode === 'revision') return true
  if (/repeat|revis|reinforce|weak|practice/.test(type)) return true
  const accuracy = Number(input.accuracyPercent)
  if (Number.isFinite(accuracy) && accuracy >= 90) return true
  return false
}

/**
 * @param {object} [input]
 * @returns {number}
 */
export function resolveRecommendedPlaybackSpeed(input = {}) {
  const accuracy = Number(input.accuracyPercent)
  const review = isReviewPlaybackContext(input)

  if (review) {
    if (Number.isFinite(accuracy) && accuracy >= 90) return 1.5
    return 1.25
  }

  // Entirely new ayah ranges — keep audio unhurried.
  if (Number.isFinite(accuracy) && accuracy > 0 && accuracy < 70) return 0.75
  if (input.preferGentle === true) return 0.75
  return 1
}

/**
 * Snap any speed into the correct band for the context.
 * @param {number} speed
 * @param {object} [input]
 * @returns {number}
 */
export function clampPlaybackSpeedForContext(speed, input = {}) {
  const value = Number(speed)
  const review = isReviewPlaybackContext(input)
  if (review) {
    if (!Number.isFinite(value) || value < 1.25) return resolveRecommendedPlaybackSpeed(input)
    if (value >= 1.5) return 1.5
    return 1.25
  }
  if (!Number.isFinite(value) || value <= 0) return resolveRecommendedPlaybackSpeed(input)
  if (value <= 0.75) return 0.75
  return 1
}
