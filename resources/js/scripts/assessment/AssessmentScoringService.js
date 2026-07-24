/**
 * Scores diagnostic skills independently — never collapses to a single stored score.
 */

import {
  ASSESSMENT_LIMITS,
  ASSESSMENT_REASON_CODES,
  RESULT_SKILL_KEYS,
  SKILLS,
} from './constants.js'
import { scoreOpenAnswer, scoreOrdering, textsMatch } from './QuestionValidationService.js'

/**
 * @param {object} question
 * @param {{
 *   answer?: string|string[]|number|null,
 *   usedHint?: boolean,
 *   responseMs?: number,
 *   aiResult?: { result?: string, omissions?: number, insertions?: number, substitutions?: number, hesitation?: boolean, fluency?: number }|null,
 * }} response
 */
export function scoreItemResponse(question, response = {}) {
  const usedHint = !!response.usedHint
  const responseMs = Number(response.responseMs || 0)
  const slow = responseMs > ASSESSMENT_LIMITS.SLOW_RESPONSE_MS
  let correct = false
  let partial = false
  let similarity = 0

  const renderer = question?.renderer || 'mcq'
  if (renderer === 'ordering') {
    const expected = Array.isArray(question.expectedOrder)
      ? question.expectedOrder.map((x) => (typeof x === 'object' ? x.key || x.label || x.text : x))
      : []
    const answer = Array.isArray(response.answer)
      ? response.answer.map((x) => (typeof x === 'object' ? x.key || x.label || x.text : x))
      : []
    const scored = scoreOrdering(answer, expected)
    correct = scored.correct
    partial = scored.partial
    similarity = scored.similarity
  } else if (renderer === 'open') {
    const scored = scoreOpenAnswer(String(response.answer || ''), String(question.correctAnswer || ''))
    correct = scored.correct
    partial = scored.partial
    similarity = scored.similarity
  } else if (renderer === 'ai_recite') {
    const ai = response.aiResult || {}
    const result = String(ai.result || '').toLowerCase()
    if (result === 'strong') {
      correct = true
      similarity = 1
    } else if (result === 'mixed') {
      partial = true
      similarity = 0.65
    } else if (result === 'weak') {
      correct = false
      similarity = 0.3
    } else if (typeof ai.fluency === 'number') {
      similarity = Math.max(0, Math.min(1, ai.fluency))
      correct = similarity >= 0.85
      partial = similarity >= 0.55 && !correct
    }
  } else {
    // mcq / mcq_simple
    if (typeof response.answer === 'number' && Number.isFinite(question.correctIndex)) {
      correct = Number(response.answer) === Number(question.correctIndex)
      similarity = correct ? 1 : 0
    } else {
      correct = textsMatch(String(response.answer || ''), String(question.correctAnswer || ''))
      similarity = correct ? 1 : 0
    }
  }

  return {
    correct,
    partial,
    similarity,
    usedHint,
    responseMs,
    slow,
    supported: usedHint || slow || partial,
  }
}

/**
 * Update running skill estimates (0–1) from one item.
 * Dependency skills increase when the learner relies on support.
 *
 * @param {Record<string, number>} skills
 * @param {object} question
 * @param {ReturnType<typeof scoreItemResponse>} scored
 */
export function updateSkillEstimates(skills, question, scored) {
  const next = { ...skills }
  const probed = Array.isArray(question?.skills) ? question.skills : [SKILLS.PHRASE_RECALL]
  const alpha = 0.35
  const target = scored.correct ? 1 : scored.partial ? 0.55 : 0.2

  for (const skill of probed) {
    if (skill === SKILLS.HINT_DEPENDENCY
      || skill === SKILLS.VISUAL_TEXT_DEPENDENCY
      || skill === SKILLS.AUDIO_DEPENDENCY) {
      continue
    }
    const prev = clamp01(next[skill] ?? 0.5)
    next[skill] = clamp01(prev + alpha * (target - prev))
  }

  // Dependencies: higher = more dependent (weaker independence)
  if (scored.usedHint) {
    next[SKILLS.HINT_DEPENDENCY] = clamp01((next[SKILLS.HINT_DEPENDENCY] ?? 0.3) + 0.15)
  } else if (scored.correct) {
    next[SKILLS.HINT_DEPENDENCY] = clamp01((next[SKILLS.HINT_DEPENDENCY] ?? 0.3) - 0.08)
  }

  if (question?.hidePercent >= 50 || question?.renderer === 'open' || question?.requiresAiRecite) {
    if (scored.correct && !scored.usedHint) {
      next[SKILLS.VISUAL_TEXT_DEPENDENCY] = clamp01((next[SKILLS.VISUAL_TEXT_DEPENDENCY] ?? 0.4) - 0.12)
      next[SKILLS.INDEPENDENCE] = clamp01((next[SKILLS.INDEPENDENCE] ?? 0.5) + 0.12)
    } else if (!scored.correct) {
      next[SKILLS.VISUAL_TEXT_DEPENDENCY] = clamp01((next[SKILLS.VISUAL_TEXT_DEPENDENCY] ?? 0.4) + 0.12)
      next[SKILLS.INDEPENDENCE] = clamp01((next[SKILLS.INDEPENDENCE] ?? 0.5) - 0.1)
    }
  }

  if (question?.requiresAiRecite && responseAiWeak(scored, question)) {
    next[SKILLS.SPOKEN_RECALL] = clamp01((next[SKILLS.SPOKEN_RECALL] ?? 0.5) - 0.15)
    next[SKILLS.FLUENCY] = clamp01((next[SKILLS.FLUENCY] ?? 0.5) - 0.1)
  }

  if (question?.delayed) {
    next[SKILLS.DELAYED_RETENTION] = clamp01(
      (next[SKILLS.DELAYED_RETENTION] ?? 0.5) + alpha * (target - (next[SKILLS.DELAYED_RETENTION] ?? 0.5)),
    )
  }

  return next
}

function responseAiWeak(scored) {
  return !scored.correct && !scored.partial
}

/**
 * Aggregate skill map into the four result-panel dimensions (labels, not a %).
 * @param {Record<string, number>} skills
 */
export function buildResultSkillView(skills = {}) {
  const recall = average([
    skills[SKILLS.PHRASE_RECALL],
    skills[SKILLS.BEGINNINGS],
    skills[SKILLS.ENDINGS],
  ])
  const ayahSequence = clamp01(skills[SKILLS.AYAH_SEQUENCE] ?? 0.5)
  const textualPrecision = clamp01(skills[SKILLS.TEXTUAL_PRECISION] ?? 0.5)
  const independentRecitation = average([
    skills[SKILLS.INDEPENDENCE],
    skills[SKILLS.SPOKEN_RECALL],
    1 - (skills[SKILLS.VISUAL_TEXT_DEPENDENCY] ?? 0.4),
  ])

  const map = {
    recall,
    ayahSequence,
    textualPrecision,
    independentRecitation,
  }

  return RESULT_SKILL_KEYS.map((key) => ({
    key,
    value: map[key],
    band: bandFor(map[key]),
  }))
}

/**
 * Detect reason codes from session + quiz + AI + confidence evidence.
 * @param {{
 *   skills?: Record<string, number>,
 *   session?: object,
 *   confidence?: string|null,
 *   aiAssessment?: object|null,
 *   responses?: object[],
 *   incomplete?: boolean,
 * }} evidence
 * @returns {string[]}
 */
export function detectReasonCodes(evidence = {}) {
  const codes = []
  const skills = evidence.skills || {}
  const session = evidence.session || {}
  const confidence = String(evidence.confidence || '').toLowerCase()
  const ai = evidence.aiAssessment || null
  const responses = Array.isArray(evidence.responses) ? evidence.responses : []

  if (evidence.incomplete || session.incomplete || session.completed === false) {
    codes.push(ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE)
  }

  if ((skills[SKILLS.PHRASE_RECALL] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(ASSESSMENT_REASON_CODES.LOW_RECALL)
  }
  if ((skills[SKILLS.AYAH_SEQUENCE] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS)
  }
  if ((skills[SKILLS.HINT_DEPENDENCY] ?? 0) > 0.55 || Number(session.hints_used || 0) >= 3) {
    codes.push(ASSESSMENT_REASON_CODES.HIGH_HINT_DEPENDENCY)
  }
  if ((skills[SKILLS.VISUAL_TEXT_DEPENDENCY] ?? 0) > 0.55) {
    codes.push(ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY)
  }
  if ((skills[SKILLS.AUDIO_DEPENDENCY] ?? 0) > 0.55 || Number(session.replay_ratio || 0) >= 0.6) {
    codes.push(ASSESSMENT_REASON_CODES.AUDIO_DEPENDENCY)
  }
  if ((skills[SKILLS.SPOKEN_RECALL] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD
    || ai?.pronunciation_issues
    || Number(ai?.hesitation || 0) > 0) {
    codes.push(ASSESSMENT_REASON_CODES.SPOKEN_HESITATION)
  }
  if (Number(ai?.missed_words || 0) > 0
    || responses.some((r) => r.partial && !r.correct)) {
    codes.push(ASSESSMENT_REASON_CODES.OMISSION_ERRORS)
  }
  if ((skills[SKILLS.SIMILAR_AYAH_CONFUSION] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(ASSESSMENT_REASON_CODES.SIMILAR_AYAH_CONFUSION)
  }
  if ((skills[SKILLS.DELAYED_RETENTION] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
    codes.push(ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION)
  }

  const strongObjective = RESULT_SKILL_KEYS.every((k) => {
    const view = buildResultSkillView(skills).find((s) => s.key === k)
    return (view?.value ?? 0) >= ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD
  }) || String(ai?.result || '') === 'strong'

  const weakObjective = (skills[SKILLS.PHRASE_RECALL] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD
    || String(ai?.result || '') === 'weak'
    || responses.filter((r) => !r.correct).length >= Math.ceil(responses.length * 0.5)

  if (strongObjective) codes.push(ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE)
  if (confidence === 'needs_practice') codes.push(ASSESSMENT_REASON_CODES.LOW_CONFIDENCE)
  if (confidence === 'confident' && weakObjective) {
    codes.push(ASSESSMENT_REASON_CODES.OVERCONFIDENCE)
  }

  if (Array.isArray(session.overdueKeys) && session.overdueKeys.length) {
    codes.push(ASSESSMENT_REASON_CODES.REVIEW_OVERDUE)
  }

  return [...new Set(codes)]
}

/**
 * Overall objective band for recommendation bridging (not shown as main %).
 * @param {Record<string, number>} skills
 * @returns {'strong'|'mixed'|'weak'}
 */
export function objectiveBand(skills = {}) {
  const view = buildResultSkillView(skills)
  const avg = average(view.map((s) => s.value))
  if (avg >= ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD) return 'strong'
  if (avg <= ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) return 'weak'
  return 'mixed'
}

/**
 * Whether enough evidence exists to stop early.
 * @param {{ responses: object[], skills: Record<string, number>, questionCount: number }} state
 */
export function shouldStopEarly(state = {}) {
  const count = Number(state.questionCount || state.responses?.length || 0)
  if (count < ASSESSMENT_LIMITS.MIN_QUESTIONS) return false
  if (count >= ASSESSMENT_LIMITS.MAX_QUESTIONS) return true

  const responses = state.responses || []
  const recent = responses.slice(-3)
  if (recent.length < 3) return false

  const allStrong = recent.every((r) => r.correct && !r.usedHint && !r.slow)
  const allWeak = recent.every((r) => !r.correct)
  const skills = state.skills || {}
  const evidence = average([
    skills[SKILLS.PHRASE_RECALL],
    skills[SKILLS.AYAH_SEQUENCE],
    skills[SKILLS.TEXTUAL_PRECISION],
    skills[SKILLS.INDEPENDENCE],
  ])

  if (allStrong && evidence >= ASSESSMENT_LIMITS.EARLY_STOP_CONFIDENCE) return true
  if (allWeak && evidence <= (1 - ASSESSMENT_LIMITS.EARLY_STOP_CONFIDENCE)) return true
  return false
}

/**
 * Next difficulty after a scored response.
 * @param {number} current
 * @param {ReturnType<typeof scoreItemResponse>} scored
 * @param {{ consecutiveErrors?: number }} [meta]
 */
export function nextDifficulty(current, scored, meta = {}) {
  let d = Math.max(1, Math.min(4, Number(current) || 2))
  if (scored.correct && !scored.usedHint && !scored.slow) {
    d = Math.min(4, d + 1)
  } else if (!scored.correct) {
    d = Math.max(1, d - 1)
  }
  // maintain on hint/slow correct — no change
  if (Number(meta.consecutiveErrors || 0) >= 2) {
    d = Math.max(1, d - 1)
  }
  return d
}

function clamp01(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return 0
  return Math.round(Math.max(0, Math.min(1, n)) * 100) / 100
}

function average(values) {
  const nums = (values || []).map(Number).filter((n) => Number.isFinite(n))
  if (!nums.length) return 0.5
  return clamp01(nums.reduce((a, b) => a + b, 0) / nums.length)
}

function bandFor(value) {
  if (value >= ASSESSMENT_LIMITS.STRONG_SKILL_THRESHOLD) return 'strong'
  if (value <= ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) return 'developing'
  return 'steady'
}

export const AssessmentScoringService = {
  scoreItemResponse,
  updateSkillEstimates,
  buildResultSkillView,
  detectReasonCodes,
  objectiveBand,
  shouldStopEarly,
  nextDifficulty,
}

export default AssessmentScoringService
