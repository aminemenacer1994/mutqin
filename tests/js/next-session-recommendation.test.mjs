import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  RECOMMENDATION_TYPES,
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
  if (key.endsWith('ayahRange')) return `Ayat ${params.start}–${params.end}`
  if (key.endsWith('singleAyah')) return `Ayah ${params.ayah}`
  if (key.includes('continueCurrentSurah') || key.includes('continueWhileFresh') || key.includes('simpleContinue')) {
    return `Continue while this range is still fresh.`
  }
  if (key.includes('surahCompleted')) return `Completed ${params.surah}.`
  if (key.includes('techniqueDisplay.talqin') || key.endsWith('talqinShort') || key.endsWith('talqin.label') || key.endsWith('talqin.short')) {
    return 'Listen and repeat (Talqin)'
  }
  if (key.endsWith('repetitionsSummary')) return `${params.count} repetitions`
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
  assert.equal(formatAyahRangeLabel(continueRec.ayah_range, t), 'Ayat 15–17')
  assert.match(localizeRecommendationReason(continueRec, t), /fresh/)
  assert.match(
    formatRecommendationSettingsSummary(continueRec.settings, t, { reciterName: 'Alafasy' }),
    /Listen and repeat \(Talqin\) · Alafasy · 1× · 3 repetitions/
  )
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
  assert.equal(end.ayah_range.from, 1)
}

{
  const root = path.resolve('resources/js')
  const vue = await fs.readFile(path.join(root, 'views/Memorisation.vue'), 'utf8')
  const js = await fs.readFile(path.join(root, 'views/Memorisation.js'), 'utf8')
  assert.match(vue, /Teleport to="body"/)
  assert.match(vue, /post-session-simple/)
  assert.match(vue, /submitPostSessionConfidence/)
  assert.match(vue, /openPostSessionAiRecite/)
  assert.match(vue, /post-session-simple__ai-btn/)
  assert.match(vue, /post-session-simple__pill/)
  assert.match(vue, /postSessionStatsExpanded/)
  assert.match(vue, /startDifferentSession/)
  assert.doesNotMatch(vue, /SESSION COMPLETE|Alhamdulillah/)
  assert.doesNotMatch(vue, /adjustSettings/)
  assert.doesNotMatch(vue, /post-session-chip/)
  assert.doesNotMatch(vue, /post-session-inline-select/)
  assert.match(js, /submitRecommendationConfidence/)
  assert.match(js, /submitRecommendationAiAssessment/)
  assert.match(js, /postSessionViewState/)
  assert.match(js, /postSessionShowRepeatAction\(\)[\s\S]*return false/)
  assert.match(js, /postSessionStaticPills/)
  assert.match(js, /postSessionSimpleReason/)
}

console.log('next-session-recommendation.test.mjs: ok')
