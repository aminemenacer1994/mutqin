/**
 * Canonical AI recitation pipeline fixtures.
 * Covers perfect, minor variation, clear error, skipped word, silence,
 * low confidence, and provider failure — without raw audio payloads.
 */

export const IKHLAS_TARGET = 'قُلْ هُوَ ٱللَّهُ أَحَدٌ'

export const recitationPipelineFixtures = Object.freeze({
  perfect: {
    id: 'perfect-recitation',
    targetText: IKHLAS_TARGET,
    recognitionWords: [
      { word: 'قل', confidence: 0.96, start: 0.1, end: 0.28 },
      { word: 'هو', confidence: 0.95, start: 0.3, end: 0.45 },
      { word: 'الله', confidence: 0.97, start: 0.48, end: 0.72 },
      { word: 'أحد', confidence: 0.94, start: 0.75, end: 0.98 },
    ],
    durationSeconds: 4.2,
    expected: {
      statuses: ['correct', 'correct', 'correct', 'correct'],
      resultState: 'strong',
      minAccuracy: 90,
    },
  },

  minorVariation: {
    id: 'minor-soft-letter-variation',
    targetText: 'ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    recognitionWords: [
      { word: 'اهدنا', confidence: 0.93, start: 0.1, end: 0.4 },
      { word: 'السراط', confidence: 0.9, start: 0.45, end: 0.8 },
      { word: 'المستقيم', confidence: 0.92, start: 0.85, end: 1.3 },
    ],
    durationSeconds: 5,
    expected: {
      // Soft ص/س conflation stays amber — never fabricated green.
      statuses: ['correct', 'partial', 'correct'],
      colorForPartial: 'amber',
      maxAccuracy: 99,
    },
  },

  clearWordError: {
    id: 'clear-word-error',
    targetText: IKHLAS_TARGET,
    recognitionWords: [
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3 },
      { word: 'هو', confidence: 0.94, start: 0.32, end: 0.5 },
      { word: 'الله', confidence: 0.96, start: 0.52, end: 0.8 },
      { word: 'صمد', confidence: 0.93, start: 0.82, end: 1.1 },
    ],
    durationSeconds: 4,
    expected: {
      statuses: ['correct', 'correct', 'correct', 'incorrect'],
      mistakenTarget: 'أَحَدٌ',
      mistakenActual: 'صمد',
      colorForMistake: 'red',
    },
  },

  skippedWord: {
    id: 'skipped-word',
    targetText: IKHLAS_TARGET,
    recognitionWords: [
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3 },
      { word: 'الله', confidence: 0.94, start: 0.35, end: 0.6 },
      { word: 'أحد', confidence: 0.93, start: 0.65, end: 0.9 },
    ],
    durationSeconds: 3.5,
    expected: {
      statuses: ['correct', 'omitted', 'correct', 'correct'],
      omittedTarget: 'هو',
      omittedDisplay: 'هُوَ',
      colorForOmitted: 'black',
    },
  },

  silence: {
    id: 'silence-no-speech',
    targetText: IKHLAS_TARGET,
    recognitionWords: [],
    durationSeconds: 4,
    noSpeech: true,
    expected: {
      attemptClass: 'silence_no_speech',
      resultState: 'insufficient_audio',
      validCheck: false,
    },
  },

  lowConfidence: {
    id: 'low-confidence-similarity',
    targetText: IKHLAS_TARGET,
    recognitionWords: [
      { word: 'قل', confidence: 0.92, start: 0.1, end: 0.28 },
      // Near-match with low confidence must be uncertain, not fabricated correct.
      { word: 'هي', confidence: 0.32, start: 0.3, end: 0.48 },
      { word: 'الله', confidence: 0.91, start: 0.5, end: 0.75 },
      { word: 'أحد', confidence: 0.9, start: 0.78, end: 1.0 },
    ],
    durationSeconds: 4,
    expected: {
      statusAt: { هو: 'uncertain' },
      notMistake: true,
    },
  },

  lowConfidenceFabricatedCorrect: {
    id: 'low-confidence-no-fabricated-strong',
    targetText: IKHLAS_TARGET,
    // Exact tokens at very low mean confidence: accuracy may look high,
    // but attempt banding must not invent a strong result from noise.
    recognitionWords: [
      { word: 'قل', confidence: 0.22, start: 0.1, end: 0.25 },
      { word: 'هو', confidence: 0.2, start: 0.28, end: 0.4 },
      { word: 'الله', confidence: 0.18, start: 0.42, end: 0.6 },
      { word: 'أحد', confidence: 0.19, start: 0.62, end: 0.8 },
    ],
    durationSeconds: 3.5,
    expected: {
      notStrongWhenConfidenceLow: true,
      maxEvaluationConfidenceForStrong: 0.45,
    },
  },

  providerFailure: {
    id: 'provider-failure',
    error: { message: 'Speechmatics websocket closed', providerType: 'speechmatics' },
    expected: {
      failureKind: 'provider',
      attemptClass: 'provider_network_error',
      validCheck: false,
      retryable: true,
    },
  },

  shortRecording: {
    id: 'too-short-recording',
    targetText: IKHLAS_TARGET,
    recognitionWords: [
      { word: 'قل', confidence: 0.9, start: 0, end: 0.2 },
    ],
    durationSeconds: 0.4,
    expected: {
      attemptClass: 'recording_too_short',
      resultState: 'insufficient_audio',
      validCheck: false,
    },
  },

  staleAttempt: {
    id: 'stale-provider-response',
    activeAttemptId: 'recitation-1',
    responseAttemptId: 'recitation-2',
    expected: {
      accept: false,
      attemptClass: 'cancelled_stale',
    },
  },

  punctuationOrthography: {
    id: 'punctuation-and-orthography',
    // Display text keeps harakat; comparison strips punctuation + folds alef forms.
    displayText: 'قُلْ، هُوَ ٱللَّهُ أَحَدٌ؟',
    compareLeft: 'قُلْ، هُوَ ٱللَّهُ أَحَدٌ؟',
    compareRight: 'قل هو الله احد',
    expected: {
      displayKeepsHarakat: true,
      normalizedEqual: true,
    },
  },
})
