/**
 * Frontend helpers for the personalised next-session recommendation flow.
 * Reason codes stay internal; UI copy is resolved through i18n keys.
 */

import { getTechniqueShortLabel } from '../techniques/techniqueDisplay.js'
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
  const preferredSize = Math.max(3, Math.min(4, (rangeEnd - rangeStart + 1) || 3))

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
    const nextRangeTo = Math.min(preferredSize, 4)
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
      ayah_range: range || (snapshotStart
        ? {
          from: snapshotStart,
          to: Math.max(snapshotStart, snapshotEnd),
          count: Math.max(1, Math.max(snapshotStart, snapshotEnd) - snapshotStart + 1),
        }
        : null),
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
      const openingSize = Math.min(3, 4)
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

  if (result === 'strong') {
    return adaptRecommendationForConfidence(recommendation, 'confident', snapshot)
  }
  if (result === 'weak') {
    return adaptRecommendationForConfidence(recommendation, 'needs_practice', snapshot)
  }

  const confidence = recommendation.confidence_feedback
  if (confidence === 'confident') {
    return adaptRecommendationForConfidence(recommendation, 'confident', snapshot)
  }
  return adaptRecommendationForConfidence(recommendation, 'needs_practice', snapshot)
}
