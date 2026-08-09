/**
 * Lazy-loaded adaptive assessment surface. Kept as a single async chunk so the
 * memorisation shell does not pay for quiz/assessment code until post-session
 * adaptive check opens.
 */
export {
  startAdaptiveCheck,
  answerCurrentQuestion,
  completeAssessment,
  buildAssessmentResultViewModel,
  loadAssessmentSession,
  clearAssessmentSession,
  requestHint,
  pauseAssessment,
  resumeAssessment,
} from './AdaptiveAssessmentService'

export { loadMasteryMap } from './LearnerMasteryService'
export { recordEffectiveness } from './RecommendationEffectivenessService'
