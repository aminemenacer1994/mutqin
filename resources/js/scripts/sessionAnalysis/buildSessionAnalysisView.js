import { buildAiReviewDetails } from '../recommendations/aiReviewDetails.js'
import { classifyRecitationWordColor, RECITATION_COLOR } from '../engine/recitation_analysis.js'

/**
 * Map persisted session/AI analysis into the existing Analysis Modal view-model.
 * Uses saved historical fields only — never live/latest session results.
 */

function asNumber(value) {
  const n = Number(value)
  return Number.isFinite(n) ? n : 0
}

function asText(value) {
  return String(value || '').trim()
}

function wordStatus(word) {
  return asText(word?.status || word?.result_type || word?.visual_status).toLowerCase()
}

function wordText(word) {
  return asText(
    word?.text
    || word?.target_word
    || word?.expected
    || word?.detected_token
    || word?.word
  )
}

function wordAyah(word) {
  const n = Number(word?.ayahNumber ?? word?.ayah_number ?? 0)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function toClientWord(word) {
  if (!word || typeof word !== 'object') return null
  const text = wordText(word)
  const status = wordStatus(word)
  if (!text && !status) return null
  return {
    text,
    status,
    ayahNumber: wordAyah(word),
    wordIndex: Number(word?.ayah_word_index ?? word?.wordIndex ?? word?.word_index ?? -1),
  }
}

function collectWords(payload) {
  const attemptWords = Array.isArray(payload?.ai_attempt?.word_statuses)
    ? payload.ai_attempt.word_statuses
    : []
  const assessmentWords = Array.isArray(payload?.assessment?.word_results)
    ? payload.assessment.word_results
    : []
  const tableWords = Array.isArray(payload?.word_results) ? payload.word_results : []
  const source = attemptWords.length
    ? attemptWords
    : (assessmentWords.length ? assessmentWords : tableWords)
  return source.map(toClientWord).filter(Boolean)
}

function groupWordsByAyah(words, t) {
  const groups = new Map()
  words.forEach((word) => {
    const ayah = word.ayahNumber || 0
    if (!groups.has(ayah)) groups.set(ayah, [])
    groups.get(ayah).push(word)
  })
  return [...groups.entries()]
    .sort((a, b) => (a[0] || 9999) - (b[0] || 9999))
    .map(([ayah, parts]) => ({
      ayah: ayah || null,
      ayahLabel: ayah
        ? (t('dashboard.ayah_n', { n: ayah }) || `Ayah ${ayah}`)
        : '',
      parts: parts.map((word) => ({
        text: word.text,
        tone: toneForStatus(word.status),
      })),
    }))
}

function toneForStatus(status) {
  const color = classifyRecitationWordColor(status)
  if (color === RECITATION_COLOR.GREEN) return 'is-correct'
  if (color === RECITATION_COLOR.AMBER) return 'is-weak'
  if (color === RECITATION_COLOR.RED) return 'is-incorrect'
  if (color === RECITATION_COLOR.BLACK) return 'is-omitted'
  return 'is-neutral'
}

function formatDuration(seconds) {
  const total = Math.max(0, Math.round(asNumber(seconds)))
  const minutes = Math.floor(total / 60)
  const remain = String(total % 60).padStart(2, '0')
  return `${minutes}:${remain}`
}

function collectWeakAyahs(payload) {
  const fromAttempt = Array.isArray(payload?.ai_attempt?.weak_words)
    ? payload.ai_attempt.weak_words.map((item) => item?.ayahNumber ?? item?.ayah_number)
    : []
  const fromRecommendation = Array.isArray(payload?.recommendation?.ai_assessment?.weak_ayahs)
    ? payload.recommendation.ai_assessment.weak_ayahs
    : []
  const fromAyahs = Array.isArray(payload?.assessment?.ayahs)
    ? payload.assessment.ayahs
      .filter((ayah) => asNumber(ayah?.accuracy) > 0 && asNumber(ayah?.accuracy) < 70)
      .map((ayah) => ayah?.ayah_number || ayah?.ayahNumber)
    : []
  return [...new Set([...fromAttempt, ...fromRecommendation, ...fromAyahs]
    .map(Number)
    .filter((n) => Number.isFinite(n) && n > 0))]
}

function recommendationLines(payload) {
  const lines = []
  const plan = payload?.practice_plan
  if (plan) {
    if (asText(plan.title)) lines.push({ key: 'plan', label: asText(plan.title), detail: asText(plan.why) })
    if (asText(plan.recommended_technique)) {
      lines.push({
        key: 'technique',
        label: asText(plan.recommended_technique),
        detail: '',
      })
    }
  }
  const snapshot = payload?.ai_attempt?.plan_snapshot
  if (snapshot && typeof snapshot === 'object') {
    if (asText(snapshot.title) && !lines.some((line) => line.label === asText(snapshot.title))) {
      lines.push({ key: 'snapshot', label: asText(snapshot.title), detail: '' })
    }
  }
  const ai = payload?.recommendation?.ai_assessment
  if (ai && typeof ai === 'object') {
    if (asText(ai.summary)) {
      lines.push({ key: 'summary', label: asText(ai.summary), detail: '' })
    }
  }
  const rec = payload?.recommendation
  if (rec?.recommended_technique && !lines.some((line) => line.label === asText(rec.recommended_technique))) {
    lines.push({
      key: 'rec-technique',
      label: asText(rec.recommended_technique),
      detail: '',
    })
  }
  return lines
}

function retentionItems(payload, t) {
  const spots = Array.isArray(payload?.retention?.weak_spots) ? payload.retention.weak_spots : []
  return spots.map((spot) => {
    const ayah = asNumber(spot?.ayah_number)
    return {
      id: spot?.id,
      label: ayah > 0
        ? (t('dashboard.ayah_n', { n: ayah }) || `Ayah ${ayah}`)
        : asText(spot?.verse_key),
      detail: [asText(spot?.severity), asText(spot?.status), asText(spot?.trend)]
        .filter(Boolean)
        .join(' · '),
    }
  }).filter((item) => item.label)
}

/**
 * @param {Record<string, unknown>|null} payload
 * @param {(key: string, params?: Record<string, unknown>) => string} t
 * @param {{ includeRecommendations?: boolean, includeRetention?: boolean }} [options]
 */
export function buildSessionAnalysisView(payload, t = (key) => key, options = {}) {
  if (!payload || typeof payload !== 'object') {
    return {
      hasContent: false,
      sessionLabel: '',
      sessionMeta: '',
      summaryCards: [],
      aiReview: null,
      ayahRows: [],
      recommendations: [],
      retention: [],
      audio: null,
    }
  }

  const session = payload.session && typeof payload.session === 'object' ? payload.session : {}
  const attempt = payload.ai_attempt && typeof payload.ai_attempt === 'object' ? payload.ai_attempt : null
  const assessment = payload.assessment && typeof payload.assessment === 'object' ? payload.assessment : null
  const words = collectWords(payload)
  const rangeStart = asNumber(session.ayah_start || attempt?.ayah_start || assessment?.start_ayah)
  const rangeEnd = asNumber(session.ayah_end || attempt?.ayah_end || assessment?.end_ayah || rangeStart)
  const surahName = asText(session.surah_name || attempt?.surah_name || assessment?.surah_name)
  const rangeLabel = rangeStart > 0
    ? (rangeStart === rangeEnd
      ? (t('dashboard.ayah_n', { n: rangeStart }) || `Ayah ${rangeStart}`)
      : (t('dashboard.ayah_range', { start: rangeStart, end: rangeEnd }) || `${rangeStart}–${rangeEnd}`))
    : ''
  const sessionLabel = [surahName, rangeLabel].filter(Boolean).join(' · ')
  const status = asText(session.status)
  const statusLabel = status === 'ended_early'
    ? t('dashboard.drawer_status_ended_early')
    : (status ? t('dashboard.drawer_status_completed') : '')
  const occurredAt = asText(session.occurred_at || attempt?.occurred_at || assessment?.completed_at)
  const sessionMeta = [statusLabel, occurredAt].filter(Boolean).join(' · ')

  const accuracy = asNumber(
    attempt?.accuracy_percent
    ?? assessment?.accuracy
    ?? assessment?.overall_accuracy
  )
  const duration = asNumber(session.duration_seconds)
  const repetitions = asNumber(session.repetitions_completed)
  const ayahCount = rangeStart > 0 ? Math.max(1, rangeEnd - rangeStart + 1) : 0

  const summaryCards = [
    ayahCount > 0
      ? {
        key: 'ayahs',
        label: t('memorisation.analyticsReport.versesReviewed'),
        value: String(ayahCount),
        description: t('memorisation.analyticsReport.versesReviewedDesc'),
      }
      : null,
    duration > 0
      ? {
        key: 'time',
        label: t('memorisation.analyticsReport.timeMemorising'),
        value: formatDuration(duration),
        description: t('memorisation.analyticsReport.timeMemorisingDesc'),
      }
      : null,
    repetitions > 0
      ? {
        key: 'repeats',
        label: t('memorisation.analyticsReport.repeatsCompleted'),
        value: String(repetitions),
        description: t('memorisation.analyticsReport.runsCompleted'),
      }
      : null,
    accuracy > 0 || attempt || assessment
      ? {
        key: 'accuracy',
        label: t('dashboard.analysis_accuracy_label'),
        value: t('dashboard.drawer_accuracy', { n: accuracy }),
        description: t('memorisation.saved_word_checks_for_this_session_range'),
      }
      : null,
  ].filter(Boolean)

  const extras = {
    accuracy_percent: attempt?.accuracy_percent ?? assessment?.accuracy ?? null,
    color_counts: attempt?.color_counts || null,
    weak_ayahs: collectWeakAyahs(payload),
    duration_seconds: assessment?.duration_ms ? Math.round(asNumber(assessment.duration_ms) / 1000) : duration,
  }

  const outcome = asText(attempt?.band || payload?.recommendation?.ai_assessment?.result || 'mixed')
  const aiReview = (attempt || assessment || words.length)
    ? buildAiReviewDetails(outcome, extras, {
      accuracyScore: extras.accuracy_percent,
      wordStatuses: words,
      colorCounts: extras.color_counts,
      weakAyahs: extras.weak_ayahs,
      durationSeconds: extras.duration_seconds,
    }, t)
    : null

  const includeRecommendations = options.includeRecommendations !== false
  const includeRetention = options.includeRetention !== false
  const recommendations = includeRecommendations ? recommendationLines(payload) : []
  const retention = includeRetention ? retentionItems(payload, t) : []
  const ayahRows = groupWordsByAyah(words, t)
  const hasContent = Boolean(
    summaryCards.length
    || aiReview
    || ayahRows.length
    || recommendations.length
    || retention.length
    || payload?.has_analysis
  )

  return {
    hasContent,
    sessionLabel,
    sessionMeta,
    summaryCards,
    aiReview,
    ayahRows,
    recommendations,
    retention,
    audio: payload.audio && typeof payload.audio === 'object' ? payload.audio : null,
  }
}

export function hasSavedAnalysis(item) {
  return item?.has_analysis === true
}
