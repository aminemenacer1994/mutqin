export const DEFAULT_RECITATION_CONFIDENCE_THRESHOLD = 0.70
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
  return String(text || '')
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]/g, '')
    .replace(/\u0640/g, '')
    .replace(/([^\s])ٱ\s+(?=ل)/g, '$1 ٱ')
    .replace(/(^|\s)ٱ\s+(?=ل)/g, '$1ٱ')
    .replace(/[إأآٱ]/g, 'ا')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/ى/g, 'ي')
    .replace(/ة/g, 'ه')
    .replace(/(^|\s)ا\s+(?=ل)/g, '$1ا')
    .replace(/[^\u0621-\u064A\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
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

export function tokenizeRecitationWords(text) {
  const normalized = normalizeArabicForRecitation(text)
  return normalized ? normalized.split(/\s+/).filter(Boolean) : []
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
  const normalizedWords = normalizeRecognitionWords(event.words || [], {
    confidenceThreshold: threshold,
    provider: event.provider || 'unknown',
    segmentId: getRecognitionSegmentId(event, sequence),
    eventSequence: sequence
  })
  const rawEvent = {
    sequence,
    provider: event.provider || 'unknown',
    isFinal: !!event.isFinal,
    speechFinal: !!event.speechFinal,
    segmentId: getRecognitionSegmentId(event, sequence),
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
  next.rejectedWords.push(...collectRejectedRecognitionWords(event.words || [], threshold, event.provider || 'unknown', rawEvent.segmentId))

  if (!rawEvent.isFinal) {
    next.interimSegment = normalizedWords.length
      ? {
          segmentId: rawEvent.segmentId,
          provider: rawEvent.provider,
          sequence,
          start: rawEvent.start,
          duration: rawEvent.duration,
          speechFinal: false,
          words: normalizedWords.map(word => ({ ...word, segmentId: rawEvent.segmentId }))
        }
      : null
    next.interimWords = suppressDuplicateRecognitionWords(normalizedWords)
    return next
  }

  const existingKey = findSupersededSegmentKey(next.bufferedSegments, rawEvent)
  const segmentKey = existingKey || rawEvent.segmentId
  const incomingSegment = {
    segmentId: segmentKey,
    provider: rawEvent.provider,
    sequence,
    start: rawEvent.start,
    duration: rawEvent.duration,
    speechFinal: rawEvent.speechFinal,
    words: normalizedWords.map(word => ({ ...word, segmentId: segmentKey }))
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
  const statuses = displayWords.map((text, index) => ({
    text,
    targetWord: targetWords[index] || '',
    status: 'pending',
    note: 'Not heard yet.',
    actual: '',
    confidence: 0,
    similarity: 0,
    targetIndex: index,
    ayahKey: targetUnits[index]?.ayahKey || '',
    ayahNumber: targetUnits[index]?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnits[index]?.ayahIndex)) ? Number(targetUnits[index].ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnits[index]?.ayahWordIndex)) ? Number(targetUnits[index].ayahWordIndex) : index
  }))
  const strict = options.strictProgression !== false
  const lookahead = Math.max(1, Math.min(8, Number(options.lookahead || 5)))
  const extraWords = []
  let cursor = 0
  let firstBlockingIndex = -1

  for (let heardIndex = 0; heardIndex < heardWords.length; heardIndex += 1) {
    const heardWord = heardWords[heardIndex] || {}
    if (cursor >= targetWords.length) {
      extraWords.push({
        word: heardWord.word || '',
        display: heardWord.display || heardWord.word || '',
        heardIndex,
        confidence: Number(heardWord.confidence ?? 1),
        type: isRepeatedHeardWord(heardWords, heardIndex) ? 'repetition' : 'extra'
      })
      continue
    }

    const targetWord = targetWords[cursor] || ''
    const targetUnit = targetUnits[cursor] || null
    const similarity = getRecitationWordSimilarity(targetWord, heardWord.word)
    const classified = classifyWordMatch({
      displayText: displayWords[cursor] || targetWord,
      targetWord,
      heardWord,
      similarity,
      outOfOrderIndex: -1,
      targetIndex: cursor,
      targetUnit
    })

    if (classified.status === 'correct' || classified.status === 'partial') {
      statuses[cursor] = classified
      cursor += 1
      continue
    }

    const exactAheadIndex = findExactWordIndexWithinWindow(targetWords, heardWord.word, cursor + 1, lookahead)
    if (exactAheadIndex >= 0) {
      statuses[cursor] = {
        ...classified,
        note: `Expected ${displayWords[cursor] || targetWord} before ${heardWord.display || heardWord.word || 'this word'}.`,
        outOfOrder: true
      }
      firstBlockingIndex = cursor
      if (strict) break
      const aheadUnit = targetUnits[exactAheadIndex] || null
      statuses[exactAheadIndex] = classifyWordMatch({
        displayText: displayWords[exactAheadIndex] || targetWords[exactAheadIndex] || '',
        targetWord: targetWords[exactAheadIndex] || '',
        heardWord,
        similarity: 1,
        outOfOrderIndex: exactAheadIndex,
        targetIndex: exactAheadIndex,
        targetUnit: aheadUnit
      })
      cursor = exactAheadIndex + 1
      continue
    }

    statuses[cursor] = classified
    firstBlockingIndex = cursor
    if (strict) break
    cursor += 1
  }

  const progression = buildStableProgression(statuses, extraWords, options)
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
    progression,
    firstBlockingIndex
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
      const similarity = getRecitationWordSimilarity(targetWord, heardWord.word)
      const confidenceWeight = Math.max(0.35, Math.min(1, Number(heardWord.confidence ?? 1)))
      const matchCost = getWeightedMatchCost(targetWord, heardWord.word, similarity, confidenceWeight)
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
    note: 'Not heard yet.',
    actual: '',
    confidence: 0,
    similarity: 0,
    targetIndex: index,
    ayahKey: targetUnits[index]?.ayahKey || '',
    ayahNumber: targetUnits[index]?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnits[index]?.ayahIndex)) ? Number(targetUnits[index].ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnits[index]?.ayahWordIndex)) ? Number(targetUnits[index].ayahWordIndex) : index
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
        targetUnit: targetUnits[targetIndex - 1] || null
      })
      operations.unshift({ op: 'match', targetIndex: targetIndex - 1, heardIndex: heardIndex - 1, similarity: cell.similarity })
    } else if (cell.op === 'extra') {
      const repeated = isRepeatedHeardWord(heardWords, heardIndex - 1)
      const extra = {
        word: heardWords[heardIndex - 1]?.word || '',
        display: heardWords[heardIndex - 1]?.display || heardWords[heardIndex - 1]?.word || '',
        heardIndex: heardIndex - 1,
        confidence: Number(heardWords[heardIndex - 1]?.confidence ?? 1),
        type: repeated ? 'repetition' : 'extra'
      }
      extraWords.unshift(extra)
      operations.unshift({ op: repeated ? 'repetition' : 'extra', heardIndex: heardIndex - 1 })
    } else if (cell.op === 'omission') {
      operations.unshift({ op: 'omission', targetIndex: targetIndex - 1 })
    }
    ;[targetIndex, heardIndex] = cell.prev || [0, 0]
  }

  applyWrongOrderGuard(statuses, targetWords, transcriptWords)
  const progression = buildStableProgression(statuses, extraWords, options)
  const structural = buildStructuralRecitationAnalysis({
    statuses,
    heardWords: rawHeardWords,
    extraWords,
    targetAyahs,
    targetUnits,
    operations
  })
  const mistakes = buildMistakesFromStatuses(statuses, extraWords, structural)
  const analysis = buildAnalysis({
    statuses,
    heardWords,
    rawHeardWords,
    extraWords,
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
    operations,
    mistakes,
    mistakeBreakdown: mistakes,
    structural,
    progression,
    analysis
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
    return sum + (0.45 * Math.max(0.35, Math.min(1, confidence)))
  }, 0)
  const wrongOrderPenalty = statuses.filter(word => word.outOfOrder).length * 0.35
  const extraPenalty = (mistakes.extra.length || 0) * 0.35
  const baseAccuracyScore = Math.max(0, Math.min(100, Math.round(((correctScore + partialScore - wrongOrderPenalty - extraPenalty) / targetCount) * 100)))
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

function findExactWordIndexWithinWindow(words = [], word = '', fromIndex = 0, lookahead = 5) {
  if (!word) return -1
  const end = Math.min(words.length, Math.max(fromIndex, 0) + Math.max(1, lookahead))
  for (let index = Math.max(0, fromIndex); index < end; index += 1) {
    if (words[index] === word) return index
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
          confidence,
          provider: entry?.provider || provider,
          start: finiteOrNull(entry?.start),
          end: finiteOrNull(entry?.end),
          segmentId: entry?.segmentId || segmentId,
          sequence: eventSequence,
          sourceIndex: index + wordIndex
        }
      })
    })
    .filter(word => word.word && Number(word.confidence ?? 0) >= threshold)
}

function collectRejectedRecognitionWords(words = [], threshold, provider, segmentId) {
  return (Array.isArray(words) ? words : [])
    .map((entry, index) => {
      const rawWord = typeof entry === 'string'
        ? entry
        : (entry?.word || entry?.text || entry?.transcript || entry?.punctuated_word || '')
      const word = tokenizeRecitationWords(rawWord)[0] || ''
      const confidence = Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : 1
      if (!word || confidence >= threshold) return null
      return {
        word,
        display: rawWord,
        confidence,
        provider: entry?.provider || provider,
        segmentId,
        sourceIndex: index,
        reason: 'below-confidence-threshold'
      }
    })
    .filter(Boolean)
}

function getRecognitionSegmentId(event = {}, sequence = 0) {
  if (event.segmentId) return String(event.segmentId)
  const provider = event.provider || 'unknown'
  const start = finiteOrNull(event.start)
  const duration = finiteOrNull(event.duration)
  const words = normalizeRecognitionWords(event.words || [], {
    confidenceThreshold: 0,
    provider,
    segmentId: 'signature',
    eventSequence: sequence
  }).map(word => word.word).join('|')
  if (start !== null || duration !== null) return `${provider}:${start ?? 'na'}:${duration ?? 'na'}`
  return `${provider}:seq:${sequence}:${words}`
}

function findSupersededSegmentKey(segments = {}, event = {}) {
  const start = finiteOrNull(event.start)
  const duration = finiteOrNull(event.duration)
  if (start === null && duration === null) return ''
  return Object.entries(segments).find(([, segment]) => {
    if (segment.provider !== event.provider) return false
    return finiteOrNull(segment.start) === start && finiteOrNull(segment.duration) === duration
  })?.[0] || ''
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

function normaliseCommittedRecognitionWords(words = [], options = {}) {
  const normalized = (Array.isArray(words) ? words : [])
    .map((entry, index) => {
      const word = entry?.word || tokenizeRecitationWords(entry?.text || '')[0] || ''
      if (!word) return null
      return {
        ...entry,
        word,
        display: entry?.display || entry?.text || word,
        confidence: Number.isFinite(Number(entry?.confidence)) ? Number(entry.confidence) : 1,
        commitIndex: Number.isFinite(Number(entry?.commitIndex)) ? Number(entry.commitIndex) : index
      }
    })
    .filter(Boolean)
  return options.suppressDuplicates === false ? normalized : suppressDuplicateRecognitionWords(normalized)
}

function isNearbyWord(left = {}, right = {}) {
  const leftEnd = finiteOrNull(left.end)
  const rightStart = finiteOrNull(right.start)
  if (leftEnd !== null && rightStart !== null) return rightStart <= leftEnd
  return true
}

function getWeightedMatchCost(targetWord, heardWord, similarity, confidence) {
  if (targetWord === heardWord) return 0
  if (similarity >= 0.9) return 0.16 + ((1 - confidence) * 0.1)
  if (similarity >= 0.35) return 0.68 + ((1 - confidence) * 0.22)
  return 1.34
}

function duplicateAdjustedExtraCost(words = [], index = 0) {
  return isRepeatedHeardWord(words, index) ? 0.34 : 0.78
}

function isRepeatedHeardWord(words = [], index = 0) {
  if (index <= 0) return false
  return words[index]?.word && words[index]?.word === words[index - 1]?.word
}

function operationTieBreak(op) {
  if (op === 'match') return 0
  if (op === 'omission') return 1
  return 2
}

export function getRecitationWordSimilarity(left, right) {
  const a = String(left || '')
  const b = String(right || '')
  if (!a || !b) return 0
  if (a === b) return 1
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
  return 1 - (matrix[a.length][b.length] / Math.max(a.length, b.length))
}

function classifyWordMatch({ displayText, targetWord, heardWord = {}, similarity = 0, outOfOrderIndex = -1, targetIndex = 0, targetUnit = null }) {
  const expected = String(targetWord || '')
  const actual = String(heardWord.word || '')
  const confidence = Number.isFinite(Number(heardWord.confidence)) ? Number(heardWord.confidence) : 1
  const location = {
    ayahKey: targetUnit?.ayahKey || '',
    ayahNumber: targetUnit?.ayahNumber ?? null,
    ayahIndex: Number.isFinite(Number(targetUnit?.ayahIndex)) ? Number(targetUnit.ayahIndex) : 0,
    ayahWordIndex: Number.isFinite(Number(targetUnit?.ayahWordIndex)) ? Number(targetUnit.ayahWordIndex) : targetIndex
  }
  if (expected && (expected === actual || similarity >= 0.9)) {
    return {
      text: displayText,
      targetWord: expected,
      status: 'correct',
      note: 'Correct.',
      actual,
      confidence,
      similarity: 1,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }
  }
  if (expected && actual && similarity >= 0.35) {
    return {
      text: displayText,
      targetWord: expected,
      status: 'partial',
      note: `Close. Expected ${displayText}; heard ${actual}.`,
      actual,
      confidence,
      similarity,
      targetIndex,
      heardIndex: heardWord.commitIndex,
      ...location
    }
  }
  return {
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
  }
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

function buildStableProgression(statuses = [], extraWords = [], options = {}) {
  const strict = options.strictProgression !== false
  const firstBlockingIndex = statuses.findIndex(word => word.status !== 'correct')
  const visibleStatuses = strict && firstBlockingIndex >= 0
    ? statuses.map((word, index) => index <= firstBlockingIndex ? word : { ...word, status: 'pending', note: 'Locked until the previous word is green.' })
    : statuses
  const advancedCount = visibleStatuses.filter(word => word.status && word.status !== 'pending').length
  const completedWords = statuses.filter(word => ['correct', 'partial'].includes(word.status)).length
  return {
    owner: 'quran-alignment-engine',
    currentIndex: firstBlockingIndex >= 0 ? firstBlockingIndex : statuses.length,
    highestStableIndex: Math.max(0, completedWords - 1),
    advancedCount,
    totalWords: statuses.length,
    progressPercentage: statuses.length ? Math.round((advancedCount / statuses.length) * 100) : 0,
    completionPercentage: statuses.length ? Math.round((completedWords / statuses.length) * 100) : 0,
    complete: statuses.length > 0 && statuses.every(word => word.status === 'correct') && !extraWords.length,
    visibleStatuses
  }
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
  for (let index = 1; index < heardWords.length; index += 1) {
    const current = heardWords[index]
    const previous = heardWords[index - 1]
    if (!current?.word || current.word !== previous?.word) continue
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
  for (const item of extraWords) {
    if (item?.type !== 'repetition' || !item.word) continue
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
      const heardCount = words.filter(word => word.status !== 'pending' && word.actual).length
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
      const firstMissing = earlierWords.find(word => word.status === 'pending')
      if (!firstMissing) continue
      const sameAyahRecoveredAfterMissing = earlierWords
        .some(word => Number(word.targetIndex) > Number(firstMissing.targetIndex) && word.status !== 'pending')
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
  const skippedWords = buildSkippedWordGroups(
    statuses
      .filter(word => word.status === 'pending')
      .map(word => ({
        word: word.text,
        expectedIndex: word.targetIndex,
        ayahKey: word.ayahKey || '',
        ayahNumber: word.ayahNumber ?? null,
        ayahWordIndex: word.ayahWordIndex
      }))
  )
  return {
    correct: statuses.filter(word => word.status === 'correct').map(word => word.text),
    missing: statuses.filter(word => word.status === 'pending').map(word => word.text),
    extra: extraWords.map(item => item.display || item.word).filter(Boolean),
    partial: statuses
      .filter(word => word.status === 'partial')
      .map(word => ({ expected: word.text, actual: word.actual || '', confidence: Number(word.confidence || 0), similarity: Number(word.similarity || 0) })),
    incorrect: statuses
      .filter(word => word.status === 'incorrect')
      .map(word => ({ expected: word.text, actual: word.actual || '', confidence: Number(word.confidence || 0), similarity: Number(word.similarity || 0), outOfOrder: !!word.outOfOrder })),
    repeated: (structural.repeatedWords || []).map(item => item.word).filter(Boolean),
    repeatedPhrases: (structural.repeatedPhrases || []).map(item => item.phrase).filter(Boolean),
    skippedWords,
    wordSkips: skippedWords,
    skippedAyahs: structural.skippedAyahs || [],
    verseJumps: structural.verseJumps || [],
    sequenceErrors: structural.sequenceErrors || []
  }
}

function buildAnalysis({ statuses = [], heardWords = [], extraWords = [], mistakes = {}, targetWords = [], targetAyahs = [], targetUnits = [], targetText = '', operations = [], progression = {}, structural = {}, metadata = {} }) {
  const omissions = statuses
    .filter(word => word.status === 'pending')
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
    .filter(item => item.type === 'repetition')
    .map(item => ({ word: item.display || item.word, heardIndex: item.heardIndex, confidence: Number(item.confidence || 0) }))
  const repeatedWords = structural.repeatedWords?.length ? structural.repeatedWords : repetitions
  const repeatedPhrases = structural.repeatedPhrases || []
  const skippedWords = buildSkippedWordGroups(omissions)
  const weakWords = statuses
    .filter(word => word.status !== 'correct' || Number(word.confidence || 1) < 0.78)
    .map(word => ({
      word: word.text,
      index: word.targetIndex,
      ayahKey: word.ayahKey || '',
      ayahNumber: word.ayahNumber ?? null,
      ayahWordIndex: word.ayahWordIndex,
      status: word.status === 'pending' ? 'omission' : word.status,
      confidence: Number(word.confidence || 0),
      similarity: Number(word.similarity || 0)
    }))
  const matchedCount = statuses.filter(word => ['correct', 'partial'].includes(word.status)).length
  const reviewRecommendations = buildReviewRecommendations({ mistakes, weakWords, repetitions: repeatedWords, structural })
  const feedback = buildDetailedFeedback({
    omissions,
    substitutions,
    extraWords,
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
      omissions: omissions.length,
      extra: mistakes.extra?.length || 0
    },
    completionPercentage: statuses.length ? Math.round((matchedCount / statuses.length) * 100) : 0,
    omissions,
    omissionCount: omissions.length,
    substitutions,
    substitutionCount: substitutions.length,
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

function buildDetailedFeedback({ omissions = [], substitutions = [], extraWords = [], repeatedWords = [], repeatedPhrases = [], skippedAyahs = [], sequenceErrors = [], verseJumpDetected = false } = {}) {
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
  if (extraWords.length) feedback.push(`Extra words heard: ${extraWords.slice(0, 6).map(item => item.display || item.word).join('، ')}${extraWords.length > 6 ? '...' : ''}.`)
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
    ? statuses.filter(word => ['correct', 'partial'].includes(word.status)).length / statuses.length
    : 0
  const structuralPenalty = Math.min(0.35, (
    (structural.skippedAyahs?.length || 0) * 0.12
    + (structural.sequenceErrors?.length || 0) * 0.1
    + (structural.verseJumpDetected ? 0.08 : 0)
    + (structural.repeatedPhrases?.length || 0) * 0.03
  ))
  const scoreConfidence = Math.max(0.25, Math.min(1, Number(accuracyScore || 0) / 100))
  const confidence = (averageConfidence * 0.5) + (matchedRatio * 0.3) + (scoreConfidence * 0.2) - structuralPenalty
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
