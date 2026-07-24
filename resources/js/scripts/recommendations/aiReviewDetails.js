/**
 * Build a dense, dynamic post-session AI Recite review for the completion modal.
 *
 * @param {string} outcome strong|mixed|weak
 * @param {Record<string, unknown>} extras
 * @param {Record<string, unknown>|null} result
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 */
export function buildAiReviewDetails(outcome = 'mixed', extras = {}, result = null, t = (key) => key) {
  const mistakes = result?.mistakeBreakdown || result?.mistakes || {}
  const wordStatuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []

  const countList = (value) => {
    if (Array.isArray(value)) return value.length
    const n = Number(value)
    return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
  }

  const isCorrectStatus = (status) => {
    const s = String(status || '').toLowerCase()
    if (!s || s.includes('incorrect') || s.includes('incomplete')) return false
    return s === 'correct' || s.includes('word-correct') || s === 'green'
  }
  const isPartialStatus = (status) => {
    const s = String(status || '').toLowerCase()
    return s.includes('partial') || s.includes('close') || s === 'amber' || s === 'yellow'
  }
  const isMissedStatus = (status) => {
    const s = String(status || '').toLowerCase()
    return s.includes('incorrect') || s.includes('missing') || s.includes('missed') || s === 'red'
  }
  const isOmittedStatus = (status) => {
    const s = String(status || '').toLowerCase()
    return s === 'omitted' || s === 'black' || s.includes('omission')
  }
  const isGrayStatus = (status) => {
    const s = String(status || '').toLowerCase()
    return s === 'pending' || s === 'skipped' || s === 'notattempted' || s === 'gray' || s === 'grey'
  }

  const correctWords = wordStatuses.filter((w) => isCorrectStatus(w?.status)).length
  const partialFromWords = wordStatuses.filter((w) => isPartialStatus(w?.status)).length
  const redFromWords = wordStatuses.filter((w) => isMissedStatus(w?.status) && !isOmittedStatus(w?.status)).length
  const blackFromWords = wordStatuses.filter((w) => isOmittedStatus(w?.status)).length
  const grayFromWords = wordStatuses.filter((w) => isGrayStatus(w?.status)).length
  const missedFromWords = redFromWords + blackFromWords
  const outOfOrderWords = wordStatuses.filter((w) => w?.outOfOrder).length
  const colorCounts = extras.color_counts && typeof extras.color_counts === 'object'
    ? extras.color_counts
    : (result?.colorCounts && typeof result.colorCounts === 'object'
      ? result.colorCounts
      : {
        green: correctWords,
        amber: partialFromWords,
        red: redFromWords,
        black: blackFromWords,
        gray: grayFromWords,
      })

  const accuracyRaw = Number(extras.accuracy_percent ?? result?.accuracyScore ?? result?.accuracy ?? result?.matchPercent)
  const accuracy = Number.isFinite(accuracyRaw)
    ? Math.max(0, Math.min(100, Math.round(accuracyRaw <= 1 ? accuracyRaw * 100 : accuracyRaw)))
    : null

  const missed = Math.max(
    countList(extras.missed_words),
    countList(mistakes.missing) + countList(mistakes.incorrect),
    missedFromWords
  )
  const sequence = Math.max(
    countList(extras.sequence_errors),
    countList(mistakes.sequenceErrors) + countList(mistakes.verseJumps) + countList(mistakes.skippedAyahs),
    outOfOrderWords
  )
  const partial = Math.max(countList(mistakes.partial), partialFromWords, Number(colorCounts.amber || 0))
  const amberCount = partial
  const pronunciation = extras.pronunciation_issues != null
    ? !!extras.pronunciation_issues
    : amberCount >= 2

  const weakAyahs = Array.isArray(extras.weak_ayahs)
    ? extras.weak_ayahs.filter(Boolean)
    : (Array.isArray(result?.weakAyahs) ? result.weakAyahs.filter(Boolean) : [])

  const totalWords = wordStatuses.length
    || Math.max(correctWords + missed + amberCount, 0)
  const estimatedCorrect = totalWords > 0
    ? correctWords
    : (accuracy != null ? Math.round((accuracy / 100) * Math.max(totalWords, 1)) : null)

  const durationSeconds = Number(result?.durationSeconds || extras.duration_seconds || 0)

  const toneForOutcome = outcome === 'strong' ? 'good' : (outcome === 'weak' ? 'warn' : 'mid')

  const metrics = []
  if (accuracy != null) {
    metrics.push({
      key: 'accuracy',
      tone: toneForOutcome,
      label: t('memorisation.postSession.recommendation.aiMetricAccuracy'),
      value: `${accuracy}%`,
    })
  }
  if (totalWords > 0) {
    metrics.push({
      key: 'words',
      tone: missed > 0 || partial > 0 ? 'mid' : 'good',
      label: t('memorisation.postSession.recommendation.aiMetricWords'),
      value: `${estimatedCorrect ?? correctWords}/${totalWords}`,
    })
  } else if (accuracy != null) {
    metrics.push({
      key: 'words',
      tone: toneForOutcome,
      label: t('memorisation.postSession.recommendation.aiMetricWords'),
      value: t('memorisation.postSession.recommendation.aiMetricWordsApprox', { percent: accuracy }),
    })
  }
  metrics.push({
    key: 'missed',
    tone: missed > 0 ? 'warn' : 'good',
    label: t('memorisation.postSession.recommendation.aiMetricMissed'),
    value: String(missed),
  })
  metrics.push({
    key: 'sequence',
    tone: sequence > 0 ? 'warn' : 'good',
    label: t('memorisation.postSession.recommendation.aiMetricOrder'),
    value: sequence > 0
      ? t('memorisation.postSession.recommendation.aiMetricOrderIssues', { count: sequence })
      : t('memorisation.postSession.recommendation.aiMetricOrderSteady'),
  })
  if (amberCount > 0) {
    metrics.push({
      key: 'close',
      tone: 'mid',
      label: t('memorisation.postSession.recommendation.aiMetricClose'),
      value: String(amberCount),
    })
  }
  if ((colorCounts.black || 0) > 0) {
    metrics.push({
      key: 'omitted',
      tone: 'warn',
      label: t('memorisation.postSession.recommendation.aiMetricOmitted'),
      value: String(colorCounts.black),
    })
  }

  const highlights = []
  if (outcome === 'strong' && (accuracy == null || accuracy >= 85)) {
    highlights.push({
      key: 'strength',
      tone: 'good',
      text: t('memorisation.postSession.recommendation.aiHighlightStrongRecall'),
    })
  }
  if (missed > 0) {
    highlights.push({
      key: 'missed',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightMissedWords', { count: missed }),
    })
  }
  if (amberCount > 0 || pronunciation) {
    highlights.push({
      key: 'pronunciation',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightPronunciation', {
        count: Math.max(amberCount, 1),
      }),
    })
  }
  if ((colorCounts.black || 0) > 0) {
    highlights.push({
      key: 'omitted',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightOmittedWords', {
        count: colorCounts.black,
      }),
    })
  }
  if (sequence > 0) {
    highlights.push({
      key: 'sequence',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightSequence'),
    })
  }
  if (weakAyahs.length === 1) {
    highlights.push({
      key: 'weak-ayah',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeakAyah', { ayah: weakAyahs[0] }),
    })
  } else if (weakAyahs.length > 1) {
    highlights.push({
      key: 'weak-ayahs',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeakAyahs', {
        count: weakAyahs.length,
        ayahs: weakAyahs.slice(0, 4).join(', '),
      }),
    })
  }
  if (accuracy != null && accuracy >= 70 && accuracy < 85 && !highlights.some((h) => h.key === 'mixed')) {
    highlights.push({
      key: 'band-mixed',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightMixed'),
    })
  }
  if (!highlights.length && outcome === 'mixed') {
    highlights.push({
      key: 'mixed',
      tone: 'mid',
      text: t('memorisation.postSession.recommendation.aiHighlightMixed'),
    })
  }
  if (!highlights.length && outcome === 'weak') {
    highlights.push({
      key: 'weak',
      tone: 'warn',
      text: t('memorisation.postSession.recommendation.aiHighlightWeak'),
    })
  }
  if (!highlights.length) {
    highlights.push({
      key: 'fallback',
      tone: toneForOutcome,
      text: t('memorisation.postSession.recommendation.aiHighlightStrongRecall'),
    })
  }

  const focus = buildFocusTip({
    accuracy: accuracy ?? 0,
    missed,
    partial: amberCount,
    sequence,
    pronunciation,
    weakAyahs,
    mistakes,
    omitted: Number(colorCounts.black || 0),
    t,
  })

  const outcomeLabel = outcome === 'strong'
    ? t('memorisation.postSession.recommendation.aiOutcomeStrong')
    : (outcome === 'weak'
      ? t('memorisation.postSession.recommendation.aiOutcomeWeak')
      : t('memorisation.postSession.recommendation.aiOutcomeMixed'))

  return {
    outcome,
    outcomeLabel,
    accuracy,
    colorCounts,
    summaryLine: buildAiSummaryLine({
      outcome,
      weakAyahs,
      missed,
      partial: amberCount,
      sequence,
      t,
    }),
    durationLabel: durationSeconds > 0
      ? t('memorisation.postSession.recommendation.aiReviewDuration', { seconds: Math.round(durationSeconds) })
      : '',
    metrics: metrics.slice(0, 6),
    highlights: highlights.slice(0, 5),
    focus,
    weakAyahs: weakAyahs.slice(0, 6),
    chips: metrics.slice(0, 5).map((metric) => ({
      key: metric.key,
      tone: metric.tone,
      label: metric.key === 'accuracy' ? metric.value : `${metric.label}: ${metric.value}`,
    })),
  }
}

function buildAiSummaryLine({ outcome, weakAyahs, missed, partial, sequence, t }) {
  if (outcome === 'strong') {
    if (weakAyahs.length === 1) {
      return t('memorisation.postSession.recommendation.aiResultLineStrongHesitation', { ayah: weakAyahs[0] })
    }
    if (partial === 1 || missed === 1) {
      return t('memorisation.postSession.recommendation.aiResultLineStrongOneGap')
    }
    return t('memorisation.postSession.recommendation.aiResultLineStrong')
  }
  if (outcome === 'mixed') {
    if (weakAyahs.length === 1) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedAyah', { ayah: weakAyahs[0] })
    }
    if (weakAyahs.length > 1) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedAyahs', { count: weakAyahs.length })
    }
    if (sequence > 0) {
      return t('memorisation.postSession.recommendation.aiResultLineMixedOrder')
    }
    return t('memorisation.postSession.recommendation.aiResultLineMixed')
  }
  if (weakAyahs.length === 1) {
    return t('memorisation.postSession.recommendation.aiResultLineWeakAyah', { ayah: weakAyahs[0] })
  }
  return t('memorisation.postSession.recommendation.aiResultLineWeak')
}

function buildFocusTip({
  accuracy,
  missed,
  partial,
  sequence,
  pronunciation,
  weakAyahs,
  mistakes,
  omitted = 0,
  t,
}) {
  if (weakAyahs.length === 1) {
    return t('memorisation.postSession.recommendation.aiFocusWeakAyah', { ayah: weakAyahs[0] })
  }
  if (weakAyahs.length > 1) {
    return t('memorisation.postSession.recommendation.aiFocusWeakAyahs', {
      count: weakAyahs.length,
      ayahs: weakAyahs.slice(0, 3).join(', '),
    })
  }
  if (sequence > 0 || countLen(mistakes.skippedAyahs) || countLen(mistakes.verseJumps)) {
    return t('memorisation.postSession.recommendation.aiFocusSequence')
  }
  if (omitted > 0) {
    return t('memorisation.postSession.recommendation.aiFocusOmitted', { count: omitted })
  }
  if (missed > 0) {
    return t('memorisation.postSession.recommendation.aiFocusMissed', { count: missed })
  }
  if (partial > 0 || pronunciation) {
    return t('memorisation.postSession.recommendation.aiFocusPronunciation', {
      count: Math.max(partial, 1),
    })
  }
  if (accuracy >= 95) {
    return t('memorisation.postSession.recommendation.aiFocusStrong')
  }
  if (accuracy >= 85) {
    return t('memorisation.postSession.recommendation.aiFocusNearly')
  }
  return t('memorisation.postSession.recommendation.aiFocusRetry')
}

function countLen(value) {
  if (Array.isArray(value)) return value.length
  const n = Number(value)
  return Number.isFinite(n) ? Math.max(0, Math.round(n)) : 0
}
