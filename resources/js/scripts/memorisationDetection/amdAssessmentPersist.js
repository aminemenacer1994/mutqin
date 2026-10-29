/**
 * Foreign keys on assessment submit must belong to the current learner context.
 * Dashboard / teacher-task recite runs outside an active memorisation session — do
 * not send stale session or recommendation ids (Laravel returns 422).
 *
 * @param {{
 *   amdEntrySource?: string|null,
 *   amdRecommendationId?: number|string|null,
 *   backendSessionId?: number|string|null,
 *   sessionStatus?: string|null,
 * }} [options]
 * @returns {{ user_session_id?: number, session_recommendation_id?: number }}
 */
export function resolveAmdAssessmentForeignKeys(options = {}) {
  const entry = String(options.amdEntrySource || '')
  const omitSessionLinks = entry === 'dashboard-review' || entry === 'workspace-ai-recite'
  const out = {}

  if (!omitSessionLinks) {
    const sessionId = Number(options.backendSessionId || 0)
    const status = String(options.sessionStatus || '').toLowerCase()
    const sessionOpen = !status || status === 'active' || status === 'paused'
    if (sessionId > 0 && sessionOpen) out.user_session_id = sessionId

    const recommendationId = Number(options.amdRecommendationId || 0)
    if (recommendationId > 0) out.session_recommendation_id = recommendationId
  }

  return out
}

/**
 * @param {unknown} error
 * @returns {string}
 */
export function firstLaravelValidationMessage(error) {
  const bag = error?.response?.data?.errors
  if (bag && typeof bag === 'object') {
    for (const value of Object.values(bag)) {
      const message = Array.isArray(value) ? value.find(Boolean) : value
      if (message) return String(message).trim()
    }
  }
  return String(error?.response?.data?.message || '').trim()
}

/**
 * Teacher AI-recite tasks must submit the assignment range, not a partial target list.
 *
 * @param {{
 *   assignmentRecipientId?: number|string|null,
 *   chapterId?: number|string|null,
 *   rangeStart?: number|string|null,
 *   rangeEnd?: number|string|null,
 *   fallbackSurah?: number|string|null,
 *   fallbackStartAyah?: number|string|null,
 *   fallbackEndAyah?: number|string|null,
 * }} [options]
 * @returns {{ surah_number: number, start_ayah: number, end_ayah: number }}
 */
export function resolveTeacherTaskAssessmentRange(options = {}) {
  const recipientId = Number(options.assignmentRecipientId || 0)
  const fallbackStart = Math.max(1, Number(options.fallbackStartAyah || 1))
  const fallbackEnd = Math.max(
    fallbackStart,
    Number(options.fallbackEndAyah || options.fallbackStartAyah || fallbackStart),
  )
  const fallbackSurah = Math.max(1, Number(options.fallbackSurah || 0))

  if (!(recipientId > 0)) {
    return {
      surah_number: fallbackSurah,
      start_ayah: fallbackStart,
      end_ayah: fallbackEnd,
    }
  }

  const start = Math.max(1, Number(options.rangeStart || fallbackStart))
  const end = Math.max(start, Number(options.rangeEnd || options.fallbackEndAyah || fallbackEnd))
  const surah = Math.max(1, Number(options.chapterId || fallbackSurah))

  return {
    surah_number: surah,
    start_ayah: start,
    end_ayah: end,
  }
}
