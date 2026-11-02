import test from 'node:test'
import assert from 'node:assert/strict'
import {
  applyMadaniGlyphsToParts,
  collectMadaniAyahGlyphsFromLeaf,
} from '../../resources/js/scripts/mushaf/madaniSnippetGlyphs.js'

const GLYPHS = ['\uFC41', '\uFC42', '\uFC43', '\uFC44']

const leaf = {
  fontFamily: 'QCF2001',
  page: {
    page_number: 1,
    lines: [
      {
        words: [
          { surah: '1', ayah: '1', word: '0', text: '\uFC40' },
          { surah: '1', ayah: '1', word: '1', text: GLYPHS[0], page: 1 },
          { surah: '1', ayah: '1', word: '2', text: GLYPHS[1], page: 1 },
          { surah: '1', ayah: '2', word: '1', text: GLYPHS[2], page: 1 },
          { surah: '1', ayah: '1', word: '3', text: 'بسم' },
        ],
      },
    ],
  },
}

test('collects Madani page glyphs and skips end markers and Unicode text', () => {
  const glyphs = collectMadaniAyahGlyphsFromLeaf(leaf, 1, 1)
  assert.deepEqual(glyphs.map((glyph) => glyph.word), [1, 2])
  assert.equal(glyphs[0].text, GLYPHS[0])
  assert.equal(glyphs[0].fontFamily, 'QCF2001')
  assert.equal(collectMadaniAyahGlyphsFromLeaf(leaf, 1, 2)[0].text, GLYPHS[2])
})

test('replaces indexed recommendation words with the matching Madani glyph', () => {
  const glyphs = collectMadaniAyahGlyphsFromLeaf(leaf, 1, 1)
  const painted = applyMadaniGlyphsToParts([
    { text: 'بِسْمِ', tone: 'ok', ayahWordIndex: 0 },
    { text: 'ٱللَّهِ', tone: 'incorrect', ayahWordIndex: 1 },
    { text: 'missing', tone: 'ok' },
  ], glyphs)

  assert.equal(painted[0].text, GLYPHS[0])
  assert.equal(painted[0].madaniGlyph, true)
  assert.equal(painted[0].fontFamily, 'QCF2001')
  assert.equal(painted[0].tone, 'ok')
  assert.equal(painted[1].text, GLYPHS[1])
  assert.equal(painted[2].text, 'missing')
  assert.equal(painted[2].madaniGlyph, undefined)
})

test('a phrase window uses phraseStart when tokens are contiguous', () => {
  const glyphs = collectMadaniAyahGlyphsFromLeaf(leaf, 1, 1)
  const painted = applyMadaniGlyphsToParts([
    { text: 'second', tokenIndex: 0 },
  ], glyphs, { phraseStart: 1, contiguous: true })

  assert.equal(painted[0].text, GLYPHS[1])
  assert.equal(painted[0].madaniGlyph, true)
})
