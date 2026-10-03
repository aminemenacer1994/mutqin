import assert from 'node:assert/strict'
import { buildMutashabihatCardRow, formatPairTitle, formatVerseLabel } from '../../resources/js/scripts/mutashabihat/pairRows.js'

const ctx = {
  quranSearchIndex: [
    { key: '2:58', surah: 2, ayah: 58, arabic: 'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ', translation: 'And when We said' },
    { key: '7:161', surah: 7, ayah: 161, arabic: 'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ', translation: 'And when it was said' },
  ],
  getChapterLatinName(id) {
    return Number(id) === 2 ? 'Al-Baqarah' : Number(id) === 7 ? 'Al-A\'raf' : ''
  },
  mutashabihatStatusLabelFor(status) {
    return status === 'new' ? 'New' : status
  },
}

const pair = {
  id: 1,
  verse_key_1: '2:58',
  verse_key_2: '7:161',
  surah_number_1: 2,
  ayah_number_1: 58,
  surah_number_2: 7,
  ayah_number_2: 161,
  pair_key: '2:58|7:161',
}

assert.equal(formatVerseLabel(ctx, '2:58'), 'Al-Baqarah 2:58')
assert.equal(formatPairTitle(ctx, pair), 'Al-Baqarah 2:58 ↔ Al-A\'raf 7:161')

const row = buildMutashabihatCardRow(ctx, { pair, progress: null, status: 'new' })
assert.equal(row.status, 'new')
assert.equal(row.hasArabic, true)
assert.match(row.leftPreviewHtml, /mutashabihat-diff/)
assert.match(row.rightPreviewHtml, /mutashabihat-diff/)
assert.equal(row.leftTranslation, 'And when We said')

const fromCache = buildMutashabihatCardRow({
  getChapterLatinName: ctx.getChapterLatinName,
  mutashabihatAyahByKey: {
    '2:58': { arabic: 'وَإِذْ قُلْنَا', translation: 'When We said' },
    '7:161': { arabic: 'وَإِذْ قِيلَ', translation: 'When it was said' },
  },
}, { pair, progress: null, status: 'new' })
assert.equal(fromCache.hasArabic, true)
assert.match(fromCache.leftPreviewHtml, /قُلْنَا/)

const partialCtx = {
  getChapterLatinName: ctx.getChapterLatinName,
  mutashabihatProgressRows: [],
  quranSearchIndex: [{ key: '2:58', arabic: 'وَإِذْ قُلْنَا ادْخُلُوا', translation: '' }],
}
const partial = buildMutashabihatCardRow(partialCtx, { pair, progress: null, status: 'new' })
assert.equal(partial.leftPreviewHtml.length > 0, true)
assert.equal(partial.rightPreviewHtml, '')

console.log('mutashabihat-rows.test.mjs passed')
