import assert from 'node:assert/strict'
import {
  POST_SESSION_CTA_ACTIONS,
  POST_SESSION_CTA_STATES,
  isMeaningfulFocusPhraseRevision,
  isMinorIsolatedWeakness,
  mapPostSessionCtas,
  normaliseCtaOutcome,
  resolvePostSessionCtaState,
  resolveWeaknessSeverity,
} from '../../resources/js/scripts/recommendations/postSessionCtaMapping.js'

{
  assert.equal(normaliseCtaOutcome('Needs practice'), 'weak')
  assert.equal(normaliseCtaOutcome('strong'), 'strong')
  assert.equal(normaliseCtaOutcome('mixed'), 'mixed')
  assert.equal(resolveWeaknessSeverity({
    accuracyPercent: 91,
    hardWordCount: 1,
    weakAyahCount: 0,
    outcome: 'strong',
    hasWordLevelEvidence: true,
  }), 'minor')
  assert.equal(resolveWeaknessSeverity({
    accuracyPercent: 81,
    hardWordCount: 1,
    weakAyahCount: 0,
    outcome: 'strong',
    hasWordLevelEvidence: true,
  }), 'significant')
  assert.equal(resolveWeaknessSeverity({
    accuracyPercent: 91,
    hardWordCount: 2,
    weakAyahCount: 0,
    outcome: 'strong',
    hasWordLevelEvidence: true,
  }), 'significant')
  assert.equal(resolveWeaknessSeverity({
    accuracyPercent: 80,
    hardWordCount: 3,
    weakAyahCount: 0,
    outcome: 'strong',
    hasWordLevelEvidence: true,
  }), 'significant')
  assert.equal(resolveWeaknessSeverity({
    accuracyPercent: 72,
    hardWordCount: 0,
    weakAyahCount: 0,
    outcome: 'mixed',
    hasWordLevelEvidence: true,
  }), 'minor')
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
  }), POST_SESSION_CTA_STATES.MOSTLY_SECURE)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'mixed',
    weakAyahCount: 1,
    hardWordCount: 2,
    hasFocusPhrase: true,
  }), POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED)

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
    hasAiCheck: true,
    outcome: 'strong',
    hardWordCount: 2,
    accuracyPercent: 91,
    hasWordLevelEvidence: true,
  }), POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED)

  assert.equal(resolvePostSessionCtaState({
    hasAiCheck: true,
    outcome: 'mixed',
    hardWordCount: 2,
    accuracyPercent: 72,
    weakAyahCount: 2,
    hasWordLevelEvidence: true,
  }), POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED)

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

  const needsPracticeWeak = mapPostSessionCtas(POST_SESSION_CTA_STATES.NEEDS_PRACTICE, {
    weakAyahNumber: 4,
  })
  assert.equal(needsPracticeWeak[2].action, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH)
  assert.equal(needsPracticeWeak[2].labelKey, 'reviewAyahOnce')

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
    ['ghost', POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING, 'repeatThisSession'],
  ])

  const strong = mapPostSessionCtas(POST_SESSION_CTA_STATES.STRONG)
  assert.deepEqual(strong.map((b) => [b.variant, b.action, b.labelKey]), [
    ['success', POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToNextRange'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.REVIEW_ONCE_MORE, 'repeatThisSession'],
  ])

  const strongWithRange = mapPostSessionCtas(POST_SESSION_CTA_STATES.STRONG, {
    nextRangeStart: 6,
    nextRangeEnd: 8,
  })
  assert.equal(strongWithRange[0].labelKey, 'continueToAyahs')
  assert.deepEqual(strongWithRange[0].labelParams, { start: 6, end: 8 })

  const strongRepeat = mapPostSessionCtas(POST_SESSION_CTA_STATES.STRONG, { isRepeat: true })
  assert.equal(strongRepeat[0].labelKey, 'repeatThisSession')
  assert.equal(strongRepeat[2].labelKey, 'reviewOnceMore')

  const awaiting = mapPostSessionCtas(POST_SESSION_CTA_STATES.AWAITING_CHECK)
  assert.deepEqual(awaiting.map((b) => [b.variant, b.action, b.labelKey]), [
    ['ai', POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION, 'testWithAi'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.SKIP_FOR_NOW, 'continueToNextRange'],
  ], 'skip must label the real continue destination')

  const awaitingRepeat = mapPostSessionCtas(POST_SESSION_CTA_STATES.AWAITING_CHECK, { isRepeat: true })
  assert.equal(awaitingRepeat[2].action, POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING)
  assert.equal(awaitingRepeat[2].labelKey, 'repeatThisSession')

  const mostlySecure = mapPostSessionCtas(POST_SESSION_CTA_STATES.MOSTLY_SECURE, {
    nextRangeStart: 3,
    nextRangeEnd: 5,
    weakAyahNumber: 2,
  })
  assert.deepEqual(mostlySecure.map((b) => [b.variant, b.action, b.labelKey]), [
    ['reinforce', POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH, 'reviewAyahOnce'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToAyahs'],
  ])

  const mostlySecureNoWeak = mapPostSessionCtas(POST_SESSION_CTA_STATES.MOSTLY_SECURE, {
    nextRangeStart: 3,
    nextRangeEnd: 5,
  })
  assert.equal(mostlySecureNoWeak[0].action, POST_SESSION_CTA_ACTIONS.REVIEW_ONCE_MORE)
  assert.equal(mostlySecureNoWeak[0].variant, 'reinforce')
  assert.equal(mostlySecureNoWeak[2].action, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE)

  const reviewRecommended = mapPostSessionCtas(POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED)
  assert.deepEqual(reviewRecommended.map((b) => [b.variant, b.action, b.labelKey]), [
    ['primary', POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE, 'reviseFocusPhrase'],
    ['secondary', POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE, 'returnToWorkspace'],
    ['ghost', POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, 'continueToNextRange'],
  ])

  const reviewRecommendedWeak = mapPostSessionCtas(POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED, {
    weakAyahNumber: 7,
  })
  assert.equal(reviewRecommendedWeak[2].action, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH)

  // Every recommendation state: one lead CTA, Return to workspace as secondary
  // (except the soft AI-check nudge, whose secondary is Continue without testing).
  for (const state of Object.values(POST_SESSION_CTA_STATES)) {
    const buttons = mapPostSessionCtas(state, state === POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO
      ? { insufficientReason: 'mic_permission' }
      : {})
    const leadCount = buttons.filter((b) => (
      b.variant === 'primary'
      || b.variant === 'success'
      || b.variant === 'ai'
      || b.variant === 'reinforce'
    )).length
    assert.equal(leadCount, 1, `${state} must keep a single recommended primary/success CTA`)
    assert.equal(
      buttons.filter((b) => b.variant === 'secondary').length,
      1,
      `${state} must expose a single secondary CTA`,
    )
    if (state === POST_SESSION_CTA_STATES.MEMORISATION_CHECK_NUDGE) {
      assert.equal(buttons[1].action, POST_SESSION_CTA_ACTIONS.CONTINUE_WITHOUT_TESTING)
      assert.equal(buttons[0].action, POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION)
      continue
    }
    assert.equal(
      buttons[1].action,
      POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE,
      `${state} secondary action must be return_to_workspace`,
    )
    assert.equal(buttons[1].labelKey, 'returnToWorkspace')
    assert.notEqual(buttons[0].labelKey, 'continue')
    assert.notEqual(buttons[0].action, POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE)
    // Lead CTA must never use a vague/unmapped label.
    assert.notEqual(buttons[0].labelKey, 'skipForNow')
    assert.notEqual(buttons[0].labelKey, 'keepPractising')
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
