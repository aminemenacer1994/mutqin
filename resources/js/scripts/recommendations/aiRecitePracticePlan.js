/**
 * Dynamic AI Recite practice plan.
 * Builds unique technique + settings recommendations from attempt accuracy
 * and word-level colour evidence (green / amber / red / black / grey).
 */

import { resolveTechniqueDisplay } from '../techniques/techniqueDisplay.js'
import { resolveRecommendedPlaybackSpeed } from './playbackSpeedPolicy.js'
import { formatAyahNumberSpans } from '../formatting/ayahLabels.js'

export const AI_RECITE_MAX_ATTEMPTS = 3
export const MAX_PRACTICE_AYAH_SPAN = 3

export const ACCURACY_BAND = Object.freeze({
  STRONG: 'strong', // 80%+
  FOCUSED: 'focused', // 55–79%
  GENTLE: 'gentle', // <55%
})

const BEGINNER_HOW_STEPS = Object.freeze({
  talqin: [
    'Play the ayah once and listen carefully.',
    'Repeat it aloud while looking.',
    'Repeat again from memory.',
  ],
  focus: [
    'Work on one ayah only.',
    'Do not move on until it feels steady.',
    'Then go to the next ayah.',
  ],
  blur: [
    'Read the ayah once with the text clear.',
    'Hide a little more of the text each repeat.',
    'Finish by recalling without looking.',
  ],
  chaining: [
    'Practise the first ayah alone.',
    'Add the next ayah and join them.',
    'Recite the short chain smoothly.',
  ],
  anchor: [
    'Notice the marked focus words.',
    'Say those words clearly first.',
    'Then recite the full ayah.',
  ],
})

/**
 * Normalize a raw word status into a plan colour severity.
 * Finalised `pending` words were never said → treat as omitted (black).
 *
 * @param {string} raw
 * @returns {'green'|'amber'|'red'|'black'|'gray'|null}
 */
export function normalisePlanWordSeverity(raw = '') {
  const status = String(raw || '').toLowerCase().trim()
  if (!status) return null
  if (
    status === 'correct'
    || status.includes('word-correct')
    || status === 'green'
  ) {
    return 'green'
  }
  if (
    status === 'partial'
    || status.includes('amber')
    || status.includes('close')
  ) {
    return 'amber'
  }
  if (
    status === 'incorrect'
    || status === 'red'
    || status.includes('wrong')
  ) {
    return 'red'
  }
  if (
    status === 'omitted'
    || status === 'omission'
    || status.includes('omitted')
    || status.includes('omission')
    || status.includes('missing')
    || status === 'black'
    || status === 'pending' // finalised unspoken words
  ) {
    return 'black'
  }
  if (
    status === 'gray'
    || status === 'grey'
    || status === 'skipped'
    || status === 'notattempted'
    || status === 'not_attempted'
  ) {
    return 'gray'
  }
  return null
}

/**
 * @param {Array<{ accuracy?: number }>} attempts
 */
export function averageAttemptAccuracy(attempts = []) {
  const scores = (Array.isArray(attempts) ? attempts : [])
    .map((a) => Number(a?.accuracy ?? a?.accuracyPercent ?? a?.accuracyScore))
    .filter((n) => Number.isFinite(n))
    .map((n) => (n <= 1 ? n * 100 : n))
  if (!scores.length) return null
  return Math.round(scores.reduce((sum, n) => sum + n, 0) / scores.length)
}

/**
 * @param {number|null} accuracyPercent
 */
export function accuracyPracticeBand(accuracyPercent) {
  const n = Number(accuracyPercent)
  if (!Number.isFinite(n)) return ACCURACY_BAND.FOCUSED
  if (n >= 80) return ACCURACY_BAND.STRONG
  if (n >= 55) return ACCURACY_BAND.FOCUSED
  return ACCURACY_BAND.GENTLE
}

/**
 * Infer practice band from colour mix when accuracy is missing.
 * @param {{ green?: number, amber?: number, red?: number, black?: number, gray?: number }} counts
 */
export function bandFromColorCounts(counts = {}) {
  const green = Number(counts.green || 0)
  const amber = Number(counts.amber || 0)
  const red = Number(counts.red || 0)
  const black = Number(counts.black || 0)
  const gray = Number(counts.gray || 0)
  const total = Math.max(1, green + amber + red + black + gray)
  const hard = red + black
  const soft = amber
  if (hard === 0 && soft <= 2 && green / total >= 0.78) return ACCURACY_BAND.STRONG
  if (hard / total >= 0.4 || (hard + soft) / total >= 0.55) return ACCURACY_BAND.GENTLE
  return ACCURACY_BAND.FOCUSED
}

/**
 * Aggregate colour counts across results, treating pending as black.
 * @param {Array<object>} results
 */
export function aggregateColorCounts(results = []) {
  const totals = { green: 0, amber: 0, red: 0, black: 0, gray: 0 }
  for (const result of (Array.isArray(results) ? results : [])) {
    const fromResult = result?.colorCounts && typeof result.colorCounts === 'object'
      ? result.colorCounts
      : null
    if (fromResult) {
      // Re-count from statuses when pending was lumped into gray — plan wants pending as black.
      const statuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []
      if (statuses.length) {
        for (const word of statuses) {
          const severity = normalisePlanWordSeverity(word?.status || word?.visualStatus)
          if (!severity) continue
          totals[severity] += 1
        }
        continue
      }
      totals.green += Number(fromResult.green || 0)
      totals.amber += Number(fromResult.amber || 0)
      totals.red += Number(fromResult.red || 0)
      totals.black += Number(fromResult.black || 0) + Number(fromResult.gray || 0)
      continue
    }
    const statuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []
    for (const word of statuses) {
      const severity = normalisePlanWordSeverity(word?.status || word?.visualStatus)
      if (!severity) continue
      totals[severity] += 1
    }
  }
  return totals
}

/**
 * Extract weak words from a recitation result / wordStatuses.
 * Prefers red, black, amber — never invents precision.
 *
 * @param {object} result
 * @returns {Array<object>}
 */
export function extractWeakWordsFromResult(result = {}) {
  const statuses = Array.isArray(result.wordStatuses)
    ? result.wordStatuses
    : (Array.isArray(result.statuses) ? result.statuses : [])
  const ayahKey = String(result.ayahKey || result.ayahRange?.keys?.[0] || '')
  const [surahPart, ayahPart] = ayahKey.split(':')
  const surahId = Number(result.surahId || surahPart) || null
  const ayahNumber = Number(result.ayahNumber || ayahPart) || null

  const out = []
  const seen = new Set()

  for (let index = 0; index < statuses.length; index += 1) {
    const word = statuses[index] || {}
    const severity = normalisePlanWordSeverity(word.status || word.visualStatus)
    if (!severity || severity === 'green' || severity === 'gray') continue

    const reason = severity === 'amber' ? 'hesitation' : 'pronunciation'
    // Prefer per-ayah word index so marks align with ayah-card tokens.
    const wordIndex = Number(
      word.ayahWordIndex ?? word.index ?? word.wordIndex ?? index,
    )
    const wordAyah = Number(word.ayahNumber || ayahNumber) || ayahNumber
    const wordSurah = Number(word.surahId || surahId) || surahId
    const verseKey = word.verseKey
      || word.ayahKey
      || (wordSurah && wordAyah ? `${wordSurah}:${wordAyah}` : null)
      || ayahKey
    const key = `${verseKey || ''}:${wordIndex}`
    if (seen.has(key)) continue
    seen.add(key)

    out.push({
      surahId: wordSurah,
      ayahNumber: wordAyah,
      wordIndex,
      text: String(word.text || word.word || word.ar || '').trim(),
      reason,
      status: severity === 'black' ? 'omitted' : (severity === 'amber' ? 'partial' : 'incorrect'),
      confidence: Number.isFinite(Number(word.confidence)) ? Number(word.confidence) : undefined,
      verseKey,
      severity,
    })
  }

  // Prefer hard mistakes first.
  out.sort((a, b) => {
    const rank = { black: 0, red: 1, amber: 2 }
    return (rank[a.severity] ?? 9) - (rank[b.severity] ?? 9)
  })

  return out.slice(0, 16)
}

/**
 * Contiguous weak-ayah practice range — no ±1 padding.
 * If span > 3, take the densest 3-ayah window by weak-word count.
 *
 * @param {{
 *   sessionFrom?: number,
 *   sessionTo?: number,
 *   weakAyahs?: number[],
 *   weakWords?: Array<{ ayahNumber?: number }>,
 *   maxSpan?: number,
 * }} input
 * @returns {{ from: number, to: number, count: number, focus_ayahs: number[] }}
 */
export function resolvePracticeRange(input = {}) {
  const maxSpan = Math.max(1, Number(input.maxSpan) || MAX_PRACTICE_AYAH_SPAN)
  const sessionFrom = Number(input.sessionFrom || 1)
  const sessionTo = Number(input.sessionTo || sessionFrom)
  const lo = Math.min(sessionFrom, sessionTo)
  const hi = Math.max(sessionFrom, sessionTo)

  const weakAyahs = [...new Set(
    (Array.isArray(input.weakAyahs) ? input.weakAyahs : [])
      .map((n) => Number(n))
      .filter((n) => Number.isFinite(n) && n >= lo && n <= hi),
  )].sort((a, b) => a - b)

  if (!weakAyahs.length) {
    const count = Math.max(1, hi - lo + 1)
    return {
      from: lo,
      to: hi,
      count,
      focus_ayahs: [],
    }
  }

  let from = Math.min(...weakAyahs)
  let to = Math.max(...weakAyahs)

  if ((to - from + 1) > maxSpan) {
    const weakWords = Array.isArray(input.weakWords) ? input.weakWords : []
    const density = {}
    weakAyahs.forEach((ayah) => { density[ayah] = 0 })
    weakWords.forEach((word) => {
      const ayah = Number(word?.ayahNumber)
      if (Number.isFinite(ayah) && density[ayah] != null) density[ayah] += 1
    })
    // Prefer densest window; fall back to earliest weak block.
    let bestFrom = from
    let bestScore = -1
    for (let start = from; start <= to - maxSpan + 1; start += 1) {
      const end = start + maxSpan - 1
      let score = 0
      for (let ayah = start; ayah <= end; ayah += 1) {
        score += Number(density[ayah] || 0)
        if (weakAyahs.includes(ayah)) score += 1
      }
      if (score > bestScore) {
        bestScore = score
        bestFrom = start
      }
    }
    from = bestFrom
    to = bestFrom + maxSpan - 1
  }

  from = Math.max(lo, from)
  to = Math.min(hi, to)
  if (to < from) {
    from = lo
    to = Math.min(hi, lo + maxSpan - 1)
  }

  return {
    from,
    to,
    count: Math.max(1, to - from + 1),
    focus_ayahs: weakAyahs.filter((n) => n >= from && n <= to),
  }
}

function enrichTechnique(id, t) {
  const display = resolveTechniqueDisplay(id, t)
  const steps = BEGINNER_HOW_STEPS[id] || BEGINNER_HOW_STEPS.focus
  return {
    id,
    title: display.label || display.shortLabel || id,
    how: display.description || steps[0] || '',
    steps,
  }
}

/**
 * Select exactly one primary technique (+ optional tip id for copy only).
 *
 * @param {object} input
 * @returns {{ id: string, title: string, how: string, steps: string[] }[]}
 */
export function selectPracticeTechniques(input = {}) {
  const weakWords = Array.isArray(input.weakWords) ? input.weakWords : []
  const weakAyahs = Array.isArray(input.weakAyahs) ? input.weakAyahs : []
  const band = input.band || accuracyPracticeBand(input.accuracyPercent)
  const ayahWordCounts = input.ayahWordCounts && typeof input.ayahWordCounts === 'object'
    ? input.ayahWordCounts
    : {}
  const colorCounts = input.colorCounts && typeof input.colorCounts === 'object'
    ? input.colorCounts
    : {}
  const t = typeof input.t === 'function' ? input.t : null

  const uniqueAyahs = [...new Set([
    ...weakWords.map((w) => Number(w.ayahNumber)).filter((n) => Number.isFinite(n) && n > 0),
    ...weakAyahs.map((n) => Number(n)).filter((n) => Number.isFinite(n) && n > 0),
  ])]
  const hardWords = weakWords.filter((w) => w.severity === 'red' || w.severity === 'black')
  const amberWords = weakWords.filter((w) => w.severity === 'amber')
  const hardFromWords = hardWords.length
  const hardFromColors = Number(colorCounts.red || 0) + Number(colorCounts.black || 0)
  const hardCount = Math.max(hardFromWords, hardFromColors)
  const amberCount = Math.max(amberWords.length, Number(colorCounts.amber || 0))

  const entireAyahWeak = uniqueAyahs.some((ayah) => {
    const count = Number(ayahWordCounts[ayah] || 0)
    if (count < 4) return false
    const weakInAyah = weakWords.filter((w) => Number(w.ayahNumber) === ayah).length
    return weakInAyah / count >= 0.55
  })

  let primaryId = 'focus'
  let tipId = null

  if (band === ACCURACY_BAND.STRONG) {
    primaryId = 'blur'
    if (hardCount >= 2 && hardCount <= 4) tipId = 'anchor'
  } else if (band === ACCURACY_BAND.GENTLE || entireAyahWeak) {
    primaryId = 'talqin'
    if (uniqueAyahs.length >= 2 || hardCount >= 5) tipId = 'chaining'
    else if (hardCount >= 2 && hardCount <= 4) tipId = 'anchor'
  } else if (uniqueAyahs.length >= 2 || hardCount >= 5) {
    // Spread across ayahs → join them.
    primaryId = 'chaining'
    if (hardCount >= 2 && hardCount <= 4) tipId = 'anchor'
  } else if (hardCount >= 2 && hardCount <= 4 && !entireAyahWeak) {
    primaryId = 'anchor'
  } else if (amberCount >= 2 && hardCount <= 1) {
    primaryId = 'blur'
  } else {
    primaryId = 'focus'
  }

  const primary = enrichTechnique(primaryId, t)
  const out = [primary]
  if (tipId && tipId !== primaryId) {
    const tip = enrichTechnique(tipId, t)
    out.push({
      ...tip,
      tipOnly: true,
    })
  }
  return out
}

/**
 * Build Laravel-ready settings + plan_detail from AI Recite attempts.
 *
 * @param {{
 *   attempts?: Array<object>,
 *   results?: Array<object>,
 *   range?: { from?: number, to?: number, surahId?: number, surahName?: string },
 *   t?: Function|null,
 * }} input
 */
export function buildAiReciteDynamicPlan(input = {}) {
  const attempts = Array.isArray(input.attempts) ? input.attempts : []
  const results = Array.isArray(input.results) && input.results.length
    ? input.results
    : attempts.map((a) => a?.result).filter(Boolean)

  let averageAccuracy = averageAttemptAccuracy(
    attempts.length
      ? attempts
      : results.map((r) => ({ accuracy: r?.accuracyScore ?? r?.accuracy ?? r?.accuracyPercent })),
  )
  const colorCounts = aggregateColorCounts(results)
  if (!Number.isFinite(Number(averageAccuracy))) {
    const total = Math.max(
      1,
      colorCounts.green + colorCounts.amber + colorCounts.red + colorCounts.black + colorCounts.gray,
    )
    if (total > 1 || colorCounts.green || colorCounts.red || colorCounts.black) {
      const weighted = colorCounts.green + (colorCounts.amber * 0.45)
      averageAccuracy = Math.round((weighted / total) * 100)
    }
  }
  const band = Number.isFinite(Number(averageAccuracy))
    ? accuracyPracticeBand(averageAccuracy)
    : bandFromColorCounts(colorCounts)

  const weakWords = []
  const weakAyahSet = new Set()
  const ayahWordCounts = {}

  for (const result of results) {
    const extracted = extractWeakWordsFromResult(result)
    for (const word of extracted) {
      weakWords.push(word)
      if (Number.isFinite(Number(word.ayahNumber))) weakAyahSet.add(Number(word.ayahNumber))
    }
    const statuses = Array.isArray(result?.wordStatuses) ? result.wordStatuses : []
    const perAyah = {}
    for (const word of statuses) {
      const wordAyah = Number(
        word?.ayahNumber
        || String(word?.verseKey || word?.ayahKey || '').split(':')[1]
        || 0,
      )
      if (wordAyah > 0) {
        perAyah[wordAyah] = (perAyah[wordAyah] || 0) + 1
      }
    }
    const fallbackAyah = Number(result?.ayahNumber || String(result?.ayahKey || '').split(':')[1] || 0)
    if (fallbackAyah > 0 && !Object.keys(perAyah).length && statuses.length) {
      perAyah[fallbackAyah] = statuses.length
    }
    Object.entries(perAyah).forEach(([ayah, count]) => {
      const n = Number(ayah)
      ayahWordCounts[n] = Math.max(Number(ayahWordCounts[n] || 0), Number(count) || 0)
    })
    const fromResult = Array.isArray(result?.weakAyahs) ? result.weakAyahs : []
    fromResult.forEach((n) => {
      const ayahNum = Number(n)
      if (Number.isFinite(ayahNum) && ayahNum > 0) weakAyahSet.add(ayahNum)
    })
  }

  const uniqueWeak = []
  const seen = new Set()
  for (const word of weakWords) {
    const key = `${word.verseKey || ''}:${word.wordIndex}`
    if (seen.has(key)) continue
    seen.add(key)
    uniqueWeak.push(word)
  }

  const weakAyahs = [...weakAyahSet].sort((a, b) => a - b)
  const t = typeof input.t === 'function' ? input.t : null
  const techniques = selectPracticeTechniques({
    weakWords: uniqueWeak,
    weakAyahs,
    band,
    accuracyPercent: averageAccuracy,
    ayahWordCounts,
    colorCounts,
    t,
  })

  const primary = techniques[0] || enrichTechnique('talqin', t)
  const tip = techniques.find((tech) => tech.tipOnly) || null

  let repetitions = 3
  // AI test always covers a range just recited → review/mastery speed band.
  let playbackSpeed = resolveRecommendedPlaybackSpeed({
    isReview: true,
    accuracyPercent: averageAccuracy,
  })
  if (band === ACCURACY_BAND.GENTLE) {
    repetitions = 5
    playbackSpeed = 1.25
  } else if (band === ACCURACY_BAND.FOCUSED) {
    repetitions = 4
    playbackSpeed = 1.25
  } else {
    repetitions = uniqueWeak.length ? 3 : 2
    playbackSpeed = averageAccuracy >= 90 ? 1.5 : 1.25
  }

  const hard = Number(colorCounts.red || 0) + Number(colorCounts.black || 0)
  if (hard >= 6) {
    repetitions = Math.max(repetitions, 5)
    playbackSpeed = 1.25
  } else if (hard >= 3) {
    repetitions = Math.max(repetitions, 4)
    playbackSpeed = 1.25
  } else if (hard === 0 && Number(colorCounts.amber || 0) <= 1 && band === ACCURACY_BAND.STRONG) {
    repetitions = Math.min(repetitions, 2)
    playbackSpeed = 1.5
  }

  const durationSeconds = Math.max(0, Number(input.durationSeconds || 0))
  const pacedWordCount = Math.max(
    0,
    Number(input.wordCount || 0)
      || uniqueWeak.length
      || Object.values(ayahWordCounts).reduce((sum, n) => sum + Number(n || 0), 0),
  )
  let recitationPace = { tone: 'unknown', wordsPerMinute: 0, durationSeconds, wordCount: pacedWordCount }
  if (durationSeconds > 0 && pacedWordCount > 0) {
    const wpm = Math.round((pacedWordCount / durationSeconds) * 60)
    const tone = wpm > 125 ? 'fast' : (wpm < 45 ? 'slow' : 'steady')
    recitationPace = { tone, wordsPerMinute: wpm, durationSeconds, wordCount: pacedWordCount }
    if (tone === 'fast') {
      playbackSpeed = Math.min(playbackSpeed, 1.25)
      repetitions = Math.min(6, repetitions + 1)
    } else if (tone === 'slow') {
      playbackSpeed = 1.25
      if (band === ACCURACY_BAND.STRONG) repetitions = Math.max(2, repetitions - 1)
    }
  }

  const sessionFrom = Number(input.range?.from || weakAyahs[0] || 1)
  const sessionTo = Number(input.range?.to || weakAyahs[weakAyahs.length - 1] || sessionFrom)
  const practiceRange = resolvePracticeRange({
    sessionFrom,
    sessionTo,
    weakAyahs,
    weakWords: uniqueWeak,
    maxSpan: MAX_PRACTICE_AYAH_SPAN,
  })

  const feedback = buildFriendlyReciteFeedback(averageAccuracy, t)
  const why = buildWhyThisPlan({
    band,
    averageAccuracy,
    weakWords: uniqueWeak,
    techniques: [primary],
    t,
  })

  // Enable only the primary technique as a session mode.
  const settings = {
    technique: primary.id,
    complementary_technique: null,
    tip_technique: tip?.id || null,
    playback_speed: playbackSpeed,
    repetitions,
    talqin_enabled: primary.id === 'talqin',
    blur_enabled: primary.id === 'blur',
    focus_enabled: primary.id === 'focus',
    chaining_enabled: primary.id === 'chaining',
    chaining_method: primary.id === 'chaining' ? 'linking' : null,
    chaining_repetitions: primary.id === 'chaining' ? 2 : null,
    anchor_mode_enabled: primary.id === 'anchor',
    anchor_count: Math.min(4, Math.max(2, uniqueWeak.filter((w) => w.severity !== 'amber').length || 2)),
    practice_weak_words: uniqueWeak,
    source: 'ai_recite_dynamic',
    average_accuracy: averageAccuracy,
    color_counts: colorCounts,
    recitation_duration_seconds: durationSeconds,
    recitation_pace: recitationPace,
  }

  const speedLabel = t?.('memorisation.aiRecitePlan.setup.speed', { speed: playbackSpeed })
    || `${playbackSpeed}× speed`
  const repsLabel = repetitions === 1
    ? (t?.('memorisation.aiRecitePlan.setup.repOne') || '1 repetition')
    : (t?.('memorisation.aiRecitePlan.setup.reps', { count: repetitions }) || `${repetitions} repetitions`)

  const focusAyahs = practiceRange.focus_ayahs.length ? practiceRange.focus_ayahs : weakAyahs
  const planDetail = {
    source: 'ai_recite_dynamic',
    average_accuracy: averageAccuracy,
    attempt_count: Math.max(attempts.length, results.length),
    band,
    color_counts: colorCounts,
    feedback,
    personalWhy: why,
    range: {
      from: practiceRange.from,
      to: practiceRange.to,
      count: practiceRange.count,
      label: formatPlanRangeLabel(input.range?.surahName, practiceRange.from, practiceRange.to, t),
      focusLabel: !focusAyahs.length
        ? ''
        : (focusAyahs.length === 1
          ? (t?.('memorisation.aiRecitePlan.focusAyah', { ayah: focusAyahs[0] })
            || `Focus on āyah ${focusAyahs[0]}`)
          : (t?.('memorisation.aiRecitePlan.focusAyahs', {
            ayahs: formatAyahNumberSpans(focusAyahs) || focusAyahs.join(', '),
          })
            || `Focus on āyahs ${formatAyahNumberSpans(focusAyahs) || focusAyahs.join(', ')}`)),
      focus_ayahs: focusAyahs,
    },
    weakWords: uniqueWeak,
    techniques: [primary],
    tipTechnique: tip
      ? {
        id: tip.id,
        title: tip.title,
        how: tip.how,
      }
      : null,
    practiceApproach: {
      id: primary.id,
      title: primary.title,
      how: primary.how,
      steps: primary.steps || [],
      with: tip
        ? (t?.('memorisation.aiRecitePlan.alsoTip', { technique: tip.title })
          || `Tip: ${tip.title}`)
        : '',
    },
    setup: [
      { key: 'speed', label: speedLabel },
      { key: 'reps', label: repsLabel },
    ],
    time: null,
    beginner: {
      resultLabel: band === ACCURACY_BAND.STRONG
        ? (t?.('memorisation.aiRecitePlan.beginner.strong') || 'Strong: ready to move on')
        : (t?.('memorisation.aiRecitePlan.beginner.notFirm') || 'Not firm yet'),
      whatLabel: t?.('memorisation.aiRecitePlan.beginner.what') || 'What to practise',
      howLabel: t?.('memorisation.aiRecitePlan.beginner.how') || 'How',
      wordsLabel: t?.('memorisation.aiRecitePlan.beginner.words') || 'Words to watch',
    },
  }

  return {
    averageAccuracy,
    band,
    feedback,
    why,
    weakWords: uniqueWeak,
    weakAyahs: focusAyahs,
    techniques: [primary],
    tipTechnique: tip,
    colorCounts,
    settings,
    planDetail,
    ayah_range: {
      from: practiceRange.from,
      to: practiceRange.to,
      count: practiceRange.count,
      focus_ayahs: focusAyahs,
    },
    outcome: band === ACCURACY_BAND.STRONG ? 'strong' : (band === ACCURACY_BAND.GENTLE ? 'weak' : 'mixed'),
  }
}

/**
 * @param {number|null} accuracy
 * @param {Function|null} t
 */
export function buildFriendlyReciteFeedback(accuracy, t = null) {
  const n = Number(accuracy)
  if (!Number.isFinite(n)) {
    return t?.('memorisation.aiRecitePlan.feedbackMixed')
      || 'May Allah strengthen what you have memorised. A short focused plan will help.'
  }
  if (n >= 85) {
    return t?.('memorisation.aiRecitePlan.feedbackStrong')
      || 'Mā shā’ Allāh. Beautiful work. A light review will keep it firm.'
  }
  if (n >= 60) {
    return t?.('memorisation.aiRecitePlan.feedbackFocused')
      || 'Good effort. Let us gently strengthen the weak words together.'
  }
  return t?.('memorisation.aiRecitePlan.feedbackGentle')
    || 'Take your time. We will break this down calmly, one step at a time.'
}

function buildWhyThisPlan({ band, averageAccuracy, weakWords, techniques, t }) {
  const primary = techniques?.[0] || null
  const methodTitle = primary?.title || 'a calm method'
  if (weakWords?.length) {
    const first = weakWords[0] || {}
    const word = String(first.text || '').trim()
    const ayah = Number(first.ayahNumber || first.ayah || first.ayah_number || 0)
    const count = weakWords.length
    const msg = t?.('memorisation.aiRecitePlan.whyEvidence', {
      count,
      word: word || '',
      ayah: ayah || '',
      method: methodTitle,
      accuracy: averageAccuracy ?? '',
    })
    if (msg && !String(msg).includes('whyEvidence')) {
      return String(msg).replace(/\s{2,}/g, ' ').trim()
    }
    if (count === 1 && ayah) {
      return `One phrase in Ayah ${ayah} needs a little reinforcement.`
    }
    if (count === 1 && word) {
      return 'One phrase needs a little reinforcement.'
    }
    return 'A few phrases still need attention.'
  }
  if (band === ACCURACY_BAND.STRONG) {
    return t?.('memorisation.aiRecitePlan.whyStrong')
      || 'Your recall is strong. A light review at a steady pace will keep it firm.'
  }
  return t?.('memorisation.aiRecitePlan.whyDefault')
    || 'This plan follows your AI test so practice stays personal and peaceful.'
}

function formatPlanRangeLabel(surahName, from, to, t) {
  const range = from === to
    ? (t?.('memorisation.labels.ayah', { ayah: from }) || `Ayah ${from}`)
    : (t?.('memorisation.labels.ayahs', { start: from, end: to }) || `Ayahs ${from} to ${to}`)
  return surahName ? `${surahName} · ${range}` : range
}
