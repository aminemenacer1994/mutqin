import assert from 'node:assert/strict'
import {
  POST_SESSION_CTA_ACTIONS,
  POST_SESSION_CTA_STATES,
  isMeaningfulFocusPhraseRevision,
  mapPostSessionCtas,
  normaliseCtaOutcome,
  resolvePostSessionCtaState,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'

{
  assert.equal(normaliseCtaOutcome('Needs practice'), 'weak')
  assert.equal(normaliseCtaOutcome('strong'), 'strong')
  assert.equal(normaliseCtaOutcome('mixed'), 'mixed')
}

{
  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'weak',
  }), POST_SESSION_CTA_STATES.NEEDS_PRACTICE)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'needs_practice',
  }), POST_SESSION_CTA_STATES.NEEDS_PRACTICE)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'mixed',
  }), POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'mixed',
    weakAyahCount: 1,
    hardWordCount: 2,
    hasFocusPhrase: true,
  }), POST_SESSION_CTA_STATES.MOSTLY_SECURE)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'weak',
    revisionCompleted: true,
  }), POST_SESSION_CTA_STATES.REVISION_COMPLETED)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'strong',
    revisionCompleted: true,
    masteryAchieved: true,
  }), POST_SESSION_CTA_STATES.STRONG)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'strong',
    masteryAchieved: true,
  }), POST_SESSION_CTA_STATES.STRONG)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: false,
  }), POST_SESSION_CTA_STATES.AWAITING_CHECK)

  assert.equal(resolvePostSessionCtaState({
    isConfirmStep: true,
    hasAiCheck: true,
    outcome: 'strong',
  }), POST_SESSION_CTA_STATES.CONFIRM)
}

{
  const needsPractice = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE)
  assert.deepEqual(needsPractice.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE, 'reviseFocusPhrase'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CHECK_AGAIN, 'retest'],
  ])

  const reviseRange = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE, {
    preferReviseRange: true,
  })
  assert.equal(reviseRange[0].labelKey, 'reviseThisRange')

  const insufficient = mapPostSessionCtas(POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO)
  assert.deepEqual(insufficient.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN, 'tryRecordingAgain'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CLOSE, 'close'],
  ], 'non-mic failures must offer Return to workspace as secondary')

  const micBlocked = mapPostSessionCtas(POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO, {
    insufficientReason: 'mic_permission',
  })
  assert.deepEqual(micBlocked.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN, 'tryRecordingAgain'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CHECK_MICROPHONE, 'checkMicrophone'],
  ])

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'insufficient_audio',
  }), POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'weak',
    presentationMode: 'insufficient_audio',
  }), POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO)

  const revisionDone = mapPostSessionCtas(POST_SESSION_CTA_STATES.REVISION_COMPLETED)
  assert.deepEqual(revisionDone.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.CHECK_AGAIN, 'retest'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING, 'continuePractising'],
  ])

  const strong = mapPostSessionCtas(POST_SESSION_CTA_STATES.STRONG)
  assert.deepEqual(strong.map((b) => [b.variant, b.action, b.labelKey]), [
    ['success', POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToNextRange'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.REVIEW_ONCE_MORE, 'reviewOnceMore'],
  ])

  // Every recommendation state: one lead CTA, Return to workspace as secondary.
  for (const state of Object.values(POST_SESSION_CTA_STATES)) {
    const buttons = mapPostSessionCtas(state, state === POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO
      ? { insufficientReason: 'mic_permission' }
      : {})
    const leadCount = buttons.filter((b) => b.variant === 'primary' || b.variant === 'success').length
    assert.equal(leadCount, 1, `${state} must keep a single recommended primary/success CTA`)
    assert.equal(
      buttons.filter((b) => b.variant === 'secondary').length,
      1,
      `${state} must expose Return to workspace as the secondary CTA`,
    )
    assert.equal(
      buttons[1].action,
      POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE,
      `${state} secondary action must be return_to_workspace`,
    )
    assert.equal(buttons[1].labelKey, 'returnToWorkspace')
    assert.notEqual(buttons[0].labelKey, 'continue')
    assert.notEqual(buttons[0].action, POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE)
  }
}

{
  assert.equal(isMeaningfulFocusPhraseRevision({
    focusPhraseRevisionActive: true,
    meaningfulInteraction: false,
    focusAyahPlayCount: 1,
    totalPlayCount: 1,
    sessionDurationSeconds: 10,
  }), false)

  assert.equal(isMeaningfulFocusPhraseRevision({
    focusPhraseRevisionActive: true,
    meaningfulInteraction: false,
    focusAyahPlayCount: 2,
    totalPlayCount: 2,
    sessionDurationSeconds: 10,
  }), true)

  assert.equal(isMeaningfulFocusPhraseRevision({
    focusPhraseRevisionActive: true,
    meaningfulInteraction: true,
  }), true)
}

console.log('post-session-cta-mapping.test.mjs: ok')
