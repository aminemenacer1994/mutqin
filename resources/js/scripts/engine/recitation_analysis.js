import {
  DEFAULT_RECITATION_CONFIDENCE_THRESHOLD,
  RECITATION_AMD_UNCERTAIN_CONFIDENCE,
  RECITATION_ASR_REEMIT_MAX_GAP_MS,
  RECITATION_CORRECT_SIMILARITY,
  RECITATION_LIVE_CORRECT_SIMILARITY,
  RECITATION_LIVE_MIN_CONFIDENCE_FOR_CORRECT,
  RECITATION_LIVE_MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT,
  RECITATION_LIVE_PARTIAL_SIMILARITY,
  RECITATION_SOFT_SIMILARITY_CAP,
  RECITATION_THRESHOLDS,
  RECITATION_PAUSE_POLICY,
  RECITATION_UNCERTAIN_CONFIDENCE,
  resolveHesitationPauseSeconds,
  resolveSelfCorrectionPauseSeconds,
  recitationAccuracyBand,
} from './recitationThresholds.js'
import { evaluateSpeechmaticsAudioGate } from '../audio/speechmaticsAudioGate.js'

export {
  DEFAULT_RECITATION_CONFIDENCE_THRESHOLD,
  RECITATION_AMD_UNCERTAIN_CONFIDENCE,
  RECITATION_ASR_REEMIT_MAX_GAP_MS,
  RECITATION_CORRECT_SIMILARITY,
  RECITATION_LIVE_CORRECT_SIMILARITY,
  RECITATION_LIVE_MIN_CONFIDENCE_FOR_CORRECT,
  RECITATION_LIVE_MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT,
  RECITATION_LIVE_PARTIAL_SIMILARITY,
  RECITATION_SOFT_SIMILARITY_CAP,
  RECITATION_THRESHOLDS,
  RECITATION_PAUSE_POLICY,
  RECITATION_UNCERTAIN_CONFIDENCE,
  resolveHesitationPauseSeconds,
  resolveSelfCorrectionPauseSeconds,
  recitationAccuracyBand,
}

export const DEFAULT_ANALYSIS_TIMESTAMP = '1970-01-01T00:00:00.000Z'

export function createRecognitionState() {
  return {
    rawEvents: [],
    bufferedSegments: {},
    committedWords: [],
    interimWords: [],
    interimSegment: null,
    rejectedWords: [],
    sequence: 0
  }
}

export function normalizeArabicForRecitation(text) {
  // Compare-only: returns a NEW string. Never write this back over stored/display
  // Uthmani Arabic — canonical text must remain exactly as sourced.
  return String(text || '')
    // Dagger alef (ٰ) is a real alef in mushaf orthography — expand before
    // stripping marks, or العَٰلَمِين / الصِّرَٰط become العلمين / الصرط and
    // never match correct ASR العالمين / الصراط.
    .replace(/\u0670/g, 'ا')
    // Harakat / tajweed marks — comparison only; display path keeps them.
    .replace(/[\u0610-\u061A\u064B-\u065F\u06D6-\u06ED]/g, '')
    // Tatweel / kashida
    .replace(/\u0640/g, '')
    // Arabic and Western punctuation / digits / symbols → space (never kept for compare)
    .replace(/[\u060C\u061B\u061F\u06D4.,!?;:'"“”‘’()[\]{}<>«»…\-_/\\|]+/g, ' ')
    .replace(/([^\s])ٱ\s+(?=ل)/g, '$1 ٱ')
    .replace(/(^|\s)ٱ\s+(?=ل)/g, '$1ٱ')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // Mushaf وء (waw + hamza) vs ASR وآ / plain وا — same spoken word in recitation.
    .replace(/([او])ء/g, '$1')
    .replace(/ء/g, '')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/(^|\s)ا\s+(?=ل)/g, '$1ا')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Plain Arabic often omits or inserts ا vs mushaf dagger-alef expansions. */
export function stripArabicAlefForCompare(word = '') {
  return String(word || '').replace(/ا/g, '')
}

export function arabicAlefOptionalEqual(left = '', right = '') {
  const a = String(left || '')
  const b = String(right || '')
  if (!a || !b) return false
  if (a === b) return true
  const sa = stripArabicAlefForCompare(a)
  const sb = stripArabicAlefForCompare(b)
  return sa.length > 0 && sa === sb
}

/** ASR often drops or reattaches ال on ayah-final words — compare bare stems too. */
export function stripArabicDefiniteArticle(word = '') {
  const value = String(word || '')
  if (value.startsWith('ال') && value.length > 3) return value.slice(2)
  if (value.startsWith('لل') && value.length > 3) return `ل${value.slice(2)}`
  return value
}

/**
 * Strip Quranic و/ف + ال so ASR "الشمس" matches "والشمس".
 * Bare و/ف alone is not stripped — that falsely equates واحد with أحد.
 */
export function stripArabicClitics(word = '') {
  let value = String(word || '')
  if (!value) return value
  if (/^[وف]ال/.test(value) && value.length > 4) {
    value = value.slice(3)
  }
  return stripArabicDefiniteArticle(value)
}

export function cleanRecitationDisplayText(text) {
  return stripMarkup(text)
    .replace(/\u0640/g, '')
    .replace(/[\u06D6-\u06ED]/g, '')
    .replace(/([^\s])ٱ\s+(?=ل)/g, '$1 ٱ')
    .replace(/(^|\s)ٱ\s+(?=ل)/g, '$1ٱ')
    .replace(/(^|\s)ا\s+(?=ل)/g, '$1ا')
    .replace(/[^\u0621-\u064A\u0671\u0670\u064B-\u065F\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

export function tokenizeRecitationDisplayWords(text) {
  const cleaned = cleanRecitationDisplayText(text)
  return cleaned ? cleaned.split(/\s+/).map(word => word.trim()).filter(Boolean) : []
}

/** True when the string still carries Qur’anic harakāt / dagger-alef. */
export function arabicHasTashkil(text) {
  return /[\u064B-\u065F\u0670]/.test(String(text || ''))
}

/**
 * Prefer canonical vocalised Uthmāni text for recitation display.
 * Falls back to any candidate that still has tashkīl, then raw Arabic.
 */
export function pickVocalisedArabicText(...candidates) {
  const list = candidates
    .map((value) => String(value || '').replace(/\s+/g, ' ').trim())
    .filter(Boolean)
  if (!list.length) return ''
  return list.find((value) => arabicHasTashkil(value)) || list[0]
}

export function tokenizeRecitationWords(text) {
  const normalized = normalizeArabicForRecitation(text)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
}

/** Speechmatics / ASR surface form — never rewrite this with canonical tashkīl. */
export function heardRawWord(heardWord = {}) {
  if (typeof heardWord === 'string') return String(heardWord || '').trim()
  return String(
    heardWord?.rawWord
    || heardWord?.raw_word
    || heardWord?.display
    || heardWord?.word
    || heardWord?.text
    || ''
  ).trim()
}

/**
 * Render helper for AI Recite / saved-session word chips.
 * Canonical harakāt only when a confident match set displayWord.
 */
export function resolveRecitationWordDisplay(word = {}) {
  const displayWord = String(word?.displayWord ?? word?.display_word ?? '').trim()
  if (displayWord) return displayWord
  const rawWord = String(word?.rawWord ?? word?.raw_word ?? '').trim()
  if (rawWord) return rawWord
  return String(word?.text || word?.display || word?.word || '').trim()
}

function heardTiming(heardWord = {}) {
  const start = finiteOrNull(heardWord?.start ?? heardWord?.startTime ?? heardWord?.start_time)
  const end = finiteOrNull(heardWord?.end ?? heardWord?.endTime ?? heardWord?.end_time)
  return { start, end, startTime: start, endTime: end }
}

function heardRecognitionToken(heardWord = {}) {
  const token = heardWord?.token
    ?? heardWord?.speechmaticsToken
    ?? heardWord?.speechmatics_token
    ?? heardWord?.resultId
    ?? heardWord?.result_id
    ?? heardWord?.id
  return token === undefined || token === null ? null : token
}

function withRecognitionDebugFields(payload, heardWord = {}) {
  const token = heardRecognitionToken(heardWord)
  return {
    ...payload,
    ...(heardWord?.provider ? { provider: heardWord.provider } : {}),
    ...(heardWord?.segmentId ? { segmentId: heardWord.segmentId } : {}),
    ...(Number.isFinite(Number(heardWord?.sourceIndex)) ? { sourceIndex: Number(heardWord.sourceIndex) } : {}),
    ...(token !== null ? { token, speechmaticsToken: token } : {}),
  }
}

function withHeardAlignmentFields(payload, heardWord = {}, status = payload?.status) {
  return withRecognitionDebugFields({
    ...payload,
    rawWord: heardRawWord(heardWord),
    displayWord: status === 'correct' ? String(payload?.text || '') : '',
    ...heardTiming(heardWord),
  }, heardWord)
}

function unmatchedTargetAlignmentFields() {
  return {
    rawWord: '',
    displayWord: '',
    start: null,
    end: null,
    startTime: null,
    endTime: null,
  }
}

export function wordsToTranscript(words = []) {
  return (Array.isArray(words) ? words : [])
    .map(item => item?.word || item?.text || '')
    .filter(Boolean)
    .join(' ')
}

export function createWordsFromTranscript(transcript = '', options = {}) {
  return tokenizeRecitationWords(transcript).map((word, index) => ({
    word,
    display: word,
    rawWord: word,
    confidence: Number.isFinite(Number(options.confidence)) ? Number(options.confidence) : 1,
    provider: options.provider || 'stable-transcript',
    segmentId: options.segmentId || 'stable-transcript',
    sequence: index,
    sourceIndex: index,
    committed: true
  }))
}

export function stabilizeRecognitionEvent(state = createRecognitionState(), event = {}, options = {}) {
  const threshold = Number.isFinite(Number(options.confidenceThreshold))
    ? Number(options.confidenceThreshold)
    : DEFAULT_RECITATION_CONFIDENCE_THRESHOLD
  const next = cloneRecognitionState(state)
  const sequence = Number(next.sequence || 0)
  const isFinal = event?.type === 'final'
    || event?.isFinal === true
    || event?.speechFinal === true
  const eventWords = Array.isArray(event?.words) && event.words.length
    ? event.words
    : (String(event?.transcript || '').trim()
      ? [{ word: String(event.transcript).trim(), confidence: event?.confidence }]
      : [])
  const segmentId = getRecognitionSegmentId({ ...event, words: eventWords }, sequence)
  const normalizedWords = normalizeRecognitionWords(eventWords, {
    confidenceThreshold: threshold,
    provider: event.provider || 'unknown',
    segmentId,
    eventSequence: sequence
  })
  const rawEvent = {
    sequence,
    provider: event.provider || 'unknown',
    isFinal,
    speechFinal: !!event.speechFinal,
    segmentId,
    start: finiteOrNull(event.start),
    duration: finiteOrNull(event.duration),
    transcript: String(event.transcript || ''),
    confidence: finiteOrNull(event.confidence),
    receivedAt: event.receivedAt || null,
    words: normalizedWords.map(word => ({ ...word })),
    raw: event.raw || null
  }

  next.sequence = sequence + 1
  next.rawEvents.push(rawEvent)
  next.rejectedWords.push(...collectRejectedRecognitionWords(eventWords, threshold, event.provider || 'unknown', rawEvent.segmentId))

  if (!rawEvent.isFinal) {
    // Empty keep-alive / punctuation partials must not erase the last useful
    // hypothesis while the provider is still resolving the utterance.
    if (!normalizedWords.length) return next
    next.interimSegment = {
      segmentId: rawEvent.segmentId,
      provider: rawEvent.provider,
      sequence,
      start: rawEvent.start,
      duration: rawEvent.duration,
      speechFinal: false,
      words: normalizedWords.map(word => ({ ...word, segmentId: rawEvent.segmentId }))
    }
    next.interimWords = suppressDuplicateRecognitionWords(normalizedWords)
    return next
  }

  // A final envelope without word results is valid provider output (for
  // example punctuation-only or an empty utterance). It cannot confirm the
  // pending hypothesis, so retain it until EndOfTranscript/finalisation.
  if (!normalizedWords.length) return next

  const existingKey = findSupersededSegmentKey(next.bufferedSegments, rawEvent)
  const segmentKey = existingKey || rawEvent.segmentId
  const incomingSegment = {
    segmentId: segmentKey,
    provider: rawEvent.provider,
    sequence,
    start: rawEvent.start,
    duration: rawEvent.duration,
    speechFinal: rawEvent.speechFinal,
    // Speechmatics can re-emit the same token while replacing a segment. Keep
    // the token in rawEvents for diagnostics, but do not let that provider
    // duplicate become a learner repetition in the committed transcript.
    words: suppressDuplicateRecognitionWords(normalizedWords)
      .map(word => ({ ...word, segmentId: segmentKey }))
  }
  const currentSegment = next.bufferedSegments[segmentKey]
  next.bufferedSegments[segmentKey] = selectPreferredRecognitionSegment(currentSegment, incomingSegment)
  next.interimWords = []
  next.interimSegment = null
  next.committedWords = reconcileBufferedSegments(next.bufferedSegments)
  return next
}

export function getRecognitionDisplayWords(state = createRecognitionState()) {
  const projectedSegments = projectRecognitionSegments(state?.bufferedSegments || {}, state?.interimSegment || null)
  if (!projectedSegments.length) {
    return Array.isArray(state?.committedWords) ? state.committedWords : []
  }
  return suppressDuplicateRecognitionWords(projectedSegments.flatMap(segment => segment.words || []))
    .map((word, index) => ({ ...word, displayIndex: index }))
}

export function buildRealtimePreviewAlignment(targetText = '', recognitionWords = [], options = {}) {
  const targetAyahs = normalizeTargetAyahs(options.targetAyahs || options.ayahs || [], targetText)
  const targetUnits = buildTargetWordUnits(targetAyahs, targetText)
  const displayWords = targetUnits.map(unit => unit.display)
  const targetWords = targetUnits.map(unit => unit.word)
  const heardWords = normaliseCommittedRecognitionWords(recognitionWords)
  const isLiveLifecycle = ['live', 'recording', 'paused'].includes(String(options.lifecycle || '').toLowerCase())

  // The cursor preview is intentionally lightweight for ordinary speech, but
  // it must yield to the same anchor-gated DP once a real backward move is
  // visible. Otherwise a restart is mistaken for a long omission/red cascade
  // while the recording is still live.
  if (heardWords.length >= 4 && targetWords.length >= 3 && findLiveRestartEvidence(targetWords, heardWords)) {
    const restartAlignment = buildQuranAlignment(targetText, heardWords, {
      ...options,
      lifecycle: 'live',
      targetAyahs,
    })
    if (restartAlignment.events?.some(event => event.type === 'RESTART')) {
      return {
        ...restartAlignment,
        firstBlockingIndex: restartAlignment.progression?.currentIndex ?? -1,
      }
    }
  }
  const statuses = displayWords.map((text, index) => ({
    text,
    targetWord: targetWords[index] || '',
    status: 'pending',
    note: '',
    actual: '',
    confidence: 0,
    similarity: 0,
    targetIndex: index,
    ayahKey: targetUnits[index]?.ayahKey || '',
    ayahNumber: targetUnits[index]?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnits[index]?.ayahIndex)) ? Number(targetUnits[index].ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnits[index]?.ayahWordIndex)) ? Number(targetUnits[index].ayahWordIndex) : index,
    ...unmatchedTargetAlignmentFields(),
  }))
  const strict = options.strictProgression !== false
  // Preserve explicit 0 so strict AMD modes can disable fuzzy skip-ahead.
  // exactSkipLookahead still allows detecting genuine skipped phrases via exact match only.
  const lookaheadRaw = Number(options.lookahead)
  const lookahead = Number.isFinite(lookaheadRaw)
    ? Math.max(0, Math.min(8, lookaheadRaw))
    : 5
  const exactSkipRaw = Number(options.exactSkipLookahead)
  const exactSkipLookahead = Number.isFinite(exactSkipRaw)
    ? Math.max(0, Math.min(8, exactSkipRaw))
    : (options.advanceOnIncorrect && lookahead === 0 ? 3 : 0)
  const skipWindow = Math.max(lookahead, exactSkipLookahead)
  const correctSimilarity = Number.isFinite(Number(options.correctSimilarity))
    ? Number(options.correctSimilarity)
    : RECITATION_CORRECT_SIMILARITY
  const partialSimilarity = Number.isFinite(Number(options.partialSimilarity))
    ? Number(options.partialSimilarity)
    : 0.48
  const minConfidenceForCorrect = Number.isFinite(Number(options.minConfidenceForCorrect))
    ? Number(options.minConfidenceForCorrect)
    : 0
  const uncertainConfidence = Number.isFinite(Number(options.uncertainConfidence))
    ? Number(options.uncertainConfidence)
    : RECITATION_UNCERTAIN_CONFIDENCE
  const minConfidenceForSimilarityCorrect = Number.isFinite(Number(options.minConfidenceForSimilarityCorrect))
    ? Number(options.minConfidenceForSimilarityCorrect)
    : RECITATION_THRESHOLDS.minConfidenceForSimilarityCorrect
  const allowArticleMatch = options.allowArticleMatch !== false
  const matchThresholds = {
    correctSimilarity,
    partialSimilarity,
    minConfidenceForCorrect,
    minConfidenceForSimilarityCorrect,
    allowArticleMatch,
    uncertainConfidence,
  }
  const extraWords = []
  let cursor = 0
  let firstBlockingIndex = -1

  for (let heardIndex = 0; heardIndex < heardWords.length; heardIndex += 1) {
    const heardWord = heardWords[heardIndex] || {}
    if (isLikelyTransientNoiseWord(heardWord, matchThresholds)) {
      continue
    }
    if (isLikelyOffTargetTransientNoise(heardWord, targetWords, cursor, matchThresholds)) {
      continue
    }
    if (shouldSkipLearnerStutterRepeat(heardWords, heardIndex, targetWords, cursor)) {
      continue
    }
    if (cursor >= targetWords.length) {
      extraWords.push({
        word: heardWord.word || '',
        display: heardWord.display || heardWord.rawWord || heardWord.word || '',
        rawWord: heardRawWord(heardWord),
        displayWord: '',
        heardIndex,
        confidence: Number(heardWord.confidence ?? 1),
        start: finiteOrNull(heardWord.start ?? heardWord.startTime),
        end: finiteOrNull(heardWord.end ?? heardWord.endTime),
        type: isRepeatedHeardWord(heardWords, heardIndex)
          ? 'repetition'
          : (isLowConfidenceRecognitionWord(heardWord) ? 'uncertain' : 'extra')
      })
      continue
    }

    const targetWord = targetWords[cursor] || ''
    const targetUnit = targetUnits[cursor] || null
    const similarity = getRecitationWordSimilarity(targetWord, heardWord.word, { allowArticleMatch })
    const classified = classifyWordMatch({
      displayText: displayWords[cursor] || targetWord,
      targetWord,
      heardWord,
      similarity,
      outOfOrderIndex: -1,
      targetIndex: cursor,
      targetUnit,
      ...matchThresholds,
    })

    if (classified.status === 'correct'
      || (classified.status === 'partial' && options.partialAdvances !== false)
      || (classified.status === 'uncertain' && options.partialAdvances !== false && similarity >= correctSimilarity)) {
      statuses[cursor] = classified
      cursor += 1
      continue
    }
    if (classified.status === 'partial' || classified.status === 'uncertain') {
      // Stricter modes keep amber/uncertain feedback without advancing the cursor.
      statuses[cursor] = classified
      continue
    }

    // Soft continue: if the learner already moved on to the next word, treat the
    // current slot as skipped (omitted) — not as a false substitution with the
    // ahead hear attached as "actual".
    if (options.advanceOnIncorrect && cursor + 1 < targetWords.length) {
      const nextTarget = targetWords[cursor + 1] || ''
      const nextSimilarity = getRecitationWordSimilarity(nextTarget, heardWord.word, { allowArticleMatch })
      const nextClassified = classifyWordMatch({
        displayText: displayWords[cursor + 1] || nextTarget,
        targetWord: nextTarget,
        heardWord,
        similarity: nextSimilarity,
        outOfOrderIndex: -1,
        targetIndex: cursor + 1,
        targetUnit: targetUnits[cursor + 1] || null,
        ...matchThresholds,
      })
      if (nextClassified.status === 'correct'
        || (nextClassified.status === 'partial' && options.partialAdvances !== false)) {
        const skipUnit = targetUnits[cursor] || null
        statuses[cursor] = {
          text: displayWords[cursor] || targetWord,
          targetWord,
          status: isLiveLifecycle ? 'pending' : 'omitted',
          type: isLiveLifecycle ? 'UNASSESSED' : 'DELETION',
          note: isLiveLifecycle ? '' : `Skipped. Expected ${displayWords[cursor] || targetWord} before continuing.`,
          actual: '',
          confidence: 0,
          similarity: 0,
          visualStatus: isLiveLifecycle ? 'neutral' : 'red',
          highlight: isLiveLifecycle ? 'neutral' : 'red',
          targetIndex: cursor,
          ayahKey: skipUnit?.ayahKey || '',
          ayahNumber: skipUnit?.ayahNumber ?? null,
          ayahIndex: Number.isFinite(Number(skipUnit?.ayahIndex)) ? Number(skipUnit.ayahIndex) : 0,
          ayahWordIndex: Number.isFinite(Number(skipUnit?.ayahWordIndex)) ? Number(skipUnit.ayahWordIndex) : cursor,
          ...unmatchedTargetAlignmentFields(),
        }
        statuses[cursor + 1] = nextClassified
        firstBlockingIndex = cursor
        cursor += 2
        continue
      }
    }

    const exactAheadIndex = findExactWordIndexWithinWindow(
      targetWords,
      heardWord.word,
      cursor + 1,
      skipWindow,
      { allowArticleMatch }
    )
    if (exactAheadIndex >= 0) {
      // Exact ahead match = skipped words. Always paint omissions + the matched word.
      // Never attach the ahead hear as a false "incorrect" on the skipped slot.
      for (let skipIndex = cursor; skipIndex < exactAheadIndex; skipIndex += 1) {
        const skipUnit = targetUnits[skipIndex] || null
        statuses[skipIndex] = {
          text: displayWords[skipIndex] || targetWords[skipIndex] || '',
          targetWord: targetWords[skipIndex] || '',
          status: isLiveLifecycle ? 'pending' : 'omitted',
          type: isLiveLifecycle ? 'UNASSESSED' : 'DELETION',
          note: isLiveLifecycle ? '' : `Skipped. Expected ${displayWords[skipIndex] || targetWords[skipIndex] || ''} before continuing.`,
          actual: '',
          confidence: 0,
          similarity: 0,
          visualStatus: isLiveLifecycle ? 'neutral' : 'red',
          highlight: isLiveLifecycle ? 'neutral' : 'red',
          targetIndex: skipIndex,
          ayahKey: skipUnit?.ayahKey || '',
          ayahNumber: skipUnit?.ayahNumber ?? null,
          ayahIndex: Number.isFinite(Number(skipUnit?.ayahIndex)) ? Number(skipUnit.ayahIndex) : 0,
          ayahWordIndex: Number.isFinite(Number(skipUnit?.ayahWordIndex)) ? Number(skipUnit.ayahWordIndex) : skipIndex,
          ...unmatchedTargetAlignmentFields(),
        }
      }
      firstBlockingIndex = cursor
      const aheadUnit = targetUnits[exactAheadIndex] || null
      statuses[exactAheadIndex] = classifyWordMatch({
        displayText: displayWords[exactAheadIndex] || targetWords[exactAheadIndex] || '',
        targetWord: targetWords[exactAheadIndex] || '',
        heardWord,
        similarity: 1,
        outOfOrderIndex: exactAheadIndex,
        targetIndex: exactAheadIndex,
        targetUnit: aheadUnit,
        ...matchThresholds,
      })
      cursor = exactAheadIndex + 1
      // Stop-on-mistake modes still record the skip, then freeze further painting.
      if (strict && !options.advanceOnIncorrect) {
        break
      }
      continue
    }

    statuses[cursor] = classified
    firstBlockingIndex = cursor
    // Soft continue MUST advance past a red so the next heard token cannot
    // overwrite the mistake (e.g. صمد→incorrect then الرحمن re-scoring the same slot).
    if (strict) {
      if (options.advanceOnIncorrect) {
        cursor += 1
        continue
      }
      const recovered = findSameSlotRecovery({
        heardWords,
        fromHeardIndex: heardIndex,
        targetWord,
        displayText: displayWords[cursor] || targetWord,
        targetUnit,
        cursor,
        targetWords,
        matchThresholds,
        correctSimilarity,
        allowArticleMatch,
      })
      if (recovered) {
        statuses[cursor] = recovered.classified
        firstBlockingIndex = recovered.classified.status === 'correct' || recovered.classified.status === 'partial'
          ? -1
          : cursor
        cursor += 1
        heardIndex = recovered.heardIndex
        continue
      }
      break
    }
    cursor += 1
  }

  const progression = buildStableProgression(statuses, extraWords, options)
  const events = detectHesitationEvents({
    statuses,
    extraWords,
    heardWords,
    lifecycle: options.lifecycle || 'live',
    hesitationSeconds: options.hesitationSeconds,
  })
  return {
    sourceOfTruth: 'selected-ayah-live-preview',
    targetText,
    displayWords,
    targetWords,
    committedWords: heardWords,
    transcript: wordsToTranscript(heardWords),
    statuses,
    wordStatuses: statuses,
    extraWords,
    events,
    scenarioCounts: buildQuranScenarioCounts(statuses, extraWords, events),
    progression,
    firstBlockingIndex
  }
}

export function selectPrimaryReciterWords(recognitionWords = [], targetText = '', options = {}) {
  const metrics = options?.audioQualityMetrics || options?.audio_quality_metrics || null
  const explicit = options?.audioQualityStatus || options?.audio_quality_status || ''
  if (metrics || explicit) {
    const gate = evaluateSpeechmaticsAudioGate(metrics, explicit)
    if (!gate.reliable) {
      return {
        reliable: false,
        status: gate.status,
        reason: gate.reason,
        primarySpeaker: null,
        speakerCount: 0,
        words: [],
      }
    }
  }
  const words = Array.isArray(recognitionWords) ? recognitionWords : []
  const labelled = words.filter(word => String(word?.speaker || '').trim() && String(word?.speaker).toUpperCase() !== 'UU')
  const speakers = new Map()
  for (const word of labelled) {
    const speaker = String(word.speaker).trim()
    if (!speakers.has(speaker)) speakers.set(speaker, [])
    speakers.get(speaker).push(word)
  }
  if (speakers.size <= 1) {
    return {
      reliable: true,
      status: 'single_speaker',
      primarySpeaker: speakers.size ? speakers.keys().next().value : null,
      speakerCount: speakers.size,
      words,
    }
  }

  const target = tokenizeRecitationWords(targetText)
  const ranked = Array.from(speakers, ([speaker, speakerWords]) => {
    let cursor = 0
    let orderedMatches = 0
    let consecutive = 0
    let longestConsecutive = 0
    let previousTargetIndex = -2
    for (const heard of speakerWords) {
      const token = tokenizeRecitationWords(heard?.word || heard?.text || '')[0] || ''
      let found = -1
      for (let index = cursor; index < target.length; index += 1) {
        if (token === target[index]) {
          found = index
          break
        }
      }
      if (found < 0) {
        consecutive = 0
        continue
      }
      orderedMatches += 1
      consecutive = found === previousTargetIndex + 1 ? consecutive + 1 : 1
      longestConsecutive = Math.max(longestConsecutive, consecutive)
      previousTargetIndex = found
      cursor = found + 1
    }
    return { speaker, words: speakerWords, count: speakerWords.length, orderedMatches, longestConsecutive }
  }).sort((left, right) => (
    right.longestConsecutive - left.longestConsecutive
    || right.orderedMatches - left.orderedMatches
    || right.count - left.count
  ))

  const primary = ranked[0]
  const secondary = ranked[1]
  const anchored = primary.longestConsecutive >= 2 || primary.orderedMatches >= 3
  const substantialSecondStream = secondary.count >= Math.max(4, Math.ceil(primary.count * 0.75))
  const quranLikeSecondStream = secondary.count >= Math.max(3, Math.ceil(primary.count * 0.55))
    && secondary.orderedMatches >= Math.max(2, Math.floor(primary.orderedMatches * 0.6))
  const competing = substantialSecondStream || quranLikeSecondStream
  if (!anchored || competing) {
    return {
      reliable: false,
      status: competing ? 'multiple_competing_speakers' : 'primary_speaker_uncertain',
      primarySpeaker: null,
      speakerCount: speakers.size,
      words: [],
    }
  }

  return {
    reliable: true,
    status: 'secondary_speaker_filtered',
    primarySpeaker: primary.speaker,
    speakerCount: speakers.size,
    words: words.filter(word => String(word?.speaker || '').trim() === primary.speaker),
  }
}

export function buildQuranAlignment(targetText = '', recognitionWords = [], options = {}) {
  const targetAyahs = normalizeTargetAyahs(options.targetAyahs || options.ayahs || [], targetText)
  const targetUnits = buildTargetWordUnits(targetAyahs, targetText)
  const displayWords = targetUnits.map(unit => unit.display)
  const targetWords = targetUnits.map(unit => unit.word)
  const rawHeardWords = normaliseCommittedRecognitionWords(recognitionWords, { suppressDuplicates: false })
  const heardWords = normaliseCommittedRecognitionWords(recognitionWords)
  const transcriptWords = heardWords.map(word => word.word)
  const targetCount = targetWords.length
  const heardCount = transcriptWords.length
  const startingAnchor = findStartingAnchor(targetWords, heardWords)
  const matrix = Array.from({ length: targetCount + 1 }, () => Array(heardCount + 1).fill(null))
  matrix[0][0] = { cost: 0, prev: null, op: 'start', similarity: 0 }

  for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
    matrix[targetIndex][0] = { cost: matrix[targetIndex - 1][0].cost + 1, prev: [targetIndex - 1, 0], op: 'omission', similarity: 0 }
  }
  for (let heardIndex = 1; heardIndex <= heardCount; heardIndex += 1) {
    matrix[0][heardIndex] = {
      cost: matrix[0][heardIndex - 1].cost + duplicateAdjustedExtraCost(heardWords, heardIndex - 1),
      prev: [0, heardIndex - 1],
      op: 'extra',
      similarity: 0
    }
  }

  for (let targetIndex = 1; targetIndex <= targetCount; targetIndex += 1) {
    for (let heardIndex = 1; heardIndex <= heardCount; heardIndex += 1) {
      const targetWord = targetWords[targetIndex - 1]
      const heardWord = heardWords[heardIndex - 1]
      const allowArticleMatch = options.allowArticleMatch !== false
      const similarity = getRecitationWordSimilarity(targetWord, heardWord.word, { allowArticleMatch })
      const confidenceWeight = Math.max(0.35, Math.min(1, Number(heardWord.confidence ?? 1)))
      const matchCost = getWeightedMatchCost(targetWord, heardWord.word, similarity, confidenceWeight, {
        allowArticleMatch,
      }) + startingAnchorAdjustment(startingAnchor, targetIndex - 1, heardIndex - 1) + (heardIndex - 1) * 1e-9
      const candidates = [
        { cost: matrix[targetIndex - 1][heardIndex - 1].cost + matchCost, prev: [targetIndex - 1, heardIndex - 1], op: 'match', similarity },
        { cost: matrix[targetIndex - 1][heardIndex].cost + 1.02, prev: [targetIndex - 1, heardIndex], op: 'omission', similarity: 0 },
        { cost: matrix[targetIndex][heardIndex - 1].cost + duplicateAdjustedExtraCost(heardWords, heardIndex - 1), prev: [targetIndex, heardIndex - 1], op: 'extra', similarity: 0 }
      ]
      matrix[targetIndex][heardIndex] = candidates.sort((left, right) => left.cost - right.cost || operationTieBreak(left.op) - operationTieBreak(right.op))[0]
    }
  }

  const statuses = displayWords.map((text, index) => ({
    text,
    targetWord: targetWords[index] || '',
    status: 'pending',
    note: '',
    actual: '',
    confidence: 0,
    similarity: 0,
    targetIndex: index,
    ayahKey: targetUnits[index]?.ayahKey || '',
    ayahNumber: targetUnits[index]?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnits[index]?.ayahIndex)) ? Number(targetUnits[index].ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnits[index]?.ayahWordIndex)) ? Number(targetUnits[index].ayahWordIndex) : index,
    ...unmatchedTargetAlignmentFields(),
  }))
  const extraWords = []
  const operations = []
  let targetIndex = targetCount
  let heardIndex = heardCount
  while (targetIndex > 0 || heardIndex > 0) {
    const cell = matrix[targetIndex][heardIndex]
    if (!cell) break
    if (cell.op === 'match') {
      const targetWord = targetWords[targetIndex - 1] || ''
      const heardWord = heardWords[heardIndex - 1] || {}
      const laterIndex = heardWord.word && targetWord !== heardWord.word
        ? findWordLaterIndex(targetWords, heardWord.word, targetIndex)
        : -1
      statuses[targetIndex - 1] = classifyWordMatch({
        displayText: displayWords[targetIndex - 1] || targetWord,
        targetWord,
        heardWord,
        similarity: cell.similarity,
        outOfOrderIndex: laterIndex,
        targetIndex: targetIndex - 1,
        targetUnit: targetUnits[targetIndex - 1] || null,
        correctSimilarity: Number.isFinite(Number(options.correctSimilarity))
          ? Number(options.correctSimilarity)
          : RECITATION_CORRECT_SIMILARITY,
        partialSimilarity: Number.isFinite(Number(options.partialSimilarity)) ? Number(options.partialSimilarity) : 0.48,
        minConfidenceForCorrect: Number.isFinite(Number(options.minConfidenceForCorrect))
          ? Number(options.minConfidenceForCorrect)
          : 0,
        allowArticleMatch: options.allowArticleMatch !== false,
      })
      operations.unshift({ op: 'match', targetIndex: targetIndex - 1, expectedIndex: targetIndex - 1, heardIndex: heardIndex - 1, recognisedIndex: heardIndex - 1, similarity: cell.similarity })
    } else if (cell.op === 'extra') {
      const repeated = isRepeatedHeardWord(heardWords, heardIndex - 1)
      const extraHeard = heardWords[heardIndex - 1] || {}
      const extra = {
        word: extraHeard.word || '',
        display: extraHeard.display || extraHeard.rawWord || extraHeard.word || '',
        rawWord: heardRawWord(extraHeard),
        displayWord: '',
        heardIndex: heardIndex - 1,
        confidence: Number(extraHeard.confidence ?? 1),
        start: finiteOrNull(extraHeard.start ?? extraHeard.startTime),
        end: finiteOrNull(extraHeard.end ?? extraHeard.endTime),
        startTime: finiteOrNull(extraHeard.start ?? extraHeard.startTime),
        endTime: finiteOrNull(extraHeard.end ?? extraHeard.endTime),
        type: repeated ? 'REPETITION' : 'INSERTION',
        legacyType: repeated ? 'repetition' : 'extra'
      }
      Object.assign(extra, withRecognitionDebugFields({}, extraHeard))
      extraWords.unshift(extra)
      operations.unshift({ op: 'extra', expectedIndex: targetIndex, targetIndex, heardIndex: heardIndex - 1, recognisedIndex: heardIndex - 1 })
    } else if (cell.op === 'omission') {
      const omitIndex = targetIndex - 1
      const omitUnit = targetUnits[omitIndex] || null
      statuses[omitIndex] = {
        text: displayWords[omitIndex] || targetWords[omitIndex] || '',
        targetWord: targetWords[omitIndex] || '',
        status: 'omitted',
        note: 'Word was not recited.',
        actual: '',
        confidence: 0,
        similarity: 0,
        targetIndex: omitIndex,
        ayahKey: omitUnit?.ayahKey || '',
        ayahNumber: omitUnit?.ayahNumber ?? null,
        ayahIndex: Number.isFinite(Number(omitUnit?.ayahIndex)) ? Number(omitUnit.ayahIndex) : 0,
        ayahWordIndex: Number.isFinite(Number(omitUnit?.ayahWordIndex)) ? Number(omitUnit.ayahWordIndex) : omitIndex,
        ...unmatchedTargetAlignmentFields(),
      }
      operations.unshift({ op: 'omission', targetIndex: omitIndex, expectedIndex: omitIndex })
    }
    ;[targetIndex, heardIndex] = cell.prev || [0, 0]
  }

  const quranAware = classifyQuranAwareOperations({
    operations,
    statuses,
    extraWords,
    targetWords,
    targetDisplayWords: displayWords,
    heardWords,
    startingAnchor,
    lifecycle: options.lifecycle || 'final',
    hesitationSeconds: options.hesitationSeconds,
    selfCorrectionSeconds: options.selfCorrectionSeconds,
    allowIncomplete: ['live', 'recording', 'paused'].includes(String(options.lifecycle || '').toLowerCase()),
  })
  const isLiveLifecycle = ['live', 'recording', 'paused'].includes(String(options.lifecycle || '').toLowerCase())
  if (isLiveLifecycle && !quranAware.events.some(event => event.type === 'RESTART')) {
    const liveRestart = findLiveRestartEvidence(targetWords, heardWords)
    const restartHasAlignmentConflict = liveRestart
      && statuses.slice(liveRestart.restartEndIndex + 1).some(status => status.status !== 'correct')
    if (liveRestart && restartHasAlignmentConflict) {
      for (let heardIndex = liveRestart.recognisedStartIndex; heardIndex <= liveRestart.recognisedEndIndex; heardIndex += 1) {
        if (extraWords.some(extra => Number(extra.heardIndex) === heardIndex)) continue
        const heard = heardWords[heardIndex] || {}
        extraWords.push({
          word: heard.word || '',
          display: heard.display || heardRawWord(heard),
          rawWord: heardRawWord(heard),
          displayWord: '',
          heardIndex,
          confidence: Number(heard.confidence ?? 1),
          start: finiteOrNull(heard.start ?? heard.startTime),
          end: finiteOrNull(heard.end ?? heard.endTime),
          startTime: finiteOrNull(heard.start ?? heard.startTime),
          endTime: finiteOrNull(heard.end ?? heard.endTime),
          type: 'RESTART',
          classificationType: 'RESTART',
          legacyType: 'extra',
          highlight: 'amber',
          expectedIndex: liveRestart.restartStartIndex,
          recognisedIndex: heardIndex,
          restartStartIndex: liveRestart.restartStartIndex,
          restartEndIndex: liveRestart.restartEndIndex,
          recognisedStartIndex: liveRestart.recognisedStartIndex,
          recognisedEndIndex: liveRestart.recognisedEndIndex,
          ...withRecognitionDebugFields({}, heard),
        })
      }
      quranAware.events.unshift(buildRestartEvent(liveRestart, heardWords))
      quranAware.scenarioCounts.restarts = Number(quranAware.scenarioCounts.restarts || 0) + 1
      for (let index = liveRestart.restartEndIndex + 1; index < statuses.length; index += 1) {
        statuses[index] = {
          ...statuses[index],
          status: 'pending',
          type: 'UNASSESSED',
          note: '',
          actual: '',
          confidence: 0,
          similarity: 0,
          visualStatus: 'neutral',
          ...unmatchedTargetAlignmentFields(),
        }
      }
    }
  }
  // The live restart fallback can turn a provisional DP divergence into
  // UNASSESSED future words. Refresh counters after that mutation so stale
  // red/wrong counts cannot surface as a cascading error.
  quranAware.scenarioCounts = buildQuranScenarioCounts(statuses, extraWords, quranAware.events)
  applyWrongOrderGuard(statuses, targetWords, transcriptWords)
  reconcileUncertainFromRejectedWords(statuses, options.rejectedWords || [], {
    allowArticleMatch: options.allowArticleMatch !== false,
    correctSimilarity: Number.isFinite(Number(options.correctSimilarity))
      ? Number(options.correctSimilarity)
      : RECITATION_CORRECT_SIMILARITY,
    partialSimilarity: Number.isFinite(Number(options.partialSimilarity))
      ? Number(options.partialSimilarity)
      : 0.48,
  })
  const progression = buildStableProgression(statuses, extraWords, options)
  // Keep low-confidence extras in the raw alignment for debugging, but do not
  // surface them as learner extra-word mistakes or apply an extra penalty.
  const reportableExtraWords = extraWords.filter(word => word.type !== 'UNASSESSED')
  const structural = buildStructuralRecitationAnalysis({
    statuses,
    heardWords: rawHeardWords,
    extraWords,
    events: quranAware.events,
    scenarioCounts: quranAware.scenarioCounts,
    targetAyahs,
    targetUnits,
    operations
  })
  const mistakes = buildMistakesFromStatuses(statuses, reportableExtraWords, structural)
  const analysis = buildAnalysis({
    statuses,
    heardWords,
    rawHeardWords,
    extraWords: reportableExtraWords,
    mistakes,
    targetWords,
    targetAyahs,
    targetUnits,
    targetText,
    operations,
    progression,
    structural,
    metadata: options.metadata || {}
  })

  return {
    sourceOfTruth: 'selected-ayah',
    targetText,
    displayWords,
    targetWords,
    committedWords: heardWords,
    rawCommittedWords: rawHeardWords,
    transcript: wordsToTranscript(heardWords),
    statuses,
    wordStatuses: statuses,
    extraWords,
    events: quranAware.events,
    scenarioCounts: quranAware.scenarioCounts,
    operations,
    mistakes,
    mistakeBreakdown: mistakes,
    structural,
    progression,
    analysis,
    startingAnchor
  }
}

function classifyQuranAwareOperations({
  operations = [],
  statuses = [],
  extraWords = [],
  targetWords = [],
  targetDisplayWords = [],
  heardWords = [],
  startingAnchor = null,
  lifecycle = 'final',
  hesitationSeconds = RECITATION_PAUSE_POLICY.hesitationSeconds,
  selfCorrectionSeconds = RECITATION_PAUSE_POLICY.selfCorrectionSeconds,
  allowIncomplete = false,
} = {}) {
  const finalised = !['live', 'recording', 'paused'].includes(String(lifecycle || '').toLowerCase())
  const resolved = operation => {
    if (operation?.op !== 'match') return false
    const status = statuses[Number(operation.expectedIndex)]?.status
    return status === 'correct'
  }

  for (const operation of operations) {
    if (operation.op === 'match') {
      const status = statuses[Number(operation.expectedIndex)]?.status
      operation.type = status === 'correct' ? 'MATCH' : (status === 'uncertain' ? 'UNASSESSED' : 'SUBSTITUTION')
    } else if (operation.op === 'omission') {
      operation.type = finalised ? 'DELETION' : 'UNASSESSED'
    } else {
      operation.type = 'INSERTION'
    }
  }

  const restartGroups = detectRestartGroups({
    operations,
    targetWords,
    heardWords,
    correctSimilarity: RECITATION_CORRECT_SIMILARITY,
    hesitationSeconds,
    allowIncomplete: !finalised,
  })
  const midStartRestart = detectMidStartRestart(targetWords, heardWords, startingAnchor, finalised)
  if (midStartRestart) restartGroups.push(midStartRestart)
  for (const group of restartGroups) {
    for (const operation of operations) {
      if (
        operation.op !== 'extra'
        || Number(operation.recognisedIndex) < group.recognisedStartIndex
        || Number(operation.recognisedIndex) > group.recognisedEndIndex
      ) continue
      operation.type = 'RESTART'
      Object.assign(operation, group)
    }
  }

  const selfCorrectionGroups = []
  for (let index = 0; index < operations.length; index += 1) {
    const operation = operations[index]
    if (operation.op !== 'extra' || operation.type !== 'INSERTION') continue
    const heardIndex = Number(operation.recognisedIndex)
    const expectedIndex = Number(operation.expectedIndex)
    const heard = heardWords[heardIndex] || {}
    const word = String(heard.word || '')
    const previous = heardIndex > 0 ? String(heardWords[heardIndex - 1]?.word || '') : ''
    if (isLowConfidenceRecognitionWord(heard) && !wordIsStructuralExtra(word, previous, targetWords, expectedIndex)) {
      operation.type = 'UNASSESSED'
      continue
    }
    if (expectedIndex >= targetWords.length) {
      operation.type = 'OUT_OF_RANGE'
      continue
    }
    if (word && word === previous) {
      operation.type = 'REPETITION'
      continue
    }

    // A previously recited target word is a backward move, not a correction.
    // Restart detection above may claim a longer span; a lone occurrence is
    // retained as repetition so it cannot become an amber correction.
    if (targetWords.slice(0, Math.max(0, expectedIndex)).includes(word)) {
      operation.type = 'REPETITION'
      continue
    }

    let end = index
    while (
      end + 1 < operations.length
      && operations[end + 1]?.op === 'extra'
      && operations[end + 1]?.type === 'INSERTION'
      && Number(operations[end + 1]?.expectedIndex) === expectedIndex
      && Number(operations[end + 1]?.recognisedIndex) === Number(operations[end]?.recognisedIndex) + 1
    ) {
      end += 1
    }
    const correction = operations[end + 1]
    const correctedHeardIndex = Number(correction?.recognisedIndex)
    const currentEnd = finiteOrNull(heardWords[Number(operations[end]?.recognisedIndex)]?.end ?? heardWords[Number(operations[end]?.recognisedIndex)]?.endTime)
    const correctedStart = finiteOrNull(heardWords[correctedHeardIndex]?.start ?? heardWords[correctedHeardIndex]?.startTime)
    const pause = currentEnd != null && correctedStart != null ? Math.max(0, correctedStart - currentEnd) : 0
    if (
      correction?.op === 'match'
      && Number(correction.expectedIndex) === expectedIndex
      && resolved(correction)
      && pause >= resolveSelfCorrectionPauseSeconds(selfCorrectionSeconds)
    ) {
      let correctedEnd = end + 1
      while (
        correctedEnd + 1 < operations.length
        && resolved(operations[correctedEnd + 1])
        && Number(operations[correctedEnd + 1].expectedIndex) === Number(operations[correctedEnd].expectedIndex) + 1
        && Number(operations[correctedEnd + 1].recognisedIndex) === Number(operations[correctedEnd].recognisedIndex) + 1
      ) {
        correctedEnd += 1
      }
      const correctedTargetWords = operations
        .slice(end + 1, correctedEnd + 1)
        .map(item => targetDisplayWords[Number(item.expectedIndex)] || targetWords[Number(item.expectedIndex)] || '')
        .filter(Boolean)
      const group = {
        correctionGroupId: `self-correction:${expectedIndex}:${Number(operation.recognisedIndex)}:${Number(operations[end].recognisedIndex)}`,
        self_correction_group_id: `self-correction:${expectedIndex}:${Number(operation.recognisedIndex)}:${Number(operations[end].recognisedIndex)}`,
        correctedTargetIndex: expectedIndex,
        corrected_target_index: expectedIndex,
        correctedTargetWord: correctedTargetWords.join(' '),
        corrected_target_word: correctedTargetWords.join(' '),
        correctedTargetWords,
        corrected_target_words: correctedTargetWords,
        recognisedStartIndex: Number(operation.recognisedIndex),
        recognisedEndIndex: Number(operations[end].recognisedIndex),
        recognised_start_index: Number(operation.recognisedIndex),
        recognised_end_index: Number(operations[end].recognisedIndex),
        correctedTargetEndIndex: Number(operations[correctedEnd]?.expectedIndex ?? expectedIndex),
        corrected_target_end_index: Number(operations[correctedEnd]?.expectedIndex ?? expectedIndex),
      }
      for (let groupIndex = index; groupIndex <= end; groupIndex += 1) {
        operations[groupIndex].type = 'SELF_CORRECTION'
        Object.assign(operations[groupIndex], group)
      }
      selfCorrectionGroups.push({ ...group, correctionIndex: end + 1, pause })
      index = end
    }
  }

  const reliableAnchorRunLength = start => {
    let length = 0
    let previousExpected = null
    let previousRecognised = null
    for (let index = start; index < operations.length; index += 1) {
      const operation = operations[index]
      if (!resolved(operation)) break
      const expectedIndex = Number(operation.expectedIndex)
      const recognisedIndex = Number(operation.recognisedIndex)
      if (
        previousExpected !== null
        && (expectedIndex !== previousExpected + 1 || recognisedIndex !== previousRecognised + 1)
      ) break
      if (isLowConfidenceRecognitionWord(heardWords[recognisedIndex])) break
      length += 1
      previousExpected = expectedIndex
      previousRecognised = recognisedIndex
    }
    return length
  }

  const anchorRuns = []
  for (let start = 0; start < operations.length;) {
    const length = reliableAnchorRunLength(start)
    if (length >= 2) {
      anchorRuns.push({ start, end: start + length - 1 })
      start += length
    } else {
      start += 1
    }
  }

  // If the path has no return anchor, rebase a confident coherent tail from
  // the last stable anchor. This prevents DP from shifting the wrong phrase
  // onto later expected slots and preserves its indexes.
  if (anchorRuns.length === 1) {
    const anchor = anchorRuns[0]
    let divergentMatches = 0
    for (let index = anchor.end + 1; index < operations.length; index += 1) {
      const operation = operations[index]
      const heard = heardWords[Number(operation?.recognisedIndex)] || {}
      if (
        operation?.op === 'match'
        && operation.type === 'SUBSTITUTION'
        && !isLowConfidenceRecognitionWord(heard)
      ) divergentMatches += 1
    }
    if (divergentMatches >= 2) {
      let nextExpected = Number(operations[anchor.end]?.expectedIndex) + 1
      let nextRecognised = Number(operations[anchor.end]?.recognisedIndex) + 1
      const rebased = operations.slice(0, anchor.end + 1)
      while (nextExpected < targetWords.length && nextRecognised < heardWords.length) {
        const heard = heardWords[nextRecognised] || {}
        const similarity = getRecitationWordSimilarity(targetWords[nextExpected], heard.word)
        rebased.push({
          op: 'match',
          expectedIndex: nextExpected,
          targetIndex: nextExpected,
          heardIndex: nextRecognised,
          recognisedIndex: nextRecognised,
          similarity,
          type: isLowConfidenceRecognitionWord(heard)
            ? 'UNASSESSED'
            : (similarity >= RECITATION_CORRECT_SIMILARITY ? 'MATCH' : 'SUBSTITUTION'),
        })
        nextExpected += 1
        nextRecognised += 1
      }
      while (nextExpected < targetWords.length) {
        rebased.push({
          op: 'omission',
          targetIndex: nextExpected,
          expectedIndex: nextExpected,
          type: finalised ? 'DELETION' : 'UNASSESSED',
        })
        nextExpected += 1
      }
      while (nextRecognised < heardWords.length) {
        rebased.push({
          op: 'extra',
          targetIndex: targetWords.length,
          expectedIndex: targetWords.length,
          heardIndex: nextRecognised,
          recognisedIndex: nextRecognised,
          type: 'OUT_OF_RANGE',
        })
        nextRecognised += 1
      }
      operations.splice(0, operations.length, ...rebased)
    }
  }

  // A similar ayah can open the attempt, so the first reliable run is the
  // return rather than a prefix. Two confident substitutions before that
  // two-word anchor are divergence. One shared word is not an anchor.
  if (anchorRuns.length && anchorRuns[0].start >= 2) {
    const recovery = anchorRuns[0]
    let openingDivergence = 0
    for (let index = 0; index < recovery.start; index += 1) {
      const operation = operations[index]
      const heard = heardWords[Number(operation?.recognisedIndex)] || {}
      if (
        operation?.op === 'match'
        && operation.type === 'SUBSTITUTION'
        && !isLowConfidenceRecognitionWord(heard)
      ) openingDivergence += 1
    }
    if (openingDivergence >= 2) {
      for (let index = 0; index < recovery.start; index += 1) {
        if (operations[index]?.op === 'match' && operations[index].type === 'SUBSTITUTION') {
          operations[index].type = 'DIVERGENCE'
        }
      }
      operations[recovery.start].type = 'REALIGNMENT'
    }
  }

  // One matching word inside a similar phrase is not enough evidence to
  // resynchronise. Require a two-word expected/recognised recovery anchor.
  for (let runIndex = 1; runIndex < anchorRuns.length; runIndex += 1) {
    const previous = anchorRuns[runIndex - 1]
    const recovery = anchorRuns[runIndex]
    const start = previous.end + 1
    const end = recovery.start - 1
    let divergentMatches = 0
    for (let index = start; index <= end; index += 1) {
      const operation = operations[index]
      const heard = heardWords[Number(operation?.recognisedIndex)] || {}
      if (
        operation?.op === 'match'
        && operation.type === 'SUBSTITUTION'
        && !isLowConfidenceRecognitionWord(heard)
      ) divergentMatches += 1
    }
    if (divergentMatches < 2) continue
    for (let index = start; index <= end; index += 1) {
      if (operations[index]?.op !== 'extra') operations[index].type = 'DIVERGENCE'
    }
    operations[recovery.start].type = 'REALIGNMENT'
  }

  // No return anchor: keep only confident wrong matches as an unresolved
  // divergence. Omissions and low-confidence recognition remain distinct.
  if (anchorRuns.length) {
    const lastAnchor = anchorRuns[anchorRuns.length - 1]
    const start = lastAnchor.end + 1
    let divergentMatches = 0
    for (let index = start; index < operations.length; index += 1) {
      const operation = operations[index]
      const heard = heardWords[Number(operation?.recognisedIndex)] || {}
      if (
        operation?.op === 'match'
        && operation.type === 'SUBSTITUTION'
        && !isLowConfidenceRecognitionWord(heard)
      ) divergentMatches += 1
    }
    if (divergentMatches >= 2) {
      for (let index = start; index < operations.length; index += 1) {
        if (operations[index]?.op === 'match' && operations[index].type === 'SUBSTITUTION') {
          operations[index].type = 'DIVERGENCE'
        }
      }
    }
  }

  for (const operation of operations) {
    if (operation.op === 'extra') continue
    const expectedIndex = Number(operation.expectedIndex)
    const status = statuses[expectedIndex]
    if (!status) continue
    status.type = operation.type
    status.expectedIndex = expectedIndex
    status.recognisedIndex = Number.isFinite(Number(operation.recognisedIndex)) ? Number(operation.recognisedIndex) : null
    if (operation.type === 'UNASSESSED') {
      status.status = operation.op === 'omission' ? 'pending' : 'uncertain'
      status.note = ''
      status.visualStatus = 'neutral'
      status.highlight = 'neutral'
    } else if (operation.type === 'DELETION') {
      // Keep omission semantics for analytics, but make a confirmed skipped
      // expected word the only red target in the aligned sequence.
      status.visualStatus = 'red'
      status.highlight = 'red'
    } else if (operation.type === 'DIVERGENCE') {
      status.status = 'incorrect'
      status.visualStatus = 'red'
      status.highlight = 'red'
    } else if (operation.type === 'REALIGNMENT') {
      status.status = 'correct'
      status.visualStatus = 'green'
      status.highlight = 'green'
      status.realigned = true
    } else if (operation.type === 'MATCH') {
      status.visualStatus = 'green'
      status.highlight = 'green'
    }
  }

  const extrasByHeardIndex = new Map(extraWords.map(extra => [Number(extra.heardIndex), extra]))
  for (const operation of operations) {
    if (operation.op !== 'extra') continue
    const extra = extrasByHeardIndex.get(Number(operation.recognisedIndex))
    if (!extra) continue
    extra.type = operation.type
    extra.classificationType = operation.type
    extra.highlight = ['REPETITION', 'SELF_CORRECTION', 'RESTART'].includes(operation.type)
      ? 'amber'
      : (operation.type === 'INSERTION' ? 'red' : 'neutral')
    extra.visualStatus = extra.highlight
    extra.visual_status = extra.highlight
    extra.expectedIndex = Number(operation.expectedIndex)
    extra.recognisedIndex = Number(operation.recognisedIndex)
    if (operation.type === 'SELF_CORRECTION') {
      for (const key of [
        'correctionGroupId',
        'self_correction_group_id',
        'correctedTargetIndex',
        'corrected_target_index',
        'correctedTargetWord',
        'corrected_target_word',
        'correctedTargetWords',
        'corrected_target_words',
        'correctedTargetEndIndex',
        'corrected_target_end_index',
        'recognisedStartIndex',
        'recognisedEndIndex',
        'recognised_start_index',
        'recognised_end_index',
      ]) {
        if (operation[key] !== undefined) extra[key] = operation[key]
      }
      // Each preserved wrong token points at the first corrected target word;
      // the event carries the complete corrected phrase when one exists.
      extra.correctedTargetWord = targetDisplayWords[Number(operation.expectedIndex)] || targetWords[Number(operation.expectedIndex)] || ''
      extra.corrected_target_word = extra.correctedTargetWord
    }
    if (operation.type === 'RESTART') {
      for (const key of [
        'restartStartIndex',
        'restartEndIndex',
        'recognisedStartIndex',
        'recognisedEndIndex',
        'restart_start_index',
        'restart_end_index',
        'recognised_start_index',
        'recognised_end_index',
      ]) {
        if (operation[key] !== undefined) extra[key] = operation[key]
      }
    }
    if (operation.type === 'INSERTION' && statuses.length) {
      const anchorIndex = Math.max(0, Math.min(
        statuses.length - 1,
        Number(operation.expectedIndex) > 0 ? Number(operation.expectedIndex) - 1 : 0,
      ))
      extra.markerTargetIndex = anchorIndex
      extra.markerPosition = Number(operation.expectedIndex) > 0 ? 'after' : 'before'
      statuses[anchorIndex].attachedErrorMarkers = [
        ...(Array.isArray(statuses[anchorIndex].attachedErrorMarkers) ? statuses[anchorIndex].attachedErrorMarkers : []),
        {
          type: 'INSERTION',
          word: extra.display || extra.word || '',
          recognisedIndex: extra.recognisedIndex,
          expectedIndex: extra.expectedIndex,
        },
      ]
    }
  }

  const events = restartGroups.map(group => buildRestartEvent(group, heardWords))
  for (const group of selfCorrectionGroups) {
    const wrongTokens = heardWords
      .slice(group.recognisedStartIndex, group.recognisedEndIndex + 1)
      .map(word => heardRawWord(word))
      .filter(Boolean)
    events.push({
      type: 'SELF_CORRECTION',
      status: 'extra',
      visualStatus: 'amber',
      visual_status: 'amber',
      highlight: 'amber',
      wrongTokens,
      wrong_tokens: wrongTokens,
      correctedTargetWord: group.correctedTargetWord,
      corrected_target_word: group.corrected_target_word,
      correctedTargetWords: group.correctedTargetWords,
      corrected_target_words: group.corrected_target_words,
      correctedTargetIndex: group.correctedTargetIndex,
      corrected_target_index: group.corrected_target_index,
      recognisedStartIndex: group.recognisedStartIndex,
      recognisedEndIndex: group.recognisedEndIndex,
      recognised_start_index: group.recognised_start_index,
      recognised_end_index: group.recognised_end_index,
      correctionGroupId: group.correctionGroupId,
      self_correction_group_id: group.self_correction_group_id,
      startTime: finiteOrNull(heardWords[group.recognisedStartIndex]?.start ?? heardWords[group.recognisedStartIndex]?.startTime),
      endTime: finiteOrNull(heardWords[group.recognisedEndIndex]?.end ?? heardWords[group.recognisedEndIndex]?.endTime),
      pause: group.pause,
    })
  }
  events.push(...detectHesitationEvents({
    statuses,
    extraWords,
    heardWords,
    lifecycle,
    hesitationSeconds,
  }))

  const scenarioCounts = buildQuranScenarioCounts(statuses, extraWords, events, restartGroups.length)

  return { events, scenarioCounts }
}

function buildQuranScenarioCounts(statuses = [], extraWords = [], events = [], restartCount = null) {
  const selfCorrectionGroupIds = new Set(
    extraWords
      .filter(word => word.type === 'SELF_CORRECTION')
      .map(word => word.correctionGroupId || word.self_correction_group_id || `${word.expectedIndex}:${word.heardIndex}`),
  )
  const scenarioCounts = {
    correct_words: statuses.filter(word => word.type === 'MATCH' || word.type === 'REALIGNMENT' || word.status === 'correct').length,
    wrong_words: statuses.filter(word => word.type === 'SUBSTITUTION' || word.type === 'DIVERGENCE' || word.status === 'incorrect').length,
    skipped_words: statuses.filter(word => word.type === 'DELETION' || word.status === 'omitted').length,
    extra_words: extraWords.filter(word => word.type === 'INSERTION').length,
    repetitions: extraWords.filter(word => word.type === 'REPETITION').length,
    self_corrections: selfCorrectionGroupIds.size,
    unresolved_mistakes: statuses.filter(word => ['SUBSTITUTION', 'DIVERGENCE', 'DELETION'].includes(word.type)).length
      + extraWords.filter(word => word.type === 'INSERTION').length,
    self_corrected_mistakes: selfCorrectionGroupIds.size,
    hesitations: events.filter(event => event.type === 'HESITATION').length,
    restarts: restartCount == null
      ? events.filter(event => event.type === 'RESTART').length
      : restartCount,
    out_of_range_words: extraWords.filter(word => word.type === 'OUT_OF_RANGE').length,
    divergence_events: statuses.filter(word => word.type === 'DIVERGENCE').length,
    unassessed_events: statuses.filter(word => word.type === 'UNASSESSED').length
      + extraWords.filter(word => word.type === 'UNASSESSED').length,
  }

  return scenarioCounts
}

/**
 * Find a deliberate backward move in the monotonic DP path.
 *
 * A single earlier word is deliberately not enough: it is usually a repeated
 * word or an ASR re-emit. A restart needs prior resolved progress, two or more
 * consecutive earlier target words which are all extra operations, and either
 * an immediate forward continuation or a clear pause before the restart.
 */
function detectRestartGroups({
  operations = [],
  targetWords = [],
  heardWords = [],
  correctSimilarity = RECITATION_CORRECT_SIMILARITY,
  hesitationSeconds = RECITATION_PAUSE_POLICY.hesitationSeconds,
  allowIncomplete = false,
} = {}) {
  const extrasByHeardIndex = new Map(
    operations
      .filter(operation => operation?.op === 'extra')
      .map(operation => [Number(operation.recognisedIndex), operation]),
  )
  const resolved = operation => (
    operation?.op === 'match'
    && targetWords[Number(operation.expectedIndex)]
    && heardWords[Number(operation.recognisedIndex)]
    && getRecitationWordSimilarity(
      targetWords[Number(operation.expectedIndex)],
      heardWords[Number(operation.recognisedIndex)].word,
    ) >= correctSimilarity
  )
  const isAnchorMatch = (targetIndex, heardIndex) => {
    const target = targetWords[targetIndex]
    const heard = heardWords[heardIndex]
    if (!target || !heard || isLowConfidenceRecognitionWord(heard)) return false
    return getRecitationWordSimilarity(target, heard.word) >= correctSimilarity
  }
  const groups = []
  const claimed = new Set()

  for (const operation of operations) {
    if (operation?.op !== 'extra') continue
    const heardStart = Number(operation.recognisedIndex)
    const expectedIndex = Number(operation.expectedIndex)
    if (!Number.isFinite(heardStart) || !Number.isFinite(expectedIndex) || claimed.has(heardStart)) continue

    let best = null
    for (let restartStart = expectedIndex - 1; restartStart >= 0; restartStart -= 1) {
      if (!isAnchorMatch(restartStart, heardStart)) continue
      const priorProgress = operations.some(previous => (
        resolved(previous)
        && Number(previous.expectedIndex) >= restartStart
        && Number(previous.expectedIndex) < expectedIndex
        && Number(previous.recognisedIndex) < heardStart
      ))
      if (!priorProgress) continue

      let length = 0
      while (
        extrasByHeardIndex.has(heardStart + length)
        && isAnchorMatch(restartStart + length, heardStart + length)
      ) {
        length += 1
      }
      if (length < 2) continue

      const continuationTargetIndex = restartStart + length
      const continuationHeardIndex = heardStart + length
      const continuation = continuationTargetIndex < targetWords.length
        && isAnchorMatch(continuationTargetIndex, continuationHeardIndex)
        && resolved(operations.find(candidate => Number(candidate.recognisedIndex) === continuationHeardIndex))
      const previousHeard = heardWords[heardStart - 1]
      const currentHeard = heardWords[heardStart]
      const previousEnd = finiteOrNull(previousHeard?.end ?? previousHeard?.endTime)
      const currentStart = finiteOrNull(currentHeard?.start ?? currentHeard?.startTime)
      const pause = previousEnd != null && currentStart != null
        ? Math.max(0, currentStart - previousEnd)
        : 0
      if (!continuation && !allowIncomplete && pause < resolveHesitationPauseSeconds(hesitationSeconds)) continue

      const candidate = {
        restartStartIndex: restartStart,
        restartEndIndex: restartStart + length - 1,
        recognisedStartIndex: heardStart,
        recognisedEndIndex: heardStart + length - 1,
        restart_start_index: restartStart,
        restart_end_index: restartStart + length - 1,
        recognised_start_index: heardStart,
        recognised_end_index: heardStart + length - 1,
      }
      if (!best || length > best.restartEndIndex - best.restartStartIndex + 1) best = candidate
    }
    if (!best) continue
    groups.push(best)
    for (let index = best.recognisedStartIndex; index <= best.recognisedEndIndex; index += 1) claimed.add(index)
  }
  return groups
}

/**
 * If the first pass starts mid-ayah and the learner subsequently says the
 * opening phrase, the DP's authoritative path is the later complete pass. The
 * discarded initial phrase is restart evidence, not an insertion/error.
 */
function detectMidStartRestart(targetWords = [], heardWords = [], startingAnchor = null, finalised = true) {
  if (!startingAnchor || Number(startingAnchor.expectedIndex) < 1) return null
  const length = Number(startingAnchor.length || 0)
  if (length < 2 || heardWords.length <= length + 1) return null

  const matches = (targetIndex, heardIndex) => {
    const target = targetWords[targetIndex]
    const heard = heardWords[heardIndex]
    return !!target
      && !!heard?.word
      && !isLowConfidenceRecognitionWord(heard)
      && getRecitationWordSimilarity(target, heard.word) >= RECITATION_CORRECT_SIMILARITY
  }
  for (let index = length; index + 1 < heardWords.length; index += 1) {
    if (!matches(0, index) || !matches(1, index + 1)) continue
    const hasContinuation = index + 2 >= heardWords.length
      || !targetWords[2]
      || matches(2, index + 2)
    if (!hasContinuation || (!finalised && index + 2 >= heardWords.length)) continue
    return {
      restartStartIndex: 0,
      restartEndIndex: Number(startingAnchor.expectedIndex) + length - 1,
      recognisedStartIndex: 0,
      recognisedEndIndex: length - 1,
      restart_start_index: 0,
      restart_end_index: Number(startingAnchor.expectedIndex) + length - 1,
      recognised_start_index: 0,
      recognised_end_index: length - 1,
    }
  }
  return null
}

function findLiveRestartEvidence(targetWords = [], heardWords = []) {
  const matches = (targetIndex, heardIndex) => {
    const target = targetWords[targetIndex]
    const heard = heardWords[heardIndex]
    return !!target
      && !!heard
      && !isLowConfidenceRecognitionWord(heard)
      && getRecitationWordSimilarity(target, heard.word) >= RECITATION_CORRECT_SIMILARITY
  }
  for (let restartStartIndex = 0; restartStartIndex + 1 < targetWords.length; restartStartIndex += 1) {
    for (let firstStart = 0; firstStart + 1 < heardWords.length; firstStart += 1) {
      if (!matches(restartStartIndex, firstStart) || !matches(restartStartIndex + 1, firstStart + 1)) continue
      for (let secondStart = firstStart + 2; secondStart + 1 < heardWords.length; secondStart += 1) {
        if (!matches(restartStartIndex, secondStart) || !matches(restartStartIndex + 1, secondStart + 1)) continue
        return {
          restartStartIndex,
          restartEndIndex: restartStartIndex + 1,
          recognisedStartIndex: secondStart,
          recognisedEndIndex: secondStart + 1,
          restart_start_index: restartStartIndex,
          restart_end_index: restartStartIndex + 1,
          recognised_start_index: secondStart,
          recognised_end_index: secondStart + 1,
        }
      }
    }
  }
  return null
}

function buildRestartEvent(group = {}, heardWords = []) {
  const first = heardWords[group.recognisedStartIndex] || {}
  const last = heardWords[group.recognisedEndIndex] || {}
  const startTime = finiteOrNull(first.start ?? first.startTime)
  const endTime = finiteOrNull(last.end ?? last.endTime)
  return {
    type: 'RESTART',
    status: 'extra',
    visualStatus: 'amber',
    highlight: 'amber',
    startIndex: group.restartStartIndex,
    endIndex: group.restartEndIndex,
    recognisedStartIndex: group.recognisedStartIndex,
    recognisedEndIndex: group.recognisedEndIndex,
    restartStartIndex: group.restartStartIndex,
    restartEndIndex: group.restartEndIndex,
    restart_start_index: group.restartStartIndex,
    restart_end_index: group.restartEndIndex,
    startTime,
    endTime,
    start_time: startTime,
    end_time: endTime,
    duration: startTime != null && endTime != null ? Math.max(0, endTime - startTime) : null,
    classificationConfidence: 0.9,
  }
}

export function buildDeterministicRecitationResult(targetText = '', recognitionWords = [], options = {}) {
  const alignment = buildQuranAlignment(targetText, recognitionWords, options)
  const statuses = alignment.statuses
  const mistakes = alignment.mistakes
  const targetCount = Math.max(1, alignment.targetWords.length)
  const correctScore = statuses.filter(word => word.status === 'correct').length
  const partialScore = statuses.filter(word => word.status === 'partial').reduce((sum, word) => {
    const confidence = Number.isFinite(Number(word.confidence)) ? Number(word.confidence) : 1
    // Amber credit stays modest so soft/ASR near-misses do not inflate accuracy.
    return sum + (RECITATION_THRESHOLDS.partialAccuracyWeight * Math.max(0.25, Math.min(1, confidence)))
  }, 0)
  const uncertainScore = statuses.filter(word => word.status === 'uncertain').length
    * RECITATION_THRESHOLDS.uncertainAccuracyWeight
  const wrongOrderPenalty = statuses.filter(word => word.outOfOrder).length
    * RECITATION_THRESHOLDS.wrongOrderPenalty
  const extraPenalty = (mistakes.extra.length || 0) * RECITATION_THRESHOLDS.extraPenalty
  const baseAccuracyScore = Math.max(0, Math.min(100, Math.round(((correctScore + partialScore + uncertainScore - wrongOrderPenalty - extraPenalty) / targetCount) * 100)))
  const structuralPenalty = getStructuralScorePenalty(alignment.structural || {})
  const accuracyScore = Math.max(0, Math.min(100, baseAccuracyScore - structuralPenalty))
  const confidence = getEvaluationConfidence({
    statuses,
    committedWords: alignment.committedWords,
    structural: alignment.structural,
    accuracyScore
  })
  const memoryStrength = getMemoryStrength(accuracyScore)
  const recommendation = getRecitationRecommendation(accuracyScore, mistakes)
  const reviewMetadata = buildReviewMetadata(accuracyScore, mistakes, {
    timestamp: options.timestamp || options.metadata?.timestamp || DEFAULT_ANALYSIS_TIMESTAMP
  })
  const colorCounts = getRecitationColorCounts(statuses)
  const weakAyahs = deriveWeakAyahsFromWordStatuses(statuses)

  return {
    id: options.id || deterministicResultId(targetText, alignment.committedWords),
    timestamp: options.timestamp || options.metadata?.timestamp || DEFAULT_ANALYSIS_TIMESTAMP,
    sourceOfTruth: 'selected-ayah',
    transcript: alignment.transcript,
    targetText,
    ayahRange: options.ayahRange || null,
    score: accuracyScore,
    accuracyScore,
    confidence,
    memoryStrength,
    completion: alignment.analysis.completionPercentage,
    completionPercentage: alignment.analysis.completionPercentage,
    mistakes,
    mistakeBreakdown: mistakes,
    deterministicAnalysis: alignment.analysis,
    missingWords: alignment.analysis.omissions,
    extraWords: alignment.extraWords,
    alignmentEvents: alignment.events,
    scenarioCounts: alignment.scenarioCounts,
    incorrectWords: alignment.analysis.substitutions,
    repeatedWords: alignment.analysis.repeatedWords,
    repeatedPhrases: alignment.analysis.repeatedPhrases,
    omissions: alignment.analysis.omissions,
    substitutions: alignment.analysis.substitutions,
    repetitions: alignment.analysis.repetitions,
    skippedWords: alignment.analysis.skippedWords,
    wordSkips: alignment.analysis.skippedWords,
    skippedAyahs: alignment.analysis.skippedAyahs,
    verseJumpDetected: alignment.analysis.verseJumpDetected,
    verseJumps: alignment.analysis.verseJumps,
    sequenceErrors: alignment.analysis.sequenceErrors,
    feedback: alignment.analysis.feedback,
    weakWords: alignment.analysis.weakWords,
    reviewRecommendations: alignment.analysis.reviewRecommendations,
    retentionSignals: alignment.analysis.retentionSignals,
    wordStatuses: statuses,
    colorCounts,
    weakAyahs,
    committedWords: alignment.committedWords,
    alignmentState: alignment.progression,
    recommendation,
    reviewMetadata
  }
}

export function replayRecognitionSession(events = [], targetText = '', options = {}) {
  let state = createRecognitionState()
  for (const event of events) {
    state = stabilizeRecognitionEvent(state, event, options)
  }
  return buildDeterministicRecitationResult(targetText, state.committedWords, options)
}

function normalizeTargetAyahs(ayahs = [], targetText = '') {
  const list = (Array.isArray(ayahs) ? ayahs : [])
    .map((ayah, index) => {
      const text = cleanRecitationDisplayText(ayah?.text || ayah?.arabic || ayah?.arabicText || ayah?.targetText || '')
      if (!text) return null
      return {
        key: ayah?.key || ayah?.ayahKey || '',
        number: Number.isFinite(Number(ayah?.number ?? ayah?.ayahNumber)) ? Number(ayah?.number ?? ayah?.ayahNumber) : null,
        index,
        text
      }
    })
    .filter(Boolean)

  if (list.length) return list
  const text = cleanRecitationDisplayText(targetText)
  return text ? [{ key: '', number: null, index: 0, text }] : []
}

function buildTargetWordUnits(targetAyahs = [], targetText = '') {
  const ayahs = targetAyahs.length ? targetAyahs : normalizeTargetAyahs([], targetText)
  const units = []
  ayahs.forEach((ayah, ayahIndex) => {
    const displayWords = tokenizeRecitationDisplayWords(ayah.text)
    displayWords.forEach((display, ayahWordIndex) => {
      const word = tokenizeRecitationWords(display)[0] || ''
      if (!word) return
      units.push({
        display,
        displayWord: display,
        word,
        targetIndex: units.length,
        ayahKey: ayah.key || '',
        ayahNumber: ayah.number ?? null,
        ayahIndex,
        ayahWordIndex
      })
    })
  })
  return units
}

function cloneRecognitionState(state) {
  return {
    rawEvents: Array.isArray(state?.rawEvents) ? state.rawEvents.map(event => ({ ...event, words: (event.words || []).map(word => ({ ...word })) })) : [],
    bufferedSegments: Object.entries(state?.bufferedSegments || {}).reduce((carry, [key, segment]) => {
      carry[key] = { ...segment, words: (segment.words || []).map(word => ({ ...word })) }
      return carry
    }, {}),
    committedWords: Array.isArray(state?.committedWords) ? state.committedWords.map(word => ({ ...word })) : [],
    interimWords: Array.isArray(state?.interimWords) ? state.interimWords.map(word => ({ ...word })) : [],
    interimSegment: state?.interimSegment
      ? {
          ...state.interimSegment,
          words: (state.interimSegment.words || []).map(word => ({ ...word }))
        }
      : null,
    rejectedWords: Array.isArray(state?.rejectedWords) ? state.rejectedWords.map(word => ({ ...word })) : [],
    sequence: Number(state?.sequence || 0)
  }
}

function projectRecognitionSegments(segments = {}, interimSegment = null) {
  const projected = Object.entries(segments || {}).reduce((carry, [key, segment]) => {
    carry[key] = {
      ...segment,
      words: (segment?.words || []).map(word => ({ ...word }))
    }
    return carry
  }, {})

  if (interimSegment?.words?.length) {
    const existingKey = findSupersededSegmentKey(projected, interimSegment)
    const segmentKey = existingKey || interimSegment.segmentId || `interim:${interimSegment.provider || 'unknown'}:${interimSegment.sequence || 0}`
    const candidate = {
      ...interimSegment,
      segmentId: segmentKey,
      words: (interimSegment.words || []).map(word => ({ ...word, segmentId: segmentKey }))
    }
    projected[segmentKey] = selectPreferredRecognitionSegment(projected[segmentKey], candidate)
  }

  return Object.values(projected)
    .filter(segment => Array.isArray(segment.words) && segment.words.length)
    .sort((left, right) => {
      const leftStart = finiteOrNull(left.start)
      const rightStart = finiteOrNull(right.start)
      if (leftStart !== null && rightStart !== null && leftStart !== rightStart) return leftStart - rightStart
      if (leftStart !== null && rightStart === null) return -1
      if (leftStart === null && rightStart !== null) return 1
      return Number(left.sequence || 0) - Number(right.sequence || 0)
    })
}

function findExactWordIndexWithinWindow(words = [], word = '', fromIndex = 0, lookahead = 5, options = {}) {
  if (!word) return -1
  const windowSize = Number(lookahead)
  if (!Number.isFinite(windowSize) || windowSize <= 0) return -1
  const allowArticleMatch = options.allowArticleMatch !== false
  const end = Math.min(words.length, Math.max(fromIndex, 0) + windowSize)
  for (let index = Math.max(0, fromIndex); index < end; index += 1) {
    const candidate = words[index] || ''
    if (candidate === word) return index
    if (arabicAlefOptionalEqual(candidate, word)) return index
    if (!allowArticleMatch || !candidate) continue
    if (stripArabicDefiniteArticle(candidate) === stripArabicDefiniteArticle(word)) return index
    if (stripArabicClitics(candidate) === stripArabicClitics(word)) return index
    if (arabicAlefOptionalEqual(stripArabicDefiniteArticle(candidate), stripArabicDefiniteArticle(word))) return index
    if (arabicAlefOptionalEqual(stripArabicClitics(candidate), stripArabicClitics(word))) return index
  }
  return -1
}

function normalizeRecognitionWords(words = [], options = {}) {
  const provider = options.provider || 'unknown'
  const segmentId = options.segmentId || 'segment'
  const eventSequence = Number(options.eventSequence || 0)
  const threshold = Number(options.confidenceThreshold ?? DEFAULT_RECITATION_CONFIDENCE_THRESHOLD)
  return (Array.isArray(words) ? words : [])
    .flatMap((entry, index) => {
      const rawWord = typeof entry === 'string'
        ? entry
        : (entry?.word || entry?.text || entry?.transcript || entry?.punctuated_word || '')
      return tokenizeRecitationWords(rawWord).map((word, wordIndex) => {
        const confidence = Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : 1
        return {
          word,
          display: rawWord,
          rawWord: String(rawWord || '').trim() || word,
          confidence,
          provider: entry?.provider || provider,
          start: finiteOrNull(entry?.start ?? entry?.startTime ?? entry?.start_time),
          end: finiteOrNull(entry?.end ?? entry?.endTime ?? entry?.end_time),
          startTime: finiteOrNull(entry?.start ?? entry?.startTime ?? entry?.start_time),
          endTime: finiteOrNull(entry?.end ?? entry?.endTime ?? entry?.end_time),
          segmentId: entry?.segmentId || segmentId,
          speaker: String(entry?.speaker || '').trim() || null,
          sequence: eventSequence,
          sourceIndex: index + wordIndex,
          ...(entry?.token !== undefined ? { token: entry.token } : {}),
          ...(entry?.speechmaticsToken !== undefined ? { speechmaticsToken: entry.speechmaticsToken } : {}),
          ...(entry?.speechmatics_token !== undefined ? { speechmatics_token: entry.speechmatics_token } : {}),
          ...(entry?.id !== undefined ? { id: entry.id } : {})
        }
      })
    })
    .filter(word => word.word && Number(word.confidence ?? 0) >= threshold)
}

function collectRejectedRecognitionWords(words = [], threshold, provider, segmentId) {
  return (Array.isArray(words) ? words : [])
    .flatMap((entry, index) => {
      const rawWord = typeof entry === 'string'
        ? entry
        : (entry?.word || entry?.text || entry?.transcript || entry?.punctuated_word || '')
      const tokens = tokenizeRecitationWords(rawWord)
      const confidence = Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : 1
      if (!tokens.length || confidence >= threshold) return []
      return tokens.map((word, tokenIndex) => ({
        word,
        display: typeof entry === 'string' ? word : rawWord,
        rawWord: String(rawWord || '').trim() || word,
        confidence,
        provider: entry?.provider || provider,
        start: tokenIndex === 0 ? finiteOrNull(entry?.start ?? entry?.startTime ?? entry?.start_time) : null,
        end: tokenIndex === 0 ? finiteOrNull(entry?.end ?? entry?.endTime ?? entry?.end_time) : null,
        segmentId,
        sourceIndex: index + tokenIndex,
        reason: 'below-confidence-threshold'
      }))
    })
}

function getRecognitionSegmentId(event = {}, sequence = 0) {
  if (event.segmentId) return String(event.segmentId)
  if (event.segment_id) return String(event.segment_id)
  const provider = event.provider || 'unknown'
  const start = finiteOrNull(event.start)
  const duration = finiteOrNull(event.duration)
  const words = normalizeRecognitionWords(
    Array.isArray(event.words) && event.words.length
      ? event.words
      : (String(event.transcript || '').trim() ? [{ word: event.transcript }] : []),
    {
      confidenceThreshold: 0,
      provider,
      segmentId: 'signature',
      eventSequence: sequence
    }
  ).map(word => word.word).join('|')
  if (start !== null || duration !== null) return `${provider}:${start ?? 'na'}:${duration ?? 'na'}`
  return `${provider}:seq:${sequence}:${words}`
}

function findSupersededSegmentKey(segments = {}, event = {}) {
  if (event.segmentId) {
    const explicitKey = String(event.segmentId)
    if (segments[explicitKey]) return explicitKey
  }
  if (event.segment_id) {
    const explicitKey = String(event.segment_id)
    if (segments[explicitKey]) return explicitKey
  }
  const start = finiteOrNull(event.start)
  const duration = finiteOrNull(event.duration)
  const exact = Object.entries(segments).find(([, segment]) => {
    if (segment.provider !== event.provider) return false
    const segmentStart = finiteOrNull(segment.start)
    const segmentDuration = finiteOrNull(segment.duration)
    if (start !== null && segmentStart !== start) return false
    if (duration !== null && segmentDuration !== null && segmentDuration !== duration) return false
    return (start !== null || duration !== null) && (segmentStart !== null || segmentDuration !== null)
  })?.[0] || ''
  if (exact) return exact

  // Some Speechmatics-compatible gateways omit utterance timing on one of the
  // partial/final envelopes. Reuse an immediately adjacent identical final
  // envelope when no timing exists; timed deliberate repetitions stay separate.
  const incomingWords = normalizeRecognitionWords(event.words || [], { confidenceThreshold: 0 })
    .map(word => word.word)
  if (start === null && duration === null && incomingWords.length) {
    const latest = Object.entries(segments)
      .filter(([, segment]) => segment.provider === event.provider)
      .sort(([, left], [, right]) => Number(right.sequence || 0) - Number(left.sequence || 0))[0]
    if (latest) {
      const [key, segment] = latest
      const existingWords = (segment.words || []).map(word => word.word)
      if (Number(event.sequence || 0) - Number(segment.sequence || 0) <= 1
        && existingWords.length === incomingWords.length
        && existingWords.every((word, index) => word === incomingWords[index])) {
        return key
      }
    }
  }
  return ''
}

function selectPreferredRecognitionSegment(currentSegment = null, incomingSegment = null) {
  if (!currentSegment) return incomingSegment
  if (!incomingSegment) return currentSegment
  const currentRank = getRecognitionSegmentRank(currentSegment)
  const incomingRank = getRecognitionSegmentRank(incomingSegment)
  for (let index = 0; index < currentRank.length; index += 1) {
    if (incomingRank[index] === currentRank[index]) continue
    return incomingRank[index] > currentRank[index] ? incomingSegment : currentSegment
  }
  return currentSegment
}

function getRecognitionSegmentRank(segment = {}) {
  const words = Array.isArray(segment.words) ? segment.words : []
  const confidenceSum = words.reduce((sum, word) => sum + Number(word.confidence || 0), 0)
  const averageConfidence = words.length ? confidenceSum / words.length : 0
  const coverageEnd = words.reduce((latest, word) => {
    const end = finiteOrNull(word.end)
    return end !== null ? Math.max(latest, end) : latest
  }, 0)
  const signature = words.map(word => `${word.word}:${Math.round(Number(word.confidence || 0) * 100)}`).join('|')
  return [
    Number(!!segment.speechFinal),
    words.length,
    Math.round(averageConfidence * 1000),
    Math.round(confidenceSum * 1000),
    Math.round(coverageEnd * 1000),
    signature
  ]
}

function reconcileBufferedSegments(segments = {}) {
  const orderedSegments = Object.values(segments)
    .filter(segment => Array.isArray(segment.words) && segment.words.length)
    .sort((left, right) => {
      const leftStart = finiteOrNull(left.start)
      const rightStart = finiteOrNull(right.start)
      if (leftStart !== null && rightStart !== null && leftStart !== rightStart) return leftStart - rightStart
      if (leftStart !== null && rightStart === null) return -1
      if (leftStart === null && rightStart !== null) return 1
      return Number(left.sequence || 0) - Number(right.sequence || 0)
    })
  return suppressDuplicateRecognitionWords(orderedSegments.flatMap(segment => segment.words || []))
    .map((word, index) => ({ ...word, committed: true, commitIndex: index }))
}

function suppressDuplicateRecognitionWords(words = []) {
  const stable = []
  for (const word of words) {
    const current = { ...word }
    const last = stable[stable.length - 1]
    const previous = stable[stable.length - 2]
    // A Speechmatics token ID identifies one provider word. If that same ID
    // appears again, it is a re-emission even when the timestamps moved far
    // enough apart to resemble a deliberate repetition.
    if (last && heardRecognitionToken(last) !== null && heardRecognitionToken(last) === heardRecognitionToken(current)) {
      last.confidence = Math.max(Number(last.confidence || 0), Number(current.confidence || 0))
      last.start = finiteOrNull(last.start) ?? finiteOrNull(current.start)
      last.end = finiteOrNull(current.end) ?? finiteOrNull(last.end)
      last.startTime = last.start
      last.endTime = last.end
      last.duplicateSuppressed = true
      continue
    }
    if (last?.word === current.word && isNearbyWord(last, current)) {
      last.confidence = Math.max(Number(last.confidence || 0), Number(current.confidence || 0))
      last.end = finiteOrNull(current.end) ?? finiteOrNull(last.end)
      last.duplicateSuppressed = true
      continue
    }
    if (previous?.word === current.word && last && Number(last.confidence || 0) < Number(current.confidence || 0) && isNearbyWord(previous, current)) {
      last.supersededByDuplicate = true
      continue
    }
    stable.push(current)
  }
  return stable
}

/** Scoring ignores timbre, accent labels, and loudness. Orthography stays with the normalizer. */
const CLOSED_ACCENT_IGNORED_FIELDS = Object.freeze([
  'voice_profile',
  'accent_hint',
  'loudness',
  'timbre',
  'volume',
  'speaker_timbre',
])

function stripClosedAccentSignals(entry) {
  if (!entry || typeof entry !== 'object') return entry
  const copy = { ...entry }
  for (const field of CLOSED_ACCENT_IGNORED_FIELDS) delete copy[field]
  return copy
}

function normaliseCommittedRecognitionWords(words = [], options = {}) {
  const normalized = (Array.isArray(words) ? words : [])
    .flatMap((entry, index) => {
      const lexical = stripClosedAccentSignals(entry)
      const raw = typeof lexical === 'string'
        ? lexical
        : (lexical?.word || lexical?.text || lexical?.display || '')
      const tokens = tokenizeRecitationWords(raw)
      if (!tokens.length) return []
      return tokens.map((word, tokenIndex) => ({
        ...(lexical && typeof lexical === 'object' ? lexical : {}),
        word,
        display: typeof lexical === 'string'
          ? word
          : (lexical?.display || lexical?.text || raw || word),
        rawWord: typeof lexical === 'string'
          ? word
          : (lexical?.rawWord || lexical?.raw_word || lexical?.display || raw || word),
        confidence: Number.isFinite(Number(lexical?.confidence)) ? Number(lexical.confidence) : 1,
        // A phrase-level fallback has no word-level timing. Keep timing on the
        // first token only instead of assigning the full phrase duration to all.
        ...(tokenIndex > 0 ? {
          start: null,
          end: null,
          startTime: null,
          endTime: null,
        } : {}),
        commitIndex: Number.isFinite(Number(lexical?.commitIndex))
          ? Number(lexical.commitIndex) + tokenIndex
          : index + tokenIndex
      }))
    })
  return options.suppressDuplicates === false ? normalized : suppressDuplicateRecognitionWords(normalized)
}

function isNearbyWord(left = {}, right = {}) {
  const leftEnd = finiteOrNull(left.end)
  const rightStart = finiteOrNull(right.start)
  if (leftEnd !== null && rightStart !== null) {
    const gapMs = (rightStart - leftEnd) * 1000
    // Overlap or a short ASR re-emit / stutter — not a deliberate pause-repeat.
    return gapMs <= RECITATION_ASR_REEMIT_MAX_GAP_MS
  }
  // Missing timestamps: only treat as nearby within the same segment.
  // Defaulting to true previously dropped legitimate last-word re-emits after EOU.
  if (left.segmentId && right.segmentId && left.segmentId === right.segmentId) return true
  return false
}

function heardWordGapMs(previous = {}, current = {}) {
  const previousEnd = finiteOrNull(previous?.end ?? previous?.endTime)
  const currentStart = finiteOrNull(current?.start ?? current?.startTime)
  if (previousEnd === null || currentStart === null) return null
  return (currentStart - previousEnd) * 1000
}

/**
 * A pause is feedback attached to the boundary between two recognised words.
 * It is deliberately not an omission operation: only the surrounding words'
 * statuses can decide whether a target word was skipped.
 */
export function detectHesitationEvents({
  statuses = [],
  extraWords = [],
  heardWords = [],
  lifecycle = 'final',
  hesitationSeconds,
} = {}) {
  const byRecognisedIndex = new Map()
  const add = (word) => {
    const rawRecognisedIndex = word?.recognisedIndex ?? word?.recognised_index ?? word?.heardIndex
    if (rawRecognisedIndex === undefined || rawRecognisedIndex === null) return
    const recognisedIndex = Number(rawRecognisedIndex)
    if (!Number.isFinite(recognisedIndex)) return
    byRecognisedIndex.set(recognisedIndex, word)
  }
  statuses.forEach(status => add(status))
  extraWords.forEach(extra => add(extra))
  const indexes = [...byRecognisedIndex.keys()].sort((left, right) => left - right)
  const threshold = resolveHesitationPauseSeconds(hesitationSeconds)
  const finalised = !['live', 'recording', 'paused'].includes(String(lifecycle || '').toLowerCase())
  const events = []

  for (let index = 1; index < indexes.length; index += 1) {
    let previousRecognisedIndex = indexes[index - 1]
    const recognisedIndex = indexes[index]
    const current = byRecognisedIndex.get(recognisedIndex) || {}
    const currentIsCorrect = current.status === 'correct'
    const currentIsPauseAnchor = currentIsCorrect || ['REALIGNMENT', 'SELF_CORRECTION', 'RESTART'].includes(current.type)
    let previous = byRecognisedIndex.get(previousRecognisedIndex) || {}
    const adjacentRecognisedWords = recognisedIndex === previousRecognisedIndex + 1
    if (!adjacentRecognisedWords && current.type !== 'REALIGNMENT') continue
    // A realignment can follow a short wrong phrase. Use the last confirmed
    // green word as the left boundary, while keeping the wrong phrase intact.
    if (current.type === 'REALIGNMENT' && previous.status !== 'correct') {
      for (let candidate = index - 1; candidate >= 0; candidate -= 1) {
        const candidateWord = byRecognisedIndex.get(indexes[candidate]) || {}
        if (candidateWord.status === 'correct') {
          previousRecognisedIndex = indexes[candidate]
          previous = candidateWord
          break
        }
      }
    }
    const sameTargetCorrection = currentIsCorrect
      && current.type === 'MATCH'
      && previous.type === 'SELF_CORRECTION'
      && Number(previous.expectedIndex ?? previous.expected_index) === Number(current.targetIndex ?? current.expectedIndex ?? current.expected_index)
    const restartContinuation = currentIsCorrect && previous.type === 'RESTART'
    const correctionContinuation = currentIsCorrect && sameTargetCorrection
    if (!currentIsPauseAnchor || (previous.status !== 'correct' && !correctionContinuation && !restartContinuation)) continue

    const previousEnd = finiteOrNull(previous.end ?? previous.endTime ?? previous.end_time ?? heardWords[previousRecognisedIndex]?.end)
    const currentStart = finiteOrNull(current.start ?? current.startTime ?? current.start_time ?? heardWords[recognisedIndex]?.start)
    if (previousEnd == null || currentStart == null) continue
    const duration = Math.max(0, currentStart - previousEnd)
    if (duration < threshold) continue

    const previousExpectedIndex = previous.targetIndex ?? previous.expectedIndex ?? previous.expected_index ?? null
    const expectedIndex = current.targetIndex ?? current.expectedIndex ?? current.expected_index ?? null
    events.push({
      type: 'HESITATION',
      status: 'extra',
      visualStatus: 'amber',
      visual_status: 'amber',
      highlight: 'amber',
      fatal: false,
      affectsScoring: false,
      affects_scoring: false,
      lifecycle: finalised ? 'final' : 'live',
      previousRecognisedIndex,
      previous_recognised_index: previousRecognisedIndex,
      recognisedIndex,
      recognised_index: recognisedIndex,
      afterWordIndex: previousRecognisedIndex,
      after_word_index: previousRecognisedIndex,
      previousWordIndex: previousRecognisedIndex,
      previous_word_index: previousRecognisedIndex,
      nextWordIndex: recognisedIndex,
      next_word_index: recognisedIndex,
      previousExpectedIndex,
      previous_expected_index: previousExpectedIndex,
      expectedIndex,
      expected_index: expectedIndex,
      startTime: previousEnd,
      start_time: previousEnd,
      endTime: currentStart,
      end_time: currentStart,
      duration,
      durationSeconds: duration,
      duration_seconds: duration,
      classificationConfidence: 0.82,
      classification_confidence: 0.82,
    })
  }

  return events
}

/** True when consecutive identical tokens look like a deliberate learner repeat. */
function isDeliberateHeardRepetition(previous = {}, current = {}) {
  if (!previous?.word || previous.word !== current?.word) return false
  const gapMs = heardWordGapMs(previous, current)
  // Timed: only a clear pause counts as a learner repetition.
  if (gapMs !== null) return gapMs > RECITATION_ASR_REEMIT_MAX_GAP_MS
  // No timestamps (transcript / recovered): keep consecutive duplicates as repeats.
  return true
}

function getWeightedMatchCost(targetWord, heardWord, similarity, confidence, options = {}) {
  if (targetWord === heardWord) return 0
  const allowArticleMatch = options.allowArticleMatch !== false
  if (
    allowArticleMatch
    && stripArabicDefiniteArticle(targetWord) === stripArabicDefiniteArticle(heardWord)
  ) {
    return 0
  }
  // Without article matching, treat article-only equals as a near-miss, not free.
  if (
    !allowArticleMatch
    && stripArabicDefiniteArticle(targetWord) === stripArabicDefiniteArticle(heardWord)
    && targetWord !== heardWord
  ) {
    return 0.55 + ((1 - confidence) * 0.2)
  }
  if (similarity >= 0.92) return 0.22 + ((1 - confidence) * 0.12)
  if (similarity >= 0.85) return 0.42 + ((1 - confidence) * 0.16)
  // Soft-capped near-misses (~0.74) must stay cheaper than omit+later-match,
  // otherwise DP skips الصراط and wrongly attaches السراط to المستقيم.
  if (similarity >= 0.72) return 0.5 + ((1 - confidence) * 0.18)
  if (similarity >= 0.35) return 0.78 + ((1 - confidence) * 0.24)
  // Keep a clear mismatch attached to the current expected slot. A higher
  // cost lets DP skip the beginning of a coherent wrong phrase and attach its
  // tokens to later words, losing drift indexes.
  return confidence < RECITATION_UNCERTAIN_CONFIDENCE ? 1.45 : 0.85
}

function duplicateAdjustedExtraCost(words = [], index = 0) {
  // A low-confidence token is evidence about recognition quality, not enough
  // evidence to insert a learner word into the Qur'an sequence. Keep it in the
  // DP input so it can become UNASSESSED, but make matching the current target
  // cheaper than consuming it as an extra.
  if (isLowConfidenceRecognitionWord(words[index])) return 1.8
  return isRepeatedHeardWord(words, index) ? 0.34 : 0.78
}

/**
 * Anchor the first recognised word only when it is reliable in context. A
 * single repeated/fuzzy word must not turn the opening of an ayah into an
 * omission; a consecutive phrase is strong enough to locate a mid-ayah start.
 */
function findStartingAnchor(targetWords = [], heardWords = []) {
  if (targetWords.length < 2 || !heardWords.length) return null
  const first = heardWords[0] || {}
  if (!first.word) return null

  const matches = (targetIndex, heardIndex) => {
    const target = targetWords[targetIndex]
    const heard = heardWords[heardIndex]
    return !!target
      && !!heard?.word
      && getRecitationWordSimilarity(target, heard.word) >= RECITATION_CORRECT_SIMILARITY
  }
  const candidates = []
  for (let expectedIndex = 1; expectedIndex < targetWords.length; expectedIndex += 1) {
    if (!matches(expectedIndex, 0)) continue
    let length = 0
    let confidenceSum = 0
    let reliableCount = 0
    while (matches(expectedIndex + length, length)) {
      length += 1
      const confidence = Number(heardWords[length - 1]?.confidence ?? 1)
      confidenceSum += confidence
      if (confidence >= RECITATION_UNCERTAIN_CONFIDENCE) reliableCount += 1
    }
    if (length === 1) {
      const occurrences = targetWords.filter(target => (
        getRecitationWordSimilarity(target, first.word) >= RECITATION_CORRECT_SIMILARITY
      )).length
      if (reliableCount !== 1) continue
      // Exact, unique words can start a range; a repeated or fuzzy singleton
      // needs a following word before it may move the cursor forward.
      if (occurrences !== 1 || getRecitationWordSimilarity(targetWords[expectedIndex], first.word) < 0.99) continue
    } else if (reliableCount === 0) {
      // Consecutive lexical matches can support one uncertain token, but a
      // wholly uncertain phrase is not a starting anchor.
      continue
    }
    candidates.push({ expectedIndex, recognisedIndex: 0, length, confidenceSum })
  }
  if (!candidates.length) return null
  candidates.sort((left, right) => (
    right.length - left.length
    || right.confidenceSum - left.confidenceSum
    || left.expectedIndex - right.expectedIndex
  ))
  const best = candidates[0]
  return {
    expectedIndex: best.expectedIndex,
    recognisedIndex: best.recognisedIndex,
    length: best.length,
  }
}

function startingAnchorAdjustment(anchor = null, expectedIndex = 0, recognisedIndex = 0) {
  if (recognisedIndex !== 0 || expectedIndex === 0) return 0
  if (!anchor) return 2
  return expectedIndex === Number(anchor.expectedIndex) ? -0.4 : 2
}

function isLowConfidenceRecognitionWord(heardWord = {}) {
  const confidence = Number.isFinite(Number(heardWord?.confidence))
    ? Number(heardWord.confidence)
    : 1
  return confidence < RECITATION_UNCERTAIN_CONFIDENCE
}

function wordIsStructuralExtra(word = '', previous = '', targetWords = [], expectedIndex = 0) {
  if (!word) return false
  if (word === previous) return true
  if (targetWords.slice(0, Math.max(0, expectedIndex)).includes(word)) return true
  return targetWords.includes(word)
}

function isRepeatedHeardWord(words = [], index = 0) {
  if (index <= 0) return false
  return isDeliberateHeardRepetition(words[index - 1], words[index])
}

function readHeardWordDurationMs(heardWord = {}) {
  const start = finiteOrNull(heardWord?.start ?? heardWord?.startTime)
  const end = finiteOrNull(heardWord?.end ?? heardWord?.endTime)
  if (start == null || end == null || end <= start) return null
  return (end - start) * 1000
}

/** Coughs, clicks, and ultra-short low-confidence ASR junk — skip without advancing. */
export function isLikelyTransientNoiseWord(heardWord = {}, options = {}) {
  const text = String(heardWord?.word || heardWord?.text || '').trim()
  if (!text) return true
  const confidence = Number.isFinite(Number(heardWord?.confidence))
    ? Number(heardWord.confidence)
    : 1
  const minConfidence = Number.isFinite(Number(options.minConfidence))
    ? Number(options.minConfidence)
    : 0.34
  const normalized = normalizeArabicForRecitation(text)
  if (!normalized) return true

  const durationMs = readHeardWordDurationMs(heardWord)
  if (durationMs != null && durationMs < 90 && confidence < 0.58) return true
  if (durationMs != null && durationMs < 140 && normalized.length <= 2 && confidence < 0.45) return true

  if (normalized.length <= 1 && confidence < 0.55) return true
  if (normalized.length <= 2 && confidence < minConfidence) return true
  if (normalized.length <= 3 && confidence < 0.28) return true
  return false
}

/**
 * Low-confidence tokens that do not resemble the expected word or its near window
 * are usually background noise — skip without advancing or marking red.
 */
export function isLikelyOffTargetTransientNoise(
  heardWord = {},
  targetWords = [],
  cursor = 0,
  options = {},
) {
  if (isLikelyTransientNoiseWord(heardWord, options)) return true
  const word = String(heardWord?.word || heardWord?.text || '').trim()
  if (!word) return true
  const confidence = Number.isFinite(Number(heardWord?.confidence))
    ? Number(heardWord.confidence)
    : 1
  // Clear spoken tokens must reach the matcher as wrong/partial — never vanish as "noise".
  if (confidence >= 0.42) return false
  const normalized = normalizeArabicForRecitation(word)
  if (normalized.length >= 3 && confidence >= 0.28) return false

  const targets = Array.isArray(targetWords) ? targetWords : []
  if (!targets.length) return false

  const allowArticleMatch = options.allowArticleMatch !== false
  const partialFloor = Number.isFinite(Number(options.partialSimilarity))
    ? Number(options.partialSimilarity)
    : 0.35
  const windowStart = Math.max(0, Number(cursor) || 0)
  const windowEnd = Math.min(targets.length - 1, windowStart + 2)

  let bestSimilarity = 0
  for (let index = windowStart; index <= windowEnd; index += 1) {
    const similarity = getRecitationWordSimilarity(targets[index] || '', word, { allowArticleMatch })
    if (similarity > bestSimilarity) bestSimilarity = similarity
    if (similarity >= partialFloor) return false
  }

  // Only ultra-low-confidence, off-target blips (coughs / mic ticks).
  return bestSimilarity < 0.18 && confidence < 0.34
}

/**
 * Ignore learner stutters and quick ASR re-emits without treating them as mistakes.
 * - Re-saying the previous target word while still on the next slot.
 * - Immediate duplicate tokens in the same breath / segment.
 */
/**
 * After a stop-on-mistake red, later heard tokens can still correct the same slot.
 * Accepts green or amber rematches so a genuine retry is not discarded.
 */
function findSameSlotRecovery({
  heardWords = [],
  fromHeardIndex = 0,
  targetWord = '',
  displayText = '',
  targetUnit = null,
  cursor = 0,
  targetWords = [],
  matchThresholds = {},
  correctSimilarity = RECITATION_CORRECT_SIMILARITY,
  allowArticleMatch = true,
} = {}) {
  const expected = String(targetWord || '')
  if (!expected) return null
  for (let retry = fromHeardIndex + 1; retry < heardWords.length; retry += 1) {
    const retryHeard = heardWords[retry] || {}
    if (isLikelyTransientNoiseWord(retryHeard, matchThresholds)) continue
    if (isLikelyOffTargetTransientNoise(retryHeard, targetWords, cursor, matchThresholds)) continue
    const retrySimilarity = getRecitationWordSimilarity(expected, retryHeard.word, { allowArticleMatch })
    const retryClassified = classifyWordMatch({
      displayText: displayText || expected,
      targetWord: expected,
      heardWord: retryHeard,
      similarity: retrySimilarity,
      outOfOrderIndex: -1,
      targetIndex: cursor,
      targetUnit,
      ...matchThresholds,
    })
    if (retryClassified.status === 'correct' || retryClassified.status === 'partial') {
      return { classified: retryClassified, heardIndex: retry }
    }
    if (cursor + 1 < targetWords.length) {
      const nextSimilarity = getRecitationWordSimilarity(
        targetWords[cursor + 1],
        retryHeard.word,
        { allowArticleMatch },
      )
      if (nextSimilarity >= correctSimilarity) return null
    }
  }
  return null
}

export function shouldSkipLearnerStutterRepeat(heardWords = [], heardIndex = 0, targetWords = [], cursor = 0) {
  const heardWord = heardWords[heardIndex] || {}
  const word = String(heardWord?.word || '').trim()
  if (!word) return false
  const prevHeard = heardWords[heardIndex - 1] || null
  if (cursor > 0 && word === String(targetWords[cursor - 1] || '')) {
    return true
  }
  if (heardIndex > 0 && prevHeard?.word === word) {
    // Nearby ASR re-emit / brief stutter — not a mistake; deliberate pauses stay.
    if (!isDeliberateHeardRepetition(prevHeard, heardWord)) return true
    // Untimed same-segment duplicates in the live stream are ASR noise.
    if (
      heardWordGapMs(prevHeard, heardWord) === null
      && prevHeard?.segmentId
      && heardWord?.segmentId
      && prevHeard.segmentId === heardWord.segmentId
    ) {
      return true
    }
  }
  return false
}

function operationTieBreak(op) {
  if (op === 'match') return 0
  if (op === 'omission') return 1
  return 2
}

/** Soften common ASR letter swaps before similarity (comparison only). */
function softenArabicAsrForms(text = '') {
  return String(text || '')
    .replace(/[قك]/g, 'ك')
    .replace(/[طت]/g, 'ت')
    // Keep ض/ظ/ذ/د soft for ASR (ض↔د is a common recognition swap).
    .replace(/[ظضذد]/g, 'ذ')
    .replace(/[غخ]/g, 'غ')
    .replace(/[صسث]/g, 'س')
}

export function differsOnlyBySoftAsrLetters(left, right, options = {}) {
  const a = String(left || '')
  const b = String(right || '')
  if (!a || !b || a === b) return false
  const allowArticleMatch = options.allowArticleMatch !== false
  const strippedA = stripArabicDefiniteArticle(a)
  const strippedB = stripArabicDefiniteArticle(b)
  const cliticA = stripArabicClitics(a)
  const cliticB = stripArabicClitics(b)
  // Exact article/clitic stem match is not a soft-letter difference.
  if (allowArticleMatch && strippedA && strippedA === strippedB) return false
  if (allowArticleMatch && cliticA && cliticB && cliticA === cliticB) return false
  const softA = softenArabicAsrForms(a)
  const softB = softenArabicAsrForms(b)
  if (softA && softA === softB) return true
  if (allowArticleMatch) {
    const softStripA = softenArabicAsrForms(strippedA)
    const softStripB = softenArabicAsrForms(strippedB)
    if (softStripA && softStripA === softStripB) return true
    const softCliticA = softenArabicAsrForms(cliticA)
    const softCliticB = softenArabicAsrForms(cliticB)
    if (softCliticA && softCliticA === softCliticB) return true
  }
  return false
}

export function getRecitationWordSimilarity(left, right, options = {}) {
  // Always re-normalize so mushaf dagger-alef (ٰ) expands even if a caller
  // passed display orthography or a stale pre-normalized stem.
  const a = normalizeArabicForRecitation(left)
  const b = normalizeArabicForRecitation(right)
  if (!a || !b) return 0
  if (a === b) return 1
  const allowArticleMatch = options.allowArticleMatch !== false
  const strippedA = stripArabicDefiniteArticle(a)
  const strippedB = stripArabicDefiniteArticle(b)
  const cliticA = stripArabicClitics(a)
  const cliticB = stripArabicClitics(b)
  // Exact after article/clitic strip counts as a full match (ASR often drops و/ال).
  if (allowArticleMatch && strippedA && strippedA === strippedB) return 1
  if (allowArticleMatch && cliticA && cliticB && cliticA === cliticB) return 1
  // Mushaf dagger-alef expansions vs plain ASR (العالمين/العلمين, ملك/مالك, الصراط/الصرط).
  if (arabicAlefOptionalEqual(a, b)) return 1
  if (allowArticleMatch && arabicAlefOptionalEqual(strippedA, strippedB)) return 1
  if (allowArticleMatch && arabicAlefOptionalEqual(cliticA, cliticB)) return 1
  const base = levenshteinSimilarity(a, b)
  const stem = Math.max(
    levenshteinSimilarity(strippedA, strippedB),
    levenshteinSimilarity(cliticA, cliticB),
  )
  const hardBest = Math.max(base, allowArticleMatch ? stem : 0)
  // Soft letter conflations (ص/س, ق/ك, …) may lift a near-miss toward amber,
  // but must never reduce the hard score — and alone must stay under the soft
  // cap so they cannot silently become green.
  const softRaw = Math.max(
    levenshteinSimilarity(softenArabicAsrForms(a), softenArabicAsrForms(b)),
    allowArticleMatch
      ? Math.max(
        levenshteinSimilarity(softenArabicAsrForms(strippedA), softenArabicAsrForms(strippedB)),
        levenshteinSimilarity(softenArabicAsrForms(cliticA), softenArabicAsrForms(cliticB)),
      )
      : 0,
  )
  const softCap = Number.isFinite(Number(options.softSimilarityCap))
    ? Number(options.softSimilarityCap)
    : RECITATION_SOFT_SIMILARITY_CAP
  // صراط↔سراط etc. can still clear the green floor via raw Levenshtein even when
  // the only edit is a soft-confusable letter. Cap those to amber.
  if (differsOnlyBySoftAsrLetters(a, b, { allowArticleMatch })) {
    return Math.min(Math.max(hardBest, Math.min(softRaw, softCap)), softCap)
  }
  const softCapped = softRaw > hardBest
    ? Math.max(hardBest, Math.min(softRaw, softCap))
    : softRaw
  let score = !allowArticleMatch ? Math.max(base, softCapped) : Math.max(hardBest, softCapped)
  // One substitution/insertion/deletion on longer words still clears ~0.79–0.85
  // via 1 − 1/n (الضالين↔الدالين). Never paint those green.
  if (isSingleEditMismatch(a, b, { allowArticleMatch })) {
    score = Math.min(score, softCap)
  }
  return score
}

/** True when the closest hard form differs by exactly one character edit. */
export function isSingleEditMismatch(left, right, options = {}) {
  const a = normalizeArabicForRecitation(left)
  const b = normalizeArabicForRecitation(right)
  if (!a || !b || a === b) return false
  // Alef presence is orthographic (dagger↔plain / ملك↔مالك), not a learner error.
  if (arabicAlefOptionalEqual(a, b)) return false
  const allowArticleMatch = options.allowArticleMatch !== false
  const candidates = [[a, b]]
  if (allowArticleMatch) {
    const strippedA = stripArabicDefiniteArticle(a)
    const strippedB = stripArabicDefiniteArticle(b)
    const cliticA = stripArabicClitics(a)
    const cliticB = stripArabicClitics(b)
    if (strippedA && strippedA === strippedB) return false
    if (cliticA && cliticB && cliticA === cliticB) return false
    if (arabicAlefOptionalEqual(strippedA, strippedB)) return false
    if (arabicAlefOptionalEqual(cliticA, cliticB)) return false
    candidates.push([strippedA, strippedB], [cliticA, cliticB])
  }
  let best = Infinity
  for (const [x, y] of candidates) {
    if (!x || !y) continue
    best = Math.min(best, levenshteinDistance(x, y))
  }
  return best === 1
}

function levenshteinDistance(a, b) {
  if (!a || !b) return Math.max(String(a || '').length, String(b || '').length)
  if (a === b) return 0
  const rows = a.length + 1
  const cols = b.length + 1
  const matrix = Array.from({ length: rows }, () => Array(cols).fill(0))
  for (let i = 0; i < rows; i += 1) matrix[i][0] = i
  for (let j = 0; j < cols; j += 1) matrix[0][j] = j
  for (let i = 1; i < rows; i += 1) {
    for (let j = 1; j < cols; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      )
    }
  }
  return matrix[a.length][b.length]
}

function levenshteinSimilarity(a, b) {
  if (!a || !b) return 0
  if (a === b) return 1
  const distance = levenshteinDistance(a, b)
  return 1 - (distance / Math.max(a.length, b.length))
}

function classifyWordMatch({
  displayText,
  targetWord,
  heardWord = {},
  similarity = 0,
  outOfOrderIndex = -1,
  targetIndex = 0,
  targetUnit = null,
  correctSimilarity = RECITATION_CORRECT_SIMILARITY,
  partialSimilarity = RECITATION_THRESHOLDS.partialSimilarity,
  minConfidenceForCorrect = 0,
  allowArticleMatch = true,
  uncertainConfidence = RECITATION_UNCERTAIN_CONFIDENCE,
  minConfidenceForSimilarityCorrect = RECITATION_THRESHOLDS.minConfidenceForSimilarityCorrect,
}) {
  const expected = String(targetWord || '')
  const actual = String(heardWord.word || '')
  const confidence = Number.isFinite(Number(heardWord.confidence)) ? Number(heardWord.confidence) : 1
  const location = {
    ayahKey: targetUnit?.ayahKey || '',
    ayahNumber: targetUnit?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnit?.ayahIndex)) ? Number(targetUnit.ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnit?.ayahWordIndex)) ? Number(targetUnit.ayahWordIndex) : targetIndex
  }
  const articleMatch = allowArticleMatch
    && expected
    && actual
    && expected !== actual
    && (
      stripArabicDefiniteArticle(expected) === stripArabicDefiniteArticle(actual)
      || stripArabicClitics(expected) === stripArabicClitics(actual)
      || arabicAlefOptionalEqual(expected, actual)
      || arabicAlefOptionalEqual(stripArabicDefiniteArticle(expected), stripArabicDefiniteArticle(actual))
      || arabicAlefOptionalEqual(stripArabicClitics(expected), stripArabicClitics(actual))
    )
  const correctFloor = Number.isFinite(Number(correctSimilarity))
    ? Number(correctSimilarity)
    : RECITATION_CORRECT_SIMILARITY
  const partialFloor = Number.isFinite(Number(partialSimilarity))
    ? Number(partialSimilarity)
    : RECITATION_THRESHOLDS.partialSimilarity
  const minCorrectConfidence = Number.isFinite(Number(minConfidenceForCorrect))
    ? Number(minConfidenceForCorrect)
    : 0
  const uncertainFloor = Number.isFinite(Number(uncertainConfidence))
    ? Number(uncertainConfidence)
    : RECITATION_UNCERTAIN_CONFIDENCE
  const similarityCorrectFloor = Number.isFinite(Number(minConfidenceForSimilarityCorrect))
    ? Number(minConfidenceForSimilarityCorrect)
    : RECITATION_THRESHOLDS.minConfidenceForSimilarityCorrect
  const confidenceOk = confidence >= minCorrectConfidence
  // Exact match (or allowed article-only match) / high similarity → green.
  // When article matching is disabled, article-stripped equals must not sneak in via similarity=1.
  const effectiveSimilarity = (!allowArticleMatch
    && expected
    && actual
    && expected !== actual
    && stripArabicDefiniteArticle(expected) === stripArabicDefiniteArticle(actual))
    ? Math.min(Number(similarity) || 0, Math.max(0, correctFloor - 0.05))
    : Number(similarity) || 0
  const exactOrArticle = !!(expected && (expected === actual || articleMatch))
  // Two-letter substitutions are full mistakes — 50% Levenshtein is not "close".
  const shortSubstitution = expected
    && actual
    && !exactOrArticle
    && Math.min(expected.length, actual.length) <= 2
    && expected.length === actual.length
  const similarityLooksCorrect = !shortSubstitution && effectiveSimilarity >= correctFloor
  // Exact / orthographic equals may be green at any confidence. Similarity-only
  // greens require enough provider confidence — never fabricate correct from noise.
  if (
    expected
    && confidenceOk
    && (
      exactOrArticle
      || (similarityLooksCorrect && confidence >= similarityCorrectFloor)
    )
  ) {
    return withHeardAlignmentFields({
      text: displayText,
      targetWord: expected,
      status: 'correct',
      note: 'Correct.',
      actual,
      confidence,
      similarity: exactOrArticle ? 1 : similarity,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }, heardWord, 'correct')
  }
  // Recognition uncertainty must not become a learner mistake.
  if (expected && actual && !exactOrArticle && confidence < uncertainFloor) {
    return withHeardAlignmentFields({
      text: displayText,
      targetWord: expected,
      status: 'uncertain',
      note: '',
      actual,
      confidence,
      similarity: effectiveSimilarity,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }, heardWord, 'uncertain')
  }
  if (expected && actual && shortSubstitution) {
    return withHeardAlignmentFields({
      text: displayText,
      targetWord: expected,
      status: 'incorrect',
      note: actual ? `Expected ${displayText}; heard ${actual}.` : 'Incorrect word.',
      actual,
      confidence,
      similarity: effectiveSimilarity,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }, heardWord, 'incorrect')
  }
  // Near-miss / soft-letter / single-edit ASR noise → amber, not red.
  if (expected && actual && effectiveSimilarity >= partialFloor) {
    return withHeardAlignmentFields({
      text: displayText,
      targetWord: expected,
      status: 'partial',
      note: `Close. Expected ${displayText}; heard ${actual}.`,
      actual,
      confidence,
      similarity: effectiveSimilarity,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }, heardWord, 'partial')
  }
  return withHeardAlignmentFields({
    text: displayText,
    targetWord: expected,
    status: 'incorrect',
    note: outOfOrderIndex >= 0
      ? `${displayText} was heard outside the expected position.`
      : (actual ? `Expected ${displayText}; heard ${actual}.` : 'Incorrect word.'),
    actual,
    confidence,
    similarity,
    outOfOrder: outOfOrderIndex >= 0,
    targetIndex,
    heardIndex: heardWord.commitIndex,
    ...location
  }, heardWord, 'incorrect')
}

/**
 * If ASR rejected a word for low confidence but it would have matched an omitted
 * target, mark uncertain instead of blaming the learner for an omission.
 */
function reconcileUncertainFromRejectedWords(statuses = [], rejectedWords = [], options = {}) {
  const rejected = (Array.isArray(rejectedWords) ? rejectedWords : [])
    .map((entry) => {
      const raw = entry?.word || entry?.text || entry?.display || ''
      const word = tokenizeRecitationWords(raw)[0] || ''
      if (!word) return null
      return {
        word,
        display: entry?.display || entry?.rawWord || raw || word,
        rawWord: heardRawWord(entry),
        confidence: Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : 0,
        start: finiteOrNull(entry?.start ?? entry?.startTime),
        end: finiteOrNull(entry?.end ?? entry?.endTime),
      }
    })
    .filter(Boolean)
  if (!rejected.length) return statuses
  const allowArticleMatch = options.allowArticleMatch !== false
  const correctFloor = Number.isFinite(Number(options.correctSimilarity))
    ? Number(options.correctSimilarity)
    : RECITATION_CORRECT_SIMILARITY
  const partialFloor = Number.isFinite(Number(options.partialSimilarity))
    ? Number(options.partialSimilarity)
    : 0.42
  const used = new Set()
  for (let index = 0; index < statuses.length; index += 1) {
    const status = statuses[index]
    if (!isOmissionWordStatus(status?.status)) continue
    const targetWord = status.targetWord || ''
    if (!targetWord) continue
    let bestIndex = -1
    let bestSim = 0
    for (let rejectedIndex = 0; rejectedIndex < rejected.length; rejectedIndex += 1) {
      if (used.has(rejectedIndex)) continue
      const sim = getRecitationWordSimilarity(targetWord, rejected[rejectedIndex].word, { allowArticleMatch })
      if (sim > bestSim) {
        bestSim = sim
        bestIndex = rejectedIndex
      }
    }
    if (bestIndex < 0 || bestSim < Math.max(partialFloor, Math.min(0.72, correctFloor - 0.05))) continue
    used.add(bestIndex)
    const heard = rejected[bestIndex]
    statuses[index] = withHeardAlignmentFields({
      ...status,
      status: 'uncertain',
      note: '',
      actual: heard.word,
      confidence: heard.confidence,
      similarity: bestSim,
    }, heard, 'uncertain')
  }
  return statuses
}

function findWordLaterIndex(words = [], word = '', fromIndex = 0) {
  if (!word) return -1
  for (let index = Math.max(0, fromIndex); index < words.length; index += 1) {
    if (words[index] === word) return index
  }
  return -1
}

function applyWrongOrderGuard(statuses = [], targetWords = [], transcriptWords = []) {
  const sameWordsDifferentOrder = targetWords.length === transcriptWords.length
    && targetWords.length > 1
    && targetWords.some((word, index) => word !== transcriptWords[index])
    && [...targetWords].sort().join('|') === [...transcriptWords].sort().join('|')
  if (!sameWordsDifferentOrder) return
  targetWords.forEach((word, index) => {
    if (word === transcriptWords[index]) return
    statuses[index] = {
      ...statuses[index],
      status: 'incorrect',
      note: `Wrong order. Expected ${statuses[index]?.text || word}; heard ${transcriptWords[index] || ''}.`,
      actual: transcriptWords[index] || '',
      similarity: getRecitationWordSimilarity(word, transcriptWords[index] || ''),
      outOfOrder: true
    }
  })
}

function isProgressionAdvanceStatus(status = '', options = {}) {
  // Amber may advance when partialAdvances is enabled; red never unlocks later words.
  // Uncertain can advance with partialAdvances so recognition noise does not freeze the pass.
  if (options.partialAdvances === false) return status === 'correct'
  return status === 'correct' || status === 'partial' || status === 'uncertain'
}

function isEvaluatedWordStatus(status = '') {
  return ['correct', 'partial', 'incorrect', 'omitted', 'uncertain'].includes(String(status || ''))
}

function isOmissionWordStatus(status = '') {
  return status === 'omitted' || status === 'pending'
}

function buildStableProgression(statuses = [], extraWords = [], options = {}) {
  const strict = options.strictProgression !== false
  // Soft-continue reds stay visible, but unlock later words only once a later
  // green/amber proves the learner moved on (never unlock from a lone red).
  const firstBlockingIndex = statuses.findIndex((word, index) => {
    if (isProgressionAdvanceStatus(word.status, options)) return false
    if (
      (word.status === 'incorrect' || word.status === 'omitted')
      && options.advanceOnIncorrect
    ) {
      const laterSettled = statuses
        .slice(index + 1)
        .some(entry => isProgressionAdvanceStatus(entry.status, options))
      return !laterSettled
    }
    return true
  })
  const visibleStatuses = strict && firstBlockingIndex >= 0
    ? statuses.map((word, index) => index <= firstBlockingIndex
      ? word
      : { ...word, status: 'pending', note: '' })
    : statuses
  const advancedCount = visibleStatuses.filter(word => word.status && word.status !== 'pending').length
  const completedWords = statuses.filter(word => isProgressionAdvanceStatus(word.status, options)).length
  const evaluatedWords = statuses.filter(word => isEvaluatedWordStatus(word.status)).length
  return {
    owner: 'quran-alignment-engine',
    currentIndex: firstBlockingIndex >= 0 ? firstBlockingIndex : statuses.length,
    highestStableIndex: Math.max(0, completedWords - 1),
    advancedCount,
    totalWords: statuses.length,
    progressPercentage: statuses.length ? Math.round((advancedCount / statuses.length) * 100) : 0,
    completionPercentage: statuses.length ? Math.round((completedWords / statuses.length) * 100) : 0,
    // Soft mode: finishing the range (any colour) counts as complete so imperfect
    // recites can stop and feed red/amber/green/black/gray into recommendations.
    complete: statuses.length > 0
      && (
        strict
          ? statuses.every(word => isProgressionAdvanceStatus(word.status, options))
          : evaluatedWords >= statuses.length
      )
      && !extraWords.length,
    visibleStatuses
  }
}

export const RECITATION_COLOR = Object.freeze({
  GREEN: 'green',
  AMBER: 'amber',
  RED: 'red',
  BLACK: 'black',
  GRAY: 'gray',
  UNCERTAIN: 'uncertain',
})

/**
 * Map a word status (and common aliases) onto the five-tier recitation colour.
 * Uncertain stays separate so recognition failure does not look like a learner error.
 */
export function classifyRecitationWordColor(status) {
  const s = String(status || '').toLowerCase().trim()
  if (!s) return RECITATION_COLOR.GRAY
  if (s === 'uncertain' || s.includes('unrecognised') || s.includes('unrecognized')) {
    return RECITATION_COLOR.UNCERTAIN
  }
  if (
    s === 'omitted'
    || s === 'missing'
    || s === 'black'
    || s.includes('omission')
    || s === 'skipped-omitted'
  ) {
    return RECITATION_COLOR.BLACK
  }
  if (
    s.includes('incorrect')
    || s === 'red'
    || s === 'wrong'
    || s === 'missed'
    || s === 'mismatch'
    || s.includes('word-incorrect')
  ) {
    return RECITATION_COLOR.RED
  }
  if (
    s.includes('partial')
    || s.includes('minor')
    || s.includes('close')
    || s === 'amber'
    || s === 'yellow'
    || s.includes('hesitat')
    || s === 'incomplete'
  ) {
    return RECITATION_COLOR.AMBER
  }
  if (s === 'correct' || s.includes('word-correct') || s === 'green') {
    return RECITATION_COLOR.GREEN
  }
  if (
    s === 'pending'
    || s === 'skipped'
    || s === 'notattempted'
    || s === 'not_attempted'
    || s === 'gray'
    || s === 'grey'
    || s === 'waiting'
  ) {
    return RECITATION_COLOR.GRAY
  }
  return RECITATION_COLOR.GRAY
}

export function recitationWordAyahNumber(word) {
  const n = Number(
    word?.ayahNumber
    ?? word?.ayah_number
    ?? word?.ayah
    ?? word?.verseNumber
    ?? word?.verse_number
  )
  return Number.isFinite(n) && n > 0 ? n : 0
}

/**
 * Five-tier colour counts for AI Recite → recommendation / personal plan.
 * green=correct, amber=partial, red=incorrect or confirmed deletion,
 * black=legacy omitted status without an operation type, gray=not yet.
 * Uncertain (recognition failure) is tracked separately and does not inflate red/black.
 */
export function getRecitationColorCounts(statuses = []) {
  const list = Array.isArray(statuses) ? statuses : []
  const counts = {
    green: 0,
    amber: 0,
    red: 0,
    black: 0,
    gray: 0,
    uncertain: 0,
  }
  for (const word of list) {
    const color = String(word?.type || '').toUpperCase() === 'DELETION'
      ? RECITATION_COLOR.RED
      : classifyRecitationWordColor(word?.status ?? word?.visualStatus ?? word)
    if (color === RECITATION_COLOR.UNCERTAIN) counts.uncertain += 1
    else counts[color] += 1
  }
  return counts
}

/**
 * Derive weak ayah numbers from word-level colour statuses.
 * Red/black weigh more than amber; a single amber or hard mistake marks the ayah.
 * Gray/uncertain alone do not mark an ayah weak (ASR noise is not a learner error).
 */
export function deriveWeakAyahsFromWordStatuses(statuses = [], options = {}) {
  const minScore = Number.isFinite(Number(options.minScore)) ? Number(options.minScore) : 1
  const byAyah = new Map()
  const addScore = (ayah, add) => {
    if (!ayah || !add) return
    byAyah.set(ayah, (byAyah.get(ayah) || 0) + add)
  }

  const ayahWordCounts = new Map()
  for (const word of (Array.isArray(statuses) ? statuses : [])) {
    const ayah = recitationWordAyahNumber(word)
    if (!ayah) continue
    const color = classifyRecitationWordColor(word?.status ?? word?.visualStatus)
    const counts = ayahWordCounts.get(ayah) || { total: 0, gray: 0, hit: 0 }
    counts.total += 1
    if (color === RECITATION_COLOR.GRAY || color === RECITATION_COLOR.UNCERTAIN) counts.gray += 1
    else counts.hit += 1
    ayahWordCounts.set(ayah, counts)
    if (color === RECITATION_COLOR.RED || color === RECITATION_COLOR.BLACK) addScore(ayah, 2)
    else if (color === RECITATION_COLOR.AMBER) addScore(ayah, 1)
    if (word?.outOfOrder) addScore(ayah, 1)
  }

  if (options.treatUnattemptedAyahsAsWeak !== false) {
    for (const [ayah, counts] of ayahWordCounts.entries()) {
      if (counts.total > 0 && counts.hit === 0) addScore(ayah, 2)
    }
  }

  const extraLists = [
    options.skippedAyahs,
    options.sequenceErrorAyahs,
  ]
  for (const list of extraLists) {
    if (!Array.isArray(list)) continue
    for (const item of list) {
      const ayah = recitationWordAyahNumber(item) || Number(item)
      addScore(Number.isFinite(ayah) && ayah > 0 ? ayah : 0, 2)
    }
  }

  return [...byAyah.entries()]
    .filter(([, score]) => score >= minScore)
    .map(([ayah]) => ayah)
    .sort((a, b) => a - b)
}

function buildStructuralRecitationAnalysis({ statuses = [], heardWords = [], extraWords = [], targetAyahs = [], targetUnits = [], operations = [] } = {}) {
  const repeatedWords = detectRepeatedWords(heardWords, extraWords)
  const repeatedPhrases = detectRepeatedPhrases(heardWords)
  const skippedAyahs = detectSkippedAyahs(statuses, targetAyahs)
  const sequence = detectAyahSequenceErrors(statuses, heardWords, targetAyahs, targetUnits)
  const verseJumps = detectVerseJumps(statuses, targetAyahs, sequence.recitedAyahs)
  return {
    repeatedWords,
    repeatedPhrases,
    skippedAyahs,
    verseJumpDetected: verseJumps.length > 0,
    verseJumps,
    sequenceErrors: sequence.sequenceErrors,
    recitedAyahs: sequence.recitedAyahs,
    operationSummary: summarizeOperations(operations)
  }
}

function detectRepeatedWords(heardWords = [], extraWords = []) {
  const repeated = []
  const seen = new Set()
  // Prefer alignment-confirmed deliberate repetitions, not ASR re-emits / stutters.
  for (const item of extraWords) {
    if (item?.type !== 'REPETITION' && item?.legacyType !== 'repetition') continue
    if (!item.word) continue
    const heardIndex = Number(item.heardIndex)
    const previous = Number.isFinite(heardIndex) && heardIndex > 0
      ? heardWords[heardIndex - 1]
      : null
    const current = Number.isFinite(heardIndex) ? heardWords[heardIndex] : null
    if (previous && current && !isDeliberateHeardRepetition(previous, current)) continue
    const key = `${item.word}:${item.heardIndex - 1}:${item.heardIndex}`
    if (seen.has(key)) continue
    seen.add(key)
    repeated.push({
      word: item.display || item.word,
      normalizedWord: item.word,
      heardIndex: item.heardIndex,
      previousHeardIndex: item.heardIndex - 1,
      confidence: Number(item.confidence ?? 1)
    })
  }
  for (let index = 1; index < heardWords.length; index += 1) {
    const current = heardWords[index]
    const previous = heardWords[index - 1]
    if (!isDeliberateHeardRepetition(previous, current)) continue
    const key = `${current.word}:${index - 1}:${index}`
    if (seen.has(key)) continue
    seen.add(key)
    repeated.push({
      word: current.display || current.word,
      normalizedWord: current.word,
      heardIndex: index,
      previousHeardIndex: index - 1,
      confidence: Number(current.confidence ?? 1)
    })
  }
  return repeated
}

function detectRepeatedPhrases(heardWords = []) {
  const words = heardWords.map(word => word?.word || '').filter(Boolean)
  const phrases = []
  const seen = new Set()
  for (let size = Math.min(5, Math.floor(words.length / 2)); size >= 2; size -= 1) {
    for (let index = 0; index + (size * 2) <= words.length; index += 1) {
      const phrase = words.slice(index, index + size)
      const next = words.slice(index + size, index + (size * 2))
      if (phrase.join('|') !== next.join('|')) continue
      const key = `${index}:${size}:${phrase.join('|')}`
      if (seen.has(key) || phrases.some(item => index >= item.startHeardIndex && index < item.startHeardIndex + item.wordCount)) continue
      seen.add(key)
      phrases.push({
        phrase: phrase.join(' '),
        startHeardIndex: index,
        repeatedAtHeardIndex: index + size,
        wordCount: size,
        count: 2
      })
    }
  }
  return phrases
}

function detectSkippedAyahs(statuses = [], targetAyahs = []) {
  if (!Array.isArray(targetAyahs) || targetAyahs.length <= 1) return []
  return targetAyahs
    .map((ayah, ayahIndex) => {
      const words = statuses.filter(word => Number(word.ayahIndex || 0) === ayahIndex)
      const heardCount = words.filter(word => !isOmissionWordStatus(word.status) && word.actual).length
      if (!words.length || heardCount > 0) return null
      return {
        ayahKey: ayah.key || '',
        ayahNumber: ayah.number ?? null,
        ayahIndex,
        wordCount: words.length,
        words: words.map(word => word.text)
      }
    })
    .filter(Boolean)
}

function detectAyahSequenceErrors(statuses = [], heardWords = [], targetAyahs = [], targetUnits = []) {
  if (!Array.isArray(targetAyahs) || targetAyahs.length <= 1) return { recitedAyahs: [], sequenceErrors: [] }
  const heardTokens = heardWords.map(word => word?.word || '').filter(Boolean)
  const recitedAyahs = targetAyahs
    .map((ayah, ayahIndex) => {
      const ayahUnits = targetUnits.filter(unit => Number(unit.ayahIndex || 0) === ayahIndex)
      const positions = findSequentialPositions(ayahUnits.map(unit => unit.word), heardTokens)
      const statusWords = statuses.filter(word => Number(word.ayahIndex || 0) === ayahIndex)
      const alignedPositions = statusWords
        .map(word => Number(word.heardIndex))
        .filter(index => Number.isFinite(index) && index >= 0)
      const allPositions = [...positions, ...alignedPositions].sort((left, right) => left - right)
      const uniquePositions = [...new Set(allPositions)]
      const coverage = ayahUnits.length ? uniquePositions.length / ayahUnits.length : 0
      const hasStrongCoverage = coverage >= Math.min(0.6, ayahUnits.length <= 3 ? 1 / ayahUnits.length : 0.45)
      if (!uniquePositions.length || !hasStrongCoverage) return null
      return {
        ayahKey: ayah.key || '',
        ayahNumber: ayah.number ?? null,
        ayahIndex,
        firstHeardIndex: uniquePositions[0],
        lastHeardIndex: uniquePositions[uniquePositions.length - 1],
        matchedWords: uniquePositions.length,
        wordCount: ayahUnits.length,
        coverage
      }
    })
    .filter(Boolean)
    .sort((left, right) => left.firstHeardIndex - right.firstHeardIndex || left.ayahIndex - right.ayahIndex)

  const sequenceErrors = []
  let highestAyahIndex = -1
  for (const item of recitedAyahs) {
    if (item.ayahIndex < highestAyahIndex) {
      const expectedAfter = targetAyahs[highestAyahIndex]
      sequenceErrors.push({
        type: 'ayah-out-of-order',
        ayahKey: item.ayahKey,
        ayahNumber: item.ayahNumber,
        ayahIndex: item.ayahIndex,
        heardIndex: item.firstHeardIndex,
        message: `Ayah ${item.ayahNumber ?? item.ayahIndex + 1} was recited after a later ayah.`,
        expectedAfterAyah: expectedAfter?.number ?? highestAyahIndex + 1
      })
    }
    highestAyahIndex = Math.max(highestAyahIndex, item.ayahIndex)
  }

  return { recitedAyahs, sequenceErrors }
}

function detectVerseJumps(statuses = [], targetAyahs = [], recitedAyahs = []) {
  if (!Array.isArray(targetAyahs) || targetAyahs.length <= 1) return []
  const jumps = []
  for (const ayah of recitedAyahs) {
    for (let ayahIndex = 0; ayahIndex < ayah.ayahIndex; ayahIndex += 1) {
      const earlierWords = statuses.filter(word => Number(word.ayahIndex || 0) === ayahIndex)
      if (!earlierWords.length) continue
      const firstMissing = earlierWords.find(word => isOmissionWordStatus(word.status))
      if (!firstMissing) continue
      const sameAyahRecoveredAfterMissing = earlierWords
        .some(word => Number(word.targetIndex) > Number(firstMissing.targetIndex) && !isOmissionWordStatus(word.status))
      if (sameAyahRecoveredAfterMissing) continue
      const previousAyah = targetAyahs[ayahIndex] || {}
      jumps.push({
        fromAyahKey: previousAyah.key || '',
        fromAyahNumber: previousAyah.number ?? null,
        toAyahKey: ayah.ayahKey,
        toAyahNumber: ayah.ayahNumber,
        skippedFromWordIndex: firstMissing.ayahWordIndex,
        skippedFromWord: firstMissing.text,
        heardIndex: ayah.firstHeardIndex,
        message: `Jumped to ayah ${ayah.ayahNumber ?? ayah.ayahIndex + 1} before completing ayah ${previousAyah.number ?? ayahIndex + 1}.`
      })
      break
    }
  }
  return jumps
}

function findSequentialPositions(targetWords = [], heardWords = [], threshold = 0.9) {
  const positions = []
  let heardIndex = 0
  for (const targetWord of targetWords) {
    while (heardIndex < heardWords.length) {
      const heardWord = heardWords[heardIndex]
      const matches = targetWord === heardWord || getRecitationWordSimilarity(targetWord, heardWord) >= threshold
      const currentIndex = heardIndex
      heardIndex += 1
      if (matches) {
        positions.push(currentIndex)
        break
      }
    }
    if (heardIndex >= heardWords.length) break
  }
  return positions
}

function summarizeOperations(operations = []) {
  return operations.reduce((summary, operation) => {
    const key = operation?.op || 'unknown'
    summary[key] = Number(summary[key] || 0) + 1
    return summary
  }, {})
}

function buildMistakesFromStatuses(statuses = [], extraWords = [], structural = {}) {
  const omittedStatuses = statuses.filter(word => isOmissionWordStatus(word.status))
  const skippedWords = buildSkippedWordGroups(
    omittedStatuses.map(word => ({
      word: word.text,
      expectedIndex: word.targetIndex,
      ayahKey: word.ayahKey || '',
      ayahNumber: word.ayahNumber ?? null,
      ayahWordIndex: word.ayahWordIndex
    }))
  )
  const unresolvedExtras = extraWords.filter(item => !['SELF_CORRECTION', 'REPETITION', 'RESTART', 'UNASSESSED'].includes(item.type))
  const selfCorrected = []
  const selfCorrectionGroups = new Set()
  for (const item of extraWords) {
    if (item.type !== 'SELF_CORRECTION') continue
    const groupId = item.correctionGroupId || item.self_correction_group_id || `${item.expectedIndex}:${item.heardIndex}`
    if (selfCorrectionGroups.has(groupId)) continue
    selfCorrectionGroups.add(groupId)
    selfCorrected.push({
      wrongTokens: extraWords
        .filter(candidate => (candidate.correctionGroupId || candidate.self_correction_group_id) === groupId)
        .map(candidate => candidate.rawWord || candidate.display || candidate.word)
        .filter(Boolean),
      correctedTargetWord: item.correctedTargetWord || item.corrected_target_word || item.expectedWord || item.expected_word || '',
      correctedTargetWords: item.correctedTargetWords || item.corrected_target_words || [item.correctedTargetWord || item.corrected_target_word || item.expectedWord || item.expected_word || ''],
      correctedTargetIndex: item.correctedTargetIndex ?? item.corrected_target_index ?? item.expectedIndex ?? null,
      correctionGroupId: groupId,
    })
  }
  const unresolvedMistakes = statuses
    .filter(word => ['incorrect', 'partial', 'omitted'].includes(word.status))
    .map(word => ({ expected: word.text, actual: word.actual || '', type: word.type }))
    .concat(unresolvedExtras.map(item => ({
      expected: item.expectedWord || item.expected_word || '',
      actual: item.rawWord || item.display || item.word || '',
      type: item.type,
    })))
  return {
    correct: statuses.filter(word => word.status === 'correct').map(word => word.text),
    missing: omittedStatuses.map(word => word.text),
    extra: unresolvedExtras.map(item => item.display || item.word).filter(Boolean),
    selfCorrected,
    self_corrected_mistakes: selfCorrected,
    unresolvedMistakes,
    unresolved_mistakes: unresolvedMistakes,
    partial: statuses
      .filter(word => word.status === 'partial')
      .map(word => ({ expected: word.text, actual: word.actual || '', confidence: Number(word.confidence || 0), similarity: Number(word.similarity || 0) })),
    incorrect: statuses
      .filter(word => word.status === 'incorrect')
      .map(word => ({ expected: word.text, actual: word.actual || '', confidence: Number(word.confidence || 0), similarity: Number(word.similarity || 0), outOfOrder: !!word.outOfOrder })),
    uncertain: statuses
      .filter(word => word.status === 'uncertain')
      .map(word => ({ expected: word.text, actual: word.actual || '', confidence: Number(word.confidence || 0), similarity: Number(word.similarity || 0) })),
    repeated: (structural.repeatedWords || []).map(item => item.word).filter(Boolean),
    repeatedPhrases: (structural.repeatedPhrases || []).map(item => item.phrase).filter(Boolean),
    skippedWords,
    wordSkips: skippedWords,
    skippedAyahs: structural.skippedAyahs || [],
    verseJumps: structural.verseJumps || [],
    sequenceErrors: structural.sequenceErrors || [],
    colorCounts: getRecitationColorCounts(statuses)
  }
}

function buildAnalysis({ statuses = [], heardWords = [], extraWords = [], mistakes = {}, targetWords = [], targetAyahs = [], targetUnits = [], targetText = '', operations = [], progression = {}, structural = {}, metadata = {} }) {
  const omissions = statuses
    .filter(word => isOmissionWordStatus(word.status))
    .map(word => ({
      word: word.text,
      expectedIndex: word.targetIndex,
      ayahKey: word.ayahKey || '',
      ayahNumber: word.ayahNumber ?? null,
      ayahWordIndex: word.ayahWordIndex
    }))
  const substitutions = statuses
    .filter(word => ['partial', 'incorrect'].includes(word.status))
    .map(word => ({
      expected: word.text,
      actual: word.actual || '',
      expectedIndex: word.targetIndex,
      ayahKey: word.ayahKey || '',
      ayahNumber: word.ayahNumber ?? null,
      ayahWordIndex: word.ayahWordIndex,
      confidence: Number(word.confidence || 0),
      similarity: Number(word.similarity || 0),
      outOfOrder: !!word.outOfOrder
    }))
  const repetitions = extraWords
    .filter(item => item.type === 'REPETITION' || item.legacyType === 'repetition')
    .map(item => ({ word: item.display || item.word, heardIndex: item.heardIndex, confidence: Number(item.confidence || 0) }))
  const repeatedWords = structural.repeatedWords?.length ? structural.repeatedWords : repetitions
  const repeatedPhrases = structural.repeatedPhrases || []
  const selfCorrected = Array.isArray(mistakes.selfCorrected) ? mistakes.selfCorrected : []
  const unresolvedMistakes = Array.isArray(mistakes.unresolvedMistakes) ? mistakes.unresolvedMistakes : []
  const skippedWords = buildSkippedWordGroups(omissions)
  const weakWords = statuses
    .filter((word) => {
      if (word.status === 'uncertain') return false
      if (word.status === 'correct') return Number(word.confidence || 1) < 0.78
      return true
    })
    .map(word => ({
      word: word.text,
      index: word.targetIndex,
      ayahKey: word.ayahKey || '',
      ayahNumber: word.ayahNumber ?? null,
      ayahWordIndex: word.ayahWordIndex,
      status: isOmissionWordStatus(word.status) ? 'omission' : word.status,
      confidence: Number(word.confidence || 0),
      similarity: Number(word.similarity || 0)
    }))
  const matchedCount = statuses.filter(word => ['correct', 'partial', 'uncertain'].includes(word.status)).length
  const reviewRecommendations = buildReviewRecommendations({ mistakes, weakWords, repetitions: repeatedWords, structural })
  const feedback = buildDetailedFeedback({
    omissions,
    substitutions,
    extraWords,
    selfCorrected,
    repeatedWords,
    repeatedPhrases,
    skippedAyahs: structural.skippedAyahs || [],
    sequenceErrors: structural.sequenceErrors || [],
    verseJumpDetected: !!structural.verseJumpDetected
  })
  return {
    sourceOfTruth: 'selected-ayah',
    quranTokenCount: targetWords.length,
    committedWordCount: heardWords.length,
    targetAyahCount: targetAyahs.length || (targetUnits.length ? 1 : 0),
    targetText,
    alignmentOutput: statuses,
    operations,
    progressStates: progression,
    accuracyInputs: {
      correct: mistakes.correct?.length || 0,
      partial: mistakes.partial?.length || 0,
      incorrect: mistakes.incorrect?.length || 0,
      uncertain: mistakes.uncertain?.length || 0,
      omissions: omissions.length,
      extra: mistakes.extra?.length || 0,
      unresolved_mistakes: unresolvedMistakes.length,
      self_corrected_mistakes: selfCorrected.length,
    },
    completionPercentage: statuses.length ? Math.round((matchedCount / statuses.length) * 100) : 0,
    omissions,
    omissionCount: omissions.length,
    substitutions,
    substitutionCount: substitutions.length,
    unresolvedMistakes,
    unresolvedMistakeCount: unresolvedMistakes.length,
    selfCorrectedMistakes: selfCorrected,
    selfCorrectedMistakeCount: selfCorrected.length,
    repetitions,
    repetitionCount: repetitions.length,
    repeatedWords,
    repeatedWordCount: repeatedWords.length,
    repeatedPhrases,
    repeatedPhraseCount: repeatedPhrases.length,
    skippedWords,
    skippedWordCount: skippedWords.reduce((sum, group) => sum + Number(group.count || 1), 0),
    skippedAyahs: structural.skippedAyahs || [],
    skippedAyahCount: structural.skippedAyahs?.length || 0,
    verseJumpDetected: !!structural.verseJumpDetected,
    verseJumps: structural.verseJumps || [],
    sequenceErrors: structural.sequenceErrors || [],
    sequenceErrorCount: structural.sequenceErrors?.length || 0,
    weakWords,
    weakWordIndicators: weakWords,
    feedback,
    reviewRecommendations,
    retentionSignals: {
      needsReview: weakWords.length > 0 || repeatedWords.length > 0 || repeatedPhrases.length > 0 || extraWords.length > 0 || !!structural.verseJumpDetected || !!structural.sequenceErrors?.length,
      priority: weakWords.length >= 3 || omissions.length || structural.skippedAyahs?.length || structural.sequenceErrors?.length || structural.verseJumpDetected ? 'high' : substitutions.length || repeatedWords.length || repeatedPhrases.length || extraWords.length ? 'medium' : 'low',
      weakWordCount: weakWords.length,
      recommendedIntervalDays: weakWords.length ? 1 : 7,
      reason: structural.sequenceErrors?.length ? 'ayah-sequence-error' : structural.verseJumpDetected ? 'verse-jump' : structural.skippedAyahs?.length ? 'skipped-ayah' : weakWords.length ? 'alignment-weak-words' : repeatedWords.length || repeatedPhrases.length || extraWords.length ? 'alignment-repetition-or-extra' : 'clean-alignment'
    },
    metadata: {
      sessionId: metadata.sessionId || '',
      audioHash: metadata.audioHash || '',
      generatedAt: metadata.timestamp || DEFAULT_ANALYSIS_TIMESTAMP
    }
  }
}

function buildSkippedWordGroups(omissions = []) {
  const groups = []
  for (const item of omissions) {
    const last = groups[groups.length - 1]
    const sameAyah = last && (last.ayahKey || '') === (item.ayahKey || '') && (last.ayahNumber ?? null) === (item.ayahNumber ?? null)
    const contiguous = last && Number(last.endIndex) + 1 === Number(item.expectedIndex)
    if (sameAyah && contiguous) {
      last.words.push(item.word)
      last.endIndex = item.expectedIndex
      last.count = last.words.length
      continue
    }
    groups.push({
      ayahKey: item.ayahKey || '',
      ayahNumber: item.ayahNumber ?? null,
      startIndex: item.expectedIndex,
      endIndex: item.expectedIndex,
      ayahWordIndex: item.ayahWordIndex,
      count: 1,
      words: [item.word]
    })
  }
  return groups
}

function buildDetailedFeedback({ omissions = [], substitutions = [], extraWords = [], selfCorrected = [], repeatedWords = [], repeatedPhrases = [], skippedAyahs = [], sequenceErrors = [], verseJumpDetected = false } = {}) {
  const feedback = []
  if (skippedAyahs.length) {
    feedback.push(`Skipped ${skippedAyahs.length} complete ayah${skippedAyahs.length === 1 ? '' : 's'}: ${skippedAyahs.slice(0, 3).map(formatAyahLabel).join(', ')}.`)
  }
  if (verseJumpDetected) feedback.push('Verse jump detected: recitation moved to a later ayah before the current ayah was complete.')
  if (sequenceErrors.length) feedback.push(`Ayah sequence error detected: ${sequenceErrors[0]?.message || 'ayahs were recited out of order'}`)
  if (omissions.length) feedback.push(`Missing words: ${omissions.slice(0, 6).map(item => item.word).join('، ')}${omissions.length > 6 ? '...' : ''}.`)
  if (substitutions.length) {
    feedback.push(`Changed words: ${substitutions.slice(0, 4).map(item => `${item.expected} -> ${item.actual || '?'}`).join('، ')}${substitutions.length > 4 ? '...' : ''}.`)
  }
  if (selfCorrected.length) {
    feedback.push(`Self-corrected: ${selfCorrected.slice(0, 4).map(item => `${item.wrongTokens.join('، ')} -> ${item.correctedTargetWord}`).join('؛ ')}.`)
  }
  const unresolvedExtras = extraWords.filter(item => item.type !== 'SELF_CORRECTION')
  if (unresolvedExtras.length) feedback.push(`Extra words heard: ${unresolvedExtras.slice(0, 6).map(item => item.display || item.word).join('، ')}${unresolvedExtras.length > 6 ? '...' : ''}.`)
  if (repeatedWords.length) feedback.push(`Repeated words: ${repeatedWords.slice(0, 5).map(item => item.word).join('، ')}${repeatedWords.length > 5 ? '...' : ''}.`)
  if (repeatedPhrases.length) feedback.push(`Repeated phrase: ${repeatedPhrases[0].phrase}.`)
  if (!feedback.length) feedback.push('Clean word order and wording match.')
  return feedback
}

function formatAyahLabel(item = {}) {
  if (item.ayahNumber !== null && item.ayahNumber !== undefined) return `ayah ${item.ayahNumber}`
  return item.ayahKey ? `ayah ${item.ayahKey}` : `ayah ${Number(item.ayahIndex || 0) + 1}`
}

function getStructuralScorePenalty(structural = {}) {
  const skippedAyahPenalty = (structural.skippedAyahs?.length || 0) * 25
  const sequencePenalty = (structural.sequenceErrors?.length || 0) * 20
  const jumpPenalty = structural.verseJumpDetected ? 15 : 0
  const repeatedPhrasePenalty = (structural.repeatedPhrases?.length || 0) * 6
  const repeatedWordPenalty = (structural.repeatedWords?.length || 0) * 3
  return Math.min(70, skippedAyahPenalty + sequencePenalty + jumpPenalty + repeatedPhrasePenalty + repeatedWordPenalty)
}

function getEvaluationConfidence({ statuses = [], committedWords = [], structural = {}, accuracyScore = 0 } = {}) {
  const confidences = committedWords
    .map(word => Number(word?.confidence))
    .filter(value => Number.isFinite(value))
  const averageConfidence = confidences.length
    ? confidences.reduce((sum, value) => sum + value, 0) / confidences.length
    : 0.75
  const matchedRatio = statuses.length
    ? statuses.filter(word => ['correct', 'partial', 'uncertain'].includes(word.status)).length / statuses.length
    : 0
  const structuralPenalty = Math.min(0.35, (
    (structural.skippedAyahs?.length || 0) * 0.12
    + (structural.sequenceErrors?.length || 0) * 0.1
    + (structural.verseJumpDetected ? 0.08 : 0)
    + (structural.repeatedPhrases?.length || 0) * 0.03
  ))
  const scoreConfidence = Math.max(0.25, Math.min(1, Number(accuracyScore || 0) / 100))
  const uncertainRatio = statuses.length
    ? statuses.filter(word => word.status === 'uncertain').length / statuses.length
    : 0
  const confidence = (averageConfidence * 0.5) + (matchedRatio * 0.3) + (scoreConfidence * 0.2) - structuralPenalty - (uncertainRatio * 0.12)
  return Math.max(0, Math.min(1, Number(confidence.toFixed(2))))
}

function getMemoryStrength(score = 0) {
  const value = Number(score || 0)
  if (value >= 90) return 'strong'
  if (value >= 80) return 'mostlyStrong'
  if (value >= 60) return 'moderate'
  return 'weak'
}

function getRecitationRecommendation(score, mistakes) {
  const verseJumps = mistakes.verseJumps?.length || 0
  const skippedAyahs = mistakes.skippedAyahs?.length || 0
  const wordSkips = mistakes.wordSkips?.reduce((sum, group) => sum + Number(group.count || 1), 0) || 0
  const sequenceErrors = mistakes.sequenceErrors?.length || 0
  const missing = mistakes.missing?.length || 0
  const incorrect = mistakes.incorrect?.length || 0
  const partial = mistakes.partial?.length || 0
  const extra = mistakes.extra?.length || 0
  if (skippedAyahs) return `Skipped ${skippedAyahs} ayah${skippedAyahs === 1 ? '' : 's'}. Review the selected range in order.`
  if (verseJumps) return `Verse jump detected ${verseJumps === 1 ? 'once' : `${verseJumps} times`}. Restart from the last complete ayah.`
  if (sequenceErrors) return 'Ayahs were recited out of order. Restart from the first selected ayah.'
  if (wordSkips) return `Skipped ${wordSkips} word${wordSkips === 1 ? '' : 's'}. Slow down and complete each ayah before moving on.`
  if (missing) return `Missing ${missing} word${missing === 1 ? '' : 's'}. Recite that section slowly before retrying.`
  if (partial) return `Clarify ${partial} close word${partial === 1 ? '' : 's'}, then check again.`
  if (incorrect) return `Review ${incorrect} changed word${incorrect === 1 ? '' : 's'} and compare with the displayed ayah.`
  if (extra) return 'Extra wording detected. Slow down and keep the ayah boundary tight.'
  if (score >= 100) return 'Clean match. Save it and keep this ayah on light review.'
  if (score >= 85) return 'Mostly clean. Recheck once before saving.'
  return 'Replay the ayah once, recite without looking, then run another Recite Check.'
}

function buildReviewRecommendations({ mistakes = {}, weakWords = [], repetitions = [], structural = {} }) {
  const recommendations = []
  if (structural.skippedAyahs?.length) recommendations.push({ type: 'skipped-ayah', text: `Return to ${structural.skippedAyahs.slice(0, 3).map(formatAyahLabel).join(', ')} before retrying the range.` })
  if (structural.verseJumpDetected) recommendations.push({ type: 'verse-jump', text: 'Slow down at ayah boundaries and complete each ayah before moving to the next.' })
  if (structural.sequenceErrors?.length) recommendations.push({ type: 'sequence-error', text: 'Recite the selected ayahs in order, then run another check.' })
  if (mistakes.wordSkips?.length) recommendations.push({ type: 'word-skip', text: `Return to the skipped words: ${mistakes.wordSkips.slice(0, 3).flatMap(item => item.words || []).slice(0, 4).join('، ')}` })
  if (mistakes.missing?.length) recommendations.push({ type: 'omission', text: `Repeat the missing section: ${mistakes.missing.slice(0, 4).join('، ')}` })
  if (mistakes.incorrect?.length) recommendations.push({ type: 'substitution', text: `Compare changed words with the Mushaf: ${mistakes.incorrect.slice(0, 4).map(item => item.expected).join('، ')}` })
  if (mistakes.partial?.length) recommendations.push({ type: 'weak-word', text: `Slow down on close words: ${mistakes.partial.slice(0, 4).map(item => item.expected).join('، ')}` })
  if (repetitions.length) recommendations.push({ type: 'repetition', text: `Avoid repeating: ${repetitions.slice(0, 4).map(item => item.word).join('، ')}` })
  if (!recommendations.length && !weakWords.length) recommendations.push({ type: 'clean', text: 'Clean match. Keep this ayah on light review.' })
  return recommendations
}

function buildReviewMetadata(score, mistakes, options = {}) {
  const issueCount = (mistakes.missing?.length || 0)
    + (mistakes.extra?.length || 0)
    + (mistakes.incorrect?.length || 0)
    + (mistakes.partial?.length || 0)
    + (mistakes.repeated?.length || 0)
    + (mistakes.repeatedPhrases?.length || 0)
    + (mistakes.wordSkips?.reduce((sum, group) => sum + Number(group.count || 1), 0) || 0)
    + (mistakes.skippedAyahs?.length || 0)
    + (mistakes.verseJumps?.length || 0)
    + (mistakes.sequenceErrors?.length || 0)
  const intervalDays = score >= 100 && issueCount === 0 ? 7 : score >= 85 ? 3 : 1
  return {
    priority: score >= 100 && issueCount === 0 ? 'low' : score >= 85 ? 'medium' : 'high',
    intervalDays,
    dueAt: addDaysIso(options.timestamp || DEFAULT_ANALYSIS_TIMESTAMP, intervalDays),
    mistakeCount: issueCount,
    tajweedIssueCount: 0,
    reason: score >= 100 && issueCount === 0 ? 'high-accuracy' : score >= 85 ? 'partial-review' : 'needs-review'
  }
}

function deterministicResultId(targetText = '', words = []) {
  const signature = `${normalizeArabicForRecitation(targetText)}::${words.map(word => `${word.word}:${Math.round(Number(word.confidence || 0) * 100)}`).join('|')}`
  return `recitation-${hashString(signature)}`
}

function hashString(value = '') {
  let hash = 2166136261
  for (const char of String(value)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}

function addDaysIso(baseIso, days) {
  const base = new Date(baseIso || DEFAULT_ANALYSIS_TIMESTAMP)
  const date = Number.isNaN(base.getTime()) ? new Date(DEFAULT_ANALYSIS_TIMESTAMP) : base
  date.setUTCDate(date.getUTCDate() + Number(days || 0))
  return date.toISOString()
}

function finiteOrNull(value) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function stripMarkup(text) {
  return String(text || '').replace(/<[^>]*>/g, ' ')
}
