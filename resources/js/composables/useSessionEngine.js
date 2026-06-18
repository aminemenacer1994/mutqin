import { mutateMutqinState } from './useMutqinPersistence'
import { runSilentAiEvaluation } from '../engine/silent_ai_evaluation'

function queueKey(item = {}) {
  return [
    item.phase,
    item.ayahId || item.verse?.key || '',
    item.chainKey || '',
    item.sequencePosition || '',
    item.sequenceTotal || '',
    item.repeatCount || ''
  ].join(':')
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
    segment: item.segment || null,
    chainKey: item.chainKey || null,
    sequencePosition: Math.max(1, Number(item.sequencePosition || 1)),
    sequenceTotal: Math.max(1, Number(item.sequenceTotal || 1)),
    repeatCount: Math.max(1, Number(item.repeatCount || 1)),
    totalRepeats: Math.max(1, Number(item.totalRepeats || 1)),
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

export function buildSessionQueue({ planner = [], takrar = [], recall = [], review = [] } = {}) {
  return normaliseSessionQueue([
    ...planner.map(item => ({ phase: 'Planner', ...item })),
    ...takrar.map(item => ({ phase: 'Takrar', ...item })),
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

function runSessionEvaluation(queueItem = {}, evaluation = null) {
  if (!evaluation || typeof evaluation !== 'object') return null
  return runSilentAiEvaluation({
    ...evaluation,
    ayahId: evaluation.ayahId || queueItem.ayahId,
    verse: evaluation.verse || queueItem.verse,
    mode: evaluation.mode || queueItem.phase
  })
}

export function moveMutqinSession(state, index, options = {}) {
  return mutateMutqinState(state, draft => {
    const currentItem = draft.sessionState.queue?.[draft.sessionState.current_index || 0] || null
    const silentEvaluation = runSessionEvaluation(currentItem, options.evaluation)
    if (silentEvaluation) {
      draft.sessionState.lastSilentEvaluation = {
        ...silentEvaluation,
        ayahId: currentItem?.ayahId || options.evaluation?.ayahId || null,
        evaluated_at: new Date().toISOString()
      }
    }
    const nextIndex = Math.max(0, Math.min(Number(index || 0), Math.max((draft.sessionState.queue || []).length - 1, 0)))
    draft.sessionState.current_index = nextIndex
    draft.sessionState.phase = draft.sessionState.queue?.[nextIndex]?.phase || draft.sessionState.phase
    return draft.sessionState
  })
}

export function completeMutqinSession(state, options = {}) {
  return mutateMutqinState(state, draft => {
    if (!draft.sessionState.active) return draft.sessionState
    const currentItem = draft.sessionState.queue?.[draft.sessionState.current_index || 0] || null
    const silentEvaluation = runSessionEvaluation(currentItem, options.evaluation)
    if (silentEvaluation) {
      draft.sessionState.lastSilentEvaluation = {
        ...silentEvaluation,
        ayahId: currentItem?.ayahId || options.evaluation?.ayahId || null,
        evaluated_at: new Date().toISOString()
      }
    }
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
