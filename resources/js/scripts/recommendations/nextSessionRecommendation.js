/**
 * Frontend helpers for the personalised next-session recommendation flow.
 * Reason codes stay internal; UI copy is resolved through i18n keys.
 */

import {
  getTechniqueDescription,
  getTechniqueShortLabel,
} from '../techniques/techniqueDisplay.js'
import { formatRepetitionCountLabel } from '../formatting/ayahLabels.js'

export {
  formatAyahRangeLabel,
  formatContinueToAyahLabel,
  formatRepeatAyahLabel,
  formatSurahAyahLabel,
  formatCompletedSurahAyahLabel,
  formatAyahCountLabel,
  formatRepetitionCountLabel,
  formatAttemptCountLabel,
  normalizeAyahRange,
} from '../formatting/ayahLabels.js'

export const RECOMMENDATION_TYPES = Object.freeze({
  CONTINUE: 'continue',
  CONTINUE_NEXT_RANGE: 'continue_next_range',
  REVISION: 'revision',
  REPEAT_CURRENT_RANGE: 'repeat_current_range',
  COMPLETE_SURAH: 'complete_surah',
  SURAH_COMPLETE: 'surah_complete',
  NEXT_SURAH: 'next_surah',
  PLAN_COMPLETE: 'plan_complete',
  TEST_WITH_AI_RECITE: 'test_with_ai_recite',
  RESUME: 'resume',
  MANUAL_SELECTION: 'manual_selection',
  CHOOSE_NEW_SESSION: 'choose_new_session',
  NO_RECOMMENDATION: 'no_recommendation',
})

const REASON_I18N_KEYS = Object.freeze({
  strong_previous_performance: 'reasons.strongPreviousPerformance',
  continue_current_surah: 'reasons.continueCurrentSurah',
  continue_while_fresh: 'reasons.continueWhileFresh',
  revision_required: 'reasons.revisionRequired',
  needs_more_practice: 'reasons.needsMorePractice',
  difficult_ayah_detected: 'reasons.difficultAyahDetected',
  complete_remaining_ayat: 'reasons.completeRemainingAyat',
  surah_completed: 'reasons.surahCompleted',
  resume_incomplete_session: 'reasons.resumeIncompleteSession',
  reinforce_recent_range: 'reasons.reinforceRecentRange',
  learning_plan_complete: 'reasons.learningPlanComplete',
  manual_fallback: 'reasons.manualFallback',
  ai_recite_strong: 'reasons.aiReciteStrong',
  ai_recite_mixed: 'reasons.aiReciteMixed',
  ai_recite_weak: 'reasons.aiReciteWeak',
  confidence_confident: 'reasons.confidenceConfident',
  confidence_needs_practice: 'reasons.confidenceNeedsPractice',
  session_incomplete: 'reasons.sessionIncomplete',
  low_recall: 'reasons.lowRecall',
  sequence_errors: 'reasons.sequenceErrors',
  high_hint_dependency: 'reasons.highHintDependency',
  visual_dependency: 'reasons.visualDependency',
  audio_dependency: 'reasons.audioDependency',
  spoken_hesitation: 'reasons.spokenHesitation',
  omission_errors: 'reasons.omissionErrors',
  similar_ayah_confusion: 'reasons.similarAyahConfusion',
  low_delayed_retention: 'reasons.lowDelayedRetention',
  high_performance: 'reasons.highPerformance',
  low_confidence: 'reasons.lowConfidence',
  overconfidence: 'reasons.overconfidence',
  review_overdue: 'reasons.reviewOverdue',
  adaptive_check_strong: 'reasons.adaptiveCheckStrong',
  adaptive_check_mixed: 'reasons.adaptiveCheckMixed',
  adaptive_check_weak: 'reasons.adaptiveCheckWeak',
})

const NON_ACTIONABLE = new Set([
  RECOMMENDATION_TYPES.MANUAL_SELECTION,
  RECOMMENDATION_TYPES.CHOOSE_NEW_SESSION,
  RECOMMENDATION_TYPES.NO_RECOMMENDATION,
  RECOMMENDATION_TYPES.PLAN_COMPLETE,
  RECOMMENDATION_TYPES.SURAH_COMPLETE,
  RECOMMENDATION_TYPES.TEST_WITH_AI_RECITE,
])

export function isActionableRecommendation(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') return false
  const type = String(recommendation.type || '')
  const surahId = Number(
    recommendation.surah?.id
    || recommendation.next_surah?.id
    || recommendation.surah_number
    || 0
  )
  const range = recommendation.ayah_range || null
  const hasRange = !!(range && Number(range.from) > 0 && Number(range.to) >= Number(range.from))

  if (NON_ACTIONABLE.has(type)) {
    // Surah/plan complete can still offer next-surah range when present.
    if (type === RECOMMENDATION_TYPES.SURAH_COMPLETE || type === RECOMMENDATION_TYPES.PLAN_COMPLETE) {
      return !!(hasRange && surahId)
    }
    return false
  }

  // Need a concrete surah + range so the Continue button can start a real session.
  return !!(surahId && hasRange)
}

export function isRepeatRecommendation(recommendation) {
  const type = String(recommendation?.type || '')
  return type === RECOMMENDATION_TYPES.REVISION
    || type === RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE
    || type === RECOMMENDATION_TYPES.RESUME
    || recommendation?.session_mode === 'revision'
    || recommendation?.range_kind === 'repeated'
    || recommendation?.range_kind === 'revision'
}

export function recommendationPrimaryActionKey(recommendation) {
  if (recommendation?.primary_action_label_key) {
    return recommendation.primary_action_label_key
  }
  const type = String(recommendation?.type || '')
  if (type === RECOMMENDATION_TYPES.NEXT_SURAH) return 'continueToNextSurah'
  if (isRepeatRecommendation(recommendation)) return 'repeatThisSession'
  if (recommendation?.ayah_range?.from && recommendation?.ayah_range?.to) {
    return 'continueToAyat'
  }
  return 'startRecommendedNextSession'
}

export function recommendationModeLabelKey(recommendation) {
  if (recommendation?.range_kind === 'repeated') return 'modeRepeated'
  if (recommendation?.range_kind === 'revision' || isRepeatRecommendation(recommendation)) {
    return 'modeRevision'
  }
  if (recommendation?.type === RECOMMENDATION_TYPES.NEXT_SURAH) return 'modeNextSurah'
  return 'modeNewLearning'
}

export function localizeRecommendationReason(recommendation, t, prefix = 'memorisation.postSession.recommendation') {
  if (!recommendation) return ''
  const code = String(recommendation.reason_code || '')
  const keySuffix = REASON_I18N_KEYS[code]
  const range = recommendation.ayah_range || {}
  const count = Number(range.count || 0)
  const surahName = recommendation.completed_surah?.name
    || recommendation.surah?.name
    || ''
  const nextName = recommendation.next_surah?.name || recommendation.surah?.name || ''

  if (keySuffix) {
    const translated = t(`${prefix}.${keySuffix}`, {
      count,
      surah: surahName,
      nextSurah: nextName,
      start: range.from,
      end: range.to,
    })
    if (translated && translated !== `${prefix}.${keySuffix}`) return translated
  }

  return String(recommendation.reason || '').trim()
}

export function formatRecommendationSettingsSummary(settings, t, options = {}) {
  if (!settings || typeof settings !== 'object') return ''
  const parts = []
  const technique = String(settings.technique || '').toLowerCase()
  if (technique && t) {
    let techLabel = ''
    if (typeof options.resolveTechniqueLabel === 'function') {
      techLabel = options.resolveTechniqueLabel(technique, t)
    } else {
      techLabel = getTechniqueShortLabel(technique, t)
    }
    if (techLabel && !String(techLabel).includes('techniqueDisplay.') && !String(techLabel).includes('techniques.')) {
      parts.push(techLabel)
    } else if (technique) {
      parts.push(technique.charAt(0).toUpperCase() + technique.slice(1))
    }
  }
  const reciterName = options.reciterName || settings.reciter_name || settings.reciter
  if (reciterName) {
    const short = String(reciterName).replace(/^ar\./i, '').replace(/\./g, ' ')
    parts.push(short.charAt(0).toUpperCase() + short.slice(1))
  }
  const speed = Number(settings.playback_speed)
  if (Number.isFinite(speed) && speed > 0) {
    parts.push(`${speed}×`)
  }
  const reps = Number(settings.repetitions)
  if (Number.isFinite(reps) && reps > 0) {
    const repsLabel = formatRepetitionCountLabel(reps, t)
      || (t ? t('memorisation.postSession.recommendation.repetitionsSummary', { count: reps }) : '')
    if (repsLabel) parts.push(repsLabel)
  }
  return parts.filter(Boolean).join(' · ')
}

/**
 * Next surah in the adaptive beginner path:
 * Al-Fatiha → An-Nas, then Juz ʿAmma descending (114→78), then Al-Baqarah.
 * @param {number} chapterId
 * @returns {number|null}
 */
export function resolveNextSurahId(chapterId) {
  const id = Number(chapterId || 0)
  if (id === 1) return 114
  if (id >= 79 && id <= 114) return id - 1
  if (id === 78) return 2
  if (id >= 2 && id < 77) return id + 1
  return null
}

/**
 * Lightweight offline/guest fallback when the backend recommendation is unavailable.
 * Never invents a next surah automatically.
 */
export function buildLocalFallbackRecommendation(snapshot = {}) {
  const chapterId = Number(snapshot.chapterId || 0)
  const chapterName = String(snapshot.chapterName || '')
  const rangeStart = Number(snapshot.rangeStart || 0)
  const rangeEnd = Number(snapshot.rangeEnd || 0)
  const totalAyahs = Number(snapshot.totalAyahsInSurah || snapshot.surahAyahCount || 0)
  const completedAll = !!snapshot.completedAll
  const preferredSize = Math.max(1, Math.min(3, (rangeEnd - rangeStart + 1) || 3))

  if (!chapterId || !rangeStart || !rangeEnd) {
    return {
      id: null,
      type: RECOMMENDATION_TYPES.MANUAL_SELECTION,
      session_mode: 'manual',
      surah: null,
      ayah_range: null,
      reason_code: 'manual_fallback',
      reason: '',
      requires_confirmation: false,
      is_end_of_surah: false,
      next_surah: null,
      confirmation: null,
      settings: null,
    }
  }

  const surah = {
    id: chapterId,
    name: chapterName || `Surah ${chapterId}`,
    translated_name: chapterName || `Surah ${chapterId}`,
  }

  if (!completedAll && rangeStart && rangeEnd) {
    return {
      id: null,
      type: RECOMMENDATION_TYPES.RESUME,
      session_mode: 'revision',
      range_kind: 'revision',
      surah,
      ayah_range: {
        from: rangeStart,
        to: rangeEnd,
        count: Math.max(1, rangeEnd - rangeStart + 1),
      },
      reason_code: 'resume_incomplete_session',
      reason: '',
      requires_confirmation: true,
      is_end_of_surah: false,
      next_surah: null,
      confirmation: {
        title_key: 'reviewAgain',
        primary_action_key: 'startRevision',
        secondary_action_key: 'chooseSomethingElse',
      },
    }
  }

  if (totalAyahs && rangeEnd >= totalAyahs) {
    const nextId = resolveNextSurahId(chapterId)
    const nextRangeTo = Math.min(preferredSize, 3)
    return {
      id: null,
      type: nextId ? RECOMMENDATION_TYPES.NEXT_SURAH : RECOMMENDATION_TYPES.PLAN_COMPLETE,
      session_mode: nextId ? 'new_learning' : 'manual',
      range_kind: nextId ? 'new' : null,
      surah: nextId ? { id: nextId, name: '', translated_name: '' } : surah,
      completed_surah: surah,
      ayah_range: nextId ? { from: 1, to: nextRangeTo, count: nextRangeTo } : null,
      reason_code: nextId ? 'surah_completed' : 'learning_plan_complete',
      reason: '',
      requires_confirmation: !!nextId,
      is_end_of_surah: true,
      next_surah: nextId ? { id: nextId, name: '', translated_name: '' } : null,
      confirmation: nextId ? {
        title_key: 'continueNextSurah',
        primary_action_key: 'continueToNextSurah',
        secondary_action_key: 'chooseSomethingElse',
      } : null,
    }
  }

  const nextFrom = rangeEnd + 1
  const remaining = totalAyahs ? Math.max(0, totalAyahs - nextFrom + 1) : preferredSize
  const size = remaining > 0 ? Math.min(preferredSize, remaining) : preferredSize
  const nextTo = nextFrom + size - 1

  return {
    id: null,
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    range_kind: 'new',
    surah,
    ayah_range: {
      from: nextFrom,
      to: nextTo,
      count: size,
    },
    reason_code: 'continue_while_fresh',
    reason: '',
    requires_confirmation: false,
    is_end_of_surah: false,
    next_surah: null,
    confirmation: null,
    settings: {
      technique: 'talqin',
      playback_speed: 1,
      repetitions: 3,
    },
    primary_action_label_key: 'continueToAyat',
  }
}

/**
 * Optimistically reshape a recommendation so the success modal reacts immediately
 * to Confident / Needs more practice before the backend round-trip finishes.
 *
 * @param {object|null} recommendation
 * @param {'confident'|'needs_practice'} confidence
 * @param {object} [snapshot]
 * @returns {object|null}
 */
export function adaptRecommendationForConfidence(recommendation, confidence, snapshot = {}) {
  if (!recommendation || (confidence !== 'confident' && confidence !== 'needs_practice')) {
    return recommendation
  }

  const next = {
    ...recommendation,
    confidence_feedback: confidence,
  }
  const settings = { ...(recommendation.settings || {}) }
  const range = recommendation.ayah_range || null
  const snapshotStart = Number(snapshot.rangeStart || range?.from || 0)
  const snapshotEnd = Number(snapshot.rangeEnd || range?.to || snapshotStart)
  const totalAyahs = Number(
    snapshot.totalAyahsInSurah
    || snapshot.totalAyahs
    || snapshot.versesInSurah
    || 0
  )

  if (confidence === 'needs_practice') {
    const speed = Number(settings.playback_speed || 1)
    const reps = Number(settings.repetitions || 3)
    const baseRange = range || (snapshotStart
      ? {
        from: snapshotStart,
        to: Math.max(snapshotStart, snapshotEnd),
        count: Math.max(1, Math.max(snapshotStart, snapshotEnd) - snapshotStart + 1),
      }
      : null)
    const weakAyahs = collectWeakAyahTargets({
      quizView: snapshot.quizView || null,
      aiDetails: snapshot.aiDetails || null,
      recommendation,
      completion: snapshot.completion || null,
    })
    const focused = buildFocusedPracticeRange({
      weakAyahs,
      sessionFrom: snapshotStart || baseRange?.from,
      sessionTo: snapshotEnd || baseRange?.to,
      surahAyahCount: totalAyahs,
      max: 3,
    })
    return {
      ...next,
      type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
      session_mode: 'revision',
      range_kind: 'repeated',
      reason_code: 'confidence_needs_practice',
      user_reason: null,
      reason: '',
      balance_message: null,
      panel_title_key: 'revisionSetTitle',
      primary_action_label_key: 'repeatThisSession',
      ayah_range: focused
        ? {
          from: focused.from,
          to: focused.to,
          count: focused.count,
          focus_ayahs: focused.focusAyahs,
        }
        : baseRange,
      settings: {
        ...settings,
        technique: settings.technique || 'talqin',
        playback_speed: Math.min(0.75, Number.isFinite(speed) && speed > 0 ? speed : 1),
        repetitions: Math.max(4, Number.isFinite(reps) ? reps : 3),
      },
    }
  }

  // Confident — clear practice/hedging copy so the modal why stays aligned with the toggle.
  const existingReason = String(recommendation.user_reason || '').trim()
  const stalePracticeCopy = /selected Needs more practice|asked for more practice/i.test(existingReason)
  const hedgingCopy = /but used several memory prompts|used several memory prompts/i.test(existingReason)
  const clearReason = stalePracticeCopy || hedgingCopy
  const type = String(recommendation.type || '')
  const isTerminal = type === RECOMMENDATION_TYPES.PLAN_COMPLETE
    || type === RECOMMENDATION_TYPES.SURAH_COMPLETE
    || type === RECOMMENDATION_TYPES.MANUAL_SELECTION

  // Already a forward plan — keep the range; drop contradictory why copy.
  if (!isRepeatRecommendation(recommendation) && !isTerminal) {
    return {
      ...next,
      reason_code: clearReason
        ? 'confidence_confident'
        : (recommendation.reason_code || 'confidence_confident'),
      user_reason: clearReason ? null : (existingReason || null),
      reason: clearReason ? '' : String(recommendation.reason || ''),
      balance_message: null,
    }
  }

  const completedEnd = Math.max(snapshotEnd, Number(range?.to || 0))
  const nextFrom = completedEnd + 1
  const completedSurahId = Number(
    recommendation.completed_surah?.id
    || snapshot.chapterId
    || recommendation.surah?.id
    || 0
  )

  // Still inside the surah — advance a small next bite (never the rest of the surah).
  if (totalAyahs && nextFrom <= totalAyahs) {
    const remaining = totalAyahs - nextFrom + 1
    const size = Math.min(3, remaining)
    return {
      ...next,
      type: RECOMMENDATION_TYPES.CONTINUE,
      session_mode: 'new_learning',
      range_kind: 'new',
      reason_code: 'confidence_confident',
      user_reason: null,
      reason: '',
      balance_message: null,
      panel_title_key: 'nextSetTitle',
      primary_action_label_key: 'continueToAyat',
      surah: recommendation.surah || {
        id: completedSurahId,
        name: snapshot.chapterName || '',
        translated_name: snapshot.chapterName || '',
      },
      ayah_range: {
        from: nextFrom,
        to: nextFrom + size - 1,
        count: size,
      },
      is_end_of_surah: false,
      requires_confirmation: false,
      settings: {
        ...settings,
        technique: settings.technique || 'focus',
        complementary_technique: settings.complementary_technique || 'anchor',
        playback_speed: Math.max(1, Number(settings.playback_speed || 1)),
        repetitions: Math.min(3, Math.max(2, Number(settings.repetitions || 3))),
      },
    }
  }

  // Finished the surah — promote to the next surah in the beginner path.
  if ((totalAyahs && nextFrom > totalAyahs) || isTerminal) {
    const nextId = resolveNextSurahId(completedSurahId)
    if (nextId) {
      // Keep the opening bite small — never dump a whole surah.
      const openingSize = Math.min(3, 3)
      return {
        ...next,
        type: RECOMMENDATION_TYPES.NEXT_SURAH,
        session_mode: 'new_learning',
        range_kind: 'new',
        reason_code: 'surah_completed',
        user_reason: null,
        reason: '',
        balance_message: null,
        panel_title_key: 'nextSurahTitle',
        primary_action_label_key: 'continueToNextSurah',
        completed_surah: recommendation.completed_surah || {
          id: completedSurahId,
          name: snapshot.chapterName || recommendation.surah?.name || '',
          translated_name: snapshot.chapterName || recommendation.surah?.name || '',
        },
        surah: { id: nextId, name: '', translated_name: '' },
        next_surah: { id: nextId, name: '', translated_name: '' },
        ayah_range: { from: 1, to: openingSize, count: openingSize },
        is_end_of_surah: true,
        requires_confirmation: true,
        settings: {
          ...settings,
          technique: settings.technique || 'focus',
          complementary_technique: settings.complementary_technique || 'anchor',
          playback_speed: Math.max(1, Number(settings.playback_speed || 1)),
          repetitions: Math.min(3, Math.max(2, Number(settings.repetitions || 3))),
        },
      }
    }
  }

  return {
    ...next,
    reason_code: 'confidence_confident',
    user_reason: null,
    reason: '',
    balance_message: null,
  }
}

/**
 * Optimistically reshape the plan from an AI Recite outcome.
 * @param {object|null} recommendation
 * @param {'strong'|'mixed'|'weak'} result
 * @param {object} [snapshot]
 * @returns {object|null}
 */
export function adaptRecommendationForAiAssessment(recommendation, result, snapshot = {}) {
  if (!recommendation || !['strong', 'mixed', 'weak'].includes(result)) {
    return recommendation
  }

  const snap = {
    ...snapshot,
    aiDetails: snapshot.aiDetails || {
      outcome: result,
      weakAyahs: Array.isArray(snapshot.weakAyahs)
        ? snapshot.weakAyahs
        : (Array.isArray(snapshot.weak_ayahs) ? snapshot.weak_ayahs : []),
    },
  }

  if (result === 'strong') {
    return adaptRecommendationForConfidence(recommendation, 'confident', snap)
  }
  if (result === 'weak') {
    return adaptRecommendationForConfidence(recommendation, 'needs_practice', snap)
  }

  const confidence = recommendation.confidence_feedback
  if (confidence === 'confident') {
    return adaptRecommendationForConfidence(recommendation, 'confident', snap)
  }
  return adaptRecommendationForConfidence(recommendation, 'needs_practice', snap)
}

/**
 * Narrow a practice range around weak ayahs (+1 neighbor), hard-capped at max.
 *
 * @param {{
 *   weakAyahs?: number[],
 *   sessionFrom?: number,
 *   sessionTo?: number,
 *   surahAyahCount?: number,
 *   max?: number,
 * }} input
 * @returns {{ from: number, to: number, count: number, focusAyahs: number[] }|null}
 */
export function buildFocusedPracticeRange(input = {}) {
  const max = Math.max(1, Number(input.max) || 3)
  const boundFrom = Number(input.sessionFrom || 0)
  const boundTo = Number(input.sessionTo || 0)
  const surahMax = Number(input.surahAyahCount || 0)
  const weak = [...new Set(
    (Array.isArray(input.weakAyahs) ? input.weakAyahs : [])
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
  )].sort((a, b) => a - b)

  const floor = boundFrom > 0 ? boundFrom : 1
  const ceiling = boundTo > 0
    ? boundTo
    : (surahMax > 0 ? surahMax : (weak.length ? Math.max(...weak) + 1 : 0))

  if (!weak.length) {
    if (boundFrom > 0 && boundTo >= boundFrom) {
      const to = Math.min(boundTo, boundFrom + max - 1)
      return {
        from: boundFrom,
        to,
        count: to - boundFrom + 1,
        focusAyahs: [],
      }
    }
    return null
  }

  if (!ceiling || ceiling < floor) return null

  let from = Math.max(floor, Math.min(...weak) - 1)
  let to = Math.min(ceiling, Math.max(...weak) + 1)

  if (to - from + 1 > max) {
    // Prefer covering the earliest weak ayah with a leading neighbor.
    from = Math.max(floor, Math.min(...weak) - 1)
    to = Math.min(ceiling, from + max - 1)
    // If later weak ayahs fall outside, shift right to cover the densest weak cluster.
    const uncovered = weak.filter((w) => w > to)
    if (uncovered.length) {
      const last = Math.max(...weak)
      to = Math.min(ceiling, last + 1)
      from = Math.max(floor, to - max + 1)
    }
  }

  if (to < from) return null
  const focusAyahs = weak.filter((w) => w >= from && w <= to)
  return {
    from,
    to,
    count: to - from + 1,
    focusAyahs,
  }
}

/**
 * Friendly practice-time estimate from workload + setup.
 * @param {{
 *   wordCount?: number,
 *   ayahCount?: number,
 *   workloadScore?: number,
 *   settings?: object,
 * }} input
 * @returns {number}
 */
export function estimatePracticeMinutes(input = {}) {
  const ayahCount = Math.max(1, Number(input.ayahCount) || 1)
  const words = Number(input.wordCount)
    || Number(input.workloadScore)
    || (ayahCount * 12)
  const settings = input.settings && typeof input.settings === 'object' ? input.settings : {}
  const reps = Math.max(1, Number(settings.repetitions) || 3)
  const speed = Math.max(0.5, Number(settings.playback_speed) || 1)
  let minutes = Math.round((words * reps) / (15 * speed))

  const technique = String(settings.technique || '').toLowerCase()
  if (settings.blur_enabled || technique === 'blur') minutes += 2
  if (settings.talqin_enabled || technique === 'talqin') minutes += 2
  if (settings.chaining_enabled || technique === 'chaining') minutes += 1
  if (settings.anchor_mode_enabled || technique === 'anchor') minutes += 1
  if (settings.focus_enabled || technique === 'focus') minutes += 1

  return Math.max(4, Math.min(20, minutes || 6))
}

/**
 * Collect weak ayah numbers from quiz, AI, and session replay signals.
 */
export function collectWeakAyahTargets({
  quizView = null,
  aiDetails = null,
  recommendation = null,
  completion = null,
} = {}) {
  const fromQuiz = Array.isArray(quizView?.weakAyahs) ? quizView.weakAyahs : []
  const fromAi = Array.isArray(aiDetails?.weakAyahs)
    ? aiDetails.weakAyahs
    : (Array.isArray(aiDetails?.weak_ayahs) ? aiDetails.weak_ayahs : [])
  const fromRecAi = Array.isArray(recommendation?.ai_assessment?.weak_ayahs)
    ? recommendation.ai_assessment.weak_ayahs
    : []
  const fromReplay = Array.isArray(completion?.replay_heavy_ayahs)
    ? completion.replay_heavy_ayahs
    : []
  return [...new Set(
    [...fromQuiz, ...fromAi, ...fromRecAi, ...fromReplay]
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
  )].sort((a, b) => a - b)
}

/**
 * Apply a focused range onto a recommendation when reinforcing/repeating.
 */
export function applyFocusedRangeToRecommendation(recommendation, focusedRange) {
  if (!recommendation || !focusedRange?.from || !focusedRange?.to) return recommendation
  return {
    ...recommendation,
    ayah_range: {
      ...(recommendation.ayah_range || {}),
      from: focusedRange.from,
      to: focusedRange.to,
      count: focusedRange.count || (focusedRange.to - focusedRange.from + 1),
      focus_ayahs: Array.isArray(focusedRange.focusAyahs) ? focusedRange.focusAyahs : [],
    },
  }
}

/**
 * Build a structured, personal practice plan view-model for the step-3 card.
 *
 * @param {{
 *   recommendation?: object|null,
 *   snapshot?: object,
 *   completion?: object|null,
 *   aiDetails?: object|null,
 *   quizView?: object|null,
 *   confidence?: string|null,
 *   isRepeat?: boolean,
 *   t?: Function|null,
 * }} input
 */
export function buildPersonalPracticePlan(input = {}) {
  const recommendation = input.recommendation && typeof input.recommendation === 'object'
    ? input.recommendation
    : null
  if (!recommendation) return null

  const t = typeof input.t === 'function' ? input.t : null
  const translate = (key, fallback, params) => {
    if (!t) return fallback
    const value = t(`memorisation.postSession.recommendation.${key}`, params)
    if (!value || String(value).includes(`recommendation.${key}`)) return fallback
    return value
  }

  const snapshot = input.snapshot && typeof input.snapshot === 'object' ? input.snapshot : {}
  const settings = recommendation.settings && typeof recommendation.settings === 'object'
    ? recommendation.settings
    : {}
  const isRepeat = !!input.isRepeat || isRepeatRecommendation(recommendation)
  const hasAi = !!(input.aiDetails && (input.aiDetails.outcome || input.aiDetails.summaryLine || input.aiDetails.outcomeLabel))
  const hasQuiz = !!input.quizView
  const source = hasAi && hasQuiz
    ? 'combined'
    : hasAi
      ? 'ai'
      : hasQuiz
        ? 'quiz'
        : 'session'

  const weakAyahs = collectWeakAyahTargets({
    quizView: input.quizView,
    aiDetails: input.aiDetails,
    recommendation,
    completion: input.completion,
  })

  const sessionFrom = Number(
    snapshot.rangeStart
    || recommendation.ayah_range?.from
    || 0,
  )
  const sessionTo = Number(
    snapshot.rangeEnd
    || recommendation.ayah_range?.to
    || sessionFrom,
  )

  const liveRange = recommendation.ayah_range || {}
  let rangeFrom = Number(liveRange.from || 0)
  let rangeTo = Number(liveRange.to || rangeFrom)
  let focusAyahs = Array.isArray(liveRange.focus_ayahs)
    ? liveRange.focus_ayahs.map(Number).filter(Boolean)
    : []

  if (isRepeat && weakAyahs.length) {
    const focused = buildFocusedPracticeRange({
      weakAyahs,
      sessionFrom: sessionFrom || rangeFrom,
      sessionTo: sessionTo || rangeTo,
      surahAyahCount: Number(snapshot.totalAyahsInSurah || recommendation.surah?.ayah_count || 0),
      max: 3,
    })
    if (focused) {
      rangeFrom = focused.from
      rangeTo = focused.to
      focusAyahs = focused.focusAyahs
    }
  } else if (!focusAyahs.length && weakAyahs.length && rangeFrom > 0) {
    focusAyahs = weakAyahs.filter((w) => w >= rangeFrom && w <= rangeTo)
  }

  const ayahCount = rangeFrom > 0 && rangeTo >= rangeFrom
    ? (rangeTo - rangeFrom + 1)
    : Number(liveRange.count || recommendation.workload?.ayah_count || 1)

  const minutes = estimatePracticeMinutes({
    wordCount: recommendation.workload?.word_count,
    workloadScore: recommendation.workload?.score,
    ayahCount,
    settings,
  })

  const insight = buildCombinedCheckInsight({
    aiDetails: input.aiDetails,
    quizView: input.quizView,
    recommendation: {
      ...recommendation,
      ayah_range: rangeFrom > 0
        ? { from: rangeFrom, to: rangeTo, count: ayahCount, focus_ayahs: focusAyahs }
        : recommendation.ayah_range,
    },
    confidence: input.confidence,
    isRepeat,
    t,
  })

  const personalWhy = insight.summary
    || translate('evidenceFromSessionAndConfidence', 'Based on your session and confidence.')

  const techniques = []
  const primaryId = String(settings.technique || '').toLowerCase()
  let primaryLabel = ''
  let primaryHow = ''
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(primaryId)) {
    primaryLabel = getTechniqueShortLabel(primaryId, t) || primaryId
    primaryHow = getTechniqueDescription(primaryId, t)
      || translate(`techniques.${primaryId}`, '')
    techniques.push({
      id: primaryId,
      role: 'primary',
      label: primaryLabel,
      how: primaryHow,
    })
  }
  const complementaryId = String(settings.complementary_technique || '').toLowerCase()
  let complementaryLabel = ''
  if (
    ['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(complementaryId)
    && complementaryId !== primaryId
  ) {
    complementaryLabel = getTechniqueShortLabel(complementaryId, t) || complementaryId
    techniques.push({
      id: complementaryId,
      role: 'complementary',
      label: complementaryLabel,
      how: getTechniqueDescription(complementaryId, t)
        || translate(`techniques.${complementaryId}`, ''),
    })
  }

  const practiceApproach = primaryLabel
    ? {
      id: primaryId,
      title: primaryLabel,
      how: primaryHow,
      with: complementaryLabel
        ? translate('planDetail.alsoWith', 'Also: {technique}', { technique: complementaryLabel })
        : '',
      complementaryId: complementaryLabel ? complementaryId : '',
    }
    : null

  const checkSources = []
  if (hasAi) checkSources.push('ai')
  if (hasQuiz) checkSources.push('quiz')
  const check = {
    mode: 'memory',
    status: checkSources.length ? 'done' : 'pending',
    sources: checkSources,
  }

  // Beginner setup: speed + reps only. Technique copy lives in practiceApproach.
  const setup = []
  const speed = Number(settings.playback_speed)
  if (Number.isFinite(speed) && speed > 0) {
    setup.push({
      key: 'speed',
      label: translate('speedPill', `${speed}× speed`, { speed }),
    })
  }
  const reps = Number(settings.repetitions)
  if (Number.isFinite(reps) && reps > 0) {
    setup.push({
      key: 'reps',
      label: formatRepetitionCountLabel(reps, t)
        || translate(
          reps === 1 ? 'repetitionsSummaryOne' : 'repetitionsSummaryOther',
          `${reps} repetition${reps === 1 ? '' : 's'}`,
          { count: reps },
        ),
    })
  }

  const evidence = []
  focusAyahs.slice(0, 3).forEach((ayah) => {
    evidence.push({
      key: `ayah-${ayah}`,
      label: translate('planDetail.focusVerse', `Verse {ayah}`, { ayah }),
    })
  })
  if (hasAi && input.aiDetails?.outcome) {
    evidence.push({
      key: 'ai',
      label: String(input.aiDetails.outcomeLabel || input.aiDetails.outcome),
    })
  }
  const colorCounts = input.aiDetails?.colorCounts
    || recommendation?.ai_assessment?.color_counts
    || null
  if (colorCounts && typeof colorCounts === 'object') {
    const hard = Number(colorCounts.red || 0) + Number(colorCounts.black || 0)
    const soft = Number(colorCounts.amber || 0)
    if (hard > 0 || soft > 0) {
      evidence.push({
        key: 'colours',
        label: translate(
          'planDetail.colourMix',
          '{green} green · {amber} amber · {red} red · {black} black',
          {
            green: Number(colorCounts.green || 0),
            amber: soft,
            red: Number(colorCounts.red || 0),
            black: Number(colorCounts.black || 0),
          },
        ),
      })
    }
  }
  if (hasQuiz && input.quizView?.objectiveBand) {
    const band = String(input.quizView.objectiveBand).toLowerCase()
    evidence.push({
      key: 'quiz',
      label: band === 'strong'
        ? translate('checkAnswerQuizStrong', 'Looking good')
        : band === 'weak'
          ? translate('checkAnswerQuizWeak', 'Needs practice')
          : translate('checkAnswerQuizMixed', 'Okay'),
    })
  }

  const surahName = recommendation.surah?.translated_name
    || recommendation.surah?.name
    || snapshot.chapterName
    || ''
  const rangeLabel = rangeFrom > 0 && rangeTo >= rangeFrom
    ? (rangeFrom === rangeTo
      ? translate('planDetail.singleAyah', `Ayah {ayah}`, { ayah: rangeFrom })
      : translate('planDetail.ayahRange', `Ayahs {start}–{end}`, { start: rangeFrom, end: rangeTo }))
    : ''

  const focusLabel = focusAyahs.length === 1
    ? translate('planDetail.focusOne', 'Focus on ayah {ayah}', { ayah: focusAyahs[0] })
    : focusAyahs.length > 1
      ? translate('planDetail.focusMany', 'Focus on ayahs {ayahs}', {
        ayahs: focusAyahs.join(', '),
      })
      : ''

  return {
    source,
    headline: translate('planDetail.headline', 'Your practice plan'),
    personalWhy,
    range: {
      from: rangeFrom,
      to: rangeTo,
      count: ayahCount,
      focusAyahs,
      surahName,
      label: [surahName, rangeLabel].filter(Boolean).join(' · '),
      focusLabel,
    },
    techniques,
    practiceApproach,
    check,
    setup: setup.slice(0, 5),
    time: {
      minutes,
      label: translate('planDetail.aboutMinutes', 'About {minutes} minutes', { minutes }),
    },
    evidence: evidence.slice(0, 5),
    estimated_minutes: minutes,
    focus_ayahs: focusAyahs,
  }
}

/**
 * Merge personal plan fields onto a recommendation for UI + persistence.
 */
export function applyPersonalPlanToRecommendation(recommendation, plan) {
  if (!recommendation || !plan) return recommendation
  const next = { ...recommendation, plan_detail: plan }
  if (plan.range?.from && plan.range?.to && isRepeatRecommendation(recommendation)) {
    next.ayah_range = {
      ...(recommendation.ayah_range || {}),
      from: plan.range.from,
      to: plan.range.to,
      count: plan.range.count,
      focus_ayahs: plan.range.focusAyahs || [],
    }
  }
  return next
}

/**
 * Hard cap recommended ayah ranges at 3 for beginner-friendly sessions.
 * @param {object} recommendation
 * @param {number} [max=3]
 */
export function clampRecommendationRange(recommendation, max = 3) {
  if (!recommendation || typeof recommendation !== 'object') return recommendation
  const range = recommendation.ayah_range
  if (!range) return recommendation
  const from = Number(range.from || 0)
  const to = Number(range.to || 0)
  if (!from || !to || to < from) return recommendation
  const limit = Math.max(1, Number(max) || 3)
  if ((to - from + 1) <= limit) {
    return {
      ...recommendation,
      ayah_range: {
        ...range,
        from,
        to,
        count: to - from + 1,
        focus_ayahs: Array.isArray(range.focus_ayahs) ? range.focus_ayahs : undefined,
      },
    }
  }
  const cappedTo = from + limit - 1
  const focus = Array.isArray(range.focus_ayahs)
    ? range.focus_ayahs.map(Number).filter((n) => n >= from && n <= cappedTo)
    : undefined
  return {
    ...recommendation,
    ayah_range: {
      ...range,
      from,
      to: cappedTo,
      count: limit,
      focus_ayahs: focus,
    },
  }
}

/**
 * Merge an adaptive-check policy recommendation into the live post-session plan.
 * Uses deterministic policy settings; does not invent Qur'an content.
 *
 * @param {object|null} recommendation
 * @param {object|null} policyRecommendation from RecommendationPolicyService
 * @param {object} [snapshot]
 */
export function adaptRecommendationForAdaptiveAssessment(recommendation, policyRecommendation, snapshot = {}) {
  if (!recommendation) return recommendation
  if (!policyRecommendation || typeof policyRecommendation !== 'object') {
    return clampRecommendationRange(recommendation, 3)
  }

  const goal = String(policyRecommendation.goal || '').toLowerCase()
  const objective = String(snapshot.objectiveBand || '').toLowerCase()
  const snapFrom = Number(snapshot.rangeStart || 0)
  const snapTo = Number(snapshot.rangeEnd || snapFrom)
  const completedRange = snapFrom > 0 && snapTo >= snapFrom
    ? {
      from: snapFrom,
      to: Math.min(snapTo, snapFrom + 2),
      count: Math.min(3, snapTo - snapFrom + 1),
    }
    : null

  const weakAyahs = collectWeakAyahTargets({
    quizView: snapshot.quizView || {
      weakAyahs: Array.isArray(policyRecommendation.weak_ayahs)
        ? policyRecommendation.weak_ayahs
        : (Array.isArray(snapshot.weakAyahs) ? snapshot.weakAyahs : []),
    },
    aiDetails: snapshot.aiDetails || null,
    recommendation,
    completion: snapshot.completion || null,
  })
  const focusedRange = buildFocusedPracticeRange({
    weakAyahs,
    sessionFrom: snapFrom,
    sessionTo: snapTo,
    surahAyahCount: Number(snapshot.totalAyahsInSurah || 0),
    max: 3,
  })

  const snapWithQuiz = {
    ...snapshot,
    quizView: snapshot.quizView || { weakAyahs },
    aiDetails: snapshot.aiDetails || null,
    completion: snapshot.completion || null,
  }

  let next = { ...recommendation }

  // Confidence must not independently force progression when objective is weak.
  if (goal === 'advance' || (objective === 'strong' && goal !== 'reinforce' && goal !== 'repeat' && goal !== 'review')) {
    next = adaptRecommendationForConfidence(recommendation, 'confident', snapWithQuiz)
  } else if (goal === 'resume') {
    next = {
      ...recommendation,
      type: RECOMMENDATION_TYPES.RESUME,
      session_mode: 'revision',
      range_kind: 'revision',
      ayah_range: focusedRange || completedRange || recommendation.ayah_range,
    }
  } else {
    // Reinforce / repeat / review: focus on weak ayahs (+ neighbor), max 3.
    next = adaptRecommendationForConfidence(recommendation, 'needs_practice', snapWithQuiz)
    const range = focusedRange || completedRange
    if (range) {
      next = {
        ...next,
        type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
        session_mode: 'revision',
        range_kind: 'repeated',
        ayah_range: {
          from: range.from,
          to: range.to,
          count: range.count,
          focus_ayahs: range.focusAyahs || weakAyahs,
        },
      }
    }
  }

  next = {
    ...next,
    id: recommendation.id,
    source_session_id: recommendation.source_session_id,
    settings: {
      ...(next.settings || {}),
      ...(policyRecommendation.settings || {}),
    },
    evidence_codes: policyRecommendation.evidence_codes || next.evidence_codes,
    reason_code: policyRecommendation.reason_code || next.reason_code,
    user_reason: null,
    balance_message: null,
    primary_action_label_key: policyRecommendation.primary_action_label_key || next.primary_action_label_key,
    adaptive_assessment: snapshot.adaptiveSnapshot || null,
  }

  return clampRecommendationRange(next, 3)
}

/**
 * Build one plan-aligned insight from AI Recite + Memory quiz + confidence.
 * Confidence and plan kind win over leftover check tips so Strong ≠ "repeat".
 */
export function buildCombinedCheckInsight({
  aiDetails = null,
  quizView = null,
  recommendation = null,
  confidence = null,
  isRepeat = false,
  t = null,
} = {}) {
  const translate = (key, fallback, params) => {
    if (!t) return fallback
    const value = t(`memorisation.postSession.recommendation.${key}`, params)
    if (!value || String(value).includes(`recommendation.${key}`)) return fallback
    return value
  }

  const range = recommendation?.ayah_range || {}
  const planFrom = Number(range.from || 0)
  const planTo = Number(range.to || planFrom)
  const inPlan = (ayah) => {
    const n = Number(ayah)
    if (!Number.isFinite(n) || planFrom <= 0) return false
    return n >= planFrom && n <= planTo
  }

  const answers = []

  if (aiDetails && (aiDetails.outcome || aiDetails.summaryLine || aiDetails.outcomeLabel)) {
    answers.push({
      key: 'ai',
      source: 'ai',
      tone: String(aiDetails.outcome || 'mixed').toLowerCase(),
      label: String(aiDetails.outcomeLabel || translate('aiOutcomeMixed', 'Okay')).trim(),
      detail: String(aiDetails.summaryLine || '').trim(),
    })
  }

  if (quizView) {
    const band = String(quizView.objectiveBand || 'mixed').toLowerCase()
    const label = band === 'strong'
      ? translate('checkAnswerQuizStrong', 'Looking good')
      : band === 'weak'
        ? translate('checkAnswerQuizWeak', 'Needs practice')
        : translate('checkAnswerQuizMixed', 'Okay')
    const detail = String(quizView.why || quizView.explanation || quizView.headline || '').trim()
    answers.push({
      key: 'quiz',
      source: 'quiz',
      tone: band === 'developing' ? 'weak' : band,
      label,
      detail,
    })
  }

  const aiTone = String(aiDetails?.outcome || '').toLowerCase()
  const quizTone = String(quizView?.objectiveBand || '').toLowerCase()
  const aiWeak = Array.isArray(aiDetails?.weakAyahs) ? aiDetails.weakAyahs.map(Number).filter(Boolean) : []
  const quizWeak = Array.isArray(quizView?.weakAyahs) ? quizView.weakAyahs.map(Number).filter(Boolean) : []
  const planWeak = [...new Set([...aiWeak, ...quizWeak].filter(inPlan))]
  const checksNeedSupport = aiTone === 'weak'
    || quizTone === 'weak'
    || planWeak.length > 0
  const checksLookStrong = (aiTone === 'strong' || !aiTone)
    && (quizTone === 'strong' || !quizTone)
    && !planWeak.length
    && (answers.length > 0)

  const hasAi = answers.some((a) => a.source === 'ai')
  const hasQuiz = answers.some((a) => a.source === 'quiz')
  const both = hasAi && hasQuiz

  const sourceLabel = both
    ? translate('combinedFromBothChecks', 'From your checks')
    : hasAi
      ? translate('combinedFromAi', 'From your voice check')
      : hasQuiz
        ? translate('combinedFromQuiz', 'From your quiz')
        : translate('combinedFromSession', 'From this session')

  let summary = ''
  if (isRepeat) {
    // Prefer check evidence over stale confidence feedback.
    if (planWeak.length === 1) {
      summary = translate(
        'combinedRepeatWeakAyah',
        `Verse {ayah} still feels tricky. We will practise these verses again.`,
        { ayah: planWeak[0] },
      )
    } else if (planWeak.length > 1 || checksNeedSupport) {
      summary = translate(
        'combinedRepeatWeakAyahs',
        'Some verses still need help. We will practise this set again.',
        { count: Math.max(planWeak.length, 2) },
      )
    } else if (confidence === 'needs_practice') {
      summary = translate(
        'reasons.confidenceNeedsPractice',
        'You asked for more practice, so we will go over these verses again more slowly.',
      )
    } else if (checksLookStrong) {
      summary = translate(
        'combinedRepeatDespiteStrong',
        'Your check looked good — we are still giving these verses one more calm pass.',
      )
    } else {
      summary = translate(
        'combinedRepeatFallback',
        'We will practise these verses again with a little more help.',
      )
    }
  } else if (checksNeedSupport) {
    if (planWeak.length === 1) {
      summary = translate(
        'combinedRepeatWeakAyah',
        `Verse {ayah} still feels tricky. We will practise these verses again.`,
        { ayah: planWeak[0] },
      )
    } else if (planWeak.length > 1) {
      summary = translate(
        'combinedRepeatWeakAyahs',
        'Some verses still need help. We will practise this set again.',
        { count: planWeak.length },
      )
    } else {
      summary = translate(
        'combinedContinueNeedsSupport',
        'A few spots still need help. This plan adds a little more support.',
      )
    }
  } else if (confidence === 'confident') {
    summary = translate(
      'reasons.confidenceConfident',
      'You feel ready — we will move on while these verses are still fresh.',
    )
  } else if (both && checksLookStrong) {
    summary = translate(
      'combinedContinueBoth',
      'Your checks look ready. Next verses while this still feels fresh.',
    )
  } else if ((hasAi || hasQuiz) && checksLookStrong) {
    summary = translate(
      'combinedContinueOne',
      'Nice work. Next verses while this still feels fresh.',
    )
  } else if (hasAi || hasQuiz) {
    summary = translate(
      'combinedContinueFallback',
      'Next verses while this still feels fresh.',
    )
  } else {
    summary = translate(
      'combinedContinueFallback',
      'Next verses while this still feels fresh.',
    )
  }

  return {
    answers,
    sourceLabel,
    summary: String(summary || '').trim(),
    hasChecks: answers.length > 0,
    both,
  }
}


