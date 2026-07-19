import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  RECOMMENDATION_TYPES,
  buildLocalFallbackRecommendation,
  formatAyahRangeLabel,
  isActionableRecommendation,
  localizeRecommendationReason,
  recommendationModeLabelKey,
  recommendationPrimaryActionKey,
} from '../../resources/js/scripts/recommendations/nextSessionRecommendation.js'

function t(key, params = {}) {
  if (key.endsWith('ayahRange')) return `Ayat ${params.start}–${params.end}`
  if (key.endsWith('singleAyah')) return `Ayah ${params.ayah}`
  if (key.includes('continueCurrentSurah')) return `Continue with the next ${params.count} ayat.`
  if (key.includes('surahCompleted')) return `Completed ${params.surah}.`
  return key
}

{
  const continueRec = {
    type: RECOMMENDATION_TYPES.CONTINUE,
    session_mode: 'new_learning',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 12, to: 15, count: 4 },
    reason_code: 'continue_current_surah',
  }
  assert.equal(isActionableRecommendation(continueRec), true)
  assert.equal(recommendationPrimaryActionKey(continueRec), 'startRecommendedNextSession')
  assert.equal(recommendationModeLabelKey(continueRec), 'modeNewLearning')
  assert.equal(formatAyahRangeLabel(continueRec.ayah_range, t), 'Ayat 12–15')
  assert.match(localizeRecommendationReason(continueRec, t), /next 4 ayat/)
}

{
  const revision = {
    type: RECOMMENDATION_TYPES.REVISION,
    session_mode: 'revision',
    surah: { id: 2, name: 'Al-Baqarah' },
    ayah_range: { from: 8, to: 11, count: 4 },
    reason_code: 'revision_required',
  }
  assert.equal(recommendationPrimaryActionKey(revision), 'startRecommendedRevision')
  assert.equal(recommendationModeLabelKey(revision), 'modeRevision')
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
    rangeStart: 1,
    rangeEnd: 4,
    totalAyahsInSurah: 286,
    completedAll: true,
  })
  assert.equal(next.type, RECOMMENDATION_TYPES.CONTINUE)
  assert.equal(next.ayah_range.from, 5)
  assert.equal(next.ayah_range.to, 8)
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
  assert.equal(end.next_surah.id, 2)
  assert.equal(end.ayah_range.from, 1)
  assert.equal(end.ayah_range.to, 4)
  assert.equal(end.completed_surah.id, 1)
}

{
  const remaining = buildLocalFallbackRecommendation({
    chapterId: 1,
    chapterName: 'Al-Fatihah',
    rangeStart: 1,
    rangeEnd: 4,
    totalAyahsInSurah: 7,
    completedAll: true,
  })
  assert.equal(remaining.type, RECOMMENDATION_TYPES.COMPLETE_SURAH)
  assert.equal(remaining.ayah_range.from, 5)
  assert.equal(remaining.ayah_range.to, 7)
}

{
  const vueSource = await fs.readFile(path.join(process.cwd(), 'resources/js/views/Memorisation.vue'), 'utf8')
  assert.match(vueSource, /postSessionRecommendationPrimaryLabel/)
  assert.match(vueSource, /post-session-recommendation-card/)
  assert.match(vueSource, /openPostSessionRecommendationConfirm/)
  assert.match(vueSource, /confirmPostSessionRecommendation/)
  assert.match(vueSource, /recommendation\.startNewSession/)
  assert.match(vueSource, /recommendation\.viewSessionSummary/)
  assert.doesNotMatch(vueSource, /Start next session/)
  assert.match(vueSource, /post-session-actions-grid/)
  assert.match(vueSource, /post-session-summary-btn/)
  assert.match(vueSource, /postSessionTechniqueTip/)
  assert.doesNotMatch(vueSource, /mutqin-modal-actions--stack post-session-recommendation-actions/)
}

{
  const jsSource = await fs.readFile(path.join(process.cwd(), 'resources/js/views/Memorisation.js'), 'utf8')
  assert.match(jsSource, /loadPostSessionRecommendation/)
  assert.match(jsSource, /startRecommendedSession/)
  assert.match(jsSource, /postSessionRecommendationStarting/)
  assert.match(jsSource, /startSessionFromRecommendationPayload/)
}

{
  const cssSource = await fs.readFile(path.join(process.cwd(), 'resources/js/views/Memorisation.css'), 'utf8')
  assert.match(cssSource, /\.post-session-recommendation-card/)
  assert.match(cssSource, /\[dir="rtl"\] \.post-session-recommendation-card/)
  assert.match(cssSource, /\.post-session-summary-btn/)
  assert.match(cssSource, /\.post-session-actions-grid/)
  assert.match(cssSource, /\.mutqin-btn-animate/)
}

console.log('next-session-recommendation frontend helpers: ok')
