/**
 * Revision practice scope: weak-areas-only vs full-range-with-emphasis.
 *
 * Builds focused practice sequences from existing Quran word/ayah identifiers
 * without inventing unnatural fragments. Phrase text is display-only from
 * provided ayah tokens — never a second source of truth.
 */

import { resolvePracticeRange } from './aiRecitePracticePlan.js'
import { estimatePracticeDuration, normaliseWeakWordRecords } from '../session/sessionPracticeCoach.js'

export const PRACTICE_SCOPE = Object.freeze({
  WEAK_AREAS: 'weak_areas',
  FULL_RANGE: 'full_range',
})

const NEARBY_GAP = 2
const CONTEXT_PAD = 1
const AYAH_LEVEL_RATIO = 0.45
const AYAH_LEVEL_MIN_WORDS = 3

/** Minimum repeats on ayahs flagged as weak during revision. */
export const WEAK_AYAH_REPEAT_MIN = 3

/**
 * @param {unknown} value
 * @returns {'weak_areas'|'full_range'|null}
 */
export function normalisePracticeScope(value) {
  const raw = String(value || '').toLowerCase().trim()
  if (
    raw === PRACTICE_SCOPE.WEAK_AREAS
    || raw === 'weak'
    || raw === 'weak_words'
    || raw === 'weak_only'
    || raw === 'focus'
  ) {
    return PRACTICE_SCOPE.WEAK_AREAS
  }
  if (
    raw === PRACTICE_SCOPE.FULL_RANGE
    || raw === 'full'
    || raw === 'full_session'
    || raw === 'range'
  ) {
    return PRACTICE_SCOPE.FULL_RANGE
  }
  return null
}

/**
 * @param {object} settings
 * @returns {'weak_areas'|'full_range'|null}
 */
export function readPracticeScopeFromSettings(settings = {}) {
  if (!settings || typeof settings !== 'object') return null
  if (settings.practice_weak_words_only === true || settings.weak_words_only === true) {
    return PRACTICE_SCOPE.WEAK_AREAS
  }
  return normalisePracticeScope(settings.practice_scope || settings.scope)
}

/**
 * Recommend a default scope from weakness density.
 * Sparse / localised weakness → weak areas; widespread → full range.
 *
 * @param {{
 *   weakWords?: Array<object>,
 *   weakAyahs?: number[],
 *   sessionFrom?: number,
 *   sessionTo?: number,
 *   outcome?: string|null,
 * }} input
 */
export function recommendPracticeScope(input = {}) {
  const weakWords = normaliseWeakWordRecords(input.weakWords || [])
  const sessionFrom = Number(input.sessionFrom || 1)
  const sessionTo = Number(input.sessionTo || sessionFrom)
  const sessionSpan = Math.max(1, Math.abs(sessionTo - sessionFrom) + 1)
  const weakAyahs = [...new Set([
    ...(Array.isArray(input.weakAyahs) ? input.weakAyahs : []).map(Number),
    ...weakWords.map((w) => Number(w.ayahNumber)).filter((n) => Number.isFinite(n) && n > 0),
  ])].filter((n) => Number.isFinite(n))

  const outcome = String(input.outcome || '').toLowerCase()
  if (!weakWords.length && !weakAyahs.length) {
    return {
      scope: PRACTICE_SCOPE.FULL_RANGE,
      reasonKey: 'noWeakAreas',
      reason: 'No clear weak areas were identified, so the full range is recommended.',
    }
  }

  const ayahCoverage = weakAyahs.length / sessionSpan
  const wordCount = weakWords.length
  const denseLocal = wordCount > 0 && wordCount <= 4 && weakAyahs.length <= 2
  const sparseSpread = weakAyahs.length >= 3 || ayahCoverage >= 0.5

  if (outcome === 'strong' && denseLocal) {
    return {
      scope: PRACTICE_SCOPE.WEAK_AREAS,
      reasonKey: 'minorLocal',
      reason: 'Only a few words need attention — focused practice will be quicker and clearer.',
    }
  }
  if (denseLocal && !sparseSpread) {
    return {
      scope: PRACTICE_SCOPE.WEAK_AREAS,
      reasonKey: 'focusedCluster',
      reason: 'Your weak spots sit close together, so a short focused review is recommended.',
    }
  }
  if (sparseSpread || outcome === 'weak') {
    return {
      scope: PRACTICE_SCOPE.FULL_RANGE,
      reasonKey: 'spreadWeakness',
      reason: 'Weak areas appear across the session, so revisiting the full range with emphasis is recommended.',
    }
  }
  return {
    scope: PRACTICE_SCOPE.WEAK_AREAS,
    reasonKey: 'defaultFocus',
    reason: 'A focused pass on the weaker words and phrases is recommended first.',
  }
}

/**
 * @param {object} word
 * @returns {string}
 */
function verseKeyOf(word) {
  if (word?.verseKey) return String(word.verseKey)
  const surah = Number(word?.surahId)
  const ayah = Number(word?.ayahNumber)
  if (Number.isFinite(surah) && Number.isFinite(ayah) && surah > 0 && ayah > 0) {
    return `${surah}:${ayah}`
  }
  if (Number.isFinite(ayah) && ayah > 0) return `:${ayah}`
  return ''
}

/**
 * Group nearby weak words on the same ayah into one phrase span.
 * Uses provided ayah tokens for display text only.
 *
 * @param {{
 *   weakWords?: Array<object>,
 *   weakAyahs?: number[],
 *   ayahTokensByKey?: Record<string, string[]>,
 *   ayahWordCounts?: Record<string|number, number>,
 *   sessionFrom?: number,
 *   sessionTo?: number,
 *   surahId?: number|null,
 * }} input
 * @returns {{
 *   items: Array<object>,
 *   focusItemCount: number,
 *   wordIds: string[],
 *   ayahIds: number[],
 *   estimatedDuration: { seconds: number, minutes: number, label: string },
 * }}
 */
export function buildWeakOnlyPracticeSequence(input = {}) {
  const weakWords = normaliseWeakWordRecords(input.weakWords || [])
    .filter((w) => Number.isFinite(Number(w.wordIndex)) && Number(w.wordIndex) >= 0
      && Number.isFinite(Number(w.ayahNumber)) && Number(w.ayahNumber) > 0)
  const tokensByKey = input.ayahTokensByKey && typeof input.ayahTokensByKey === 'object'
    ? input.ayahTokensByKey
    : {}
  const wordCounts = input.ayahWordCounts && typeof input.ayahWordCounts === 'object'
    ? input.ayahWordCounts
    : {}
  const flaggedAyahs = new Set(
    (Array.isArray(input.weakAyahs) ? input.weakAyahs : [])
      .map(Number)
      .filter((n) => Number.isFinite(n) && n > 0),
  )
  const surahFallback = Number(input.surahId) || null

  /** @type {Map<string, object[]>} */
  const byVerse = new Map()
  for (const word of weakWords) {
    const key = verseKeyOf(word) || (surahFallback ? `${surahFallback}:${word.ayahNumber}` : `:${word.ayahNumber}`)
    if (!byVerse.has(key)) byVerse.set(key, [])
    byVerse.get(key).push(word)
  }

  const items = []
  const wordIds = []
  const ayahIds = new Set()

  const sortedKeys = [...byVerse.keys()].sort((a, b) => {
    const [, aAyah] = a.split(':').map(Number)
    const [, bAyah] = b.split(':').map(Number)
    return (aAyah || 0) - (bAyah || 0)
  })

  for (const key of sortedKeys) {
    const group = byVerse.get(key).slice().sort((a, b) => a.wordIndex - b.wordIndex)
    const [surahPart, ayahPart] = key.split(':')
    const surahId = Number(surahPart) || surahFallback
    const ayahNumber = Number(ayahPart) || Number(group[0]?.ayahNumber)
    ayahIds.add(ayahNumber)

    const tokens = Array.isArray(tokensByKey[key])
      ? tokensByKey[key]
      : (Array.isArray(tokensByKey[ayahNumber]) ? tokensByKey[ayahNumber] : [])
    const ayahLen = Number(wordCounts[key] ?? wordCounts[ayahNumber] ?? tokens.length) || 0

    // Cluster nearby indexes.
    const clusters = []
    let current = [group[0]]
    for (let i = 1; i < group.length; i += 1) {
      const prev = current[current.length - 1]
      if (group[i].wordIndex - prev.wordIndex <= NEARBY_GAP) {
        current.push(group[i])
      } else {
        clusters.push(current)
        current = [group[i]]
      }
    }
    if (current.length) clusters.push(current)

    const totalWeakOnAyah = group.length
    const preferWholeAyah = flaggedAyahs.has(ayahNumber)
      && (ayahLen > 0
        ? totalWeakOnAyah / ayahLen >= AYAH_LEVEL_RATIO
        : totalWeakOnAyah >= AYAH_LEVEL_MIN_WORDS)
      || (ayahLen > 0 && totalWeakOnAyah / ayahLen >= 0.6)

    if (preferWholeAyah) {
      const weakIndexes = group.map((w) => w.wordIndex)
      items.push({
        type: 'ayah',
        surahId: Number.isFinite(surahId) ? surahId : null,
        ayahNumber,
        verseKey: Number.isFinite(surahId) && surahId > 0 ? `${surahId}:${ayahNumber}` : key,
        startWordIndex: 0,
        endWordIndex: ayahLen > 0 ? ayahLen - 1 : Math.max(...weakIndexes),
        weakWordIndexes: weakIndexes,
        wordIds: group.map((w) => `${surahId || 0}:${ayahNumber}:${w.wordIndex}`),
        // Display only — never invent tokens when the source is missing.
        displayTokens: tokens.length ? tokens : null,
        displayText: tokens.length ? tokens.join(' ') : null,
      })
      wordIds.push(...group.map((w) => `${surahId || 0}:${ayahNumber}:${w.wordIndex}`))
      continue
    }

    for (const cluster of clusters) {
      const minIdx = cluster[0].wordIndex
      const maxIdx = cluster[cluster.length - 1].wordIndex
      const start = Math.max(0, minIdx - CONTEXT_PAD)
      const end = ayahLen > 0 ? Math.min(ayahLen - 1, maxIdx + CONTEXT_PAD) : maxIdx + CONTEXT_PAD
      const slice = tokens.length
        ? tokens.slice(start, end + 1)
        : null
      // Isolated-word practice is fine when context tokens are available or
      // the cluster is a single natural span; never fabricate filler words.
      const type = (end - start + 1) <= 1 && cluster.length === 1 ? 'word' : 'phrase'
      items.push({
        type,
        surahId: Number.isFinite(surahId) ? surahId : null,
        ayahNumber,
        verseKey: Number.isFinite(surahId) && surahId > 0 ? `${surahId}:${ayahNumber}` : key,
        startWordIndex: start,
        endWordIndex: end,
        weakWordIndexes: cluster.map((w) => w.wordIndex),
        wordIds: cluster.map((w) => `${surahId || 0}:${ayahNumber}:${w.wordIndex}`),
        displayTokens: slice,
        displayText: slice?.length ? slice.join(' ') : null,
      })
      wordIds.push(...cluster.map((w) => `${surahId || 0}:${ayahNumber}:${w.wordIndex}`))
    }
  }

  // Include flagged weak ayat that had no valid word indexes.
  for (const ayahNumber of flaggedAyahs) {
    if (ayahIds.has(ayahNumber)) continue
    const key = surahFallback ? `${surahFallback}:${ayahNumber}` : `:${ayahNumber}`
    const tokens = Array.isArray(tokensByKey[key])
      ? tokensByKey[key]
      : (Array.isArray(tokensByKey[ayahNumber]) ? tokensByKey[ayahNumber] : [])
    items.push({
      type: 'ayah',
      surahId: surahFallback,
      ayahNumber,
      verseKey: key.startsWith(':') && surahFallback ? `${surahFallback}:${ayahNumber}` : key,
      startWordIndex: 0,
      endWordIndex: tokens.length ? tokens.length - 1 : 0,
      weakWordIndexes: [],
      wordIds: [],
      displayTokens: tokens.length ? tokens : null,
      displayText: tokens.length ? tokens.join(' ') : null,
    })
    ayahIds.add(ayahNumber)
  }

  items.sort((a, b) => {
    if (a.ayahNumber !== b.ayahNumber) return a.ayahNumber - b.ayahNumber
    return a.startWordIndex - b.startWordIndex
  })

  const uniqueAyahs = [...ayahIds].sort((a, b) => a - b)
  const estimatedDuration = estimatePracticeDuration({
    ayahCount: Math.max(1, items.length),
    repetitions: 3,
    playbackSpeed: 0.9,
    technique: 'focus',
  })

  return {
    items,
    focusItemCount: items.length,
    wordIds: [...new Set(wordIds)],
    ayahIds: uniqueAyahs,
    estimatedDuration,
  }
}

/**
 * Resolve the ayah window for a revision session from the chosen scope.
 *
 * @param {{
 *   scope?: string,
 *   sessionFrom?: number,
 *   sessionTo?: number,
 *   weakWords?: Array<object>,
 *   weakAyahs?: number[],
 *   focusItems?: Array<object>,
 * }} input
 */
export function resolveRevisionSessionRange(input = {}) {
  const scope = normalisePracticeScope(input.scope) || PRACTICE_SCOPE.FULL_RANGE
  const sessionFrom = Number(input.sessionFrom || 1)
  const sessionTo = Number(input.sessionTo || sessionFrom)
  const lo = Math.min(sessionFrom, sessionTo)
  const hi = Math.max(sessionFrom, sessionTo)

  if (scope === PRACTICE_SCOPE.FULL_RANGE) {
    return {
      from: lo,
      to: hi,
      count: Math.max(1, hi - lo + 1),
      focus_ayahs: [...new Set(
        (Array.isArray(input.weakAyahs) ? input.weakAyahs : [])
          .map(Number)
          .filter((n) => Number.isFinite(n) && n >= lo && n <= hi),
      )].sort((a, b) => a - b),
      scope,
    }
  }

  const fromItems = (Array.isArray(input.focusItems) ? input.focusItems : [])
    .map((item) => Number(item?.ayahNumber))
    .filter((n) => Number.isFinite(n) && n > 0)
  const weakAyahs = [...new Set([
    ...fromItems,
    ...(Array.isArray(input.weakAyahs) ? input.weakAyahs : []).map(Number),
    ...normaliseWeakWordRecords(input.weakWords || []).map((w) => Number(w.ayahNumber)),
  ])].filter((n) => Number.isFinite(n) && n >= lo && n <= hi)

  const ranged = resolvePracticeRange({
    sessionFrom: lo,
    sessionTo: hi,
    weakAyahs,
    weakWords: input.weakWords || [],
    maxSpan: 3,
  })

  return {
    ...ranged,
    scope: PRACTICE_SCOPE.WEAK_AREAS,
  }
}

/**
 * Merge scope + weak references into recommendation settings.
 *
 * @param {object} settings
 * @param {'weak_areas'|'full_range'} scope
 * @param {{
 *   weakWords?: Array<object>,
 *   focusItems?: Array<object>,
 *   ayahIds?: number[],
 *   attemptId?: string|number|null,
 *   attemptReference?: object|null,
 *   bumpRepsForEmphasis?: boolean,
 * }} extras
 */
export function applyScopeToRecommendationSettings(settings = {}, scope, extras = {}) {
  const next = { ...(settings && typeof settings === 'object' ? settings : {}) }
  const normalised = normalisePracticeScope(scope) || PRACTICE_SCOPE.FULL_RANGE
  next.practice_scope = normalised
  next.practice_weak_words_only = normalised === PRACTICE_SCOPE.WEAK_AREAS
  next.weak_words_only = normalised === PRACTICE_SCOPE.WEAK_AREAS

  const weakWords = normaliseWeakWordRecords(
    extras.weakWords
    || next.practice_weak_words
    || next.weak_words
    || [],
  )
  if (weakWords.length) {
    next.practice_weak_words = weakWords
  }

  if (Array.isArray(extras.focusItems) && extras.focusItems.length) {
    // Persist identifiers only — display text is optional and never authoritative.
    next.practice_focus_items = extras.focusItems.slice(0, 16).map((item) => ({
      type: item.type || 'phrase',
      surahId: item.surahId ?? null,
      ayahNumber: item.ayahNumber ?? null,
      verseKey: item.verseKey || null,
      startWordIndex: Number.isFinite(Number(item.startWordIndex)) ? Number(item.startWordIndex) : 0,
      endWordIndex: Number.isFinite(Number(item.endWordIndex)) ? Number(item.endWordIndex) : 0,
      weakWordIndexes: Array.isArray(item.weakWordIndexes) ? item.weakWordIndexes.map(Number) : [],
      wordIds: Array.isArray(item.wordIds) ? item.wordIds.slice(0, 24) : [],
    }))
  }

  if (Array.isArray(extras.ayahIds) && extras.ayahIds.length) {
    next.focus_ayahs = extras.ayahIds.map(Number).filter((n) => Number.isFinite(n) && n > 0)
  }

  if (extras.attemptId != null && extras.attemptId !== '') {
    next.source_attempt_id = extras.attemptId
  }
  if (extras.attemptReference && typeof extras.attemptReference === 'object') {
    next.source_attempt = {
      id: extras.attemptReference.id ?? extras.attemptId ?? null,
      accuracy: extras.attemptReference.accuracy ?? extras.attemptReference.accuracyPercent ?? null,
      outcome: extras.attemptReference.outcome || extras.attemptReference.band || null,
      assessed_at: extras.attemptReference.assessed_at || extras.attemptReference.at || null,
    }
  }

  const weakAyahIds = [
    ...(Array.isArray(extras.ayahIds) ? extras.ayahIds : []),
    ...weakWords.map((w) => Number(w.ayahNumber)).filter((n) => Number.isFinite(n) && n > 0),
  ]
  const repeatPlan = buildWeakAyahRepeatPlan({
    weakAyahs: weakAyahIds,
    weakWords,
    baseRepetitions: next.repetitions,
    isRevision: true,
    scope: normalised,
    chapterId: extras.chapterId,
  })

  if (Object.keys(repeatPlan.perAyahRepeats).length) {
    next.repetitions = repeatPlan.globalRepetitions
    next.repetitions_per_ayah = repeatPlan.perAyahRepeats
    next.emphasize_weak_areas = true
  } else if (normalised === PRACTICE_SCOPE.FULL_RANGE && extras.bumpRepsForEmphasis !== false) {
    const technique = String(next.technique || '').toLowerCase()
    if (['talqin', 'focus', 'chaining', 'anchor', 'chunking'].includes(technique) || !technique) {
      const reps = Number(next.repetitions)
      if (Number.isFinite(reps)) {
        next.repetitions = Math.min(8, Math.max(reps, reps + 1))
      } else {
        next.repetitions = 4
      }
      next.emphasize_weak_areas = true
    }
  } else {
    next.emphasize_weak_areas = normalised === PRACTICE_SCOPE.FULL_RANGE
  }

  return next
}

/**
 * Build per-ayah repeat counts that double down on weak verses during revision.
 *
 * @param {{
 *   weakAyahs?: number[],
 *   weakWords?: Array<object>,
 *   baseRepetitions?: number,
 *   isRevision?: boolean,
 *   scope?: string,
 *   chapterId?: number|null,
 * }} input
 * @returns {{
 *   globalRepetitions: number,
 *   perAyahRepeats: Record<number, number>,
 *   verseKeyRepeats: Record<string, number>,
 *   weakAyahs: number[],
 *   emphasisKey: string|null,
 *   emphasisParams: Record<string, unknown>|null,
 * }}
 */
export function buildWeakAyahRepeatPlan(input = {}) {
  const weakAyahs = [...new Set([
    ...(Array.isArray(input.weakAyahs) ? input.weakAyahs : []).map(Number),
    ...normaliseWeakWordRecords(input.weakWords || [])
      .map((w) => Number(w.ayahNumber))
      .filter((n) => Number.isFinite(n) && n > 0),
  ].filter((n) => Number.isFinite(n) && n > 0))].sort((a, b) => a - b)

  const baseReps = Math.max(1, Number(input.baseRepetitions) || 3)
  const isRevision = !!input.isRevision
  const scope = normalisePracticeScope(input.scope)
  const chapterId = Number(input.chapterId) || 0

  if (!weakAyahs.length || !isRevision) {
    return {
      globalRepetitions: baseReps,
      perAyahRepeats: {},
      verseKeyRepeats: {},
      weakAyahs: [],
      emphasisKey: null,
      emphasisParams: null,
    }
  }

  const globalRepetitions = Math.min(8, Math.max(baseReps, WEAK_AYAH_REPEAT_MIN))
  const perAyahRepeats = {}
  const verseKeyRepeats = {}

  weakAyahs.forEach((ayah) => {
    const weakRep = scope === PRACTICE_SCOPE.WEAK_AREAS
      ? Math.min(8, Math.max(WEAK_AYAH_REPEAT_MIN, globalRepetitions))
      : Math.min(8, Math.max(WEAK_AYAH_REPEAT_MIN, globalRepetitions + 1))
    perAyahRepeats[ayah] = weakRep
    if (chapterId > 0) {
      verseKeyRepeats[`${chapterId}:${ayah}`] = weakRep
    }
  })

  let emphasisKey = 'planDetail.weakAyahRepeatMany'
  /** @type {Record<string, unknown>} */
  let emphasisParams = {
    count: perAyahRepeats[weakAyahs[0]] || WEAK_AYAH_REPEAT_MIN,
    ayahCount: weakAyahs.length,
  }
  if (weakAyahs.length === 1) {
    emphasisKey = 'planDetail.weakAyahRepeatOne'
    emphasisParams = {
      ayah: weakAyahs[0],
      count: perAyahRepeats[weakAyahs[0]] || WEAK_AYAH_REPEAT_MIN,
    }
  }

  return {
    globalRepetitions,
    perAyahRepeats,
    verseKeyRepeats,
    weakAyahs,
    emphasisKey,
    emphasisParams,
  }
}

/**
 * Apply per-ayah repeat overrides onto live session state.
 *
 * @param {Record<string, number>} verseKeyRepeats
 * @param {Record<string, number>} [existing]
 * @returns {Record<string, number>}
 */
export function mergeVerseKeyRepeatOverrides(verseKeyRepeats = {}, existing = {}) {
  const next = { ...(existing && typeof existing === 'object' ? existing : {}) }
  Object.entries(verseKeyRepeats || {}).forEach(([key, count]) => {
    const reps = Number(count)
    if (!key || !Number.isFinite(reps) || reps <= 0) return
    next[key] = Math.max(1, Math.min(50, Math.round(reps)))
  })
  return next
}

/**
 * Focused-word / weak-only practice must never imply ayah mastery.
 *
 * @param {{
 *   practiceScope?: string|null,
 *   settings?: object,
 *   focusPhraseRevisionActive?: boolean,
 * }} input
 * @returns {boolean}
 */
export function canMarkAyahMasteredFromPractice(input = {}) {
  const scope = normalisePracticeScope(input.practiceScope)
    || readPracticeScopeFromSettings(input.settings || {})
  if (scope === PRACTICE_SCOPE.WEAK_AREAS) return false
  if (input.focusPhraseRevisionActive) return false
  if (input.settings?.practice_weak_words_only === true) return false
  return true
}

/**
 * Compare a new attempt against an earlier baseline.
 *
 * @param {{
 *   previous?: { wordStatuses?: Array, accuracy?: number, weakWordIds?: string[] }|null,
 *   current?: { wordStatuses?: Array, accuracy?: number, weakWordIds?: string[] }|null,
 *   trackedWordIds?: string[],
 * }} input
 */
export function compareRevisionAttempts(input = {}) {
  const previous = input.previous || null
  const current = input.current || null
  if (!previous && !current) {
    return {
      available: false,
      improved: [],
      continuedWeak: [],
      newWeak: [],
      summaryKey: 'missing',
      summary: 'No comparable attempts are available yet.',
      accuracyDelta: null,
    }
  }

  const prevMap = indexWordStatuses(previous?.wordStatuses)
  const currMap = indexWordStatuses(current?.wordStatuses)
  const tracked = new Set(
    (Array.isArray(input.trackedWordIds) ? input.trackedWordIds : [])
      .concat(Array.isArray(previous?.weakWordIds) ? previous.weakWordIds : [])
      .map(String)
      .filter(Boolean),
  )

  const keys = tracked.size
    ? [...tracked]
    : [...new Set([...prevMap.keys(), ...currMap.keys()])]

  const improved = []
  const continuedWeak = []
  const newWeak = []

  for (const key of keys) {
    const before = prevMap.get(key)
    const after = currMap.get(key)
    const beforeWeak = before ? !isCorrectStatus(before.status) : tracked.has(key)
    const afterWeak = after ? !isCorrectStatus(after.status) : false

    if (beforeWeak && after && !afterWeak) {
      improved.push({ wordId: key, text: after.text || before?.text || '' })
    } else if (beforeWeak && afterWeak) {
      continuedWeak.push({ wordId: key, text: after?.text || before?.text || '' })
    } else if (!beforeWeak && afterWeak) {
      newWeak.push({ wordId: key, text: after?.text || '' })
    } else if (beforeWeak && !after) {
      continuedWeak.push({ wordId: key, text: before?.text || '' })
    }
  }

  const prevAcc = toAccuracy(previous?.accuracy ?? previous?.accuracyPercent)
  const currAcc = toAccuracy(current?.accuracy ?? current?.accuracyPercent)
  const accuracyDelta = prevAcc != null && currAcc != null
    ? Math.round(currAcc - prevAcc)
    : null

  let summaryKey = 'mixed'
  let summary = 'Some focus words improved; keep reviewing the rest.'
  if (improved.length && !continuedWeak.length && !newWeak.length) {
    summaryKey = 'improved'
    summary = 'Your focus areas improved compared with the earlier attempt.'
  } else if (!improved.length && continuedWeak.length) {
    summaryKey = 'continued'
    summary = 'The same weak areas still need attention.'
  } else if (improved.length && continuedWeak.length) {
    summaryKey = 'partial'
    summary = `${improved.length} focus area${improved.length === 1 ? '' : 's'} improved; ${continuedWeak.length} still need practice.`
  }

  return {
    available: true,
    improved,
    continuedWeak,
    newWeak,
    summaryKey,
    summary,
    accuracyDelta,
    previousAccuracy: prevAcc,
    currentAccuracy: currAcc,
  }
}

/**
 * @param {Array|undefined} wordStatuses
 * @returns {Map<string, { status: string, text: string, wordIndex: number }>}
 */
function indexWordStatuses(wordStatuses) {
  const map = new Map()
  if (!Array.isArray(wordStatuses)) return map
  wordStatuses.forEach((word, index) => {
    if (!word || typeof word !== 'object') return
    const wordIndex = Number(word.ayahWordIndex ?? word.wordIndex ?? word.index ?? index)
    if (!Number.isFinite(wordIndex) || wordIndex < 0) return
    const ayahKey = String(word.verseKey || word.ayahKey || '')
    const [surahPart, ayahPart] = ayahKey.split(':')
    const surahId = Number(word.surahId || surahPart) || 0
    const ayahNumber = Number(word.ayahNumber || ayahPart) || 0
    const key = `${surahId}:${ayahNumber}:${wordIndex}`
    map.set(key, {
      status: String(word.status || ''),
      text: String(word.text || word.word || ''),
      wordIndex,
    })
  })
  return map
}

function isCorrectStatus(status) {
  const s = String(status || '').toLowerCase()
  if (!s) return false
  if (s.includes('incorrect') || s.includes('incomplete') || s.includes('partial') || s.includes('omitted') || s.includes('miss')) {
    return false
  }
  return s === 'correct' || s.includes('word-correct') || s === 'green'
}

function toAccuracy(value) {
  const n = Number(value)
  if (!Number.isFinite(n)) return null
  if (n > 0 && n <= 1) return Math.round(n * 100)
  return Math.round(n)
}

/**
 * Card copy for the selection UI.
 *
 * @param {(key: string, params?: object) => string} [t]
 */
export function buildRevisionScopeOptions(t = null) {
  const translate = typeof t === 'function' ? t : null
  return [
    {
      id: PRACTICE_SCOPE.WEAK_AREAS,
      label: translate?.('memorisation.postSession.recommendation.scopeWeakAreasLabel')
        || 'Focus on weak areas',
      description: translate?.('memorisation.postSession.recommendation.scopeWeakAreasDescription')
        || 'Review only the words and phrases that need more attention.',
      benefit: translate?.('memorisation.postSession.recommendation.scopeWeakAreasBenefit')
        || 'Shorter practice that targets the exact spots that slipped.',
    },
    {
      id: PRACTICE_SCOPE.FULL_RANGE,
      label: translate?.('memorisation.postSession.recommendation.scopeFullRangeLabel')
        || 'Practise the full range',
      description: translate?.('memorisation.postSession.recommendation.scopeFullRangeDescription')
        || 'Repeat the complete session while Mutqin highlights your weaker areas.',
      benefit: translate?.('memorisation.postSession.recommendation.scopeFullRangeBenefit')
        || 'Keeps the full flow while giving extra attention to weaker words and ayat.',
    },
  ]
}
