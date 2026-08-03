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

/** localStorage: learner preference for tajweed colouring in the AI check. */
export const AMD_TAJWEED_PREF_KEY = 'mutqin.amd.tajweed'

export function normaliseAmdTajweedEnabled(value, fallback = true) {
  if (value === true || value === 1 || value === '1' || value === 'on' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'off' || value === 'false') return false
  return fallback
}

export function readStoredAmdTajweedEnabled(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return true
  try {
    const raw = storage.getItem(AMD_TAJWEED_PREF_KEY)
    if (raw == null) return true
    return normaliseAmdTajweedEnabled(raw, true)
  } catch {
    return true
  }
}

export function storeAmdTajweedEnabled(enabled, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return
  try {
    storage.setItem(AMD_TAJWEED_PREF_KEY, enabled ? '1' : '0')
  } catch { /* ignore */ }
}
