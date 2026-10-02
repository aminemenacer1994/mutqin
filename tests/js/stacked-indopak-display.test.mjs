import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  collectIndopakPagesForVerseKeys,
  collectStackedIndopakWordsFromLeaves,
  joinStackedIndopakAyahText,
  shouldUseStackedIndopakText,
  stackedIndopakFontFamily,
  verseHasStackedIndopakWords,
} from '../../resources/js/scripts/mushaf/stackedIndopakDisplay.js'
import { INDOPAK_NASTALEEQ_FONT_STACK } from '../../resources/js/scripts/mushaf/indopakNastaleeqFont.js'
import { shouldUseStackedQpcMadaniGlyphs } from '../../resources/js/scripts/mushaf/stackedQpcMadaniDisplay.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const mobileCss = readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')

assert.equal(
  shouldUseStackedIndopakText({ readingViewMode: 'stacked', mushafLayoutId: 'indopak-15-qudratullah' }),
  true,
)
assert.equal(
  shouldUseStackedIndopakText({ readingViewMode: 'madani_mushaf', mushafLayoutId: 'indopak-15-qudratullah' }),
  false,
)
assert.equal(
  shouldUseStackedIndopakText({ readingViewMode: 'stacked', mushafLayoutId: 'madani-v2' }),
  false,
)
assert.equal(
  shouldUseStackedQpcMadaniGlyphs({ readingViewMode: 'stacked', mushafLayoutId: 'indopak-15-qudratullah' }),
  false,
)
assert.equal(stackedIndopakFontFamily(), INDOPAK_NASTALEEQ_FONT_STACK)
assert.match(stackedIndopakFontFamily(), /IndopakNastaleeq/)

assert.equal(
  verseHasStackedIndopakWords({
    key: '1:1',
    indopakWords: true,
    words: [{ text: 'بِسْمِ', isEnd: false }],
  }),
  true,
)
assert.equal(
  verseHasStackedIndopakWords({
    key: '1:1',
    words: [{ text: 'بِسْمِ' }],
  }),
  false,
)

assert.deepEqual(
  collectIndopakPagesForVerseKeys(['1:1', '1:2'], { '1:1': 1, '1:2': 1 }),
  [1, 2],
)

const byKey = collectStackedIndopakWordsFromLeaves({
  1: {
    fontFamily: 'IndopakNastaleeq',
    page: {
      page_number: 1,
      lines: [
        {
          line_type: 'ayah',
          words: [
            { location: '1:1:1', verseKey: '1:1', text: 'بِسْمِ', page: 1 },
            { location: '1:1:2', verseKey: '1:1', text: 'اللّٰهِ', page: 1 },
            { location: '1:1:5', verseKey: '1:1', text: '۟', page: 1, isEnd: true },
            { location: '1:2:1', verseKey: '1:2', text: 'اَلْحَمْدُ', page: 1 },
          ],
        },
      ],
    },
  },
}, ['1:1'])

assert.equal(byKey.get('1:1')?.length, 3)
assert.equal(byKey.get('1:1')[0].fontFamily, 'IndopakNastaleeq')
assert.equal(byKey.get('1:1')[0].text, 'بِسْمِ')
assert.equal(byKey.get('1:1')[2].isEnd, true)
assert.equal(byKey.has('1:2'), false)
assert.equal(
  joinStackedIndopakAyahText(byKey.get('1:1')),
  'بِسْمِ اللّٰهِ',
)

assert.match(memorisationJs, /useStackedIndopakText/)
assert.match(memorisationJs, /applyStackedIndopakToCurrentVerses/)
assert.match(memorisationJs, /buildStackedIndopakDisplayArabic/)
assert.match(memorisationJs, /inStacked/)
assert.match(memorisationVue, /stackedAyahFontFamily/)
assert.match(memorisationVue, /verse-arabic--indopak/)
assert.match(memorisationVue, /readingViewMode === 'madani_mushaf' \|\| readingViewMode === 'stacked'/)
assert.match(memorisationCss, /verse-arabic--indopak/)
assert.match(mobileCss, /verse-arabic--indopak/)

console.log('stacked-indopak-display.test.mjs: ok')
