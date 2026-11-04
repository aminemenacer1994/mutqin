import assert from 'node:assert/strict'
import { buildReciteFocus } from '../../resources/js/scripts/workspaceAiRecite/reciteFocus.js'

function words(count, ayah, status) {
  return Array.from({ length: count }, (_, index) => ({
    ayah,
    text: `word-${index + 1}`,
    status,
  }))
}

const perfect = buildReciteFocus(words(10, 1, 'matched'))
assert.equal(perfect.code, 'secure')
assert.equal(perfect.matched, 10)
assert.equal(perfect.needsWork, 0)
assert.equal(perfect.explanation, 'This set is secure, continue to the next recommended set.')

const single = buildReciteFocus([
  ...words(9, 4, 'matched'),
  { ayah: 4, text: 'word-10', status: 'unmatched' },
])
assert.equal(single.code, 'one')
assert.equal(single.matched, 9)
assert.equal(single.needsWork, 1)
assert.equal(single.explanation, 'Give Ayah 4 one more pass.')
assert.equal(single.weakWords[0].text, 'word-10')

const many = buildReciteFocus([
  { ayah: 3, text: 'a', status: 'unmatched' },
  { ayah: 3, text: 'b', status: 'missing' },
  { ayah: 3, text: 'ok-3', status: 'matched' },
  { ayah: 3, text: 'ok-3b', status: 'matched' },
  { ayah: 6, text: 'c', status: 'unmatched' },
  { ayah: 6, text: 'ok-6', status: 'matched' },
  { ayah: 6, text: 'ok-6b', status: 'matched' },
  { ayah: 7, text: 'd', status: 'low_confidence' },
  { ayah: 7, text: 'ok-7', status: 'matched' },
  { ayah: 7, text: 'ok-7b', status: 'matched' },
])
assert.equal(many.code, 'many')
assert.equal(many.needsWork, 4)
assert.equal(many.explanation, 'Focus on Ayah 3, then 6 and 7.')

const none = buildReciteFocus(words(4, 2, 'unmatched'))
assert.equal(none.code, 'low_match')
assert.equal(none.matched, 0)
assert.equal(none.explanation, 'Try this range again, a little slower.')

const partial = buildReciteFocus([
  { ayah: 1, text: 'one', status: 'matched' },
  { ayah: 1, text: 'two', status: 'matched' },
  { ayah: 2, text: 'three', status: 'missing' },
  { ayah: 2, text: 'four', status: 'not_recited' },
])
assert.equal(partial.code, 'secure')
assert.equal(partial.matched, 2)
assert.equal(partial.needsWork, 0)
assert.equal(partial.notRecitedCount, 2)

const order = buildReciteFocus([
  ...words(3, 5, 'matched'),
  { ayah: 5, text: 'late', status: 'out_of_order' },
])
assert.equal(order.code, 'order')
assert.equal(order.needsWork, 1)
assert.equal(order.explanation, 'Check the order in Ayah 5.')

const low = buildReciteFocus([
  { ayah: 6, text: 'clear', status: 'correct', confidence: 0.9 },
  { ayah: 6, text: 'soft', status: 'correct', confidence: 0.4 },
])
assert.equal(low.code, 'one')
assert.equal(low.needsWork, 1)
assert.equal(low.weakWords[0].status, 'low_confidence')
assert.equal(low.explanation, 'Give Ayah 6 one more pass.')

const again = buildReciteFocus([
  { ayah: 6, text: 'clear', status: 'correct', confidence: 0.9 },
  { ayah: 6, text: 'soft', status: 'correct', confidence: 0.4 },
])
assert.deepEqual(again, low)
