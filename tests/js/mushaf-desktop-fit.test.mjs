import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DESKTOP_SPREAD_FOLIO_RESERVE_PX,
  DESKTOP_SPREAD_LINE_SLOTS,
  desktopSpreadSheetHeight,
  desktopSpreadStableWordSize,
} from '../../resources/js/scripts/mushaf/mushafDesktopFit.js'

assert.equal(DESKTOP_SPREAD_LINE_SLOTS, 15)
assert.equal(DESKTOP_SPREAD_FOLIO_RESERVE_PX, 44)

const shortPage = desktopSpreadStableWordSize({
  measureSize: 40,
  safety: 0.95,
  cap: 68,
  fontScale: 1.3,
  heightFit: 90,
})
const fullPage = desktopSpreadStableWordSize({
  measureSize: 40,
  safety: 0.95,
  cap: 68,
  fontScale: 1.3,
  heightFit: 90,
})
assert.equal(shortPage, fullPage, 'desktop word size must not change with page content')
assert.equal(shortPage, 38)

const tightHeight = desktopSpreadStableWordSize({
  measureSize: 40,
  safety: 0.95,
  cap: 68,
  fontScale: 1.3,
  heightFit: 24,
})
assert.equal(tightHeight, 24, 'height band still caps the stable size')

assert.equal(
  desktopSpreadSheetHeight({ targetHeight: 666, sheetPaddingY: 40 }),
  desktopSpreadSheetHeight({ targetHeight: 666, sheetPaddingY: 40 }),
)
assert.equal(desktopSpreadSheetHeight({ targetHeight: 666, sheetPaddingY: 40 }), 582)

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const pageVue = readFileSync(join(root, 'resources/js/components/madani/MadaniPage.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')

assert.match(pageVue, /desktopSpreadStableWordSize/)
assert.match(pageVue, /DESKTOP_SPREAD_FOLIO_RESERVE_PX/)
assert.match(pageVue, /DESKTOP_SPREAD_LINE_SLOTS/)
assert.match(
  memorisationCss,
  /@media \(min-width: 1080px\)[\s\S]{0,240}grid-template-columns:\s*2\.75rem minmax\(0, 1fr\) 2\.75rem/,
  'desktop stage always reserves both nav columns',
)
assert.doesNotMatch(
  memorisationCss,
  /\.madani-qpc-stage--nav-next-only \{\s*grid-template-columns: minmax\(0, 1fr\)/,
  'first/last spreads must not collapse the desktop page width',
)
assert.doesNotMatch(
  memorisationCss,
  /\.madani-qpc-stage--nav-none \{\s*grid-template-columns: minmax\(0, 1fr\)/,
  'empty nav state must not widen the desktop pages',
)

console.log('mushaf-desktop-fit.test.mjs: ok')
