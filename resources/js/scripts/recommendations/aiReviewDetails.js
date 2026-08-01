/**
 * Build a dense, dynamic post-session AI Recite review for the completion modal.
 *
 * Distinguishes:
 * - insufficient_audio — silence / mic failure / unusable audio (never show 0% score)
 * - valid_zero_match — spoken attempt assessed at 0% (calm, non-punitive presentation)
 * - normal partial / strong results
 */

import { formatAyahNumbersLabel } from '../formatting/ayahLabels.js'
import {
  RECITATION_RESULT_STATE,
  resolveAccuracyPercent,
  resolveInsufficientAudioReason,
  resolveRecitationResultState,
  resultStateToLegacyOutcome,
  hasSpokenRecitationEvidence,
} from './recitationResultState.js'

export { resolveAccuracyPercent } from './recitationResultState.js'

export const ASSESSMENT_QUALITY = Object.freeze({
  INSUFFICIENT_AUDIO: 'insufficient_audio',
  VALID_ZERO_MATCH: 'valid_zero_match',
  PARTIAL_MATCH: 'partial_match',
  STRONG_MATCH: 'strong_match',
})

/**
 * @param {unknown} value
 * @returns {number}
 */
function countList(value) {
  if (Array.isArray(value)) return value.length
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isCorrectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (!s || s.includes('incorrect') || s.includes('incomplete')) return false
  return s === 'correct' || s.includes('word-correct') || s === 'green'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isPartialStatus(status) {
  const s = String(status || '').toLowerCase()
  return s.includes('partial') || s.includes('close') || s === 'amber' || s === 'yellow'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isMissedStatus(status) {
  const s = String(status || '').toLowerCase()
  return s.includes('incorrect') || s.includes('missing') || s.includes('missed') || s === 'red'
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isOmittedStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'omitted' || s === 'black' || s.includes('omission')
}

/**
 * @param {unknown} status
 * @returns {boolean}
 */
function isGrayStatus(status) {
  const s = String(status || '').toLowerCase()
  return s === 'pending' || s === 'skipped' || s === 'notattempted' || s === 'gray' || s === 'grey'
}

/**
 * Classify whether the attempt had usable speech and how it matched.
 *
 * @param {Record<string, unknown>|null|undefined} result
 * @param {Record<string, unknown>} extras
 * @returns {'insufficient_audio'|'valid_zero_match'|'partial_match'|'strong_match'}
 */
export function classifyRecitationAssessmentQuality(result = null, extras = {}) {
  const explicit = String(
    extras.assessment_quality
    || extras.assessmentQuality
    || result?.assessmentQuality
    || result?.assessment_quality
    || '',
  ).toLowerCase().trim()
  if (Object.values(ASSESSMENT_QUALITY).includes(explicit)) return explicit

  if (resolveInsufficientAudioReason(result, extras)) {
    return ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO
  }

  if (!hasSpokenRecitationEvidence(result, extras)) {
    return ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO
  }

  const accuracy = resolveAccuracyPercent(result, extras)
  const wordStatuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []
  const correctWords = wordStatuses.filter((word) => isCorrectStatus(word?.status)).length
  const partialWords = wordStatuses.filter((word) => isPartialStatus(word?.status)).length

  if ((accuracy === 0 || accuracy == null) && correctWords === 0 && partialWords === 0) {
    // Spoken audio was assessed but nothing matched confidently.
    return ASSESSMENT_QUALITY.VALID_ZERO_MATCH
  }

  if (accuracy != null && accuracy >= 80) return ASSESSMENT_QUALITY.STRONG_MATCH
  if (correctWords > 0 || (accuracy != null && accuracy > 0)) return ASSESSMENT_QUALITY.PARTIAL_MATCH
  return ASSESSMENT_QUALITY.PARTIAL_MATCH
}

/**
 * @param {string} outcome strong|mixed|weak|insufficient_audio|needs_practice|developing
 * @param {Record<string, unknown>} extras
 * @param {Record<string, unknown>|null} result
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 */
export function buildAiReviewDetails(outcome = 'mixed', extras = {}, result = null, t = (key) => key) {
  const mistakes = result?.mistakeBreakdown || result?.mistakes || {}
  const wordStatuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []

  const correctWords = wordStatuses.filter((w) => isCorrectStatus(w?.status)).length
  const partialFromWords = wordStatuses.filter((w) => isPartialStatus(w?.status)).length
  const redFromWords = wordStatuses.filter((w) => isMissedStatus(w?.status) && !isOmittedStatus(w?.status)).length
  const blackFromWords = wordStatuses.filter((w) => isOmittedStatus(w?.status)).length
  const grayFromWords = wordStatuses.filter((w) => isGrayStatus(w?.status)).length
  const missedFromWords = redFromWords + blackFromWords
  const outOfOrderWords = wordStatuses.filter((w) => w?.outOfOrder).length
  const colorCounts = extras.color_counts && typeof extras.color_counts === 'object'
    ? extras.color_counts
    : (result?.colorCounts && typeof result.colorCounts === 'object'
      ? result.colorCounts
      : {
        green: correctWords,
        amber: partialFromWords,
        red: redFromWords,
        black: blackFromWords,
        gray: grayFromWords,
      })

  const assessmentQuality = classifyRecitationAssessmentQuality(result, {
    ...extras,
    accuracy_percent: extras.accuracy_percent ?? resolveAccuracyPercent(result, extras),
  })
  const resultState = resolveRecitationResultState(result, {
    ...extras,
    outcome,
    accuracy_percent: extras.accuracy_percent ?? resolveAccuracyPercent(result, extras),
  })

  // Silence / unusable audio: never present a 0% score wall.
  if (
    assessmentQuality === ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO
    || resultState === RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO
    || outcome === 'insufficient_audio'
  ) {
    return buildInsufficientAudioDetails(t, extras, result)
  }

  const accuracy = resolveAccuracyPercent(result, extras)

  const missed = Math.max(
    countList(extras.missed_words),
    countList(mistakes.missing) + countList(mistakes.incorrect),
    missedFromWords,
  )
  const sequence = Math.max(
    countList(extras.sequence_errors),
    countList(mistakes.sequenceErrors) + countList(mistakes.verseJumps) + countList(mistakes.skippedAyahs),
    outOfOrderWords,
  )
  const partial = Math.max(countList(mistakes.partial), partialFromWords, Number(colorCounts.amber || 0))
  const amberCount = partial
  const pronunciation = extras.pronunciation_issues != null
    ? !!extras.pronunciation_issues
    : amberCount >= 2

  const weakAyahs = Array.isArray(extras.weak_ayahs)
    ? extras.weak_ayahs.filter(Boolean)
    : (Array.isArray(result?.weakAyahs) ? result.weakAyahs.filter(Boolean) : [])

  const totalWords = wordStatuses.length
    || Math.max(correctWords + missed + amberCount, 0)
  const estimatedCorrect = totalWords > 0
    ? correctWords
    : (accuracy != null ? Math.round((accuracy / 100) * Math.max(totalWords, 1)) : null)

  const durationSeconds = Number(result?.durationSeconds || extras.duration_seconds || 0)
  const matchedWords = estimatedCorrect ?? correctWords
  const noWordsMatched = (matchedWords === 0 || matchedWords == null)
    && (accuracy === 0 || correctWords === 0)
  const isValidZeroMatch = assessmentQuality === ASSESSMENT_QUALITY.VALID_ZERO_MATCH
    || (accuracy === 0 && noWordsMatched && totalWords > 0)

  if (isValidZeroMatch) {
    return buildValidZeroMatchDetails({
      outcome: 'weak',
      accuracy: accuracy ?? 0,
      matchedWords: matchedWords ?? 0,
      totalWords: Math.max(totalWords, missed, 1),
      missed: Math.max(missed, totalWords || 0),
      durationSeconds,
      colorCounts,
      weakAyahs,
      resultState: RECITATION_RESULT_STATE.NEEDS_PRACTICE,
      t,
    })
  }

  const resolvedState = resultState === RECITATION_RESULT_STATE.STRONG
    || resultState === RECITATION_RESULT_STATE.DEVELOPING
    || resultState === RECITATION_RESULT_STATE.NEEDS_PRACTICE
    ? resultState
    : legacyOutcomeToDisplayState(outcome)
  const resolvedOutcome = resultStateToLegacyOutcome(resolvedState) || 'mixed'
  const toneForOutcome = resolvedOutcome === 'strong' ? 'good' : (resolvedOutcome === 'weak' ? 'warn' : 'mid')

  const resolvedMatched = matchedWords ?? correctWords
  const hasWordLevelEvidence = totalWords > 0 && (
    missed > 0 || amberCount > 0 || (colorCounts.black || 0) > 0 || correctWords < totalWords
  )

  // Technical metrics live behind "View details" — never on the default card.
  const detailsMetrics = []
  if (accuracy != null) {
    detailsMetrics.push({
      key: 'accuracy',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricAccuracy'),
      value: `${accuracy}%`,
    })
  }
  if (totalWords > 0) {
    detailsMetrics.push({
      key: 'words',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricDetectedWords')
        || t('memorisation.postSession.recommendation.aiMetricWords'),
      value: `${resolvedMatched}/${totalWords}`,
    })
  }
  detailsMetrics.push({
    key: 'missed',
    tone: 'soft',
    label: t('memorisation.postSession.recommendation.aiMetricMissedWords')
      || t('memorisation.postSession.recommendation.aiMetricMissed'),
    value: String(missed),
  })

  const sequenceMetric = buildSequenceMetric({
    sequence,
    matchedWords: resolvedMatched,
    t,
  })
  detailsMetrics.push({ ...sequenceMetric, tone: 'soft' })

  if (amberCount > 0) {
    detailsMetrics.push({
      key: 'close',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricClose'),
      value: String(amberCount),
    })
  }
  if ((colorCounts.black || 0) > 0) {
    detailsMetrics.push({
      key: 'omitted',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricOmitted'),
      value: String(colorCounts.black),
    })
  }

  const recognitionConfidence = resolveRecognitionConfidence(wordStatuses, result, extras)
  if (recognitionConfidence != null) {
    detailsMetrics.push({
      key: 'confidence',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricConfidence')
        || 'Recognition confidence',
      value: `${recognitionConfidence}%`,
    })
  }

  const highlights = []
  if (resolvedOutcome === 'strong' && (accuracy == null || accuracy >= 85)) {
    highlights.push({
      key: 'strength',
      tone: 'good',
      text: t('memorisation.postSession.recommendation.aiHighlightStrongRecall'),
    })
  }
  if (missed > 0) {
    highlights.push({
      key: 'missed',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightMissedWords', { count: missed }),
    })
  }
  if (amberCount > 0 || pronunciation) {
    highlights.push({
      key: 'pronunciation',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightPronunciation', {
        count: Math.max(amberCount, 1),
      }),
    })
  }
  if ((colorCounts.black || 0) > 0) {
    highlights.push({
      key: 'omitted',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightOmittedWords', {
        count: colorCounts.black,
      }),
    })
  }
  if (sequence > 0 && resolvedMatched > 0) {
    highlights.push({
      key: 'sequence',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightSequence'),
    })
  }
  if (hasWordLevelEvidence && weakAyahs.length === 1) {
    highlights.push({
      key: 'weak-ayah',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeakAyah', { ayah: weakAyahs[0] }),
    })
  } else if (hasWordLevelEvidence && weakAyahs.length > 1) {
    highlights.push({
      key: 'weak-ayahs',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeakAyahs', {
        count: weakAyahs.length,
        ayahs: formatAyahNumbersLabel(weakAyahs.slice(0, 4), t) || weakAyahs.slice(0, 4).join(', '),
      }),
    })
  }
  if (accuracy != null && accuracy >= 70 && accuracy < 85 && !highlights.some((h) => h.key === 'mixed')) {
    highlights.push({
      key: 'band-mixed',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightMixed'),
    })
  }
  if (!highlights.length && resolvedOutcome === 'mixed') {
    highlights.push({
      key: 'mixed',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightMixed'),
    })
  }
  if (!highlights.length && resolvedOutcome === 'weak') {
    highlights.push({
      key: 'weak',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeak'),
    })
  }
  if (!highlights.length) {
    highlights.push({
      key: 'fallback',
      tone: toneForOutcome,
      text: t('memorisation.postSession.recommendation.aiHighlightStrongRecall'),
    })
  }

  const focus = buildFocusTip({
    accuracy: accuracy ?? 0,
    missed,
    partial: amberCount,
    sequence: resolvedMatched > 0 ? sequence : 0,
    pronunciation,
    weakAyahs: hasWordLevelEvidence ? weakAyahs : [],
    mistakes,
    omitted: Number(colorCounts.black || 0),
    t,
  })

  const hasMinorWeakness = hasWordLevelEvidence
    && (missed > 0 || amberCount > 0 || (Array.isArray(weakAyahs) && weakAyahs.length > 0))
    && resolvedState !== RECITATION_RESULT_STATE.NEEDS_PRACTICE
  const outcomeLabel = resolvedState === RECITATION_RESULT_STATE.STRONG && !hasMinorWeakness
    ? (t('memorisation.postSession.recommendation.statusReadyToContinue')
      || t('memorisation.postSession.recommendation.aiOutcomeStrong')
      || 'Ready to continue')
    : resolvedState === RECITATION_RESULT_STATE.STRONG && hasMinorWeakness
      ? (t('memorisation.postSession.recommendation.statusMostlySecure')
        || t('memorisation.postSession.recommendation.aiOutcomeMixed')
        || 'Mostly secure')
      : ((resolvedState === RECITATION_RESULT_STATE.NEEDS_PRACTICE
        || (hasWordLevelEvidence && missed >= 3))
        ? (t('memorisation.postSession.recommendation.statusMorePracticeNeeded')
          || t('memorisation.postSession.recommendation.aiOutcomeWeak')
          || 'More practice needed')
        : (hasMinorWeakness
          ? (t('memorisation.postSession.recommendation.statusReviewRecommended')
            || t('memorisation.postSession.recommendation.aiOutcomeReviewRecommended')
            || 'Review recommended')
          : (t('memorisation.postSession.recommendation.statusMostlySecure')
            || t('memorisation.postSession.recommendation.aiOutcomeMixed')
            || 'Mostly secure')))

  const summaryLine = buildAiSummaryLine({
    outcome: resolvedOutcome,
    matchedWords: resolvedMatched,
    totalWords,
    accuracy,
    hasWordLevelEvidence,
    weakAyahs: hasWordLevelEvidence ? weakAyahs : [],
    missed,
    partial: amberCount,
    sequence: resolvedMatched > 0 ? sequence : 0,
    t,
  })

  return {
    outcome: resolvedOutcome,
    resultState: resolvedState,
    outcomeLabel,
    accuracy,
    matchedWords: resolvedMatched,
    totalWords,
    colorCounts,
    assessmentQuality,
    presentationMode: 'standard',
    showDetailsToggle: detailsMetrics.length > 0,
    progressPercent: accuracy,
    progressLabel: '',
    summaryLine,
    durationLabel: durationSeconds > 0
      ? t('memorisation.postSession.recommendation.aiReviewDuration', { seconds: Math.round(durationSeconds) })
      : '',
    // Compact default card: no primary metric wall.
    metrics: [],
    detailsMetrics: detailsMetrics.slice(0, 6),
    highlights: highlights.slice(0, 5),
    focus,
    weakAyahs: hasWordLevelEvidence ? weakAyahs.slice(0, 6) : [],
    chips: detailsMetrics.slice(0, 5).map((metric) => ({
      key: metric.key,
      tone: metric.tone,
      label: metric.key === 'accuracy' ? metric.value : `${metric.label}: ${metric.value}`,
    })),
  }
}

function legacyOutcomeToDisplayState(outcome) {
  const value = String(outcome || '').toLowerCase().trim()
  if (value === 'strong') return RECITATION_RESULT_STATE.STRONG
  if (value === 'weak' || value === 'needs_practice') return RECITATION_RESULT_STATE.NEEDS_PRACTICE
  return RECITATION_RESULT_STATE.DEVELOPING
}

/**
 * Learner-facing copy for an insufficient attempt. Only mic-permission failures
 * should mention the microphone — empty ASR / short clips are not mic faults.
 *
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {string|null|undefined} reason
 * @returns {{ summaryLine: string, focus: string, showMicrophoneCheck: boolean }}
 */
export function resolveInsufficientAudioCopy(t, reason = '') {
  const value = String(reason || '').toLowerCase().trim()
  if (value === 'mic_permission') {
    return {
      summaryLine: t('memorisation.postSession.recommendation.insufficientAudioMicSummary')
        || 'Microphone access is blocked. Allow the microphone, then try recording again.',
      focus: t('memorisation.postSession.recommendation.insufficientAudioFocus')
        || 'Check your microphone, then try recording again.',
      showMicrophoneCheck: true,
    }
  }
  if (value === 'short_recording' || value === 'short_speech') {
    return {
      summaryLine: t('memorisation.postSession.recommendation.insufficientAudioShortSummary')
        || 'That recording was too short to assess. Recite a little longer, then try again.',
      focus: t('memorisation.postSession.recommendation.insufficientAudioHint')
        || 'Recite clearly into the microphone, then try recording again.',
      showMicrophoneCheck: false,
    }
  }
  if (value === 'processing_failed') {
    return {
      summaryLine: t('memorisation.postSession.recommendation.insufficientAudioProcessingSummary')
        || 'We could not process this recording. Please try recording again.',
      focus: t('memorisation.postSession.recommendation.insufficientAudioHint')
        || 'Recite clearly into the microphone, then try recording again.',
      showMicrophoneCheck: false,
    }
  }
  return {
    summaryLine: t('memorisation.postSession.recommendation.insufficientAudioSummary')
      || 'We did not hear enough clear recitation to assess this attempt. Please try again.',
    focus: t('memorisation.postSession.recommendation.insufficientAudioHint')
      || 'Recite clearly into the microphone, then try recording again.',
    showMicrophoneCheck: false,
  }
}

/**
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {Record<string, unknown>} extras
 * @param {Record<string, unknown>|null} result
 */
function buildInsufficientAudioDetails(t, extras = {}, result = null) {
  const durationSeconds = Number(result?.durationSeconds || extras.duration_seconds || 0)
  const reason = resolveInsufficientAudioReason(result, extras)
    || String(extras.insufficientReason || extras.failure_reason || extras.failureReason || result?.failureReason || '')
  const copy = resolveInsufficientAudioCopy(t, reason)
  return {
    outcome: 'insufficient_audio',
    resultState: RECITATION_RESULT_STATE.INSUFFICIENT_AUDIO,
    outcomeLabel: t('memorisation.postSession.recommendation.insufficientAudioStatus')
      || 'We could not assess this attempt',
    accuracy: null,
    colorCounts: { green: 0, amber: 0, red: 0, black: 0, gray: 0 },
    assessmentQuality: ASSESSMENT_QUALITY.INSUFFICIENT_AUDIO,
    insufficientReason: reason,
    presentationMode: 'insufficient_audio',
    showDetailsToggle: false,
    showMicrophoneCheck: copy.showMicrophoneCheck,
    progressPercent: null,
    progressLabel: '',
    summaryLine: copy.summaryLine,
    durationLabel: durationSeconds > 0
      ? t('memorisation.postSession.recommendation.aiReviewDuration', { seconds: Math.round(durationSeconds) })
      : '',
    metrics: [],
    detailsMetrics: [],
    highlights: [],
    focus: copy.focus,
    weakAyahs: [],
    chips: [],
  }
}

/**
 * Calm presentation for a genuine spoken 0% match — no harsh metric wall.
 */
function buildValidZeroMatchDetails({
  outcome,
  accuracy,
  matchedWords,
  totalWords,
  missed,
  durationSeconds,
  colorCounts,
  weakAyahs,
  resultState,
  t,
}) {
  const detailsMetrics = [
    {
      key: 'accuracy',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricAccuracy'),
      value: `${accuracy}%`,
    },
    {
      key: 'words',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricDetectedWords')
        || t('memorisation.postSession.recommendation.aiMetricWords'),
      value: `${matchedWords}/${totalWords}`,
    },
    {
      key: 'missed',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricMissedWords')
        || t('memorisation.postSession.recommendation.aiMetricMissed'),
      value: String(Math.max(missed, totalWords - matchedWords)),
    },
    {
      key: 'sequence',
      tone: 'soft',
      label: t('memorisation.postSession.recommendation.aiMetricSequence')
        || t('memorisation.postSession.recommendation.aiMetricOrder'),
      value: t('memorisation.postSession.recommendation.aiMetricSequenceNotEnough')
        || t('memorisation.postSession.recommendation.aiMetricOrderNotAssessed')
        || 'Not enough matched words to assess',
    },
  ]

  return {
    outcome: outcome === 'weak' ? 'weak' : 'weak',
    resultState: resultState || RECITATION_RESULT_STATE.NEEDS_PRACTICE,
    outcomeLabel: t('memorisation.postSession.recommendation.confidenceNeedsPractice')
      || t('memorisation.postSession.recommendation.zeroMatchStatus')
      || 'Needs more practice',
    accuracy,
    matchedWords,
    totalWords,
    colorCounts,
    assessmentQuality: ASSESSMENT_QUALITY.VALID_ZERO_MATCH,
    presentationMode: 'valid_zero_match',
    showDetailsToggle: true,
    progressPercent: 0,
    progressLabel: t('memorisation.postSession.recommendation.zeroMatchProgressLabel')
      || 'Not matched yet',
    summaryLine: (() => {
      const matchLine = t('memorisation.postSession.recommendation.aiSummaryMatchedWords', {
        matched: matchedWords,
        total: totalWords,
      }) || `We clearly matched ${matchedWords} of ${totalWords} words.`
      const focusLine = t('memorisation.postSession.recommendation.aiSummaryFocusRange')
        || t('memorisation.postSession.recommendation.zeroMatchSummary')
        || 'Revise this range, then check again.'
      return `${matchLine} ${focusLine}`.trim()
    })(),
    durationLabel: durationSeconds > 0
      ? t('memorisation.postSession.recommendation.aiReviewDuration', { seconds: Math.round(durationSeconds) })
      : '',
    // Keep primary metrics empty so the calm summary leads.
    metrics: [],
    detailsMetrics,
    highlights: [{
      key: 'zero-match',
      tone: 'soft',
      text: t('memorisation.postSession.recommendation.zeroMatchHint')
        || 'A short revision pass will help the words settle before you check again.',
    }],
    focus: t('memorisation.postSession.recommendation.zeroMatchFocus')
      || 'Revise this range slowly, then check again.',
    weakAyahs: weakAyahs.slice(0, 6),
    chips: detailsMetrics.map((metric) => ({
      key: metric.key,
      tone: 'soft',
      label: `${metric.label}: ${metric.value}`,
    })),
  }
}

function buildSequenceMetric({ sequence, matchedWords, t }) {
  if (!matchedWords || matchedWords <= 0) {
    return {
      key: 'sequence',
      tone: 'mid',
      label: t('memorisation.postSession.recommendation.aiMetricSequence')
        || t('memorisation.postSession.recommendation.aiMetricOrder'),
      value: t('memorisation.postSession.recommendation.aiMetricOrderNotAssessed')
        || 'Not assessed',
    }
  }
  return {
    key: 'sequence',
    tone: sequence > 0 ? 'warn' : 'good',
    label: t('memorisation.postSession.recommendation.aiMetricOrder'),
    value: sequence > 0
      ? t('memorisation.postSession.recommendation.aiMetricOrderIssues', { count: sequence })
      : t('memorisation.postSession.recommendation.aiMetricOrderSteady'),
  }
}

/**
 * Average recognition confidence (0–100) when word-level confidence exists.
 * Returns null when confidence is not meaningfully present.
 *
 * @param {Array<{confidence?: unknown}>} wordStatuses
 * @param {Record<string, unknown>|null} result
 * @param {Record<string, unknown>} extras
 * @returns {number|null}
 */
export function resolveRecognitionConfidence(wordStatuses = [], result = null, extras = {}) {
  const explicit = Number(
    extras.recognition_confidence
    ?? extras.recognitionConfidence
    ?? result?.recognitionConfidence
    ?? result?.averageConfidence
    ?? result?.avgConfidence,
  )
  if (Number.isFinite(explicit)) {
    return Math.max(0, Math.min(100, Math.round(explicit <= 1 ? explicit * 100 : explicit)))
  }
  const values = (Array.isArray(wordStatuses) ? wordStatuses : [])
    .map((word) => Number(word?.confidence))
    .filter((n) => Number.isFinite(n))
  if (!values.length) return null
  const avg = values.reduce((sum, n) => sum + (n <= 1 ? n * 100 : n), 0) / values.length
  return Math.max(0, Math.min(100, Math.round(avg)))
}

/**
 * Two-line beginner summary from valid assessment word counts.
 * Never claims a phrase was weak without word-level evidence.
 */
function buildAiSummaryLine({
  outcome,
  matchedWords = null,
  totalWords = 0,
  accuracy = null,
  hasWordLevelEvidence = false,
  weakAyahs = [],
  missed = 0,
  partial = 0,
  sequence = 0,
  t,
}) {
  const matched = Number.isFinite(Number(matchedWords)) ? Number(matchedWords) : null
  const total = Number(totalWords) || 0

  if (total > 0 && matched != null) {
    const matchLine = t('memorisation.postSession.recommendation.aiSummaryMatchedWords', {
      matched,
      total,
    }) || `We clearly matched ${matched} of ${total} words.`

    if (hasWordLevelEvidence && (missed > 0 || partial > 0 || matched < total)) {
      const focusLine = t('memorisation.postSession.recommendation.aiSummaryFocusPhrase')
        || 'Focus on the highlighted phrase before checking again.'
      return `${matchLine} ${focusLine}`.trim()
    }

    if (outcome === 'strong') {
      const strongLine = t('memorisation.postSession.recommendation.aiSummaryStrongFollowUp')
        || 'Nice work — you can continue while this still feels fresh.'
      return `${matchLine} ${strongLine}`.trim()
    }

    return matchLine
  }

  // Fallback when word statuses are unavailable — avoid inventing weak-phrase claims.
  if (outcome === 'strong') {
    if (hasWordLevelEvidence && weakAyahs.length === 1) {
      return t('memorisation.postSession.recommendation.aiResultLineStrongHesitation', { ayah: weakAyahs[0] })
    }
    if (hasWordLevelEvidence && (partial === 1 || missed === 1)) {
      return t('memorisation.postSession.recommendation.aiResultLineStrongOneGap')
    }
    return t('memorisation.postSession.recommendation.aiResultLineStrong')
  }
  if (outcome === 'mixed') {
    if (hasWordLevelEvidence && weakAyahs.length === 1) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedAyah', { ayah: weakAyahs[0] })
    }
    if (hasWordLevelEvidence && weakAyahs.length > 1) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedAyahs', { count: weakAyahs.length })
    }
    if (hasWordLevelEvidence && sequence > 0) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedOrder')
    }
    return t('memorisation.postSession.recommendation.aiResultLineMixed')
  }
  if (hasWordLevelEvidence && weakAyahs.length === 1) {
    return t('memorisation.postSession.recommendation.aiResultLineWeakAyah', { ayah: weakAyahs[0] })
  }
  void accuracy
  return t('memorisation.postSession.recommendation.aiResultLineWeak')
}

function buildFocusTip({
  accuracy,
  missed,
  partial,
  sequence,
  pronunciation,
  weakAyahs,
  mistakes,
  omitted = 0,
  t,
}) {
  if (weakAyahs.length === 1) {
    return t('memorisation.postSession.recommendation.aiFocusWeakAyah', { ayah: weakAyahs[0] })
  }
  if (weakAyahs.length > 1) {
    return t('memorisation.postSession.recommendation.aiFocusWeakAyahs', {
      count: weakAyahs.length,
      ayahs: formatAyahNumbersLabel(weakAyahs.slice(0, 3), t) || weakAyahs.slice(0, 3).join(', '),
    })
  }
  if (sequence > 0 || countLen(mistakes.skippedAyahs) || countLen(mistakes.verseJumps)) {
    return t('memorisation.postSession.recommendation.aiFocusSequence')
  }
  if (omitted > 0) {
    return t('memorisation.postSession.recommendation.aiFocusOmitted', { count: omitted })
  }
  if (missed > 0) {
    return t('memorisation.postSession.recommendation.aiFocusMissed', { count: missed })
  }
  if (partial > 0 || pronunciation) {
    return t('memorisation.postSession.recommendation.aiFocusPronunciation', {
      count: Math.max(partial, 1),
    })
  }
  if (accuracy >= 95) {
    return t('memorisation.postSession.recommendation.aiFocusStrong')
  }
  if (accuracy >= 85) {
    return t('memorisation.postSession.recommendation.aiFocusNearly')
  }
  return t('memorisation.postSession.recommendation.aiFocusRetry')
}

function countLen(value) {
  if (Array.isArray(value)) return value.length
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
