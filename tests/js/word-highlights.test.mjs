import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  hasUserWordHighlights,
  isUserHighlightedWord,
  normaliseWordHighlightMap,
  toggleWordHighlight,
  userHighlightIndexesByAyah,
  wordHighlightSignature,
} from '../../resources/js/scripts/techniques/wordHighlights.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

assert.deepEqual(normaliseWordHighlightMap(null), {})
assert.deepEqual(normaliseWordHighlightMap({ '2:5': [2, 0, 2, -1, 'x'] }), { '2:5': [0, 2] })

let marks = {}
marks = toggleWordHighlight(marks, '2:5', 1)
marks = toggleWordHighlight(marks, '2:5', 3)
assert.deepEqual(marks['2:5'], [1, 3])
assert.equal(isUserHighlightedWord(marks, '2:5', 1), true)
assert.equal(isUserHighlightedWord(marks, '2:6', 1), false)
marks = toggleWordHighlight(marks, '2:5', 1)
assert.deepEqual(marks['2:5'], [3])
assert.equal(wordHighlightSignature(marks, '2:5'), '3')
assert.equal(hasUserWordHighlights(marks), true)
assert.deepEqual(
  userHighlightIndexesByAyah(marks, [{ key: '2:6' }]),
  {},
)
assert.deepEqual(
  userHighlightIndexesByAyah(marks, [{ key: '2:5' }]),
  { '2:5': [3] },
)

assert.match(memorisationJs, /tryToggleMemoryWord\(verseKey, wordIndex\)/)
assert.match(memorisationJs, /user-word-highlight/)
assert.match(memorisationJs, /wordHighlightToggleHandler/)
assert.match(memorisationJs, /userHighlightIndexesByAyah/)
assert.match(memorisationVue, /wordHighlightHint/)
assert.match(memorisationVue, /clearUserWordHighlights/)
assert.match(memorisationVue, /chainingBoundaryHint/)
assert.match(memorisationVue, /chainingLiveLinkLabel/)

console.log('word-highlights.test.mjs: ok')
