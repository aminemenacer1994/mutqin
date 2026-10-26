/**
 * Join-ayahs-together regression: short/long ranges, RTL joined-flow markup/CSS,
 * linking ↔ cumulative mode switches, and reload/persistence wiring.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { buildChainingGroups } from '../../resources/js/scripts/techniques/chainingQueue.js'
import {
  buildChainingJoinedFlowHtml,
  resolveChainingVisualAyahKeys,
  shouldRenderChainingJoinedFlow,
} from '../../resources/js/scripts/techniques/chainingVisual.js'
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

function makeVerses(surah, count) {
  return Array.from({ length: count }, (_, index) => ({
    key: `${surah}:${index + 1}`,
    number: index + 1,
  }))
}

function flattenGroupKeys(groups) {
  return groups.flatMap((group) => group.map((item) => item.verse.key))
}

function simulateCumulativeVisualKeys(verses, endIndexInclusive) {
  const chainKey = `cumulative:${endIndexInclusive + 1}`
  const queue = verses.slice(0, endIndexInclusive + 1).map((verse, chainIndex) => ({
    verse,
    chainKey,
    repeatCount: 1,
    sequencePosition: chainIndex + 1,
    sequenceTotal: endIndexInclusive + 1,
    phase: 'Cumulative',
  }))
  return resolveChainingVisualAyahKeys({
    chainingEnabled: true,
    chainingMethod: 'cumulative',
    entry: queue[queue.length - 1],
    queue,
    verses,
  })
}

// —— Short range (2 ayahs) ——
const short = makeVerses(1, 2)
const shortLinking = buildChainingGroups(short, 'linking')
assert.equal(shortLinking.length, 3, '2 ayahs linking → 2 singles + 1 pair')
assert.equal(shortLinking[1].length, 2)
assert.equal(shortLinking[1][0].chainKey, 'linking:1:1->1:2')

const shortCumulative = buildChainingGroups(short, 'cumulative')
assert.equal(shortCumulative.length, 2)
assert.deepEqual(flattenGroupKeys(shortCumulative), ['1:1', '1:1', '1:2'])

assert.deepEqual(simulateCumulativeVisualKeys(short, 1), ['1:1', '1:2'])
assert.equal(shouldRenderChainingJoinedFlow(simulateCumulativeVisualKeys(short, 1)), true)

// —— Long range (30 ayahs) ——
const long = makeVerses(2, 30)
const longLinking = buildChainingGroups(long, 'linking')
assert.equal(longLinking.length, 59, '30 ayahs linking → 30 singles + 29 pairs')

const longCumulative = buildChainingGroups(long, 'cumulative')
assert.equal(longCumulative.length, 30)
assert.equal(longCumulative[29].length, 30)
assert.deepEqual(
  longCumulative[29].map((item) => item.verse.key),
  long.map((verse) => verse.key),
)

const longVisual = simulateCumulativeVisualKeys(long, 29)
assert.equal(longVisual.length, 30)
assert.deepEqual(longVisual, long.map((verse) => verse.key))

const longHtml = buildChainingJoinedFlowHtml(
  longVisual,
  (key) => `w-${key.split(':')[1]}`,
  () => false,
)
assert.equal((longHtml.match(/data-ayah-key="/g) || []).length, 30)
assert.match(longHtml, /data-ayah-key="2:1"/)
assert.match(longHtml, /data-ayah-key="2:30"/)
const firstRun = longHtml.indexOf('data-ayah-key="2:1"')
const lastRun = longHtml.indexOf('data-ayah-key="2:30"')
assert.ok(firstRun >= 0 && lastRun > firstRun, 'joined HTML keeps surah order left-to-right in source')

// Session slice on long range (ayahs 5–10 only)
const sessionKeys = new Set(long.slice(4, 10).map((verse) => verse.key))
const scoped = resolveChainingVisualAyahKeys({
  chainingEnabled: true,
  chainingMethod: 'cumulative',
  entry: {
    chainKey: 'cumulative:10',
    repeatCount: 1,
    verse: long[9],
    sequencePosition: 10,
    sequenceTotal: 10,
  },
  queue: long.slice(0, 10).map((verse, chainIndex) => ({
    verse,
    chainKey: 'cumulative:10',
    repeatCount: 1,
    sequencePosition: chainIndex + 1,
    sequenceTotal: 10,
  })),
  verses: long,
  isInSession: (key) => sessionKeys.has(key),
})
assert.deepEqual(scoped, ['2:5', '2:6', '2:7', '2:8', '2:9', '2:10'])

// —— RTL joined-flow presentation (template + CSS) ——
const memorisationVue = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const memorisationCss = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const memorisationJs = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(
  memorisationVue,
  /class="verse-arabic[^"]*chaining-joined-flow__arabic"[\s\S]*?dir="rtl"[\s\S]*?lang="ar"/,
  'joined flow container must be RTL Arabic',
)
assert.match(memorisationVue, /buildChainingJoinedFlowHtml\(\)/)
assert.match(memorisationVue, /chain-join-\$\{chainingVisualAyahKeys\.join\('-'\)\}/, 'reload key includes active chain ayahs')

const joinedCssBlock = memorisationCss.match(
  /\.chaining-joined-flow__arabic\s*\{[^}]+\}/,
)?.[0] || ''
assert.match(joinedCssBlock, /text-align:\s*right/)
assert.match(joinedCssBlock, /unicode-bidi:\s*plaintext/)
assert.doesNotMatch(joinedCssBlock, /overflow-wrap:\s*anywhere/, 'anywhere breaks Arabic joining on joined flow')
assert.match(memorisationCss, /\.chaining-ayah-run\s*\{[^}]*display:\s*inline/)
assert.match(memorisationCss, /\.chaining-ayah-run__text\s*\{[^}]*display:\s*inline/)

// —— Switching chaining method (runtime wiring + queue shape) ——
assert.match(memorisationJs, /chainingMethod\(\)\s*\{[\s\S]*?applyChainingQueueChange\(this\.currentMode\)/)
assert.match(memorisationJs, /setChainingMethod\(method\)[\s\S]*?applyChainingQueueChange\(this\.currentMode, \{ restart: true \}\)/)
assert.match(memorisationJs, /chainingEnabled\(newVal\)[\s\S]*?applyChainingQueueChange\(this\.currentMode\)/)

const linkingGroups = buildChainingGroups(makeVerses(110, 4), 'linking')
const cumulativeGroups = buildChainingGroups(makeVerses(110, 4), 'cumulative')
assert.notEqual(linkingGroups.length, cumulativeGroups.length)
assert.equal(cumulativeGroups.length, 4)
assert.equal(linkingGroups.length, 7)

// —— Reload / persistence ——
assert.match(
  memorisationJs,
  /loadCentralSessionState\(\)[\s\S]*?this\.chainingEnabled = !!this\.centralSession\.chaining\.enabled/,
)
assert.match(
  memorisationJs,
  /persistCentralSessionState\(\)[\s\S]*?enabled: !!this\.chainingEnabled[\s\S]*?method: this\.chainingMethod/,
)
assert.match(
  memorisationJs,
  /performResetControls\(\)[\s\S]*?applyChainingQueueChange\(this\.currentMode, \{ restart: true \}\)/,
)
assert.match(memorisationJs, /buildDisplayArabicCacheKey[\s\S]*?chainSig/)
assert.match(memorisationJs, /repetitionsPerStep\(newVal\)[\s\S]*?this\.chainingEnabled[\s\S]*?applyChainingQueueChange/)

const runtimeJs = await fs.readFile(path.join(root, 'resources/js/scripts/memorisationRuntime.js'), 'utf8')
assert.match(
  runtimeJs,
  /chaining:\s*\{\s*\n\s*enabled:\s*false/,
  'fresh central session must not enable chaining by default',
)

console.log('chaining-regression.test.mjs: ok')
