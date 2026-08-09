/** Default ayah/step repetitions for genuinely new sessions (bar, selector, payload). */
export const DEFAULT_SESSION_REPETITIONS = 1

/** Matches memorisationRuntime.DEFAULT_ALQURAN_RECITER without importing that module graph. */
const DEFAULT_RECITER_ID = 'ar.alafasy'

/**
 * First positive finite candidate, else {@link DEFAULT_SESSION_REPETITIONS}.
 * Use for missing values only — never override an explicitly saved/recommended count.
 */
export function resolveSessionRepetitions(...candidates) {
  for (const value of candidates) {
    if (value === 'infinite') return 10
    const n = Number(value)
    if (Number.isFinite(n) && n > 0) {
      return Math.max(1, Math.min(50, Math.round(n)))
    }
  }
  return DEFAULT_SESSION_REPETITIONS
}

/**
 * Repetition fields for a genuinely new (non-resume, non-recommendation) session.
 * Call from fresh-session entry points so sticky UI / prior plans cannot leave 2x+.
 */
export function freshSessionRepetitionDefaults() {
  return {
    repetitionsPerStep: DEFAULT_SESSION_REPETITIONS,
    selectedLoopCount: DEFAULT_SESSION_REPETITIONS,
  }
}

/**
 * Fresh workspace / reset session config. Existing saved sessions keep their own
 * `repetitionsPerStep` when resumed; recommendation plans may override explicitly.
 */
export function buildDefaultWorkspaceSessionConfig(overrides = {}) {
  return {
    chapterId: 1,
    rangeStart: 1,
    rangeEnd: 7,
    reciterId: DEFAULT_RECITER_ID,
    speed: 1,
    repetitionsPerStep: DEFAULT_SESSION_REPETITIONS,
    selectedLoopCount: DEFAULT_SESSION_REPETITIONS,
    playMode: 'auto',
    talqinModeEnabled: false,
    gapBetweenVerses: '1x',
    customGapSeconds: 2,
    recitationWindowSeconds: 8,
    chainingEnabled: false,
    chainingMethod: '',
    chainingRepetitions: 1,
    focusModeEnabled: false,
    blurModeEnabled: false,
    blurIntensity: 10,
    anchorModeEnabled: false,
    anchorCount: 2,
    tajweedEnabled: false,
    showTranslation: false,
    showTransliteration: false,
    showWordByWord: false,
    wordByWordAudioEnabled: true,
    readingViewMode: 'mushaf',
    ...overrides,
  }
}
