import assert from 'node:assert/strict'
import {
  collectQpcPagesFromVerses,
  collectStackedQpcWordsFromLeaves,
  resolveStackedQpcWordInk,
  shouldUseStackedQpcMadaniGlyphs,
  verseWordsSupportQpcMadani,
} from '../../resources/js/scripts/mushaf/stackedQpcMadaniDisplay.js'

assert.equal(
  shouldUseStackedQpcMadaniGlyphs({ readingViewMode: 'stacked', mushafLayoutId: 'madani-v2' }),
  true,
)
assert.equal(
  shouldUseStackedQpcMadaniGlyphs({ readingViewMode: 'madani_mushaf', mushafLayoutId: 'madani-v2' }),
  false,
)
assert.equal(
  shouldUseStackedQpcMadaniGlyphs({ readingViewMode: 'stacked', mushafLayoutId: 'indopak-15-qudratullah' }),
  false,
)

assert.equal(
  verseWordsSupportQpcMadani({
    key: '2:1',
    words: [{ page: 2, text: '\u0627\u0644\u0645' }],
  }),
  false,
)

const qcfGlyph = '\uFC41'
assert.equal(
  verseWordsSupportQpcMadani({
    key: '2:1',
    words: [{ page: 2, text: qcfGlyph }],
  }),
  true,
)

assert.deepEqual(
  collectQpcPagesFromVerses([
    { words: [{ page: 2 }, { page: 2 }] },
    { words: [{ page_number: 3 }] },
  ]),
  [2, 3],
)

const byKey = collectStackedQpcWordsFromLeaves({
  2: {
    fontFamily: 'QCF2002',
    page: {
      page_number: 2,
      lines: [
        {
          line_type: 'ayah',
          words: [
            { location: '2:1:1', surah: '2', ayah: '1', word: '1', text: qcfGlyph, page: 2 },
            { location: '2:2:1', surah: '2', ayah: '2', word: '1', text: '\uFC42', page: 2 },
          ],
        },
      ],
    },
  },
}, ['2:1'])

assert.equal(byKey.get('2:1')?.length, 1)
assert.equal(byKey.get('2:1')[0].fontFamily, 'QCF2002')
assert.equal(byKey.get('2:1')[0].text, qcfGlyph)
assert.equal(byKey.has('2:2'), false)

// Page loaders may return an overlapping leaf. Canonical locations, including
// verse-end glyphs, must only be displayed once. Repeated words are legitimate.
const overlappingLeaf = {
  fontFamily: 'QCF2604',
  page: { page_number: 604, lines: [{ line_number: 3, words: [
    { location: '112:1:1', word: 1, text: qcfGlyph, page: 604, line: 3 },
    { location: '112:1:2', word: 2, text: qcfGlyph, page: 604, line: 3 },
    { location: '112:1:3', word: 3, text: '\uFC43', page: 604, line: 3 },
  ] }] },
}
const deduplicated = collectStackedQpcWordsFromLeaves({ 604: overlappingLeaf, 605: overlappingLeaf }, ['112:1']).get('112:1')
assert.equal(deduplicated.length, 3)
assert.deepEqual(deduplicated.map(word => word.word), [1, 2, 3])
assert.equal(deduplicated[0].text, deduplicated[1].text, 'Repeated glyphs at different positions stay intact')
assert.ok(deduplicated.every(word => word.fontFamily === 'QCF2604'))
const corruptLeaf = structuredClone(overlappingLeaf)
corruptLeaf.page.lines[0].words[0].text = '\uFC44'
assert.throws(() => collectStackedQpcWordsFromLeaves({ 604: overlappingLeaf, 605: corruptLeaf }, ['112:1']), /Conflicting Madani word 112:1:1/)

const plainInk = resolveStackedQpcWordInk(
  { text: qcfGlyph, page: 2, location: '2:1:1', fontFamily: 'QCF2002' },
  { tajweedEnabled: false, codeV2ByLocation: {} },
)
assert.equal(plainInk.text, qcfGlyph)
assert.equal(plainInk.fontFamily, 'QCF2002')
assert.equal(plainInk.tajweedGlyph, false)
