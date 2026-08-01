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
  reviewOnceMore: 'reviewOnceMore',
  chooseAnotherRange: 'chooseAnotherRange',
  skipForNow: 'skipForNow',
  keepPractising: 'keepPractising',
})

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
  const otherRange = cta(
    'other_range',
    'ghost',
    LABEL_KEYS.chooseAnotherRange,
    POST_SESSION_CTA_ACTIONS.OTHER_RANGE,
  )
  const reviseLabelKey = options.preferReviseRange
    ? 'reviseThisRange'
    : LABEL_KEYS.reviseFocusPhrase

  const nextRangeLabelKey = (
    Number(options.nextRangeStart) > 0 && Number(options.nextRangeEnd) > 0
  )
    ? LABEL_KEYS.continueToAyahs
    : LABEL_KEYS.continueToNextRange

  const reviewWeakLabelKey = Number(options.weakAyahNumber) > 0
    ? LABEL_KEYS.reviewAyahOnce
    : LABEL_KEYS.reviseFocusPhrase

  switch (state) {
    case POST_SESSION_CTA_STATES.NEEDS_PRACTICE:
      return [
        cta('revise_focus_phrase', 'primary', reviseLabelKey, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE),
        cta('check_again', 'secondary', LABEL_KEYS.retest, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN),
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.REVIEW_RECOMMENDED:
      return [
        cta('revise_focus_phrase', 'primary', reviseLabelKey, POST_SESSION_CTA_ACTIONS.REVISE_FOCUS_PHRASE),
        cta('continue_next_range', 'secondary', nextRangeLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: {
            start: options.nextRangeStart,
            end: options.nextRangeEnd,
          },
        }),
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.MOSTLY_SECURE:
      return [
        cta('continue_next_range', 'primary', nextRangeLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: {
            start: options.nextRangeStart,
            end: options.nextRangeEnd,
          },
        }),
        cta('review_weak_ayah', 'secondary', reviewWeakLabelKey, POST_SESSION_CTA_ACTIONS.REVIEW_WEAK_AYAH, {
          labelParams: { ayah: options.weakAyahNumber },
        }),
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.REVISION_COMPLETED:
      return [
        cta('check_again', 'primary', LABEL_KEYS.retest, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN),
        cta('continue_practising', 'secondary', LABEL_KEYS.continuePractising, POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING),
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.STRONG:
      return [
        // Green only when assessment confirms ready to progress.
        cta('continue_next_range', 'success', nextRangeLabelKey, POST_SESSION_CTA_ACTIONS.CONTINUE_NEXT_RANGE, {
          labelParams: {
            start: options.nextRangeStart,
            end: options.nextRangeEnd,
          },
        }),
        cta('review_once_more', 'secondary', LABEL_KEYS.reviewOnceMore, POST_SESSION_CTA_ACTIONS.REVIEW_ONCE_MORE),
        otherRange,
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
      ]
      if (showMic) {
        buttons.push(cta(
          'check_microphone',
          'secondary',
          LABEL_KEYS.checkMicrophone,
          POST_SESSION_CTA_ACTIONS.CHECK_MICROPHONE,
        ))
      }
      buttons.push(cta('close', 'ghost', LABEL_KEYS.close, POST_SESSION_CTA_ACTIONS.CLOSE))
      return buttons
    }

    case POST_SESSION_CTA_STATES.CONFIRM:
      return [
        cta(
          'confirm_start',
          'primary',
          options.confirmLabelKey || LABEL_KEYS.continueToNextRange,
          POST_SESSION_CTA_ACTIONS.CONFIRM_START,
        ),
        cta('check_again', 'secondary', LABEL_KEYS.retest, POST_SESSION_CTA_ACTIONS.CHECK_AGAIN),
        otherRange,
      ]

    case POST_SESSION_CTA_STATES.AWAITING_CHECK:
    default:
      return [
        cta('check_memorisation', 'primary', LABEL_KEYS.testWithAi, POST_SESSION_CTA_ACTIONS.CHECK_MEMORISATION),
        cta(
          'skip_for_now',
          'secondary',
          options.isRepeat ? LABEL_KEYS.keepPractising : LABEL_KEYS.skipForNow,
          options.isRepeat
            ? POST_SESSION_CTA_ACTIONS.CONTINUE_PRACTISING
            : POST_SESSION_CTA_ACTIONS.SKIP_FOR_NOW,
        ),
        otherRange,
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
