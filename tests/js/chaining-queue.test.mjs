import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildCumulativeChainSteps,
  buildLinkingChainGroups,
  buildLinkingChainSteps,
  buildChainingGroups,
  chainGroupContinues,
} from '../../resources/js/scripts/techniques/chainingQueue.js'
import { TECHNIQUE_IDS } from '../../resources/js/scripts/techniques/techniqueDisplay.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const verses = [
  { key: '110:1', number: 1 },
  { key: '110:2', number: 2 },
  { key: '110:3', number: 3 },
  { key: '110:4', number: 4 },
]

assert.equal(
  JSON.stringify(buildCumulativeChainSteps(verses).map(item => item.verse.key)),
  JSON.stringify(['110:1', '110:1', '110:2', '110:1', '110:2', '110:3', '110:1', '110:2', '110:3', '110:4'])
)

const deduped = buildCumulativeChainSteps([verses[0], verses[0], verses[1]])
assert.equal(
  JSON.stringify(deduped.map(item => item.verse.key)),
  JSON.stringify(['110:1', '110:1', '110:2'])
)

const linkingFlat = buildLinkingChainSteps(verses.slice(0, 2))
assert.deepEqual(
  linkingFlat.map(item => `${item.phase}:${item.chainKey}:${item.sequencePosition}/${item.sequenceTotal}`),
  [
    'Linking:linking:single:110:1:1/1',
    'Linking:linking:single:110:2:1/1',
    'Linking:linking:110:1->110:2:1/2',
    'Linking:linking:110:1->110:2:2/2',
  ]
)

const linkingGroups = buildLinkingChainGroups(verses.slice(0, 3))
assert.equal(linkingGroups.length, 6, '3 ayahs → two joins, each current, next, then pair')
assert.equal(linkingGroups[2].length, 2)
assert.equal(linkingGroups[2][0].chainKey, 'linking:110:1->110:2')
assert.equal(linkingGroups[3][0].verse.key, '110:2')
assert.equal(linkingGroups[4][0].verse.key, '110:3')

assert.equal(buildChainingGroups(verses, 'cumulative').length, 4)
assert.equal(buildChainingGroups(verses, 'linking').length, 9)
assert.equal(buildChainingGroups(verses.slice(0, 1), 'linking').length, 1)

const anam = [
  { key: '6:1' },
  { key: '6:2' },
  { key: '6:3' },
]
const anamLink = buildLinkingChainSteps(anam)
assert.deepEqual(anamLink.map((item) => item.verse.key), [
  '6:1', '6:2', '6:1', '6:2',
  '6:2', '6:3', '6:2', '6:3',
])
assert.equal(chainGroupContinues(anamLink[0]), false, 'a single ayah keeps the between-step gap')
assert.equal(chainGroupContinues(anamLink[2]), true, 'first half of a pair continues straight into the next ayah')
assert.equal(chainGroupContinues(anamLink[3]), false, 'the pair ends after the second ayah')
assert.equal(chainGroupContinues(buildCumulativeChainSteps(anam)[3]), true)
assert.equal(chainGroupContinues(null), false)

const memorisationJs = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

assert.match(memorisationJs, /import \{ buildChainingGroups, chainGroupContinues \} from '\.\.\/scripts\/techniques\/chainingQueue\.js'/)
assert.match(memorisationJs, /buildChainingGroups\(verses, method\)/)
assert.match(memorisationJs, /chainGroupContinues\(this\.activeQueueEntry\)/)
assert.match(memorisationJs, /spokenWordCountByAyah/)
assert.doesNotMatch(memorisationJs, /createAyahSegments/, 'linking must stay ayah-level')

const workspaceTechniques = [
  { id: TECHNIQUE_IDS.TALQIN, section: 'talqin_mode', toggle: 'toggleTalqinModeRadio' },
  { id: TECHNIQUE_IDS.FOCUS, section: 'focus_mode', toggle: 'toggleFocusModeRadio' },
  { id: TECHNIQUE_IDS.BLUR, section: 'blur_mode', toggle: 'toggleBlurModeRadio' },
  { id: TECHNIQUE_IDS.CHAINING, section: 'chaining', toggle: 'toggleChainingRadio' },
  { id: TECHNIQUE_IDS.ANCHOR, section: 'anchor_mode', toggle: 'toggleAnchorModeRadio' },
]

for (const technique of workspaceTechniques) {
  assert.match(memorisationVue, new RegExp(`toggleSection\\('${technique.section}'\\)`), `${technique.id} sheet section`)
  assert.match(memorisationJs, new RegExp(`${technique.toggle}\\(`), `${technique.id} runtime toggle`)
}

assert.match(memorisationJs, /setChainingEnabled\(enabled\)/)
assert.match(memorisationJs, /setChainingMethod\(method\)/)
assert.match(memorisationJs, /applyChainingQueueChange\(mode = this\.currentMode/)
assert.match(memorisationJs, /from '\.\.\/scripts\/techniques\/chainingVisual\.js'/)

console.log('chaining-queue.test.mjs: ok')
