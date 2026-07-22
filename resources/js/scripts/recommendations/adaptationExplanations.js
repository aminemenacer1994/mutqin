/**
 * Explain what each recommended setting does so “Adjust plan” is informed, not opaque.
 *
 * @param {{
 *   technique?: string|null,
 *   complementary_technique?: string|null,
 *   repetitions?: number|null,
 *   playback_speed?: number|null,
 * }} settings
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @returns {string[]}
 */
export function buildAdaptationExplanations(settings = {}, t = (key) => key) {
  if (!settings || typeof settings !== 'object') return []

  const lines = []
  const technique = String(settings.technique || '').toLowerCase()
  const complementary = String(settings.complementary_technique || '').toLowerCase()
  const modes = new Set([technique, complementary].filter(Boolean))
  const reps = Number(settings.repetitions)
  const speed = Number(settings.playback_speed)

  if (Number.isFinite(reps) && reps >= 4) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.repetitionsHigh', { count: reps }))
  } else if (Number.isFinite(reps) && reps === 3) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.repetitionsModerate', { count: reps }))
  } else if (Number.isFinite(reps) && reps > 0 && reps <= 2) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.repetitionsLight', { count: reps }))
  }

  if (modes.has('focus')) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.focus'))
  }
  if (modes.has('blur')) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.blur'))
  }
  if (modes.has('talqin')) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.talqin'))
  }
  if (modes.has('anchor')) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.anchor'))
  }
  if (modes.has('chaining')) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.chaining'))
  }

  if (Number.isFinite(speed) && speed > 0 && speed < 1) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.speedSlower', { speed }))
  } else if (Number.isFinite(speed) && speed > 1) {
    lines.push(t('memorisation.postSession.recommendation.paramHints.speedFaster', { speed }))
  }

  return lines.filter((line) => line && !String(line).startsWith('memorisation.postSession'))
}
