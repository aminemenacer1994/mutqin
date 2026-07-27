/**
 * Streamlined AI Memorisation Test stages.
 * Legacy plan/results stages remain for type compatibility but are unused in this flow.
 */
export const AMD_STAGES = Object.freeze({
  IDLE: 'idle',
  READY: 'ready',
  STARTING: 'starting',
  LISTENING: 'listening',
  PAUSED: 'paused',
  COMPLETE: 'complete',
  ERROR: 'error',
  // Legacy (bypassed in streamlined journey)
  PROCESSING: 'processing',
  ANALYSING: 'analysing',
  RESULTS: 'results',
  PLAN: 'plan',
  PLAN_ADJUSTED: 'plan_adjusted',
  PRACTICE_ACTIVE: 'practice_active',
  PRACTICE_COMPLETE: 'practice_complete',
  RETEST: 'retest',
})

/**
 * Kill-switch for the AI Memorisation Test modal.
 * Enabled for the streamlined post-session journey.
 */
export const AI_TEST_MODALS_ENABLED = true

/** localStorage: hide the Ready howto after the learner has started once. */
export const AMD_HOWTO_SEEN_KEY = 'mutqin.amd.howtoSeen'
