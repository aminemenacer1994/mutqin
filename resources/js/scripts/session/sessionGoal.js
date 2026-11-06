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
