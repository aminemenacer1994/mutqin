import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  resolveMushafPageForVerseKey,
  resolveQpcMadaniPageForVerseKey,
} from '../../resources/js/scripts/mushaf/qpcMadaniVersePage.js'
import {
  clampMushafPage,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from '../../resources/js/scripts/mushaf/mushafLayouts.js'
import {
  resolveMadaniSpread,
  resolveMushafSpread,
} from '../../resources/js/scripts/mushaf/madaniPagePair.js'

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

const verseKey = '95:2'
const madaniPage = resolveMushafPageForVerseKey(verseKey, madaniIndex, MUSHAF_LAYOUT_MADANI_V2)
const indopakPage = resolveMushafPageForVerseKey(verseKey, indopakIndex, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)

assert.equal(madaniPage, 597)
assert.equal(indopakPage, 603)
assert.notEqual(
  madaniPage,
  indopakPage,
  'Madani and IndoPak page numbers for the same ayah must not be transferred 1:1',
)

// Same numeric page can exist in both layouts but must still come from each map independently.
assert.equal(resolveMushafPageForVerseKey('13:6', madaniIndex, MUSHAF_LAYOUT_MADANI_V2), 250)
assert.equal(resolveMushafPageForVerseKey('13:6', indopakIndex, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 250)

assert.equal(
  resolveQpcMadaniPageForVerseKey(verseKey, madaniIndex),
  madaniPage,
)

assert.equal(clampMushafPage(250, MUSHAF_LAYOUT_MADANI_V2), 250)
assert.equal(clampMushafPage(250, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 250)
assert.equal(clampMushafPage(610, MUSHAF_LAYOUT_MADANI_V2), 604)
assert.equal(clampMushafPage(610, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 610)

const madaniSpread = resolveMadaniSpread(603)
assert.deepEqual(madaniSpread.pages, [603, 604])

const indopakTail = resolveMushafSpread(609, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
assert.deepEqual(indopakTail.pages, [609, 610])

const indopakLast = resolveMushafSpread(610, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
assert.equal(indopakLast.right, 609)
assert.equal(indopakLast.left, 610)

console.log('mushaf-layout-switch.test.mjs: ok')
