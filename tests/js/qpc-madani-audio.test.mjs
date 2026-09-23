import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectQpcMadaniPlayingAyahNodes,
  collectQpcMadaniWordHighlightNodes,
  matchesQpcWordAudioIndex,
  resolveQpcWordAudioIndex,
} from '../../resources/js/scripts/mushaf/qpcMadaniAudioDom.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const wordVue = readFileSync(join(root, 'resources/js/components/madani/MadaniWord.vue'), 'utf8')

const map = new Map([
  ['2:30:1', 0],
  ['2:30:5', 4],
])

assert.equal(resolveQpcWordAudioIndex(1, '2:30', map), 0)
assert.equal(resolveQpcWordAudioIndex(5, '2:30', map), 4)
assert.equal(resolveQpcWordAudioIndex(3, '2:30', null), 2)

const doc = {
  querySelectorAll(selector) {
    const nodes = [
      { getAttribute(name) {
        if (name === 'data-ayah-key') return '2:30'
        if (name === 'data-word') return '5'
        return null
      }, classList: { add() {}, remove() {} } },
      { getAttribute(name) {
        if (name === 'data-ayah-key') return '2:30'
        if (name === 'data-word') return '1'
        return null
      }, classList: { add() {}, remove() {} } },
    ]
    if (String(selector).includes('2:30')) return nodes
    return []
  },
}

const wordNodes = collectQpcMadaniPlayingAyahNodes(doc, '2:30')
assert.equal(matchesQpcWordAudioIndex(wordNodes[0], '2:30', 4, map), true)
assert.equal(collectQpcMadaniWordHighlightNodes(doc, '2:30', 4, map).length, 1)
assert.equal(collectQpcMadaniPlayingAyahNodes(doc, '2:30').length, 2)

assert.match(memorisationJs, /prefetchQpcMadaniPageForUpcomingAyah/)
assert.match(memorisationJs, /syncQpcMadaniPlaybackAyahDom/)
assert.match(memorisationJs, /collectQpcMadaniWordHighlightNodes/)
assert.match(memorisationJs, /onQpcMadaniWordSelect[\s\S]{0,320}onMushafAyahClick/)
assert.doesNotMatch(
  memorisationJs,
  /playingAyah|qpcMadaniWordIndex|madaniAudioPlayer/,
  'no Madani-specific player or per-word reactive props'
)
assert.match(wordVue, /is-playing-ayah|\.highlighted/)
assert.match(memorisationJs, /prefetchQpcMadaniPageForUpcomingAyah/)
assert.match(memorisationJs, /void loadMadaniPageLeaf\(page\)\.catch/)
assert.match(memorisationJs, /preloadMadaniNavigationTargets\(mode, page\)/)
assert.match(memorisationJs, /newVal === 'madani_mushaf'[\s\S]{0,800}startWordHighlighting/)

console.log('qpc-madani-audio.test.mjs: ok')
