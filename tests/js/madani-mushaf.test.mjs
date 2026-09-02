import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  MADANI_MUSHAF_VIEW,
  isMadaniMushafView,
  isPageLayoutView,
  isReadingViewMode,
  normalizeReadingViewMode,
  getMadaniSpreadPages,
} from '../../resources/js/scripts/mushaf/originalMadaniMushaf.js'
import {
  buildMadaniMushafPageModel,
  normalizeMadaniMushafWord,
  madaniMushafPagesToPrefetch,
  enrichMadaniMushafPageWithUnicode,
  consolidateMadaniMushafLinesToGrid,
  mergeMadaniMushafDecorativeLines,
  isQcfSlotText,
} from '../../resources/js/scripts/mushaf/madaniMushafLayout.js'
import {
  madaniMushafPageUrl,
  clearMadaniMushafPageCache,
} from '../../resources/js/scripts/mushaf/madaniMushafApi.js'
import { enrichMadaniMushafLines } from '../../resources/js/scripts/mushaf/madaniMushafPresentation.js'

assert.equal(isReadingViewMode('madani_mushaf'), true)
assert.equal(isMadaniMushafView('madani_mushaf'), true)
assert.equal(isPageLayoutView('madani_mushaf'), true)
assert.equal(normalizeReadingViewMode('madani_mushaf'), 'madani_mushaf')
assert.equal(MADANI_MUSHAF_VIEW, 'madani_mushaf')

assert.deepEqual(getMadaniSpreadPages(1), { left: 2, right: 1 })
assert.deepEqual(getMadaniSpreadPages(604), { left: 604, right: 603 })

const sampleApiPage = {
  pageNumber: 2,
  juzNumber: 1,
  lines: [
    { lineNumber: 1, lineType: 'surah_name', isCentered: true, surahNumber: 2, words: [] },
    { lineNumber: 2, lineType: 'basmala', isCentered: true, surahNumber: 2, words: [] },
    {
      lineNumber: 3,
      lineType: 'ayah',
      isCentered: false,
      words: [
        { id: 31, wordKey: '2:1:1', verseKey: '2:1', position: 1, charType: 'word', glyph: 'A' },
        { id: 32, wordKey: '2:1:2', verseKey: '2:1', position: 2, charType: 'end', glyph: '1' },
      ],
    },
  ],
}

const model = buildMadaniMushafPageModel(sampleApiPage)
assert.equal(model.pageNumber, 2)
assert.equal(model.fontFamily, 'p2-v2')
assert.equal(model.lines[0].type, 'surah_name')
assert.equal(model.lines[1].type, 'basmala')
assert.equal(model.lines[2].words.length, 2)

const enriched = enrichMadaniMushafLines(model.lines, {
  pageNumber: 2,
  useGlyphs: true,
  fontReady: true,
  fontFamily: 'p2-v2',
  hideQuranText: true,
  isWordHighlighted: () => false,
})
const hiddenWord = enriched[2].words[0]
assert.equal(hiddenWord.isHidden, true)
assert.equal(hiddenWord.preserveWidth, true)

assert.equal(normalizeMadaniMushafWord({ verseKey: '1:1', glyph: 'X' }).codeV2, 'X')

const glyphBeforeFont = enrichMadaniMushafLines(model.lines, {
  pageNumber: 2,
  useGlyphs: true,
  fontReady: false,
  fontFamily: 'p2-v2',
  hideQuranText: false,
  isWordHighlighted: () => false,
})
assert.equal(glyphBeforeFont[2].words[0].useGlyph, true)
assert.equal(glyphBeforeFont[2].words[0].html, 'A')

const puaModel = buildMadaniMushafPageModel({
  ...sampleApiPage,
  lines: [{
    lineNumber: 1,
    lineType: 'ayah',
    isCentered: false,
    words: [{ id: 1, wordKey: '2:1:1', verseKey: '2:1', position: 1, charType: 'word', glyph: 'ﱁ' }],
  }],
})
const puaBeforeFont = enrichMadaniMushafLines(puaModel.lines, {
  pageNumber: 2,
  useGlyphs: true,
  fontReady: false,
  fontFamily: 'p2-v2',
  hideQuranText: false,
  isWordHighlighted: () => false,
})
assert.equal(puaBeforeFont[0].words[0].useGlyph, true)
assert.equal(puaBeforeFont[0].words[0].html, 'ﱁ')

const enrichedPage = enrichMadaniMushafPageWithUnicode(sampleApiPage, [{
  verse_key: '2:1',
  words: [
    { word_key: '2:1:1', position: 1, text_uthmani: 'الَمَ' },
    { word_key: '2:1:2', position: 2, text_uthmani: '٢', char_type_name: 'end' },
  ],
}])
assert.equal(enrichedPage.lines[2].words[0].textUthmani, 'الَمَ')
assert.ok(isQcfSlotText('ﱁ'))
assert.ok(!isQcfSlotText('الَمَ'))

const enrichedWithUnicode = enrichMadaniMushafLines(
  buildMadaniMushafPageModel(enrichedPage).lines,
  {
    pageNumber: 2,
    useGlyphs: true,
    fontReady: false,
    fontFamily: 'p2-v2',
    hideQuranText: false,
    isWordHighlighted: () => false,
  },
)
assert.equal(enrichedWithUnicode[2].words[0].html, 'A')
assert.equal(enrichedWithUnicode[2].words[0].useGlyph, true)

assert.equal(madaniMushafPageUrl(5), '/memorisation/madani-mushaf/pages/5')
clearMadaniMushafPageCache()

const prefetch = madaniMushafPagesToPrefetch(5, { spread: true })
assert.ok(prefetch.includes(5))
assert.ok(prefetch.includes(6))

const grid = consolidateMadaniMushafLinesToGrid([
  { lineNumber: 3, type: 'ayah', words: [{ verseKey: '2:1' }] },
])
assert.equal(grid.length, 15)
assert.equal(grid[0].type, 'empty')
assert.equal(grid[2].type, 'ayah')

const merged = mergeMadaniMushafDecorativeLines(
  [{ lineNumber: 3, type: 'ayah', words: [] }],
  [
    { lineNumber: 1, type: 'surah_name', words: [], glyphText: '002surah' },
    { lineNumber: 2, type: 'basmala', words: [] },
  ],
)
assert.equal(merged.length, 3)
assert.equal(merged[0].type, 'surah_name')

const fullPage = enrichMadaniMushafLines(model.lines, {
  pageNumber: 2,
  sessionKeys: new Set(['2:99']),
  keepFullPage: true,
  useGlyphs: true,
  fontReady: true,
  fontFamily: 'p2-v2',
  hideQuranText: false,
  isWordHighlighted: () => false,
})
assert.ok(fullPage[2].words.length >= 1)
assert.equal(fullPage[2].words.find(w => w.verseKey === '2:1')?.inSession, false)

const memorisationJs = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const memorisationVue = readFileSync(new URL('../../resources/js/views/Memorisation.vue', import.meta.url), 'utf8')
assert.match(memorisationJs, /MadaniMushafReader/)
assert.match(memorisationJs, /madani_mushaf/)
assert.match(memorisationVue, /readingViewMode === 'madani_mushaf'/)
assert.match(memorisationVue, /MadaniMushafReader/)
assert.match(memorisationJs, /showMadaniMushafViewToggle:\s*false/)
assert.match(memorisationVue, /v-if="showMadaniMushafViewToggle"/)

console.log('Madani Mushaf tests passed')
