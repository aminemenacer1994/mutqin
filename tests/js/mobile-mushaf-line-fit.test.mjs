import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MOBILE_MUSHAF_HAIRLINE_PX,
  MOBILE_MUSHAF_WORD_SIZE_CAP,
  compactMobileMushafDisplayLines,
  isMobileMushafAyahSparse,
  mobileMushafAyahJustify,
  mobileMushafFitSafety,
  mobileMushafHairlinePadding,
  mobileMushafWordSizePx,
  qcfSideBearingPx,
  reorderMushafOpeningLines,
  stripMushafHtmlBreaks,
} from '../../resources/js/scripts/mushaf/mobileMushafLineFit.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pageVue = readFileSync(join(root, 'resources/js/components/madani/MadaniPage.vue'), 'utf8')
const lineVue = readFileSync(join(root, 'resources/js/components/madani/MadaniLine.vue'), 'utf8')
const sessionVue = readFileSync(join(root, 'resources/js/components/madani/MadaniSessionScroll.vue'), 'utf8')
const spreadVue = readFileSync(join(root, 'resources/js/components/madani/MadaniSpread.vue'), 'utf8')
const mobileGrid = readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')
const blade = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.equal(MOBILE_MUSHAF_WORD_SIZE_CAP, 20)
assert.equal(mobileMushafWordSizePx(390), 17)
assert.equal(mobileMushafWordSizePx(320), 15)
assert.equal(mobileMushafWordSizePx(844), 20)
assert.equal(MOBILE_MUSHAF_HAIRLINE_PX, 16)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 120, availableWidth: 360, wordCount: 3 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 340, availableWidth: 360, wordCount: 9 }), false)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 300, availableWidth: 360, wordCount: 6 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 200, availableWidth: 360, wordCount: 8, ratio: 0.9 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 0, availableWidth: 360 }), false)
assert.equal(mobileMushafAyahJustify(true), 'center')
assert.equal(mobileMushafAyahJustify(false), 'space-between')
assert.equal(mobileMushafFitSafety(), 0.7)
assert.equal(mobileMushafFitSafety({ indopak: true }), 0.78)
assert.equal(mobileMushafHairlinePadding(0, 0), `${MOBILE_MUSHAF_HAIRLINE_PX}px ${MOBILE_MUSHAF_HAIRLINE_PX}px`)
assert.ok(qcfSideBearingPx(40) >= 8)
assert.equal(stripMushafHtmlBreaks('a<br>b<br/>c'), 'abc')
assert.match(pageVue, /applySharedWordSize\(\) \{\s*\n\s*const root = this\.\$el/)
assert.match(pageVue, /Unify every session page/)
assert.match(blade, /mutqin-memorisation-hotfix-v213/)
assert.match(blade, /mutqin-memorisation-hotfix-v214/)
assert.match(blade, /mutqin-memorisation-hotfix-v215/)
assert.match(blade, /mutqin-memorisation-hotfix-v217/)
assert.match(pageVue, /densityCap/)
assert.match(pageVue, /mobileViewportInnerWidth/)
assert.match(pageVue, /MOBILE_MUSHAF_WORD_SIZE_CAP/)
assert.match(pageVue, /mobile \? Math\.min\(requested, 1\.05\)/)
assert.match(pageVue, /sharedWordSize/)
assert.match(pageVue, /Plain ↔ tajweed swaps glyph faces/)
assert.match(sessionVue, /fitSizesByPage = \{\}/)
assert.match(sessionVue, /sharedWordSize = 0/)
assert.match(spreadVue, /resetSpreadWordSizeSync\(\)/)

const compact = compactMobileMushafDisplayLines([
  { line_type: 'basmala', line_number: 1 },
  { line_type: 'surah_name', line_number: 2, surah_number: 108 },
  { line_type: 'basmala', line_number: 3 },
  { line_type: 'empty', line_number: 4 },
  { line_type: 'ayah', line_number: 5 },
])
assert.deepEqual(compact.map((line) => line.line_type), ['surah_name', 'basmala', 'ayah'])

const reordered = reorderMushafOpeningLines([
  { line_type: 'basmala', line_number: 1 },
  { line_type: 'surah_name', line_number: 2, surah_number: 108 },
  { line_type: 'empty', line_number: 3 },
  { line_type: 'ayah', line_number: 4 },
])
assert.deepEqual(reordered.map((line) => line.line_type), ['surah_name', 'basmala', 'empty', 'ayah'])

assert.match(pageVue, /compactMobileMushafDisplayLines/)
assert.match(pageVue, /reorderMushafOpeningLines/)
assert.match(pageVue, /isTabletViewport/)
assert.match(pageVue, /DESKTOP_MUSHAF_SPARSE_RATIO/)
assert.match(blade, /mutqin-memorisation-hotfix-v211/)
assert.match(blade, /mutqin-memorisation-hotfix-v212/)
assert.match(pageVue, /applyMobileAyahRowPacking/)
assert.doesNotMatch(pageVue, /padPrintedMushafLines/)
assert.match(lineVue, /qpc-madani-line--sparse/)
assert.match(lineVue, /justify-content: center !important/)
assert.match(mobileGrid, /qpc-madani-line--ayah:not\(\.qpc-madani-line--sparse\)/)
assert.match(mobileGrid, /qpc-madani-line--sparse[\s\S]*?justify-content:\s*center\s*!important/)
assert.match(blade, /mutqin-memorisation-hotfix-v210/)
assert.match(blade, /qpc-madani-line--sparse[\s\S]*?justify-content:\s*center/)
assert.match(memorisationJs, /madani-line--sparse/)
assert.match(mobileGrid, /workspace-reading-surface--stacked[\s\S]{0,400}verse-card/)

console.log('mobile-mushaf-line-fit.test.mjs: ok')
