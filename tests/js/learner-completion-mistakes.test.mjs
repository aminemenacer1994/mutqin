import assert from 'node:assert/strict'
import {
  buildAyahWordHighlightParts,
  buildMistakeSummaryChips,
  countMistakesByType,
  groupMistakesByAyah,
  isPerfectCompletionResult,
} from '../../resources/js/scripts/teacher/learnerCompletionMistakes.js'
import {
  claimClipPlayback,
  releaseClipPlayback,
  stopActiveClipPlayback,
} from '../../resources/js/scripts/audio/singleClipPlayback.js'

const t = (key) => {
  if (key === 'teacher.learner_mistake_chip_wrong') {
    return '{n, plural, one {# wrong word} other {# wrong words}}'
  }
  if (key === 'teacher.learner_mistake_chip_missed') {
    return '{n, plural, one {# missed} other {# missed}}'
  }
  if (key === 'teacher.learner_mistake_chip_tajweed') {
    return '{n, plural, one {# tajweed} other {# tajweed}}'
  }
  return key
}

const mistakes = [
  { ayah: 2, word_index: 1, type: 'missed' },
  { ayah: 1, word_index: 0, type: 'wrong', expected: 'بسم', heard: 'بصم' },
  { ayah: 1, word_index: 3, type: 'tajweed', rule: 'Ghunnah' },
  { ayah: 2, word_index: 2, type: 'missed' },
]

assert.deepEqual(countMistakesByType(mistakes), { missed: 2, wrong: 1, tajweed: 1 })

const groups = groupMistakesByAyah(mistakes)
assert.equal(groups.length, 2)
assert.equal(groups[0].ayah, 1)
assert.equal(groups[0].items.length, 2)

const chips = buildMistakeSummaryChips(countMistakesByType(mistakes), t, 'en')
assert.equal(chips.length, 3)
assert.match(chips.find((c) => c.type === 'wrong').label, /wrong word/)

const parts = buildAyahWordHighlightParts('بسم الله الرحمن', 1)
assert.equal(parts[1].highlighted, true)
assert.equal(parts[0].highlighted, false)

assert.equal(isPerfectCompletionResult({ accuracy_percent: 100 }), true)
assert.equal(isPerfectCompletionResult({ accuracy_percent: 88 }), false)

let firstStopped = false
let secondStopped = false
claimClipPlayback(() => { firstStopped = true })
claimClipPlayback(() => { secondStopped = true })
assert.equal(firstStopped, true)
assert.equal(secondStopped, false)
stopActiveClipPlayback()
assert.equal(secondStopped, true)

releaseClipPlayback(() => {})
claimClipPlayback(() => {})
releaseClipPlayback(() => {})
stopActiveClipPlayback()

console.log('learner-completion-mistakes.test.mjs: ok')
