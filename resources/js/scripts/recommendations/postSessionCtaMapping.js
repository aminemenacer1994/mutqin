/**
 * Central post-session recommendation CTA mapping.
 *
 * One state → primary / secondary / tertiary hierarchy so button order and
 * labels stay consistent across the Session Complete footer.
 *
 * Colour variants:
 *   primary  — warm brown (normal actions)
 *   success  — green (verified / strong progression only)
 *   secondary / ghost — neutral outline
 */

export const POST_SESSION_CTA_STATES = Object.freeze({
  NEEDS_PRACTICE: 'needs_practice',
  REVIEW_RECOMMENDED: 'review_recommended',
  MOSTLY_SECURE: 'mostly_secure',
  REVISION_COMPLETED: 'revision_completed',
  STRONG: 'strong',
  AWAITING_CHECK: 'awaiting_check',
  INSUFFICIENT_AUDIO: 'insufficient_audio',
  CONFIRM: 'confirm',
})

export const POST_SESSION_CTA_ACTIONS = Object.freeze({
  REVISE_FOCUS_PHRASE: 'revise_focus_phrase',
  REVIEW_WEAK_AYAH: 'review_weak_ayah',
  CHECK_AGAIN: 'check_again',
  TRY_RECORDING_AGAIN: 'try_recording_again',
  CHECK_MICROPHONE: 'check_microphone',
  CHECK_MEMORISATION: 'check_memorisation',
  CONTINUE_PRACTISING: 'continue_practising',
  CONTINUE_NEXT_RANGE: 'continue_next_range',
  REVIEW_ONCE_MORE: 'review_once_more',
  OTHER_RANGE: 'other_range',
  RETURN_TO_WORKSPACE: 'return_to_workspace',
  CLOSE: 'close',
  CONFIRM_START: 'confirm_start',
  SKIP_FOR_NOW: 'skip_for_now',
})

const LABEL_KEYS = Object.freeze({
  reviseFocusPhrase: 'reviseFocusPhrase',
  reviewAyahOnce: 'reviewAyahOnce',
  retest: 'retest',
  tryRecordingAgain: 'tryRecordingAgain',
  checkMicrophone: 'checkMicrophone',
  close: 'close',
  testWithAi: 'testWithAi',
  continuePractising: 'continuePractising',
  continueToNextRange: 'continueToNextRange',
  continueToAyahs: 'continueToAyahs',
  repeatThisSession: 'repeatThisSession',
  reviewOnceMore: 'reviewOnceMore',
  chooseAnotherRange: 'chooseAnotherRange',
  returnToWorkspace: 'returnToWorkspace',
  skipForNow: 'skipForNow',
  keepPractising: 'keepPractising',
})

/**
 * Label for starting the recommended next/repeat session.
 * Must match what confirmPostSessionRecommendation will actually start.
 *
 * @param {{
 *   isRepeat?: boolean,
 *   nextRangeStart?: number|null,
 *   nextRangeEnd?: number|null,
 * }} options
 * @returns {string}
 */
function continueSessionLabelKey(options = {}) {
  if (options.isRepeat) return LABEL_KEYS.repeatThisSession
  if (Number(options.nextRangeStart) > 0 && Number(options.nextRangeEnd) > 0) {
    return LABEL_KEYS.continueToAyahs
  }
  return LABEL_KEYS.continueToNextRange
}

/**
 * @param {string|null|undefined} outcome
 * @returns {'strong'|'mixed'|'weak'|'insufficient_audio'|null}
 */
export function normaliseCtaOutcome(outcome) {
  const value = String(outcome || '').toLowerCase().trim()
  if (value === 'insufficient_audio' || value === 'insufficient audio') return 'insufficient_audio'
  if (value === 'strong' || value === 'confident' || value === 'good' || value === 'ready_to_continue') {
    return 'strong'
  }
  if (value === 'weak' || value === 'needs_practice' || value === 'needs practice' || value === 'more_practice_needed') {
    return 'weak'
  }
  if (
    value === 'mixed'
    || value === 'okay'
    || value === 'developing'
    || value === 'mostly_secure'
    || value === 'review_recommended'
  ) {
    return 'mixed'
  }
  return null
}

/**
 * Detect a minor isolated weakness (single phrase/ayah) that should not block progression.
 *
 * @param {{
 *   weakAyahCount?: number,
 *   hardWordCount?: number,
 *   hasFocusPhrase?: boolean,
 *   outcome?: string|null,
 *   weaknessSeverity?: 'minor'|'significant'|null,
 * }} evidence
 */
export function isMinorIsolatedWeakness(evidence = {}) {
  if (evidence.weaknessSeverity === 'minor') return true
  if (evidence.weaknessSeverity === 'significant') return false

  const outcome = normaliseCtaOutcome(evidence.outcome)
  if (outcome === 'weak') return false
  if (outcome !== 'mixed' && outcome !== 'strong') return false

  const weakAyahs = Math.max(0, Number(evidence.weakAyahCount || 0))
  const hardWords = Math.max(0, Number(evidence.hardWordCount || 0))
  const hasFocus = !!evidence.hasFocusPhrase

  if (weakAyahs > 1) return false
  if (hardWords >= 4) return false
  if (weakAyahs === 1 || hasFocus) {
    return hardWords <= 3
  }
  return false
}

/**
 * Resolve the learner-facing CTA state from result / session flags.
 *
 * Priority:
 * 1. confirm step
 * 2. insufficient audio (retry / mic check — never revise-as-weak)
 * 3. revision completed (practice done → retest)
 * 4. strong result → advance (green success)
 * 5. minor isolated weakness → allow progression + schedule/review once
 * 6. significant weakness → focused review first
 * 7. awaiting first check
 *
 * @param {{
 *   isConfirmStep?: boolean,
 *   hasAiCheck?: boolean,
 *   outcome?: string|null,
 *   masteryAchieved?: boolean,
 *   revisionCompleted?: boolean,
 *   awaitingMasteryRetest?: boolean,
 *   presentationMode?: string|null,
 *   weakAyahCount?: number,
 *   hardWordCount?: number,
 *   hasFocusPhrase?: boolean,
 *   weaknessSeverity?: 'minor'|'significant'|null,
 * }} input
 */
export function resolvePostSessionCtaState(input = {}) {
  if (input.isConfirmStep) return POST_SESSION_CTA_STATES.CONFIRM

  const outcome = normaliseCtaOutcome(input.outcome)
  if (outcome === 'insufficient_audio' || input.presentationMode === 'insufficient_audio') {
    return POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO
  }

  const strong = !!(input.masteryAchieved || outcome === 'strong')
  const minorWeakness = isMinorIsolatedWeakness({
    outcome,
    weakAyahCount: input.weakAyahCount,
    hardWordCount: input.hardWordCount,
    hasFocusPhrase: input.hasFocusPhrase,
    weaknessSeverity: input.weaknessSeverity,
  })

  // Fresh strong result with no meaningful weakness → verified progression.
  if (input.hasAiCheck && strong && !minorWeakness && !input.hasFocusPhrase) {
    return POST_SESSION_CTA_STATES.STRONG
  }

  // Strong/mixed with a minor isolated phrase/ayah weakness → allow progression.
  if (input.hasAiCheck && (strong || outcome === 'mixed') && minorWeakness) {
    return POST_SESSION_CTA_STATES.MOSTLY_SECURE
  }

  // Strong overall but a significant focused weakness → review before advancing.
  if (input.hasAiCheck && strong && input.hasFocusPhrase && !minorWeakness) {
    return POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED
  }

  // Strong with no weakness signal.
  if (input.hasAiCheck && strong) return POST_SESSION_CTA_STATES.STRONG

  const revisionDone = !!(input.revisionCompleted || input.awaitingMasteryRetest)
  if (revisionDone) return POST_SESSION_CTA_STATES.REVISION_COMPLETED

  if (input.hasAiCheck && outcome === 'mixed') {
    return POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED
  }

  if (input.hasAiCheck && (outcome === 'weak' || !strong)) {
    return POST_SESSION_CTA_STATES.NEEDS_PRACTICE
  }

  return POST_SESSION_CTA_STATES.AWAITING_CHECK
}

/**
 * @param {string} id
 * @param {'primary'|'success'|'secondary'|'ghost'} variant
 * @param {string} labelKey
 * @param {string} action
 * @param {object} [extra]
 */
function cta(id, variant, labelKey, action, extra = {}) {
  return { id, variant, labelKey, action, dataAction: action, ...extra }
}

/**
 * Map a CTA state to ordered primary → secondary → tertiary buttons.
 *
 * @param {string} state
 * @param {{
 *   isRepeat?: boolean,
 *   confirmLabelKey?: string|null,
 *   preferReviseRange?: boolean,
 *   insufficientReason?: string,
 *   showMicrophoneCheck?: boolean,
 *   weakAyahNumber?: number|null,
 *   nextRangeStart?: number|null,
 *   nextRangeEnd?: number|null,
 * }=} options
 */
export function mapPostSessionCtas(state, options = {}) {
  // Escape hatch — always secondary so learners are never trapped in a
  // repeat / next-session loop. Must not restart, reject, or discard results.
  const returnToWorkspace = cta(
    'return_to_workspace',
    'secondary',
    LABEL_KEYS.returnToWorkspace,
    POST_SESSION_CTA_ACTIONS.RETURN_TO_WORKSPACE,
  )
  const otherRange = cta(
    'other_range',
    'ghost',
    LABEL_KEYS.chooseAnotherRange,
    POST_SESSION_CTA_ACTIONS.OTHER_RANGE,
  )
  const reviseLabelKey = options.preferReviseRange
    ? 'reviseThisRange'
    : LABEL_KEYS.reviseFocusPhrase

  const nextSessionLabelKey = continueSessionLabelKey(options)
  const nextSessionLabelParams = {
    start: options.nextRangeStart,
    end: options.nextRangeEnd,
  }

  const reviewWeakLabelKey = Number(options.weakAyahNumber) > 0
    ? LABEL_KEYS.reviewAyahOnce
    : LABEL_KEYS.reviseFocusPhrase

  switch (state) {
    case POST_SESSION_CTA_STATES.NEEDS_PRACTICE:
      return [
        cta('revise_focus_phrase', 'primary', reviseLabelKey, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE),
        returnToWorkspace,
        cta('check_again', 'ghost', LABEL_KEYS.retest, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN),
      ]

    case POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED:
      return [
        cta('revise_focus_phrase', 'primary', reviseLabelKey, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE),
        returnToWorkspace,
        cta('continue_next_range', 'ghost', nextSessionLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: nextSessionLabelParams,
        }),
      ]

    case POST_SESSION_CTA_STATES.MOSTLY_SECURE:
      return [
        cta('continue_next_range', 'primary', nextSessionLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: nextSessionLabelParams,
        }),
        returnToWorkspace,
        cta('review_weak_ayah', 'ghost', reviewWeakLabelKey, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH, {
          labelParams: { ayah: options.weakAyahNumber },
        }),
      ]

    case POST_SESSION_CTA_STATES.REVISION_COMPLETED:
      return [
        cta('check_again', 'primary', LABEL_KEYS.retest, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN),
        returnToWorkspace,
        cta(
          'continue_practising',
          'ghost',
          LABEL_KEYS.repeatThisSession,
          POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING,
        ),
      ]

    case POST_SESSION_CTA_STATES.STRONG:
      return [
        // Green only when assessment confirms ready to progress.
        cta('continue_next_range', 'success', nextSessionLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: nextSessionLabelParams,
        }),
        returnToWorkspace,
        // Alternate: stay on the current range (not the recommended advance).
        cta(
          'review_once_more',
          'ghost',
          options.isRepeat ? LABEL_KEYS.reviewOnceMore : LABEL_KEYS.repeatThisSession,
          POST_SESSION_CTA_ACTIONS.REVIEW_ONCE_MORE,
        ),
      ]

    case POST_SESSION_CTA_STATES.INSUFFICIENT_AUDIO: {
      const reason = String(options.insufficientReason || '').toLowerCase().trim()
      const showMic = options.showMicrophoneCheck === true
        || reason === 'mic_permission'
      const buttons = [
        cta(
          'try_recording_again',
          'primary',
          LABEL_KEYS.tryRecordingAgain,
          POST_SESSION_CTA_ACTIONS.TRY_RECORDING_AGAIN,
        ),
        returnToWorkspace,
      ]
      if (showMic) {
        buttons.push(cta(
          'check_microphone',
          'ghost',
          LABEL_KEYS.checkMicrophone,
          POST_SESSION_CTA_ACTIONS.CHECK_MICROPHONE,
        ))
      } else {
        buttons.push(cta('close', 'ghost', LABEL_KEYS.close, POST_SESSION_CTA_ACTIONS.CLOSE))
      }
      return buttons
    }

    case POST_SESSION_CTA_STATES.CONFIRM:
      return [
        cta(
          'confirm_start',
          'primary',
          options.confirmLabelKey
            || (options.isRepeat ? 'startRevision' : 'startSession'),
          POST_SESSION_CTA_ACTIONS.CONFIRM_START,
        ),
        returnToWorkspace,
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.AWAITING_CHECK:
    default:
      return [
        cta('check_memorisation', 'primary', LABEL_KEYS.testWithAi, POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION),
        returnToWorkspace,
        // Ghost must describe the real destination: practise again, or start the recommended session.
        cta(
          'skip_for_now',
          'ghost',
          options.isRepeat ? LABEL_KEYS.repeatThisSession : nextSessionLabelKey,
          options.isRepeat
            ? POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING
            : POST_SESSION_CTA_ACTIONS.SKIP_FOR_NOW,
          options.isRepeat ? {} : { labelParams: nextSessionLabelParams },
        ),
      ]
  }
}

/**
 * Whether ending a focus-phrase revision session counts as completed revision.
 *
 * @param {{
 *   focusPhraseRevisionActive?: boolean,
 *   meaningfulInteraction?: boolean,
 *   focusAyahPlayCount?: number,
 *   totalPlayCount?: number,
 *   sessionDurationSeconds?: number,
 * }} evidence
 * @returns {boolean}
 */
export function isMeaningfulFocusPhraseRevision(evidence = {}) {
  if (!evidence.focusPhraseRevisionActive) {
    // Non-focus revision sessions still complete after any real playback evidence.
    return Number(evidence.totalPlayCount || 0) >= 1
      || Number(evidence.sessionDurationSeconds || 0) >= 20
  }
  if (evidence.meaningfulInteraction) return true
  // Auto-open plays once — require a second focus-ayah play or sustained practice.
  if (Number(evidence.focusAyahPlayCount || 0) >= 2) return true
  if (Number(evidence.totalPlayCount || 0) >= 2) return true
  if (Number(evidence.sessionDurationSeconds || 0) >= 45) return true
  return false
}
