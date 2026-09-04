import { buildAiReviewDetails } from '../recommendations/aiReviewDetails.js'
import {
  classifyRecitationWordColor,
  deriveWeakAyahsFromWordStatuses,
  recitationWordAyahNumber,
  RECITATION_COLOR,
} from '../engine/recitation_analysis.js'
import {
  formatRecommendationAyahLabel,
  buildPostSessionInfoArchitecture,
} from '../recommendations/postSessionInfoArchitecture.js'
import { formatElapsedLabel } from '../memorisationDetection/sessionTimer.js'
import { RECITATION_RESULT_STATE } from '../recommendations/recitationResultState.js'

function asText(value) {
  return String(value || '').trim()
}

function wordText(word) {
  return asText(word?.text || word?.word || word?.target_word || word?.arabic)
}

function tokenTone(status) {
  const color = classifyRecitationWordColor(status)
  if (color === RECITATION_COLOR.GREEN) return 'ok'
  if (color === RECITATION_COLOR.AMBER) return 'partial'
  if (color === RECITATION_COLOR.BLACK) return 'omitted'
  if (color === RECITATION_COLOR.RED) return 'incorrect'
  return 'ok'
}

function isWeakTone(tone) {
  return tone === 'partial' || tone === 'omitted' || tone === 'incorrect'
}

function buildWeakSpotRows(wordStatuses, weakAyahs, t) {
  const ayahs = (Array.isArray(weakAyahs) ? weakAyahs : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!ayahs.length) return []

  const byAyah = new Map()
  ayahs.forEach((ayah) => byAyah.set(ayah, { ayah, words: [] }))

  for (const word of (Array.isArray(wordStatuses) ? wordStatuses : [])) {
    const ayah = recitationWordAyahNumber(word)
    if (!ayah || !byAyah.has(ayah)) continue
    const tone = tokenTone(word?.status ?? word?.visualStatus)
    if (!isWeakTone(tone)) continue
    const text = wordText(word)
    if (!text) continue
    const row = byAyah.get(ayah)
    if (!row.words.some((entry) => entry.text === text && entry.tone === tone)) {
      row.words.push({ text, tone })
    }
  }

  return [...byAyah.values()]
    .sort((a, b) => a.ayah - b.ayah)
    .slice(0, 6)
    .map((row) => ({
      ayah: row.ayah,
      ayahLabel: formatRecommendationAyahLabel(row.ayah, t)
        || t('memorisation.postSession.recommendation.singleAyah', { ayah: row.ayah })
        || `Ayah ${row.ayah}`,
      wordsLabel: row.words.slice(0, 4).map((entry) => entry.text).join(' · '),
      wordEntries: row.words.slice(0, 4),
    }))
}

function buildFocusAyahRows(wordStatuses, weakAyahs, t) {
  const ayahs = (Array.isArray(weakAyahs) ? weakAyahs : [])
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0)
  const uniqueAyahs = [...new Set(ayahs)].slice(0, 6)
  if (!uniqueAyahs.length) return []

  const grouped = new Map()
  for (const word of (Array.isArray(wordStatuses) ? wordStatuses : [])) {
    const ayah = recitationWordAyahNumber(word)
    if (!ayah || !uniqueAyahs.includes(ayah)) continue
    if (!grouped.has(ayah)) grouped.set(ayah, [])
    const text = wordText(word)
    if (!text) continue
    const tone = tokenTone(word?.status ?? word?.visualStatus)
    grouped.get(ayah).push({
      text,
      tone,
      weak: isWeakTone(tone),
      wordIndex: Number(word?.ayahWordIndex ?? word?.wordIndex ?? word?.ayah_word_index ?? -1),
    })
  }

  return uniqueAyahs
    .filter((ayah) => grouped.has(ayah))
    .map((ayah) => {
      const parts = grouped.get(ayah) || []
      const firstWeak = parts.find((part) => part.weak) || parts[0] || null
      return {
        ayah,
        ayahLabel: formatRecommendationAyahLabel(ayah, t)
          || t('memorisation.postSession.recommendation.singleAyah', { ayah })
          || `Ayah ${ayah}`,
        parts,
        activatePayload: firstWeak
          ? {
            key: 'focus',
            ayahNumber: ayah,
            word: firstWeak.text,
            wordIndex: firstWeak.wordIndex,
            weakWord: { text: firstWeak.text, ayahNumber: ayah, wordIndex: firstWeak.wordIndex },
          }
          : null,
      }
    })
}

function buildColourSegments(details, t) {
  const mode = String(details?.presentationMode || '')
  if (mode === 'valid_zero_match' || mode === 'insufficient_audio') return []
  const counts = details?.colorCounts
  if (!counts || typeof counts !== 'object') return []
  const defs = [
    { key: 'green', tone: 'tone-green', count: Number(counts.green || 0), labelKey: 'colourCorrect', fallback: 'Correct' },
    { key: 'amber', tone: 'tone-amber', count: Number(counts.amber || 0), labelKey: 'colourClose', fallback: 'Close' },
    { key: 'red', tone: 'tone-red', count: Number(counts.red || 0), labelKey: 'colourIncorrect', fallback: 'Incorrect' },
    { key: 'gray', tone: 'tone-grey', count: Number(counts.gray || 0), labelKey: 'colourWaiting', fallback: 'Waiting' },
    { key: 'black', tone: 'tone-black', count: Number(counts.black || 0), labelKey: 'colourSkipped', fallback: 'Skipped' },
  ]
  const total = defs.reduce((sum, row) => sum + Math.max(0, row.count), 0)
  return defs
    .filter((row) => row.count > 0)
    .map((row) => {
      const percent = total > 0 ? Math.round((row.count / total) * 100) : 0
      const base = t(`memorisation.aiCheck.${row.labelKey}`) || row.fallback
      return { ...row, percent, label: `${base} ${row.count}` }
    })
}

function buildDetailsMetrics(details, t) {
  const metrics = Array.isArray(details.detailsMetrics) && details.detailsMetrics.length
    ? details.detailsMetrics
    : (Array.isArray(details.metrics) ? details.metrics : [])
  const hasAccuracy = metrics.some((m) => m.key === 'accuracy')
  return metrics
    .filter((m) => !(hasAccuracy && m.key === 'words' && /%/.test(String(m.value || ''))))
    .slice(0, 6)
    .map((metric) => {
      if (metric.key !== 'sequence') return metric
      const raw = String(metric.value || '')
      const countMatch = raw.match(/(\d+)/)
      const count = countMatch ? Number(countMatch[1]) : 0
      const steady = count <= 0
        || /steady|not assessed|in order|ثابت|لم/i.test(raw)
      return {
        ...metric,
        label: t('memorisation.postSession.recommendation.aiMetricOrder') || 'Recitation order',
        value: steady
          ? (t('memorisation.postSession.recommendation.aiMetricOrderSteady') || 'In order')
          : (t('memorisation.postSession.recommendation.aiMetricOrderIssues', { count })
            || `${count} out of place`),
      }
    })
}

function buildOutcomeStatChips(details, durationSeconds, t) {
  if (String(details?.presentationMode || '') === 'insufficient_audio') return []
  const chips = []
  const matched = Number(details.matchedWords)
  const total = Number(details.totalWords)
  if (Number.isFinite(matched) && Number.isFinite(total) && total > 0) {
    chips.push({
      key: 'match',
      tone: matched >= total ? 'strong' : (matched / total >= 0.75 ? 'mixed' : 'weak'),
      icon: 'bi bi-check2-circle',
      label: t('memorisation.postSession.recommendation.statMatched'),
      value: `${matched}/${total}`,
      hint: t('memorisation.postSession.recommendation.statMatchedHint')
        || 'Words Mutqin clearly recognised in this check',
    })
  }
  const counts = details.colorCounts || {}
  const wrong = Number(counts.red || 0) + Number(counts.black || 0)
  const close = Number(counts.amber || 0)
  if (wrong > 0 || close > 0) {
    chips.push({
      key: 'issues',
      tone: wrong > 0 ? 'weak' : 'review',
      icon: 'bi bi-exclamation-circle',
      label: t('memorisation.postSession.recommendation.statNeedsWork'),
      value: wrong > 0
        ? (t('memorisation.postSession.recommendation.statWrongCount', { count: wrong })
          || `${wrong} wrong`)
        : (t('memorisation.postSession.recommendation.statCloseCount', { count: close })
          || `${close} close`),
      hint: t('memorisation.postSession.recommendation.statNeedsWorkHint')
        || 'Words that need another calm pass',
    })
  }
  const durationLabel = durationSeconds > 0 ? formatElapsedLabel(durationSeconds * 1000) : ''
  if (durationLabel) {
    chips.push({
      key: 'timer',
      tone: 'soft',
      icon: 'bi bi-stopwatch',
      label: t('memorisation.postSession.recommendation.statRecitationTime')
        || t('memorisation.amd.elapsedTimer')
        || 'Recitation time',
      value: durationLabel,
      hint: t('memorisation.postSession.recommendation.statRecitationTimeHint')
        || 'How long this recitation took',
    })
  }
  return chips.slice(0, 3)
}

function resolveOutcomeHeadline(details, t) {
  const mode = String(details?.presentationMode || '')
  if (mode === 'insufficient_audio') {
    return details.outcomeLabel
      || t('memorisation.postSession.recommendation.insufficientAudioStatus')
      || 'Attempt could not be assessed'
  }
  const state = String(details?.resultState || '').toLowerCase()
  const outcome = String(details?.outcome || '').toLowerCase()
  if (state === RECITATION_RESULT_STATE.STRONG || outcome === 'strong') {
    return t('memorisation.postSession.recommendation.headlineStrong')
      || t('memorisation.postSession.recommendation.statusReadyToContinue')
      || 'Strong recall'
  }
  if (state === RECITATION_RESULT_STATE.DEVELOPING || outcome === 'mixed' || outcome === 'developing') {
    return t('memorisation.postSession.recommendation.statusMostlySecure')
      || t('memorisation.postSession.recommendation.aiOutcomeMixed')
      || 'Mostly secure'
  }
  if (state === RECITATION_RESULT_STATE.NEEDS_PRACTICE || outcome === 'weak' || outcome === 'needs_practice') {
    return t('memorisation.postSession.recommendation.statusMorePracticeNeeded')
      || t('memorisation.postSession.recommendation.headlineWeak')
      || 'Focused revision recommended'
  }
  return details.outcomeLabel
    || t('memorisation.postSession.recommendation.headlineMixed')
    || 'Continue with care'
}

function resolveOutcomeTone(details) {
  const mode = String(details?.presentationMode || '')
  if (mode === 'insufficient_audio') return 'soft'
  const state = String(details?.resultState || '').toLowerCase()
  const outcome = String(details?.outcome || '').toLowerCase()
  if (state === RECITATION_RESULT_STATE.STRONG || outcome === 'strong') return 'strong'
  if (state === RECITATION_RESULT_STATE.NEEDS_PRACTICE || outcome === 'weak' || outcome === 'needs_practice') {
    return 'weak'
  }
  return 'mixed'
}

function resolveRangeLabel(rangeStart, rangeEnd, t) {
  const start = Number(rangeStart)
  const end = Number(rangeEnd || rangeStart)
  if (!Number.isFinite(start) || start <= 0) return ''
  if (start === end) {
    return t('dashboard.ayah_n', { n: start }) || `Ayah ${start}`
  }
  return t('dashboard.ayah_range', { start, end }) || `${start}–${end}`
}

/**
 * Build the post-session-style AI review view for workspace AI Recite results.
 *
 * @param {Record<string, unknown>} input
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 */
export function buildWorkspaceAiReciteResultView(input = {}, t = (key) => key) {
  const result = input.result && typeof input.result === 'object' ? input.result : null
  const submitData = input.submitData && typeof input.submitData === 'object' ? input.submitData : null
  const assessment = submitData?.assessment || input.assessment || null
  const aiAttempt = submitData?.ai_attempt || input.aiAttempt || null
  const wordStatuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []
  const accuracy = Math.round(Number(
    assessment?.accuracy
    ?? assessment?.overall_accuracy
    ?? result?.accuracyScore
    ?? result?.accuracy
    ?? 0,
  ))
  const durationSeconds = Number(
    result?.durationSeconds
    ?? assessment?.duration_seconds
    ?? input.durationSeconds
    ?? 0,
  )
  const outcome = accuracy >= 80 ? 'strong' : (accuracy >= 55 ? 'mixed' : 'weak')
  const extras = {
    accuracy_percent: accuracy,
    color_counts: result?.colorCounts || aiAttempt?.color_counts || null,
    duration_seconds: durationSeconds,
    weak_ayahs: Array.isArray(result?.weakAyahs) ? result.weakAyahs : undefined,
  }
  const reviewDetails = buildAiReviewDetails(outcome, extras, result, t)
  const weakAyahs = reviewDetails.weakAyahs?.length
    ? reviewDetails.weakAyahs
    : deriveWeakAyahsFromWordStatuses(wordStatuses)
  const weakSpotRows = buildWeakSpotRows(wordStatuses, weakAyahs, t)
  const focusAyahRows = buildFocusAyahRows(wordStatuses, weakAyahs, t)
  const primaryWeakAyah = weakAyahs[0] || null
  const understandingText = asText(reviewDetails.summaryLine)
  const infoArchitecture = buildPostSessionInfoArchitecture({
    t,
    outcome: reviewDetails.outcome || null,
    outcomeLabel: resolveOutcomeHeadline(reviewDetails, t),
    understandingText,
    primaryWeakAyah,
    weakAyahRows: weakSpotRows,
    weakAyahNumbers: weakAyahs,
    focusPhraseParts: focusAyahRows[0]?.parts || [],
    focusAyahLabel: focusAyahRows[0]?.ayahLabel || '',
    showRevisionOptions: false,
    revisionOptions: [],
  })
  const presentationMode = String(reviewDetails.presentationMode || 'standard')
  const detailsMetrics = buildDetailsMetrics(reviewDetails, t)
  const colourSegments = buildColourSegments(reviewDetails, t)
  const outcomeStatChips = buildOutcomeStatChips(reviewDetails, durationSeconds, t)
  const surahName = asText(
    input.surahName
    || aiAttempt?.surah_name
    || assessment?.surah_name
    || '',
  )
  const rangeStart = Number(input.rangeStart || aiAttempt?.ayah_start || assessment?.start_ayah || 0)
  const rangeEnd = Number(input.rangeEnd || aiAttempt?.ayah_end || assessment?.end_ayah || rangeStart)
  const rangeLabel = resolveRangeLabel(rangeStart, rangeEnd, t)
  const headerLead = [surahName, rangeLabel].filter(Boolean).join(' · ')
  const hasContent = !!(
    reviewDetails
    && (
      understandingText
      || outcomeStatChips.length
      || focusAyahRows.length
      || weakSpotRows.length
      || detailsMetrics.length
    )
  )

  return {
    hasContent,
    headerTitle: t('memorisation.recite_check_results') || 'Recitation check results',
    headerLead,
    reviewDetails,
    presentationMode,
    outcome: reviewDetails.outcome || 'mixed',
    outcomeHeadline: resolveOutcomeHeadline(reviewDetails, t),
    outcomeTone: resolveOutcomeTone(reviewDetails),
    understandingText,
    outcomeStatChips,
    infoArchitecture,
    focusAyahRows,
    weakSpotRows,
    showDetailsToggle: detailsMetrics.length > 0 && presentationMode !== 'insufficient_audio',
    detailsMetrics,
    colourSegments,
    audioUrl: asText(input.audioUrl || submitData?.audio?.url || ''),
  }
}

export default buildWorkspaceAiReciteResultView
