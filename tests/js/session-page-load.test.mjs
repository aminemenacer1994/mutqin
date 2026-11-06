import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { isConstrainedMushafClient } from '../../resources/js/scripts/mushaf/constrainedClient.js'
import {
  mapWithConcurrency,
  orderPagesAroundFocus,
  planSessionPageWave,
  selectPriorityPages,
} from '../../resources/js/scripts/mushaf/sessionPageLoad.js'
import { planStackedQpcPageFetch } from '../../resources/js/scripts/mushaf/stackedQpcMadaniDisplay.js'

const pages = [2, 3, 4, 5, 6, 7, 8]

assert.deepEqual(orderPagesAroundFocus(pages, 5), [5, 6, 4, 7, 3, 8, 2])
assert.deepEqual(orderPagesAroundFocus([8, 2, 2, 5], 2), [2, 5, 8])
assert.deepEqual(selectPriorityPages(pages, 5, 1), [4, 5, 6])
assert.deepEqual(selectPriorityPages(pages, 2, 1), [2, 3])
assert.deepEqual(selectPriorityPages(pages, 99, 1), [2, 3])
assert.deepEqual(selectPriorityPages([], 1, 1), [])

const seen = []
await mapWithConcurrency([1, 2, 3, 4, 5], 2, async (value) => {
  seen.push(value)
  await Promise.resolve()
  return value
})
assert.deepEqual(seen, [1, 2, 3, 4, 5])

let ran = 0
await mapWithConcurrency([1, 2, 3, 4], 1, async () => {
  ran += 1
}, () => ran < 2)
assert.equal(ran, 2)

const index = { '2:1': 2, '2:2': 2, '2:3': 3, '2:4': 5, '2:5': 6 }
const verses = [1, 2, 3, 4, 5].map((ayah) => ({ key: `2:${ayah}` }))
const aroundStart = planStackedQpcPageFetch(verses, index, 2, { radius: 1, fullThreshold: 3 })
assert.ok(aroundStart.priority.includes(2))
assert.ok(aroundStart.priority.length <= 3)
assert.ok(aroundStart.rest.length > 0)
assert.ok(!aroundStart.rest.some((page) => aroundStart.priority.includes(page)))

const short = planStackedQpcPageFetch(verses.slice(0, 2), { '2:1': 2, '2:2': 2 }, 2)
assert.deepEqual(short.rest, [])
assert.ok(short.priority.includes(2))

const longSession = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]
const phoneWave = planSessionPageWave(longSession, 6, { constrained: true })
assert.deepEqual(phoneWave.immediate, [5, 6, 7])
assert.deepEqual(phoneWave.prefetch, [8])
assert.deepEqual(phoneWave.background, [])
const desktopWave = planSessionPageWave(longSession, 6, { constrained: false })
assert.ok(desktopWave.immediate.includes(6))
assert.equal(desktopWave.prefetch.length, 6)
assert.ok(desktopWave.background.length > 0)
assert.ok(!desktopWave.background.some((page) => desktopWave.immediate.includes(page)))

assert.equal(isConstrainedMushafClient({
  navigator: { userAgent: 'Mozilla', deviceMemory: 8 },
  window: { innerWidth: 1280 },
}), false)
assert.equal(isConstrainedMushafClient({
  navigator: { userAgent: 'Mozilla', deviceMemory: 8 },
  window: { innerWidth: 390 },
}), true)
assert.equal(isConstrainedMushafClient({
  navigator: { userAgent: 'Instagram 300', deviceMemory: 8 },
  window: { innerWidth: 1280 },
}), true)
assert.equal(isConstrainedMushafClient({
  navigator: { userAgent: 'Mozilla', deviceMemory: 8, connection: { saveData: true } },
  window: { innerWidth: 1280 },
}), true)
assert.equal(isConstrainedMushafClient({
  navigator: { userAgent: 'Mozilla', deviceMemory: 4 },
  window: { innerWidth: 1280 },
}), true)

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const sessionScroll = readFileSync(join(root, 'resources/js/components/madani/MadaniSessionScroll.vue'), 'utf8')

assert.match(memorisationJs, /planSessionPageWave\(sessionPages/)
assert.match(memorisationJs, /beginRevisionFromCurrentRange/)
assert.match(memorisationJs, /_rangePreserveActiveKey/)
assert.match(memorisationJs, /sessionMode === 'revision'/)
assert.match(memorisationJs, /enrichRemainingStackedQpcPages/)
assert.match(memorisationJs, /!this\.useStackedQpcMadaniGlyphs/)
assert.doesNotMatch(memorisationJs, /sessionPages\.map\(\(page\) => loadMadaniPageLeaf/)
assert.doesNotMatch(memorisationJs, /syncQpcMadaniTajweedGlyphsForViewport\(\{ force: true, scope: 'session' \}\)/)
assert.match(sessionScroll, /shouldPaintPage/)
assert.match(sessionScroll, /FULL_PAINT_PAGE_LIMIT/)
assert.match(sessionScroll, /planSessionPageWave/)
assert.match(sessionScroll, /isConstrainedMushafClient/)
assert.match(sessionScroll, /retryPage/)
assert.doesNotMatch(sessionScroll, /for \(const pageNumber of pages\) \{\s*const cached/)

const qcfLoader = readFileSync(join(root, 'resources/js/scripts/mushaf/qcfFontLoader.js'), 'utf8')
assert.match(qcfLoader, /format\('woff2'\)/)
assert.doesNotMatch(qcfLoader, /format\('truetype'\)/)
assert.doesNotMatch(qcfLoader, /format\('woff'\)/)

console.log('session-page-load.test.mjs: ok')
