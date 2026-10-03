import assert from 'node:assert/strict'
import {
  buildMutashabihatPracticePlan,
  distinctionRemembered,
  gradeIdentifyChoice,
  shouldRecitePairedAyah,
  summarisePracticeSuccess,
} from '../../resources/js/scripts/mutashabihat/practiceExercises.js'
import {
  deriveMutashabihatStatus,
  filterMutashabihatRows,
  mergeCatalogWithProgress,
  pairTouchesScope,
  prioritiseMutashabihatRows,
} from '../../resources/js/scripts/mutashabihat/pairStatus.js'

const pair = {
  id: 1,
  verse_key_1: '2:58',
  verse_key_2: '7:161',
  surah_number_1: 2,
  ayah_number_1: 58,
  surah_number_2: 7,
  ayah_number_2: 161,
  pair_key: '2:58|7:161',
}

const steps = buildMutashabihatPracticePlan({
  pair,
  anchorVerseKey: '2:58',
  arabicByKey: {
    '2:58': 'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا',
    '7:161': 'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ وَكُلُوا مِنْهَا',
  },
  rng: () => 0.2,
})

assert.deepEqual(steps.map((step) => step.kind), ['compare', 'recall', 'choose', 'recite'])
assert.match(steps[0].leftHtml, /mutashabihat-diff/)
assert.match(steps[1].blankHtml, /mutashabihat-blank/)
assert.ok(steps[2].options.length >= 2)
assert.ok(steps[2].options.some((option) => option.correct))
assert.equal(gradeIdentifyChoice(steps[2].options, steps[2].options.find((o) => o.correct).id), true)
assert.equal(gradeIdentifyChoice(steps[2].options, 'missing'), false)

assert.equal(deriveMutashabihatStatus(null), 'new')
assert.equal(deriveMutashabihatStatus({ practice_attempts: 0, confusion_count: 0 }), 'new')
assert.equal(deriveMutashabihatStatus({ practice_attempts: 1, successful_attempts: 0 }), 'needs_practice')
assert.equal(deriveMutashabihatStatus({ practice_attempts: 1, successful_attempts: 1 }), 'improving')
assert.equal(deriveMutashabihatStatus({ practice_attempts: 4, successful_attempts: 3 }), 'strong')
assert.equal(deriveMutashabihatStatus({ practice_attempts: 0, confusion_count: 2 }), 'needs_practice')

const merged = mergeCatalogWithProgress([pair], [])
assert.equal(merged[0].status, 'new')

const ranked = prioritiseMutashabihatRows([
  { pair, status: 'strong' },
  { pair: { ...pair, id: 2, verse_key_1: '2:61', surah_number_1: 2, ayah_number_1: 61 }, status: 'new' },
], { chapterId: 2, rangeStart: 50, rangeEnd: 70 })
assert.equal(ranked[0].status, 'new')

assert.equal(pairTouchesScope(pair, { chapterId: 2, rangeStart: 50, rangeEnd: 60 }), true)
assert.equal(pairTouchesScope(pair, { chapterId: 4 }), false)

const filtered = filterMutashabihatRows([
  { status: 'new', pairLabel: 'Al-Baqarah 2:58 ↔ Al-A\'raf 7:161', pair },
  { status: 'strong', pairLabel: 'other', pair: { verse_key_1: '3:18' } },
], { status: 'new', query: '2:58' })
assert.equal(filtered.length, 1)

assert.equal(shouldRecitePairedAyah({ choose: { correct: false } }), true)
assert.equal(shouldRecitePairedAyah({ recall: { remembered: true }, choose: { correct: true } }), false)
assert.equal(summarisePracticeSuccess({
  recall: { remembered: true },
  choose: { correct: true },
  recite: { skipped: true },
}), true)
assert.equal(distinctionRemembered({ choose: { correct: false } }), false)

console.log('mutashabihat-practice.test.mjs passed')
