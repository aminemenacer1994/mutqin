import assert from 'node:assert/strict'
import {
  buildAyahComparison,
  compareAyahTexts,
  differenceSpans,
  previewSegmentsAroundSpan,
  renderComparedAyahHtml,
  renderComparedAyahWordHtml,
} from '../../resources/js/scripts/mutashabihat/compareAyahs.js'
import { normalizeComparisonText } from '../../resources/js/scripts/memorisation/quranTextNormalizer.js'

const same = compareAyahTexts(
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا',
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا',
)
assert.equal(same.stats.different, 0)
assert.equal(same.stats.shared, 5)

const harakatOnly = compareAyahTexts('ٱلْحَمْدُ', 'الْحَمْدُ')
assert.equal(harakatOnly.stats.different, 0)
assert.equal(harakatOnly.stats.shared, 1)
assert.equal(
  normalizeComparisonText('ٱلْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ'),
  'الحمد لله رب العالمين',
)

const extraWord = compareAyahTexts(
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ',
  'قُولُوا حِطَّةٍ وَادْخُلُوا الْبَابَ سُجَّلًا',
)
assert.equal(extraWord.stats.inserted, 1)
assert.equal(extraWord.right.at(-1).kind, 'inserted')

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
assert.doesNotMatch(wordHtml, /<mark class="mutashabihat-diff">[^<]+<\/mark>[^<]+<\/mark>/)

const multi = compareAyahTexts(
  'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا',
  'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ وَكُلُوا',
)
assert.ok(differenceSpans(multi.left, multi.right).length >= 2)

const longLeft = compareAyahTexts(
  'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا',
  'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ وَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا',
)
const preview = previewSegmentsAroundSpan(longLeft.left, longLeft.span)
assert.ok(preview.some((seg) => seg.kind === 'different' || seg.kind === 'omitted'))
const padded = compareAyahTexts(
  `${'وَمِنْهُمْ مَنْ يَقُولُ '.repeat(12)}وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ`,
  `${'وَمِنْهُمْ مَنْ يَقُولُ '.repeat(12)}وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ`,
)
const paddedPreview = previewSegmentsAroundSpan(padded.left, padded.span)
assert.ok(paddedPreview.some((seg) => seg.text === '…'))

const baqarah58 = compareAyahTexts(
  'وَإِذْ قُلْنَا ادْخُلُوا هَٰذِهِ الْقَرْيَةَ فَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ رَغَدًا وَقُولُوا حِطَّةٌ',
  'وَإِذْ قِيلَ لَهُمُ اسْكُنُوا هَٰذِهِ الْقَرْيَةَ وَكُلُوا مِنْهَا حَيْثُ شِئْتُمْ وَقُولُوا حِطَّةٌ',
)
assert.ok(baqarah58.stats.shared >= 6)
const leftDiffWords = baqarah58.left
  .filter((seg) => seg.kind === 'different' || seg.kind === 'omitted')
  .map((seg) => normalizeComparisonText(seg.text))
  .filter(Boolean)
assert.ok(leftDiffWords.some((w) => w.includes('قلنا') || w === 'قلنا'))
assert.ok(leftDiffWords.some((w) => w.includes('ادخلوا') || w === 'ادخلوا'))

console.log('mutashabihat-compare.test.mjs passed')
