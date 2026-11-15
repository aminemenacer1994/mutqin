import assert from 'node:assert/strict'
import test from 'node:test'
import {
  madaniPartsFromMushafWords,
  overlayMadaniGlyphs,
} from '../../resources/js/scripts/teacher/madaniGlyphParts.js'

const glyph = '\uFC41'

test('madani parts keep the page face and drop unicode stand-ins', () => {
  const parts = madaniPartsFromMushafWords([
    { text: 'بِسْمِ', fontFamily: 'QCF2001', page: 1, word: 2 },
    { text: glyph, fontFamily: 'QCF2001', page: 1, word: 1 },
    { text: `${glyph}\uFB50`, page: 1, word: 3 },
  ], {
    ayah: 1,
    statusMap: new Map([['1:0', { status: 'incorrect' }]]),
  })

  assert.equal(parts.length, 2)
  assert.equal(parts[0].text, glyph)
  assert.equal(parts[0].fontFamily, 'QCF2001')
  assert.equal(parts[0].madaniGlyph, true)
  assert.equal(parts[0].word_index, 0)
  assert.equal(parts[0].status, 'incorrect')
  assert.equal(parts[1].fontFamily, 'p1-v2')
  assert.equal(parts.some((part) => part.text.includes('بِسْمِ')), false)
})

test('overlay replaces painted unicode with madani glyphs in order', () => {
  const painted = overlayMadaniGlyphs(
    [
      { text: 'بسم', state: 'mismatch', labelKey: 'dashboard.word_mismatch' },
      { text: 'الله', state: 'matched', labelKey: 'dashboard.word_matched' },
    ],
    [
      { text: glyph, fontFamily: 'QCF2001', madaniGlyph: true },
      { text: '\uFC42', fontFamily: 'QCF2001', madaniGlyph: true },
    ],
  )

  assert.equal(painted.length, 2)
  assert.equal(painted[0].text, glyph)
  assert.equal(painted[0].state, 'mismatch')
  assert.equal(painted[0].madaniGlyph, true)
  assert.equal(painted[1].fontFamily, 'QCF2001')
})

test('overlay hides the ayah when madani glyphs are missing', () => {
  assert.deepEqual(overlayMadaniGlyphs(
    [{ text: 'بسم', state: 'matched' }],
    [],
  ), [])
})
