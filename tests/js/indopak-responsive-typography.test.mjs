import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  INDOPAK_PAGE_TYPOGRAPHY,
  INDOPAK_TWO_PAGE_MIN_WIDTH,
  MADANI_TWO_PAGE_MIN_WIDTH,
  indopakFitSafety,
  indopakFitWordSizeCap,
  mushafTwoPageMinWidth,
  shouldShowTwoMushafPages,
} from '../../resources/js/scripts/mushaf/indopakPageTypography.js'
import {
  shouldShowTwoMadaniPages,
  shouldShowTwoMushafPages as pairShouldShowTwo,
} from '../../resources/js/scripts/mushaf/madaniPagePair.js'
import {
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from '../../resources/js/scripts/mushaf/mushafLayouts.js'

assert.equal(MADANI_TWO_PAGE_MIN_WIDTH, 1080)
assert.equal(INDOPAK_TWO_PAGE_MIN_WIDTH, 1200)
assert.ok(INDOPAK_TWO_PAGE_MIN_WIDTH > MADANI_TWO_PAGE_MIN_WIDTH)

assert.equal(mushafTwoPageMinWidth(MUSHAF_LAYOUT_MADANI_V2), 1080)
assert.equal(mushafTwoPageMinWidth(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), 1200)

assert.equal(shouldShowTwoMadaniPages(1079), false)
assert.equal(shouldShowTwoMadaniPages(1080), true)
assert.equal(shouldShowTwoMushafPages(1199, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), false)
assert.equal(shouldShowTwoMushafPages(1200, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), true)
assert.equal(pairShouldShowTwo(1200, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), true)
// Tablet band: IndoPak stays single while Madani could already spread at 1080+.
assert.equal(shouldShowTwoMushafPages(1100, MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), false)
assert.equal(shouldShowTwoMushafPages(1100, MUSHAF_LAYOUT_MADANI_V2), true)

const typo = INDOPAK_PAGE_TYPOGRAPHY
assert.equal(typo.wordSize, '17px')
assert.equal(typo.lineHeight, '1.92')
assert.equal(typo.lineMinHeight, '2.12')
assert.equal(typo.lineGap, '0.14')
assert.ok(Number(typo.lineHeight) > 1.32, 'IndoPak line-height must exceed Madani QCF 1.32')
assert.ok(Number(typo.lineMinHeight) > 1.62, 'IndoPak line-min-height must exceed Madani QCF 1.62')

assert.equal(indopakFitWordSizeCap({ mobile: true, narrow: false }), 46)
assert.equal(indopakFitWordSizeCap({ desktopSpread: true, narrow: false }), 46)
assert.ok(indopakFitWordSizeCap({ mobile: true }) < 60, 'IndoPak mobile cap must not reuse Madani 60px')
assert.ok(indopakFitSafety({ mobile: true }) <= 0.9)

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pageVue = readFileSync(join(root, 'resources/js/components/madani/MadaniPage.vue'), 'utf8')
assert.match(pageVue, /qpc-madani-page--indopak/)
assert.match(pageVue, /--qpc-line-gap/)
assert.match(pageVue, /--qpc-line-height:\s*1\.92/)
assert.match(pageVue, /--qpc-line-min-height:\s*2\.12/)
assert.match(pageVue, /indopakFitWordSizeCap/)
assert.match(pageVue, /applyIndopakPageTypographyVars/)
assert.match(pageVue, /INDOPAK_MEASURE_SIZE/)
assert.doesNotMatch(pageVue, /Do not alter Quran word/)

const lineVue = readFileSync(join(root, 'resources/js/components/madani/MadaniLine.vue'), 'utf8')
assert.match(lineVue, /--qpc-line-gap/)

const scrollVue = readFileSync(join(root, 'resources/js/components/madani/MadaniSessionScroll.vue'), 'utf8')
assert.match(scrollVue, /overflow-x:\s*clip/)
assert.match(scrollVue, /indopak-15-qudratullah/)

const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
assert.match(memorisationJs, /mushafTwoPageMinWidth\(this\.mushafLayoutId\)/)
assert.match(memorisationJs, /shouldShowTwoMushafPages\([^)]+this\.mushafLayoutId\)/)

console.log('indopak-responsive-typography.test.mjs: ok')
