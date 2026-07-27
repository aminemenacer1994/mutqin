export {
  memorisationDetectionApi,
  buildAssessmentAyahs,
  buildRecognitionWords,
} from './api'

export const AMD_STAGES = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  STARTING: 'starting',
  LISTENING: 'listening',
  PROCESSING: 'processing',
  ANALYSING: 'analysing',
  RESULTS: 'results',
  PLAN: 'plan',
  PLAN_ADJUSTED: 'plan_adjusted',
  PRACTICE_ACTIVE: 'practice_active',
  PRACTICE_COMPLETE: 'practice_complete',
  RETEST: 'retest',
  ERROR: 'error',
})

/**
 * Kill-switch for AI Memorisation Detection / AI Recite test modals.
 * Set true only when the live speech + assessment flow is stable again.
 */
export const AI_TEST_MODALS_ENABLED = false

/** localStorage: hide the Ready howto after the learner has started once. */
export const AMD_HOWTO_SEEN_KEY = 'mutqin.amd.howtoSeen'

export function createAmdState() {
  return {
    open: false,
    stage: AMD_STAGES.IDLE,
    scope: 'session',
    surahNumber: 0,
    surahName: '',
    startAyah: 0,
    endAyah: 0,
    ayahCount: 0,
    micStatus: 'unknown', // unknown | granted | denied | unsupported
    error: '',
    liveStatus: '',
    assessment: null,
    analysis: null,
    practicePlan: null,
    improvement: null,
    adjustOpen: false,
    draftAdjust: null,
    busy: false,
    startedAt: 0,
    previousAssessmentId: null,
    recommendationId: null,
    practiceHud: null,
  }
}

export function amdStageLabel(stage, t = null) {
  const key = `memorisation.amd.stages.${stage}`
  const translated = typeof t === 'function' ? t(key) : null
  if (translated && translated !== key) return translated
  const fallback = {
    idle: 'Ready',
    ready: 'Ready',
    starting: 'Starting',
    listening: 'Listening',
    processing: 'Processing',
    analysing: 'Analysing',
    results: 'Assessment results',
    plan: 'Practice plan',
    plan_adjusted: 'Plan adjusted',
    practice_active: 'Practice active',
    practice_complete: 'Practice complete',
    retest: 'Re-test',
    error: 'Something went wrong',
  }
  return fallback[stage] || 'Ready'
}

export function wordVisualClass(status = '') {
  const value = String(status || '').toLowerCase()
  if (value === 'correct' || value === 'green') return 'is-correct'
  if (value === 'minor_mistake' || value === 'partial' || value === 'amber') return 'is-minor'
  if (value === 'wrong' || value === 'incorrect' || value === 'red') return 'is-wrong'
  if (value === 'missing' || value === 'omitted' || value === 'black') return 'is-missing'
  if (value === 'extra' || value === 'grey' || value === 'gray') return 'is-extra'
  return 'is-uncertain'
}
