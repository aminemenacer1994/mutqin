/**
 * Schedules murājaʿah from retention strength and reason codes.
 */

import { ASSESSMENT_REASON_CODES } from './constants.js'

/**
 * @param {number} retentionStrength 0–1
 * @param {string[]} reasonCodes
 * @param {string} [nowIso]
 * @returns {{ nextReviewAt: string, intervalDays: number }}
 */
export function scheduleReview(retentionStrength, reasonCodes = [], nowIso = new Date().toISOString()) {
  const codes = reasonCodes || []
  let days = 3

  if (codes.includes(ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION)
    || codes.includes(ASSESSMENT_REASON_CODES.REVIEW_OVERDUE)) {
    days = 1
  } else if (codes.includes(ASSESSMENT_REASON_CODES.LOW_RECALL)
    || codes.includes(ASSESSMENT_REASON_CODES.OVERCONFIDENCE)
    || codes.includes(ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS)) {
    days = 1
  } else if (codes.includes(ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE)) {
    const strength = Number(retentionStrength)
    if (strength >= 0.85) days = 7
    else if (strength >= 0.7) days = 3
    else days = 2
  } else {
    const strength = Number(retentionStrength)
    if (!Number.isFinite(strength) || strength < 0.45) days = 1
    else if (strength < 0.65) days = 2
    else if (strength < 0.8) days = 3
    else days = 7
  }

  const next = new Date(nowIso)
  if (Number.isNaN(next.getTime())) {
    const fallback = new Date()
    fallback.setUTCDate(fallback.getUTCDate() + days)
    return { nextReviewAt: fallback.toISOString(), intervalDays: days }
  }
  next.setUTCDate(next.getUTCDate() + days)
  return { nextReviewAt: next.toISOString(), intervalDays: days }
}

/**
 * Build nextReviewByKey map for mastery updates.
 * @param {string[]} verseKeys
 * @param {Record<string, object>} masteryMap
 * @param {string[]} reasonCodes
 * @param {string} [nowIso]
 */
export function scheduleReviewsForKeys(verseKeys, masteryMap = {}, reasonCodes = [], nowIso = new Date().toISOString()) {
  const out = {}
  for (const key of verseKeys || []) {
    const retention = Number(masteryMap[key]?.retentionStrength ?? 0.5)
    out[key] = scheduleReview(retention, reasonCodes, nowIso).nextReviewAt
  }
  return out
}

/**
 * Snapshot for recommendation / event store.
 */
export function buildReviewScheduleSnapshot(verseKeys, masteryMap, reasonCodes, nowIso = new Date().toISOString()) {
  const byKey = scheduleReviewsForKeys(verseKeys, masteryMap, reasonCodes, nowIso)
  const intervals = Object.keys(byKey).map((key) => {
    const retention = Number(masteryMap[key]?.retentionStrength ?? 0.5)
    return scheduleReview(retention, reasonCodes, nowIso)
  })
  const minDays = intervals.length
    ? Math.min(...intervals.map((i) => i.intervalDays))
    : scheduleReview(0.5, reasonCodes, nowIso).intervalDays

  return {
    scheduledAt: nowIso,
    intervalDays: minDays,
    nextReviewAt: byKey[verseKeys?.[0]] || scheduleReview(0.5, reasonCodes, nowIso).nextReviewAt,
    byKey,
    reasonCodes: [...reasonCodes],
  }
}

export const ReviewSchedulingService = {
  scheduleReview,
  scheduleReviewsForKeys,
  buildReviewScheduleSnapshot,
}

export default ReviewSchedulingService
