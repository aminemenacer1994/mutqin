import assert from 'node:assert/strict'
import en from '../../resources/js/locales/en.json' with { type: 'json' }
import {
  EN_DASH,
  formatAyahCountLabel,
  formatAyahRangeLabel,
  formatAttemptCountLabel,
  formatCompletedSurahAyahLabel,
  formatContinueToAyahLabel,
  formatRepeatAyahLabel,
  formatRepetitionCountLabel,
  formatSurahAyahLabel,
  normalizeAyahRange,
} from '../../resources/js/scripts/formatting/ayahLabels.js'

function makeT(locale) {
  return (key, params = {}) => {
    const parts = String(key || '').split('.')
    let cursor = locale
    for (const part of parts) {
      if (!cursor || typeof cursor !== 'object' || !(part in cursor)) return key
      cursor = cursor[part]
    }
    if (typeof cursor !== 'string') return key
    return cursor.replace(/\{(\w+)\}/g, (_, name) => (
      Object.prototype.hasOwnProperty.call(params, name) ? String(params[name]) : `{${name}}`
    ))
  }
}

const t = makeT(en)

{
  assert.deepEqual(normalizeAyahRange({ from: 7, to: 7 }), { start: 7, end: 7, isSingle: true })
  assert.deepEqual(normalizeAyahRange({ start: 4, end: 6 }), { start: 4, end: 6, isSingle: false })
  assert.deepEqual(normalizeAyahRange({ from: 6, to: 4 }), { start: 4, end: 6, isSingle: false })
  assert.equal(normalizeAyahRange(null), null)
  assert.equal(normalizeAyahRange({ from: 0, to: 3 }), null)
  assert.equal(normalizeAyahRange({ from: 'x', to: 3 }), null)
  assert.equal(normalizeAyahRange({ from: 1.5, to: 2 }), null)
}

{
  assert.equal(formatAyahRangeLabel({ from: 7, to: 7 }, t), 'Ayah 7')
  assert.equal(formatAyahRangeLabel({ start: 7, end: 7 }), 'Ayah 7')
  assert.equal(formatAyahRangeLabel(7), 'Ayah 7')
  assert.equal(formatAyahRangeLabel({ from: 4, to: 6 }, t), `Ayahs 4${EN_DASH}6`)
  assert.equal(formatAyahRangeLabel({ start: 4, end: 6 }), `Ayahs 4${EN_DASH}6`)
  assert.equal(formatAyahRangeLabel(4, 6), `Ayahs 4${EN_DASH}6`)
}

{
  // Never emit duplicate single-ayah ranges.
  assert.equal(formatAyahRangeLabel({ from: 7, to: 7 }, t), 'Ayah 7')
  assert.doesNotMatch(formatAyahRangeLabel({ from: 7, to: 7 }, t), /7-7|7–7|Range/)
  assert.doesNotMatch(formatAyahRangeLabel({ start: 7, end: 7 }), /7-7|7–7/)
  assert.equal(formatAyahRangeLabel({ from: null, to: 7 }), '')
  assert.equal(formatAyahRangeLabel(undefined), '')
  assert.equal(formatAyahRangeLabel({}), '')
}

{
  assert.equal(formatContinueToAyahLabel({ from: 7, to: 7 }, t), 'Continue to Ayah 7')
  assert.equal(formatContinueToAyahLabel({ from: 4, to: 6 }, t), `Continue to Ayahs 4${EN_DASH}6`)
  assert.equal(formatRepeatAyahLabel({ from: 7, to: 7 }, t), 'Repeat Ayah 7')
  assert.equal(formatRepeatAyahLabel({ from: 4, to: 6 }, t), `Repeat Ayahs 4${EN_DASH}6`)
}

{
  assert.equal(formatSurahAyahLabel('Al-Fatihah', { from: 7, to: 7 }, t), 'Al-Fatihah · Ayah 7')
  assert.equal(formatSurahAyahLabel('Al-Fatihah', { from: 4, to: 6 }, t), `Al-Fatihah · Ayahs 4${EN_DASH}6`)
  assert.equal(
    formatCompletedSurahAyahLabel('Al-Fatihah', { from: 4, to: 6 }, t),
    `You completed Al-Fatihah, Ayahs 4${EN_DASH}6.`
  )
  assert.equal(
    formatCompletedSurahAyahLabel('Al-Fatihah', { from: 7, to: 7 }, t),
    'You completed Al-Fatihah, Ayah 7.'
  )
}

{
  assert.equal(formatAyahCountLabel(1, t), '1 ayah')
  assert.equal(formatAyahCountLabel(2, t), '2 ayahs')
  assert.equal(formatRepetitionCountLabel(1, t), '1 repetition')
  assert.equal(formatRepetitionCountLabel(2, t), '2 repetitions')
  assert.equal(formatAttemptCountLabel(1, t), '1 attempt')
  assert.equal(formatAttemptCountLabel(2, t), '2 attempts')
  assert.equal(formatRepetitionCountLabel(-1, t), '')
  assert.equal(formatAttemptCountLabel('abc', t), '')
}

{
  // English fallbacks work without i18n.
  assert.equal(formatAyahRangeLabel({ from: 4, to: 6 }), `Ayahs 4${EN_DASH}6`)
  assert.equal(formatSurahAyahLabel('Al-Fatihah', 7), 'Al-Fatihah · Ayah 7')
  assert.equal(formatRepetitionCountLabel(1), '1 repetition')
}

console.log('ayah-labels.tests passed')
