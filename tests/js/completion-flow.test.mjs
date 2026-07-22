import assert from 'node:assert/strict'
import {
  COMPLETION_FLOW,
  deriveCompletionFlowPhase,
  primarySurfaceForPhase,
  resolveConfidenceSelection,
  shouldHideCompletionUnderAi,
  shouldKeepCompletionMounted,
} from '../../resources/js/scripts/session/completionFlow.js'

{
  assert.equal(
    resolveConfidenceSelection({ confidence_feedback: null, ai_assessment: null }),
    null
  )
  assert.equal(
    resolveConfidenceSelection({ confidence_feedback: 'needs_practice' }),
    'needs_practice'
  )
  assert.equal(
    resolveConfidenceSelection({
      confidence_feedback: null,
      ai_assessment: { result: 'weak' },
    }),
    null
  )
  assert.equal(
    resolveConfidenceSelection(
      { confidence_feedback: 'needs_practice', ai_assessment: { result: 'strong' } },
      'confident'
    ),
    'confident'
  )
  assert.equal(
    resolveConfidenceSelection({
      confidence_feedback: null,
      type: 'repeat_current_range',
      range_kind: 'repeated',
    }),
    null
  )
  assert.equal(
    resolveConfidenceSelection({ confidence_feedback: null }, 'needs_practice'),
    'needs_practice'
  )
}

{
  const phase = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionRecommendationStatus: 'ready',
  })
  assert.equal(phase, COMPLETION_FLOW.RECOMMENDATION)
  assert.equal(primarySurfaceForPhase(phase), 'completion')
}

{
  const recording = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionAiReciteActive: true,
    showSelfCheckModal: true,
    isSelfCheckRecording: true,
  })
  assert.equal(recording, COMPLETION_FLOW.AI_RECITE_RECORDING)
  assert.equal(primarySurfaceForPhase(recording), 'self_check')
  assert.equal(shouldHideCompletionUnderAi(recording), true)
  assert.equal(shouldKeepCompletionMounted(recording), true)
}

{
  const review = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionAiReciteActive: true,
    showSelfCheckModal: true,
    hasSelfCheckResult: true,
  })
  assert.equal(review, COMPLETION_FLOW.AI_RECITE_REVIEW)
}

{
  const creating = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionRecommendationStarting: true,
    isRepeatRecommendation: true,
  })
  assert.equal(creating, COMPLETION_FLOW.CREATING_REPEAT)
}

{
  const builder = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionOffcanvasOpen: true,
    postSessionRecommendationStatus: 'ready',
  })
  assert.equal(builder, COMPLETION_FLOW.NEW_SESSION_BUILDER)
  assert.equal(primarySurfaceForPhase(builder), 'builder')
}

{
  assert.equal(deriveCompletionFlowPhase({}), COMPLETION_FLOW.CLOSED)
  assert.equal(primarySurfaceForPhase(COMPLETION_FLOW.CLOSED), 'none')
}

console.log('completion-flow.test.mjs: ok')
