import {
  WORD_STATE,
  classifyStoredWord,
  detectedWords,
  paintReferenceWords,
} from '../dashboard/progressView.js'

const ATTENTION_STATES = new Set([
  WORD_STATE.mismatch,
  WORD_STATE.uncertain,
  WORD_STATE.skipped,
  WORD_STATE.extra,
])

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function textOf(word, keys) {
  for (const key of keys) {
    const value = String(word?.[key] || '').trim()
    if (value) return value
  }
  return ''
}

/**
 * Count stored alignment states. Extra tokens are tracked separately from
 * reference mismatches. Unevaluated words are excluded from match %.
 */
export function countWordStatuses(words) {
  const counts = {
    matched: 0,
    uncertain: 0,
    mismatch: 0,
    skipped: 0,
    extra: 0,
    unassessed: 0,
    evaluated: 0,
    attention: 0,
  }
  ;(Array.isArray(words) ? words : []).forEach((word) => {
    if (!word || typeof word !== 'object') return
    const state = classifyStoredWord(word)
    if (counts[state] == null) return
    counts[state] += 1
    if (state !== WORD_STATE.extra && state !== WORD_STATE.unassessed) {
      counts.evaluated += 1
    }
    if (ATTENTION_STATES.has(state)) {
      counts.attention += 1
    }
  })
  return counts
}

/**
 * Prefer API word_counts, then color_counts (green/amber/red/black), then null.
 */
export function resolveWordCounts(item) {
  const direct = item?.word_counts
  if (direct && typeof direct === 'object') {
    const matched = asNumber(direct.matched)
    const uncertain = asNumber(direct.uncertain)
    const mismatch = asNumber(direct.mismatch)
    const skipped = asNumber(direct.skipped)
    const extra = asNumber(direct.extra)
    const unassessed = asNumber(direct.unassessed)
    const evaluated = direct.evaluated != null
      ? asNumber(direct.evaluated)
      : matched + uncertain + mismatch + skipped
    const attention = direct.attention != null
      ? asNumber(direct.attention)
      : uncertain + mismatch + skipped + extra
    return {
      matched,
      uncertain,
      mismatch,
      skipped,
      extra,
      unassessed,
      evaluated,
      attention,
      source: 'word_counts',
    }
  }

  const colors = item?.color_counts
  if (colors && typeof colors === 'object') {
    const matched = asNumber(colors.green)
    const uncertain = asNumber(colors.amber) + asNumber(colors.gray) + asNumber(colors.grey)
    const mismatch = asNumber(colors.red)
    const skipped = asNumber(colors.black)
    const evaluated = matched + uncertain + mismatch + skipped
    return {
      matched,
      uncertain,
      mismatch,
      skipped,
      extra: 0,
      unassessed: 0,
      evaluated,
      attention: uncertain + mismatch + skipped,
      source: 'color_counts',
    }
  }

  if (item?.flagged_word_count != null) {
    const attention = asNumber(item.flagged_word_count)
    return {
      matched: 0,
      uncertain: 0,
      mismatch: 0,
      skipped: 0,
      extra: 0,
      unassessed: 0,
      evaluated: 0,
      attention,
      source: 'flagged_only',
    }
  }

  return null
}

/**
 * Match % uses stored accuracy_percent when present; otherwise matched/evaluated.
 */
export function matchPercent(item, counts = null) {
  const stored = Number(item?.accuracy_percent)
  if (Number.isFinite(stored) && stored >= 0) {
    return Math.max(0, Math.min(100, Math.round(stored)))
  }
  const c = counts || resolveWordCounts(item)
  if (!c || c.evaluated <= 0) return null
  return Math.max(0, Math.min(100, Math.round((c.matched / c.evaluated) * 100)))
}

/**
 * Deterministic insight from saved counts. Distinguishes word matching only.
 */
export function feedbackInsightKey(counts, options = {}) {
  const c = counts || { matched: 0, uncertain: 0, mismatch: 0, skipped: 0, unassessed: 0, evaluated: 0, attention: 0 }
  const incompleteHint = options.incomplete === true
  if (incompleteHint || (c.evaluated <= 0 && c.unassessed > 0)) {
    return 'insight_incomplete'
  }
  if (c.evaluated <= 0) {
    return 'insight_incomplete'
  }
  if (c.attention <= 0) {
    return 'insight_excellent'
  }
  if (c.attention <= 3) {
    return 'insight_few'
  }
  return 'insight_review'
}

export function ayahNeedsAttention(counts) {
  if (!counts) return false
  return asNumber(counts.attention) > 0
    || asNumber(counts.uncertain) > 0
    || asNumber(counts.mismatch) > 0
    || asNumber(counts.skipped) > 0
}

export function ayahMatchPercent(counts) {
  const evaluated = asNumber(counts?.evaluated)
  if (evaluated <= 0) return null
  return Math.max(0, Math.min(100, Math.round((asNumber(counts.matched) / evaluated) * 100)))
}

export function ayahAttentionSummaryKey(counts) {
  const uncertain = asNumber(counts?.uncertain)
  const mismatch = asNumber(counts?.mismatch) + asNumber(counts?.extra)
  const skipped = asNumber(counts?.skipped)
  if (mismatch > 0 && uncertain === 0 && skipped === 0) {
    return mismatch === 1 ? 'ayah_one_mismatch' : 'ayah_n_mismatch'
  }
  if (uncertain > 0 && mismatch === 0 && skipped === 0) {
    return uncertain === 1 ? 'ayah_one_uncertain' : 'ayah_n_uncertain'
  }
  if (skipped > 0 && mismatch === 0 && uncertain === 0) {
    return skipped === 1 ? 'ayah_one_skipped' : 'ayah_n_skipped'
  }
  const total = asNumber(counts?.attention)
  if (total <= 0) return 'ayah_all_matched'
  return total === 1 ? 'ayah_one_attention' : 'ayah_n_attention'
}

/**
 * Pair expected reference words that need attention with recognised text when stored.
 */
export function reviewWordPairs(storedWords, ayahNumber) {
  return (Array.isArray(storedWords) ? storedWords : [])
    .filter((word) => {
      const ayah = Number(word?.ayah ?? word?.ayah_number ?? word?.ayahNumber ?? 0)
      if (ayahNumber && ayah && ayah !== Number(ayahNumber)) return false
      return ATTENTION_STATES.has(classifyStoredWord(word))
    })
    .map((word, index) => {
      const state = classifyStoredWord(word)
      const expected = textOf(word, ['expected', 'expected_word', 'text', 'target_word', 'displayText', 'word'])
      const recognised = textOf(word, [
        'recognised_word',
        'recognized_word',
        'detected_token',
        'actual',
        'display_word',
        'raw_word',
        'detected',
      ])
      return {
        key: `${ayahNumber || 0}-${index}-${expected}`,
        expected: expected || null,
        recognised: recognised || null,
        state,
        labelKey: state === WORD_STATE.skipped
          ? 'dashboard.word_skipped'
          : state === WORD_STATE.uncertain
            ? 'dashboard.word_uncertain'
            : state === WORD_STATE.extra
              ? 'dashboard.word_extra'
              : 'dashboard.word_mismatch',
      }
    })
    .filter((row) => row.expected || row.recognised)
}

function countsFromPaintedWords(paintedWords, storedFallback) {
  if (Array.isArray(paintedWords) && paintedWords.length) {
    const counts = {
      matched: 0,
      uncertain: 0,
      mismatch: 0,
      skipped: 0,
      extra: 0,
      unassessed: 0,
      evaluated: 0,
      attention: 0,
    }
    paintedWords.forEach((word) => {
      const state = word?.state || WORD_STATE.unassessed
      if (counts[state] != null) counts[state] += 1
      if (state !== WORD_STATE.extra && state !== WORD_STATE.unassessed) {
        counts.evaluated += 1
      }
      if (ATTENTION_STATES.has(state)) counts.attention += 1
    })
    return counts
  }
  return countWordStatuses(storedFallback)
}

export async function buildAttemptAyahFeedback({
  surahNumber,
  ayahStart,
  ayahEnd,
  wordStatuses,
  loadAyahText,
  maxAyahs = 6,
}) {
  const from = Number(ayahStart || 0)
  const to = Number(ayahEnd || from)
  const words = Array.isArray(wordStatuses) ? wordStatuses : []
  if (!(from > 0)) {
    return { ayahs: [], incomplete: words.length === 0 }
  }
  const limit = Math.min(to || from, from + Math.max(0, maxAyahs - 1))
  const jobs = []
  for (let ayah = from; ayah <= limit; ayah += 1) {
    jobs.push((async () => {
      const loaded = typeof loadAyahText === 'function'
        ? await loadAyahText(surahNumber, ayah).catch(() => null)
        : null
      const stored = words.filter((word) => {
        const number = Number(word?.ayah_number || word?.ayahNumber || word?.ayah || (from === to ? from : 0))
        return number === ayah
      })
      const painted = paintReferenceWords(loaded?.text || '', stored, ayah)
      const finalCounts = countsFromPaintedWords(painted.words, stored)
      return {
        number: ayah,
        reference: painted.words,
        detected: detectedWords(stored, ayah),
        reviewWords: reviewWordPairs(stored, ayah),
        stored,
        counts: finalCounts,
        percent: ayahMatchPercent(finalCounts),
        needsAttention: ayahNeedsAttention(finalCounts),
        attentionKey: ayahAttentionSummaryKey(finalCounts),
        attentionCount: asNumber(finalCounts.attention),
        source: painted.source,
      }
    })())
  }
  const rows = await Promise.all(jobs)
  const filtered = rows.filter((ayah) => (
    ayah.reference.length || ayah.detected.length || ayah.stored.length
  ))
  const incomplete = filtered.some((ayah) => asNumber(ayah.counts.unassessed) > 0)
    || words.length === 0
  return { ayahs: filtered, incomplete }
}

export function compactAttemptSummary(item, t = (key) => key) {
  const counts = resolveWordCounts(item)
  const percent = matchPercent(item, counts)
  const insightKey = feedbackInsightKey(counts, {
    incomplete: !item?.has_word_alignment && percent == null,
  })
  const matched = counts?.matched ?? null
  const uncertain = counts?.uncertain ?? null
  // Compact summary keeps three counts; skipped/missing stay in "words to review".
  const mismatch = counts?.mismatch ?? null
  const attention = counts?.attention ?? (item?.flagged_word_count != null ? asNumber(item.flagged_word_count) : null)

  return {
    percent,
    counts,
    matched,
    uncertain,
    mismatch,
    attention,
    insightKey: `dashboard.ai_recite.${insightKey}`,
    insight: t(`dashboard.ai_recite.${insightKey}`),
    wordsMatchedLabel: percent == null
      ? null
      : t('dashboard.ai_recite.words_matched_percent', { n: percent }),
    reviewHint: attention != null && attention > 0
      ? t('dashboard.ai_recite.words_to_review', { n: attention })
      : t('dashboard.ai_recite.no_words_to_review'),
  }
}
