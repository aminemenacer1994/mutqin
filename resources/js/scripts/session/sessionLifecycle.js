/**
 * Central session lifecycle state machine and primary-action resolver.
 *
 * All Start / Resume / End session controls must derive labels and behaviour
 * from this module instead of local ad-hoc conditionals.
 *
 * Session status and media (audio) status are intentionally separate:
 * pausing an ayah never changes the primary lifecycle action away from End Session.
 */

/** @typedef {'hydrating'|'onboarding_required'|'onboarding_example'|'ready_to_start'|'starting'|'active'|'interrupted_resumable'|'resuming'|'ending'|'completed'|'completion_modal_open'|'error_recoverable'|'logged_out'|'rejected'|'uninitialised'|'ready'|'resumable'|'ended'|'error'|'playing'|'paused'|'interrupted'} SessionStatus */

/** @typedef {'idle'|'loading'|'playing'|'paused'|'ended'|'error'} MediaStatus */

/** @typedef {'start-onboarding'|'continue-onboarding'|'try-example'|'start-session'|'resume-session'|'end-session'|'loading'|'none'} PrimarySessionAction */

/** @typedef {'idle'|'starting'|'resuming'|'ending'} SessionMutation */

export const SESSION_STATUS = Object.freeze({
  HYDRATING: 'hydrating',
  ONBOARDING_REQUIRED: 'onboarding_required',
  ONBOARDING_EXAMPLE: 'onboarding_example',
  READY_TO_START: 'ready_to_start',
  STARTING: 'starting',
  ACTIVE: 'active',
  INTERRUPTED_RESUMABLE: 'interrupted_resumable',
  RESUMING: 'resuming',
  ENDING: 'ending',
  COMPLETED: 'completed',
  COMPLETION_MODAL_OPEN: 'completion_modal_open',
  ERROR_RECOVERABLE: 'error_recoverable',
  LOGGED_OUT: 'logged_out',
  UNINITIALISED: 'hydrating',
  READY: 'ready_to_start',
  RESUMABLE: 'interrupted_resumable',
  ENDED: 'completed',
  ERROR: 'error_recoverable',
  REJECTED: 'rejected',
  PLAYING: 'active',
  PAUSED: 'active',
  INTERRUPTED: 'active',
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
  END_SESSION: 'end-session',
  LOADING: 'loading',
  NONE: 'none',
})

export const SESSION_MUTATION = Object.freeze({
  IDLE: 'idle',
  STARTING: 'starting',
  RESUMING: 'resuming',
  ENDING: 'ending',
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
  ],
  [SESSION_STATUS.REJECTED]: [
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.READY_TO_START,
  ],
  [SESSION_STATUS.READY_TO_START]: [
    SESSION_STATUS.STARTING,
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
  ],
  [SESSION_STATUS.STARTING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.ERROR_RECOVERABLE,
  ],
  [SESSION_STATUS.ACTIVE]: [
    SESSION_STATUS.ENDING,
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.COMPLETION_MODAL_OPEN,
  ],
  [SESSION_STATUS.INTERRUPTED_RESUMABLE]: [
    SESSION_STATUS.RESUMING,
    SESSION_STATUS.READY_TO_START,
    SESSION_STATUS.COMPLETED,
  ],
  [SESSION_STATUS.RESUMING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.INTERRUPTED_RESUMABLE,
    SESSION_STATUS.ERROR_RECOVERABLE,
    SESSION_STATUS.READY_TO_START,
  ],
  [SESSION_STATUS.ENDING]: [
    SESSION_STATUS.COMPLETED,
    SESSION_STATUS.ACTIVE,
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
  if (status === 'playing' || status === 'paused' || status === 'interrupted') {
    return SESSION_STATUS.ACTIVE
  }
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
    || backendStatus === BACKEND_SESSION_STATUS.NONE
  ) {
    return false
  }
  const chapterId = Number(payload?.config?.chapterId || payload?.chapterId || 0)
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
    completionModalOpen = false,
    hasValidatedContinuePayload = false,
    backendUnfinished = false,
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
  if (mutation === SESSION_MUTATION.ENDING) return SESSION_STATUS.ENDING

  if (completionModalOpen) {
    return SESSION_STATUS.COMPLETION_MODAL_OPEN
  }

  if (lastError && !mutqinSessionActive && !hasValidatedContinuePayload && !requiresOnboarding) {
    return SESSION_STATUS.ERROR_RECOVERABLE
  }

  if (onboardingExampleRejected && requiresOnboarding) {
    return SESSION_STATUS.REJECTED
  }

  if (onboardingExampleActive) {
    return SESSION_STATUS.ONBOARDING_EXAMPLE
  }

  if (requiresOnboarding) {
    return SESSION_STATUS.ONBOARDING_REQUIRED
  }

  if (mutqinSessionActive && !sessionCompleted) {
    return SESSION_STATUS.ACTIVE
  }

  if ((hasValidatedContinuePayload || backendUnfinished) && !mutqinSessionActive) {
    return SESSION_STATUS.INTERRUPTED_RESUMABLE
  }

  if (sessionCompleted && !mutqinSessionActive && !hasValidatedContinuePayload && !backendUnfinished) {
    return SESSION_STATUS.COMPLETED
  }

  if (onboardingStarted && requiresOnboarding) {
    return SESSION_STATUS.ONBOARDING_REQUIRED
  }

  void wasInterrupted
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
    completionModalOpen: !!sessionState.completionModalOpen,
    hasValidatedContinuePayload: !!sessionState.hasValidatedContinuePayload,
    backendUnfinished: !!sessionState.backendUnfinished,
    wasInterrupted: !!sessionState.wasInterrupted,
    mutation: sessionState.mutation || SESSION_MUTATION.IDLE,
    lastError: sessionState.lastError || null,
  }))

  switch (status) {
    case SESSION_STATUS.HYDRATING:
    case SESSION_STATUS.STARTING:
    case SESSION_STATUS.RESUMING:
    case SESSION_STATUS.ENDING:
      return PRIMARY_SESSION_ACTION.LOADING

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
      return PRIMARY_SESSION_ACTION.END_SESSION

    case SESSION_STATUS.INTERRUPTED_RESUMABLE:
      return PRIMARY_SESSION_ACTION.RESUME_SESSION

    case SESSION_STATUS.COMPLETED:
    case SESSION_STATUS.READY_TO_START:
      return PRIMARY_SESSION_ACTION.START_SESSION

    case SESSION_STATUS.ERROR_RECOVERABLE:
      if (sessionState.hasValidatedContinuePayload || sessionState.backendUnfinished) {
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
    showEndCompanion: false,
    stableWidthCh: Number(options.stableWidthCh || 16),
  }
}

function resolveLoadingLabelKey(status) {
  const normalised = normaliseSessionStatus(status)
  if (normalised === SESSION_STATUS.STARTING) return 'common.startingSession'
  if (normalised === SESSION_STATUS.RESUMING) return 'common.resumingSession'
  if (normalised === SESSION_STATUS.ENDING) return 'common.endingSession'
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
      completionModalOpen: !!input.completionModalOpen,
      hasValidatedContinuePayload: !!input.hasValidatedContinuePayload,
      backendUnfinished: !!input.backendUnfinished,
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
    canStart: action === PRIMARY_SESSION_ACTION.START_SESSION,
    canEnd: action === PRIMARY_SESSION_ACTION.END_SESSION,
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
  userScopedStorageKey,
}
