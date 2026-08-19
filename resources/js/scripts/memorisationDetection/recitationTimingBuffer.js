/**
 * Live-display timing tolerance for AI recitation.
 *
 * STRICT SEPARATION FROM CORRECTNESS:
 * - Only affects live UI paint while recording is active.
 * - Never modifies word matching, ayah matching, omission detection, sequence
 *   alignment, or final AI assessment — those stay in recitation_analysis.js.
 * - Never promotes a word to correct/partial; may only hold premature issue
 *   statuses as pending until a grace window expires.
 * - Final assessment must call assessRecitationRecognitionWords / buildQuranAlignment
 *   directly — never read timing-buffered live statuses.
 */

/** Calm tajweed pace baseline (~115 wpm). */
export const RECITATION_BASE_WORD_MS = 560
export const RECITATION_MIN_WORD_MS = 420
export const RECITATION_MAX_WORD_MS = 2200
/** Breathing and normal word-to-word transitions. */
export const RECITATION_INTER_WORD_PAUSE_MS = 360
/** Madd / tajweed elongation allowance. */
export const RECITATION_TAJWEED_HOLD_MS = 820
/** Natural pause between ayahs. */
export const RECITATION_AYAH_BOUNDARY_MS = 1600
/** Floor for silence auto-stop — not a global timeout bump. */
export const RECITATION_MIN_SILENCE_STOP_MS = 3200
/** Cap so a genuine long stop still ends the check. */
export const RECITATION_MAX_SILENCE_STOP_MS = 9000
export const RECITATION_TIMING_BUFFER_MAX_MS = 6800

/** Recent-session window — not a permanent learner profile. */
export const RECENT_PACE_SAMPLE_MAX = 8
export const MIN_RECENT_PACE_SAMPLES = 2

/** Matches liveCursor LIVE_PACE_MAX_WORDS_PER_SECOND — adaptive pacing pivots on this. */
export const ADAPTIVE_PACE_BASE_WORDS_PER_SECOND = 1.7
export const ADAPTIVE_PACE_MIN_WORDS_PER_SECOND = 0.55
export const ADAPTIVE_PACE_MAX_WORDS_PER_SECOND = 4.2
export const ADAPTIVE_PACE_MIN_DRIP_MS = 220
export const ADAPTIVE_PACE_MAX_DRIP_MS = 920

const DEFERRABLE_STATUSES = new Set(['omitted', 'skipped'])
/** Live paint only — incorrect-word detection must never be softened here. */
const PROTECTED_STATUSES = new Set(['correct', 'partial', 'uncertain'])
const MADD_OR_HOLD_MARKERS = /[\u0640\u0670\u0653-\u0655\u06E0-\u06ED]|[\u064E\u064F\u0650\u0652]\u0653|آ/

function finiteOrNull(value) {
  const num = Number(value)
  return Number.isFinite(num) ? num : null
}

export function wordLikelyNeedsTajweedHold(display = '') {
  const text = String(display || '')
  if (!text) return false
  return MADD_OR_HOLD_MARKERS.test(text)
}

export function isAyahBoundaryWord(wordIndex = 0, targetUnits = [], ayahBounds = []) {
  const unit = targetUnits[wordIndex]
  if (!unit) return false
  const bounds = Array.isArray(ayahBounds) ? ayahBounds : []
  const bound = bounds.find((entry) => wordIndex >= entry.start && wordIndex < entry.end)
  if (bound && wordIndex === bound.end - 1) return true
  const next = targetUnits[wordIndex + 1]
  if (!next) return true
  if (unit.ayahNumber != null && next.ayahNumber != null) {
    return Number(unit.ayahNumber) !== Number(next.ayahNumber)
  }
  if (unit.ayahKey && next.ayahKey) return unit.ayahKey !== next.ayahKey
  return false
}

/**
 * Observed learner pace relative to the baseline (slower > 1, faster < 1).
 */
export function estimateRecitationPaceFactor({
  recognitionWords = [],
  elapsedMs = null,
  spokenWordCount = 0,
} = {}) {
  const words = Array.isArray(recognitionWords) ? recognitionWords : []
  const timed = words.filter((word) => {
    const start = finiteOrNull(word?.start ?? word?.startTime)
    const end = finiteOrNull(word?.end ?? word?.endTime)
    return start != null && end != null && end > start
  })

  if (timed.length >= 2) {
    const firstStart = finiteOrNull(timed[0].start ?? timed[0].startTime) ?? 0
    const lastEnd = finiteOrNull(timed[timed.length - 1].end ?? timed[timed.length - 1].endTime) ?? 0
    const spanSec = lastEnd - firstStart
    const intervals = Math.max(1, timed.length - 1)
    if (spanSec > 0) {
      const avgWordSec = spanSec / intervals
      const baselineSec = RECITATION_BASE_WORD_MS / 1000
      return clampPaceFactor(avgWordSec / baselineSec)
    }
  }

  const spoken = Math.max(0, Number(spokenWordCount) || words.length)
  const ms = finiteOrNull(elapsedMs)
  if (ms != null && ms > 0 && spoken >= 2) {
    return clampPaceFactor(ms / Math.max(1, spoken - 1) / RECITATION_BASE_WORD_MS)
  }

  return 1
}

function clampPaceFactor(value) {
  const pace = Number(value)
  if (!Number.isFinite(pace) || pace <= 0) return 1
  return Math.max(0.55, Math.min(3.6, pace))
}

export function createRecitationPaceObserver() {
  return { samples: [] }
}

export function resetRecitationPaceObserver(observer = null) {
  if (observer && Array.isArray(observer.samples)) {
    observer.samples = []
    return observer
  }
  return createRecitationPaceObserver()
}

function readWordDurationMs(word = {}) {
  const start = finiteOrNull(word?.start ?? word?.startTime)
  const end = finiteOrNull(word?.end ?? word?.endTime)
  if (start != null && end != null && end > start) return (end - start) * 1000
  return null
}

function readWordStepMs(previous = {}, current = {}) {
  const prevEnd = finiteOrNull(previous?.end ?? previous?.endTime)
  const nextStart = finiteOrNull(current?.start ?? current?.startTime)
  const nextDuration = readWordDurationMs(current)
  if (prevEnd != null && nextStart != null && nextStart >= prevEnd && nextDuration != null) {
    return (nextStart - prevEnd) * 1000 + nextDuration
  }
  if (nextDuration != null) return nextDuration
  return null
}

function medianFinite(values = []) {
  const sorted = values.filter((value) => Number.isFinite(value)).sort((left, right) => left - right)
  if (!sorted.length) return null
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2
}

/**
 * Append the latest heard-word step to the rolling session observer.
 */
export function observeRecitationPaceFromRecognition(observer = null, {
  recognitionWords = [],
  targetUnits = [],
} = {}) {
  const obs = observer || createRecitationPaceObserver()
  const words = Array.isArray(recognitionWords) ? recognitionWords : []
  if (words.length < 2) return obs

  const previous = words[words.length - 2]
  const current = words[words.length - 1]
  const stepMs = readWordStepMs(previous, current)
  if (stepMs == null || stepMs <= 0) return obs

  const wordIndex = words.length - 1
  const unit = (Array.isArray(targetUnits) ? targetUnits : [])[wordIndex] || {}
  const display = unit.display || unit.text || current.word || current.text || ''

  obs.samples.push({
    stepMs,
    tajweedHold: wordLikelyNeedsTajweedHold(display),
    at: Date.now(),
  })
  if (obs.samples.length > RECENT_PACE_SAMPLE_MAX) {
    obs.samples = obs.samples.slice(-RECENT_PACE_SAMPLE_MAX)
  }
  return obs
}

/**
 * Prefer recent in-session intervals; fall back to whole-session estimate.
 */
export function estimateSessionRecitationPaceFactor({
  observer = null,
  recognitionWords = [],
  elapsedMs = null,
  spokenWordCount = 0,
} = {}) {
  const recent = observer?.samples || []
  if (recent.length >= MIN_RECENT_PACE_SAMPLES) {
    const medianStep = medianFinite(recent.map((sample) => sample.stepMs))
    if (medianStep != null && medianStep > 0) {
      return clampPaceFactor(medianStep / RECITATION_BASE_WORD_MS)
    }
  }
  return estimateRecitationPaceFactor({
    recognitionWords,
    elapsedMs,
    spokenWordCount,
  })
}

export function isTajweedHeavyRecitation(observer = null, paceFactor = 1) {
  const recent = observer?.samples || []
  if (recent.length < MIN_RECENT_PACE_SAMPLES) return false
  const holdRatio = recent.filter((sample) => sample.tajweedHold).length / recent.length
  return holdRatio >= 0.35 && clampPaceFactor(paceFactor) >= 1.1
}

/**
 * Live paint + drip knobs derived from the current session pace.
 * Fast reciters get a higher ceiling; slow / tajweed-heavy sessions get patience.
 */
export function resolveAdaptiveLivePaceParams({
  paceFactor = 1,
  tajweedHeavy = false,
} = {}) {
  const pace = clampPaceFactor(paceFactor)

  let maxWordsPerSecond = ADAPTIVE_PACE_BASE_WORDS_PER_SECOND / pace
  if (tajweedHeavy) maxWordsPerSecond *= 0.94
  maxWordsPerSecond = Math.max(
    ADAPTIVE_PACE_MIN_WORDS_PER_SECOND,
    Math.min(ADAPTIVE_PACE_MAX_WORDS_PER_SECOND, maxWordsPerSecond),
  )

  let maxAdvancePerUpdate = 1
  if (pace <= 0.65) maxAdvancePerUpdate = 4
  else if (pace <= 0.75) maxAdvancePerUpdate = 3
  else if (pace <= 0.9) maxAdvancePerUpdate = 2

  const slack = pace >= 1.45 ? 2 : 1

  let dripMs = Math.round(420 * Math.max(0.68, Math.min(1.7, pace)))
  if (tajweedHeavy) dripMs = Math.round(dripMs * 1.1)

  return {
    paceFactor: pace,
    tajweedHeavy: !!tajweedHeavy,
    maxWordsPerSecond,
    maxAdvancePerUpdate,
    slack,
    dripMs: Math.max(ADAPTIVE_PACE_MIN_DRIP_MS, Math.min(ADAPTIVE_PACE_MAX_DRIP_MS, dripMs)),
  }
}

export function buildRecitationAdaptivePaceContext({
  observer = null,
  recognitionWords = [],
  elapsedMs = null,
  spokenWordCount = 0,
  targetUnits = [],
} = {}) {
  const observed = observeRecitationPaceFromRecognition(observer, {
    recognitionWords,
    targetUnits,
  })
  const paceFactor = estimateSessionRecitationPaceFactor({
    observer: observed,
    recognitionWords,
    elapsedMs,
    spokenWordCount,
  })
  const tajweedHeavy = isTajweedHeavyRecitation(observed, paceFactor)
  return {
    observer: observed,
    paceFactor,
    tajweedHeavy,
    livePace: resolveAdaptiveLivePaceParams({ paceFactor, tajweedHeavy }),
  }
}

/**
 * Contextual grace before treating a word as skipped / stopped / failed.
 */
export function computeWordTimingGraceMs({
  wordIndex = 0,
  targetUnits = [],
  paceFactor = 1,
  ayahBounds = [],
  tajweedHeavy = false,
} = {}) {
  const units = Array.isArray(targetUnits) ? targetUnits : []
  const unit = units[wordIndex] || {}
  const display = unit.display || unit.text || ''
  const pace = clampPaceFactor(paceFactor)

  let grace = RECITATION_BASE_WORD_MS * pace + RECITATION_INTER_WORD_PAUSE_MS

  if (wordLikelyNeedsTajweedHold(display)) {
    grace += RECITATION_TAJWEED_HOLD_MS * pace
  }
  if (tajweedHeavy) {
    grace += Math.round(RECITATION_TAJWEED_HOLD_MS * 0.35)
  }
  if (isAyahBoundaryWord(wordIndex, units, ayahBounds)) {
    grace += RECITATION_AYAH_BOUNDARY_MS
  }

  return Math.max(
    RECITATION_MIN_WORD_MS,
    Math.min(RECITATION_TIMING_BUFFER_MAX_MS, Math.round(grace)),
  )
}

/**
 * Dynamic VAD silence threshold from the word the learner is expected to say next.
 */
export function computeSilenceAutoStopThresholdMs({
  wordIndex = 0,
  targetUnits = [],
  paceFactor = 1,
  ayahBounds = [],
  isSessionRecitation = false,
} = {}) {
  const wordGrace = computeWordTimingGraceMs({
    wordIndex,
    targetUnits,
    paceFactor,
    ayahBounds,
  })
  const dynamic = Math.round(wordGrace * 0.85 + RECITATION_INTER_WORD_PAUSE_MS)
  const sessionBump = isSessionRecitation ? 600 : 0
  return Math.max(
    RECITATION_MIN_SILENCE_STOP_MS,
    Math.min(RECITATION_MAX_SILENCE_STOP_MS, dynamic + sessionBump),
  )
}

export function resolveLastSpeechActivityMs({
  recognitionWords = [],
  lastSpeechAtMs = null,
  recordingStartedAtMs = null,
  nowMs = Date.now(),
} = {}) {
  const wallSpeech = finiteOrNull(lastSpeechAtMs)
  if (wallSpeech != null && wallSpeech > 0) return wallSpeech

  const words = Array.isArray(recognitionWords) ? recognitionWords : []
  let latestEndSec = null
  for (const word of words) {
    const end = finiteOrNull(word?.end ?? word?.endTime)
    if (end != null) latestEndSec = latestEndSec == null ? end : Math.max(latestEndSec, end)
  }

  const startedAt = finiteOrNull(recordingStartedAtMs)
  if (latestEndSec != null && startedAt != null) {
    return startedAt + latestEndSec * 1000
  }
  if (startedAt != null) return startedAt
  return finiteOrNull(nowMs) ?? Date.now()
}

function resolveExpectedWordIndex(statuses = [], confirmedWordIndex = 0) {
  const list = Array.isArray(statuses) ? statuses : []
  const confirmed = Math.max(0, Number(confirmedWordIndex) || 0)
  for (let index = confirmed; index < list.length; index += 1) {
    const status = String(list[index]?.status || '').toLowerCase()
    if (status === 'pending' || status === 'notattempted' || !status) return index
    if (status === 'incorrect' || status === 'omitted' || status === 'skipped') return index
  }
  return Math.max(0, list.length - 1)
}

function shouldDeferIncorrectDuringGrace(word = {}) {
  const similarity = Number(word?.similarity ?? 0)
  const confidence = Number(word?.confidence ?? 0)
  // Strong mismatches should still surface; weak/noisy hits during a pause should wait.
  if (similarity >= 0.48 && confidence >= 0.45) return false
  return true
}

/** @deprecated Incorrect deferral removed — kept for tests documenting the guard. */
export function shouldDeferLiveIncorrectStatus(word = {}) {
  return shouldDeferIncorrectDuringGrace(word)
}

export function isLiveRecitationTimingBufferActive(options = {}) {
  return options.finalizing !== true && options.disabled !== true
}

/**
 * Soften premature live skip/stop signals while the learner is still within grace.
 * Correctness-sensitive statuses (correct, partial, incorrect) pass through untouched.
 */
export function applyRecitationTimingBuffer(statuses = [], options = {}) {
  if (!isLiveRecitationTimingBufferActive(options)) {
    return statuses
  }

  const list = Array.isArray(statuses) ? statuses : []
  if (!list.length) return list

  const nowMs = finiteOrNull(options.nowMs) ?? Date.now()
  const elapsedMs = finiteOrNull(options.elapsedMs)
  const recognitionWords = Array.isArray(options.recognitionWords) ? options.recognitionWords : []
  const targetUnits = Array.isArray(options.targetUnits) && options.targetUnits.length
    ? options.targetUnits
    : list
  const ayahBounds = Array.isArray(options.ayahBounds) ? options.ayahBounds : []
  const confirmedWordIndex = Number.isFinite(options.confirmedWordIndex)
    ? Math.max(0, Number(options.confirmedWordIndex))
    : 0

  const paceFactor = Number.isFinite(Number(options.paceFactor))
    ? clampPaceFactor(Number(options.paceFactor))
    : estimateSessionRecitationPaceFactor({
      observer: options.observer || null,
      recognitionWords,
      elapsedMs,
      spokenWordCount: recognitionWords.length,
    })
  const tajweedHeavy = options.tajweedHeavy === true
    || isTajweedHeavyRecitation(options.observer || null, paceFactor)

  const expectedIndex = resolveExpectedWordIndex(list, confirmedWordIndex)
  const graceMs = computeWordTimingGraceMs({
    wordIndex: expectedIndex,
    targetUnits,
    paceFactor,
    ayahBounds,
    tajweedHeavy,
  })

  const lastSpeechMs = resolveLastSpeechActivityMs({
    recognitionWords,
    lastSpeechAtMs: options.lastSpeechAtMs,
    recordingStartedAtMs: options.recordingStartedAtMs,
    nowMs,
  })

  const withinGrace = isWithinTimingGrace({
    nowMs,
    lastSpeechMs,
    elapsedMs,
    graceMs,
  })

  if (!withinGrace) return list

  let changed = false
  const next = list.map((word, index) => {
    const status = String(word?.status || '').toLowerCase()
    if (PROTECTED_STATUSES.has(status) || status === 'incorrect') return word
    if (!DEFERRABLE_STATUSES.has(status)) return word

    if (index < confirmedWordIndex) return word

    changed = true
    return {
      ...word,
      status: 'pending',
      note: '',
      actual: undefined,
      timingBuffered: true,
    }
  })

  return changed ? next : list
}

function isWithinTimingGrace({
  nowMs,
  lastSpeechMs,
  elapsedMs,
  graceMs,
}) {
  const now = finiteOrNull(nowMs) ?? Date.now()
  const grace = Math.max(0, Number(graceMs) || 0)
  if (grace <= 0) return false

  if (Number.isFinite(lastSpeechMs) && lastSpeechMs > 0) {
    return (now - lastSpeechMs) < grace
  }

  const elapsed = finiteOrNull(elapsedMs)
  if (elapsed != null && elapsed >= 0) {
    return elapsed < grace
  }

  return false
}
