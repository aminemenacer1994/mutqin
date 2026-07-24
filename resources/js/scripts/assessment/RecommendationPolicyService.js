/**
 * Deterministic recommendation policy from approved configs + reason codes.
 * LLMs may only phrase explanations from structured reason codes — never invent settings.
 */

import {
  APPROVED_PLAYBACK_SPEEDS,
  ASSESSMENT_REASON_CODES,
  GOALS,
  TECHNIQUES,
} from './constants.js'

/** @type {Record<string, { goal: string, technique: string, complementary?: string, settings: object, primaryAction: string, explanationKey: string }>} */
export const REASON_INTERVENTIONS = Object.freeze({
  [ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE]: {
    goal: GOALS.RESUME,
    technique: TECHNIQUES.LISTEN_AND_REPEAT,
    settings: { playback_speed: 1, repetitions: 3 },
    primaryAction: 'continue',
    explanationKey: 'sessionIncomplete',
  },
  [ASSESSMENT_REASON_CODES.LOW_RECALL]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.LISTEN_AND_REPEAT,
    complementary: TECHNIQUES.PHRASE_CHUNKS,
    settings: { playback_speed: 0.75, repetitions: 5, blur_enabled: false },
    primaryAction: 'repeat_weak_ayahs',
    explanationKey: 'lowRecall',
  },
  [ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.SEQUENCE_CHAINING,
    complementary: TECHNIQUES.PHRASE_CHUNKS,
    settings: {
      playback_speed: 0.75,
      repetitions: 4,
      chaining_enabled: true,
      chaining_method: 'linking',
    },
    primaryAction: 'start_focused_review',
    explanationKey: 'sequenceErrors',
  },
  [ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.ACTIVE_RECALL,
    complementary: TECHNIQUES.MEMORY_WORD_ANCHORS,
    settings: { playback_speed: 1, repetitions: 4, blur_enabled: true, hint_level: 'low' },
    primaryAction: 'start_focused_review',
    explanationKey: 'highHintDependency',
  },
  [ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.MUSHAF_HIDING,
    settings: {
      playback_speed: 1,
      repetitions: 4,
      blur_enabled: true,
      text_visibility: 'progressive',
    },
    primaryAction: 'start_focused_review',
    explanationKey: 'visualDependency',
  },
  [ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.ACTIVE_RECALL,
    complementary: TECHNIQUES.PHRASE_CHUNKS,
    settings: { playback_speed: 1, repetitions: 3, blur_enabled: true },
    primaryAction: 'start_focused_review',
    explanationKey: 'audioDependency',
  },
  [ASSESSMENT_REASON_CODES.SPOKEN_HESITATION]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.PHRASE_CHUNKS,
    complementary: TECHNIQUES.LISTEN_AND_REPEAT,
    settings: {
      playback_speed: 0.75,
      repetitions: 5,
      talqin_enabled: true,
      focus_enabled: true,
    },
    primaryAction: 'start_focused_review',
    explanationKey: 'spokenHesitation',
  },
  [ASSESSMENT_REASON_CODES.OMISSION_ERRORS]: {
    goal: GOALS.REPEAT,
    technique: TECHNIQUES.LISTEN_AND_REPEAT,
    complementary: TECHNIQUES.ONE_AYAH_AT_A_TIME,
    settings: { playback_speed: 0.75, repetitions: 5, ayat_per_step: 1 },
    primaryAction: 'repeat_weak_ayahs',
    explanationKey: 'omissionErrors',
  },
  [ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION]: {
    goal: GOALS.SIMILAR_AYAH_PRACTICE,
    technique: TECHNIQUES.MUTASHABIHAT_COMPARISON,
    complementary: TECHNIQUES.MEMORY_WORD_ANCHORS,
    settings: { playback_speed: 1, repetitions: 4, anchor_mode_enabled: true },
    primaryAction: 'start_focused_review',
    explanationKey: 'similarAyahConfusion',
  },
  [ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION]: {
    goal: GOALS.REVIEW,
    technique: TECHNIQUES.ACTIVE_RECALL,
    settings: { playback_speed: 1, repetitions: 3, review_interval_days: 1 },
    primaryAction: 'review_tomorrow',
    explanationKey: 'lowDelayedRetention',
  },
  [ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE]: {
    goal: GOALS.ADVANCE,
    technique: TECHNIQUES.PHRASE_CHUNKS,
    complementary: TECHNIQUES.MEMORY_WORD_ANCHORS,
    settings: { playback_speed: 1, repetitions: 2, focus_enabled: true },
    primaryAction: 'continue',
    explanationKey: 'highPerformance',
  },
  [ASSESSMENT_REASON_CODES.LOW_CONFIDENCE]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.LISTEN_AND_REPEAT,
    settings: { playback_speed: 0.75, repetitions: 4 },
    primaryAction: 'start_focused_review',
    explanationKey: 'lowConfidence',
  },
  [ASSESSMENT_REASON_CODES.OVERCONFIDENCE]: {
    goal: GOALS.REINFORCE,
    technique: TECHNIQUES.ACTIVE_RECALL,
    complementary: TECHNIQUES.ONE_AYAH_AT_A_TIME,
    settings: { playback_speed: 0.75, repetitions: 4, blur_enabled: true },
    primaryAction: 'repeat_weak_ayahs',
    explanationKey: 'overconfidence',
  },
  [ASSESSMENT_REASON_CODES.REVIEW_OVERDUE]: {
    goal: GOALS.REVIEW,
    technique: TECHNIQUES.ACTIVE_RECALL,
    settings: { playback_speed: 1, repetitions: 3 },
    primaryAction: 'review_tomorrow',
    explanationKey: 'reviewOverdue',
  },
})

/** Conflict priority (first match wins among conflict pairs). */
const CONFLICT_PRIORITY = Object.freeze([
  ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE,
  ASSESSMENT_REASON_CODES.OVERCONFIDENCE,
  ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS,
  ASSESSMENT_REASON_CODES.SPOKEN_HESITATION,
  ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION,
  ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY,
  ASSESSMENT_REASON_CODES.LOW_RECALL,
  ASSESSMENT_REASON_CODES.OMISSION_ERRORS,
  ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY,
  ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY,
  ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION,
  ASSESSMENT_REASON_CODES.LOW_CONFIDENCE,
  ASSESSMENT_REASON_CODES.REVIEW_OVERDUE,
  ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE,
])

/**
 * Resolve conflicts between confidence and objective evidence.
 * Confidence influences recommendations but never independently forces progression.
 *
 * @param {string[]} reasonCodes
 * @param {{ confidence?: string|null, objectiveBand?: string, spokenWeak?: boolean, textStrong?: boolean }} ctx
 * @returns {string[]}
 */
export function resolveConflictCodes(reasonCodes = [], ctx = {}) {
  const codes = new Set(reasonCodes || [])
  const confidence = String(ctx.confidence || '').toLowerCase()
  const band = String(ctx.objectiveBand || '').toLowerCase()

  // Confident + weak objective → targeted reinforcement (keep OVERCONFIDENCE / weakness codes)
  if (confidence === 'confident' && (band === 'weak' || band === 'mixed')) {
    codes.delete(ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE)
    codes.add(ASSESSMENT_REASON_CODES.OVERCONFIDENCE)
  }

  // Needs practice + strong result → short confidence-building, not full repeat
  if (confidence === 'needs_practice' && band === 'strong') {
    codes.delete(ASSESSMENT_REASON_CODES.LOW_RECALL)
    codes.add(ASSESSMENT_REASON_CODES.LOW_CONFIDENCE)
    // Prefer reinforce over full session repeat
  }

  // Strong text + weak AI Recite
  if (ctx.textStrong && ctx.spokenWeak) {
    codes.add(ASSESSMENT_REASON_CODES.SPOKEN_HESITATION)
  }

  // Strong immediate + poor historical retention → allow progression but early review
  if (band === 'strong' && codes.has(ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION)) {
    codes.add(ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE)
  }

  return [...codes]
}

/**
 * Pick primary reason by priority.
 * @param {string[]} codes
 */
export function selectPrimaryReason(codes = []) {
  for (const code of CONFLICT_PRIORITY) {
    if (codes.includes(code)) return code
  }
  return codes[0] || ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE
}

/**
 * Clamp settings to approved values only.
 * @param {object} settings
 */
export function sanitizeApprovedSettings(settings = {}) {
  const out = {}
  const technique = String(settings.technique || '').toLowerCase()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(technique)) {
    out.technique = technique
  }
  const complementary = String(settings.complementary_technique || settings.complementary || '').toLowerCase()
  if (['talqin', 'focus', 'blur', 'chaining', 'anchor'].includes(complementary)) {
    out.complementary_technique = complementary
  }

  const speed = Number(settings.playback_speed)
  if (Number.isFinite(speed)) {
    out.playback_speed = APPROVED_PLAYBACK_SPEEDS.reduce((best, s) => (
      Math.abs(s - speed) < Math.abs(best - speed) ? s : best
    ), APPROVED_PLAYBACK_SPEEDS[2])
  }

  const reps = Number(settings.repetitions)
  if (Number.isFinite(reps)) out.repetitions = Math.max(1, Math.min(8, Math.round(reps)))

  if (settings.ayat_per_step != null) {
    const step = Number(settings.ayat_per_step)
    if (Number.isFinite(step)) out.ayat_per_step = Math.max(1, Math.min(3, Math.round(step)))
  }

  for (const flag of [
    'focus_enabled',
    'blur_enabled',
    'talqin_enabled',
    'chaining_enabled',
    'anchor_mode_enabled',
  ]) {
    if (typeof settings[flag] === 'boolean') out[flag] = settings[flag]
  }

  if (['linking', 'cumulative'].includes(String(settings.chaining_method || ''))) {
    out.chaining_method = settings.chaining_method
  }

  if (settings.hint_level) out.hint_level = String(settings.hint_level)
  if (settings.text_visibility) out.text_visibility = String(settings.text_visibility)
  if (Number.isFinite(Number(settings.review_interval_days))) {
    out.review_interval_days = Math.max(1, Math.min(14, Math.round(Number(settings.review_interval_days))))
  }

  return out
}

/**
 * Build one explainable next-session recommendation view model.
 *
 * @param {{
 *   reasonCodes: string[],
 *   confidence?: string|null,
 *   objectiveBand?: string,
 *   skills?: Record<string, number>,
 *   baseRecommendation?: object|null,
 *   weakAyahs?: number[],
 *   sessionRange?: { from: number, to: number },
 *   techniqueRank?: Record<string, number>,
 * }} input
 */
export function buildPolicyRecommendation(input = {}) {
  const codes = resolveConflictCodes(input.reasonCodes || [], {
    confidence: input.confidence,
    objectiveBand: input.objectiveBand,
    spokenWeak: (input.skills?.spokenRecall ?? 0.5) < 0.45,
    textStrong: (input.skills?.phraseRecall ?? 0.5) >= 0.75
      && (input.skills?.textualPrecision ?? 0.5) >= 0.7,
  })

  const primary = selectPrimaryReason(codes)
  const intervention = REASON_INTERVENTIONS[primary] || REASON_INTERVENTIONS[ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE]

  // Avoid repeatedly recommending ineffective techniques for this learner
  let technique = intervention.technique
  const rank = input.techniqueRank || {}
  if (technique && Number(rank[technique] || 0) < -0.25 && intervention.complementary) {
    technique = intervention.complementary
  }
  // Map mutashabihat / ai_recite to approved session techniques
  if (technique === TECHNIQUES.MUTASHABIHAT_COMPARISON) technique = TECHNIQUES.MEMORY_WORD_ANCHORS
  if (technique === TECHNIQUES.AI_RECITE) technique = TECHNIQUES.LISTEN_AND_REPEAT

  const settings = sanitizeApprovedSettings({
    technique,
    complementary_technique: intervention.complementary,
    ...intervention.settings,
  })

  const base = input.baseRecommendation && typeof input.baseRecommendation === 'object'
    ? { ...input.baseRecommendation }
    : {}

  const isAdvance = intervention.goal === GOALS.ADVANCE
  const isResume = intervention.goal === GOALS.RESUME
  const type = isResume
    ? 'resume'
    : isAdvance
      ? (base.type && !['revision', 'repeat_current_range'].includes(base.type) ? base.type : 'continue')
      : 'repeat_current_range'

  return {
    ...base,
    type,
    session_mode: isAdvance ? 'new_learning' : 'revision',
    range_kind: isAdvance ? (base.range_kind || 'new') : 'repeated',
    reason_code: primary.toLowerCase(),
    evidence_codes: codes,
    user_reason: null,
    settings: {
      ...(base.settings || {}),
      ...settings,
      adaptations: codes,
      evidence_codes: codes,
      intended_outcome: intervention.goal,
    },
    goal: intervention.goal,
    primary_action: intervention.primaryAction,
    primary_action_label_key: actionLabelKey(intervention.primaryAction),
    explanation_key: intervention.explanationKey,
    weak_ayahs: Array.isArray(input.weakAyahs) ? input.weakAyahs : [],
    policy_version: 1,
  }
}

function actionLabelKey(action) {
  switch (action) {
    case 'repeat_weak_ayahs':
      return 'repeatWeakAyahs'
    case 'start_focused_review':
      return 'startFocusedReview'
    case 'review_tomorrow':
      return 'reviewTomorrow'
    case 'continue':
      return 'continue'
    default:
      return 'continue'
  }
}

export const RecommendationPolicyService = {
  REASON_INTERVENTIONS,
  resolveConflictCodes,
  selectPrimaryReason,
  sanitizeApprovedSettings,
  buildPolicyRecommendation,
}

export default RecommendationPolicyService
