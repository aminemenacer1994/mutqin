/** First-session intent. Planning is optional; the learner only picks a goal and a range. */
export const SESSION_GOALS = Object.freeze(['memorise', 'revise', 'test'])

export function normaliseSessionGoal(value) {
  const goal = String(value || '').trim().toLowerCase()
  if (goal === 'revise' || goal === 'revision' || goal === 'review' || goal === 'murajaah') return 'revise'
  if (goal === 'test' || goal === 'recite' || goal === 'test_recitation' || goal === 'ai') return 'test'
  return 'memorise'
}

export function sessionGoalToMode(goal) {
  return normaliseSessionGoal(goal) === 'revise' ? 'revision' : 'new_learning'
}

/** Review pace for a manual Revise sitting. New-ayah lessons stay at 1× or slower. */
export const REVISION_PLAYBACK_SPEED = 1.25

/**
 * Settings that make a manual Revise sitting different from Memorise.
 * A faster speed the learner already chose is kept. Recommendation plans
 * are not passed through here.
 */
export function revisionSessionAdjustments(current = {}) {
  const speed = Number(current.speed)
  const keepSpeed = Number.isFinite(speed) && speed >= REVISION_PLAYBACK_SPEED
  return {
    speed: keepSpeed ? speed : REVISION_PLAYBACK_SPEED,
    repetitionsPerStep: 1,
    selectedLoopCount: 1,
    talqinModeEnabled: false,
    focusModeEnabled: false,
    blurModeEnabled: false,
    chainingEnabled: false,
    anchorModeEnabled: false,
  }
}

/** Setup deep link that opens surah/ayah selection for one goal. */
export function memorisationGoalHref(base, goal) {
  const raw = String(base || '/memorisation').trim() || '/memorisation'
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const [path, query = ''] = withoutHash.split('?')
  const params = new URLSearchParams(query)
  params.set('setup', '1')
  params.set('goal', normaliseSessionGoal(goal))
  const next = params.toString()
  return `${path || '/memorisation'}${next ? `?${next}` : ''}${hash}`
}

/**
 * One-tap Daily Mutqin entry. Optional range / recommendation ids deepen the link.
 * @param {string} [base]
 * @param {{ surah?: number, from?: number, to?: number, recommendation?: number|string, resume?: boolean, session?: number|string }} [opts]
 */
export function dailyMutqinHref(base, opts = {}) {
  const raw = String(base || '/memorisation').trim() || '/memorisation'
  const hashIndex = raw.indexOf('#')
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const [path, query = ''] = withoutHash.split('?')
  const params = new URLSearchParams(query)
  params.set('journey', 'daily')
  const surah = Number(opts.surah || 0)
  const from = Number(opts.from || 0)
  const to = Number(opts.to || from || 0)
  if (surah > 0) params.set('surah', String(surah))
  if (from > 0) params.set('from', String(from))
  if (to > 0) params.set('to', String(to))
  const recommendation = Number(opts.recommendation || 0)
  if (recommendation > 0) params.set('recommendation', String(recommendation))
  if (opts.resume) params.set('resume', '1')
  const session = Number(opts.session || 0)
  if (session > 0) params.set('session', String(session))
  const next = params.toString()
  return `${path || '/memorisation'}${next ? `?${next}` : ''}${hash}`
}
