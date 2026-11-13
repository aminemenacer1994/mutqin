import {
  WORD_STATE,
  classifyStoredWord,
  detectedWords,
  paintReferenceWords,
} from '../dashboard/progressView.js'

/** Reference words that need review (matches RecitationAlignmentStatus::isFlagged). */
const ATTENTION_STATES = new Set([
  WORD_STATE.mismatch,
  WORD_STATE.uncertain,
  WORD_STATE.skipped,
])

/** Insertions / extras are listed separately and never counted as confirmed mistakes. */
const REVIEW_PAIR_STATES = new Set([
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
    // Attention = flagged reference words only (not extras / unassessed).
    if (ATTENTION_STATES.has(state)) {
      counts.attention += 1
    }
  })
  return counts
}

/** Flagged reference words: uncertain + mismatch + skipped (never extras). */
export function reviewWordCount(counts) {
  if (!counts || typeof counts !== 'object') return null
  if (counts.attention != null) return asNumber(counts.attention)
  return asNumber(counts.uncertain) + asNumber(counts.mismatch) + asNumber(counts.skipped)
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
    // Prefer explicit attention when present, but never invent extras into review totals.
    const attention = direct.attention != null
      ? asNumber(direct.attention)
      : uncertain + mismatch + skipped
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
    if (evaluated <= 0 && matched + uncertain + mismatch + skipped === 0) {
      return null
    }
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
    // Flagged total alone — do not fabricate per-status zeros.
    return {
      matched: null,
      uncertain: null,
      mismatch: null,
      skipped: null,
      extra: null,
      unassessed: null,
      evaluated: null,
      attention: asNumber(item.flagged_word_count),
      source: 'flagged_only',
    }
  }

  return null
}

/**
 * Match % denominator is evaluated reference words only
 * (matched + uncertain + mismatch + skipped). Extras and unassessed are excluded.
 * Prefer stored accuracy_percent when present (same metric saved with the attempt).
 */
export function matchPercent(item, counts = null) {
  const stored = Number(item?.accuracy_percent)
  if (Number.isFinite(stored) && stored >= 0) {
    return Math.max(0, Math.min(100, Math.round(stored)))
  }
  const c = counts || resolveWordCounts(item)
  const evaluated = asNumber(c?.evaluated)
  const matched = asNumber(c?.matched)
  if (!c || evaluated <= 0 || c.matched == null) return null
  return Math.max(0, Math.min(100, Math.round((matched / evaluated) * 100)))
}

/**
 * Deterministic insight from saved counts. Distinguishes word matching only.
 */
export function feedbackInsightKey(counts, options = {}) {
  const c = counts || { matched: 0, uncertain: 0, mismatch: 0, skipped: 0, unassessed: 0, evaluated: 0, attention: 0 }
  const incompleteHint = options.incomplete === true
  const evaluated = c.evaluated == null ? null : asNumber(c.evaluated)
  const attention = reviewWordCount(c) ?? 0
  const unassessed = asNumber(c.unassessed)
  if (incompleteHint || (evaluated != null && evaluated <= 0 && unassessed > 0)) {
    return 'insight_incomplete'
  }
  if (evaluated != null && evaluated <= 0) {
    return 'insight_incomplete'
  }
  if (attention <= 0) {
    return 'insight_excellent'
  }
  if (attention <= 3) {
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
      return REVIEW_PAIR_STATES.has(classifyStoredWord(word))
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
  const hasDetailedCounts = counts?.source === 'word_counts' || counts?.source === 'color_counts'
  const insightKey = feedbackInsightKey(counts, {
    incomplete: (!item?.has_word_alignment && percent == null)
      || (hasDetailedCounts && asNumber(counts?.evaluated) <= 0 && asNumber(counts?.unassessed) > 0),
  })
  const matched = hasDetailedCounts && counts.matched != null ? asNumber(counts.matched) : null
  const uncertain = hasDetailedCounts && counts.uncertain != null ? asNumber(counts.uncertain) : null
  const mismatch = hasDetailedCounts && counts.mismatch != null ? asNumber(counts.mismatch) : null
  const skipped = hasDetailedCounts && counts.skipped != null ? asNumber(counts.skipped) : null
  // Review total must equal uncertain + mismatch + skipped when detailed counts exist.
  const attention = hasDetailedCounts
    ? asNumber(uncertain) + asNumber(mismatch) + asNumber(skipped)
    : (counts?.attention != null
      ? asNumber(counts.attention)
      : (item?.flagged_word_count != null ? asNumber(item.flagged_word_count) : null))

  let reviewHint = t('dashboard.ai_recite.counts_unavailable')
  if (attention != null) {
    reviewHint = attention > 0
      ? t('dashboard.ai_recite.words_to_review', { n: attention })
      : t('dashboard.ai_recite.no_words_to_review')
  }

  return {
    percent,
    counts,
    matched,
    uncertain,
    mismatch,
    skipped,
    attention,
    hasDetailedCounts,
    insightKey: `dashboard.ai_recite.${insightKey}`,
    insight: t(`dashboard.ai_recite.${insightKey}`),
    wordsMatchedLabel: percent == null
      ? null
      : t('dashboard.ai_recite.words_matched_percent', { n: percent }),
    reviewHint,
  }
}
