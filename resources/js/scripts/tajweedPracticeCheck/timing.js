import {
  DEFAULT_BEAT_MS,
  HOLD_TOLERANCE,
  resolveHoldTolerance,
} from './catalog.js'

/**
 * @param {object} recognitionWord
 * @returns {{ start: number|null, end: number|null, durationSec: number|null }}
 */
export function readWordTiming(recognitionWord = {}) {
  const start = Number(recognitionWord?.start ?? recognitionWord?.startTime)
  const end = Number(recognitionWord?.end ?? recognitionWord?.endTime)
  const hasStart = Number.isFinite(start)
  const hasEnd = Number.isFinite(end) && end > start
  if (!hasStart || !hasEnd) {
    return { start: null, end: null, durationSec: null }
  }
  return { start, end, durationSec: Math.max(0, end - start) }
}

export function recognitionWordsHaveReliableTimestamps(recognitionWords = []) {
  const words = Array.isArray(recognitionWords) ? recognitionWords : []
  if (!words.length) return false
  const timed = words.filter((word) => readWordTiming(word).durationSec != null)
  return timed.length >= Math.max(1, Math.ceil(words.length * 0.5))
}

/**
 * Map aligned word statuses to recognition timing when indexes align.
 * Prefer status.start/end; else recognitionWords[globalIndex].
 */
export function resolveAlignedWordTiming(wordStatus, recognitionWords = [], globalIndex = 0) {
  const fromStatus = readWordTiming(wordStatus || {})
  if (fromStatus.durationSec != null) return fromStatus
  const fromRecognition = readWordTiming(recognitionWords[globalIndex] || {})
  if (fromRecognition.durationSec != null) return fromRecognition
  const matched = wordStatus?.recognitionWord || wordStatus?.heard || null
  return readWordTiming(matched || {})
}

/**
 * Drop a trailing pause so silence after the vowel is not treated as hold.
 * Uses the next word start when available, plus a soft max-plausible cap.
 */
export function trimHoldDurationSec({
  measuredSec = null,
  startSec = null,
  endSec = null,
  nextStartSec = null,
  maxPlausibleSec = null,
} = {}) {
  if (measuredSec == null || !Number.isFinite(measuredSec) || measuredSec <= 0) {
    return null
  }
  let duration = measuredSec
  if (
    Number.isFinite(startSec)
    && Number.isFinite(nextStartSec)
    && nextStartSec > startSec
  ) {
    // Never extend into the gap before the next word.
    const untilNext = nextStartSec - startSec
    if (untilNext > 0) duration = Math.min(duration, untilNext)
  }
  if (
    Number.isFinite(startSec)
    && Number.isFinite(endSec)
    && Number.isFinite(nextStartSec)
    && nextStartSec > endSec
  ) {
    // Large gap after word end → end already excludes most pause; keep as-is.
  }
  if (Number.isFinite(maxPlausibleSec) && maxPlausibleSec > 0) {
    duration = Math.min(duration, maxPlausibleSec)
  }
  return Math.max(0, duration)
}

/**
 * Beginner-friendly hold window (seconds), never a single strict target.
 */
export function expectedHoldRangeSec({
  expectedHoldBeats = null,
  beatMs = DEFAULT_BEAT_MS,
  ruleKey = '',
  referenceHoldSec = null,
  paceFactor = 1,
} = {}) {
  const tolerance = resolveHoldTolerance(ruleKey, expectedHoldBeats)
  if (tolerance.mode === 'none') return null

  const beat = Math.max(
    HOLD_TOLERANCE.beatMsMin,
    Math.min(HOLD_TOLERANCE.beatMsMax, Number(beatMs) || HOLD_TOLERANCE.defaultBeatMs),
  )
  const pace = Number.isFinite(paceFactor) && paceFactor > 0.6 && paceFactor < 1.5
    ? paceFactor
    : 1

  let minSec
  let maxSec
  let preferredMinSec
  let preferredMaxSec
  let midSec

  if (tolerance.mode === 'seconds') {
    minSec = tolerance.minSec
    maxSec = tolerance.maxSec
    preferredMinSec = tolerance.preferredMinSec
    preferredMaxSec = tolerance.preferredMaxSec
    midSec = (preferredMinSec + preferredMaxSec) / 2
  } else {
    minSec = (tolerance.minCounts * beat * pace) / 1000
    maxSec = (tolerance.maxCounts * beat * pace) / 1000
    preferredMinSec = (tolerance.preferredMin * beat * pace) / 1000
    preferredMaxSec = (tolerance.preferredMax * beat * pace) / 1000
    midSec = ((tolerance.preferredMin + tolerance.preferredMax) / 2 * beat * pace) / 1000
  }

  // Softly expand toward the selected reciter’s measured window.
  if (Number.isFinite(referenceHoldSec) && referenceHoldSec > 0) {
    minSec = Math.min(minSec, referenceHoldSec * 0.7)
    maxSec = Math.max(maxSec, referenceHoldSec * 1.35)
    preferredMinSec = Math.min(preferredMinSec, referenceHoldSec * 0.85)
    preferredMaxSec = Math.max(preferredMaxSec, referenceHoldSec * 1.2)
  }

  return {
    minSec,
    maxSec,
    preferredMinSec,
    preferredMaxSec,
    midSec,
    referenceHoldSec: Number.isFinite(referenceHoldSec) ? referenceHoldSec : null,
  }
}

/**
 * Classify hold duration vs a wide practice range (not teacher-strict timing).
 * @returns {'ok'|'short'|'long'|'unable_to_assess'|'not_applicable'}
 */
export function classifyHoldDuration({
  measuredSec = null,
  expectedHoldBeats = null,
  beatMs = DEFAULT_BEAT_MS,
  ruleKey = '',
  referenceHoldSec = null,
  paceFactor = 1,
  confidence = null,
} = {}) {
  const tolerance = resolveHoldTolerance(ruleKey, expectedHoldBeats)
  if (tolerance.mode === 'none') return 'not_applicable'

  if (
    confidence != null
    && Number.isFinite(confidence)
    && confidence < HOLD_TOLERANCE.confidenceThreshold
  ) {
    return 'unable_to_assess'
  }

  if (measuredSec == null || !Number.isFinite(measuredSec) || measuredSec <= 0) {
    return 'unable_to_assess'
  }

  const range = expectedHoldRangeSec({
    expectedHoldBeats,
    beatMs,
    ruleKey,
    referenceHoldSec,
    paceFactor,
  })
  if (!range) return 'not_applicable'

  const grace = HOLD_TOLERANCE.classifyGraceRatio
  const minOk = range.minSec * (1 - grace)
  const maxOk = range.maxSec * (1 + grace)
  // Preferred band + grace still maps to “ok” / within range.
  const prefMin = range.preferredMinSec * (1 - HOLD_TOLERANCE.preferredGraceRatio)
  const prefMax = range.preferredMaxSec * (1 + HOLD_TOLERANCE.preferredGraceRatio)

  if (measuredSec >= prefMin && measuredSec <= prefMax) return 'ok'
  if (measuredSec >= minOk && measuredSec <= maxOk) return 'ok'
  if (measuredSec < minOk) return 'short'
  if (measuredSec > maxOk) return 'long'
  return 'unable_to_assess'
}

/** Beginner hold label for UI (no milliseconds). */
export function holdStatusLabel(hold = '', t = null) {
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }
  if (hold === 'ok') {
    return translate(
      'memorisation.tajweedPracticeCheck.hold.within',
      'Within the expected range',
    )
  }
  if (hold === 'short') {
    return translate(
      'memorisation.tajweedPracticeCheck.hold.short',
      'A little short',
    )
  }
  if (hold === 'long') {
    return translate(
      'memorisation.tajweedPracticeCheck.hold.long',
      'A little long',
    )
  }
  if (hold === 'not_applicable') {
    return translate(
      'memorisation.tajweedPracticeCheck.hold.na',
      'No special hold',
    )
  }
  return translate(
    'memorisation.tajweedPracticeCheck.hold.unable',
    'Could not assess clearly',
  )
}

export function estimateBeatMsFromReference({ referenceDurationSec = null, wordCount = 1 } = {}) {
  if (!referenceDurationSec || !Number.isFinite(referenceDurationSec) || referenceDurationSec <= 0) {
    return DEFAULT_BEAT_MS
  }
  const words = Math.max(1, Number(wordCount) || 1)
  // Rough: average word ≈ 2 beats in murattal pacing.
  const beat = (referenceDurationSec * 1000) / (words * 2)
  return Math.max(
    HOLD_TOLERANCE.beatMsMin,
    Math.min(HOLD_TOLERANCE.beatMsMax, Math.round(beat)),
  )
}

/**
 * Soft pace factor from learner vs reference average word duration.
 * Clamped so it never makes ranges harsh.
 */
export function estimatePaceFactor({ learnerAvgWordSec = null, referenceAvgWordSec = null } = {}) {
  if (
    !Number.isFinite(learnerAvgWordSec)
    || !Number.isFinite(referenceAvgWordSec)
    || learnerAvgWordSec <= 0
    || referenceAvgWordSec <= 0
  ) {
    return 1
  }
  const ratio = learnerAvgWordSec / referenceAvgWordSec
  return Math.max(0.85, Math.min(1.2, ratio))
}
