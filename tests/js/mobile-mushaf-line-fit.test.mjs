import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  MOBILE_MUSHAF_HAIRLINE_PX,
  MOBILE_MUSHAF_WORD_SIZE_CAP,
  MOBILE_MUSHAF_WORD_SIZE_FLOOR,
  clampMobileMushafWordSize,
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

assert.equal(MOBILE_MUSHAF_WORD_SIZE_FLOOR, 22)
assert.equal(MOBILE_MUSHAF_WORD_SIZE_CAP, 30)
assert.equal(mobileMushafWordSizePx(390), 30)
assert.equal(mobileMushafWordSizePx(320), 24)
assert.equal(mobileMushafWordSizePx(844), 30)
assert.equal(clampMobileMushafWordSize(10), 22)
assert.equal(clampMobileMushafWordSize(40), 30)
assert.equal(clampMobileMushafWordSize(25), 25)
assert.equal(MOBILE_MUSHAF_HAIRLINE_PX, 0)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 120, availableWidth: 360, wordCount: 3 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 340, availableWidth: 360, wordCount: 9 }), false)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 300, availableWidth: 360, wordCount: 6 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 200, availableWidth: 360, wordCount: 8, ratio: 0.9 }), true)
// Phone leftover rows must centre (ratio + word-cap); dense near-full rows still stretch.
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 200, availableWidth: 360, wordCount: 8, phone: true }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 340, availableWidth: 360, wordCount: 10, phone: true }), false)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 200, availableWidth: 360, wordCount: 7, phone: true }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 0, availableWidth: 360 }), false)
// Fatihah L7–L8: short rows centre even before glyph widths are measurable.
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 0, availableWidth: 360, wordCount: 3 }), true)
assert.equal(isMobileMushafAyahSparse({ naturalWidth: 0, availableWidth: 360, wordCount: 4 }), true)
assert.match(lineVue, /qpc-madani-line--ayah\.qpc-madani-line--centered/)
assert.match(pageVue, /printedCentered|data-centered/)
assert.equal(mobileMushafAyahJustify(true), 'center')
assert.equal(mobileMushafAyahJustify(false), 'space-between')
assert.equal(mobileMushafFitSafety(), 0.96)
assert.equal(mobileMushafFitSafety({ indopak: true }), 0.94)
assert.equal(mobileMushafHairlinePadding(0, 0), `${MOBILE_MUSHAF_HAIRLINE_PX}px ${MOBILE_MUSHAF_HAIRLINE_PX}px`)
assert.ok(qcfSideBearingPx(40) >= 8)
assert.equal(stripMushafHtmlBreaks('a<br>b<br/>c'), 'abc')
assert.equal(stripMushafHtmlBreaks('١٢\n٣<br>٤'), '١٢٣٤')
assert.match(pageVue, /applySharedWordSize\(\) \{\s*\n\s*const root = this\.\$el/)
assert.match(pageVue, /Unify every session page/)
assert.match(pageVue, /clampMobileMushafWordSize/)
assert.match(pageVue, /mobileMushafWordSizePx\(viewW\)/)
assert.match(pageVue, /do NOT seed from widthFit/)
assert.match(blade, /mutqin-memorisation-hotfix-v213/)
assert.match(blade, /mutqin-memorisation-hotfix-v214/)
assert.match(blade, /mutqin-memorisation-hotfix-v215/)
assert.match(blade, /mutqin-memorisation-hotfix-v217/)
assert.match(blade, /mutqin-memorisation-hotfix-v218/)
assert.match(blade, /mutqin-memorisation-hotfix-v219/)
assert.match(blade, /mutqin-memorisation-hotfix-v220/)
assert.match(blade, /mutqin-memorisation-hotfix-v221/)
assert.match(blade, /mutqin-memorisation-hotfix-v224/)
assert.match(blade, /mutqin-memorisation-hotfix-v225/)
assert.match(blade, /mutqin-memorisation-hotfix-v226/)
assert.match(blade, /Noto Naskh Arabic/)
assert.match(blade, /font-size: max\(1\.25rem, calc\(var\(--qpc-word-size, 24px\) \* 1\.05\)\)/)
assert.match(blade, /ensureMadaniFolioChrome/)
assert.match(blade, /mutqin-madani-folio-size-v7/)
assert.match(blade, /mutqin-memorisation-hotfix-v229/)
assert.match(blade, /--mushaf-reading-ink, var\(--qpc-ink, #1b140d\)/)
assert.match(pageVue, /--mushaf-reading-ink/)
assert.doesNotMatch(pageVue, /qpc-madani-page__folio \{\s*\n\s*color: #8a7048/)
assert.doesNotMatch(pageVue, /dark\s*\?\s*'#ffffff'/)
assert.match(blade, /folio-number::before/)
assert.match(blade, /content: none !important/)
assert.match(pageVue, /applySessionFolioChrome/)
assert.match(pageVue, /folioPx = Math\.max\(22, Math\.round\(wordPx \* 1\.05\)\)/)
assert.match(pageVue, /Noto Naskh Arabic/)
assert.match(pageVue, /folio-number::before/)
assert.match(blade, /qpc-madani-line--ayah\.qpc-madani-line--centered/)
assert.match(blade, /data-desktop-short-page/)
assert.match(blade, /--qpc-line-gap:\s*0\.14/)
assert.match(blade, /font-size: max\(22px, var\(--qpc-word-size, 24px\)\)/)
assert.match(pageVue, /--qpc-line-min-height:\s*1\.4/)
assert.match(pageVue, /--qpc-surah-title-scale: 3\.5/)
assert.match(pageVue, /shortPage/)
assert.match(pageVue, /spreadDesktopLayoutLocked/)
assert.match(lineVue, /margin-block-end: calc\(var\(--qpc-word-size, 22px\) \* 0\.72\)/)
assert.match(lineVue, /padding-block-end: calc\(var\(--qpc-word-size, 22px\) \* 0\.55\)/)
assert.doesNotMatch(pageVue, /qpc-madani-page__folio-break/)
assert.match(memorisationJs, /stripMushafHtmlBreaks\(cleaned\)/)
assert.match(memorisationJs, /isMurajaahReviewEntry/)
assert.match(memorisationJs, /_suppressEmptyWorkspaceTools/)
assert.match(memorisationJs, /earlyMurajaahReviewEntry/)
assert.match(memorisationJs, /openToolsForSetupFailure/)
assert.match(memorisationJs, /window\.location\.assign\(this\.learnerDashboardUrl\)/)
assert.match(memorisationJs, /completing locally/)
assert.match(pageVue, /densityCap/)
assert.match(pageVue, /mobileViewportInnerWidth/)
assert.match(pageVue, /MOBILE_MUSHAF_WORD_SIZE_CAP/)
assert.match(pageVue, /mobile \? Math\.min\(requested, 1\.08\)/)
assert.match(pageVue, /sharedWordSize/)
assert.match(pageVue, /hasRevealed/)
assert.match(pageVue, /Remasure after paint without hiding/)
assert.match(pageVue, /--mushaf-reading-surface/)
assert.doesNotMatch(pageVue, /linear-gradient\(180deg, #f7edd6/)
assert.match(pageVue, /applyMobileEdgeToEdgeChrome/)
assert.match(pageVue, /phone,\s*\n\s*\}/)
assert.match(pageVue, /tajweedEnabled\) \{\s*\n\s*size = clampMobileMushafWordSize\(size \+ 2\)/)
assert.doesNotMatch(pageVue, /overflow-x',\s*'clip'/)
assert.match(sessionVue, /fitSizesByPage = \{\}/)
assert.match(sessionVue, /sharedWordSize = 0/)
assert.match(sessionVue, /MOBILE_MUSHAF_WORD_SIZE_FLOOR/)
assert.match(spreadVue, /resetSpreadWordSizeSync\(\)/)
assert.match(spreadVue, /data-desktop-short-page/)
assert.match(spreadVue, /printedCentered/)

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
assert.match(mobileGrid, /font-size: var\(--qpc-word-size, 24px\)/)
assert.doesNotMatch(mobileGrid, /min\(var\(--qpc-word-size, 18px\), 20px\)/)

console.log('mobile-mushaf-line-fit.test.mjs: ok')
