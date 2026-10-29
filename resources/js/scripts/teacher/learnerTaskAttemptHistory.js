import { learnerAttemptHint } from './learnerDashboard.js'

export const TREND_DISPLAY_MAX = 5

/**
 * @typedef {object} NormalizedAttempt
 * @property {number} n
 * @property {number|null} score
 * @property {string|null} completedAt
 * @property {string|null} teacherNote
 * @property {boolean} hasRecording
 * @property {string|null} recordingUrl
 * @property {number|null} attemptId
 */

function normalizeAttempt(raw, index = 0) {
  if (!raw || typeof raw !== 'object') return null
  const n = Number(raw.n ?? raw.attempt_number ?? index + 1)
  const scoreRaw = raw.score ?? raw.accuracy_percent
  const score = Number.isFinite(Number(scoreRaw)) ? Number(scoreRaw) : null
  return {
    n,
    score,
    completedAt: raw.completedAt ?? raw.completed_at ?? null,
    teacherNote: String(raw.teacherNote ?? raw.teacher_note ?? '').trim() || null,
    hasRecording: Boolean(raw.hasRecording ?? raw.has_recording),
    recordingUrl: raw.recordingUrl ?? raw.recording_url ?? null,
    attemptId: Number.isFinite(Number(raw.attempt_id ?? raw.attemptId))
      ? Number(raw.attempt_id ?? raw.attemptId)
      : null,
  }
}

/**
 * @param {object|null|undefined} row assignment recipient payload
 */
export function resolveTaskAttempts(row) {
  const fromApi = Array.isArray(row?.attempts) ? row.attempts : []
  if (fromApi.length) {
    return fromApi.map((item, index) => normalizeAttempt(item, index)).filter(Boolean)
  }
  const last = row?.last_attempt
  if (last?.attempt_number) {
    return [normalizeAttempt({
      n: last.attempt_number,
      score: last.accuracy_percent,
      teacher_note: last.teacher_note,
      has_recording: false,
    }, 0)].filter(Boolean)
  }
  return []
}

export function resolveMaxAttempts(row) {
  const direct = row?.maxAttempts ?? row?.max_attempts
  if (Number.isFinite(Number(direct)) && Number(direct) > 0) {
    return Number(direct)
  }
  const target = Number(row?.progress?.target || 0)
  return target > 0 ? target : 1
}

export function resolveAttemptsLeft(row) {
  const direct = row?.attemptsLeft ?? row?.attempts_left
  if (Number.isFinite(Number(direct))) {
    return Math.max(0, Number(direct))
  }
  const hint = learnerAttemptHint(row)
  if (hint?.kind === 'extra_attempt') {
    return Math.max(0, Number(hint.remaining) || 0)
  }
  const target = Number(row?.progress?.target || 0)
  const activity = Number(row?.progress?.activity_count ?? row?.progress?.completed ?? 0)
  if (target > 0) {
    return Math.max(0, target - activity)
  }
  return null
}

export function scoredAttempts(attempts) {
  return (attempts || []).filter((item) => Number.isFinite(Number(item.score)))
}

export function shouldShowAttemptTrend(attempts, maxAttempts) {
  if (Number(maxAttempts) <= 1) return false
  return scoredAttempts(attempts).length >= 2
}

/**
 * @returns {{ scores: number[], hiddenCount: number, finalScore: number|null }}
 */
export function buildTrendDisplay(attempts) {
  const values = scoredAttempts(attempts).map((item) => Number(item.score))
  if (!values.length) {
    return { scores: [], hiddenCount: 0, finalScore: null }
  }
  const hiddenCount = Math.max(0, values.length - TREND_DISPLAY_MAX)
  const scores = values.slice(-TREND_DISPLAY_MAX)
  return {
    scores,
    hiddenCount,
    finalScore: values[values.length - 1],
  }
}

export function attemptScoreDelta(attempts) {
  const values = scoredAttempts(attempts).map((item) => Number(item.score))
  if (values.length < 2) return null
  return values[values.length - 1] - values[values.length - 2]
}

/** @returns {'up'|'down'|'same'|null} */
export function attemptDeltaKind(attempts) {
  const delta = attemptScoreDelta(attempts)
  if (delta === null) return null
  if (delta > 0) return 'up'
  if (delta < 0) return 'down'
  return 'same'
}

/**
 * SVG sparkline points in 0–100 viewBox height (inverted y).
 * @returns {string|null}
 */
export function buildSparklinePolyline(attempts) {
  const values = scoredAttempts(attempts).map((item) => Number(item.score))
  if (values.length < 3) return null
  const width = 56
  const height = 20
  const step = values.length > 1 ? width / (values.length - 1) : width
  return values
    .map((value, index) => {
      const x = Math.round(index * step * 10) / 10
      const clamped = Math.max(0, Math.min(100, value))
      const y = Math.round((height - (clamped / 100) * height) * 10) / 10
      return `${x},${y}`
    })
    .join(' ')
}

export function trendAccessibleScoreList(attempts) {
  return scoredAttempts(attempts)
    .map((item) => Number(item.score))
    .join(', ')
}

export function practiceAgainGate(row) {
  const left = resolveAttemptsLeft(row)
  if (left === null) {
    return { disabled: false, reasonKey: null }
  }
  if (left > 0) {
    return { disabled: false, reasonKey: null }
  }
  return { disabled: true, reasonKey: 'teacher.learner_practice_again_no_attempts' }
}

export function bestAttemptScore(attempts) {
  const values = scoredAttempts(attempts).map((item) => Number(item.score))
  if (!values.length) return null
  return Math.max(...values)
}
