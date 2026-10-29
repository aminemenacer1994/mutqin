/** Shared semantic status tones for pills/badges (teacher + student). */

export const SCORE_HIGH = 85
export const SCORE_LOW = 70

/** CSS / legacy class suffixes used across dashboards */
export const TONE = {
  URGENT: 'danger',
  POSITIVE: 'good',
  NEUTRAL: 'muted',
  INFO: 'info',
  FOCUS: 'focus',
  FOCUS_PURPLE: 'focus-purple',
}

/**
 * AI / accuracy score pill tone.
 * @param {number|null|undefined} score
 * @returns {'good'|'focus'|'warn'|'muted'}
 */
export function scoreBadgeTone(score) {
  if (typeof score !== 'number' || Number.isNaN(score)) return TONE.NEUTRAL
  if (score > SCORE_HIGH) return TONE.POSITIVE
  if (score >= SCORE_LOW) return TONE.FOCUS
  return 'warn'
}

/**
 * Teacher task row status pill from display state.
 * @param {string} displayState from TASK_STATE
 */
export function teacherStatusToneFromDisplay(displayState) {
  if (displayState === 'DONE') return TONE.POSITIVE
  if (displayState === 'OVERDUE') return TONE.URGENT
  if (displayState === 'WAITING_REVIEW') return TONE.INFO
  if (displayState === 'IN_PROGRESS') return TONE.INFO
  return TONE.NEUTRAL
}

/** Due-date urgency tone from formatTaskDueUrgency. */
export function normalizeDueTone(tone) {
  if (tone === 'danger') return TONE.URGENT
  if (tone === 'warn' || tone === 'warning') return TONE.FOCUS
  if (tone === 'submitted') return TONE.INFO
  return TONE.NEUTRAL
}

/** Learner card meta / pill tone aliases. */
export function normalizeMetaTone(tone) {
  if (tone === 'danger') return TONE.URGENT
  if (tone === 'warn' || tone === 'warning' || tone === 'correction') return TONE.FOCUS
  if (tone === 'submitted' || tone === 'active') return TONE.INFO
  if (tone === 'approved') return TONE.POSITIVE
  if (tone === 'overdue') return TONE.URGENT
  if (tone === 'default') return TONE.NEUTRAL
  return TONE.NEUTRAL
}

/** Hifz category → pill modifier (is-*). */
export function hifzCategoryTone(category) {
  const key = String(category || '').toLowerCase()
  if (key === 'sabqi') return TONE.FOCUS
  if (key === 'sabaq' || key === 'manzil') return TONE.FOCUS_PURPLE
  if (key === 'uncategorized') return TONE.NEUTRAL
  return TONE.INFO
}

/**
 * Optional icon for urgency/meta chips (Bootstrap Icons).
 * @param {string} tone raw or normalized tone
 */
export function semanticToneIcon(tone) {
  const t = normalizeMetaTone(tone)
  if (t === TONE.URGENT || tone === 'danger') return 'bi-exclamation-circle-fill'
  if (t === TONE.POSITIVE || tone === 'good' || tone === 'approved') return 'bi-check-circle-fill'
  if (t === TONE.INFO || tone === 'submitted') return 'bi-info-circle-fill'
  if (t === TONE.FOCUS || tone === 'warn' || tone === 'warning') return 'bi-clock-fill'
  return 'bi-circle'
}
