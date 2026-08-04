import {
  DEFAULT_BEAT_MS,
  HOLD_TOLERANCE,
  getPracticeRule,
} from './catalog.js'
import {
  buildExpectedTajweedSegments,
  selectedRangeHasTajweedMetadata,
  tokenizeDisplayWords,
  stripTajweedMarkup,
} from './segments.js'
import {
  classifyHoldDuration,
  estimateBeatMsFromReference,
  estimatePaceFactor,
  expectedHoldRangeSec,
  recognitionWordsHaveReliableTimestamps,
  resolveAlignedWordTiming,
  trimHoldDurationSec,
  readWordTiming,
} from './timing.js'
import {
  compareWordWindows,
  decodeAudioToMono,
  fetchAndDecodeAudio,
} from './acoustic.js'
import {
  buildPracticeCheckPayload,
  buildPracticeMessages,
  classifySegmentOutcome,
  aggregatePracticeBand,
} from './score.js'
import {
  resolveLiveTajweedCoach,
  updateRecurringWeaknesses,
} from './live.js'

export {
  TAJWEED_PRACTICE_VERSION,
  TAJWEED_PRACTICE_CATALOG,
  COLOUR_BEGINNER_LABELS,
  HOLD_TOLERANCE,
  TAJWEED_COLOUR_HEX,
  getPracticeRule,
  getColourHex,
  resolveHoldTolerance,
} from './catalog.js'
export {
  selectedRangeHasTajweedMetadata,
  buildExpectedTajweedSegments,
  extractOccurrencesForVerse,
  stripTajweedMarkup,
  tokenizeDisplayWords,
} from './segments.js'
export {
  classifyHoldDuration,
  recognitionWordsHaveReliableTimestamps,
  resolveAlignedWordTiming,
  readWordTiming,
  expectedHoldRangeSec,
  holdStatusLabel,
  trimHoldDurationSec,
  estimatePaceFactor,
} from './timing.js'
export {
  buildRmsEnvelope,
  cosineSimilarity,
  classifyEnvelopeSimilarity,
  compareWordWindows,
} from './acoustic.js'
export {
  classifySegmentOutcome,
  aggregatePracticeBand,
  buildPracticeMessages,
  buildPracticeCheckPayload,
  buildSegmentCrossRef,
  bandToneClass,
} from './score.js'
export {
  resolveLiveTajweedCoach,
  updateRecurringWeaknesses,
  readWeaknessCounts,
} from './live.js'

/** Soft cap so post-session analysis never stalls the UI. */
const REFERENCE_FETCH_TIMEOUT_MS = 4500
const LEARNER_DECODE_TIMEOUT_MS = 3500
const MAX_ACOUSTIC_SEGMENTS = 12
const MAX_REFERENCE_VERSES = 6

/**
 * Gate for running the Tajweed Practice Check.
 * Analysis runs after stop; `wasRecording` must be true for the attempt.
 */
export function shouldRunTajweedPracticeCheck({
  wasRecording = false,
  tajweedHighlightingEnabled = false,
  verses = [],
} = {}) {
  return !!(
    wasRecording
    && tajweedHighlightingEnabled
    && selectedRangeHasTajweedMetadata(verses)
  )
}

function wordMatchOk(wordStatuses, globalIndex) {
  const status = Array.isArray(wordStatuses) ? wordStatuses[globalIndex] : null
  const raw = String(status?.status || status?.visualStatus || '').toLowerCase()
  if (!raw) return true
  return raw === 'correct' || raw === 'matched' || raw === 'ok'
}

function estimateReferenceWordWindow(verse, wordIndex, referenceDurationSec) {
  const plain = stripTajweedMarkup(verse?.arabic_tajweed || verse?.arabic || verse?.text || '')
  const words = tokenizeDisplayWords(plain)
  if (!words.length || !referenceDurationSec) return null
  const weights = words.map((w) => Math.max(1, Array.from(w).length) + 0.75)
  const total = weights.reduce((s, w) => s + w, 0) || 1
  let cursor = 0
  for (let i = 0; i < words.length; i += 1) {
    const dur = (weights[i] / total) * referenceDurationSec
    if (i === wordIndex) {
      return { start: cursor, end: cursor + dur }
    }
    cursor += dur
  }
  return null
}

function withTimeout(promise, ms, fallback = null) {
  if (!promise || typeof promise.then !== 'function') return Promise.resolve(fallback)
  const timeoutMs = Math.max(250, Number(ms) || 0)
  return new Promise((resolve) => {
    let settled = false
    const timer = setTimeout(() => {
      if (settled) return
      settled = true
      resolve(fallback)
    }, timeoutMs)
    promise.then(
      (value) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(value)
      },
      () => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        resolve(fallback)
      },
    )
  })
}

function uniqueVersesForSegments(verses, segments, limit = MAX_REFERENCE_VERSES) {
  const byKey = new Map()
  for (const verse of verses) {
    const key = String(verse?.key || '')
    if (key) byKey.set(key, verse)
  }
  const ordered = []
  const seen = new Set()
  for (const seg of segments) {
    const key = String(seg?.verseKey || '')
    if (!key || seen.has(key) || !byKey.has(key)) continue
    seen.add(key)
    ordered.push(byKey.get(key))
    if (ordered.length >= limit) break
  }
  return ordered
}

function averageTimedWordDuration(recognitionWords = []) {
  const durs = (Array.isArray(recognitionWords) ? recognitionWords : [])
    .map((w) => readWordTiming(w).durationSec)
    .filter((d) => Number.isFinite(d) && d > 0)
  if (!durs.length) return null
  return durs.reduce((s, d) => s + d, 0) / durs.length
}

/**
 * Run the three-layer Tajweed Practice Check.
 * Hold uses STT word timestamps; sound compares learner vs selected reciter ayah audio
 * only when a learner blob + reliable timing are available (never blocks the UI).
 */
export async function runTajweedPracticeCheck(options = {}) {
  const {
    verses = [],
    wordStatuses = [],
    recognitionWords = [],
    learnerBlob = null,
    resolveAyahAudioUrl = null,
    getWordTimings = null,
    beatMs: beatMsOption = null,
    reciterName = '',
    t = null,
    fetchImpl = typeof fetch !== 'undefined' ? fetch : null,
    acousticEnabled = true,
    trackWeakness = true,
    storage = null,
  } = options

  const expected = buildExpectedTajweedSegments(verses)
  if (!expected.length) {
    return buildPracticeCheckPayload({
      assessed: false,
      band: 'unable',
      segments: [],
      messages: buildPracticeMessages({ band: 'unable', segments: [], t, reciterName }),
      timingReliable: false,
      acousticAttempted: false,
      reciterName,
    })
  }

  const timingReliable = recognitionWordsHaveReliableTimestamps(recognitionWords)
  const canAttemptAcoustic = !!(
    acousticEnabled
    && learnerBlob
    && timingReliable
    && typeof resolveAyahAudioUrl === 'function'
    && fetchImpl
  )

  let learnerAudio = null
  if (canAttemptAcoustic) {
    learnerAudio = await withTimeout(
      decodeAudioToMono(learnerBlob),
      LEARNER_DECODE_TIMEOUT_MS,
      null,
    )
  }

  /** @type {Map<string, object|null>} */
  const referenceCache = new Map()

  async function loadReference(verse) {
    const key = verse?.key || ''
    if (!key) return null
    if (referenceCache.has(key)) return referenceCache.get(key)
    if (!resolveAyahAudioUrl || !fetchImpl) {
      referenceCache.set(key, null)
      return null
    }
    try {
      const url = await withTimeout(Promise.resolve(resolveAyahAudioUrl(verse)), 1500, '')
      const decoded = url
        ? await withTimeout(fetchAndDecodeAudio(url, fetchImpl), REFERENCE_FETCH_TIMEOUT_MS, null)
        : null
      let timings = null
      if (decoded && typeof getWordTimings === 'function') {
        timings = await withTimeout(
          Promise.resolve(getWordTimings(verse, decoded.duration)),
          800,
          null,
        )
      }
      const entry = decoded ? { ...decoded, timings } : null
      referenceCache.set(key, entry)
      return entry
    } catch (_) {
      referenceCache.set(key, null)
      return null
    }
  }

  // Prefetch only when acoustic comparison can run — avoids freezing on MP3 downloads.
  if (learnerAudio) {
    const refsToLoad = uniqueVersesForSegments(verses, expected, MAX_REFERENCE_VERSES)
    await Promise.all(refsToLoad.map((verse) => loadReference(verse)))
  }

  const firstVerse = verses[0]
  const firstRef = firstVerse ? referenceCache.get(firstVerse.key) || null : null
  const wordCount = tokenizeDisplayWords(
    stripTajweedMarkup(firstVerse?.arabic_tajweed || firstVerse?.arabic || ''),
  ).length
  const beatMs = beatMsOption
    || estimateBeatMsFromReference({
      referenceDurationSec: firstRef?.duration ?? null,
      wordCount,
    })
    || DEFAULT_BEAT_MS

  const learnerAvg = averageTimedWordDuration(recognitionWords)
  const referenceAvg = firstRef?.duration && wordCount
    ? firstRef.duration / wordCount
    : null
  const paceFactor = estimatePaceFactor({
    learnerAvgWordSec: learnerAvg,
    referenceAvgWordSec: referenceAvg,
  })

  const segments = []
  let acousticAttempted = false
  let acousticBudget = learnerAudio ? MAX_ACOUSTIC_SEGMENTS : 0

  for (const seg of expected) {
    const timing = resolveAlignedWordTiming(
      wordStatuses[seg.globalWordIndex],
      recognitionWords,
      seg.globalWordIndex,
    )
    const nextTiming = resolveAlignedWordTiming(
      wordStatuses[seg.globalWordIndex + 1],
      recognitionWords,
      seg.globalWordIndex + 1,
    )

    const verse = verses.find((v) => v?.key === seg.verseKey) || null
    const ref = verse ? (referenceCache.get(verse.key) || null) : null

    let refWindow = null
    if (ref) {
      if (Array.isArray(ref.timings)) {
        const hit = ref.timings.find((row) => Number(row.index) === Number(seg.wordIndex))
        if (hit) refWindow = { start: hit.start, end: hit.end }
      }
      if (!refWindow) {
        refWindow = estimateReferenceWordWindow(verse, seg.wordIndex, ref.duration)
      }
    }
    const referenceHoldSec = refWindow
      ? Math.max(0, Number(refWindow.end) - Number(refWindow.start))
      : null

    const holdRangePreview = expectedHoldRangeSec({
      expectedHoldBeats: seg.expectedHoldBeats,
      beatMs,
      ruleKey: seg.ruleKey,
      referenceHoldSec,
      paceFactor,
    })
    const maxPlausible = holdRangePreview
      ? holdRangePreview.maxSec * HOLD_TOLERANCE.trailingPauseCapRatio
      : null

    const confidence = Number(
      wordStatuses[seg.globalWordIndex]?.confidence
      ?? recognitionWords[seg.globalWordIndex]?.confidence
      ?? null,
    )

    const measuredHoldSec = timingReliable
      ? trimHoldDurationSec({
        measuredSec: timing.durationSec,
        startSec: timing.start,
        endSec: timing.end,
        nextStartSec: nextTiming.start,
        maxPlausibleSec: maxPlausible,
      })
      : null

    const hold = classifyHoldDuration({
      measuredSec: measuredHoldSec,
      expectedHoldBeats: seg.expectedHoldBeats,
      beatMs,
      ruleKey: seg.ruleKey,
      referenceHoldSec,
      paceFactor,
      confidence: Number.isFinite(confidence) ? confidence : null,
    })

    let sound = 'unable_to_assess'
    let soundSimilarity = null

    const wantsAcoustic = !!(
      learnerAudio
      && ref
      && timing.start != null
      && timing.end != null
      && timingReliable
      && acousticBudget > 0
      && (seg.expectedHoldBeats != null || seg.ruleKey === 'qalqalah' || hold === 'short' || hold === 'long')
    )

    if (wantsAcoustic) {
      acousticBudget -= 1
      acousticAttempted = true
      if (refWindow) {
        // Use trimmed end so trailing pause is not compared as held sound.
        const learnerEnd = measuredHoldSec != null && timing.start != null
          ? timing.start + measuredHoldSec
          : timing.end
        const compared = compareWordWindows({
          learnerSamples: learnerAudio.samples,
          learnerRate: learnerAudio.sampleRate,
          learnerStart: timing.start,
          learnerEnd,
          referenceSamples: ref.samples,
          referenceRate: ref.sampleRate,
          referenceStart: refWindow.start,
          referenceEnd: refWindow.end,
        })
        sound = compared.status
        soundSimilarity = compared.similarity
      }
    }

    const outcome = classifySegmentOutcome({
      hold,
      sound,
      wordMatchOk: wordMatchOk(wordStatuses, seg.globalWordIndex),
    })

    const meta = getPracticeRule(seg.ruleKey)
    const holdRange = expectedHoldRangeSec({
      expectedHoldBeats: seg.expectedHoldBeats,
      beatMs,
      ruleKey: seg.ruleKey,
      referenceHoldSec,
      paceFactor,
    })
    const expectedHoldSec = seg.expectedHoldBeats != null
      ? (seg.expectedHoldBeats * beatMs) / 1000
      : (holdRange?.midSec ?? null)
    const holdRangeLabel = holdRange
      ? `~${holdRange.minSec.toFixed(1)}–${holdRange.maxSec.toFixed(1)}s`
      : null

    segments.push({
      ...seg,
      hold,
      sound,
      soundSimilarity,
      measuredHoldSec,
      expectedHoldSec,
      referenceHoldSec,
      expectedHoldBeats: seg.expectedHoldBeats,
      beatMs,
      paceFactor,
      holdRangeMinSec: holdRange?.minSec ?? null,
      holdRangeMaxSec: holdRange?.maxSec ?? null,
      holdRangePreferredMinSec: holdRange?.preferredMinSec ?? null,
      holdRangePreferredMaxSec: holdRange?.preferredMaxSec ?? null,
      holdRangeLabel,
      outcome,
      colourLabel: meta ? meta.colour : seg.colour,
      colourHex: meta?.colourHex || seg.colourHex || null,
      label: meta?.label || seg.label,
      beginnerHint: meta?.beginnerHint || seg.beginnerHint,
      holdHint: meta?.holdHint || seg.holdHint,
      liveInstruction: meta?.liveInstruction || seg.liveInstruction,
      reciterName: reciterName || '',
    })
  }

  const band = aggregatePracticeBand(segments)
  const messages = buildPracticeMessages({ band, segments, t, reciterName })
  const payload = buildPracticeCheckPayload({
    assessed: true,
    band,
    segments,
    messages,
    timingReliable,
    acousticAttempted,
    reciterName,
  })

  if (trackWeakness) {
    const weakness = updateRecurringWeaknesses({
      segments,
      timingReliable,
      threshold: HOLD_TOLERANCE.weaknessRepeatThreshold,
      storage,
    })
    payload.recurringWeaknesses = weakness.recurringWeaknesses
  } else {
    payload.recurringWeaknesses = []
  }

  return payload
}

export default runTajweedPracticeCheck
