import assert from 'node:assert/strict'
import {
  buildCheckAgainHref,
  buildReviewHref,
  compatibleAttemptDelta,
  detectedWords,
  paintReferenceWords,
  presentationTone,
} from '../../resources/js/scripts/dashboard/progressView.js'

const reference = paintReferenceWords('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ', [
  { status: 'correct', ayah_word_index: 0, text: 'بِسْمِ', confidence: 0.92 },
  { status: 'wrong', ayah_word_index: 1, text: 'ٱللَّهِ', recognised_word: 'الله', confidence: 0.4 },
  { status: 'missing', ayah_word_index: 2, text: 'ٱلرَّحْمَٰنِ' },
], 1)

assert.deepEqual(reference.words.map((word) => word.text), ['بِسْمِ', 'ٱللَّهِ', 'ٱلرَّحْمَٰنِ'])
assert.deepEqual(reference.words.map((word) => word.state), ['matched', 'mismatch', 'skipped'])
assert.equal(reference.source, 'uthmani')

const noTranscript = paintReferenceWords('ٱلْحَمْدُ لِلَّهِ', [], 2)
assert.deepEqual(noTranscript.words.map((word) => word.state), ['unassessed', 'unassessed'])

const detected = detectedWords([
  { status: 'wrong', ayah: 1, text: 'ٱللَّهِ', recognised_word: 'الله' },
  { status: 'extra', ayah: 1, recognised_word: 'ثم' },
], 1)
assert.equal(detected.at(-1).state, 'extra')
assert.equal(detected.at(-1).text, 'ثم')

assert.equal(presentationTone(92), 'strong')
assert.equal(presentationTone(80), 'mixed')
assert.equal(presentationTone(40), 'weak')
assert.equal(presentationTone(null), 'neutral')

const href = buildReviewHref('/memorisation', {
  surah_number: 112,
  ayah_number: 1,
  attempt_id: 9,
  assessment_id: 4,
  settings: { reciter: 'ar.alafasy', speed: 9, repetitions: 3, layout: 'madani_mushaf' },
  words: [{ state: 'mismatch', index: 2, expected: 'ٱللَّهِ' }],
})
assert.match(href, /review=1/)
assert.match(href, /prior_assessment=4/)
assert.match(href, /reciter=ar\.alafasy/)
assert.match(href, /repetitions=3/)
assert.match(href, /view=madani_mushaf/)
assert.match(href, /weak=112%3A1%3A2/)
assert.doesNotMatch(href, /speed=/)

assert.equal(compatibleAttemptDelta(
  { id: 2, surah_number: 1, ayah_start: 1, ayah_end: 1, accuracy_percent: 90, model_version: 'm1', algorithm_version: 'a' },
  { id: 1, surah_number: 1, ayah_start: 1, ayah_end: 1, accuracy_percent: 70, model_version: 'm1', algorithm_version: 'a' },
).points, 20)
assert.equal(compatibleAttemptDelta(
  { id: 2, surah_number: 1, ayah_start: 1, ayah_end: 1, accuracy_percent: 90, model_version: 'm1', algorithm_version: 'a' },
  { id: 1, surah_number: 1, ayah_start: 1, ayah_end: 2, accuracy_percent: 70, model_version: 'm1', algorithm_version: 'a' },
), null)
assert.equal(compatibleAttemptDelta(
  { id: 2, surah_number: 1, ayah_start: 1, ayah_end: 1, accuracy_percent: 90, model_version: '', algorithm_version: '' },
  { id: 1, surah_number: 1, ayah_start: 1, ayah_end: 1, accuracy_percent: 70, model_version: '', algorithm_version: '' },
), null)

assert.match(buildCheckAgainHref('/memorisation', {
  surah_number: 2,
  ayah_start: 5,
  ayah_end: 5,
  assessment_id: 8,
}), /ai_check=1/)

console.log('progress-overview.test.mjs: ok')
