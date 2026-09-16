export const QURAN_VOCABULARY_VERSION = 'quran-vocab-v1'

// Entries are admitted only after paired correct/substitution audio benchmarks.
// Keep this list small: it is never generated from the learner's selected range.
export const APPROVED_QURAN_VOCABULARY = Object.freeze([
  Object.freeze({ content: 'كهيعص', benchmark: Object.freeze({ id: 'muqattaat-kaf-ha-ya-ayn-sad-v1', baseline_correct: false, custom_correct: true, substitution_preserved: true }) }),
  Object.freeze({ content: 'عسق', benchmark: Object.freeze({ id: 'muqattaat-ayn-sin-qaf-v1', baseline_correct: false, custom_correct: true, substitution_preserved: true }) }),
  Object.freeze({ content: 'طسم', benchmark: Object.freeze({ id: 'muqattaat-ta-sin-mim-v1', baseline_correct: false, custom_correct: true, substitution_preserved: true }) }),
])

export function getSpeechmaticsQuranVocabulary() {
  return APPROVED_QURAN_VOCABULARY
    .filter(({ benchmark }) => benchmark.custom_correct && !benchmark.baseline_correct && benchmark.substitution_preserved)
    .map(({ content }) => ({ content }))
}

export function buildSpeechmaticsRecitationConfig(options = {}) {
  return {
    language: String(options.language || 'ar').trim() || 'ar',
    model: 'enhanced',
    enable_partials: true,
    diarization: 'speaker',
    speaker_diarization_config: { speaker_sensitivity: 0.5 },
    additional_vocab: getSpeechmaticsQuranVocabulary(),
  }
}
