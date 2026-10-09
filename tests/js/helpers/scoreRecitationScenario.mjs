/**
 * Shared Speechmatics-path scoring for edge + captured recitation fixtures.
 */
import {
  buildDeterministicRecitationResult,
  buildQuranAlignment,
  createRecognitionState,
  selectPrimaryReciterWords,
  stabilizeRecognitionEvent,
} from '../../../resources/js/scripts/engine/recitation_analysis.js'

const PARTIAL_CONFIDENCE = 0.68

/** Mirrors extractSpeechmaticsTranscriptWords without importing Vue runtime. */
export function extractCapturedTranscriptWords(message = {}, { isPartial = false } = {}) {
  return (Array.isArray(message?.results) ? message.results : [])
    .filter((item) => item?.type === 'word')
    .map((item) => {
      const alternatives = Array.isArray(item?.alternatives) ? item.alternatives : []
      const alternative = alternatives
        .filter((candidate) => String(candidate?.content || '').trim())
        .sort((left, right) => {
          const leftConfidence = Number(left?.confidence)
          const rightConfidence = Number(right?.confidence)
          if (Number.isFinite(leftConfidence) && Number.isFinite(rightConfidence)) {
            return rightConfidence - leftConfidence
          }
          return 0
        })[0] || alternatives[0] || null
      const word = String(alternative?.content || '').trim()
      const confidence = Number(alternative?.confidence)
      return {
        word,
        confidence: Number.isFinite(confidence) ? confidence : (isPartial ? PARTIAL_CONFIDENCE : 1),
        start: Number.isFinite(Number(item?.start_time)) ? Number(item.start_time) : null,
        end: Number.isFinite(Number(item?.end_time)) ? Number(item.end_time) : null,
        speaker: String(alternative?.speaker || item?.speaker || '').trim() || null,
      }
    })
    .filter((item) => item.word)
}

export function scoreSpeechmaticsPath(scenario, options = {}) {
  const confidenceThreshold = Number.isFinite(Number(options.confidenceThreshold))
    ? Number(options.confidenceThreshold)
    : 0.35

  let state = stabilizeRecognitionEvent(createRecognitionState(), {
    provider: 'speechmatics',
    isFinal: true,
    speechFinal: true,
    segmentId: scenario.id,
    words: scenario.recognitionWords,
  }, { confidenceThreshold })

  const selected = selectPrimaryReciterWords(state.committedWords, scenario.targetText)
  const words = selected.reliable ? selected.words : []
  const alignment = buildQuranAlignment(scenario.targetText, words, { strictProgression: false })
  const result = buildDeterministicRecitationResult(scenario.targetText, words, {
    strictProgression: false,
    rejectedWords: state.rejectedWords || [],
  })
  result.rawRecognitionWords = Array.isArray(scenario.recognitionWords)
    ? scenario.recognitionWords
    : []
  result.rejectedWords = Array.isArray(state.rejectedWords) ? state.rejectedWords : []

  return {
    accuracy: Number(result.accuracyScore ?? 0),
    confidence: Number(result.confidence ?? 0),
    reliable: selected.reliable,
    speakerStatus: selected.status ?? 'clear',
    wordCount: words.length,
    rejectedWordCount: result.rejectedWords.length,
    types: (alignment.wordStatuses || []).map((word) => String(word.type)),
    statuses: (alignment.wordStatuses || []).map((word) => String(word.status)),
    extras: (alignment.extraWords || []).map((word) => String(word.type)),
    result,
    words,
  }
}
