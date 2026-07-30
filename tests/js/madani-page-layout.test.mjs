import assert from 'node:assert/strict'
import {
  buildMadaniPageLayout,
  chapterHasBismillahPre,
  findSurahStartOnPage,
  formatMadaniAyahEndLabel,
  groupWordsByLine,
  madaniPageRange,
  resolveMadaniPagesForVerses,
  surahNameGlyphText,
  toEasternArabicDigits
} from '../../resources/js/scripts/mushaf/madaniPageLayout.js'
import {
  qcfFontFamily,
  qcfFontUrl
} from '../../resources/js/scripts/mushaf/qcfFontLoader.js'

const fatihahPageVerses = [
  {
    verse_key: '1:1',
    verse_number: 1,
    page_number: 1,
    juz_number: 1,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'A', text_qpc_hafs: 'بِسْمِ', line_number: 2, page_number: 1 },
      { position: 2, char_type_name: 'word', code_v2: 'B', text_qpc_hafs: 'ٱللَّهِ', line_number: 2, page_number: 1 },
      { position: 5, char_type_name: 'end', code_v2: 'E1', text_qpc_hafs: '١', line_number: 2, page_number: 1 }
    ]
  },
  {
    verse_key: '1:2',
    verse_number: 2,
    page_number: 1,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'C', text_qpc_hafs: 'ٱلْحَمْدُ', line_number: 3, page_number: 1 },
      { position: 5, char_type_name: 'end', code_v2: 'E2', text_qpc_hafs: '٢', line_number: 3, page_number: 1 }
    ]
  }
]

const baqarahPageVerses = [
  {
    verse_key: '2:1',
    verse_number: 1,
    page_number: 2,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'ALIF', text_qpc_hafs: 'الٓمٓ', line_number: 3, page_number: 2 },
      { position: 2, char_type_name: 'end', code_v2: 'E1', text_qpc_hafs: '١', line_number: 3, page_number: 2 }
    ]
  },
  {
    verse_key: '2:2',
    verse_number: 2,
    page_number: 2,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'D', text_qpc_hafs: 'ذَٰلِكَ', line_number: 3, page_number: 2 },
      { position: 8, char_type_name: 'end', code_v2: 'E2', text_qpc_hafs: '٢', line_number: 4, page_number: 2 }
    ]
  }
]

assert.equal(chapterHasBismillahPre(1), false)
assert.equal(chapterHasBismillahPre(2), true)
assert.equal(chapterHasBismillahPre(9), true)
assert.equal(surahNameGlyphText(1), '001surah')
assert.equal(surahNameGlyphText(2), '002surah')
assert.equal(qcfFontFamily(1), 'p1-v2')
assert.equal(qcfFontFamily(2, { tajweed: true }), 'p2-v4')
assert.match(qcfFontUrl(1).woff2, /\/v2\/woff2\/p1\.woff2$/)
assert.match(qcfFontUrl(2, { tajweed: true }).woff2, /\/v4\/colrv1\/woff2\/p2\.woff2$/)

const grouped = groupWordsByLine(fatihahPageVerses)
assert.deepEqual(grouped.map(line => line.lineNumber), [2, 3])
assert.equal(grouped[0].words.length, 3)
assert.equal(grouped[0].words[2].isEnd, true)

const surahStart = findSurahStartOnPage(fatihahPageVerses)
assert.equal(surahStart.chapterId, 1)
assert.equal(surahStart.firstAyahLine, 2)

const fatihahLayout = buildMadaniPageLayout(1, fatihahPageVerses)
assert.equal(fatihahLayout.pageNumber, 1)
assert.equal(fatihahLayout.fontFamily, 'p1-v2')
assert.equal(fatihahLayout.lines[0].type, 'surah_name')
assert.equal(fatihahLayout.lines[0].lineNumber, 1)
assert.equal(fatihahLayout.lines[0].glyphText, '001surah')
assert.equal(fatihahLayout.lines[1].type, 'ayah')
assert.equal(fatihahLayout.lines[1].words[0].verseKey, '1:1')
assert.equal(fatihahLayout.lines[2].type, 'ayah')
assert.ok(fatihahLayout.lines.every(line => line.type !== 'empty'))
assert.equal(fatihahLayout.lines.length, 3)
assert.equal(fatihahLayout.juzNumber, 1)
assert.equal(fatihahLayout.primaryChapterId, 1)

const baqarahLayout = buildMadaniPageLayout(2, baqarahPageVerses)
assert.equal(baqarahLayout.lines[0].type, 'surah_name')
assert.equal(baqarahLayout.lines[0].lineNumber, 1)
assert.equal(baqarahLayout.lines[0].chapterId, 2)
assert.equal(baqarahLayout.lines[1].type, 'basmala')
assert.equal(baqarahLayout.lines[1].lineNumber, 2)
assert.equal(baqarahLayout.lines[2].type, 'ayah')
assert.equal(baqarahLayout.lines[2].lineNumber, 3)
assert.equal(baqarahLayout.lines[2].words[0].codeV2, 'ALIF')

const surahTransitionVerses = [
  {
    verse_key: '98:8',
    verse_number: 8,
    page_number: 599,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'A', text_qpc_hafs: 'جَزَاؤُهُمْ', line_number: 5, page_number: 599 },
      { position: 2, char_type_name: 'end', code_v2: 'E8', text_qpc_hafs: '٨', line_number: 5, page_number: 599 }
    ]
  },
  {
    verse_key: '99:1',
    verse_number: 1,
    page_number: 599,
    words: [
      { position: 1, char_type_name: 'word', code_v2: 'B', text_qpc_hafs: 'إِذَا', line_number: 8, page_number: 599 },
      { position: 2, char_type_name: 'end', code_v2: 'E1', text_qpc_hafs: '١', line_number: 8, page_number: 599 }
    ]
  }
]
const transitionLayout = buildMadaniPageLayout(599, surahTransitionVerses)
assert.deepEqual(
  transitionLayout.lines.map(line => `${line.lineNumber}:${line.type}`),
  ['5:ayah', '6:surah_name', '7:basmala', '8:ayah']
)
assert.ok(transitionLayout.lines.every(line => line.type !== 'empty'))
assert.equal(transitionLayout.lines[1].chapterId, 99)

assert.deepEqual(madaniPageRange(2, 4), [2, 3, 4])
assert.deepEqual(
  resolveMadaniPagesForVerses([
    { key: '2:1', page_number: 2 },
    { key: '2:6', page_number: 3 }
  ]),
  [2, 3]
)

assert.equal(toEasternArabicDigits('67'), '٦٧')
assert.equal(formatMadaniAyahEndLabel({ textQpc: '6' }), '\u06DD٦')
assert.equal(formatMadaniAyahEndLabel({ text_qpc_hafs: '٧' }), '\u06DD٧')
assert.equal(formatMadaniAyahEndLabel({ verseKey: '2:7', textQpc: '' }), '\u06DD٧')

console.log('Madani page layout tests passed')
