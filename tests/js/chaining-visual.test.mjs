import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  buildChainingJoinedFlowHtml,
  orderAyahKeysByVerseList,
  resolveChainingVisualAyahKeys,
  shouldRenderChainingJoinedFlow,
} from '../../resources/js/scripts/techniques/chainingVisual.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const verses = [
  { key: '2:1', number: 1 },
  { key: '2:2', number: 2 },
  { key: '2:3', number: 3 },
]

const pairQueue = [
  { chainKey: 'linking:2:1->2:2', repeatCount: 1, verse: verses[0], sequencePosition: 1 },
  { chainKey: 'linking:2:1->2:2', repeatCount: 1, verse: verses[1], sequencePosition: 2 },
  { chainKey: 'linking:2:1->2:2', repeatCount: 2, verse: verses[0], sequencePosition: 1 },
  { chainKey: 'linking:2:1->2:2', repeatCount: 2, verse: verses[1], sequencePosition: 2 },
]

assert.deepEqual(
  resolveChainingVisualAyahKeys({
    chainingEnabled: true,
    chainingMethod: 'linking',
    entry: pairQueue[0],
    queue: pairQueue,
    verses,
  }),
  ['2:1', '2:2'],
)

assert.deepEqual(
  resolveChainingVisualAyahKeys({
    chainingEnabled: true,
    chainingMethod: 'linking',
    entry: pairQueue[2],
    queue: pairQueue,
    verses,
  }),
  ['2:1', '2:2'],
  'repeat pass must not duplicate ayah keys',
)

assert.deepEqual(
  resolveChainingVisualAyahKeys({
    chainingEnabled: true,
    chainingMethod: 'linking',
    entry: { chainKey: null, verse: verses[1] },
    queue: [],
    verses,
    isInSession: (key) => key === '2:2',
  }),
  ['2:2'],
  'entries without chainKey must stay session-scoped',
)

assert.deepEqual(
  resolveChainingVisualAyahKeys({
    chainingEnabled: true,
    chainingMethod: 'linking',
    entry: pairQueue[0],
    queue: pairQueue,
    verses,
    isInSession: (key) => key !== '2:2',
  }),
  ['2:1'],
  'out-of-session keys are removed from the active chain',
)

assert.deepEqual(
  orderAyahKeysByVerseList(['2:3', '2:1', '2:2'], verses),
  ['2:1', '2:2', '2:3'],
)

assert.equal(shouldRenderChainingJoinedFlow(['2:1']), false)
assert.equal(shouldRenderChainingJoinedFlow(['2:1', '2:2']), true)

const joined = buildChainingJoinedFlowHtml(
  ['2:1', '2:2'],
  (key) => (key === '2:1' ? 'أَ<span>ّ</span>' : 'ب'),
  (key) => key === '2:2',
)
assert.match(joined, /chaining-ayah-run is-active" data-ayah-key="2:2"/)
assert.match(joined, /أَ<span>ّ<\/span>/)
assert.equal((joined.match(/data-ayah-key="/g) || []).length, 2)

const memorisationJs = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const runtimeJs = await fs.readFile(path.join(root, 'resources/js/scripts/memorisationRuntime.js'), 'utf8')

assert.match(memorisationJs, /resolveChainingVisualAyahKeys/)
assert.match(memorisationJs, /buildChainingJoinedFlowHtml/)
assert.match(memorisationVue, /chaining-joined-flow/)
assert.match(runtimeJs, /enabled: false,\s*\n\s*method: 'linking'/)

console.log('chaining-visual.test.mjs: ok')
