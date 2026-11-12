/** Guided Daily Mutqin step ids (feature_id-safe). */
export const DAILY_MUTQIN_STEPS = Object.freeze([
  'listen',
  'repeat',
  'hide',
  'recite',
  'finish',
])

export function normaliseDailyMutqinStep(value) {
  const step = String(value || '').trim().toLowerCase()
  return DAILY_MUTQIN_STEPS.includes(step) ? step : 'listen'
}

export function nextDailyMutqinStep(current) {
  const step = normaliseDailyMutqinStep(current)
  const index = DAILY_MUTQIN_STEPS.indexOf(step)
  if (index < 0 || index >= DAILY_MUTQIN_STEPS.length - 1) return 'finish'
  return DAILY_MUTQIN_STEPS[index + 1]
}

export function dailyMutqinStepIndex(current) {
  const index = DAILY_MUTQIN_STEPS.indexOf(normaliseDailyMutqinStep(current))
  return index < 0 ? 0 : index
}

/**
 * Soft elapsed progress toward the suggested duration (0–1). Never forces end.
 */
export function dailyMutqinElapsedProgress(startedAt, suggestedSeconds = 240, now = Date.now()) {
  const start = Number(startedAt || 0)
  const target = Math.max(60, Number(suggestedSeconds) || 240)
  if (!start) return 0
  const elapsed = Math.max(0, (Number(now) - start) / 1000)
  return Math.max(0, Math.min(1, elapsed / target))
}
