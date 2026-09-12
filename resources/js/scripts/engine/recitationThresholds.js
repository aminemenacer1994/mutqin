/**
 * Central AI recitation scoring / comparison thresholds.
 *
 * Word similarity, confidence floors, and attempt banding live here so JS
 * alignment, result state, and tests stay aligned. PHP mirrors these values
 * in App\Services\Memorisation\RecitationScoringThresholds.
 */

export const RECITATION_THRESHOLDS = Object.freeze({
  /** Soft ASR letter conflation may lift near-misses toward amber, never alone to green. */
  softSimilarityCap: 0.72,
  /** Floor for painting a word green (final scoring). Single-letter slips stay amber. */
  correctSimilarity: 0.88,
  /**
   * Live AMD green floor. Must stay above softSimilarityCap so single-edit /
   * ص↔س / ق↔ك swaps cannot paint green. Exact, article, and dagger-alef
   * equals still score 1 and stay green. Speechmatics cannot hear harakāt —
   * those remain display-only.
   */
  liveCorrectSimilarity: 0.88,
  /** Final / server amber (minor) floor. Distant mismatches stay red. */
  partialSimilarity: 0.64,
  /** Live AMD amber floor — same as final so weak overlaps stay red, not “close”. */
  livePartialSimilarity: 0.64,
  /** Below this (non-exact) recognition is uncertain — not a learner mistake. */
  uncertainConfidence: 0.36,
  /** AMD live: only very low-confidence near-matches defer to uncertain. */
  amdUncertainConfidence: 0.36,
  /** Live AMD: exact tokens may be green without a high STT score. */
  liveMinConfidenceForCorrect: 0.45,
  /** Live AMD: similarity-only greens use the same confidence bar as final scoring. */
  liveMinConfidenceForSimilarityCorrect: 0.75,
  /**
   * Non-exact similarity matches must clear this before green.
   * Exact / article / alef-optional equals may still be green below this.
   */
  minConfidenceForSimilarityCorrect: 0.75,
  /** Incoming ASR word filter for stabilize (reject below). */
  stabilizeConfidenceThreshold: 0.70,
  /** Drop ultra-low provider tokens before alignment. */
  dropHeardConfidenceBelow: 0.15,
  /** Same-word ASR re-emits / brief stutters within this gap are not repetitions. */
  asrReemitMaxGapMs: 650,
  /** Attempt-level: mean recognition confidence below this is unusable (no spoken paint). */
  minRecognitionConfidence: 0.35,
  /** Attempt-level: do not band as strong when evaluation confidence is below this. */
  minEvaluationConfidenceForStrong: 0.65,
  /** Minimum MediaRecorder / attempt length before assessment is fair. */
  minRecordingSeconds: 1.5,
  /** Minimum detected usable speech duration. */
  minUsableSpeechSeconds: 0.8,
  /** Accuracy banding. Strong should mean the range is actually secure. */
  strongAccuracyMin: 90,
  developingAccuracyMin: 72,
  /** One hard error may still advance only when the rest is excellent. */
  progressionWithErrorsMin: 93,
  /** Mixed / developing may reinforce-then-continue with this many ambers, no reds. */
  mixedProgressionMaxPartials: 2,
  /** Partial word credit in accuracy (× clamped confidence). */
  partialAccuracyWeight: 0.12,
  /** Uncertain word credit in accuracy — do not pad the score. */
  uncertainAccuracyWeight: 0,
  /** Extra / wrong-order accuracy penalties per item. */
  extraPenalty: 0.35,
  wrongOrderPenalty: 0.28,
})

/**
 * @param {number|null|undefined} accuracy
 * @returns {'strong'|'mixed'|'weak'}
 */
export function recitationAccuracyBand(accuracy) {
  const n = Number(accuracy)
  if (!Number.isFinite(n)) {
    return 'mixed'
  }
  if (n >= RECITATION_THRESHOLDS.strongAccuracyMin) {
    return 'strong'
  }
  if (n >= RECITATION_THRESHOLDS.developingAccuracyMin) {
    return 'mixed'
  }

  return 'weak'
}

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
