/** Default ayah/step repetitions for genuinely new sessions (bar, selector, payload). */
export const DEFAULT_SESSION_REPETITIONS = 1

/** Tajweed colouring starts off. Saved per account / device after the user toggles it. */
export const DEFAULT_TAJWEED_ENABLED = false
/** Bump when the default changes so previously auto-saved "on" does not stick. */
export const TAJWEED_DEFAULT_REVISION = 2

export function resolveStoredTajweedEnabled(saved, revision = 0) {
  if (Number(revision) < TAJWEED_DEFAULT_REVISION) return DEFAULT_TAJWEED_ENABLED
  if (typeof saved === 'boolean') return saved
  return DEFAULT_TAJWEED_ENABLED
}

/** Mobile session overview (Pause/Resume, pills) starts expanded on each page load. */
export const DEFAULT_MOBILE_SESSION_DASHBOARD_EXPANDED = true

/** Matches memorisationRuntime.DEFAULT_ALQURAN_RECITER without importing that module graph. */
const DEFAULT_RECITER_ID = 'ar.alafasy'

/** First-session / onboarding window: Al-Fatiha 1–5 (not the full 7-ayah surah). */
export const FIRST_ONBOARDING_RANGE_END = 5

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
    tajweedEnabled: DEFAULT_TAJWEED_ENABLED,
    showTranslation: false,
    showTransliteration: false,
    showWordByWord: false,
    wordByWordAudioEnabled: true,
    readingViewMode: 'madani_mushaf',
    ...overrides,
  }
}

/**
 * First real practice set after onboarding: Al-Fatiha 1–5 (fits opening-Fatihah
 * main-position rules and recommendation max session size).
 */
export function buildFirstOnboardingSessionConfig(overrides = {}) {
  return buildDefaultWorkspaceSessionConfig({
    rangeEnd: FIRST_ONBOARDING_RANGE_END,
    reciterId: DEFAULT_RECITER_ID,
    repetitionsPerStep: 2,
    selectedLoopCount: 2,
    ...overrides,
  })
}
