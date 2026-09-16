export const QURAN_VOCABULARY_VERSION = 'quran-vocab-v2-empty'

// Entries are admitted only after paired correct/substitution audio benchmarks.
// Keep this list small: it is never generated from the learner's selected range.
export const APPROVED_QURAN_VOCABULARY = Object.freeze([])

export function getSpeechmaticsQuranVocabulary() {
  return APPROVED_QURAN_VOCABULARY
    .filter(({ benchmark }) => benchmark.custom_correct && !benchmark.baseline_correct && benchmark.substitution_preserved)
    .map(({ content }) => ({ content }))
}

export function buildSpeechmaticsRecitationConfig(options = {}) {
  const additionalVocab = getSpeechmaticsQuranVocabulary()
  const config = {
    language: String(options.language || 'ar').trim() || 'ar',
    model: 'enhanced',
    enable_partials: true,
    diarization: 'speaker',
    speaker_diarization_config: { speaker_sensitivity: 0.5 },
  }
  if (additionalVocab.length) config.additional_vocab = additionalVocab
  return config
}
