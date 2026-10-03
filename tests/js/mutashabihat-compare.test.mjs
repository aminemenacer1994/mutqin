import assert from 'node:assert/strict'
import {
  buildAyahComparison,
  compareAyahTexts,
  renderComparedAyahHtml,
  renderComparedAyahWordHtml,
} from '../../resources/js/scripts/mutashabihat/compareAyahs.js'

const same = compareAyahTexts(
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا',
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْBابَ سُجَّلًا'.replace('B', ''),
)
assert.equal(same.stats.different, 0)

const comparison = buildAyahComparison(
  'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ',
  'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ وَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ',
)
assert.ok(comparison.stats.different + comparison.stats.inserted + comparison.stats.omitted > 0)
assert.match(comparison.leftPreviewHtml, /mutashabihat-diff/)
assert.doesNotMatch(comparison.leftPreviewHtml, /mutashabihat-token/)

const html = renderComparedAyahHtml([
  { kind: 'shared', text: 'word' },
  { kind: 'shared', text: 'two' },
  { kind: 'different', text: 'other' },
])
assert.match(html, /mutashabihat-diff/)
assert.match(html, /word two/)

const wordHtml = renderComparedAyahWordHtml([
  { kind: 'shared', text: 'word' },
  { kind: 'different', text: 'other' },
], '2:163')
assert.match(wordHtml, /data-verse-key="2:163"/)
assert.match(wordHtml, /data-word-index="0"/)
assert.match(wordHtml, /mutashabihat-diff/)

console.log('mutashabihat-compare.test.mjs passed')
