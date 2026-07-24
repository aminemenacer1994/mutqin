/**
 * Adaptive assessment controller: start → present → answer → adapt → early stop → result VM.
 * State survives refresh via localStorage (hybrid with recommendation snapshot on the server).
 */

import {
  ASSESSMENT_EVENTS,
  ASSESSMENT_LIMITS,
  DIFFICULTY,
  STORAGE_KEYS,
} from './constants.js'
import {
  buildResultSkillView,
  detectReasonCodes,
  nextDifficulty,
  objectiveBand,
  scoreItemResponse,
  shouldStopEarly,
  updateSkillEstimates,
} from './AssessmentScoringService.js'
import { selectNextQuestion } from './QuestionSelectionService.js'
import {
  applyAssessmentToMastery,
  loadMasteryMap,
  saveMasteryMap,
  toProgressPayload,
} from './LearnerMasteryService.js'
import {
  buildPolicyRecommendation,
  selectPrimaryReason,
} from './RecommendationPolicyService.js'
import { buildReviewScheduleSnapshot } from './ReviewSchedulingService.js'
import { loadEffectivenessState } from './RecommendationEffectivenessService.js'
import { SKILLS } from './constants.js'

function storage() {
  const bridge = typeof globalThis !== 'undefined' ? globalThis.__MUTQIN_STORAGE_BRIDGE__ : null
  if (bridge?.getItem && bridge?.setItem) return bridge
  if (typeof localStorage !== 'undefined') return localStorage
  return null
}

function emptySkills() {
  return {
    [SKILLS.PHRASE_RECALL]: 0.5,
    [SKILLS.AYAH_SEQUENCE]: 0.5,
    [SKILLS.BEGINNINGS]: 0.5,
    [SKILLS.ENDINGS]: 0.5,
    [SKILLS.TEXTUAL_PRECISION]: 0.5,
    [SKILLS.SPOKEN_RECALL]: 0.5,
    [SKILLS.FLUENCY]: 0.5,
    [SKILLS.INDEPENDENCE]: 0.5,
    [SKILLS.HINT_DEPENDENCY]: 0.3,
    [SKILLS.VISUAL_TEXT_DEPENDENCY]: 0.4,
    [SKILLS.AUDIO_DEPENDENCY]: 0.4,
    [SKILLS.SIMILAR_AYAH_CONFUSION]: 0.5,
    [SKILLS.DELAYED_RETENTION]: 0.5,
    [SKILLS.CONFIDENCE_CALIBRATION]: 0.5,
  }
}

/**
 * @param {object} [partial]
 */
export function createAssessmentSession(partial = {}) {
  const nowIso = partial.nowIso || new Date().toISOString()
  return {
    id: partial.id || `assess_${Date.now()}`,
    status: partial.status || 'active', // active|paused|completed|abandoned
    startedAt: partial.startedAt || nowIso,
    updatedAt: nowIso,
    sourceSessionId: partial.sourceSessionId ?? null,
    recommendationId: partial.recommendationId ?? null,
    difficulty: Number(partial.difficulty) || ASSESSMENT_LIMITS.START_DIFFICULTY,
    questionsAsked: Number(partial.questionsAsked) || 0,
    consecutiveErrors: Number(partial.consecutiveErrors) || 0,
    recentTypes: Array.isArray(partial.recentTypes) ? partial.recentTypes : [],
    currentQuestion: partial.currentQuestion || null,
    currentPresentedAt: partial.currentPresentedAt || null,
    responses: Array.isArray(partial.responses) ? partial.responses : [],
    events: Array.isArray(partial.events) ? partial.events : [],
    skills: partial.skills && typeof partial.skills === 'object' ? partial.skills : emptySkills(),
    context: partial.context || {},
    stoppedEarly: !!partial.stoppedEarly,
    result: partial.result || null,
  }
}

export function persistAssessmentSession(session) {
  const store = storage()
  if (!store) return false
  try {
    store.setItem(STORAGE_KEYS.ASSESSMENT_SESSION, JSON.stringify(session))
    return true
  } catch {
    return false
  }
}

export function loadAssessmentSession() {
  const store = storage()
  if (!store) return null
  try {
    const raw = store.getItem(STORAGE_KEYS.ASSESSMENT_SESSION)
    if (!raw) return null
    return createAssessmentSession(JSON.parse(raw))
  } catch {
    return null
  }
}

export function clearAssessmentSession() {
  const store = storage()
  if (!store) return
  try {
    store.removeItem(STORAGE_KEYS.ASSESSMENT_SESSION)
  } catch {
    /* ignore */
  }
}

function pushEvent(session, type, payload = {}) {
  const event = {
    type,
    at: new Date().toISOString(),
    ...payload,
  }
  session.events = [...(session.events || []), event].slice(-200)
  return event
}

/**
 * Start an adaptive check for the completed session range.
 *
 * @param {{
 *   verses: object[],
 *   sourceSessionId?: string|number|null,
 *   recommendationId?: string|number|null,
 *   sessionContext?: object,
 *   surahCatalog?: object[],
 *   masteryByKey?: Record<string, object>,
 *   rng?: () => number,
 * }} input
 */
export function startAdaptiveCheck(input = {}) {
  const masteryByKey = input.masteryByKey || loadMasteryMap()
  const session = createAssessmentSession({
    sourceSessionId: input.sourceSessionId ?? null,
    recommendationId: input.recommendationId ?? null,
    difficulty: ASSESSMENT_LIMITS.START_DIFFICULTY,
    context: {
      verses: (input.verses || []).map(summariseVerse),
      session: input.sessionContext || {},
      surahCatalog: input.surahCatalog || [],
      masteryByKey,
    },
  })

  pushEvent(session, ASSESSMENT_EVENTS.ADAPTIVE_CHECK_STARTED, {
    difficulty: session.difficulty,
    verseCount: session.context.verses.length,
  })

  presentNextQuestion(session, input.rng)
  persistAssessmentSession(session)
  return session
}

function summariseVerse(v) {
  return {
    key: v.key,
    surah: Number(v.surah || String(v.key || '').split(':')[0] || 0),
    ayah: Number(v.ayah || v.number || String(v.key || '').split(':')[1] || 0),
    arabic: v.arabic || v.text || '',
    surahName: v.surahName || v.chapterName || '',
  }
}

/**
 * @param {object} session
 * @param {() => number} [rng]
 */
export function presentNextQuestion(session, rng = Math.random) {
  if (!session || session.status !== 'active') return session

  const ctx = session.context || {}
  const question = selectNextQuestion({
    verses: ctx.verses || [],
    difficulty: session.difficulty,
    recentTypes: session.recentTypes,
    masteryByKey: ctx.masteryByKey || {},
    sessionWeakAyahs: ctx.session?.weak_ayahs || ctx.session?.weakAyahs || [],
    overdueKeys: ctx.session?.overdueKeys || [],
    sessionRange: ctx.session?.range || ctx.session?.sessionRange || null,
    surahCatalog: ctx.surahCatalog || [],
    rng,
  })

  if (!question) {
    return completeAssessment(session, { force: true })
  }

  session.currentQuestion = question
  session.currentPresentedAt = new Date().toISOString()
  session.updatedAt = session.currentPresentedAt
  session.recentTypes = [...(session.recentTypes || []), question.type].slice(-6)
  session.questionsAsked = Number(session.questionsAsked || 0) + 1

  pushEvent(session, ASSESSMENT_EVENTS.QUESTION_PRESENTED, {
    questionId: question.id,
    type: question.type,
    difficulty: question.difficulty,
    verseKey: question.verseKey,
  })

  if (question.requiresAiRecite) {
    pushEvent(session, ASSESSMENT_EVENTS.AI_RECITE_REQUESTED, {
      questionId: question.id,
      verseKey: question.verseKey,
    })
  }

  persistAssessmentSession(session)
  return session
}

/**
 * @param {object} session
 * @param {{
 *   answer?: any,
 *   usedHint?: boolean,
 *   responseMs?: number,
 *   aiResult?: object|null,
 *   rng?: () => number,
 * }} response
 */
export function answerCurrentQuestion(session, response = {}) {
  if (!session || session.status !== 'active' || !session.currentQuestion) return session

  const question = session.currentQuestion
  const presentedAt = session.currentPresentedAt ? Date.parse(session.currentPresentedAt) : Date.now()
  const responseMs = Number.isFinite(Number(response.responseMs))
    ? Number(response.responseMs)
    : Math.max(0, Date.now() - presentedAt)

  if (response.usedHint) {
    pushEvent(session, ASSESSMENT_EVENTS.HINT_REQUESTED, {
      questionId: question.id,
      verseKey: question.verseKey,
    })
  }

  const scored = scoreItemResponse(question, { ...response, responseMs })
  const prevDifficulty = session.difficulty
  session.skills = updateSkillEstimates(session.skills, question, scored)

  if (scored.correct) session.consecutiveErrors = 0
  else session.consecutiveErrors = Number(session.consecutiveErrors || 0) + 1

  // Repeated error → one diagnostic confirmation (stay / drop difficulty)
  const needsDiagnostic = session.consecutiveErrors >= 2 && !scored.correct

  session.difficulty = nextDifficulty(session.difficulty, scored, {
    consecutiveErrors: session.consecutiveErrors,
  })

  if (session.difficulty !== prevDifficulty) {
    pushEvent(session, ASSESSMENT_EVENTS.DIFFICULTY_CHANGED, {
      from: prevDifficulty,
      to: session.difficulty,
    })
  }

  const item = {
    questionId: question.id,
    verseKey: question.verseKey,
    type: question.type,
    difficulty: question.difficulty,
    skills: question.skills,
    ...scored,
    answer: response.answer ?? null,
    aiResult: response.aiResult || null,
    needsDiagnostic,
    question,
  }
  session.responses = [...session.responses, item]

  pushEvent(session, ASSESSMENT_EVENTS.QUESTION_ANSWERED, {
    questionId: question.id,
    correct: scored.correct,
    partial: scored.partial,
  })
  pushEvent(
    session,
    scored.correct ? ASSESSMENT_EVENTS.ANSWER_CORRECT : ASSESSMENT_EVENTS.ANSWER_INCORRECT,
    { questionId: question.id, verseKey: question.verseKey },
  )

  // Detect skill weaknesses as they appear
  for (const skill of question.skills || []) {
    if ((session.skills[skill] ?? 0.5) < ASSESSMENT_LIMITS.WEAK_SKILL_THRESHOLD) {
      pushEvent(session, ASSESSMENT_EVENTS.SKILL_WEAKNESS_DETECTED, { skill, value: session.skills[skill] })
    }
  }

  session.currentQuestion = null
  session.currentPresentedAt = null
  session.updatedAt = new Date().toISOString()

  if (shouldStopEarly({
    responses: session.responses,
    skills: session.skills,
    questionCount: session.questionsAsked,
  })) {
    session.stoppedEarly = true
    pushEvent(session, ASSESSMENT_EVENTS.ASSESSMENT_STOPPED_EARLY, {
      questionsAsked: session.questionsAsked,
    })
    return completeAssessment(session)
  }

  if (session.questionsAsked >= ASSESSMENT_LIMITS.MAX_QUESTIONS) {
    return completeAssessment(session)
  }

  // After repeated errors, force a lower-difficulty diagnostic confirmation question
  if (needsDiagnostic) {
    session.difficulty = Math.max(DIFFICULTY.RECOGNITION, session.difficulty)
  }

  presentNextQuestion(session, response.rng)
  persistAssessmentSession(session)
  return session
}

/**
 * Request a hint for the current question (does not advance).
 * @param {object} session
 */
export function requestHint(session) {
  if (!session?.currentQuestion) return { session, hint: null }
  pushEvent(session, ASSESSMENT_EVENTS.HINT_REQUESTED, {
    questionId: session.currentQuestion.id,
  })
  session.updatedAt = new Date().toISOString()
  persistAssessmentSession(session)
  return { session, hint: session.currentQuestion.hint || null }
}

export function pauseAssessment(session) {
  if (!session) return session
  session.status = 'paused'
  session.updatedAt = new Date().toISOString()
  persistAssessmentSession(session)
  return session
}

export function resumeAssessment(session) {
  if (!session) return session
  if (session.status === 'paused') session.status = 'active'
  session.updatedAt = new Date().toISOString()
  if (!session.currentQuestion && session.status === 'active' && !session.result) {
    presentNextQuestion(session)
  }
  persistAssessmentSession(session)
  return session
}

/**
 * @param {object} session
 * @param {{ force?: boolean, confidence?: string|null, baseRecommendation?: object|null }} [opts]
 */
export function completeAssessment(session, opts = {}) {
  if (!session) return session
  if (session.status === 'completed' && session.result && !opts.force) return session

  const nowIso = new Date().toISOString()
  const confidence = opts.confidence ?? session.context?.session?.confidence ?? null
  const reasonCodes = detectReasonCodes({
    skills: session.skills,
    session: session.context?.session || {},
    confidence,
    aiAssessment: extractAiFromResponses(session.responses),
    responses: session.responses,
    incomplete: !!session.context?.session?.incomplete,
  })

  const band = objectiveBand(session.skills)
  const skillView = buildResultSkillView(session.skills)
  const primaryWeakness = skillView.slice().sort((a, b) => a.value - b.value)[0]
  const primaryStrength = skillView.slice().sort((a, b) => b.value - a.value)[0]

  const verseKeys = [...new Set(session.responses.map((r) => r.verseKey).filter(Boolean))]
  let masteryMap = loadMasteryMap()
  const reviewSnap = buildReviewScheduleSnapshot(
    verseKeys,
    masteryMap,
    reasonCodes,
    nowIso,
  )

  masteryMap = applyAssessmentToMastery(masteryMap, {
    responses: session.responses,
    skills: session.skills,
    confidence,
    reasonCodes,
    nextReviewByKey: reviewSnap.byKey,
    nowIso,
  })
  saveMasteryMap(masteryMap)

  pushEvent(session, ASSESSMENT_EVENTS.MASTERY_UPDATED, {
    keys: verseKeys,
  })
  pushEvent(session, ASSESSMENT_EVENTS.REVIEW_SCHEDULED, {
    intervalDays: reviewSnap.intervalDays,
    nextReviewAt: reviewSnap.nextReviewAt,
  })

  const effectiveness = loadEffectivenessState()
  const policyRec = buildPolicyRecommendation({
    reasonCodes,
    confidence,
    objectiveBand: band,
    skills: session.skills,
    baseRecommendation: opts.baseRecommendation || session.context?.baseRecommendation || null,
    weakAyahs: weakAyahNumbers(session.responses),
    techniqueRank: effectiveness.techniqueScores,
  })

  const orderedCodes = (() => {
    const primary = selectPrimaryReason(policyRec.evidence_codes || reasonCodes)
    const rest = (policyRec.evidence_codes || reasonCodes).filter((c) => c !== primary)
    return primary ? [primary, ...rest] : (policyRec.evidence_codes || reasonCodes)
  })()

  pushEvent(session, ASSESSMENT_EVENTS.RECOMMENDATION_GENERATED, {
    reasonCodes: orderedCodes,
    primaryAction: policyRec.primary_action,
  })

  const result = {
    completedAt: nowIso,
    stoppedEarly: !!session.stoppedEarly,
    questionsAsked: session.questionsAsked,
    objectiveBand: band,
    skills: session.skills,
    skillView,
    primaryWeakness,
    primaryStrength,
    explanationKey: policyRec.explanation_key,
    reasonCodes: orderedCodes,
    primaryReason: orderedCodes[0] || null,
    recommendation: policyRec,
    review: reviewSnap,
    weakAyahs: weakAyahNumbers(session.responses),
    progressItems: toProgressPayload(masteryMap, verseKeys),
    events: session.events,
    // Snapshot for hybrid server persistence
    snapshot: {
      assessment_id: session.id,
      source_session_id: session.sourceSessionId,
      recommendation_id: session.recommendationId,
      result: band,
      summary: null,
      skills: session.skills,
      skill_view: skillView,
      reason_codes: orderedCodes,
      responses: session.responses.map((r) => ({
        questionId: r.questionId,
        verseKey: r.verseKey,
        type: r.type,
        difficulty: r.difficulty,
        correct: r.correct,
        partial: r.partial,
        usedHint: r.usedHint,
        responseMs: r.responseMs,
        similarity: r.similarity,
      })),
      events: session.events,
      review: reviewSnap,
      policy: {
        goal: policyRec.goal,
        primary_action: policyRec.primary_action,
        explanation_key: policyRec.explanation_key,
        settings: policyRec.settings,
        evidence_codes: orderedCodes,
      },
      weak_ayahs: weakAyahNumbers(session.responses),
      assessed_at: nowIso,
    },
  }

  session.status = 'completed'
  session.result = result
  session.currentQuestion = null
  session.updatedAt = nowIso
  pushEvent(session, ASSESSMENT_EVENTS.ASSESSMENT_COMPLETED, {
    band,
    questionsAsked: session.questionsAsked,
    stoppedEarly: session.stoppedEarly,
  })
  persistAssessmentSession(session)
  return session
}

function extractAiFromResponses(responses) {
  const aiItems = (responses || []).filter((r) => r.aiResult)
  if (!aiItems.length) return null
  const last = aiItems[aiItems.length - 1]
  return {
    result: last.aiResult?.result || (last.correct ? 'strong' : last.partial ? 'mixed' : 'weak'),
    missed_words: last.aiResult?.omissions || last.aiResult?.missed_words || 0,
    pronunciation_issues: !!last.aiResult?.pronunciation_issues || !!last.aiResult?.hesitation,
    hesitation: last.aiResult?.hesitation ? 1 : 0,
  }
}

function weakAyahNumbers(responses) {
  const counts = new Map()
  for (const r of responses || []) {
    if (r.correct) continue
    const ayah = Number(String(r.verseKey || '').split(':')[1] || 0)
    if (!ayah) continue
    counts.set(ayah, (counts.get(ayah) || 0) + 1)
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([ayah]) => ayah)
}

/**
 * Build the beginner-friendly result view model for the completion modal.
 * Avoids making a generic percentage the main result.
 *
 * @param {object} session
 * @param {(key: string, params?: object) => string} [t]
 */
export function buildAssessmentResultViewModel(session, t = null) {
  const result = session?.result
  if (!result) return null

  const translate = (key, fallback, params) => {
    if (!t) return fallback
    const value = t(`memorisation.postSession.adaptiveCheck.${key}`, params)
    if (!value || value.includes('adaptiveCheck.')) return fallback
    return value
  }

  const weaknessLabel = translate(
    `skills.${result.primaryWeakness?.key}`,
    labelForSkill(result.primaryWeakness?.key),
  )
  const strengthLabel = translate(
    `skills.${result.primaryStrength?.key}`,
    labelForSkill(result.primaryStrength?.key),
  )

  const explanation = translate(
    `explanations.${result.explanationKey}`,
    defaultExplanation(result),
  )

  const nextStep = translate(
    `nextSteps.${result.recommendation?.primary_action}`,
    defaultNextStep(result.recommendation?.primary_action),
  )

  const headlineKey = result.objectiveBand === 'strong'
    ? 'resultTitleStrong'
    : result.objectiveBand === 'weak'
      ? 'resultTitleWeak'
      : 'resultTitleMixed'
  const headline = translate(
    headlineKey,
    result.objectiveBand === 'strong'
      ? 'Looking good'
      : result.objectiveBand === 'weak'
        ? 'Needs another short review'
        : 'A little more practice will help',
  )

  const weakAyahs = Array.isArray(result.weakAyahs) ? result.weakAyahs.filter(Boolean) : []
  let detail = explanation
  if (weakAyahs.length === 1) {
    detail = translate(
      'resultWhyWeakAyah',
      `Verse ${weakAyahs[0]} needs the most attention.`,
      { ayah: weakAyahs[0] },
    )
  } else if (weakAyahs.length > 1) {
    detail = translate(
      'resultWhyWeakAyahs',
      `A few verses still need support.`,
      { ayahs: weakAyahs.slice(0, 3).join(', '), count: weakAyahs.length },
    )
  } else if (result.primaryWeakness?.band === 'developing' && weaknessLabel) {
    detail = translate(
      'resultWhyWeakness',
      `${weaknessLabel} still needs support.`,
      { skill: weaknessLabel },
    )
  }

  const responses = Array.isArray(result.snapshot?.responses)
    ? result.snapshot.responses
    : []
  const correctCount = responses.filter((r) => r.correct).length
  const partialCount = responses.filter((r) => !r.correct && r.partial).length
  const missedCount = Math.max(0, responses.length - correctCount - partialCount)
  const asked = Number(result.questionsAsked || responses.length || 0)
  const scoreLine = asked > 0
    ? translate(
      'resultScoreLine',
      `{correct} of {total} answered well`,
      { correct: correctCount, total: asked, partial: partialCount, missed: missedCount },
    )
    : ''

  const skillRows = (result.skillView || []).map((s) => ({
    ...s,
    label: translate(`skills.${s.key}`, labelForSkill(s.key)),
    bandLabel: translate(`bands.${s.band}`, s.band),
  }))

  // One short plain summary — no technique jargon dashboard.
  const summary = [detail, nextStep].filter(Boolean).join(' ')

  return {
    headline,
    skillView: skillRows,
    explanation,
    nextStep,
    summary,
    why: detail,
    how: scoreLine,
    should: nextStep,
    strengthLabel,
    weaknessLabel,
    primaryAction: result.recommendation?.primary_action || 'continue',
    primaryActionLabelKey: result.recommendation?.primary_action_label_key || 'continue',
    reasonCodes: result.reasonCodes || [],
    objectiveBand: result.objectiveBand,
    weakAyahs,
    stoppedEarly: !!result.stoppedEarly,
    questionsAsked: asked,
    quizStats: {
      asked,
      correct: correctCount,
      partial: partialCount,
      missed: missedCount,
      scoreLine,
    },
    reviewIntervalDays: result.review?.intervalDays ?? null,
    recommendation: result.recommendation,
    snapshot: result.snapshot,
    progressItems: result.progressItems,
  }
}

function labelForSkill(key) {
  switch (key) {
    case 'recall': return 'Remembering the words'
    case 'ayahSequence': return 'Keeping the order'
    case 'textualPrecision': return 'Getting the words right'
    case 'independentRecitation': return 'Reciting without help'
    default: return key || ''
  }
}

function defaultExplanation(result) {
  if (result.objectiveBand === 'strong') {
    return 'This range feels steady.'
  }
  if (result.objectiveBand === 'weak') {
    return 'This range still needs a calm pass.'
  }
  return 'You are close — a little more support will help.'
}

function defaultNextStep(action) {
  switch (action) {
    case 'repeat_weak_ayahs': return 'Repeat the harder verses with more support.'
    case 'start_focused_review': return 'Do a short focused review.'
    case 'review_tomorrow': return 'Come back for a short review tomorrow.'
    default: return 'Continue to the next set.'
  }
}

export const AdaptiveAssessmentService = {
  createAssessmentSession,
  persistAssessmentSession,
  loadAssessmentSession,
  clearAssessmentSession,
  startAdaptiveCheck,
  presentNextQuestion,
  answerCurrentQuestion,
  requestHint,
  pauseAssessment,
  resumeAssessment,
  completeAssessment,
  buildAssessmentResultViewModel,
}

export default AdaptiveAssessmentService
