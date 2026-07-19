/**
 * Frontend helpers for the personalised next-session recommendation flow.
 * Reason codes stay internal; UI copy is resolved through i18n keys.
 */

export const RECOMMENDATION_TYPES = Object.freeze({
  CONTINUE: 'continue',
  REVISION: 'revision',
  COMPLETE_SURAH: 'complete_surah',
  NEXT_SURAH: 'next_surah',
  RESUME: 'resume',
  MANUAL_SELECTION: 'manual_selection',
  NO_RECOMMENDATION: 'no_recommendation',
})

const REASON_I18N_KEYS = Object.freeze({
  strong_previous_performance: 'reasons.strongPreviousPerformance',
  continue_current_surah: 'reasons.continueCurrentSurah',
  revision_required: 'reasons.revisionRequired',
  difficult_ayah_detected: 'reasons.difficultAyahDetected',
  complete_remaining_ayat: 'reasons.completeRemainingAyat',
  surah_completed: 'reasons.surahCompleted',
  resume_incomplete_session: 'reasons.resumeIncompleteSession',
  reinforce_recent_range: 'reasons.reinforceRecentRange',
  learning_plan_complete: 'reasons.learningPlanComplete',
  manual_fallback: 'reasons.manualFallback',
})

export function isActionableRecommendation(recommendation) {
  if (!recommendation || typeof recommendation !== 'object') return false
  const type = String(recommendation.type || '')
  return ![
    RECOMMENDATION_TYPES.MANUAL_SELECTION,
    RECOMMENDATION_TYPES.NO_RECOMMENDATION,
  ].includes(type) && !!(recommendation.surah || recommendation.next_surah)
}

export function recommendationPrimaryActionKey(recommendation) {
  const type = String(recommendation?.type || '')
  if (type === RECOMMENDATION_TYPES.NEXT_SURAH) return 'continueToNextSurah'
  if (type === RECOMMENDATION_TYPES.REVISION || type === RECOMMENDATION_TYPES.RESUME) {
    return 'startRecommendedRevision'
  }
  return 'startRecommendedNextSession'
}

export function recommendationModeLabelKey(recommendation) {
  const mode = String(recommendation?.session_mode || '')
  if (mode === 'revision' || recommendation?.type === RECOMMENDATION_TYPES.REVISION || recommendation?.type === RECOMMENDATION_TYPES.RESUME) {
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
    })
    if (translated && translated !== `${prefix}.${keySuffix}`) return translated
  }

  return String(recommendation.reason || '').trim()
}

export function formatAyahRangeLabel(range, t) {
  if (!range || !range.from) return ''
  const from = Number(range.from)
  const to = Number(range.to || from)
  if (from === to) {
    return t('memorisation.postSession.recommendation.singleAyah', { ayah: from })
  }
  return t('memorisation.postSession.recommendation.ayahRange', { start: from, end: to })
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
    const nextId = chapterId < 114 ? chapterId + 1 : null
    const nextRangeTo = 4
    return {
      id: null,
      type: nextId
        ? RECOMMENDATION_TYPES.NEXT_SURAH
        : RECOMMENDATION_TYPES.MANUAL_SELECTION,
      session_mode: nextId ? 'new_learning' : 'manual',
      surah: nextId
        ? { id: nextId, name: '', translated_name: '' }
        : surah,
      completed_surah: { ...surah },
      ayah_range: nextId
        ? { from: 1, to: nextRangeTo, count: nextRangeTo }
        : null,
      reason_code: nextId ? 'surah_completed' : 'learning_plan_complete',
      reason: '',
      requires_confirmation: !!nextId,
      is_end_of_surah: true,
      next_surah: nextId
        ? { id: nextId, name: '', translated_name: '' }
        : null,
      confirmation: nextId
        ? {
          title_key: 'continueNextSurah',
          primary_action_key: 'continueToNextSurah',
          secondary_action_key: 'chooseSomethingElse',
        }
        : null,
    }
  }

  const preferred = Math.min(4, Math.max(3, rangeEnd - rangeStart + 1 || 4))
  const nextFrom = rangeEnd + 1
  let nextTo = nextFrom + preferred - 1
  if (totalAyahs) {
    nextTo = Math.min(nextTo, totalAyahs)
  }
  const count = Math.max(1, nextTo - nextFrom + 1)
  const completing = totalAyahs > 0 && nextTo >= totalAyahs

  return {
    id: null,
    type: completing ? RECOMMENDATION_TYPES.COMPLETE_SURAH : RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    surah,
    ayah_range: { from: nextFrom, to: nextTo, count },
    reason_code: completing ? 'complete_remaining_ayat' : 'continue_current_surah',
    reason: '',
    requires_confirmation: true,
    is_end_of_surah: false,
    next_surah: null,
    confirmation: {
      title_key: 'continueNextAyat',
      primary_action_key: 'startSession',
      secondary_action_key: 'chooseSomethingElse',
    },
  }
}
