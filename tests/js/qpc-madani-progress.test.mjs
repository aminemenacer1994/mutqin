import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  buildQpcMadaniProgressSnapshot,
  canonicalWeakWordId,
  mapCanonicalWeakWordToLocation,
  pageContainsMappedWeakWord,
  preserveDashboardMadaniContext,
  qpcMadaniWordProgressClass,
  resolveMemorisationTestNavigation,
  resolveQpcMadaniWordProgressState,
  resolveRecommendationMadaniNavigation,
  resolveScheduledReviewNavigation,
  resolveSimilarAyahCanonicalNavigation,
} from '../../resources/js/scripts/mushaf/qpcMadaniProgress.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))

const pageWords = [
  { location: '2:30:5', surah: '2', ayah: '30', word: '5', text: 'glyph' },
  { location: '2:30:6', surah: '2', ayah: '30', word: '6', text: 'glyph' },
  { location: '2:31:1', surah: '2', ayah: '31', word: '1', text: 'glyph' },
  { location: '2:31:2', surah: '2', ayah: '31', word: '2', text: 'glyph' },
  { location: '2:32:1', surah: '2', ayah: '32', word: '1', text: 'glyph' },
  { location: '2:32:2', surah: '2', ayah: '32', word: '2', text: 'glyph' },
]

const weakRecord = {
  surahId: 2,
  ayahNumber: 30,
  wordIndex: 4,
  verseKey: '2:30',
  text: 'glyph',
  reason: 'pronunciation',
}

assert.equal(canonicalWeakWordId(weakRecord), '2:30:4')
assert.equal(mapCanonicalWeakWordToLocation(weakRecord), '2:30:5')

const weakSnapshot = buildQpcMadaniProgressSnapshot({
  weakWords: [weakRecord],
  readingViewMode: 'mushaf',
})
const weakSnapshotMadani = buildQpcMadaniProgressSnapshot({
  weakWords: [weakRecord],
  readingViewMode: 'madani_mushaf',
})
assert.equal(weakSnapshot.weakLocations['2:30:5'], true)
assert.deepEqual(weakSnapshot.weakLocations, weakSnapshotMadani.weakLocations)
assert.equal(pageContainsMappedWeakWord(pageWords, weakSnapshot), true)
assert.equal(pageContainsMappedWeakWord(
  [{ location: '2:31:1', surah: '2', ayah: '31', word: '1' }],
  weakSnapshot,
), false)
const marked = resolveQpcMadaniWordProgressState(pageWords[0], weakSnapshot)
const unmarked = resolveQpcMadaniWordProgressState(pageWords[1], weakSnapshot)
assert.equal(marked.weakWord, true)
assert.equal(marked.location, '2:30:5')
assert.equal(unmarked.weakWord, false)
assert.equal(qpcMadaniWordProgressClass(marked)['qpc-progress-weak-word'], true)

const ayahSnapshot = buildQpcMadaniProgressSnapshot({
  weakAyahKeys: ['2:31'],
  chapterId: 2,
  confidenceByAyah: { '2:31': 'low' },
  ayahProgress: {
    '2:32': { masteryScore: 0.95, repetitionCount: 4 },
  },
})
for (const word of pageWords.filter((item) => item.ayah === '31')) {
  const state = resolveQpcMadaniWordProgressState(word, ayahSnapshot)
  assert.equal(state.weakAyah, true, `${word.location} weak ayah`)
  assert.equal(state.confidence, 'low', `${word.location} confidence`)
  assert.equal(state.weakWord, false)
}
const confident = resolveQpcMadaniWordProgressState(pageWords[4], ayahSnapshot)
assert.equal(confident.confidence, 'high')
assert.equal(confident.weakAyah, false)
assert.equal(resolveQpcMadaniWordProgressState(pageWords[5], ayahSnapshot).confidence, 'high')

const recommendation = resolveRecommendationMadaniNavigation({
  readingViewMode: 'madani_mushaf',
  surah: 2,
  ayah: 30,
  rangeStart: 30,
  rangeEnd: 37,
  index,
  viewportWidth: 1400,
})
assert.equal(recommendation.applies, true)
assert.equal(recommendation.directPageMutation, false)
assert.equal(recommendation.verseKey, '2:30')
assert.equal(recommendation.page, 6)
assert.deepEqual(recommendation.visiblePages, [5, 6])
assert.equal(resolveRecommendationMadaniNavigation({
  readingViewMode: 'mushaf',
  surah: 2,
  ayah: 30,
  index,
}).applies, false)

const review = resolveScheduledReviewNavigation({
  readingViewMode: 'madani_mushaf',
  surah: 2,
  from: 32,
  to: 32,
  review: true,
  sessionId: '42',
  index,
  viewportWidth: 390,
})
assert.equal(review.review, true)
assert.equal(review.sessionId, '42')
assert.equal(review.page, index['2:32'])
assert.deepEqual(review.visiblePages, [review.page])
const dueSnapshot = buildQpcMadaniProgressSnapshot({
  ayahProgress: { '2:32': { nextReview: '2026-09-20', masteryScore: 0.8 } },
  queue: [{ phase: 'Retention', ayahId: '2:30' }],
  todayToken: '2026-09-24',
})
for (const word of pageWords.filter((item) => item.ayah === '32')) {
  assert.equal(resolveQpcMadaniWordProgressState(word, dueSnapshot).retentionDue, true)
}
assert.equal(resolveQpcMadaniWordProgressState(pageWords[0], dueSnapshot).reviewPriority, true)

const similar = resolveSimilarAyahCanonicalNavigation({ surah: 2, ayah: 255 })
assert.equal(similar.verseKey, '2:255')
assert.equal(similar.directPageMutation, false)
assert.equal(similar.page, undefined)
const similarOpen = memorisationJs.slice(memorisationJs.indexOf('async openSimilarAyahPractice'))
assert.match(similarOpen.slice(0, 700), /setActiveVerse\(nav\.verseKey/)
assert.doesNotMatch(similarOpen.slice(0, 700), /goToQpcMadaniPageTarget/)

const testNav = resolveMemorisationTestNavigation({
  readingViewMode: 'madani_mushaf',
  surah: 2,
  ayah: 30,
  index,
  viewportWidth: 1200,
})
assert.equal(testNav.verseKey, '2:30')
assert.equal(testNav.page, 6)
assert.equal(testNav.directPageMutation, false)

const dashboard = preserveDashboardMadaniContext({
  surah: 2,
  from: 30,
  to: 32,
  review: '1',
  sessionId: '42',
  recommendationId: '9',
  weak: '2:30:4',
  view: 'madani',
})
assert.equal(dashboard.targetAyah, '2:30')
assert.equal(dashboard.rangeEndAyah, '2:32')
assert.equal(dashboard.review, true)
assert.equal(dashboard.sessionId, '42')
assert.equal(dashboard.recommendationId, '9')
assert.equal(dashboard.readingViewMode, 'madani_mushaf')
assert.equal(dashboard.weakWords[0].wordIndex, 4)
assert.equal(mapCanonicalWeakWordToLocation(dashboard.weakWords[0]), '2:30:5')

const switched = buildQpcMadaniProgressSnapshot({
  weakWords: dashboard.weakWords,
  weakAyahKeys: ['2:31'],
  chapterId: 2,
  readingViewMode: 'stacked',
})
assert.equal(switched.weakLocations['2:30:5'], true)
assert.equal(switched.weakAyahs['2:31'], true)
assert.match(memorisationJs, /setReadingViewMode\(mode\)[\s\S]{0,1600}syncQpcMadaniPageToActiveVerse/)
assert.doesNotMatch(memorisationJs, /setReadingViewMode\(mode\)[\s\S]{0,1600}practiceFocusWeakWords\s*=/)
assert.doesNotMatch(memorisationJs, /qpcMadaniProgressStore|madaniWeakWords\s*:|this\.qpcWeakWords\s*=/)
assert.match(memorisationJs, /qpcMadaniProgressSnapshot\(\) \{[\s\S]{0,1200}practiceFocusWeakWords/)
assert.match(memorisationJs, /qpcMadaniProgressSnapshot\(\) \{[\s\S]{0,1200}hifzAyahProgress/)
assert.match(memorisationJs, /finishDashboardMadaniEntry\(entry\)/)
assert.match(memorisationJs, /followQpcMadaniCanonicalTarget\(/)
assert.match(memorisationVue, /:progress-snapshot="qpcMadaniProgressSnapshot"/)
assert.match(wordVue, /resolveQpcMadaniWordProgressState/)
assert.match(wordVue, /qpc-progress-weak-word/)
assert.match(wordVue, /return this\.glyphPresentation\.text/)
assert.doesNotMatch(wordVue, /qpc-progress-weak-word[\s\S]{0,180}content:/)
assert.doesNotMatch(wordVue, /qpc-progress-weak-word[\s\S]{0,240}font-size/)

console.log('PASS')
