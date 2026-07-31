/**
 * Post-session choice flow after End session.
 *
 * Product-facing session statuses (for this choice surface):
 *   draft | ready | active | paused | ended
 *
 * Actions:
 *   repeat_recommended (return to previous session) | create_custom
 */

/** @typedef {'draft'|'ready'|'active'|'paused'|'ended'} ProductSessionStatus */

/** @typedef {'repeat_recommended'|'create_custom'} PostSessionAction */

export const PRODUCT_SESSION_STATUS = Object.freeze({
  DRAFT: 'draft',
  READY: 'ready',
  ACTIVE: 'active',
  PAUSED: 'paused',
  ENDED: 'ended',
})

export const POST_SESSION_ACTION = Object.freeze({
  REPEAT_RECOMMENDED: 'repeat_recommended',
  CREATE_CUSTOM: 'create_custom',
})

const MAX_RECOMMENDED_TEMPLATES = 12

/**
 * @param {unknown} value
 * @returns {number}
 */
function toPositiveInt(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
}

/**
 * @param {unknown} value
 * @returns {number|null}
 */
function toOptionalNumber(value) {
  if (value == null || value === '') return null
  const n = Number(value)
  return Number.isFinite(n) ? n : null
}

/**
 * Build a reusable recommended-session template (settings only — no progress).
 *
 * @param {Record<string, any>} input
 * @returns {Record<string, any>|null}
 */
export function buildRecommendedSessionTemplate(input = {}) {
  const chapterId = toPositiveInt(input.chapterId ?? input.surahId ?? input.surah_id)
  const rangeStart = toPositiveInt(input.rangeStart ?? input.from ?? input.ayah_from)
  const rangeEnd = Math.max(
    rangeStart,
    toPositiveInt(input.rangeEnd ?? input.to ?? input.ayah_to) || rangeStart,
  )
  if (!chapterId || !rangeStart) return null

  const recommendationId = input.recommendationId
    ?? input.recommendation_id
    ?? input.sourceRecommendationId
    ?? null

  return {
    id: String(input.id || `rec-tpl-${chapterId}-${rangeStart}-${rangeEnd}-${Date.now()}`),
    createdAt: input.createdAt || new Date().toISOString(),
    endedAt: input.endedAt || null,
    fromRecommendation: input.fromRecommendation !== false,
    recommendationId: recommendationId == null ? null : String(recommendationId),
    chapterId,
    chapterName: input.chapterName || input.surahName || input.surah_name || '',
    rangeStart,
    rangeEnd,
    reciterId: input.reciterId ?? input.reciter ?? null,
    playbackSpeed: toOptionalNumber(input.playbackSpeed ?? input.speed ?? input.playback_speed) ?? 1,
    repetitions: Math.max(1, toPositiveInt(input.repetitions ?? input.repetitionsPerStep) || 3),
    delay: Math.max(0, Number(input.delay ?? 0) || 0),
    gapBetweenVerses: input.gapBetweenVerses || null,
    customGapSeconds: toOptionalNumber(input.customGapSeconds),
    talqinModeEnabled: !!input.talqinModeEnabled || !!input.talqin_enabled,
    focusModeEnabled: !!input.focusModeEnabled || !!input.focus_enabled,
    blurModeEnabled: !!input.blurModeEnabled || !!input.blur_enabled,
    chainingEnabled: !!input.chainingEnabled || !!input.chaining_enabled,
    chainingMethod: input.chainingMethod || input.chaining_method || 'linking',
    chainingRepetitions: toPositiveInt(input.chainingRepetitions ?? input.chaining_repetitions) || 2,
    anchorModeEnabled: !!input.anchorModeEnabled || !!input.anchor_mode_enabled,
    anchorCount: toPositiveInt(input.anchorCount ?? input.anchor_count) || 2,
    technique: input.technique || null,
    sessionMode: input.sessionMode || input.session_mode || 'revision',
    practiceWeakWords: Array.isArray(input.practiceWeakWords)
      ? input.practiceWeakWords
      : (Array.isArray(input.practice_weak_words) ? input.practice_weak_words : []),
    settings: input.settings && typeof input.settings === 'object' ? { ...input.settings } : null,
  }
}

/**
 * @param {unknown} template
 * @returns {boolean}
 */
export function isValidRecommendedTemplate(template) {
  if (!template || typeof template !== 'object') return false
  const chapterId = toPositiveInt(template.chapterId)
  const rangeStart = toPositiveInt(template.rangeStart)
  const rangeEnd = toPositiveInt(template.rangeEnd)
  return chapterId > 0 && rangeStart > 0 && rangeEnd >= rangeStart
}

/**
 * Prefer the just-ended recommended session; otherwise the latest eligible template.
 *
 * @param {{
 *   justEndedTemplate?: Record<string, any>|null,
 *   templates?: Array<Record<string, any>|null|undefined>,
 * }} [input]
 * @returns {Record<string, any>|null}
 */
export function resolveRepeatRecommendedTemplate({
  justEndedTemplate = null,
  templates = [],
} = {}) {
  if (isValidRecommendedTemplate(justEndedTemplate)) {
    return justEndedTemplate
  }
  const list = Array.isArray(templates) ? templates : []
  for (const entry of list) {
    if (isValidRecommendedTemplate(entry)) return entry
  }
  return null
}

/**
 * @param {Array<Record<string, any>|null|undefined>} templates
 * @param {Record<string, any>|null} template
 * @returns {Array<Record<string, any>>}
 */
export function rememberRecommendedSessionTemplate(templates, template) {
  if (!isValidRecommendedTemplate(template)) {
    return Array.isArray(templates)
      ? templates.filter(isValidRecommendedTemplate).slice(0, MAX_RECOMMENDED_TEMPLATES)
      : []
  }
  const next = [template]
  const seen = new Set([String(template.id)])
  const fingerprint = `${template.chapterId}:${template.rangeStart}:${template.rangeEnd}:${template.recommendationId || ''}`
  seen.add(fingerprint)

  for (const entry of (Array.isArray(templates) ? templates : [])) {
    if (!isValidRecommendedTemplate(entry)) continue
    const id = String(entry.id || '')
    const fp = `${entry.chapterId}:${entry.rangeStart}:${entry.rangeEnd}:${entry.recommendationId || ''}`
    if (seen.has(id) || seen.has(fp)) continue
    seen.add(id)
    seen.add(fp)
    next.push(entry)
    if (next.length >= MAX_RECOMMENDED_TEMPLATES) break
  }
  return next
}

/**
 * Whether the repeat CTA should render (never show a disabled stub).
 *
 * @param {{
 *   justEndedTemplate?: Record<string, any>|null,
 *   templates?: Array<Record<string, any>|null|undefined>,
 * }} [input]
 * @returns {boolean}
 */
export function canRepeatRecommendedSession(input = {}) {
  return !!resolveRepeatRecommendedTemplate(input)
}

/**
 * Map lifecycle/completion flags onto the product-facing session status.
 *
 * @param {{
 *   showPostSessionChoice?: boolean,
 *   creatingCustomDraft?: boolean,
 *   sessionCompleted?: boolean,
 *   sessionPaused?: boolean,
 *   sessionActive?: boolean,
 *   hasReadySession?: boolean,
 * }} [input]
 * @returns {ProductSessionStatus}
 */
export function resolveProductSessionStatus(input = {}) {
  if (input.creatingCustomDraft) return PRODUCT_SESSION_STATUS.DRAFT
  if (input.showPostSessionChoice || input.sessionCompleted) return PRODUCT_SESSION_STATUS.ENDED
  if (input.sessionPaused) return PRODUCT_SESSION_STATUS.PAUSED
  if (input.sessionActive) return PRODUCT_SESSION_STATUS.ACTIVE
  if (input.hasReadySession) return PRODUCT_SESSION_STATUS.READY
  return PRODUCT_SESSION_STATUS.DRAFT
}
