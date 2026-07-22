/**
 * Central session lifecycle state machine and primary-action resolver.
 *
 * All Start / Resume / Pause / End session controls must derive labels and behaviour
 * from this module instead of local ad-hoc conditionals.
 *
 * Session status and media (audio) status are intentionally separate:
 * pausing an ayah never changes the lifecycle status away from active.
 *
 * Explicit practice-session states used by End / Pause / Resume flows:
 * active → paused | completing → completed
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
})

export const BACKEND_SESSION_STATUS = Object.freeze({
  NONE: 'none',
  ACTIVE: 'active',
  PAUSED: 'paused',
  INTERRUPTED: 'interrupted',
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

export function isResumableSessionPayload(payload, options = {}) {
  if (!payload || typeof payload !== 'object') return false
  if (options.isSample || payload.isOnboardingSample || payload.sessionKind === 'sample') return false
  if (payload.completed || payload.sessionStatus === 'completed' || payload.sessionStatus === 'ended') return false
  const backendStatus = options.backendStatus ?? payload.backendStatus ?? null
  if (
    backendStatus === BACKEND_SESSION_STATUS.COMPLETED
    || backendStatus === BACKEND_SESSION_STATUS.ABANDONED
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

  if (
    !mutqinSessionActive
    && !sessionCompleted
    && (
      sessionPaused
      || backendStatus === BACKEND_SESSION_STATUS.PAUSED
    )
  ) {
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
  const showEndCompanion = (
    action === PRIMARY_SESSION_ACTION.PAUSE_SESSION
    || action === PRIMARY_SESSION_ACTION.RESUME_SESSION
  )

  const map = {
    [PRIMARY_SESSION_ACTION.START_ONBOARDING]: {
      labelKey: 'memorisation.onboarding.startOnboarding',
      icon: 'bi-play-fill',
      fallback: 'Start Onboarding',
    },
    [PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING]: {
      labelKey: 'memorisation.onboarding.continueOnboarding',
      icon: 'bi-play-fill',
      fallback: 'Continue Onboarding',
    },
    [PRIMARY_SESSION_ACTION.TRY_EXAMPLE]: {
      labelKey: 'memorisation.onboarding.playSampleSession',
      icon: 'bi-play-fill',
      fallback: 'Try Example',
    },
    [PRIMARY_SESSION_ACTION.START_SESSION]: {
      labelKey: 'common.startSession',
      icon: 'bi-play-fill',
      fallback: 'Start Session',
    },
    [PRIMARY_SESSION_ACTION.RESUME_SESSION]: {
      labelKey: 'common.resumeSession',
      icon: 'bi-play-fill',
      fallback: 'Resume Session',
    },
    [PRIMARY_SESSION_ACTION.PAUSE_SESSION]: {
      labelKey: 'common.pauseSession',
      icon: 'bi-pause-fill',
      fallback: 'Pause Session',
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
  return {
    ...localPayload,
    backendStatus: backendSession.status || BACKEND_SESSION_STATUS.ACTIVE,
    backendSessionId: backendSession.id || null,
  }
}

/**
 * Resolve End Session confirmation modal actions.
 * Keep practising dismisses the modal without mutating session completion state.
 * Playback may resume after a countdown (UI-only).
 */
export function resolveEndSessionConfirmDecision(action) {
  if (action === END_SESSION_CONFIRM_ACTION.KEEP_PRACTISING) {
    return {
      action: END_SESSION_CONFIRM_ACTION.KEEP_PRACTISING,
      closeModal: true,
      mutateSession: false,
      completeSession: false,
    }
  }
  if (action === END_SESSION_CONFIRM_ACTION.END_SESSION) {
    return {
      action: END_SESSION_CONFIRM_ACTION.END_SESSION,
      closeModal: false,
      mutateSession: true,
      completeSession: true,
    }
  }
  return {
    action: null,
    closeModal: false,
    mutateSession: false,
    completeSession: false,
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
    const paused = backendStatus === BACKEND_SESSION_STATUS.PAUSED
    const resumablePayload = isResumableSessionPayload(localContinuePayload, { backendStatus })
      || isResumableSessionPayload(activeSnapshot, { backendStatus })
    return {
      mutqinSessionActive: false,
      sessionCompleted: false,
      sessionPaused: paused,
      continuePayload: resumablePayload ? (localContinuePayload || activeSnapshot) : (localContinuePayload || activeSnapshot || null),
      activeSnapshot: resumablePayload ? activeSnapshot : (activeSnapshot || null),
      resumable: true,
      status: paused ? SESSION_STATUS.PAUSED : SESSION_STATUS.INTERRUPTED_RESUMABLE,
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
  LEGAL_TRANSITIONS,
  canTransition,
  assertTransition,
  deriveMediaStatus,
  isResumableSessionPayload,
  isBackendSessionUnfinished,
  deriveSessionStatus,
  resolvePrimarySessionAction,
  resolveSessionActionPresentation,
  buildSessionLifecycleViewModel,
  createSessionActionLock,
  createSessionBroadcast,
  deriveBackendStatusFromEngine,
  reconcileContinuePayloadWithBackend,
  resolveEndSessionConfirmDecision,
  buildRepetitionProgressSummary,
  resolveCompletionGate,
  reconcileBootstrapSessionState,
  userScopedStorageKey,
}
