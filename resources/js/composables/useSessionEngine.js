import { mutateMutqinState } from './useMutqinPersistence'

function queueKey(item = {}) {
  return `${item.phase}:${item.ayahId || item.verse?.key || ''}:${item.chainStage || ''}:${item.repeatCount || ''}`
}

function sessionSignature({ mode = 'beginner', queue = [], config = null } = {}) {
  return JSON.stringify({
    mode,
    config,
    queue: normaliseSessionQueue(queue).map(queueKey)
  })
}

function normaliseQueueItem(item = {}) {
  const verse = item.verse || null
  const phase = item.phase === 'Review' ? 'Retention' : (item.phase || 'Takrar')
  return {
    phase,
    ayahId: item.ayahId || verse?.key || null,
    verse,
    repeatCount: Math.max(1, Number(item.repeatCount || 1)),
    totalRepeats: Math.max(1, Number(item.totalRepeats || 1)),
    chainStage: item.chainStage || null,
    prompt: item.prompt || ''
  }
}

export function normaliseSessionQueue(queue = []) {
  const seen = new Set()
  return queue
    .map(normaliseQueueItem)
    .filter(item => item.ayahId)
    .filter(item => {
      const key = queueKey(item)
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
}

export function buildSessionQueue({ planner = [], takrar = [], chaining = [], recall = [], review = [] } = {}) {
  return normaliseSessionQueue([
    ...planner.map(item => ({ phase: 'Planner', ...item })),
    ...takrar.map(item => ({ phase: 'Takrar', ...item })),
    ...chaining.map(item => ({ phase: 'Chaining', ...item })),
    ...recall.map(item => ({ phase: 'Recall', ...item })),
    ...review.map(item => ({ phase: 'Retention', ...item }))
  ])
}

export function startMutqinSession(state, { mode = 'beginner', queue = [], config = null, planner = null } = {}) {
  return mutateMutqinState(state, draft => {
    const normalisedQueue = normaliseSessionQueue(queue)
    if (!normalisedQueue.length) {
      draft.sessionState = {
        ...draft.sessionState,
        active: false,
        mode,
        phase: 'Takrar',
        queue: [],
        current_index: 0,
        config,
        planner,
        updated_at: new Date().toISOString()
      }
      return draft.sessionState
    }
    const currentSignature = sessionSignature({
      mode: draft.sessionState?.mode,
      queue: draft.sessionState?.queue || [],
      config: draft.sessionState?.config || null
    })
    const nextSignature = sessionSignature({ mode, queue: normalisedQueue, config })
    if (draft.sessionState?.active && currentSignature === nextSignature) {
      draft.sessionState.queue = normalisedQueue
      draft.sessionState.config = config
      draft.sessionState.planner = planner
      draft.sessionState.phase = normalisedQueue[draft.sessionState.current_index]?.phase || draft.sessionState.phase || 'Takrar'
      draft.sessionState.updated_at = new Date().toISOString()
      return draft.sessionState
    }
    draft.sessionState = {
      active: true,
      mode,
      phase: normalisedQueue[0]?.phase || 'Takrar',
      queue: normalisedQueue,
      current_index: 0,
      config,
      planner,
      started_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    }
    return draft.sessionState
  })
}

export function moveMutqinSession(state, index) {
  return mutateMutqinState(state, draft => {
    const nextIndex = Math.max(0, Math.min(Number(index || 0), Math.max((draft.sessionState.queue || []).length - 1, 0)))
    draft.sessionState.current_index = nextIndex
    draft.sessionState.phase = draft.sessionState.queue?.[nextIndex]?.phase || draft.sessionState.phase
    return draft.sessionState
  })
}

export function completeMutqinSession(state) {
  return mutateMutqinState(state, draft => {
    if (!draft.sessionState.active) return draft.sessionState
    draft.sessionState.active = false
    draft.stats.sessions_completed = Number(draft.stats.sessions_completed || 0) + 1
    const startedAt = Date.parse(draft.sessionState.started_at || '')
    if (Number.isFinite(startedAt)) {
      const seconds = Math.max(0, Math.round((Date.now() - startedAt) / 1000))
      draft.stats.total_session_seconds = Number(draft.stats.total_session_seconds || 0) + seconds
    }
    draft.stats.last_completed_at = new Date().toISOString()
    return draft.sessionState
  })
}
