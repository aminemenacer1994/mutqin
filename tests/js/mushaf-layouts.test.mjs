import assert from 'node:assert/strict'
import {
  clampMushafPage,
  DEFAULT_MUSHAF_LAYOUT_ID,
  getMushafLayout,
  isMushafLayoutId,
  listMushafLayouts,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
  mushafPageCount,
  mushafPageFileName,
  mushafPageJsonUrl,
} from '../../resources/js/scripts/mushaf/mushafLayouts.js'
import { clampMadaniPage, MADANI_MAX_PAGE, resolveMadaniSpread } from '../../resources/js/scripts/mushaf/madaniPagePair.js'
import { MADANI_LINES_PER_PAGE, MADANI_TOTAL_PAGES } from '../../resources/js/scripts/mushaf/madaniPageLayout.js'
import { madaniPageJsonUrl } from '../../resources/js/scripts/mushaf/qpcMadaniPageData.js'

const madani = getMushafLayout(MUSHAF_LAYOUT_MADANI_V2)
const indopak = getMushafLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)

assert.equal(DEFAULT_MUSHAF_LAYOUT_ID, 'madani-v2')
assert.deepEqual(listMushafLayouts().map((layout) => layout.id), ['madani-v2', 'indopak-15-qudratullah'])
assert.ok(isMushafLayoutId('indopak-15-qudratullah'))
assert.equal(isMushafLayoutId('unknown'), false)

assert.equal(madani.name, 'Madani')
assert.equal(madani.variant, 'V2')
assert.equal(madani.pageCount, 604)
assert.equal(madani.defaultLinesPerPage, 15)
assert.equal(madani.direction, 'rtl')
assert.equal(madani.fontFamily, 'QCF2')

assert.equal(indopak.id, 'indopak-15-qudratullah')
assert.equal(indopak.name, 'IndoPak 15 Lines')
assert.equal(indopak.variant, 'Qudratullah')
assert.equal(indopak.pageCount, 610)
assert.equal(indopak.defaultLinesPerPage, 15)
assert.equal(indopak.direction, 'rtl')
assert.equal(indopak.fontFamily, 'IndopakNastaleeq')
assert.equal(indopak.dataRoot, 'resources/quran/indopak-15-qudratullah/generated')
assert.equal(indopak.fontUrl, '/indopak/font/indopak-nastaleeq.woff2')
assert.equal(indopak.fontStrategy, 'unicode-text')
assert.equal(madani.fontStrategy, 'qpc-page-glyphs')
assert.equal(madani.fontUrl, null)

assert.notEqual(madani.pageCount, indopak.pageCount)
assert.equal(mushafPageCount(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 610)
assert.equal(clampMushafPage(611, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 610)
assert.equal(clampMushafPage(605, MUSHAF_LAYOUT_MADANI_V2), 604)
assert.equal(mushafPageFileName(1, madani), '001.json')
assert.equal(mushafPageFileName(1, indopak), '1.json')
assert.equal(mushafPageFileName(610, indopak), '610.json')
assert.equal(
  mushafPageJsonUrl(1, indopak),
  'resources/quran/indopak-15-qudratullah/generated/pages/1.json'
)

assert.equal(MADANI_MAX_PAGE, 604)
assert.equal(MADANI_TOTAL_PAGES, 604)
assert.equal(MADANI_LINES_PER_PAGE, 15)
assert.equal(clampMadaniPage(605), 604)
assert.deepEqual(resolveMadaniSpread(604).pages, [603, 604])
assert.equal(madaniPageJsonUrl(1), '/quran/madani-v2/pages/001.json')
assert.equal(madaniPageJsonUrl(604), '/quran/madani-v2/pages/604.json')

assert.throws(() => getMushafLayout('unknown-layout'), /Unknown mushaf layout/)

console.log('mushaf-layouts.test.mjs: ok')
