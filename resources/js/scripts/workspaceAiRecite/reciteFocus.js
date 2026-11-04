/**
 * One pure reading of a per-word comparison.
 * Weak words, main-focus copy, and the saved record all come from this result.
 * Not-recited words (never attempted) are tracked separately and are not weak.
 */

export const RECITE_FOCUS_LOW_MATCH = 0.5

const WEAK_STATUSES = new Set(['unmatched', 'missing', 'out_of_order', 'low_confidence'])

function ayahNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function normalizeStatus(word) {
  const raw = String(word?.status || word?.focusStatus || '').toLowerCase()
  if (WEAK_STATUSES.has(raw) || raw === 'matched' || raw === 'not_recited') return raw
  if (word?.outOfOrder || word?.out_of_order) return 'out_of_order'
  if (raw === 'correct' || raw === 'match' || raw === 'ok') {
    const confidence = Number(word?.confidence)
    if (Number.isFinite(confidence) && confidence > 0 && confidence < 0.55) return 'low_confidence'
    return 'matched'
  }
  if (raw === 'partial' || raw === 'uncertain' || raw === 'minor_mistake') return 'low_confidence'
  if (raw === 'incorrect' || raw === 'wrong' || raw === 'substitution') return 'unmatched'
  if (raw === 'omitted' || raw === 'skipped' || raw === 'missing' || raw === 'deletion') return 'missing'
  return 'not_recited'
}

/**
 * @param {Array<object>} words
 */
export function normalizeReciteWords(words = []) {
  const list = (Array.isArray(words) ? words : []).map((word, index) => ({
    ayah: ayahNumber(word?.ayah ?? word?.ayahNumber ?? word?.ayah_number),
    text: String(word?.text || word?.word || word?.target_word || '').trim(),
    status: normalizeStatus(word),
    index,
  })).filter((word) => word.ayah > 0 && word.text)

  let lastReached = -1
  list.forEach((word, index) => {
    if (word.status !== 'not_recited' && word.status !== 'missing' && word.status !== 'pending') {
      lastReached = index
    }
  })

  return list.map((word, index) => {
    if (index > lastReached && (word.status === 'missing' || word.status === 'not_recited')) {
      return { ...word, status: 'not_recited' }
    }
    return word
  })
}

function joinAyahs(numbers) {
  if (numbers.length <= 1) return String(numbers[0] || '')
  if (numbers.length === 2) return `${numbers[0]} and ${numbers[1]}`
  return `${numbers.slice(0, -1).join(', ')} and ${numbers[numbers.length - 1]}`
}

/**
 * @param {Array<object>} words normalized or raw comparison rows
 */
export function buildReciteFocus(words = []) {
  const list = normalizeReciteWords(words)
  const matched = list.filter((word) => word.status === 'matched').length
  const weakWords = list.filter((word) => WEAK_STATUSES.has(word.status))
  const orderWords = list.filter((word) => word.status === 'out_of_order')
  const contentWeak = weakWords.filter((word) => word.status !== 'out_of_order')
  const notRecited = list.filter((word) => word.status === 'not_recited').length
  const attempted = matched + weakWords.length
  const ratio = attempted === 0 ? 0 : matched / attempted

  const byAyah = new Map()
  weakWords.forEach((word) => {
    const bucket = byAyah.get(word.ayah) || []
    bucket.push(word)
    byAyah.set(word.ayah, bucket)
  })
  const ayahs = [...byAyah.entries()]
    .map(([ayah, rows]) => ({ ayah, count: rows.length }))
    .sort((a, b) => b.count - a.count || a.ayah - b.ayah)

  let code = 'secure'
  let explanation = 'This set is secure, continue to the next recommended set.'
  if (attempted > 0 && ratio < RECITE_FOCUS_LOW_MATCH) {
    code = 'low_match'
    explanation = 'Try this range again, a little slower.'
  } else if (contentWeak.length === 0 && orderWords.length > 0) {
    code = 'order'
    explanation = `Check the order in Ayah ${orderWords[0].ayah}.`
  } else if (ayahs.length === 1) {
    code = 'one'
    explanation = `Give Ayah ${ayahs[0].ayah} one more pass.`
  } else if (ayahs.length > 1) {
    code = 'many'
    const [first, ...rest] = ayahs.map((row) => row.ayah)
    explanation = `Focus on Ayah ${first}, then ${joinAyahs(rest)}.`
  }

  return {
    matched,
    total: attempted,
    rangeTotal: list.length,
    weakCount: weakWords.length,
    needsWork: weakWords.length,
    orderIssueCount: orderWords.length,
    notRecitedCount: notRecited,
    matchRatio: attempted === 0 ? 0 : matched / attempted,
    code,
    explanation,
    weakWords: weakWords.map((word) => ({
      ayah: word.ayah,
      text: word.text,
      status: word.status,
      ayahLabel: `Ayah ${word.ayah}`,
    })),
  }
}
