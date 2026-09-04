/**
 * Central session lifecycle state machine and primary-action resolver.
 *
 * All Start / Resume / Pause / End session controls must derive labels and behaviour
 * from this module instead of local ad-hoc conditionals.
 *
 * Session status and media (audio) status are intentionally separate:
 * pausing an ayah never changes the lifecycle status away from active.
 *
 * Persistence states (do not overload one boolean for multiple meanings):
 * - none              — no practice sitting in progress
 * - active            — live sitting
 * - paused            — soft leave; unfinished + resumable (backend source of truth)
 * - unfinished        — interrupted / resumable sitting (same resume contract as paused)
 * - completed         — full range finished; not resumable
 * - saved_for_later   — named bookmark sitting (Saved Sessions); distinct from Resume
 * - ended_early       — terminal incomplete (explicit discard / API end); NOT resumable
 *
 * Pause / back-to-mushaf park maps to paused/unfinished (Resume).
 * End session is always terminal: completed (range done) or ended_early (left early).
 * After End, the primary CTA is Start session — never Resume.
 * Resume is available iff unfinished backend (or guest continue) from Pause / park.
 *
 * Practice set states (product language):
 * ACTIVE SET → currently working
 * PARKED SET → intentional leave; progress + set remain; Resume / Return to this set
 * COMPLETED SET → range genuinely finished (not parked)
 *
 * "Back to mushaf" parks incomplete/mastery sets and lands completed sets on the mushaf
 * without discarding them. Navigation away is never abandon unless explicit discard.
 *
 * Practice flows:
 * active → paused (soft exit / pause / back-to-mushaf park) → resume → active
 * active → completed (range finished) → back-to-mushaf lands set (Start on same range)
 * unfinished/paused → discarded → none (only explicit discard clears resume)
 */

/** @typedef {'hydrating'|'onboarding_required'|'onboarding_example'|'ready_to_start'|'starting'|'active'|'paused'|'interrupted_resumable'|'resuming'|'pausing'|'completing'|'completed'|'completion_modal_open'|'error_recoverable'|'logged_out'|'rejected'|'uninitialised'|'ready'|'resumable'|'ended'|'error'|'playing'|'interrupted'|'ending'} SessionStatus */

/** @typedef {'idle'|'loading'|'playing'|'paused'|'ended'|'error'} MediaStatus */

/** @typedef {'start-onboarding'|'continue-onboarding'|'try-example'|'start-session'|'resume-session'|'pause-session'|'end-session'|'loading'|'none'} PrimarySessionAction */

/** @typedef {'idle'|'starting'|'resuming'|'pausing'|'ending'} SessionMutation */

export const SESSION_STATUS = Object.freeze({
  HYDRATING: 'hydrating',
  ONBOARDING_REQUIRED: 'onboarding_required',
  ONBOARDING_EXAMPLE: 'onboarding_example',
  READY_TO_START: 'ready_to_start',
  STARTING: 'starting',
  ACTIVE: 'active',
  PAUSED: 'paused',
  INTERRUPTED_RESUMABLE: 'interrupted_resumable',
  RESUMING: 'resuming',
  PAUSING: 'pausing',
  COMPLETING: 'completing',
  COMPLETED: 'completed',
  COMPLETION_MODAL_OPEN: 'completion_modal_open',
  ERROR_RECOVERABLE: 'error_recoverable',
  LOGGED_OUT: 'logged_out',
  UNINITIALISED: 'hydrating',
  READY: 'ready_to_start',
  RESUMABLE: 'interrupted_resumable',
  ENDED: 'completed',
  ENDING: 'completing',
  ERROR: 'error_recoverable',
  REJECTED: 'rejected',
  PLAYING: 'active',
  INTERRUPTED: 'interrupted_resumable',
})

export const MEDIA_STATUS = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
})

export const PRIMARY_SESSION_ACTION = Object.freeze({
  START_ONBOARDING: 'start-onboarding',
  CONTINUE_ONBOARDING: 'continue-onboarding',
  TRY_EXAMPLE: 'try-example',
  START_SESSION: 'start-session',
  RESUME_SESSION: 'resume-session',
  PAUSE_SESSION: 'pause-session',
  END_SESSION: 'end-session',
  LOADING: 'loading',
  NONE: 'none',
})

export const SESSION_MUTATION = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  RESUMING: 'resuming',
  PAUSING: 'pausing',
  ENDING: 'ending',
})

/** Confirmation modal actions for End Session. */
export const END_SESSION_CONFIRM_ACTION = Object.freeze({
  KEEP_PRACTISING: 'keep_practising',
  END_SESSION: 'end_session',
  SAVE_FOR_LATER: 'save_for_later',
})

/**
 * Canonical persistence labels for practice sittings.
 * Resume CTAs must only appear for PAUSED / UNFINISHED.
 */
export const PRACTICE_SESSION_PERSISTENCE = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  PAUSED: 'paused',
  UNFINISHED: 'unfinished',
  COMPLETED: 'completed',
  SAVED_FOR_LATER: 'saved_for_later',
  ENDED_EARLY: 'ended_early',
})

export const BACKEND_SESSION_STATUS = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  PAUSED: 'paused',
  INTERRUPTED: 'interrupted',
  ENDED_EARLY: 'ended_early',
  COMPLETED: 'completed',
  ABANDONED: 'abandoned',
})

/** @type {Record<string, string[]>} */
export const LEGAL_TRANSITIONS = Object.freeze({
  [SESSION_STATUS.HYDRATING]: [
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.LOGGED_OUT,
    SESSION_STATUS.ERROR_RECOVERABLE,
  ],
  [SESSION_STATUS.ONBOARDING_REQUIRED]: [
    SESSION_STATUS.ONBOARDING_EXAMPLE,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.REJECTED,
  ],
  [SESSION_STATUS.ONBOARDING_EXAMPLE]: [
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.REJECTED,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.COMPLETING,
  ],
  [SESSION_STATUS.REJECTED]: [
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.READY_TO_START,
  ],
  [SESSION_STATUS.READY_TO_START]: [
    SESSION_STATUS.STARTING,
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
  ],
  [SESSION_STATUS.STARTING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.ERROR_RECOVERABLE,
  ],
  [SESSION_STATUS.ACTIVE]: [
    SESSION_STATUS.PAUSING,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.COMPLETING,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
  ],
  [SESSION_STATUS.PAUSING]: [
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.ERROR_RECOVERABLE,
  ],
  [SESSION_STATUS.PAUSED]: [
    SESSION_STATUS.RESUMING,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.COMPLETING,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.COMPLETED,
  ],
  [SESSION_STATUS.INTERRUPTED_RESUMABLE]: [
    SESSION_STATUS.RESUMING,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.COMPLETING,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.PAUSED,
  ],
  [SESSION_STATUS.RESUMING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.ERROR_RECOVERABLE,
    SESSION_STATUS.READY_TO_START,
  ],
  [SESSION_STATUS.COMPLETING]: [
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
    SESSION_STATUS.ERROR_RECOVERABLE,
  ],
  [SESSION_STATUS.COMPLETED]: [
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
    SESSION_STATUS.STARTING,
  ],
  [SESSION_STATUS.COMPLETION_MODAL_OPEN]: [
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.STARTING,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.COMPLETED,
  ],
  [SESSION_STATUS.ERROR_RECOVERABLE]: [
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.ONBOARDING_REQUIRED,
  ],
  [SESSION_STATUS.LOGGED_OUT]: [
    SESSION_STATUS.HYDRATING,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.ONBOARDING_REQUIRED,
  ],
})

export function canTransition(from, to) {
  if (from === to) return true
  const normalisedFrom = normaliseSessionStatus(from)
  const normalisedTo = normaliseSessionStatus(to)
  if (normalisedFrom === normalisedTo) return true
  const allowed = LEGAL_TRANSITIONS[normalisedFrom]
  return Array.isArray(allowed) && allowed.includes(normalisedTo)
}

function normaliseSessionStatus(status) {
  if (!status) return SESSION_STATUS.HYDRATING
  if (status === 'playing') return SESSION_STATUS.ACTIVE
  if (status === 'ending') return SESSION_STATUS.COMPLETING
  if (status === 'interrupted') return SESSION_STATUS.INTERRUPTED_RESUMABLE
  if (status === 'uninitialised') return SESSION_STATUS.HYDRATING
  if (status === 'ready') return SESSION_STATUS.READY_TO_START
  if (status === 'resumable') return SESSION_STATUS.INTERRUPTED_RESUMABLE
  if (status === 'ended') return SESSION_STATUS.COMPLETED
  if (status === 'error') return SESSION_STATUS.ERROR_RECOVERABLE
  return status
}

export function assertTransition(from, to, options = {}) {
  if (canTransition(from, to)) {
    return { ok: true, from, to: normaliseSessionStatus(to) }
  }
  const logger = options.logger || ((message, meta) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(message, meta || {})
    }
  })
  logger('[sessionLifecycle] invalid transition blocked', { from, to })
  return { ok: false, from, to, reason: 'invalid_transition' }
}

export function deriveMediaStatus(mediaState = {}) {
  if (mediaState.error) return MEDIA_STATUS.ERROR
  if (mediaState.loading) return MEDIA_STATUS.LOADING
  if (mediaState.isPlaying) return MEDIA_STATUS.PLAYING
  if (mediaState.ended) return MEDIA_STATUS.ENDED
  if (mediaState.isPaused || mediaState.hasAudio) return MEDIA_STATUS.PAUSED
  return MEDIA_STATUS.IDLE
}

/**
 * Reconstruct a continue payload from /continue last-position.
 * Used when there is no unfinished backend sitting, but the learner still
 * has a saved place in the mushaf to return to.
 */
export function buildContinuePayloadFromLastPosition(position) {
  if (!position || typeof position !== 'object') return null
  const meta = position.metadata && typeof position.metadata === 'object'
    ? position.metadata
    : {}
  const nestedConfig = meta.config && typeof meta.config === 'object' ? meta.config : {}
  const chapterId = Number(
    nestedConfig.chapterId
    || meta.chapterId
    || position.surah_number
    || 0
  )
  if (chapterId <= 0) return null
  const rangeStart = Math.max(
    1,
    Number(nestedConfig.rangeStart || meta.rangeStart || position.ayah_number || 1)
  )
  const rangeEnd = Math.max(
    rangeStart,
    Number(nestedConfig.rangeEnd || meta.rangeEnd || rangeStart)
  )
  const ayahNumber = Number(position.ayah_number || nestedConfig.rangeStart || rangeStart || 0)
  const activeVerseKey = meta.activeVerseKey
    || meta.activeKey
    || (ayahNumber > 0 ? `${chapterId}:${ayahNumber}` : null)
  const base = isResumableSessionPayload(meta)
    ? { ...meta }
    : {}
  return {
    ...base,
    timestamp: Number(base.timestamp || Date.parse(position.last_opened_at || '') || Date.now()),
    mode: base.mode || meta.mode || 'advanced',
    activeKey: base.activeKey || activeVerseKey,
    activeVerseKey: base.activeVerseKey || activeVerseKey,
    queueIndex: Math.max(0, Number(base.queueIndex ?? meta.queueIndex ?? position.last_step ?? 0)),
    fromLastPosition: true,
    config: {
      ...(base.config || {}),
      ...nestedConfig,
      chapterId,
      rangeStart: Number((base.config || {}).rangeStart || rangeStart),
      rangeEnd: Number((base.config || {}).rangeEnd || rangeEnd),
    },
  }
}

export function isResumableSessionPayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return false
  if (options.isSample || payload.isOnboardingSample || payload.sessionKind === 'sample') return false
  if (payload.completed || payload.sessionStatus === 'completed' || payload.sessionStatus === 'ended') return false
  const backendStatus = options.backendStatus ?? payload.backendStatus ?? null
  if (
    backendStatus === BACKEND_SESSION_STATUS.COMPLETED
    || backendStatus === BACKEND_SESSION_STATUS.ABANDONED
    || backendStatus === BACKEND_SESSION_STATUS.ENDED_EARLY
  ) {
    return false
  }
  // "none" is only a hard reject when there is no recoverable chapter range.
  // Backend may still report unfinished for legacy none+progress rows.
  const chapterId = Number(payload?.config?.chapterId || payload?.chapterId || 0)
  if (backendStatus === BACKEND_SESSION_STATUS.NONE && chapterId <= 0) {
    return false
  }
  return chapterId > 0
}

/**
 * Resolve the learner-facing persistence state from backend + local signals.
 * Backend unfinished (active/paused/interrupted) is authoritative when learning sync is on.
 */
export function resolvePracticeSessionPersistence(input = {}) {
  const {
    mutqinSessionActive = false,
    sessionPaused = false,
    sessionCompleted = false,
    backendUnfinished = false,
    backendStatus = null,
    hasNamedSavedSession = false,
    hasValidatedContinuePayload = false,
  } = input

  const status = String(backendStatus || '').toLowerCase()

  if (sessionCompleted || status === BACKEND_SESSION_STATUS.COMPLETED) {
    return PRACTICE_SESSION_PERSISTENCE.COMPLETED
  }
  if (status === BACKEND_SESSION_STATUS.ENDED_EARLY || status === BACKEND_SESSION_STATUS.ABANDONED) {
    return PRACTICE_SESSION_PERSISTENCE.ENDED_EARLY
  }
  if (mutqinSessionActive && !sessionPaused && !sessionCompleted) {
    return PRACTICE_SESSION_PERSISTENCE.ACTIVE
  }
  if (
    sessionPaused
    || status === BACKEND_SESSION_STATUS.PAUSED
  ) {
    return PRACTICE_SESSION_PERSISTENCE.PAUSED
  }
  if (
    backendUnfinished
    || status === BACKEND_SESSION_STATUS.ACTIVE
    || status === BACKEND_SESSION_STATUS.INTERRUPTED
    || hasValidatedContinuePayload
  ) {
    return PRACTICE_SESSION_PERSISTENCE.UNFINISHED
  }
  if (hasNamedSavedSession) {
    return PRACTICE_SESSION_PERSISTENCE.SAVED_FOR_LATER
  }
  return PRACTICE_SESSION_PERSISTENCE.NONE
}

/**
 * Soft exit ("return later") vs genuine completion vs explicit End / discard.
 * Pause / park must keep unfinished + resumable; End and discard must not.
 */
export function resolveSessionExitTransition({
  rangeComplete = false,
  discard = false,
  endEarly = false,
} = {}) {
  if (discard) {
    return {
      kind: 'discard',
      persistence: PRACTICE_SESSION_PERSISTENCE.ENDED_EARLY,
      backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
      unfinished: false,
      resumable: false,
      clearContinue: true,
      pauseSession: false,
      completeSession: false,
    }
  }
  if (endEarly) {
    return {
      kind: 'end_early',
      persistence: PRACTICE_SESSION_PERSISTENCE.ENDED_EARLY,
      backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
      unfinished: false,
      resumable: false,
      clearContinue: true,
      pauseSession: false,
      completeSession: false,
    }
  }
  if (rangeComplete) {
    return {
      kind: 'complete',
      persistence: PRACTICE_SESSION_PERSISTENCE.COMPLETED,
      backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
      unfinished: false,
      resumable: false,
      clearContinue: true,
      pauseSession: false,
      completeSession: true,
    }
  }
  // "Finish for now" / early exit — pause, do not terminal-end.
  return {
    kind: 'save_for_later',
    persistence: PRACTICE_SESSION_PERSISTENCE.PAUSED,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    unfinished: true,
    resumable: true,
    clearContinue: false,
    pauseSession: true,
    completeSession: false,
  }
}

/**
 * Decide whether End Session is a genuine range completion.
 *
 * CRITICAL: ayah position / progressPercent alone must NEVER mean complete.
 * A 1-ayah range is always "100% through the range" by position the moment it
 * starts — that used to terminal-end soft exits and wipe Resume.
 *
 * Complete only when the sitting has already been marked completed (queue
 * finished / handleSessionComplete), and the learner is not still in a live
 * or paused practice sitting.
 */
export function resolveExitRangeComplete(input = {}) {
  const {
    sessionCompleted = false,
    sessionEndedEarly = false,
    sessionPaused = false,
    mutqinSessionActive = false,
    engineCompleted = false,
    centralStatus = null,
  } = input

  if (sessionEndedEarly) return false
  // Live or paused practice is always soft-exit territory.
  if (mutqinSessionActive || sessionPaused) return false

  const status = String(centralStatus || '').toLowerCase()
  if (
    status === BACKEND_SESSION_STATUS.ENDED_EARLY
    || status === 'ended_early'
    || status === SESSION_STATUS.PAUSED
    || status === BACKEND_SESSION_STATUS.PAUSED
    || status === BACKEND_SESSION_STATUS.ACTIVE
    || status === SESSION_STATUS.ACTIVE
  ) {
    return false
  }

  return !!(
    sessionCompleted
    || engineCompleted
    || status === 'completed'
    || status === BACKEND_SESSION_STATUS.COMPLETED
  )
}

/**
 * Learner-facing set states (product language).
 * PARKED === paused/unfinished (intentional leave; Resume / Return to this set).
 * COMPLETED === genuine range finish (not resumable as unfinished).
 */
export const PRACTICE_SET_STATE = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  PARKED: 'parked',
  COMPLETED: 'completed',
})

/**
 * Map persistence signals → ACTIVE / PARKED / COMPLETED / NONE.
 */
export function resolvePracticeSetState(input = {}) {
  const persistence = resolvePracticeSessionPersistence(input)
  if (persistence === PRACTICE_SESSION_PERSISTENCE.ACTIVE) {
    return PRACTICE_SET_STATE.ACTIVE
  }
  if (
    persistence === PRACTICE_SESSION_PERSISTENCE.PAUSED
    || persistence === PRACTICE_SESSION_PERSISTENCE.UNFINISHED
  ) {
    return PRACTICE_SET_STATE.PARKED
  }
  if (persistence === PRACTICE_SESSION_PERSISTENCE.COMPLETED) {
    return PRACTICE_SET_STATE.COMPLETED
  }
  return PRACTICE_SET_STATE.NONE
}

/**
 * "Back to mushaf" from calm / post-session UI.
 * Parks incomplete / mastery-loop sets; lands completed sets without discarding them.
 * Explicit discard is the only path that clears resume + set.
 */
export function resolveBackToMushafTransition({
  rangeComplete = false,
  discard = false,
  awaitingMasteryRetest = false,
  sessionEndedEarly = false,
} = {}) {
  if (discard) {
    return {
      ...resolveSessionExitTransition({ discard: true }),
      kind: 'discard',
      setState: PRACTICE_SET_STATE.NONE,
      restoreSet: false,
      preserveProgress: false,
    }
  }

  const shouldPark = !rangeComplete || !!awaitingMasteryRetest || !!sessionEndedEarly
  if (shouldPark) {
    return {
      ...resolveSessionExitTransition({ rangeComplete: false }),
      kind: 'park',
      setState: PRACTICE_SET_STATE.PARKED,
      restoreSet: true,
      preserveProgress: true,
      clearContinue: false,
    }
  }

  return {
    ...resolveSessionExitTransition({ rangeComplete: true }),
    kind: 'complete_return',
    setState: PRACTICE_SET_STATE.COMPLETED,
    restoreSet: true,
    preserveProgress: false,
    // Completed sets are not unfinished-resumable; Start on the same range instead.
    clearContinue: true,
  }
}

export function isBackendSessionUnfinished(session) {
  if (!session || typeof session !== 'object') return false
  if (session.is_onboarding_example) return false
  const status = String(session.status || session.session_status || '').toLowerCase()
  if (!status) {
    const meta = session.metadata && typeof session.metadata === 'object' ? session.metadata : {}
    if (meta.completed || meta.completed_at) return false
    return !!meta.active
  }
  return (
    status === BACKEND_SESSION_STATUS.ACTIVE
    || status === BACKEND_SESSION_STATUS.PAUSED
    || status === BACKEND_SESSION_STATUS.INTERRUPTED
  )
}

export function deriveSessionStatus(input = {}) {
  const {
    authHydrated = true,
    sessionHydrated = true,
    isAuthenticated = false,
    requiresOnboarding = false,
    onboardingStarted = false,
    onboardingExampleActive = false,
    onboardingExampleRejected = false,
    mutqinSessionActive = false,
    sessionCompleted = false,
    sessionPaused = false,
    completionModalOpen = false,
    hasValidatedContinuePayload = false,
    backendUnfinished = false,
    backendStatus = null,
    wasInterrupted = false,
    loggedOut = false,
    mutation = SESSION_MUTATION.IDLE,
    lastError = null,
  } = input

  if (!authHydrated || !sessionHydrated) {
    return SESSION_STATUS.HYDRATING
  }

  // Explicit logout clears user-scoped session state; guests may still start locally.
  if (loggedOut || (authHydrated && !isAuthenticated && !mutqinSessionActive && !hasValidatedContinuePayload && input.requireAuthForSession)) {
    return SESSION_STATUS.LOGGED_OUT
  }

  if (mutation === SESSION_MUTATION.STARTING) return SESSION_STATUS.STARTING
  if (mutation === SESSION_MUTATION.RESUMING) return SESSION_STATUS.RESUMING
  if (mutation === SESSION_MUTATION.PAUSING) return SESSION_STATUS.PAUSING
  if (mutation === SESSION_MUTATION.ENDING) return SESSION_STATUS.COMPLETING

  if (completionModalOpen) {
    return SESSION_STATUS.COMPLETION_MODAL_OPEN
  }

  if (lastError && !mutqinSessionActive && !hasValidatedContinuePayload && !requiresOnboarding && !sessionPaused) {
    return SESSION_STATUS.ERROR_RECOVERABLE
  }

  if (onboardingExampleRejected && requiresOnboarding) {
    return SESSION_STATUS.REJECTED
  }

  if (onboardingExampleActive) {
    return SESSION_STATUS.ONBOARDING_EXAMPLE
  }

  // Practice session state always wins over a stale onboarding CTA.
  // An active / paused / resumable session must never show "Start Onboarding".
  if (mutqinSessionActive && !sessionCompleted) {
    return SESSION_STATUS.ACTIVE
  }

  const unfinishedBackend = backendUnfinished
    || backendStatus === BACKEND_SESSION_STATUS.ACTIVE
    || backendStatus === BACKEND_SESSION_STATUS.PAUSED
    || backendStatus === BACKEND_SESSION_STATUS.INTERRUPTED

  // Live mid-sitting pause only (Pause control). Soft-exit / refresh with a
  // backend paused row is INTERRUPTED_RESUMABLE so End session can leave.
  if (!mutqinSessionActive && !sessionCompleted && sessionPaused) {
    return SESSION_STATUS.PAUSED
  }

  if ((hasValidatedContinuePayload || unfinishedBackend) && !mutqinSessionActive && !sessionCompleted) {
    return SESSION_STATUS.INTERRUPTED_RESUMABLE
  }

  if (sessionCompleted && !mutqinSessionActive && !hasValidatedContinuePayload && !backendUnfinished) {
    return SESSION_STATUS.COMPLETED
  }

  if (requiresOnboarding) {
    return SESSION_STATUS.ONBOARDING_REQUIRED
  }

  void wasInterrupted
  void onboardingStarted
  return SESSION_STATUS.READY_TO_START
}

export function resolvePrimarySessionAction(
  authState = {},
  onboardingState = {},
  sessionState = {},
  mediaState = {}
) {
  void mediaState
  const status = normaliseSessionStatus(sessionState.status || deriveSessionStatus({
    authHydrated: authState.hydrated !== false,
    sessionHydrated: sessionState.hydrated !== false,
    isAuthenticated: !!authState.isAuthenticated,
    requiresOnboarding: !!onboardingState.required,
    onboardingStarted: !!onboardingState.started,
    onboardingExampleActive: !!onboardingState.exampleActive,
    onboardingExampleRejected: !!onboardingState.exampleRejected,
    mutqinSessionActive: !!sessionState.mutqinSessionActive,
    sessionCompleted: !!sessionState.completed,
    sessionPaused: !!sessionState.paused,
    completionModalOpen: !!sessionState.completionModalOpen,
    hasValidatedContinuePayload: !!sessionState.hasValidatedContinuePayload,
    backendUnfinished: !!sessionState.backendUnfinished,
    backendStatus: sessionState.backendStatus || null,
    wasInterrupted: !!sessionState.wasInterrupted,
    mutation: sessionState.mutation || SESSION_MUTATION.IDLE,
    lastError: sessionState.lastError || null,
  }))

  switch (status) {
    case SESSION_STATUS.HYDRATING:
    case SESSION_STATUS.STARTING:
    case SESSION_STATUS.COMPLETING:
      return PRIMARY_SESSION_ACTION.LOADING

    // Keep Pause/Resume labels stable during in-flight pause/resume to avoid flicker.
    case SESSION_STATUS.RESUMING:
      return PRIMARY_SESSION_ACTION.RESUME_SESSION

    case SESSION_STATUS.PAUSING:
      return PRIMARY_SESSION_ACTION.PAUSE_SESSION

    case SESSION_STATUS.LOGGED_OUT:
    case SESSION_STATUS.COMPLETION_MODAL_OPEN:
      return PRIMARY_SESSION_ACTION.NONE

    case SESSION_STATUS.ONBOARDING_REQUIRED:
      if (onboardingState.started) return PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING
      return PRIMARY_SESSION_ACTION.START_ONBOARDING

    case SESSION_STATUS.ONBOARDING_EXAMPLE:
      return PRIMARY_SESSION_ACTION.END_SESSION

    case SESSION_STATUS.REJECTED:
      return onboardingState.required
        ? PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING
        : PRIMARY_SESSION_ACTION.START_SESSION

    case SESSION_STATUS.ACTIVE:
      return PRIMARY_SESSION_ACTION.PAUSE_SESSION

    case SESSION_STATUS.PAUSED:
    case SESSION_STATUS.INTERRUPTED_RESUMABLE:
      return PRIMARY_SESSION_ACTION.RESUME_SESSION

    case SESSION_STATUS.COMPLETED:
    case SESSION_STATUS.READY_TO_START:
      return PRIMARY_SESSION_ACTION.START_SESSION

    case SESSION_STATUS.ERROR_RECOVERABLE:
      if (sessionState.hasValidatedContinuePayload || sessionState.backendUnfinished || sessionState.paused) {
        return PRIMARY_SESSION_ACTION.RESUME_SESSION
      }
      return PRIMARY_SESSION_ACTION.START_SESSION

    default:
      return PRIMARY_SESSION_ACTION.NONE
  }
}

export function resolveSessionActionPresentation(action, t = (key) => key, options = {}) {
  const translate = typeof t === 'function' ? t : (key) => key
  const loading = action === PRIMARY_SESSION_ACTION.LOADING
  const disabled = loading || action === PRIMARY_SESSION_ACTION.NONE
  const status = normaliseSessionStatus(options.status)
  // End sits beside Pause, and beside Resume only during a live mid-sitting
  // pause — not after "Finish for now" / soft-exit (INTERRUPTED_RESUMABLE).
  const showEndCompanion = (
    action === PRIMARY_SESSION_ACTION.PAUSE_SESSION
    || (action === PRIMARY_SESSION_ACTION.RESUME_SESSION && status === SESSION_STATUS.PAUSED)
  )

  const map = {
    [PRIMARY_SESSION_ACTION.START_ONBOARDING]: {
      labelKey: 'memorisation.onboarding.startOnboarding',
      icon: 'bi-play-fill',
      fallback: 'Get started',
    },
    [PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING]: {
      labelKey: 'memorisation.onboarding.continueOnboarding',
      icon: 'bi-play-fill',
      fallback: 'Continue setup',
    },
    [PRIMARY_SESSION_ACTION.TRY_EXAMPLE]: {
      labelKey: 'memorisation.onboarding.playSampleSession',
      icon: 'bi-play-fill',
      fallback: 'Try Example',
    },
    [PRIMARY_SESSION_ACTION.START_SESSION]: {
      labelKey: 'common.startSession',
      icon: 'bi-play-fill',
      fallback: 'Start session',
    },
    [PRIMARY_SESSION_ACTION.RESUME_SESSION]: {
      labelKey: 'common.resumeSession',
      icon: 'bi-play-fill',
      fallback: 'Resume session',
    },
    [PRIMARY_SESSION_ACTION.PAUSE_SESSION]: {
      labelKey: 'common.pauseSession',
      icon: 'bi-pause-fill',
      fallback: 'Pause session',
    },
    [PRIMARY_SESSION_ACTION.END_SESSION]: {
      labelKey: 'sessionStatus.end',
      icon: 'bi-box-arrow-right',
      fallback: 'End Session',
    },
    [PRIMARY_SESSION_ACTION.LOADING]: {
      labelKey: resolveLoadingLabelKey(options.status),
      icon: 'bi-hourglass-split',
      fallback: 'Loading…',
    },
    [PRIMARY_SESSION_ACTION.NONE]: {
      labelKey: 'common.loading',
      icon: 'bi-play-fill',
      fallback: 'Loading…',
    },
  }

  const entry = map[action] || map[PRIMARY_SESSION_ACTION.NONE]
  let label = translate(entry.labelKey)
  if (!label || label === entry.labelKey) label = entry.fallback

  return {
    action,
    label,
    disabled,
    loading,
    ariaLabel: label,
    ariaBusy: loading,
    icon: entry.icon,
    showEndCompanion,
    stableWidthCh: Number(options.stableWidthCh || 16),
  }
}

function resolveLoadingLabelKey(status) {
  const normalised = normaliseSessionStatus(status)
  if (normalised === SESSION_STATUS.STARTING) return 'common.startingSession'
  if (normalised === SESSION_STATUS.RESUMING) return 'common.resumingSession'
  if (normalised === SESSION_STATUS.PAUSING) return 'common.pausingSession'
  if (normalised === SESSION_STATUS.COMPLETING) return 'common.endingSession'
  return 'common.loading'
}

export function buildSessionLifecycleViewModel(input = {}) {
  const status = deriveSessionStatus(input)
  const mediaStatus = deriveMediaStatus({
    isPlaying: !!input.isPlaying,
    isPaused: !!input.isPaused,
    loading: !!input.mediaLoading,
    ended: !!input.mediaEnded,
    error: !!input.mediaError,
    hasAudio: !!input.hasAudio,
  })
  const action = resolvePrimarySessionAction(
    {
      hydrated: input.authHydrated !== false,
      isAuthenticated: !!input.isAuthenticated,
    },
    {
      required: !!input.requiresOnboarding,
      started: !!input.onboardingStarted,
      exampleActive: !!input.onboardingExampleActive,
      exampleRejected: !!input.onboardingExampleRejected,
    },
    {
      status,
      hydrated: input.sessionHydrated !== false,
      mutqinSessionActive: !!input.mutqinSessionActive,
      completed: !!input.sessionCompleted,
      paused: !!input.sessionPaused,
      completionModalOpen: !!input.completionModalOpen,
      hasValidatedContinuePayload: !!input.hasValidatedContinuePayload,
      backendUnfinished: !!input.backendUnfinished,
      backendStatus: input.backendStatus || null,
      wasInterrupted: !!input.wasInterrupted,
      mutation: input.mutation || SESSION_MUTATION.IDLE,
      lastError: input.lastError || null,
    },
    { isPlaying: !!input.isPlaying }
  )
  const presentation = resolveSessionActionPresentation(action, input.t, { status })

  return {
    status,
    mediaStatus,
    action,
    presentation,
    canResume: action === PRIMARY_SESSION_ACTION.RESUME_SESSION,
    canPause: action === PRIMARY_SESSION_ACTION.PAUSE_SESSION,
    canStart: action === PRIMARY_SESSION_ACTION.START_SESSION,
    canEnd: action === PRIMARY_SESSION_ACTION.END_SESSION || !!presentation.showEndCompanion,
    isLoading: action === PRIMARY_SESSION_ACTION.LOADING,
    isHidden: action === PRIMARY_SESSION_ACTION.NONE,
  }
}

export function createSessionActionLock() {
  let inFlight = null
  let generation = 0

  return {
    current() {
      return inFlight
    },
    isLocked(key = null) {
      if (!inFlight) return false
      if (key == null) return true
      return inFlight === key
    },
    async run(key, fn) {
      if (inFlight) {
        return { ok: false, reason: 'locked', key: inFlight }
      }
      const gen = ++generation
      inFlight = key
      try {
        const result = await fn()
        if (gen !== generation) {
          return { ok: false, reason: 'stale', key }
        }
        return { ok: true, result }
      } finally {
        if (gen === generation) {
          inFlight = null
        }
      }
    },
    reset() {
      generation += 1
      inFlight = null
    },
  }
}

export function createSessionBroadcast(channelName = 'mutqin.session.lifecycle') {
  let channel = null
  try {
    if (typeof BroadcastChannel !== 'undefined') {
      channel = new BroadcastChannel(channelName)
    }
  } catch {
    channel = null
  }

  const storageKey = `${channelName}.ping`

  return {
    publish(type, payload = {}) {
      const message = { type, payload, at: Date.now() }
      if (channel) {
        try { channel.postMessage(message) } catch { /* ignore */ }
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(message))
        }
      } catch { /* ignore */ }
    },
    subscribe(handler) {
      const onMessage = (event) => {
        const data = event?.data
        if (!data?.type) return
        handler(data)
      }
      const onStorage = (event) => {
        if (event.key !== storageKey || !event.newValue) return
        try {
          const data = JSON.parse(event.newValue)
          if (data?.type) handler(data)
        } catch { /* ignore */ }
      }
      if (channel) channel.addEventListener('message', onMessage)
      if (typeof window !== 'undefined') {
        window.addEventListener('storage', onStorage)
      }
      return () => {
        if (channel) channel.removeEventListener('message', onMessage)
        if (typeof window !== 'undefined') {
          window.removeEventListener('storage', onStorage)
        }
      }
    },
    close() {
      try { channel?.close?.() } catch { /* ignore */ }
      channel = null
    },
  }
}

export function deriveBackendStatusFromEngine(sessionState = {}) {
  if (!sessionState || typeof sessionState !== 'object') {
    return BACKEND_SESSION_STATUS.NONE
  }
  if (sessionState.is_onboarding_example || sessionState.sessionKind === 'sample') {
    return BACKEND_SESSION_STATUS.NONE
  }
  if (sessionState.completed || sessionState.completed_at) {
    return BACKEND_SESSION_STATUS.COMPLETED
  }
  if (sessionState.paused || sessionState.status === BACKEND_SESSION_STATUS.PAUSED) {
    return BACKEND_SESSION_STATUS.PAUSED
  }
  if (sessionState.active) {
    return BACKEND_SESSION_STATUS.ACTIVE
  }
  return BACKEND_SESSION_STATUS.NONE
}

/**
 * Canonical storage key for dashboard deep-link intent across refresh.
 * Cleared only after the intent is consumed successfully (or explicitly discarded).
 * Always namespaced per user so account switches cannot steal another profile's destination.
 */
export const DASHBOARD_ENTRY_INTENT_STORAGE_KEY = 'mutqin.dashboardEntryIntent.v1'

export function dashboardEntryIntentStorageKey(userId = null) {
  return userScopedStorageKey(DASHBOARD_ENTRY_INTENT_STORAGE_KEY, userId)
}

/**
 * Normalize chapter + ayah window from a continue payload, backend session, or loaded workspace.
 */
export function extractSessionRange(source = {}) {
  if (!source || typeof source !== 'object') {
    return { chapterId: 0, rangeStart: 0, rangeEnd: 0 }
  }
  const meta = source.metadata && typeof source.metadata === 'object' ? source.metadata : {}
  const config = (
    (source.config && typeof source.config === 'object' ? source.config : null)
    || (meta.config && typeof meta.config === 'object' ? meta.config : null)
    || source
  )
  const chapterId = Number(
    config.chapterId
    || source.chapterId
    || source.surah_number
    || 0
  )
  const rangeStart = Math.max(1, Number(
    config.rangeStart
    || source.rangeStart
    || source.ayah_number
    || 1
  ))
  const rangeEnd = Math.max(rangeStart, Number(
    config.rangeEnd
    || source.rangeEnd
    || rangeStart
  ))
  return {
    chapterId: chapterId > 0 ? chapterId : 0,
    rangeStart: chapterId > 0 ? rangeStart : 0,
    rangeEnd: chapterId > 0 ? rangeEnd : 0,
  }
}

export function sessionRangesMatch(left, right) {
  const a = extractSessionRange(left)
  const b = extractSessionRange(right)
  if (a.chapterId <= 0 || b.chapterId <= 0) return false
  return a.chapterId === b.chapterId
    && a.rangeStart === b.rangeStart
    && a.rangeEnd === b.rangeEnd
}

/**
 * Prefer the ayah the user was on (verse key / queue), not only rangeStart.
 *
 * IMPORTANT: `fallback.currentPosition` must be an absolute mushaf ayah number.
 * Never pass Memorisation.vue's relative `currentPosition` (1-based index in range).
 */
export function resolveResumeAyahNumber(payload = {}, fallback = {}) {
  const range = extractSessionRange(payload)
  const key = String(
    payload?.activeVerseKey
    || payload?.activeKey
    || payload?.config?.activeVerseKey
    || ''
  )
  const fromKey = Number(key.includes(':') ? key.split(':')[1] : 0)
  if (fromKey > 0) {
    if (range.rangeStart > 0 && range.rangeEnd >= range.rangeStart) {
      return Math.min(range.rangeEnd, Math.max(range.rangeStart, fromKey))
    }
    return fromKey
  }
  const queueIndex = Math.max(0, Number(payload?.queueIndex ?? payload?.config?.queueIndex ?? NaN))
  if (Number.isFinite(queueIndex) && range.rangeStart > 0) {
    return Math.min(range.rangeEnd || range.rangeStart, range.rangeStart + queueIndex)
  }
  const absoluteFallback = Number(fallback.ayah_number || 0)
  if (absoluteFallback > 0) {
    if (range.rangeStart > 0 && range.rangeEnd >= range.rangeStart) {
      return Math.min(range.rangeEnd, Math.max(range.rangeStart, absoluteFallback))
    }
    return absoluteFallback
  }
  // Legacy callers sometimes passed absolute ayah as currentPosition — accept only when
  // it already looks like a mushaf ayah inside the range (not a relative 1..N index).
  const legacyAbsolute = Number(fallback.currentPosition || 0)
  if (
    legacyAbsolute > 0
    && range.rangeStart > 0
    && legacyAbsolute >= range.rangeStart
    && legacyAbsolute <= (range.rangeEnd || legacyAbsolute)
  ) {
    return legacyAbsolute
  }
  const rangeStart = Number(fallback.rangeStart || range.rangeStart || 0)
  return rangeStart > 0 ? rangeStart : null
}

/**
 * True when continue payload points past the first ayah of the set (or has playback progress).
 */
export function hasResumePlaybackPosition(payload = {}) {
  const ayahNumber = resolveResumeAyahNumber(payload)
  if (!ayahNumber || ayahNumber <= 0) return false
  const rangeStart = Number(payload?.config?.rangeStart || extractSessionRange(payload).rangeStart || 0)
  if (rangeStart > 0 && ayahNumber > rangeStart) return true
  return Number(payload.sessionStartedAt || 0) > 0
    || Number(payload.queueIndex || 0) > 0
    || Number(payload.mutqinSessionIndex || 0) > 0
    || Number(payload.currentTime || 0) > 0
}

/**
 * Fast-path continue is only safe when the already-loaded mushaf matches the resume set.
 */
export function canSkipHydrateForContinue({ hasVerses = false, payload = null, loaded = null } = {}) {
  if (!hasVerses) return false
  if (!payload || Number(payload?.config?.chapterId || 0) <= 0) return false
  if (!loaded || Number(loaded?.chapterId || loaded?.config?.chapterId || 0) <= 0) return false
  return sessionRangesMatch(payload, loaded)
}

/**
 * Preferred ?session= id must win or fail closed — never silently resume another unfinished row.
 */
export function resolvePreferredSessionResumeGate({
  preferredSessionId = null,
  snapshot = null,
  unfinished = false,
  invalidRequested = false,
} = {}) {
  const preferred = Number(preferredSessionId || 0) || null
  if (!preferred) {
    return { ok: true, reason: null }
  }
  if (invalidRequested) {
    return { ok: false, reason: 'invalid_requested' }
  }
  if (!unfinished || !snapshot?.id) {
    return { ok: false, reason: 'unavailable' }
  }
  if (Number(snapshot.id) !== preferred) {
    return { ok: false, reason: 'mismatch' }
  }
  return { ok: true, reason: null }
}

/**
 * When backend unfinished exists, local continue must match that set (or preferred id).
 * Otherwise prefer the backend-built payload so we never "return" to the wrong surah/range.
 */
export function pickContinuePayloadForResume({
  continuePayload = null,
  backendSession = null,
  localCandidates = [],
  preferredSessionId = null,
  buildFromBackend = null,
} = {}) {
  const preferred = Number(preferredSessionId || 0) || null
  const unfinished = isBackendSessionUnfinished(backendSession)
  const fromBackend = unfinished && typeof buildFromBackend === 'function'
    ? buildFromBackend(backendSession)
    : null

  if (unfinished && backendSession) {
    const backendId = Number(backendSession.id || 0) || null
    if (preferred && backendId && preferred !== backendId) {
      return null
    }
    const localMatch = [continuePayload, ...(localCandidates || [])].find((candidate) => {
      if (!isResumableSessionPayload(candidate)) return false
      const candidateId = Number(candidate?.backendSessionId || 0) || null
      if (backendId && candidateId && candidateId === backendId) return true
      return sessionRangesMatch(candidate, backendSession)
    })
    if (localMatch) {
      return {
        ...localMatch,
        backendSessionId: backendId,
        backendStatus: backendSession.status || BACKEND_SESSION_STATUS.ACTIVE,
      }
    }
    if (fromBackend && Number(fromBackend?.config?.chapterId || 0) > 0) {
      return fromBackend
    }
    return null
  }

  if (isResumableSessionPayload(continuePayload)) return continuePayload
  const usable = (localCandidates || []).find((candidate) => isResumableSessionPayload(candidate))
  return usable || null
}

export function stashDashboardEntryIntent(intent, storage = null, userId = null) {
  const store = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  if (!intent || !store) return false
  try {
    const key = dashboardEntryIntentStorageKey(userId)
    store.setItem(key, JSON.stringify({
      ...intent,
      stashedAt: Date.now(),
    }))
    // Drop legacy unscoped key so it cannot resurrect another profile's destination.
    store.removeItem(DASHBOARD_ENTRY_INTENT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function readStashedDashboardEntryIntent(storage = null, userId = null) {
  const store = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  if (!store) return null
  try {
    const key = dashboardEntryIntentStorageKey(userId)
    const raw = store.getItem(key)
    if (!raw) return null
    const parsed = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return null
    const { stashedAt: _stashedAt, ...intent } = parsed
    if (
      !intent.resume
      && !intent.setup
      && !intent.recommendationId
      && !(Number(intent.surah || 0) > 0)
      && intent.panel !== 'saved'
      && !intent.aiCheck
      && !intent.journey
      && !intent.review
    ) {
      return null
    }
    return intent
  } catch {
    return null
  }
}

export function clearStashedDashboardEntryIntent(storage = null, userId = null) {
  const store = storage || (typeof sessionStorage !== 'undefined' ? sessionStorage : null)
  if (!store) return false
  try {
    store.removeItem(dashboardEntryIntentStorageKey(userId))
    store.removeItem(DASHBOARD_ENTRY_INTENT_STORAGE_KEY)
    return true
  } catch {
    return false
  }
}

export function reconcileContinuePayloadWithBackend(localPayload, backendSession, options = {}) {
  if (!isResumableSessionPayload(localPayload)) return null
  if (options.backendAuthoritative && options.unfinished === false) {
    return null
  }
  if (!backendSession) {
    // Guest / not-yet-synced: keep local. Authoritative empty current clears it.
    return options.backendAuthoritative ? null : localPayload
  }
  if (!isBackendSessionUnfinished(backendSession)) {
    return null
  }
  // Local continue for a different set must not steal the unfinished session id.
  if (!sessionRangesMatch(localPayload, backendSession)) {
    const localId = Number(localPayload?.backendSessionId || 0) || null
    const backendId = Number(backendSession.id || 0) || null
    if (!localId || !backendId || localId !== backendId) {
      return null
    }
  }
  return {
    ...localPayload,
    backendStatus: backendSession.status || BACKEND_SESSION_STATUS.ACTIVE,
    backendSessionId: backendSession.id || null,
  }
}

/**
 * Resolve End Session confirmation modal actions.
 * Keep practising dismisses the modal without mutating session completion state.
 * Playback resumes immediately from the pause position (no countdown).
 *
 * End session is always terminal: completed range opens Session Complete;
 * incomplete range ends early (Start session, not Resume).
 * Pause / "save for later" remain the only resumable leave.
 */
export function resolveEndSessionConfirmDecision(action, options = {}) {
  const rangeComplete = options.rangeComplete === true
  if (action === END_SESSION_CONFIRM_ACTION.KEEP_PRACTISING) {
    return {
      action: END_SESSION_CONFIRM_ACTION.KEEP_PRACTISING,
      closeModal: true,
      mutateSession: false,
      completeSession: false,
      pauseSession: false,
      saveForLater: false,
      endEarly: false,
    }
  }
  if (action === END_SESSION_CONFIRM_ACTION.SAVE_FOR_LATER) {
    return {
      action: END_SESSION_CONFIRM_ACTION.SAVE_FOR_LATER,
      closeModal: true,
      mutateSession: true,
      completeSession: false,
      pauseSession: true,
      saveForLater: true,
      endEarly: false,
    }
  }
  if (action === END_SESSION_CONFIRM_ACTION.END_SESSION) {
    if (!rangeComplete) {
      return {
        action: END_SESSION_CONFIRM_ACTION.END_SESSION,
        closeModal: true,
        mutateSession: true,
        completeSession: false,
        pauseSession: false,
        saveForLater: false,
        endEarly: true,
      }
    }
    return {
      action: END_SESSION_CONFIRM_ACTION.END_SESSION,
      closeModal: false,
      mutateSession: true,
      completeSession: true,
      pauseSession: false,
      saveForLater: false,
      endEarly: false,
    }
  }
  return {
    action: null,
    closeModal: false,
    mutateSession: false,
    completeSession: false,
    pauseSession: false,
    saveForLater: false,
    endEarly: false,
  }
}

/**
 * Concise repetition progress for the End Session confirmation modal.
 * Example: "3 of 5 repetitions completed" / "0 of 1 repetition completed"
 */
export function buildRepetitionProgressSummary({ completed = 0, total = 1 } = {}, t = null) {
  const safeTotal = Math.max(1, Number(total) || 1)
  const safeCompleted = Math.max(0, Math.min(safeTotal, Number(completed) || 0))
  if (typeof t === 'function') {
    const key = safeTotal === 1
      ? 'memorisation.sessionExit.repetitionsProgressOne'
      : 'memorisation.sessionExit.repetitionsProgressOther'
    const translated = t(key, {
      completed: safeCompleted,
      total: safeTotal,
    })
    if (translated && translated !== key) {
      return translated
    }
    const fallback = t('memorisation.sessionExit.repetitionsProgress', {
      completed: safeCompleted,
      total: safeTotal,
    })
    if (fallback && fallback !== 'memorisation.sessionExit.repetitionsProgress') {
      return fallback
    }
  }
  const noun = safeTotal === 1 ? 'repetition' : 'repetitions'
  return `${safeCompleted} of ${safeTotal} ${noun} completed`
}

/**
 * After End Session persistence settles, decide whether completion UI may open.
 * Failed persistence keeps the session recoverable and must not open completion CTAs.
 *
 * @param {{
 *   persistenceSucceeded?: boolean,
 *   alreadyCompleted?: boolean,
 *   priorStatus?: string,
 * }} [input]
 */
export function resolveCompletionGate({
  persistenceSucceeded = false,
  alreadyCompleted = false,
  priorStatus = SESSION_STATUS.ACTIVE,
} = {}) {
  if (alreadyCompleted) {
    return {
      openCompletionScreen: true,
      keepRecoverable: false,
      status: SESSION_STATUS.COMPLETED,
      showPostCompletionActions: true,
    }
  }
  if (persistenceSucceeded) {
    return {
      openCompletionScreen: true,
      keepRecoverable: false,
      status: SESSION_STATUS.COMPLETED,
      showPostCompletionActions: true,
    }
  }
  const recoverableStatus = priorStatus === SESSION_STATUS.PAUSED
    ? SESSION_STATUS.PAUSED
    : SESSION_STATUS.ACTIVE
  return {
    openCompletionScreen: false,
    keepRecoverable: true,
    status: recoverableStatus,
    showPostCompletionActions: false,
  }
}

/**
 * Refresh / browser-back bootstrap: completed sessions must never reopen as active
 * or resumable. Backend unfinished (active/paused/interrupted) always wins over
 * stale local "completed" flags from a previous attempt.
 */
export function reconcileBootstrapSessionState(input = {}) {
  const {
    backendUnfinished = false,
    backendStatus = null,
    backendAuthoritative = false,
    localContinuePayload = null,
    centralSessionStatus = null,
    sessionCompleted = false,
    mutqinSessionActive = false,
    activeSnapshot = null,
  } = input

  const unfinishedBackendStatus = (
    backendStatus === BACKEND_SESSION_STATUS.ACTIVE
    || backendStatus === BACKEND_SESSION_STATUS.PAUSED
    || backendStatus === BACKEND_SESSION_STATUS.INTERRUPTED
  )
  const hasUnfinished = !!backendUnfinished || unfinishedBackendStatus

  // Authoritative unfinished row: keep resumable even if local storage still
  // says "completed" from an earlier session attempt.
  if (hasUnfinished) {
    const resumablePayload = isResumableSessionPayload(localContinuePayload, { backendStatus })
      || isResumableSessionPayload(activeSnapshot, { backendStatus })
    // Soft-exit / refresh: resumable without live Pause/End chrome.
    // Mid-sitting Pause keeps sessionPaused=true in the running app only.
    return {
      mutqinSessionActive: false,
      sessionCompleted: false,
      sessionPaused: false,
      continuePayload: resumablePayload ? (localContinuePayload || activeSnapshot) : (localContinuePayload || activeSnapshot || null),
      activeSnapshot: resumablePayload ? activeSnapshot : (activeSnapshot || null),
      resumable: true,
      status: SESSION_STATUS.INTERRUPTED_RESUMABLE,
    }
  }

  const completed = sessionCompleted
    || centralSessionStatus === 'completed'
    || backendStatus === BACKEND_SESSION_STATUS.COMPLETED
    || backendStatus === BACKEND_SESSION_STATUS.ABANDONED

  if (completed) {
    return {
      mutqinSessionActive: false,
      sessionCompleted: true,
      sessionPaused: false,
      continuePayload: null,
      activeSnapshot: null,
      resumable: false,
      status: SESSION_STATUS.COMPLETED,
    }
  }

  // Authoritative backend with no unfinished row: drop stale resume hints.
  if (backendAuthoritative && !backendUnfinished) {
    return {
      mutqinSessionActive: false,
      sessionCompleted: false,
      sessionPaused: false,
      continuePayload: null,
      activeSnapshot: null,
      resumable: false,
      status: SESSION_STATUS.READY_TO_START,
    }
  }

  const resumablePayload = isResumableSessionPayload(localContinuePayload, { backendStatus })
    || isResumableSessionPayload(activeSnapshot, { backendStatus })

  if (resumablePayload) {
    return {
      mutqinSessionActive: false,
      sessionCompleted: false,
      sessionPaused: false,
      continuePayload: localContinuePayload || activeSnapshot,
      activeSnapshot,
      resumable: true,
      status: SESSION_STATUS.INTERRUPTED_RESUMABLE,
    }
  }

  return {
    mutqinSessionActive: !!mutqinSessionActive,
    sessionCompleted: false,
    sessionPaused: false,
    continuePayload: localContinuePayload,
    activeSnapshot,
    resumable: false,
    status: mutqinSessionActive ? SESSION_STATUS.ACTIVE : SESSION_STATUS.READY_TO_START,
  }
}

export function userScopedStorageKey(baseKey, userId) {
  const id = userId == null || userId === '' ? 'guest' : String(userId)
  return `${baseKey}.u.${id}`
}

export default {
  SESSION_STATUS,
  MEDIA_STATUS,
  PRIMARY_SESSION_ACTION,
  SESSION_MUTATION,
  BACKEND_SESSION_STATUS,
  END_SESSION_CONFIRM_ACTION,
  PRACTICE_SESSION_PERSISTENCE,
  PRACTICE_SET_STATE,
  DASHBOARD_ENTRY_INTENT_STORAGE_KEY,
  LEGAL_TRANSITIONS,
  canTransition,
  assertTransition,
  deriveMediaStatus,
  isResumableSessionPayload,
  isBackendSessionUnfinished,
  resolvePracticeSessionPersistence,
  resolveSessionExitTransition,
  resolveExitRangeComplete,
  resolvePracticeSetState,
  resolveBackToMushafTransition,
  deriveSessionStatus,
  resolvePrimarySessionAction,
  resolveSessionActionPresentation,
  buildSessionLifecycleViewModel,
  createSessionActionLock,
  createSessionBroadcast,
  deriveBackendStatusFromEngine,
  extractSessionRange,
  sessionRangesMatch,
  resolveResumeAyahNumber,
  hasResumePlaybackPosition,
  canSkipHydrateForContinue,
  resolvePreferredSessionResumeGate,
  pickContinuePayloadForResume,
  buildContinuePayloadFromLastPosition,
  dashboardEntryIntentStorageKey,
  stashDashboardEntryIntent,
  readStashedDashboardEntryIntent,
  clearStashedDashboardEntryIntent,
  reconcileContinuePayloadWithBackend,
  resolveEndSessionConfirmDecision,
  buildRepetitionProgressSummary,
  resolveCompletionGate,
  reconcileBootstrapSessionState,
  userScopedStorageKey,
}
