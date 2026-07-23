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
} from '../../resources/js/scripts/recommendations/nextSessionRecommendation.js'

function t(key, params = {}) {
  if (key.endsWith('ayahRange') || key.endsWith('.ayahs')) return `Ayahs ${params.start}–${params.end}`
  if (key.endsWith('singleAyah') || key.endsWith('.ayah')) return `Ayah ${params.ayah}`
  if (key.includes('continueCurrentSurah') || key.includes('continueWhileFresh') || key.includes('simpleContinue')) {
    return `Continue while this range is still fresh.`
  }
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
  assert.match(vue, /submitPostSessionConfidence/)
  assert.match(vue, /post-session-simple__confidence/)
  assert.match(vue, /post-session-simple__pill/)
  assert.match(vue, /postSessionStatsExpanded/)
  assert.match(vue, /postSessionSelectedConfidence/)
  assert.match(vue, /postSessionStatsSummary/)
  assert.match(vue, /tryThisCombination/)
  assert.match(vue, /adjustPlan/)
  assert.match(vue, /openPostSessionAdjustPlan/)
  assert.match(vue, /post-session-simple__adjust-link/)
  assert.match(vue, /post-session-simple__why/)
  assert.match(vue, /post-session-simple__reason/)
  assert.match(vue, /suggestedNextStep/)
  assert.match(vue, /startDifferentSession/)
  assert.match(vue, /post-session-simple--builder-open/)
  assert.doesNotMatch(vue, /SESSION COMPLETE|Alhamdulillah/)
  assert.doesNotMatch(vue, /post-session-chip/)
  assert.doesNotMatch(vue, /post-session-inline-select/)
  assert.doesNotMatch(vue, /whatChangingDoes|post-session-simple__param-hints/, 'plan card must not stack How this helps under combination pills')
  assert.doesNotMatch(vue, /postSessionWhyLabel|whyThisPlan/, 'why label removed — reason is one short confidence line')
  assert.match(vue, /openPostSessionAiRecite/)
  assert.match(vue, /post-session-simple__ai-btn/)
  assert.match(vue, /post-session-simple__stack/)
  assert.match(vue, /aiReciteHintShort/)
  assert.match(vue, /has-selection/)
  assert.match(vue, /is-awaiting/)
  assert.match(js, /submitRecommendationConfidence/)
  assert.match(js, /openPostSessionNewSessionOffcanvas/)
  assert.match(js, /exitOnboardingSampleMode/)
  assert.match(js, /onboardingSampleSessionActive && !options\.sampleSession/)
  assert.match(js, /sampleSession:\s*keepSample/)
  assert.match(js, /adaptRecommendationForAiAssessment/)
  assert.match(js, /buildPostSessionAiReviewDetails/)
  assert.match(js, /buildAiReviewDetails/)
  assert.match(vue, /post-session-simple__ai-review/)
  assert.match(vue, /post-session-simple__ai-metrics/)
  assert.match(vue, /post-session-simple__ai-highlights/)
  assert.match(vue, /post-session-simple__ai-focus/)
  assert.match(css, /post-session-simple__ai-score/)
  assert.match(css, /--ai-score/)
  assert.match(vue, /postSessionAiReviewDetails/)
  assert.match(vue, /post-session-simple__plan-seal/)
  assert.doesNotMatch(
    vue,
    /post-session-simple__plan-start/,
    'plan card must not duplicate the footer primary CTA'
  )
  assert.match(vue, /openPostSessionRecommendationConfirm/)
  assert.match(
    css,
    /\.post-session-simple__dialog[\s\S]*?width:\s*min\(760px/,
    'success modal should be slightly wider for cleaner whitespace'
  )
  assert.match(vue, /data-plan="postSessionPlanKind"|:data-plan="postSessionPlanKind"/)
  assert.match(js, /postSessionPlanKind\(\)/)
  assert.match(css, /post-session-simple__panel--hero::before/)
  assert.match(css, /post-session-simple__plan-glow/)
  assert.match(css, /post-session-await-pulse/)
  assert.match(js, /openPostSessionAdjustPlan/)
  assert.match(js, /postSessionViewState/)
  assert.match(js, /deriveCompletionFlowPhase/)
  assert.match(js, /resolveConfidenceSelection/)
  assert.match(js, /adaptRecommendationForConfidence/)
  assert.doesNotMatch(js, /buildAdaptationExplanations/)
  assert.match(js, /aiReciteOffline/)
  assert.match(vue, /aiReciteOptionalHint/)
  assert.match(js, /buildCompletionPerformancePayload/)
  assert.match(js, /postSessionShowRepeatAction\(\)[\s\S]*return false/)
  assert.match(js, /postSessionStaticPills/)
  assert.match(js, /postSessionSimpleReason/)
  assert.match(js, /confidenceConfident/)
  assert.match(js, /confidenceNeedsPractice/)
  assert.doesNotMatch(js, /postSessionWhyLabel|whyThisPlan/)
  assert.match(js, /sessionHintCount/)
  assert.match(js, /recordSessionHint/)
  assert.match(js, /sessionExitContextLabel/)
  assert.match(js, /sessionExitAyahProgressLabel/)
  assert.match(js, /chainingEnabled/)
  assert.match(js, /anchorModeEnabled/)
  assert.match(css, /onboarding-post-session-tools[\s\S]*z-index:\s*12720/)
  assert.match(css, /post-session-simple__adjust-link/)
  assert.match(css, /\.post-session-simple__segment-btn\.is-selected/)
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

console.log('next-session-recommendation.test.mjs: ok')
