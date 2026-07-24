/**
 * Adaptive memorisation assessment — shared constants.
 * Domain logic stays here; Vue only consumes view models.
 */

export const DIFFICULTY = Object.freeze({
  RECOGNITION: 1,
  GUIDED_RECALL: 2,
  INDEPENDENT_RECALL: 3,
  PRECISION: 4,
})

export const DIFFICULTY_LABELS = Object.freeze({
  1: 'recognition',
  2: 'guided_recall',
  3: 'independent_recall',
  4: 'precision',
})

/** Question modes by difficulty. Core modes are interactive; precision uses simpler renderers. */
export const QUESTION_TYPES = Object.freeze({
  // Recognition
  SURAH_IDENTIFICATION: 'surah_identification',
  MISSING_WORD_OPTIONS: 'missing_word_options',
  SELECT_NEXT_PHRASE: 'select_next_phrase',
  BASIC_PHRASE_ORDERING: 'basic_phrase_ordering',
  MATCH_BEGINNING_ENDING: 'match_beginning_ending',
  // Guided recall
  COMPLETE_AYAH_REDUCED: 'complete_ayah_reduced',
  PREVIOUS_NEXT_AYAH: 'previous_next_ayah',
  MUSHAF_HIDE_PARTIAL: 'mushaf_hide_partial',
  ARRANGE_AYAH_SEGMENTS: 'arrange_ayah_segments',
  BEGINNING_END_RECALL: 'beginning_end_recall',
  // Independent recall
  COMPLETE_AYAH_OPEN: 'complete_ayah_open',
  MISSING_AYAH: 'missing_ayah',
  RANDOM_START_CONTINUATION: 'random_start_continuation',
  MUSHAF_HIDE_HEAVY: 'mushaf_hide_heavy',
  AI_RECITE_NO_TEXT: 'ai_recite_no_text',
  // Precision / advanced (simpler renderers)
  HARAKAH_CHECK: 'harakah_check',
  MUTASHABIHAT_COMPARISON: 'mutashabihat_comparison',
  SIMILAR_AYAH_IDENTIFICATION: 'similar_ayah_identification',
  CROSS_RANGE_SEQUENCE: 'cross_range_sequence',
  DELAYED_RECALL: 'delayed_recall',
  PRONUNCIATION_FLUENCY: 'pronunciation_fluency',
})

export const QUESTION_TYPES_BY_DIFFICULTY = Object.freeze({
  // Prefer tap-to-answer MCQ for beginners — ordering / open text is harder to follow.
  [DIFFICULTY.RECOGNITION]: [
    QUESTION_TYPES.MISSING_WORD_OPTIONS,
    QUESTION_TYPES.SELECT_NEXT_PHRASE,
    QUESTION_TYPES.SURAH_IDENTIFICATION,
    QUESTION_TYPES.MATCH_BEGINNING_ENDING,
  ],
  [DIFFICULTY.GUIDED_RECALL]: [
    QUESTION_TYPES.COMPLETE_AYAH_REDUCED,
    QUESTION_TYPES.PREVIOUS_NEXT_AYAH,
    QUESTION_TYPES.BEGINNING_END_RECALL,
    QUESTION_TYPES.MUSHAF_HIDE_PARTIAL,
  ],
  [DIFFICULTY.INDEPENDENT_RECALL]: [
    QUESTION_TYPES.MISSING_AYAH,
    QUESTION_TYPES.COMPLETE_AYAH_REDUCED,
    QUESTION_TYPES.PREVIOUS_NEXT_AYAH,
    // AI Recite is a separate completion CTA — never embed it mid-check (freezes the flow).
  ],
  [DIFFICULTY.PRECISION]: [
    QUESTION_TYPES.HARAKAH_CHECK,
    QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION,
    QUESTION_TYPES.MUTASHABIHAT_COMPARISON,
    QUESTION_TYPES.CROSS_RANGE_SEQUENCE,
  ],
})

export const SKILLS = Object.freeze({
  PHRASE_RECALL: 'phraseRecall',
  AYAH_SEQUENCE: 'ayahSequence',
  BEGINNINGS: 'beginnings',
  ENDINGS: 'endings',
  TEXTUAL_PRECISION: 'textualPrecision',
  SPOKEN_RECALL: 'spokenRecall',
  FLUENCY: 'fluency',
  INDEPENDENCE: 'independence',
  HINT_DEPENDENCY: 'hintDependency',
  VISUAL_TEXT_DEPENDENCY: 'visualTextDependency',
  AUDIO_DEPENDENCY: 'audioDependency',
  SIMILAR_AYAH_CONFUSION: 'similarAyahConfusion',
  DELAYED_RETENTION: 'delayedRetention',
  CONFIDENCE_CALIBRATION: 'confidenceCalibration',
})

/** Result panel skills (user-facing, not a single %). */
export const RESULT_SKILL_KEYS = Object.freeze([
  'recall',
  'ayahSequence',
  'textualPrecision',
  'independentRecitation',
])

export const ASSESSMENT_REASON_CODES = Object.freeze({
  SESSION_INCOMPLETE: 'SESSION_INCOMPLETE',
  LOW_RECALL: 'LOW_RECALL',
  SEQUENCE_ERRORS: 'SEQUENCE_ERRORS',
  HIGH_HINT_DEPENDENCY: 'HIGH_HINT_DEPENDENCY',
  VISUAL_DEPENDENCY: 'VISUAL_DEPENDENCY',
  AUDIO_DEPENDENCY: 'AUDIO_DEPENDENCY',
  SPOKEN_HESITATION: 'SPOKEN_HESITATION',
  OMISSION_ERRORS: 'OMISSION_ERRORS',
  SIMILAR_AYAH_CONFUSION: 'SIMILAR_AYAH_CONFUSION',
  LOW_DELAYED_RETENTION: 'LOW_DELAYED_RETENTION',
  HIGH_PERFORMANCE: 'HIGH_PERFORMANCE',
  LOW_CONFIDENCE: 'LOW_CONFIDENCE',
  OVERCONFIDENCE: 'OVERCONFIDENCE',
  REVIEW_OVERDUE: 'REVIEW_OVERDUE',
})

export const ASSESSMENT_EVENTS = Object.freeze({
  ADAPTIVE_CHECK_STARTED: 'adaptive_check_started',
  QUESTION_PRESENTED: 'question_presented',
  QUESTION_ANSWERED: 'question_answered',
  ANSWER_CORRECT: 'answer_correct',
  ANSWER_INCORRECT: 'answer_incorrect',
  HINT_REQUESTED: 'hint_requested',
  DIFFICULTY_CHANGED: 'difficulty_changed',
  ASSESSMENT_STOPPED_EARLY: 'assessment_stopped_early',
  ASSESSMENT_COMPLETED: 'assessment_completed',
  AI_RECITE_REQUESTED: 'ai_recite_requested',
  SKILL_WEAKNESS_DETECTED: 'skill_weakness_detected',
  MASTERY_UPDATED: 'mastery_updated',
  RECOMMENDATION_GENERATED: 'recommendation_generated',
  RECOMMENDATION_ACCEPTED: 'recommendation_accepted',
  RECOMMENDATION_ADJUSTED: 'recommendation_adjusted',
  REVIEW_SCHEDULED: 'review_scheduled',
  REVIEW_COMPLETED: 'review_completed',
})

export const GOALS = Object.freeze({
  RESUME: 'resume',
  REPEAT: 'repeat',
  REINFORCE: 'reinforce',
  TEST: 'test',
  REVIEW: 'review',
  ADVANCE: 'advance',
  SIMILAR_AYAH_PRACTICE: 'similar_ayah_practice',
})

export const TECHNIQUES = Object.freeze({
  LISTEN_AND_REPEAT: 'talqin',
  PHRASE_CHUNKS: 'focus',
  ONE_AYAH_AT_A_TIME: 'focus',
  SEQUENCE_CHAINING: 'chaining',
  MEMORY_WORD_ANCHORS: 'anchor',
  MUSHAF_HIDING: 'blur',
  ACTIVE_RECALL: 'blur',
  AI_RECITE: 'ai_recite',
  MUTASHABIHAT_COMPARISON: 'mutashabihat',
})

export const APPROVED_PLAYBACK_SPEEDS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5])

export const ASSESSMENT_LIMITS = Object.freeze({
  MIN_QUESTIONS: 3,
  MAX_QUESTIONS: 5,
  START_DIFFICULTY: DIFFICULTY.RECOGNITION,
  SLOW_RESPONSE_MS: 12000,
  EARLY_STOP_CONFIDENCE: 0.72,
  WEAK_SKILL_THRESHOLD: 0.45,
  STRONG_SKILL_THRESHOLD: 0.75,
})

export const MASTERY_FIELDS = Object.freeze([
  'recallMastery',
  'sequenceMastery',
  'textualPrecision',
  'spokenAccuracy',
  'fluency',
  'independence',
  'visualDependency',
  'audioDependency',
  'hintDependency',
  'similarAyahMastery',
  'retentionStrength',
  'confidenceCalibration',
  'evidenceConfidence',
])

export const STORAGE_KEYS = Object.freeze({
  ASSESSMENT_SESSION: 'mutqin.adaptiveAssessment.session',
  MASTERY_MAP: 'mutqin.adaptiveAssessment.mastery',
  EFFECTIVENESS: 'mutqin.adaptiveAssessment.effectiveness',
  EVENTS: 'mutqin.adaptiveAssessment.events',
})
