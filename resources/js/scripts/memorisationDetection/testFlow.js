/**
 * Single-source flow controller for Session Complete → AI Memorisation Test.
 */

export const MEM_TEST_FLOW = Object.freeze({
  COMPLETION: 'completion',
  OPENING_TEST: 'opening-test',
  TEST_READY: 'test-ready',
  LISTENING: 'listening',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error',
})

export const MIC_STATUS = Object.freeze({
  READY: 'ready',
  LISTENING: 'listening',
  NEED_ACCESS: 'need_access',
  PAUSED: 'paused',
  UNSUPPORTED: 'unsupported',
  UNAVAILABLE: 'unavailable',
})

/**
 * @returns {object}
 */
export function createMemTestState() {
  return {
    phase: MEM_TEST_FLOW.COMPLETION,
    sessionRangeId: '',
    difficulty: 50,
    hiddenWordIndexes: [],
    revealedWordIndexes: [],
    expectedCursor: 0,
    peekActive: false,
    blurActive: true,
    micStatus: MIC_STATUS.READY,
    helpOpen: false,
    errorMessage: '',
  }
}

/**
 * Derive the active surface so completion + test never compete.
 * @param {{
 *   showPostSessionModal?: boolean,
 *   amdOpen?: boolean,
 *   amdStage?: string,
 *   postSessionAiReciteActive?: boolean,
 *   postSessionAiReciteBusy?: boolean,
 *   amdMicStatus?: string,
 * }} state
 */
export function deriveMemTestPhase(state = {}) {
  const opening = !!state.postSessionAiReciteBusy && !state.amdOpen
  if (opening) return MEM_TEST_FLOW.OPENING_TEST

  if (state.amdOpen) {
    const stage = String(state.amdStage || '')
    if (stage === 'complete') return MEM_TEST_FLOW.COMPLETE
    if (stage === 'error') return MEM_TEST_FLOW.ERROR
    if (stage === 'paused') return MEM_TEST_FLOW.PAUSED
    if (stage === 'listening' || stage === 'starting') return MEM_TEST_FLOW.LISTENING
    return MEM_TEST_FLOW.TEST_READY
  }

  if (state.showPostSessionModal) return MEM_TEST_FLOW.COMPLETION
  return MEM_TEST_FLOW.COMPLETION
}

/**
 * Exactly one modal surface owns the journey.
 * @param {string} phase
 * @returns {'completion'|'test'|'none'}
 */
export function primarySurfaceForMemTest(phase) {
  switch (phase) {
    case MEM_TEST_FLOW.OPENING_TEST:
    case MEM_TEST_FLOW.TEST_READY:
    case MEM_TEST_FLOW.LISTENING:
    case MEM_TEST_FLOW.PAUSED:
    case MEM_TEST_FLOW.COMPLETE:
    case MEM_TEST_FLOW.ERROR:
      return 'test'
    case MEM_TEST_FLOW.COMPLETION:
      return 'completion'
    default:
      return 'none'
  }
}

/**
 * Hide the Session Complete modal while the test is open/opening.
 * @param {string} phase
 */
export function shouldHideCompletionUnderTest(phase) {
  return primarySurfaceForMemTest(phase) === 'test'
}

/**
 * Map low-level mic/recognition flags to learner-facing mic status.
 */
export function resolveMicStatus({
  unsupported = false,
  permission = 'prompt',
  listening = false,
  paused = false,
  denied = false,
} = {}) {
  if (unsupported) return MIC_STATUS.UNSUPPORTED
  if (denied || permission === 'denied') return MIC_STATUS.NEED_ACCESS
  if (paused) return MIC_STATUS.PAUSED
  if (listening) return MIC_STATUS.LISTENING
  return MIC_STATUS.READY
}
