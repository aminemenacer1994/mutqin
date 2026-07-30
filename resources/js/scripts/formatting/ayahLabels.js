/**
 * Shared English-facing ayah / range labels for learner UI.
 *
 * Canonical forms:
 *   Ayah 7
 *   Ayahs 4–6
 *   Continue to Ayah 7
 *   Repeat Ayahs 4–6
 *   Al-Fatihah · Ayah 7
 *   Al-Fatihah · Ayahs 4–6
 *   You completed Al-Fatihah, Ayahs 4–6.
 */

export const EN_DASH = '\u2013'
export const MIDDLE_DOT = '\u00b7'

const LABELS_PREFIX = 'memorisation.labels'

function isValidAyahNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) && n >= 1 && Math.floor(n) === n
}

function translate(t, key, params) {
  if (typeof t !== 'function') return null
  const value = t(key, params)
  if (value == null) return null
  const text = String(value)
  if (!text || text === key || text.startsWith(LABELS_PREFIX) || text.startsWith('memorisation.')) {
    return null
  }
  return text
}

/**
 * Accepts `{ from, to }`, `{ start, end }`, a single number, or `(start, end)`.
 * Equal bounds collapse to a single ayah. Invalid input returns null.
 *
 * @param {object|number|null|undefined} rangeOrStart
 * @param {number} [endMaybe]
 * @returns {{ start: number, end: number, isSingle: boolean } | null}
 */
export function normalizeAyahRange(rangeOrStart, endMaybe) {
  if (rangeOrStart == null && endMaybe == null) return null

  let start
  let end

  if (typeof rangeOrStart === 'object' && !Array.isArray(rangeOrStart)) {
    const rawStart = rangeOrStart.from ?? rangeOrStart.start ?? rangeOrStart.ayah
    const rawEnd = rangeOrStart.to ?? rangeOrStart.end ?? rawStart
    start = Number(rawStart)
    end = Number(rawEnd)
  } else {
    start = Number(rangeOrStart)
    end = endMaybe == null ? start : Number(endMaybe)
  }

  if (!isValidAyahNumber(start) || !isValidAyahNumber(end)) return null

  const lo = Math.min(start, end)
  const hi = Math.max(start, end)
  return {
    start: lo,
    end: hi,
    isSingle: lo === hi,
  }
}

/** Ayah 7 | Ayahs 4–6 */
export function formatAyahRangeLabel(rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT

  if (!range) return ''

  if (range.isSingle) {
    return translate(t, `${LABELS_PREFIX}.ayah`, { ayah: range.start })
      || translate(t, 'memorisation.postSession.recommendation.singleAyah', { ayah: range.start })
      || `Ayah ${range.start}`
  }

  return translate(t, `${LABELS_PREFIX}.ayahs`, { start: range.start, end: range.end })
    || translate(t, 'memorisation.postSession.recommendation.ayahRange', {
      start: range.start,
      end: range.end,
    })
    || `Ayahs ${range.start}${EN_DASH}${range.end}`
}

/** Al-Fatihah · Ayah 7 | Al-Fatihah · Ayahs 4–6 */
export function formatSurahAyahLabel(surahName, rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT
  const surah = String(surahName || '').trim()
  const rangeLabel = formatAyahRangeLabel(range, t)
  if (!surah) return rangeLabel
  if (!rangeLabel) return surah

  if (range?.isSingle) {
    return translate(t, `${LABELS_PREFIX}.surahAyah`, { surah, ayah: range.start })
      || `${surah} ${MIDDLE_DOT} ${rangeLabel}`
  }

  return translate(t, `${LABELS_PREFIX}.surahAyahs`, {
    surah,
    start: range.start,
    end: range.end,
  }) || `${surah} ${MIDDLE_DOT} ${rangeLabel}`
}

/** Continue with Ayah 7 | Continue with Ayahs 4–6 */
export function formatContinueToAyahLabel(rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT
  if (!range) return ''

  if (range.isSingle) {
    return translate(t, `${LABELS_PREFIX}.continueToAyah`, { ayah: range.start })
      || `Continue with Ayah ${range.start}`
  }

  return translate(t, `${LABELS_PREFIX}.continueToAyahs`, {
    start: range.start,
    end: range.end,
  }) || `Continue with Ayahs ${range.start}${EN_DASH}${range.end}`
}

/**
 * Bare number spans for templates that already say “ayahs …”.
 *   [1, 2, 3] → 1–3
 *   [1, 3]    → 1, 3
 *   [7]       → 7
 * Contiguous runs never use comma lists (never `1, 2, 3`).
 *
 * @param {Array<number|string>|null|undefined} ayahNumbers
 * @returns {string}
 */
export function formatAyahNumberSpans(ayahNumbers) {
  const nums = [...new Set(
    (Array.isArray(ayahNumbers) ? ayahNumbers : [])
      .map((n) => Number(n))
      .filter((n) => isValidAyahNumber(n)),
  )].sort((a, b) => a - b)

  if (!nums.length) return ''

  const runs = []
  let runStart = nums[0]
  let runEnd = nums[0]
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] === runEnd + 1) {
      runEnd = nums[i]
      continue
    }
    runs.push([runStart, runEnd])
    runStart = nums[i]
    runEnd = nums[i]
  }
  runs.push([runStart, runEnd])

  return runs
    .map(([start, end]) => (start === end ? String(start) : `${start}${EN_DASH}${end}`))
    .join(', ')
}

/**
 * Format a list of ayah numbers so consecutive runs use en-dash ranges.
 *   [1, 2, 3] → Ayahs 1–3
 *   [1, 3]    → Ayah 1, Ayah 3
 *   [1]       → Ayah 1
 * Never emits "Ayahs 1, 2, 3" for a contiguous set.
 *
 * @param {Array<number|string>|null|undefined} ayahNumbers
 * @param {Function} [t]
 * @returns {string}
 */
export function formatAyahNumbersLabel(ayahNumbers, t) {
  const nums = [...new Set(
    (Array.isArray(ayahNumbers) ? ayahNumbers : [])
      .map((n) => Number(n))
      .filter((n) => isValidAyahNumber(n)),
  )].sort((a, b) => a - b)

  if (!nums.length) return ''
  if (nums.length === 1) return formatAyahRangeLabel(nums[0], t)

  const runs = []
  let runStart = nums[0]
  let runEnd = nums[0]
  for (let i = 1; i < nums.length; i += 1) {
    if (nums[i] === runEnd + 1) {
      runEnd = nums[i]
      continue
    }
    runs.push([runStart, runEnd])
    runStart = nums[i]
    runEnd = nums[i]
  }
  runs.push([runStart, runEnd])

  // Single contiguous run → canonical “Ayahs 1–3”
  if (runs.length === 1) {
    return formatAyahRangeLabel(runs[0][0], runs[0][1], t)
  }

  return runs.map(([start, end]) => formatAyahRangeLabel(start, end, t)).join(', ')
}

/** Check Ayah 7 again. | Check Ayahs 1–3 again. */
export function formatCheckAyahsAgainLabel(rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT
  if (!range) return ''

  const rangeLabel = formatAyahRangeLabel(range, t)
  if (!rangeLabel) return ''

  return translate(t, `${LABELS_PREFIX}.checkAyahsAgain`, {
    range: rangeLabel,
    start: range.start,
    end: range.end,
    ayah: range.start,
  }) || `Check ${rangeLabel} again.`
}

/** Repeat Ayah 7 | Repeat Ayahs 4–6 */
export function formatRepeatAyahLabel(rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT
  if (!range) return ''

  if (range.isSingle) {
    return translate(t, `${LABELS_PREFIX}.repeatAyah`, { ayah: range.start })
      || `Repeat Ayah ${range.start}`
  }

  return translate(t, `${LABELS_PREFIX}.repeatAyahs`, {
    start: range.start,
    end: range.end,
  }) || `Repeat Ayahs ${range.start}${EN_DASH}${range.end}`
}

/** You completed Al-Fatihah, Ayahs 4–6. */
export function formatCompletedSurahAyahLabel(surahName, rangeOrStart, endOrT, maybeT) {
  const hasSeparateEnd = typeof endOrT === 'number' || (endOrT != null && typeof endOrT !== 'function')
  const range = hasSeparateEnd
    ? normalizeAyahRange(rangeOrStart, endOrT)
    : normalizeAyahRange(rangeOrStart)
  const t = hasSeparateEnd ? maybeT : endOrT
  const surah = String(surahName || '').trim()
  if (!surah || !range) return ''

  const rangeLabel = formatAyahRangeLabel(range, t)
  if (range.isSingle) {
    return translate(t, `${LABELS_PREFIX}.completedSurahAyah`, { surah, ayah: range.start })
      || `You completed ${surah}, ${rangeLabel}.`
  }

  return translate(t, `${LABELS_PREFIX}.completedSurahAyahs`, {
    surah,
    start: range.start,
    end: range.end,
  }) || `You completed ${surah}, ${rangeLabel}.`
}

function formatCountedNoun(count, { oneKey, otherKey, oneFallback, otherFallback }, t) {
  const n = Number(count)
  if (!Number.isFinite(n) || n < 0) return ''
  const safe = Math.floor(n)
  const key = safe === 1 ? oneKey : otherKey
  const fallback = safe === 1 ? oneFallback : otherFallback
  return translate(t, key, { count: safe }) || fallback.replace('{count}', String(safe))
}

/** 1 ayah | 2 ayahs */
export function formatAyahCountLabel(count, t) {
  return formatCountedNoun(count, {
    oneKey: `${LABELS_PREFIX}.ayahCountOne`,
    otherKey: `${LABELS_PREFIX}.ayahCountOther`,
    oneFallback: '{count} ayah',
    otherFallback: '{count} ayahs',
  }, t)
}

/** 1 repetition | 2 repetitions */
export function formatRepetitionCountLabel(count, t) {
  return formatCountedNoun(count, {
    oneKey: `${LABELS_PREFIX}.repetitionCountOne`,
    otherKey: `${LABELS_PREFIX}.repetitionCountOther`,
    oneFallback: '{count} repetition',
    otherFallback: '{count} repetitions',
  }, t)
}

/** 1 attempt | 2 attempts */
export function formatAttemptCountLabel(count, t) {
  return formatCountedNoun(count, {
    oneKey: `${LABELS_PREFIX}.attemptCountOne`,
    otherKey: `${LABELS_PREFIX}.attemptCountOther`,
    oneFallback: '{count} attempt',
    otherFallback: '{count} attempts',
  }, t)
}
