/**
 * Authoritative completion-flow phases for the successful-session experience.
 * Derive one primary surface from session flags so modals never compete.
 */

export const COMPLETION_FLOW = Object.freeze({
  CLOSED: 'closed',
  COMPLETION: 'completion',
  AI_RECITE_RECORDING: 'ai_recite_recording',
  AI_RECITE_REVIEW: 'ai_recite_review',
  RECOMMENDATION: 'recommendation',
  NEW_SESSION_BUILDER: 'new_session_builder',
  CREATING_SESSION: 'creating_session',
  CREATING_REPEAT: 'creating_repeat',
  ERROR: 'error',
})

/**
 * @param {{
 *   showPostSessionModal?: boolean,
 *   postSessionAiReciteActive?: boolean,
 *   showSelfCheckModal?: boolean,
 *   isSelfCheckRecording?: boolean,
 *   hasSelfCheckResult?: boolean,
 *   postSessionOffcanvasOpen?: boolean,
 *   postSessionRecommendationStarting?: boolean,
 *   isRepeatRecommendation?: boolean,
 *   postSessionViewState?: string,
 *   postSessionRecommendationStatus?: string,
 *   postSessionRecommendationFailed?: boolean,
 * }} state
 * @returns {string}
 */
export function deriveCompletionFlowPhase(state = {}) {
  const starting = !!state.postSessionRecommendationStarting
  const aiActive = !!state.postSessionAiReciteActive
  const selfCheckOpen = !!state.showSelfCheckModal
  const recording = !!state.isSelfCheckRecording
  const hasResult = !!state.hasSelfCheckResult
  const completionOpen = !!state.showPostSessionModal
  const builderOpen = !!state.postSessionOffcanvasOpen
  const viewState = String(state.postSessionViewState || '')
  const status = String(state.postSessionRecommendationStatus || '')

  if (starting) {
    return state.isRepeatRecommendation
      ? COMPLETION_FLOW.CREATING_REPEAT
      : COMPLETION_FLOW.CREATING_SESSION
  }

  if (aiActive && recording) {
    return COMPLETION_FLOW.AI_RECITE_RECORDING
  }

  if (aiActive && selfCheckOpen) {
    return hasResult || viewState === 'ai_recite_review'
      ? COMPLETION_FLOW.AI_RECITE_REVIEW
      : COMPLETION_FLOW.AI_RECITE_RECORDING
  }

  if (aiActive) {
    return COMPLETION_FLOW.AI_RECITE_REVIEW
  }

  if (!completionOpen) {
    return COMPLETION_FLOW.CLOSED
  }

  if (builderOpen) {
    return COMPLETION_FLOW.NEW_SESSION_BUILDER
  }

  if (
    viewState === 'action_failed'
    || viewState === 'recommendation_failed'
    || (state.postSessionRecommendationFailed && status === 'error')
  ) {
    return COMPLETION_FLOW.ERROR
  }

  if (status === 'ready' || status === 'empty' || status === 'error') {
    return COMPLETION_FLOW.RECOMMENDATION
  }

  return COMPLETION_FLOW.COMPLETION
}

/**
 * Which surface owns the backdrop / focus trap.
 * Exactly one primary surface unless a lightweight confirmation sits on top.
 * @param {string} phase
 * @returns {'none'|'completion'|'self_check'|'builder'}
 */
export function primarySurfaceForPhase(phase) {
  switch (phase) {
    case COMPLETION_FLOW.AI_RECITE_RECORDING:
    case COMPLETION_FLOW.AI_RECITE_REVIEW:
      return 'self_check'
    case COMPLETION_FLOW.NEW_SESSION_BUILDER:
      return 'builder'
    case COMPLETION_FLOW.CLOSED:
      return 'none'
    default:
      return 'completion'
  }
}

/**
 * Resolve the confidence option that should appear selected.
 * Defaults to confident unless saved feedback or a weak AI result says otherwise.
 *
 * @param {{
 *   confidence_feedback?: string|null,
 *   ai_assessment?: { result?: string }|null,
 * }} recommendation
 * @param {string|null} localSelection
 * @returns {'confident'|'needs_practice'}
 */
export function resolveConfidenceSelection(recommendation, localSelection = null) {
  if (localSelection === 'confident' || localSelection === 'needs_practice') {
    return localSelection
  }

  const saved = String(recommendation?.confidence_feedback || '').trim()
  if (saved === 'confident' || saved === 'needs_practice') {
    return saved
  }

  const aiResult = String(recommendation?.ai_assessment?.result || '').toLowerCase()
  if (aiResult === 'weak') {
    return 'needs_practice'
  }

  return 'confident'
}

/**
 * Whether the completion dialog should remain mounted (possibly visually hidden).
 * @param {string} phase
 */
export function shouldKeepCompletionMounted(phase) {
  return phase !== COMPLETION_FLOW.CLOSED
}

/**
 * Whether the completion dialog should be visually hidden under AI Recite.
 * @param {string} phase
 */
export function shouldHideCompletionUnderAi(phase) {
  return phase === COMPLETION_FLOW.AI_RECITE_RECORDING
    || phase === COMPLETION_FLOW.AI_RECITE_REVIEW
}
