import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  RECOMMENDATION_TYPES,
  adaptRecommendationForAiAssessment,
  adaptRecommendationForConfidence,
  buildLocalFallbackRecommendation,
  formatAyahRangeLabel,
  formatRecommendationSettingsSummary,
  isActionableRecommendation,
  isRepeatRecommendation,
  localizeRecommendationReason,
  recommendationModeLabelKey,
  recommendationPrimaryActionKey,
  buildCombinedCheckInsight,
  buildFocusedPracticeRange,
  estimatePracticeMinutes,
  buildPersonalPracticePlan,
  adaptRecommendationForAdaptiveAssessment,
} from '../../resources/js/scripts/recommendations/nextSessionRecommendation.js'

function t(key, params = {}) {
  if (key.endsWith('ayahRange') || key.endsWith('.ayahs')) return `Ayahs ${params.start}–${params.end}`
  if (key.endsWith('singleAyah') || key.endsWith('.ayah')) return `Ayah ${params.ayah}`
  if (key.includes('continueCurrentSurah') || key.includes('continueWhileFresh') || key.includes('simpleContinue')) {
    return `Continue while this range is still fresh.`
  }
  if (key.includes('combinedContinueBothOrder')) {
    return 'Nice work. Next verses — keep the order steady.'
  }
  if (key.includes('planDetail.aboutMinutes')) return `About ${params.minutes} minutes`
  if (key.includes('planDetail.focusOne')) return `Focus on ayah ${params.ayah}`
  if (key.includes('planDetail.focusMany')) return `Focus on ayahs ${params.ayahs}`
  if (key.includes('planDetail.ayahRange')) return `Ayahs ${params.start}–${params.end}`
  if (key.includes('planDetail.singleAyah')) return `Ayah ${params.ayah}`
  if (key.includes('planDetail.whyForYou')) return 'Why this for you'
  if (key.includes('combinedContinueBoth')) {
    return 'Your checks look ready. Next verses while this still feels fresh.'
  }
  if (key.includes('combinedContinueOne')) {
    return 'Nice work. Next verses while this still feels fresh.'
  }
  if (key.includes('combinedRepeatWeakAyah') && !key.includes('Ayahs')) {
    return `Verse ${params.ayah} still feels tricky. We will practise these verses again.`
  }
  if (key.includes('combinedRepeatWeakAyahs')) {
    return 'Some verses still need help. We will practise this set again.'
  }
  if (key.includes('confidenceNeedsPractice')) {
    return 'You asked for more practice, so we will go over these verses again more slowly.'
  }
  if (key.includes('confidenceConfident')) {
    return 'You feel ready — we will move on while these verses are still fresh.'
  }
  if (key.includes('combinedFromBothChecks')) return 'From your checks'
  if (key.includes('checkAnswerQuizWeak')) return 'Needs practice'
  if (key.includes('checkAnswerQuizMixed')) return 'Okay'
  if (key.includes('checkAnswerQuizStrong')) return 'Looking good'
  if (key.includes('surahCompleted')) return `Completed ${params.surah}.`
  if (key.includes('techniqueDisplay.talqin') || key.endsWith('talqinShort') || key.endsWith('talqin.label') || key.endsWith('talqin.short')) {
    return 'Listen and repeat (Talqin)'
  }
  if (key.endsWith('repetitionCountOne') || key.endsWith('repetitionsSummaryOne')) return `${params.count} repetition`
  if (key.endsWith('repetitionCountOther') || key.endsWith('repetitionsSummary') || key.endsWith('repetitionsSummaryOther')) {
    return `${params.count} repetitions`
  }
  return key
}

{
  const continueRec = {
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    range_kind: 'new',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 15, to: 17, count: 3 },
    reason_code: 'continue_while_fresh',
    settings: { technique: 'talqin', reciter: 'ar.alafasy', playback_speed: 1, repetitions: 3 },
  }
  assert.equal(isActionableRecommendation(continueRec), true)
  assert.equal(recommendationPrimaryActionKey(continueRec), 'continueToAyat')
  assert.equal(recommendationModeLabelKey(continueRec), 'modeNewLearning')
  assert.equal(formatAyahRangeLabel(continueRec.ayah_range, t), 'Ayahs 15–17')
  assert.match(localizeRecommendationReason(continueRec, t), /fresh/)
  assert.match(
    formatRecommendationSettingsSummary(continueRec.settings, t, { reciterName: 'Alafasy' }),
    /Listen and repeat \(Talqin\) · Alafasy · 1× · 3 repetitions/
  )
}

{
  // Truncated payloads (columns only) must still be actionable.
  assert.equal(isActionableRecommendation({
    type: 'complete_surah',
    surah_number: 112,
    ayah_range: { from: 4, to: 4, count: 1 },
    user_reason: 'You completed this range smoothly. This plan moves forward with light Blur practice rather than extra repetition.',
  }), true)
  assert.equal(isActionableRecommendation({
    type: 'complete_surah',
    user_reason: 'You completed this range smoothly. This plan moves forward with light Blur practice rather than extra repetition.',
  }), false)
}

{
  const revision = {
    type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
    session_mode: 'revision',
    range_kind: 'repeated',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 12, to: 14, count: 3 },
    reason_code: 'confidence_needs_practice',
  }
  assert.equal(isRepeatRecommendation(revision), true)
  assert.equal(recommendationPrimaryActionKey(revision), 'repeatThisSession')
  assert.equal(recommendationModeLabelKey(revision), 'modeRepeated')
}

{
  const nextSurah = {
    type: RECOMMENDATION_TYPES.NEXT_SURAH,
    session_mode: 'new_learning',
    surah: { id: 2, name: 'Al-Baqarah' },
    next_surah: { id: 2, name: 'Al-Baqarah' },
    completed_surah: { id: 1, name: 'Al-Fatihah' },
    reason_code: 'surah_completed',
    is_end_of_surah: true,
  }
  assert.equal(recommendationPrimaryActionKey(nextSurah), 'continueToNextSurah')
  assert.match(localizeRecommendationReason(nextSurah, t), /Al-Fatihah/)
}

{
  const manual = buildLocalFallbackRecommendation({})
  assert.equal(manual.type, RECOMMENDATION_TYPES.MANUAL_SELECTION)
  assert.equal(isActionableRecommendation(manual), false)
}

{
  const next = buildLocalFallbackRecommendation({
    chapterId: 2,
    chapterName: 'Al-Baqarah',
    rangeStart: 12,
    rangeEnd: 14,
    totalAyahsInSurah: 286,
    completedAll: true,
  })
  assert.equal(next.type, RECOMMENDATION_TYPES.CONTINUE)
  assert.equal(next.ayah_range.from, 15)
  assert.equal(next.ayah_range.to, 17)
  assert.equal(next.primary_action_label_key, 'continueToAyat')
}

{
  const end = buildLocalFallbackRecommendation({
    chapterId: 1,
    chapterName: 'Al-Fatihah',
    rangeStart: 5,
    rangeEnd: 7,
    totalAyahsInSurah: 7,
    completedAll: true,
  })
  assert.equal(end.type, RECOMMENDATION_TYPES.NEXT_SURAH)
  assert.equal(end.is_end_of_surah, true)
  assert.equal(end.next_surah.id, 114)
  assert.equal(end.surah.id, 114)
  assert.equal(end.ayah_range.from, 1)
}

{
  // After An-Nas, continue Juz ʿAmma with a small Al-Falaq opening — not plan-complete.
  const afterNas = buildLocalFallbackRecommendation({
    chapterId: 114,
    chapterName: 'An-Nas',
    rangeStart: 1,
    rangeEnd: 6,
    totalAyahsInSurah: 6,
    completedAll: true,
  })
  assert.equal(afterNas.type, RECOMMENDATION_TYPES.NEXT_SURAH)
  assert.equal(afterNas.next_surah.id, 113)
  assert.equal(afterNas.ayah_range.from, 1)
  assert.ok(afterNas.ayah_range.to <= 4)
  assert.equal(isActionableRecommendation(afterNas), true)

  const planComplete = {
    id: 99,
    type: RECOMMENDATION_TYPES.PLAN_COMPLETE,
    surah: { id: 114, name: 'An-Nas' },
    ayah_range: null,
    is_end_of_surah: true,
  }
  const promoted = adaptRecommendationForConfidence(planComplete, 'confident', {
    chapterId: 114,
    chapterName: 'An-Nas',
    rangeStart: 1,
    rangeEnd: 6,
    totalAyahsInSurah: 6,
  })
  assert.equal(promoted.type, RECOMMENDATION_TYPES.NEXT_SURAH)
  assert.equal(promoted.next_surah.id, 113)
  assert.equal(promoted.ayah_range.to, 3)
  assert.equal(isActionableRecommendation(promoted), true)
}

{
  const endRepeat = {
    id: 11,
    type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
    session_mode: 'revision',
    range_kind: 'repeated',
    surah: { id: 1, name: 'Al-Fatihah' },
    ayah_range: { from: 1, to: 7, count: 7 },
    reason_code: 'confidence_needs_practice',
    settings: { technique: 'talqin', playback_speed: 0.75, repetitions: 4 },
  }
  const afterConfident = adaptRecommendationForConfidence(endRepeat, 'confident', {
    chapterId: 1,
    chapterName: 'Al-Fatihah',
    rangeStart: 1,
    rangeEnd: 7,
    totalAyahsInSurah: 7,
  })
  assert.equal(afterConfident.type, RECOMMENDATION_TYPES.NEXT_SURAH)
  assert.equal(afterConfident.next_surah.id, 114)
  assert.equal(afterConfident.ayah_range.from, 1)

  const afterStrongAi = adaptRecommendationForAiAssessment(endRepeat, 'strong', {
    chapterId: 1,
    rangeStart: 1,
    rangeEnd: 7,
    totalAyahsInSurah: 7,
  })
  assert.equal(afterStrongAi.type, RECOMMENDATION_TYPES.NEXT_SURAH)
  assert.equal(afterStrongAi.next_surah.id, 114)
}

{
  const root = path.resolve('resources/js')
  const vue = await fs.readFile(path.join(root, 'views/Memorisation.vue'), 'utf8')
  const js = await fs.readFile(path.join(root, 'views/Memorisation.js'), 'utf8')
  const css = await fs.readFile(path.join(root, 'views/Memorisation.css'), 'utf8')
  assert.match(vue, /Teleport to="body"/)
  assert.match(vue, /post-session-simple/)
  assert.doesNotMatch(vue, /post-session-simple__confidence/, 'confidence Step 2 removed from completion UI')
  assert.doesNotMatch(vue, /submitPostSessionConfidence/, 'confidence CTA removed from completion UI')
  assert.match(vue, /ps-plan__chip|post-session-simple__pill/)
  assert.match(vue, /postSessionStatsExpanded/)
  assert.match(vue, /postSessionStatsSummary/)
  assert.match(vue, /adjustPlan/)
  assert.match(vue, /openPostSessionAdjustPlan/)
  assert.match(vue, /ps-plan__adjust|post-session-simple__adjust-link/)
  assert.match(vue, /ps-plan__why|post-session-simple__reason/)
  assert.match(vue, /postSessionWhyDisclosureText|ps-plan__why/)
  assert.match(vue, /suggestedNextStep/)
  assert.match(vue, /startDifferentSession/)
  assert.match(vue, /post-session-simple--builder-open/)
  assert.doesNotMatch(vue, /SESSION COMPLETE|Alhamdulillah/)
  assert.doesNotMatch(vue, /post-session-chip/)
  assert.doesNotMatch(vue, /post-session-inline-select/)
  assert.doesNotMatch(vue, /postSessionWhyLabel/, 'always-visible why label removed')
  assert.doesNotMatch(vue, /post-session-simple__ai-metrics/, 'AI section stays one-line — no metrics dashboard')
  assert.doesNotMatch(vue, /tryThisCombination/, 'Practice style label removed from plan card')
  assert.match(vue, /startPostSessionAdaptiveCheck/)
  assert.match(vue, /ps-quiz/)
  assert.match(vue, /ps-quiz__cta/)
  assert.match(vue, /post-session-simple__stack/)
  assert.match(vue, /adaptiveCheck\.memoryCheckTitle|memoryCheckTitle|startPostSessionAdaptiveCheck/)
  assert.match(vue, /startPostSessionAdaptiveCheck/)
  assert.match(vue, /adaptiveCheck\.memoryCheckCta|memoryCheckCta|ps-quiz__cta/)
  assert.match(vue, /ps-plan__value|practiceApproach/)
  assert.match(vue, /ps-plan/)
  assert.match(vue, /@click="openPostSessionAiRecite"/, 'AI Recite remains available as Or recite aloud')
  assert.match(vue, /voiceOnlyCta|ps-quiz__voice/)
  assert.match(vue, /aiReciteTitle/)
  assert.doesNotMatch(vue, /plan-tech-list/, 'techniques render as one practice approach, not peer cards')
  assert.match(js, /buildCombinedCheckInsight/)
  assert.match(js, /submitRecommendationConfidence/)
  assert.match(js, /submitPostSessionConfidence/)
  assert.match(js, /openPostSessionNewSessionOffcanvas/)
  assert.match(js, /exitOnboardingSampleMode/)
  assert.match(js, /onboardingSampleSessionActive && !options\.sampleSession/)
  assert.match(js, /sampleSession:\s*keepSample/)
  assert.match(js, /adaptRecommendationForAiAssessment/)
  assert.match(js, /adaptRecommendationForAdaptiveAssessment/)
  assert.match(js, /startPostSessionAdaptiveCheck/)
  assert.match(js, /openPostSessionAiRecite/)
  assert.match(js, /submitRecommendationAdaptiveAssessment/)
  assert.match(js, /selectAdaptiveOption/)
  assert.match(js, /buildPostSessionAiReviewDetails/)
  assert.match(js, /buildAiReviewDetails/)
  assert.match(js, /postSessionAiReviewDetails/)
  assert.match(js, /summaryLine/)
  assert.match(vue, /ps-plan__title|post-session-simple__plan-copy/)
  assert.doesNotMatch(
    vue,
    /post-session-simple__plan-start/,
    'plan card must not duplicate the footer primary CTA'
  )
  assert.match(vue, /openPostSessionRecommendationConfirm/)
  assert.match(
    css,
    /\.post-session-simple__dialog[\s\S]*?width:\s*min\(52rem/,
    'success modal should be wider for cleaner whitespace'
  )
  assert.match(vue, /data-plan="postSessionPlanKind"|:data-plan="postSessionPlanKind"/)
  assert.match(js, /postSessionPlanKind\(\)/)
  assert.match(css, /\.ps-plan|post-session-simple__plan-glow/)
  assert.match(css, /\.ps-quiz/)
  assert.match(css, /post-session-check-note-in|post-session-insight-in/)
  assert.match(css, /\.ps-plan/)
  assert.match(css, /\.ps-plan__body/)
  assert.match(js, /openPostSessionAdjustPlan/)
  assert.match(js, /postSessionViewState/)
  assert.match(js, /deriveCompletionFlowPhase/)
  assert.match(js, /resolveConfidenceSelection/)
  assert.match(js, /adaptRecommendationForConfidence/)
  assert.doesNotMatch(js, /buildAdaptationExplanations/)
  assert.match(js, /aiReciteOffline/)
  assert.match(vue, /quizAiTitle|ps-quiz|postSessionMemoryCheck/)
  assert.match(js, /buildCompletionPerformancePayload/)
  assert.match(js, /postSessionShowRepeatAction\(\)[\s\S]*return false/)
  assert.match(js, /postSessionStaticPills/)
  assert.match(js, /postSessionSimpleReason/)
  assert.match(js, /postSessionWhyDisclosureText/)
  assert.match(js, /postSessionHasAiCheck/)
  assert.match(js, /postSessionMemoryCheckBusy/)
  assert.match(js, /evidenceFromSessionAndConfidence/)
  assert.match(js, /confidenceConfident/)
  assert.match(js, /confidenceNeedsPractice/)
  assert.doesNotMatch(js, /postSessionWhyLabel/)
  assert.match(vue, /ps-plan__why|postSessionWhyDisclosureText/)
  assert.match(js, /togglePostSessionWhy/)
  assert.match(vue, /quiz-ai-result|ps-quiz/)
  assert.match(vue, /quizAiTitle/)
  assert.match(js, /guidanceFreeFlow|aiRecitationStrictProgression = false/)
  assert.match(js, /postSessionQuizScoreLine/)
  assert.doesNotMatch(js, /Each word must turn green before the next word unlocks/)
  assert.match(css, /quiz-ai-result__grid/)
  assert.match(js, /postSessionWhyExpanded:\s*false/)
  assert.match(js, /postSessionStatsExpanded:\s*false/)
  assert.match(js, /sessionHintCount/)
  assert.match(js, /recordSessionHint/)
  assert.match(js, /sessionExitContextLabel/)
  assert.match(js, /sessionExitAyahProgressLabel/)
  assert.match(js, /chainingEnabled/)
  assert.match(js, /anchorModeEnabled/)
  assert.match(css, /onboarding-post-session-tools[\s\S]*z-index:\s*12720/)
  assert.match(css, /\.ps-plan__adjust|post-session-simple__adjust-link/)
  assert.match(css, /\.post-session-simple__segment-btn\.is-selected/)
  assert.match(css, /post-session-simple__why-panel|why-panel-text/)
  assert.match(vue, /showPostSessionModal && !postSessionAiReciteActive/)
  assert.match(vue, /zIndex:\s*20000|z-index:\s*20000/)
  assert.match(css, /self-check-modal-overlay--above-post-session[\s\S]*z-index:\s*20000/)
  assert.match(vue, /Teleport to="body"[\s\S]*self-check-modal-overlay/)
  assert.match(js, /postSessionAiReciteActive = true[\s\S]*await this\.\$nextTick\(\)/)
  assert.match(vue, /session-exit-context/)
  assert.match(vue, /sessionExitAyahProgressLabel/)
}

{
  const repeat = {
    id: 9,
    type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
    session_mode: 'revision',
    range_kind: 'repeated',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 12, to: 14, count: 3 },
    reason_code: 'confidence_needs_practice',
    user_reason: 'You asked for more practice, so this repeat slows the pace and adds a little more repetition.',
    settings: { technique: 'talqin', playback_speed: 0.75, repetitions: 4 },
  }
  const confident = adaptRecommendationForConfidence(repeat, 'confident', {
    rangeStart: 12,
    rangeEnd: 14,
    totalAyahsInSurah: 286,
  })
  assert.equal(confident.type, RECOMMENDATION_TYPES.CONTINUE)
  assert.equal(confident.confidence_feedback, 'confident')
  assert.equal(confident.user_reason, null)
  assert.equal(confident.ayah_range.from, 15)
  assert.equal(confident.ayah_range.to, 17)
  assert.equal(confident.reason_code, 'confidence_confident')

  const continueRec = {
    id: 10,
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    range_kind: 'new',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 15, to: 17, count: 3 },
    reason_code: 'continue_while_fresh',
    user_reason: 'You completed the range and selected Confident, but used several memory prompts. Start the next ayah with Focus and Anchor mode, then remove the support once recall feels stable.',
    settings: { technique: 'talqin', playback_speed: 1, repetitions: 3 },
  }
  const clearHedging = adaptRecommendationForConfidence(continueRec, 'confident')
  assert.equal(clearHedging.user_reason, null)
  assert.equal(clearHedging.reason_code, 'confidence_confident')

  const needsPractice = adaptRecommendationForConfidence(continueRec, 'needs_practice', {
    rangeStart: 12,
    rangeEnd: 14,
  })
  assert.equal(needsPractice.type, RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE)
  assert.equal(needsPractice.confidence_feedback, 'needs_practice')
  assert.equal(needsPractice.reason_code, 'confidence_needs_practice')
  assert.equal(needsPractice.settings.playback_speed, 0.75)
  assert.ok(needsPractice.settings.repetitions >= 4)
}

{
  const insight = buildCombinedCheckInsight({
    aiDetails: {
      outcome: 'mixed',
      outcomeLabel: 'Okay',
      summaryLine: 'Good overall, but the order of verses slipped a little.',
      weakAyahs: [4],
    },
    quizView: {
      objectiveBand: 'weak',
      headline: 'Needs practice',
      why: 'Verse 4 needs the most help.',
      should: 'Do a short focused review.',
      weakAyahs: [4],
    },
    recommendation: {
      type: RECOMMENDATION_TYPES.CONTINUE,
      ayah_range: { from: 7, to: 8, count: 2 },
    },
    confidence: 'confident',
    isRepeat: false,
    t,
  })

  assert.equal(insight.answers.length, 2)
  assert.equal(insight.both, true)
  assert.match(insight.summary, /support|help|practice|fresh|Next verses/i)
  assert.doesNotMatch(insight.summary, /look ready/i)
  assert.doesNotMatch(insight.summary, /verse 4/i)
  assert.doesNotMatch(insight.summary, /Focus mode/i)
  assert.equal(insight.answers[0].detail.includes('order'), true)
  assert.equal(insight.answers[1].detail.includes('Verse 4'), true)

  const repeatInsight = buildCombinedCheckInsight({
    aiDetails: {
      outcome: 'weak',
      outcomeLabel: 'Needs practice',
      summaryLine: 'A few spots still need help.',
      weakAyahs: [4],
    },
    quizView: {
      objectiveBand: 'weak',
      why: 'Verse 4 needs the most help.',
      weakAyahs: [4],
    },
    recommendation: {
      type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
      ayah_range: { from: 3, to: 5, count: 3 },
    },
    isRepeat: true,
    t,
  })
  assert.match(repeatInsight.summary, /verse 4|practise|practice|help/i)

  const strongButNeedsPractice = buildCombinedCheckInsight({
    aiDetails: {
      outcome: 'strong',
      outcomeLabel: 'Good',
      summaryLine: 'Mostly clear, with one small pause.',
      weakAyahs: [],
    },
    quizView: null,
    recommendation: {
      type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
      ayah_range: { from: 7, to: 8, count: 2 },
    },
    confidence: 'needs_practice',
    isRepeat: true,
    t,
  })
  assert.match(strongButNeedsPractice.summary, /asked for more practice|more practice/i)
  assert.doesNotMatch(strongButNeedsPractice.summary, /check suggests|checks suggest/i)
}

{
  const focused = buildFocusedPracticeRange({
    weakAyahs: [13],
    sessionFrom: 12,
    sessionTo: 14,
    max: 3,
  })
  assert.equal(focused.from, 12)
  assert.equal(focused.to, 14)
  assert.deepEqual(focused.focusAyahs, [13])

  const tight = buildFocusedPracticeRange({
    weakAyahs: [20],
    sessionFrom: 18,
    sessionTo: 25,
    max: 3,
  })
  assert.equal(tight.from, 19)
  assert.equal(tight.to, 21)
  assert.deepEqual(tight.focusAyahs, [20])

  const minutes = estimatePracticeMinutes({
    wordCount: 36,
    ayahCount: 3,
    settings: { repetitions: 4, playback_speed: 0.75, technique: 'talqin', talqin_enabled: true },
  })
  assert.ok(minutes >= 4 && minutes <= 20)

  const plan = buildPersonalPracticePlan({
    recommendation: {
      type: RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE,
      surah: { id: 99, name: 'Az-Zalzalah', translated_name: 'Az-Zalzalah' },
      ayah_range: { from: 4, to: 6, count: 3 },
      settings: { technique: 'chaining', complementary_technique: 'focus', playback_speed: 0.75, repetitions: 4 },
      workload: { word_count: 40, score: 40, ayah_count: 3 },
    },
    snapshot: { rangeStart: 4, rangeEnd: 6, chapterName: 'Az-Zalzalah' },
    quizView: { objectiveBand: 'weak', weakAyahs: [5], why: 'Verse 5 needs help.' },
    aiDetails: { outcome: 'mixed', outcomeLabel: 'Okay', weakAyahs: [5] },
    confidence: 'needs_practice',
    isRepeat: true,
    t,
  })
  assert.ok(plan)
  assert.equal(plan.source, 'combined')
  assert.equal(plan.range.from, 4)
  assert.equal(plan.range.to, 6)
  assert.deepEqual(plan.range.focusAyahs, [5])
  assert.match(plan.range.focusLabel, /Focus on ayah 5/i)
  assert.ok(plan.techniques.length >= 1)
  assert.ok(plan.practiceApproach)
  assert.equal(plan.practiceApproach.id, 'chaining')
  assert.match(plan.practiceApproach.with, /Also:/i)
  assert.equal(plan.check?.mode, 'memory')
  assert.equal(plan.check?.status, 'done')
  assert.deepEqual(plan.check?.sources, ['ai', 'quiz'])
  assert.ok(plan.setup.length >= 1)
  assert.match(plan.time.label, /About \d+ minutes/)
  assert.ok(plan.estimated_minutes >= 4)

  const adapted = adaptRecommendationForAdaptiveAssessment(
    {
      id: 7,
      type: RECOMMENDATION_TYPES.CONTINUE,
      surah: { id: 2, name: 'Al-Baqarah' },
      ayah_range: { from: 15, to: 17, count: 3 },
      settings: { technique: 'talqin', playback_speed: 1, repetitions: 3 },
    },
    {
      goal: 'reinforce',
      settings: { technique: 'chaining', playback_speed: 0.75, repetitions: 4, chaining_enabled: true },
      reason_code: 'sequence_errors',
      evidence_codes: ['sequence_errors'],
      weak_ayahs: [16],
      primary_action_label_key: 'startFocusedReview',
    },
    {
      rangeStart: 15,
      rangeEnd: 17,
      objectiveBand: 'weak',
      weakAyahs: [16],
    },
  )
  assert.equal(adapted.type, RECOMMENDATION_TYPES.REPEAT_CURRENT_RANGE)
  assert.equal(adapted.ayah_range.from, 15)
  assert.equal(adapted.ayah_range.to, 17)
  assert.deepEqual(adapted.ayah_range.focus_ayahs, [16])
  assert.equal(adapted.settings.technique, 'chaining')
}

console.log('next-session-recommendation.test.mjs: ok')
