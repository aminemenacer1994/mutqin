import assert from 'node:assert/strict'
import {
  applyIndopakNastaleeqFontForLayout,
  ensureIndopakNastaleeqFontForLayout,
  INDOPAK_NASTALEEQ_FONT_FAMILY,
  INDOPAK_NASTALEEQ_FONT_STACK,
  INDOPAK_NASTALEEQ_FONT_URL,
  isIndopakNastaleeqFontLoaded,
  isIndopakNastaleeqLayout,
  loadIndopakNastaleeqFont,
  mushafUnicodeFontStack,
  resetIndopakNastaleeqFontForTests,
} from '../../resources/js/scripts/mushaf/indopakNastaleeqFont.js'
import {
  getMushafLayout,
  MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH,
  MUSHAF_LAYOUT_MADANI_V2,
} from '../../resources/js/scripts/mushaf/mushafLayouts.js'
import {
  qcfFontFamily,
  resetQcfFontLoaderForTests,
} from '../../resources/js/scripts/mushaf/qcfFontLoader.js'

resetIndopakNastaleeqFontForTests()
resetQcfFontLoaderForTests()

assert.equal(INDOPAK_NASTALEEQ_FONT_FAMILY, 'IndopakNastaleeq')
assert.equal(INDOPAK_NASTALEEQ_FONT_URL, '/indopak/font/indopak-nastaleeq.woff2')
assert.match(INDOPAK_NASTALEEQ_FONT_STACK, /IndopakNastaleeq/)
assert.match(INDOPAK_NASTALEEQ_FONT_STACK, /Noto Nastaliq Urdu|Noto Naskh Arabic|Amiri Quran/)

const indopak = getMushafLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH)
const madani = getMushafLayout(MUSHAF_LAYOUT_MADANI_V2)

assert.equal(indopak.fontFamily, 'IndopakNastaleeq')
assert.equal(indopak.fontUrl, INDOPAK_NASTALEEQ_FONT_URL)
assert.equal(indopak.fontStrategy, 'unicode-text')
assert.equal(madani.fontStrategy, 'qpc-page-glyphs')
assert.equal(madani.fontUrl, null)
assert.equal(madani.fontFamily, 'QCF2')

assert.equal(isIndopakNastaleeqLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), true)
assert.equal(isIndopakNastaleeqLayout(MUSHAF_LAYOUT_MADANI_V2), false)
assert.equal(mushafUnicodeFontStack(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH), INDOPAK_NASTALEEQ_FONT_STACK)
assert.equal(mushafUnicodeFontStack(MUSHAF_LAYOUT_MADANI_V2), null)
assert.equal(mushafUnicodeFontStack(madani), null)

assert.equal(await ensureIndopakNastaleeqFontForLayout(MUSHAF_LAYOUT_MADANI_V2), null)
assert.equal(isIndopakNastaleeqFontLoaded(), false)

const props = new Map()
const attrs = new Map()
const root = {
  style: {
    setProperty(key, value) { props.set(key, value) },
    removeProperty(key) { props.delete(key) },
  },
  setAttribute(key, value) { attrs.set(key, value) },
  removeAttribute(key) { attrs.delete(key) },
}

assert.equal(await applyIndopakNastaleeqFontForLayout(MUSHAF_LAYOUT_MADANI_V2, root), null)
assert.equal(props.has('--indopak-nastaleeq-font'), false)
assert.equal(attrs.has('data-indopak-nastaleeq-font'), false)

assert.equal(
  await applyIndopakNastaleeqFontForLayout(MUSHAF_LAYOUT_INDOPAK_15_QUDRATULLAH, root),
  INDOPAK_NASTALEEQ_FONT_FAMILY,
)
assert.equal(props.get('--indopak-nastaleeq-font'), INDOPAK_NASTALEEQ_FONT_STACK)
assert.equal(attrs.get('data-indopak-nastaleeq-font'), '1')
assert.equal(isIndopakNastaleeqFontLoaded(), true)

assert.equal(await loadIndopakNastaleeqFont(), INDOPAK_NASTALEEQ_FONT_FAMILY)

// Madani QCF helpers stay page-glyph based and untouched.
assert.equal(qcfFontFamily(1), 'p1-v2')
assert.equal(qcfFontFamily(6, { tajweed: true }), 'p6-v4')

console.log('indopak-nastaleeq-font.test.mjs: ok')
