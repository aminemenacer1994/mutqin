import assert from 'node:assert/strict'
import {
  QURAN_NORMALIZER_VERSION,
  normalizeComparisonText,
  tokenizeComparisonText,
  tokenizeDisplayText,
} from '../../resources/js/scripts/memorisation/quranTextNormalizer.js'

assert.equal(QURAN_NORMALIZER_VERSION, 'quran-normalizer-v2')

assert.equal(normalizeComparisonText('بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ'), 'بسم الله الرحمان')
assert.equal(normalizeComparisonText('صلاة نبيء مؤحد'), 'صلاه نبي موحد')
assert.equal(normalizeComparisonText('هُدًى'), 'هدي')
assert.equal(normalizeComparisonText('قُلْ  ـ  هُوَ، الله.'), 'قل هو الله')
assert.equal(normalizeComparisonText('   ...  '), '')
assert.equal(normalizeComparisonText(null), '')

assert.deepEqual(tokenizeDisplayText('<span>بِسْمِ</span> اللَّهِ'), ['بِسْمِ', 'اللَّهِ'])
assert.deepEqual(tokenizeDisplayText(''), [])
assert.deepEqual(tokenizeDisplayText('123 — hello'), [])
assert.deepEqual(tokenizeComparisonText('بِسْمِ   ٱللَّهِ'), ['بسم', 'الله'])
assert.deepEqual(tokenizeComparisonText(''), [])

console.log('quran-text-normalizer.test.mjs: ok')
