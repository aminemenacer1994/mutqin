/**
 * Projects canonical progress onto QPC Madani words and navigation.
 * Does not store progress. Callers pass the existing session/analytics records.
 */
import { resolveQpcWordAudioIndex } from './qpcMadaniAudioDom.js'
import { shouldShowTwoMadaniPages, resolveMadaniSpread } from './madaniPagePair.js'
import { ayahKeyFromWord } from './qpcMadaniSelection.js'
import { qpcWordLocationKey } from './qpcMadaniTechniques.js'
import { resolveMadaniPage, verseKeyFromCoordinates } from './qpcMadaniVersePage.js'
import { isQpcMadaniMushafView, isReadingViewMode } from './readingViewModes.js'

function positiveInt(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 0
  return Math.trunc(number)
}

function ayahKeyFromParts(surah, ayah) {
  return verseKeyFromCoordinates(surah, ayah)
}

function recordAyahKey(record = {}, chapterId = 0) {
  const verseKey = String(record.verseKey || record.ayahKey || '').trim()
  if (/^\d+:\d+$/.test(verseKey)) return verseKey
  const surah = positiveInt(record.surahId ?? record.surah ?? record.surah_number) || positiveInt(chapterId)
  const ayah = positiveInt(record.ayahNumber ?? record.ayah ?? record.ayah_number)
  return ayahKeyFromParts(surah, ayah)
}

export function canonicalWeakWordId(record = {}) {
  const ayahKey = recordAyahKey(record)
  const wordIndex = Number(record.wordIndex ?? record.index ?? record.ayahWordIndex)
  if (!ayahKey || !Number.isFinite(wordIndex) || wordIndex < 0) return ''
  return `${ayahKey}:${Math.trunc(wordIndex)}`
}

/**
 * Canonical weak-word id `surah:ayah:wordIndex` (0-based) → QPC `surah:ayah:word` (1-based).
 * An explicit QPC `location` is kept when it already uses that form.
 */
export function mapCanonicalWeakWordToLocation(record = {}) {
  const location = String(record.location || '').trim()
  if (/^\d+:\d+:\d+$/.test(location)) {
    const [surah, ayah, word] = location.split(':')
    if (positiveInt(surah) && positiveInt(ayah) && positiveInt(word)) {
      return `${positiveInt(surah)}:${positiveInt(ayah)}:${positiveInt(word)}`
    }
  }
  const id = canonicalWeakWordId(record)
  if (!id) return ''
  const [surah, ayah, wordIndex] = id.split(':')
  return `${surah}:${ayah}:${Number(wordIndex) + 1}`
}

export function locationFromCanonicalWeakWordId(id) {
  const parts = String(id || '').trim().split(':')
  if (parts.length < 3) return ''
  const surah = positiveInt(parts[0])
  const ayah = positiveInt(parts[1])
  const wordIndex = Number(parts[2])
  if (!surah || !ayah || !Number.isFinite(wordIndex) || wordIndex < 0) return ''
  return `${surah}:${ayah}:${Math.trunc(wordIndex) + 1}`
}

function addAudioIndex(map, ayahKey, wordIndex) {
  if (!ayahKey || !Number.isFinite(wordIndex) || wordIndex < 0) return
  if (!map[ayahKey]) map[ayahKey] = {}
  map[ayahKey][Math.trunc(wordIndex)] = true
}

function collectAyahKey(target, value, chapterId = 0) {
  const raw = String(value ?? '').trim()
  if (/^\d+:\d+$/.test(raw)) {
    target[raw] = true
    return
  }
  const ayah = positiveInt(raw)
  const surah = positiveInt(chapterId)
  const key = ayahKeyFromParts(surah, ayah)
  if (key) target[key] = true
}

export function confidenceStateForAyah(ayahKey, { ayahProgress = null, mutqinAyahs = null } = {}) {
  const progress = ayahProgress?.[ayahKey] || null
  const ayah = mutqinAyahs?.[ayahKey] || null
  const mastery = Number(progress?.masteryScore)
  const level = Number(ayah?.mastery_level)
  const confidence = String(ayah?.confidence || progress?.confidence || '').toLowerCase()
  if (
    ayah?.status === 'weak'
    || confidence === 'needs_practice'
    || confidence === 'fragile'
    || confidence === 'low'
    || (Number.isFinite(mastery) && mastery < 0.65)
  ) {
    return 'low'
  }
  if (
    ayah?.status === 'mastered'
    || confidence === 'confident'
    || confidence === 'strong'
    || confidence === 'high'
    || level >= 5
    || (Number.isFinite(mastery) && mastery >= 0.9)
  ) {
    return 'high'
  }
  if (progress || ayah || confidence === 'building') return 'building'
  return ''
}

function reviewToken(value) {
  const token = String(value || '').slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(token) ? token : ''
}

export function isRetentionDueAyah(ayahKey, {
  ayahProgress = null,
  mutqinAyahs = null,
  queue = [],
  todayToken = '',
} = {}) {
  const progress = ayahProgress?.[ayahKey] || null
  const ayah = mutqinAyahs?.[ayahKey] || null
  const today = reviewToken(todayToken)
  const nextReview = reviewToken(progress?.nextReview || ayah?.next_review)
  if (today && nextReview && nextReview <= today) return true
  return (Array.isArray(queue) ? queue : []).some((item) => {
    if (item?.phase !== 'Retention') return false
    const key = item.ayahId || item.verse?.key || item.key
    return String(key || '') === String(ayahKey)
  })
}

function emptyProgressSnapshot() {
  return {
    weakLocations: {},
    weakAudioByAyah: {},
    weakAyahs: {},
    confidenceByAyah: {},
    retentionDueAyahs: {},
    reviewAyahs: {},
    activeWeakLocation: '',
  }
}

/**
 * @param {object} canonical Existing analytics. `readingViewMode` is ignored so layout switches do not copy progress.
 */
export function buildQpcMadaniProgressSnapshot(canonical = {}) {
  const snapshot = emptyProgressSnapshot()
  const chapterId = positiveInt(canonical.chapterId)
  const words = Array.isArray(canonical.weakWords) ? canonical.weakWords : []

  words.forEach((record) => {
    if (!record || typeof record !== 'object') return
    const reason = String(record.reason || '').toLowerCase()
    if (reason === 'anchor') return
    const ayahKey = recordAyahKey(record, chapterId)
    if (reason === 'weak_ayah') {
      if (ayahKey) snapshot.weakAyahs[ayahKey] = true
      return
    }
    const location = mapCanonicalWeakWordToLocation(record)
    if (location) snapshot.weakLocations[location] = true
    const wordIndex = Number(record.wordIndex ?? record.index ?? record.ayahWordIndex)
    if (ayahKey && Number.isFinite(wordIndex) && wordIndex >= 0) {
      addAudioIndex(snapshot.weakAudioByAyah, ayahKey, wordIndex)
    } else if (location) {
      const parts = location.split(':')
      addAudioIndex(snapshot.weakAudioByAyah, `${parts[0]}:${parts[1]}`, Number(parts[2]) - 1)
    }
  })

  const explicitWeak = canonical.weakAyahKeys || canonical.weakAyahs || []
  ;(Array.isArray(explicitWeak) ? explicitWeak : []).forEach((value) => {
    collectAyahKey(snapshot.weakAyahs, value, chapterId)
  })

  const ayahProgress = canonical.ayahProgress && typeof canonical.ayahProgress === 'object'
    ? canonical.ayahProgress
    : {}
  const mutqinAyahs = canonical.mutqinAyahs && typeof canonical.mutqinAyahs === 'object'
    ? canonical.mutqinAyahs
    : {}
  const providedConfidence = canonical.confidenceByAyah && typeof canonical.confidenceByAyah === 'object'
    ? canonical.confidenceByAyah
    : null

  const ayahKeys = new Set([
    ...Object.keys(ayahProgress),
    ...Object.keys(mutqinAyahs),
    ...Object.keys(snapshot.weakAyahs),
    ...Object.keys(providedConfidence || {}),
  ])
  ;(Array.isArray(canonical.queue) ? canonical.queue : []).forEach((item) => {
    const key = String(item?.ayahId || item?.verse?.key || item?.key || '')
    if (/^\d+:\d+$/.test(key)) ayahKeys.add(key)
  })

  ayahKeys.forEach((ayahKey) => {
    if (!/^\d+:\d+$/.test(ayahKey)) return
    const confidence = providedConfidence?.[ayahKey]
      || confidenceStateForAyah(ayahKey, { ayahProgress, mutqinAyahs })
    if (confidence) snapshot.confidenceByAyah[ayahKey] = confidence
    if (confidence === 'low') snapshot.weakAyahs[ayahKey] = true
    const retentionDue = isRetentionDueAyah(ayahKey, {
      ayahProgress,
      mutqinAyahs,
      queue: canonical.queue,
      todayToken: canonical.todayToken,
    })
    if (retentionDue) {
      snapshot.retentionDueAyahs[ayahKey] = true
      snapshot.reviewAyahs[ayahKey] = true
    }
    const ayah = mutqinAyahs[ayahKey]
    if (Number(ayah?.weak_count || 0) > 0 || ayah?.status === 'weak') {
      snapshot.weakAyahs[ayahKey] = true
      snapshot.reviewAyahs[ayahKey] = true
    }
  })

  snapshot.activeWeakLocation = locationFromCanonicalWeakWordId(canonical.activeWeakWordId)
  return Object.freeze(snapshot)
}

export function resolveQpcMadaniWordProgressState(word = {}, snapshot = null, audioIndexMap = null) {
  const view = snapshot || emptyProgressSnapshot()
  const ayahKey = ayahKeyFromWord(word)
  const location = qpcWordLocationKey(word)
  const audioIndex = resolveQpcWordAudioIndex(Number(word?.word), ayahKey, audioIndexMap)
  const audioHit = Number.isFinite(audioIndex)
    && !!view.weakAudioByAyah?.[ayahKey]?.[audioIndex]
  return {
    ayahKey,
    location,
    weakWord: !!(location && view.weakLocations?.[location]) || audioHit,
    weakWordActive: !!(location && location === view.activeWeakLocation),
    weakAyah: !!view.weakAyahs?.[ayahKey],
    confidence: view.confidenceByAyah?.[ayahKey] || '',
    retentionDue: !!view.retentionDueAyahs?.[ayahKey],
    reviewPriority: !!view.reviewAyahs?.[ayahKey],
  }
}

export function qpcMadaniWordProgressClass(state = {}) {
  return {
    'qpc-progress-weak-word': !!state.weakWord,
    'qpc-progress-weak-word--active': !!state.weakWord && !!state.weakWordActive,
    'qpc-progress-weak-ayah': !!state.weakAyah,
    'qpc-progress-confidence-low': state.confidence === 'low',
    'qpc-progress-confidence-building': state.confidence === 'building',
    'qpc-progress-confidence-high': state.confidence === 'high',
    'qpc-progress-retention-due': !!state.retentionDue,
    'qpc-progress-review': !!state.reviewPriority,
  }
}

export function qpcMadaniProgressAttribute(state = {}) {
  const flags = []
  if (state.weakWord) flags.push('weak-word')
  if (state.weakAyah) flags.push('weak-ayah')
  if (state.confidence) flags.push(`confidence-${state.confidence}`)
  if (state.retentionDue) flags.push('retention-due')
  if (state.reviewPriority) flags.push('review')
  return flags.join(' ') || null
}

export function pageContainsMappedWeakWord(words = [], snapshot = null, audioIndexMap = null) {
  return (Array.isArray(words) ? words : []).some((word) => (
    resolveQpcMadaniWordProgressState(word, snapshot, audioIndexMap).weakWord
  ))
}

export function resolveRecommendationMadaniNavigation({
  readingViewMode = '',
  surah = 0,
  ayah = 0,
  rangeStart = 0,
  rangeEnd = 0,
  session = null,
  index = {},
  viewportWidth = 1080,
} = {}) {
  if (!isQpcMadaniMushafView(readingViewMode)) {
    return { applies: false, directPageMutation: false, verseKey: '', page: null, spread: null, visiblePages: [] }
  }
  const chapter = positiveInt(surah || session?.chapterId || session?.surah || session?.surah_number)
  const start = positiveInt(ayah || rangeStart || session?.rangeStart || session?.ayah || session?.ayah_start)
  const end = positiveInt(rangeEnd || session?.rangeEnd || session?.ayah_end || start)
  const verseKey = ayahKeyFromParts(chapter, start)
  const page = verseKey ? resolveMadaniPage(chapter, start, index) : null
  const spread = page ? resolveMadaniSpread(page) : null
  const visiblePages = page
    ? (shouldShowTwoMadaniPages(viewportWidth) && spread ? spread.pages : [page])
    : []
  return {
    applies: !!verseKey,
    directPageMutation: false,
    verseKey,
    rangeEndAyah: ayahKeyFromParts(chapter, end),
    page,
    spread,
    visiblePages,
  }
}

export function resolveScheduledReviewNavigation(input = {}) {
  return {
    ...resolveRecommendationMadaniNavigation({
      ...input,
      ayah: input.ayah || input.from,
      rangeStart: input.from || input.rangeStart,
      rangeEnd: input.to || input.rangeEnd,
    }),
    review: true,
    sessionId: input.sessionId || input.session || null,
  }
}

export function resolveMemorisationTestNavigation(input = {}) {
  return resolveRecommendationMadaniNavigation({
    readingViewMode: input.readingViewMode,
    surah: input.surah || input.chapterId,
    ayah: input.ayah || input.rangeStart,
    rangeStart: input.ayah || input.rangeStart,
    rangeEnd: input.rangeEnd || input.ayah,
    index: input.index,
    viewportWidth: input.viewportWidth,
  })
}

/** Similar / mutashabihat practice moves canonical Quran position. It does not address a Madani page. */
export function resolveSimilarAyahCanonicalNavigation(target = {}) {
  const rawKey = String(target.verseKey || target.key || '').trim()
  const surah = positiveInt(
    target.surah
    || target.surahId
    || target.chapterId
    || rawKey.split(':')[0]
  )
  const ayah = positiveInt(
    target.ayah
    || target.ayahNumber
    || rawKey.split(':')[1]
  )
  return {
    verseKey: ayahKeyFromParts(surah, ayah),
    surah,
    ayah,
    directPageMutation: false,
  }
}

function dashboardWeakRecords(entry = {}) {
  if (Array.isArray(entry.weakWords)) return entry.weakWords
  if (Array.isArray(entry.weak_words)) return entry.weak_words
  const raw = String(entry.weak || '').trim()
  if (!raw) return []
  return raw.split(',').map((token) => {
    const parts = token.trim().split(':')
    if (parts.length < 3) return null
    const surah = positiveInt(parts[0])
    const ayah = positiveInt(parts[1])
    const wordIndex = Number(parts[2])
    if (!surah || !ayah || !Number.isFinite(wordIndex) || wordIndex < 0) return null
    return {
      surahId: surah,
      ayahNumber: ayah,
      wordIndex: Math.trunc(wordIndex),
      verseKey: `${surah}:${ayah}`,
    }
  }).filter(Boolean)
}

export function canonicalReadingViewFromDashboard(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return ''
  if (raw === 'madani' || raw === 'madani_mushaf' || raw === 'qpc') return 'madani_mushaf'
  return isReadingViewMode(raw) ? raw : ''
}

/** Keeps the dashboard entry's canonical fields. Does not clone them into a Madani progress store. */
export function preserveDashboardMadaniContext(entry = {}) {
  const surah = positiveInt(entry.surah || entry.surah_number)
  const from = positiveInt(entry.from || entry.ayah || entry.ayah_number)
  const to = positiveInt(entry.to || from)
  const readingViewMode = canonicalReadingViewFromDashboard(entry.view || entry.layout || entry.readingViewMode)
  return {
    targetAyah: ayahKeyFromParts(surah, from),
    rangeEndAyah: ayahKeyFromParts(surah, to),
    weakWords: dashboardWeakRecords(entry),
    sessionId: String(entry.sessionId || entry.session || '').trim() || null,
    review: entry.review === true || entry.review === 1 || entry.review === '1',
    recommendationId: String(entry.recommendationId || entry.recommendation || '').trim() || null,
    readingViewMode,
  }
}
