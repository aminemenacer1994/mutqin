import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveMadaniPage,
  resolveQpcMadaniPageForVerseKey,
  verseKeyFromCoordinates,
} from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'
import {
  orderMadaniSpreadLeavesForOpening,
  pairSessionPages,
  resolveMadaniSpread,
  resolveSessionAwareSpread,
  resolveSpreadLeafPageNumbers,
} from '../../resources/js/scripts/mushaf/madaniPagePair.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const index = JSON.parse(readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'))
const keys = Object.keys(index)

assert.equal(keys.length, 6236, 'resolver covers all 6,236 ayahs')
assert.equal(resolveMadaniPage(1, 1, index), 1)
assert.equal(resolveMadaniPage(2, 1, index), 2)
assert.equal(resolveMadaniPage(2, 30, index), 6)
assert.equal(resolveMadaniPage(2, 34, index), 6)
assert.equal(resolveMadaniPage(18, 54, index), 300)
assert.equal(resolveMadaniPage(109, 1, index), 603)
assert.equal(resolveMadaniPage(114, 6, index), 604)
assert.equal(resolveQpcMadaniPageForVerseKey('2:34:1', index), 6)
assert.equal(verseKeyFromCoordinates(2, 34), '2:34')

for (const key of keys) {
  const page = index[key]
  assert.ok(page >= 1 && page <= 604, `${key} mapped outside 1–604: ${page}`)
}

assert.deepEqual(resolveMadaniSpread(1).pages, [1, 2])
assert.deepEqual(resolveMadaniSpread(2).pages, [1, 2])
assert.deepEqual(resolveMadaniSpread(6).pages, [5, 6])
assert.deepEqual(resolveMadaniSpread(603).pages, [603, 604])
assert.deepEqual(resolveMadaniSpread(604).pages, [603, 604])
assert.deepEqual(
  pairSessionPages([2, 3, 4, 5]).map((pair) => pair.pages),
  [[2, 3], [4, 5]],
)
assert.deepEqual(
  resolveSessionAwareSpread(2, [2, 3, 4, 5]).pages,
  [2, 3],
  'Baqarah opening pairs session pages 2+3, not empty page 1',
)
assert.deepEqual(resolveSessionAwareSpread(537, [537, 538, 539, 540]).pages, [537, 538])
assert.deepEqual(
  resolveSpreadLeafPageNumbers({
    spreadPages: [1, 2],
    sessionPageNumbers: [2, 3, 4],
    currentPage: 2,
    keepPrintedPair: true,
  }),
  [2, 3],
)
assert.deepEqual(
  resolveSpreadLeafPageNumbers({
    spreadPages: [537, 538],
    sessionPageNumbers: [538],
    keepPrintedPair: false,
  }),
  [538],
)

const oddLeaf = { pageNumber: 5, page: { lines: [] } }
const evenLeaf = { pageNumber: 6, page: { lines: ['x'] } }
assert.deepEqual(
  orderMadaniSpreadLeavesForOpening([oddLeaf, evenLeaf]),
  [evenLeaf, oddLeaf],
  'populated even page moves to RTL right slot',
)
assert.deepEqual(
  orderMadaniSpreadLeavesForOpening([evenLeaf, oddLeaf]),
  [evenLeaf, oddLeaf],
  'already-right order unchanged',
)

const spreadVue = readFileSync(join(root, 'resources/js/components/madani/MadaniSpread.vue'), 'utf8')
assert.match(spreadVue, /resolveSessionAwareSpread\(this\.displayedPageNumber, this\.sessionPageNumbers\)/)
assert.match(spreadVue, /if \(this\.readerDesktopSpread\) \{\s*return leaves/)
assert.match(spreadVue, /if \(this\.readerDesktopSpread\) return ''/)

const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
assert.match(memorisationVue, /:active-ayah="qpcMadaniSelectionActiveAyah"/, 'reader exposes activeAyah to Madani')
assert.match(memorisationVue, /hide-dev-nav/, 'production Madani hides standalone pager')

console.log('resolve-madani-page.test.mjs: ok')
