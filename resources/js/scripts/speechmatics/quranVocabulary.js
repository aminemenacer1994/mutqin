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
  }
  // AMD live: single reciter on the mic — speaker diarization often drops words
  // after the first ayah and the cursor never crosses the boundary.
  if (!options.amdLive) {
    config.diarization = 'speaker'
    config.speaker_diarization_config = { speaker_sensitivity: 0.5 }
  }
  // Language stays ar, model enhanced.
  // No output_locale and no dialect switch. additional_vocab is never the selected ayah.
  if (additionalVocab.length) config.additional_vocab = additionalVocab
  return config
}
