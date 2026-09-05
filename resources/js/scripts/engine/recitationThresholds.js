/**
 * Central AI recitation scoring / comparison thresholds.
 *
 * Word similarity, confidence floors, and attempt banding live here so JS
 * alignment, result state, and tests stay aligned. PHP mirrors these values
 * in App\Services\Memorisation\RecitationScoringThresholds.
 */

export const RECITATION_THRESHOLDS = Object.freeze({
  /** Soft ASR letter conflation may lift near-misses toward amber, never alone to green. */
  softSimilarityCap: 0.74,
  /** Floor for painting a word green (final scoring). */
  correctSimilarity: 0.79,
  /** Live AMD green floor — below final so ASR jitter does not stick on red. */
  liveCorrectSimilarity: 0.63,
  /** Final / server amber (minor) floor. */
  partialSimilarity: 0.48,
  /** Live AMD amber floor. */
  livePartialSimilarity: 0.36,
  /** Below this (non-exact) recognition is uncertain — not a learner mistake. */
  uncertainConfidence: 0.55,
  /** AMD live: defer low-confidence near-matches to uncertain instead of red. */
  amdUncertainConfidence: 0.48,
  /** Live AMD: do not require high STT confidence for a correct paint. */
  liveMinConfidenceForCorrect: 0.28,
  /** Live AMD: similarity greens need less provider confidence than final scoring. */
  liveMinConfidenceForSimilarityCorrect: 0.28,
  /**
   * Non-exact similarity matches must clear this before green.
   * Exact / article / alef-optional equals may still be green below this.
   */
  minConfidenceForSimilarityCorrect: 0.55,
  /** Incoming ASR word filter for stabilize (reject below). */
  stabilizeConfidenceThreshold: 0.70,
  /** Drop ultra-low provider tokens before alignment. */
  dropHeardConfidenceBelow: 0.15,
  /** Same-word ASR re-emits / brief stutters within this gap are not repetitions. */
  asrReemitMaxGapMs: 650,
  /** Attempt-level: mean recognition confidence below this is unusable (no spoken paint). */
  minRecognitionConfidence: 0.35,
  /** Attempt-level: do not band as strong when evaluation confidence is below this. */
  minEvaluationConfidenceForStrong: 0.45,
  /** Minimum MediaRecorder / attempt length before assessment is fair. */
  minRecordingSeconds: 1.5,
  /** Minimum detected usable speech duration. */
  minUsableSpeechSeconds: 0.8,
  /** Accuracy banding. */
  strongAccuracyMin: 80,
  developingAccuracyMin: 55,
  progressionWithErrorsMin: 85,
  /** Partial word credit in accuracy (× clamped confidence). */
  partialAccuracyWeight: 0.4,
  /** Uncertain word credit in accuracy. */
  uncertainAccuracyWeight: 0.35,
  /** Extra / wrong-order accuracy penalties per item. */
  extraPenalty: 0.2,
  wrongOrderPenalty: 0.2,
})

/** @deprecated Prefer RECITATION_THRESHOLDS.softSimilarityCap */
export const RECITATION_SOFT_SIMILARITY_CAP = RECITATION_THRESHOLDS.softSimilarityCap
/** @deprecated Prefer RECITATION_THRESHOLDS.correctSimilarity */
export const RECITATION_CORRECT_SIMILARITY = RECITATION_THRESHOLDS.correctSimilarity
/** @deprecated Prefer RECITATION_THRESHOLDS.uncertainConfidence */
export const RECITATION_UNCERTAIN_CONFIDENCE = RECITATION_THRESHOLDS.uncertainConfidence
/** @deprecated Prefer RECITATION_THRESHOLDS.amdUncertainConfidence */
export const RECITATION_AMD_UNCERTAIN_CONFIDENCE = RECITATION_THRESHOLDS.amdUncertainConfidence
/** @deprecated Prefer RECITATION_THRESHOLDS.liveCorrectSimilarity */
export const RECITATION_LIVE_CORRECT_SIMILARITY = RECITATION_THRESHOLDS.liveCorrectSimilarity
/** @deprecated Prefer RECITATION_THRESHOLDS.liveMinConfidenceForCorrect */
export const RECITATION_LIVE_MIN_CONFIDENCE_FOR_CORRECT = RECITATION_THRESHOLDS.liveMinConfidenceForCorrect
/** @deprecated Prefer RECITATION_THRESHOLDS.liveMinConfidenceForSimilarityCorrect */
export const RECITATION_LIVE_MIN_CONFIDENCE_FOR_SIMILARITY_CORRECT = RECITATION_THRESHOLDS.liveMinConfidenceForSimilarityCorrect
/** @deprecated Prefer RECITATION_THRESHOLDS.livePartialSimilarity */
export const RECITATION_LIVE_PARTIAL_SIMILARITY = RECITATION_THRESHOLDS.livePartialSimilarity
/** @deprecated Prefer RECITATION_THRESHOLDS.asrReemitMaxGapMs */
export const RECITATION_ASR_REEMIT_MAX_GAP_MS = RECITATION_THRESHOLDS.asrReemitMaxGapMs
/** @deprecated Prefer RECITATION_THRESHOLDS.stabilizeConfidenceThreshold */
export const DEFAULT_RECITATION_CONFIDENCE_THRESHOLD = RECITATION_THRESHOLDS.stabilizeConfidenceThreshold
