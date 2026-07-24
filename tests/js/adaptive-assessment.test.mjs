import assert from 'node:assert/strict'
import {
  ASSESSMENT_LIMITS,
  ASSESSMENT_REASON_CODES,
  DIFFICULTY,
  QUESTION_TYPES,
} from '../../resources/js/scripts/assessment/constants.js'
import {
  buildDistractors,
  validateUniqueCorrect,
  scoreOpenAnswer,
  scoreOrdering,
  normalizeQuranText,
} from '../../resources/js/scripts/assessment/QuestionValidationService.js'
import {
  selectNextQuestion,
  prioritiseVerses,
} from '../../resources/js/scripts/assessment/QuestionSelectionService.js'
import {
  scoreItemResponse,
  nextDifficulty,
  shouldStopEarly,
  detectReasonCodes,
  objectiveBand,
  updateSkillEstimates,
} from '../../resources/js/scripts/assessment/AssessmentScoringService.js'
import {
  resolveConflictCodes,
  buildPolicyRecommendation,
  sanitizeApprovedSettings,
  selectPrimaryReason,
} from '../../resources/js/scripts/assessment/RecommendationPolicyService.js'
import { scheduleReview } from '../../resources/js/scripts/assessment/ReviewSchedulingService.js'
import {
  applyAssessmentToMastery,
  createDefaultMastery,
  applySkillUpdate,
} from '../../resources/js/scripts/assessment/LearnerMasteryService.js'
import {
  computeDeltas,
  recordEffectiveness,
  loadEffectivenessState,
  saveEffectivenessState,
} from '../../resources/js/scripts/assessment/RecommendationEffectivenessService.js'
import {
  startAdaptiveCheck,
  answerCurrentQuestion,
  completeAssessment,
  buildAssessmentResultViewModel,
} from '../../resources/js/scripts/assessment/AdaptiveAssessmentService.js'
import { adaptRecommendationForAdaptiveAssessment } from '../../resources/js/scripts/recommendations/nextSessionRecommendation.js'
import {
  COMPLETION_FLOW,
  deriveCompletionFlowPhase,
  shouldHideCompletionUnderAi,
} from '../../resources/js/scripts/session/completionFlow.js'

const FATIHA = [
  { key: '1:1', surah: 1, ayah: 1, arabic: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surahName: 'Al-Fatihah' },
  { key: '1:2', surah: 1, ayah: 2, arabic: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', surahName: 'Al-Fatihah' },
  { key: '1:3', surah: 1, ayah: 3, arabic: 'الرَّحْمَٰنِ الرَّحِيمِ', surahName: 'Al-Fatihah' },
  { key: '1:4', surah: 1, ayah: 4, arabic: 'مَالِكِ يَوْمِ الدِّينِ', surahName: 'Al-Fatihah' },
  { key: '1:5', surah: 1, ayah: 5, arabic: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', surahName: 'Al-Fatihah' },
]

const memory = new Map()
globalThis.__MUTQIN_STORAGE_BRIDGE__ = {
  getItem: (key) => (memory.has(key) ? memory.get(key) : null),
  setItem: (key, value) => { memory.set(key, String(value)) },
  removeItem: (key) => { memory.delete(key) },
}

function seededRng(seed = 1) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

{
  // Verified distractors: unique correct, no duplicates
  const built = buildDistractors({
    correct: 'اللَّهِ',
    poolTexts: FATIHA.map((v) => v.arabic),
    mode: 'token',
    count: 4,
    rng: seededRng(3),
  })
  assert.equal(built.valid, true)
  const validation = validateUniqueCorrect(built.options, normalizeQuranText('اللَّهِ'))
  assert.equal(validation.valid, true)
  assert.equal(validation.correctIndex, built.correctIndex)
}

{
  // Ambiguous / duplicate distractors rejected
  const dup = validateUniqueCorrect(['الحمد', 'الحمد', 'رب'], 'الحمد')
  assert.equal(dup.valid, false)
  assert.equal(dup.reason, 'duplicate_option')
}

{
  // Open answer scoring from verified text
  const exact = scoreOpenAnswer('الحمد لله رب العالمين', 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ')
  assert.equal(exact.correct, true)
  const partial = scoreOpenAnswer('الحمد لله', 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ')
  assert.equal(partial.partial || partial.similarity > 0.4, true)
}

{
  // Ordering
  const scored = scoreOrdering(['a', 'b', 'c'], ['a', 'b', 'c'])
  assert.equal(scored.correct, true)
  const wrong = scoreOrdering(['b', 'a', 'c'], ['a', 'b', 'c'])
  assert.equal(wrong.correct, false)
  assert.ok(wrong.similarity < 1)
}

{
  // Weak ayah selection priority
  const ordered = prioritiseVerses(FATIHA, {
    sessionWeakAyahs: [5],
    masteryByKey: {
      '1:5': { recallMastery: 0.2 },
      '1:1': { recallMastery: 0.9 },
    },
    sessionRange: { surah: 1, from: 1, to: 5 },
  })
  assert.equal(ordered[0].ayah, 5)
}

{
  // Question generation from verified pool
  const q = selectNextQuestion({
    verses: FATIHA,
    difficulty: DIFFICULTY.RECOGNITION,
    type: QUESTION_TYPES.MISSING_WORD_OPTIONS,
    rng: seededRng(11),
  })
  assert.ok(q)
  assert.equal(q.renderer, 'mcq')
  assert.ok(Array.isArray(q.options) && q.options.length >= 2)
  assert.ok(q.correctAnswer)
}

{
  // Adaptive difficulty changes
  const correctFast = scoreItemResponse(
    { renderer: 'mcq', correctIndex: 1, correctAnswer: 'x', skills: ['phraseRecall'] },
    { answer: 1, responseMs: 2000 },
  )
  assert.equal(nextDifficulty(2, correctFast), 3)

  const correctHint = scoreItemResponse(
    { renderer: 'mcq', correctIndex: 1, correctAnswer: 'x', skills: ['phraseRecall'] },
    { answer: 1, usedHint: true, responseMs: 2000 },
  )
  assert.equal(nextDifficulty(2, correctHint), 2)

  const incorrect = scoreItemResponse(
    { renderer: 'mcq', correctIndex: 1, correctAnswer: 'x', skills: ['phraseRecall'] },
    { answer: 0, responseMs: 2000 },
  )
  assert.equal(nextDifficulty(2, incorrect), 1)
}

{
  // Early stopping
  const strong = Array.from({ length: 3 }, () => ({ correct: true, usedHint: false, slow: false }))
  assert.equal(shouldStopEarly({
    responses: strong,
    skills: { phraseRecall: 0.9, ayahSequence: 0.9, textualPrecision: 0.9, independence: 0.9 },
    questionCount: 3,
  }), true)

  assert.equal(shouldStopEarly({
    responses: strong.slice(0, 2),
    skills: { phraseRecall: 0.9 },
    questionCount: 2,
  }), false)
}

{
  // Conflict: confident + weak objective → overconfidence, not advance
  const codes = resolveConflictCodes(
    [ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE, ASSESSMENT_REASON_CODES.LOW_RECALL],
    { confidence: 'confident', objectiveBand: 'weak' },
  )
  assert.ok(codes.includes(ASSESSMENT_REASON_CODES.OVERCONFIDENCE))
  assert.ok(!codes.includes(ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE))

  // Needs practice + strong → confidence building, not full low-recall repeat
  const soft = resolveConflictCodes(
    [ASSESSMENT_REASON_CODES.LOW_RECALL, ASSESSMENT_REASON_CODES.LOW_CONFIDENCE],
    { confidence: 'needs_practice', objectiveBand: 'strong' },
  )
  assert.ok(soft.includes(ASSESSMENT_REASON_CODES.LOW_CONFIDENCE))
  assert.ok(!soft.includes(ASSESSMENT_REASON_CODES.LOW_RECALL))
}

{
  // Incomplete session reason
  const codes = detectReasonCodes({ incomplete: true, skills: {} })
  assert.ok(codes.includes(ASSESSMENT_REASON_CODES.SESSION_INCOMPLETE))
}

{
  // Recommendation mappings stay on approved settings
  const policy = buildPolicyRecommendation({
    reasonCodes: [ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS],
    objectiveBand: 'weak',
  })
  assert.equal(policy.goal, 'reinforce')
  assert.equal(policy.settings.technique, 'chaining')
  assert.equal(policy.settings.chaining_enabled, true)
  const sanitized = sanitizeApprovedSettings({
    technique: 'invented',
    playback_speed: 9,
    repetitions: 99,
  })
  assert.equal(sanitized.technique, undefined)
  assert.ok(sanitized.playback_speed <= 1.5)
  assert.ok(sanitized.repetitions <= 8)
}

{
  // Spoken weak + text strong → spoken hesitation
  const codes = resolveConflictCodes([], {
    confidence: 'confident',
    objectiveBand: 'mixed',
    textStrong: true,
    spokenWeak: true,
  })
  assert.ok(codes.includes(ASSESSMENT_REASON_CODES.SPOKEN_HESITATION))
}

{
  // Review scheduling shortens on low delayed retention
  const early = scheduleReview(0.3, [ASSESSMENT_REASON_CODES.LOW_DELAYED_RETENTION])
  assert.equal(early.intervalDays, 1)
  const later = scheduleReview(0.9, [ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE])
  assert.ok(later.intervalDays >= 3)
}

{
  // Mastery updates keep independent skills + evidence
  let map = {}
  map = applyAssessmentToMastery(map, {
    responses: [{ verseKey: '1:2', correct: false, question: { type: 'missing_word_options', difficulty: 1 } }],
    skills: { phraseRecall: 0.2, ayahSequence: 0.8, textualPrecision: 0.4, independence: 0.3 },
    reasonCodes: [ASSESSMENT_REASON_CODES.LOW_RECALL],
    nowIso: '2026-07-23T12:00:00.000Z',
  })
  assert.ok(map['1:2'])
  assert.ok(map['1:2'].recallMastery < 0.5)
  assert.ok(map['1:2'].sequenceMastery > map['1:2'].recallMastery)
  assert.ok(Array.isArray(map['1:2'].evidence) && map['1:2'].evidence.length === 1)
}

{
  // Effectiveness ranks techniques
  memory.clear()
  saveEffectivenessState({ techniqueScores: {}, history: [] })
  recordEffectiveness({
    technique: 'talqin',
    accepted: true,
    priorSkills: { phraseRecall: 0.4 },
    newSkills: { phraseRecall: 0.7 },
    priorHints: 4,
    newHints: 1,
  })
  const state = loadEffectivenessState()
  assert.ok(state.techniqueScores.talqin > 0)

  recordEffectiveness({
    technique: 'blur',
    accepted: false,
    adjusted: true,
    priorSkills: { phraseRecall: 0.7 },
    newSkills: { phraseRecall: 0.5 },
  })
  const after = loadEffectivenessState()
  assert.ok(after.techniqueScores.blur < 0)
}

{
  // Combined adaptive loop: start → answer → maybe early complete
  memory.clear()
  let session = startAdaptiveCheck({
    verses: FATIHA,
    sessionContext: { range: { surah: 1, from: 1, to: 5 } },
    rng: seededRng(42),
  })
  assert.equal(session.status, 'active')
  assert.ok(session.currentQuestion)
  assert.equal(session.difficulty, ASSESSMENT_LIMITS.START_DIFFICULTY)

  // Answer correctly without hints a few times
  for (let i = 0; i < 4 && session.status === 'active'; i += 1) {
    const q = session.currentQuestion
    let answer = q.correctAnswer
    if (q.renderer === 'mcq' || q.renderer === 'mcq_simple') answer = q.correctIndex
    if (q.renderer === 'ordering') answer = q.expectedOrder
    session = answerCurrentQuestion(session, {
      answer,
      usedHint: false,
      responseMs: 1500,
      rng: seededRng(100 + i),
    })
  }

  if (session.status !== 'completed') {
    session = completeAssessment(session, { confidence: 'confident' })
  }
  assert.equal(session.status, 'completed')
  assert.ok(session.result)
  assert.ok(session.result.skillView.length === 4)
  assert.ok(session.result.snapshot.reason_codes.length >= 1)
  assert.ok(['strong', 'mixed', 'weak'].includes(session.result.objectiveBand))
  // No bare percentage as the main result payload
  assert.equal(session.result.accuracyPercent, undefined)

  const view = buildAssessmentResultViewModel(session, (key) => key)
  assert.ok(view.why)
  assert.ok(view.summary)
  assert.ok(view.should)
}

{
  // AI Recite + quiz combined evidence via skills
  let skills = {
    phraseRecall: 0.8,
    textualPrecision: 0.85,
    spokenRecall: 0.5,
    fluency: 0.5,
    independence: 0.5,
  }
  const aiQuestion = {
    skills: ['spokenRecall', 'fluency', 'independence'],
    requiresAiRecite: true,
    renderer: 'ai_recite',
  }
  const scored = scoreItemResponse(aiQuestion, {
    aiResult: { result: 'weak', hesitation: true },
    responseMs: 5000,
  })
  skills = updateSkillEstimates(skills, aiQuestion, scored)
  assert.ok(skills.spokenRecall < 0.5)
  const band = objectiveBand(skills)
  assert.ok(['mixed', 'weak'].includes(band))
}

{
  // Frontend recommendation merge — weak check keeps completed range (max 3)
  const base = {
    id: 9,
    type: 'continue',
    ayah_range: { from: 6, to: 8, count: 3 },
    settings: { technique: 'talqin', playback_speed: 1, repetitions: 3 },
  }
  const policy = buildPolicyRecommendation({
    reasonCodes: [ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY],
    objectiveBand: 'weak',
    baseRecommendation: base,
  })
  const merged = adaptRecommendationForAdaptiveAssessment(base, policy, {
    objectiveBand: 'weak',
    rangeStart: 3,
    rangeEnd: 5,
  })
  assert.equal(merged.id, 9)
  assert.equal(merged.settings.blur_enabled, true)
  assert.ok(merged.evidence_codes.includes(ASSESSMENT_REASON_CODES.VISUAL_DEPENDENCY))
  assert.equal(merged.type, 'repeat_current_range')
  assert.equal(merged.ayah_range.from, 3)
  assert.equal(merged.ayah_range.to, 5)
  assert.ok((merged.ayah_range.to - merged.ayah_range.from + 1) <= 3)
}

{
  // Completion flow hides under adaptive check
  const phase = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionAdaptiveCheckActive: true,
    postSessionAdaptiveCheckResult: false,
  })
  assert.equal(phase, COMPLETION_FLOW.ADAPTIVE_CHECK)
  assert.equal(shouldHideCompletionUnderAi(phase), true)

  const resultPhase = deriveCompletionFlowPhase({
    showPostSessionModal: true,
    postSessionAdaptiveCheckActive: true,
    postSessionAdaptiveCheckResult: true,
  })
  assert.equal(resultPhase, COMPLETION_FLOW.ADAPTIVE_CHECK_RESULT)
}

{
  // Primary reason selection priority
  assert.equal(
    selectPrimaryReason([
      ASSESSMENT_REASON_CODES.HIGH_PERFORMANCE,
      ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS,
    ]),
    ASSESSMENT_REASON_CODES.SEQUENCE_ERRORS,
  )
}

{
  // applySkillUpdate preserves bounded 0–1 values
  const updated = applySkillUpdate(createDefaultMastery('1:1'), {
    verseKey: '1:1',
    skills: { phraseRecall: 1.5, ayahSequence: -2 },
  })
  assert.ok(updated.recallMastery <= 1)
  assert.ok(updated.sequenceMastery >= 0)
}

{
  // Deltas helper
  const deltas = computeDeltas({
    priorSkills: { phraseRecall: 0.4 },
    newSkills: { phraseRecall: 0.8 },
    priorHints: 5,
    newHints: 1,
    priorAiBand: 'weak',
    newAiBand: 'strong',
  })
  assert.ok(deltas.overall > 0)
  assert.ok(deltas.hintReduction === 4)
}

// Clean up shared storage bridge so other test processes aren't affected when run in-band.
try {
  delete globalThis.__MUTQIN_STORAGE_BRIDGE__
} catch {
  /* ignore */
}

console.log('adaptive-assessment tests passed')
