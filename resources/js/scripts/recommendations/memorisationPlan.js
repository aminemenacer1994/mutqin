/**
 * Single typed memorisation-plan configuration used when recommending,
 * displaying, and applying next-session settings.
 */

/**
 * @typedef {Object} MemorisationPlan
 * @property {number} playbackSpeed
 * @property {number} repetitions
 * @property {string[]} techniqueIds
 * @property {string[]} focusWordIds
 * @property {string} guidanceMode
 * @property {string|null} [reciterId]
 * @property {number|null} [ayatPerStep]
 * @property {boolean} [focusEnabled]
 * @property {boolean} [blurEnabled]
 * @property {boolean} [talqinEnabled]
 * @property {boolean} [chainingEnabled]
 * @property {string|null} [chainingMethod]
 * @property {number|null} [chainingRepetitions]
 * @property {boolean} [anchorModeEnabled]
 * @property {number|null} [anchorCount]
 * @property {string|null} [complementaryTechnique]
 * @property {number|null} [chapterId]
 * @property {number|null} [rangeStart]
 * @property {number|null} [rangeEnd]
 * @property {number[]} [focusAyahs]
 * @property {'recommended'|'applied'|'manual'} [status]
 */

export const PLAN_STATUS = Object.freeze({
  RECOMMENDED: 'recommended',
  APPLIED: 'applied',
  MANUAL: 'manual',
})

const GUIDANCE_MODES = new Set(['talqin', 'focus', 'blur', 'chaining', 'anchor', 'guided'])

/**
 * @param {unknown} value
 * @param {number} fallback
 * @returns {number}
 */
function asNumber(value, fallback) {
  const n = Number(value)
  return Number.isFinite(n) ? n : fallback
}

/**
 * @param {unknown} value
 * @returns {string[]}
 */
function asStringList(value) {
  if (!Array.isArray(value)) return []
  return value.map((item) => String(item || '').trim()).filter(Boolean)
}

/**
 * @param {unknown} value
 * @returns {number[]}
 */
function asNumberList(value) {
  if (!Array.isArray(value)) return []
  return value.map(Number).filter((n) => Number.isFinite(n) && n > 0)
}

/**
 * Build a canonical MemorisationPlan from recommendation / session settings.
 * @param {object} [input]
 * @returns {MemorisationPlan}
 */
export function buildMemorisationPlan(input = {}) {
  const settings = input.settings && typeof input.settings === 'object' ? input.settings : {}
  const config = input.config && typeof input.config === 'object' ? input.config : {}
  const planDetail = input.planDetail && typeof input.planDetail === 'object' ? input.planDetail : {}
  const range = input.ayahRange || planDetail.range || {}

  const primaryTechnique = String(
    settings.technique
    || config.technique
    || planDetail.practiceApproach?.id
    || input.techniqueId
    || 'talqin',
  ).toLowerCase()

  const complementary = String(
    settings.complementary_technique
    || config.complementaryTechnique
    || '',
  ).toLowerCase() || null

  const techniqueIds = [primaryTechnique, complementary].filter(Boolean)
  const focusWords = asStringList(
    settings.focus_word_ids
    || settings.weak_words
    || planDetail.weakWords
    || planDetail.focusWordIds
    || input.focusWordIds,
  )

  const guidanceMode = GUIDANCE_MODES.has(String(input.guidanceMode || '').toLowerCase())
    ? String(input.guidanceMode).toLowerCase()
    : (primaryTechnique || 'talqin')

  /** @type {MemorisationPlan} */
  const plan = {
    playbackSpeed: asNumber(
      settings.playback_speed ?? config.playbackSpeed ?? config.speed ?? input.playbackSpeed,
      1,
    ),
    repetitions: Math.max(1, asNumber(
      settings.repetitions ?? settings.repetitionsPerStep ?? config.repetitionsPerStep ?? input.repetitions,
      3,
    )),
    techniqueIds,
    focusWordIds: focusWords,
    guidanceMode,
    reciterId: settings.reciter || config.reciterId || input.reciterId || null,
    ayatPerStep: settings.ayat_per_step != null
      ? asNumber(settings.ayat_per_step, 1)
      : (config.ayatPerStep != null ? asNumber(config.ayatPerStep, 1) : null),
    focusEnabled: settings.focus_enabled != null
      ? !!settings.focus_enabled
      : (config.focusModeEnabled != null ? !!config.focusModeEnabled : primaryTechnique === 'focus'),
    blurEnabled: settings.blur_enabled != null
      ? !!settings.blur_enabled
      : (config.blurModeEnabled != null ? !!config.blurModeEnabled : primaryTechnique === 'blur'),
    talqinEnabled: settings.talqin_enabled != null
      ? !!settings.talqin_enabled
      : (config.talqinModeEnabled != null ? !!config.talqinModeEnabled : primaryTechnique === 'talqin'),
    chainingEnabled: settings.chaining_enabled != null
      ? !!settings.chaining_enabled
      : (config.chainingEnabled != null
        ? !!config.chainingEnabled
        : (primaryTechnique === 'chaining' || complementary === 'chaining')),
    chainingMethod: settings.chaining_method
      || config.chainingMethod
      || (primaryTechnique === 'chaining' || complementary === 'chaining' ? 'linking' : null),
    chainingRepetitions: asNumber(
      settings.chaining_repetitions ?? config.chainingRepetitions ?? input.chainingRepetitions,
      2,
    ),
    anchorModeEnabled: settings.anchor_mode_enabled != null
      ? !!settings.anchor_mode_enabled
      : (config.anchorModeEnabled != null ? !!config.anchorModeEnabled : primaryTechnique === 'anchor'),
    anchorCount: asNumber(settings.anchor_count ?? config.anchorCount ?? input.anchorCount, 2),
    complementaryTechnique: complementary,
    chapterId: asNumber(
      input.chapterId
      ?? range.surah_id
      ?? range.surahId
      ?? planDetail.range?.surahId
      ?? null,
      NaN,
    ) || null,
    rangeStart: asNumber(range.from ?? range.start ?? input.rangeStart, NaN) || null,
    rangeEnd: asNumber(range.to ?? range.end ?? input.rangeEnd, NaN) || null,
    focusAyahs: asNumberList(range.focus_ayahs || range.focusAyahs || planDetail.focus_ayahs || input.focusAyahs),
    status: PLAN_STATUS.RECOMMENDED,
  }

  return plan
}

/**
 * Convert a MemorisationPlan into the snake_case settings payload used by APIs
 * and startSessionFromRecommendationPayload.
 * @param {MemorisationPlan} plan
 * @returns {Record<string, unknown>}
 */
export function memorisationPlanToSettings(plan) {
  if (!plan || typeof plan !== 'object') return {}
  const primary = plan.techniqueIds?.[0] || plan.guidanceMode || 'talqin'
  return {
    technique: primary,
    complementary_technique: plan.complementaryTechnique || plan.techniqueIds?.[1] || null,
    reciter: plan.reciterId || null,
    playback_speed: Number(plan.playbackSpeed || 1),
    repetitions: Number(plan.repetitions || 3),
    ayat_per_step: plan.ayatPerStep,
    focus_enabled: !!plan.focusEnabled,
    blur_enabled: !!plan.blurEnabled,
    talqin_enabled: !!plan.talqinEnabled,
    chaining_enabled: !!plan.chainingEnabled,
    chaining_method: plan.chainingMethod || null,
    chaining_repetitions: plan.chainingRepetitions,
    anchor_mode_enabled: !!plan.anchorModeEnabled,
    anchor_count: plan.anchorCount,
    focus_word_ids: Array.isArray(plan.focusWordIds) ? plan.focusWordIds : [],
    focus_ayahs: Array.isArray(plan.focusAyahs) ? plan.focusAyahs : [],
  }
}

/**
 * Shallow equality for plan application checks.
 * @param {MemorisationPlan|null|undefined} a
 * @param {MemorisationPlan|null|undefined} b
 * @returns {boolean}
 */
export function memorisationPlansEqual(a, b) {
  if (!a || !b) return false
  return (
    Number(a.playbackSpeed) === Number(b.playbackSpeed)
    && Number(a.repetitions) === Number(b.repetitions)
    && String(a.guidanceMode) === String(b.guidanceMode)
    && String(a.reciterId || '') === String(b.reciterId || '')
    && !!a.focusEnabled === !!b.focusEnabled
    && !!a.blurEnabled === !!b.blurEnabled
    && !!a.talqinEnabled === !!b.talqinEnabled
    && !!a.chainingEnabled === !!b.chainingEnabled
    && String(a.chainingMethod || '') === String(b.chainingMethod || '')
    && !!a.anchorModeEnabled === !!b.anchorModeEnabled
    && Number(a.rangeStart || 0) === Number(b.rangeStart || 0)
    && Number(a.rangeEnd || 0) === Number(b.rangeEnd || 0)
    && (a.techniqueIds || []).join(',') === (b.techniqueIds || []).join(',')
  )
}

/**
 * Mark plan status after successful commit or manual override.
 * @param {MemorisationPlan} plan
 * @param {'recommended'|'applied'|'manual'} status
 * @returns {MemorisationPlan}
 */
export function withPlanStatus(plan, status) {
  if (!plan) return plan
  return { ...plan, status }
}
