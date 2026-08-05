export {
  memorisationDetectionApi,
  buildAssessmentAyahs,
  buildRecognitionWords,
} from './api'

export {
  DIFFICULTY_PERCENTS,
  DEFAULT_DIFFICULTY_PERCENT,
  AMD_DIFFICULTY_PREF_KEY,
  normaliseDifficultyPercent,
  createSeededRng,
  buildHiddenWordSeed,
  selectHiddenWordIndexes,
  isWordHidden,
  areAllHiddenWordsRevealed,
  areAllSessionWordsSettled,
  readStoredDifficultyPercent,
  storeDifficultyPercent,
} from './hiddenWords'

export {
  normalizeForMatch,
  tokenizeForMatch,
  tokensMatch,
  dedupeInterimAgainstCommitted,
  matchSequentialTokens,
  applyMatchedIndexesToLiveWords,
  DEFAULT_FORWARD_WINDOW,
  DEFAULT_MATCH_THRESHOLD,
} from './speechMatch'

export {
  MEM_TEST_FLOW,
  MIC_STATUS,
  createMemTestState,
  deriveMemTestPhase,
  primarySurfaceForMemTest,
  shouldHideCompletionUnderTest,
  resolveMicStatus,
} from './testFlow'

export {
  AMD_MISTAKE_SOUND_PREF_KEY,
  MISTAKE_HANDLING_MODES,
  CONFIRMED_MISTAKE_STATUSES,
  UNCERTAIN_STATUSES,
  MISTAKE_CUE_MIN_CONFIDENCE,
  MISTAKE_CUE_DEBOUNCE_MS,
  MISTAKE_CUE_PEAK_GAIN,
  MISTAKE_VISUAL_MS,
  normaliseMistakeSoundEnabled,
  readStoredMistakeSoundEnabled,
  storeMistakeSoundEnabled,
  isConfirmedMistakeStatus,
  isUncertainWordStatus,
  shouldPlayMistakeCue,
  createMistakeFeedbackController,
} from './mistakeFeedback'

export {
  AMD_AUTO_FOLLOW_PREF_KEY,
  AUTO_FOLLOW_TARGET_RATIO,
  AUTO_FOLLOW_MIN_RATIO,
  AUTO_FOLLOW_MAX_RATIO,
  AUTO_FOLLOW_MIN_DELTA_PX,
  AUTO_FOLLOW_IDLE_RESUME_MS,
  normaliseAutoFollowEnabled,
  readStoredAutoFollowEnabled,
  storeAutoFollowEnabled,
  computeAutoFollowScroll,
  buildWordElementCache,
  resolveActiveWordElement,
  prefersReducedMotion,
  createLiveAutoFollowController,
} from './liveAutoFollow'

export {
  isSettledLiveStatus,
  isPaintedLiveStatus,
  resolveConfirmedWordIndex,
  resolveCandidateWordIndex,
  resolveExpectedWordIndex,
  resolveActiveTajweedSegmentIndex,
  buildLiveRecitationCursor,
  clampCursorToPaceLimit,
  clampStatusesToConfirmedCursor,
  gateUnsettledIssueStatuses,
  LIVE_PACE_DRIP_MS,
  LIVE_PACE_MAX_ADVANCE_PER_UPDATE,
  LIVE_PACE_MAX_WORDS_PER_SECOND,
  LIVE_PACE_SLACK_WORDS,
  mergeLiveRecitationStatuses,
  resolveLivePaceLimit,
} from './liveCursor'

export {
  AMD_STAGES,
  AI_TEST_MODALS_ENABLED,
  AMD_HOWTO_SEEN_KEY,
  AMD_TAJWEED_PREF_KEY,
  normaliseAmdTajweedEnabled,
  readStoredAmdTajweedEnabled,
  storeAmdTajweedEnabled,
} from './stages'

export {
  TIMER_STATES,
  formatElapsedLabel,
  createSessionTimer,
} from './sessionTimer'

import { AMD_STAGES, AMD_HOWTO_SEEN_KEY } from './stages'

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
    micStatus: 'unknown',
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
    difficulty: 100,
    hiddenWordIndexes: [],
    peekActive: false,
    blurActive: true,
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
    paused: 'Paused',
    complete: 'Complete',
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

void AMD_HOWTO_SEEN_KEY
