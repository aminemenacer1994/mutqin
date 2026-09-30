import assert from 'node:assert/strict'
import {
  clampMushafPage,
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from '../../resources/js/scripts/mushaf/mushafLayouts.js'
import {
  nextMushafPage,
  previousMushafPage,
  nextMushafSpread,
  previousMushafSpread,
  resolveMushafSpread,
} from '../../resources/js/scripts/mushaf/madaniPagePair.js'
import {
  resolveMushafPageForVerseKey,
} from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const madani = getMushafLayout(MUSHAF_LAYOUT_MADANI_V2)
const indopak = getMushafLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)

assert.equal(madani.pageCount, 604)
assert.equal(indopak.pageCount, 610)

// page 1 → previous disabled
assert.equal(previousMushafPage(1, indopak), null)
assert.equal(previousMushafPage(1, madani), null)
assert.equal(previousMushafSpread(1, indopak), null)

// page 610 → next disabled (IndoPak)
assert.equal(nextMushafPage(610, indopak), null)
assert.equal(nextMushafSpread(610, indopak), null)
assert.equal(nextMushafSpread(609, indopak), null)

// page 604 → next remains enabled for IndoPak
assert.equal(nextMushafPage(604, indopak), 605)
assert.equal(nextMushafPage(604, madani), null)

// Clamping uses activeLayout.pageCount
assert.equal(clampMushafPage(0, indopak), 1)
assert.equal(clampMushafPage(611, indopak), 610)
assert.equal(clampMushafPage(605, madani), 604)
assert.equal(clampMushafPage(610, madani), 604)

// Switching IndoPak → Madani clamps/navigates semantically via verseKey remap
const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const madaniIndex = JSON.parse(
  readFileSync(join(root, 'public/quran/madani-v2/verse-pages.json'), 'utf8'),
)
const indopakIndex = JSON.parse(
  readFileSync(
    join(root, 'resources/quran/indopak-15-qudratullah/generated/verse-page-map.json'),
    'utf8',
  ),
)

const endKey = '114:6'
const indoEndPage = resolveMushafPageForVerseKey(endKey, indopakIndex, indopak)
const madaniEndPage = resolveMushafPageForVerseKey(endKey, madaniIndex, madani)
assert.equal(indoEndPage, 610)
assert.equal(madaniEndPage, 604)
// Never copy IndoPak page 610 into Madani — remap via verse, then clamp
assert.equal(clampMushafPage(indoEndPage, madani), 604)
assert.notEqual(indoEndPage, madaniEndPage)

// Mid-mushaf page 604 on IndoPak is not the last leaf
const midSpread = resolveMushafSpread(604, indopak)
assert.deepEqual(midSpread.pages, [603, 604])
assert.equal(nextMushafPage(midSpread.left, indopak), 605)

console.log('mushaf-page-bounds.test.mjs: ok')
