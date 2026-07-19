/**
 * Central session lifecycle state machine and primary-action resolver.
 *
 * All Start / Resume / End session controls must derive labels and behaviour
 * from this module instead of local ad-hoc conditionals.
 */

/** @typedef {'uninitialised'|'onboarding_required'|'onboarding_example'|'ready'|'starting'|'active'|'playing'|'paused'|'interrupted'|'resumable'|'resuming'|'ending'|'ended'|'rejected'|'error'} SessionStatus */

/** @typedef {'start-onboarding'|'continue-onboarding'|'try-example'|'start-session'|'resume-session'|'end-session'|'loading'|'none'} PrimarySessionAction */

/** @typedef {'idle'|'starting'|'resuming'|'ending'} SessionMutation */

export const SESSION_STATUS = Object.freeze({
  UNINITIALISED: 'uninitialised',
  ONBOARDING_REQUIRED: 'onboarding_required',
  ONBOARDING_EXAMPLE: 'onboarding_example',
  READY: 'ready',
  STARTING: 'starting',
  ACTIVE: 'active',
  PLAYING: 'playing',
  PAUSED: 'paused',
  INTERRUPTED: 'interrupted',
  RESUMABLE: 'resumable',
  RESUMING: 'resuming',
  ENDING: 'ending',
  ENDED: 'ended',
  REJECTED: 'rejected',
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

/** @type {Record<SessionStatus, SessionStatus[]>} */
export const LEGAL_TRANSITIONS = Object.freeze({
  [SESSION_STATUS.UNINITIALISED]: [
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.READY,
    SESSION_STATUS.RESUMABLE,
    SESSION_STATUS.ENDED,
    SESSION_STATUS.ERROR,
  ],
  [SESSION_STATUS.ONBOARDING_REQUIRED]: [
    SESSION_STATUS.ONBOARDING_EXAMPLE,
    SESSION_STATUS.READY,
    SESSION_STATUS.REJECTED,
  ],
  [SESSION_STATUS.ONBOARDING_EXAMPLE]: [
    SESSION_STATUS.READY,
    SESSION_STATUS.REJECTED,
    SESSION_STATUS.ENDED,
  ],
  [SESSION_STATUS.REJECTED]: [
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.READY,
  ],
  [SESSION_STATUS.READY]: [
    SESSION_STATUS.STARTING,
    SESSION_STATUS.ONBOARDING_REQUIRED,
    SESSION_STATUS.RESUMABLE,
  ],
  [SESSION_STATUS.STARTING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PLAYING,
    SESSION_STATUS.READY,
    SESSION_STATUS.ERROR,
  ],
  [SESSION_STATUS.ACTIVE]: [
    SESSION_STATUS.PLAYING,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.INTERRUPTED,
    SESSION_STATUS.ENDING,
    SESSION_STATUS.ENDED,
  ],
  [SESSION_STATUS.PLAYING]: [
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.INTERRUPTED,
    SESSION_STATUS.ENDING,
  ],
  [SESSION_STATUS.PAUSED]: [
    SESSION_STATUS.PLAYING,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.INTERRUPTED,
    SESSION_STATUS.ENDING,
  ],
  [SESSION_STATUS.INTERRUPTED]: [
    SESSION_STATUS.RESUMABLE,
    SESSION_STATUS.ENDING,
    SESSION_STATUS.ENDED,
  ],
  [SESSION_STATUS.RESUMABLE]: [
    SESSION_STATUS.RESUMING,
    SESSION_STATUS.READY,
    SESSION_STATUS.ENDED,
  ],
  [SESSION_STATUS.RESUMING]: [
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PLAYING,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.RESUMABLE,
    SESSION_STATUS.ERROR,
    SESSION_STATUS.READY,
  ],
  [SESSION_STATUS.ENDING]: [
    SESSION_STATUS.ENDED,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.PLAYING,
    SESSION_STATUS.PAUSED,
    SESSION_STATUS.ERROR,
  ],
  [SESSION_STATUS.ENDED]: [
    SESSION_STATUS.READY,
  ],
  [SESSION_STATUS.ERROR]: [
    SESSION_STATUS.READY,
    SESSION_STATUS.RESUMABLE,
    SESSION_STATUS.ACTIVE,
    SESSION_STATUS.ONBOARDING_REQUIRED,
  ],
})

/**
 * @param {SessionStatus|string} from
 * @param {SessionStatus|string} to
 */
export function canTransition(from, to) {
  if (from === to) return true
  const allowed = LEGAL_TRANSITIONS[from]
  return Array.isArray(allowed) && allowed.includes(to)
}

/**
 * @param {SessionStatus|string} from
 * @param {SessionStatus|string} to
 * @param {{ logger?: (msg: string, meta?: object) => void }} [options]
 */
export function assertTransition(from, to, options = {}) {
  if (canTransition(from, to)) {
    return { ok: true, from, to }
  }
  const logger = options.logger || ((message, meta) => {
    if (typeof console !== 'undefined' && console.warn) {
      console.warn(message, meta || {})
    }
  })
  logger('[sessionLifecycle] invalid transition blocked', { from, to })
  return { ok: false, from, to, reason: 'invalid_transition' }
}

/**
 * True when a continue/restore payload represents a real unfinished user session.
 * Sample / onboarding payloads and completed sessions are never resumable.
 *
 * @param {object|null|undefined} payload
 * @param {{ backendStatus?: string|null, isSample?: boolean }} [options]
 */
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

/**
 * Authoritative unfinished signal from the backend session row.
 *
 * @param {object|null|undefined} session
 */
export function isBackendSessionUnfinished(session) {
  if (!session || typeof session !== 'object') return false
  if (session.is_onboarding_example) return false
  const status = String(session.status || session.session_status || '').toLowerCase()
  if (!status) {
    // Legacy rows without status: treat active metadata as unfinished.
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

/**
 * Derive the lifecycle status from authoritative inputs.
 *
 * Priority: mutation-in-flight → hydration → auth/onboarding → live session
 * → backend/local unfinished → ready/ended/error.
 *
 * @param {object} input
 * @returns {SessionStatus}
 */
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
    hasValidatedContinuePayload = false,
    backendUnfinished = false,
    isPlaying = false,
    wasInterrupted = false,
    mutation = SESSION_MUTATION.IDLE,
    lastError = null,
  } = input

  if (!authHydrated || !sessionHydrated) {
    return SESSION_STATUS.UNINITIALISED
  }

  if (mutation === SESSION_MUTATION.STARTING) return SESSION_STATUS.STARTING
  if (mutation === SESSION_MUTATION.RESUMING) return SESSION_STATUS.RESUMING
  if (mutation === SESSION_MUTATION.ENDING) return SESSION_STATUS.ENDING

  if (lastError && !mutqinSessionActive && !hasValidatedContinuePayload && !requiresOnboarding) {
    return SESSION_STATUS.ERROR
  }

  if (onboardingExampleRejected && requiresOnboarding) {
    return SESSION_STATUS.REJECTED
  }

  if (onboardingExampleActive) {
    return SESSION_STATUS.ONBOARDING_EXAMPLE
  }

  if (isAuthenticated && requiresOnboarding) {
    return SESSION_STATUS.ONBOARDING_REQUIRED
  }

  if (sessionCompleted && !mutqinSessionActive && !hasValidatedContinuePayload && !backendUnfinished) {
    return SESSION_STATUS.ENDED
  }

  if (mutqinSessionActive && !sessionCompleted) {
    if (wasInterrupted) return SESSION_STATUS.INTERRUPTED
    if (isPlaying) return SESSION_STATUS.PLAYING
    return SESSION_STATUS.PAUSED
  }

  // After refresh / re-login: unfinished work that is not currently live.
  if ((hasValidatedContinuePayload || backendUnfinished) && !mutqinSessionActive) {
    return SESSION_STATUS.RESUMABLE
  }

  if (onboardingStarted && requiresOnboarding) {
    return SESSION_STATUS.ONBOARDING_REQUIRED
  }

  return SESSION_STATUS.READY
}

/**
 * Deterministic primary session action for every surface.
 *
 * @param {object} authState
 * @param {object} onboardingState
 * @param {object} sessionState
 * @param {object} [mediaState]
 * @returns {PrimarySessionAction}
 */
export function resolvePrimarySessionAction(
  authState = {},
  onboardingState = {},
  sessionState = {},
  mediaState = {}
) {
  const status = sessionState.status || deriveSessionStatus({
    authHydrated: authState.hydrated !== false,
    sessionHydrated: sessionState.hydrated !== false,
    isAuthenticated: !!authState.isAuthenticated,
    requiresOnboarding: !!onboardingState.required,
    onboardingStarted: !!onboardingState.started,
    onboardingExampleActive: !!onboardingState.exampleActive,
    onboardingExampleRejected: !!onboardingState.exampleRejected,
    mutqinSessionActive: !!sessionState.mutqinSessionActive,
    sessionCompleted: !!sessionState.completed,
    hasValidatedContinuePayload: !!sessionState.hasValidatedContinuePayload,
    backendUnfinished: !!sessionState.backendUnfinished,
    isPlaying: !!mediaState.isPlaying,
    wasInterrupted: !!sessionState.wasInterrupted,
    mutation: sessionState.mutation || SESSION_MUTATION.IDLE,
    lastError: sessionState.lastError || null,
  })

  switch (status) {
    case SESSION_STATUS.UNINITIALISED:
    case SESSION_STATUS.STARTING:
    case SESSION_STATUS.RESUMING:
    case SESSION_STATUS.ENDING:
      return PRIMARY_SESSION_ACTION.LOADING

    case SESSION_STATUS.ONBOARDING_REQUIRED:
      if (onboardingState.started) return PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING
      return PRIMARY_SESSION_ACTION.START_ONBOARDING

    case SESSION_STATUS.ONBOARDING_EXAMPLE:
      // Sample sessions are not real user sessions; ending cleans them up.
      return PRIMARY_SESSION_ACTION.END_SESSION

    case SESSION_STATUS.REJECTED:
      return onboardingState.required
        ? PRIMARY_SESSION_ACTION.CONTINUE_ONBOARDING
        : PRIMARY_SESSION_ACTION.START_SESSION

    case SESSION_STATUS.ACTIVE:
    case SESSION_STATUS.PLAYING:
    case SESSION_STATUS.PAUSED:
    case SESSION_STATUS.INTERRUPTED:
      // Playback must never replace End Session as the primary lifecycle action.
      return PRIMARY_SESSION_ACTION.END_SESSION

    case SESSION_STATUS.RESUMABLE:
      return PRIMARY_SESSION_ACTION.RESUME_SESSION

    case SESSION_STATUS.ENDED:
    case SESSION_STATUS.READY:
      return PRIMARY_SESSION_ACTION.START_SESSION

    case SESSION_STATUS.ERROR:
      if (sessionState.hasValidatedContinuePayload || sessionState.backendUnfinished) {
        return PRIMARY_SESSION_ACTION.RESUME_SESSION
      }
      return PRIMARY_SESSION_ACTION.START_SESSION

    default:
      return PRIMARY_SESSION_ACTION.NONE
  }
}

/**
 * @param {PrimarySessionAction|string} action
 * @param {(key: string, params?: object) => string} t
 * @param {{ status?: SessionStatus|string, stableWidthCh?: number }} [options]
 * @returns {{
 *   action: PrimarySessionAction|string,
 *   label: string,
 *   disabled: boolean,
 *   loading: boolean,
 *   ariaLabel: string,
 *   ariaBusy: boolean,
 *   icon: string,
 *   showEndCompanion: boolean,
 *   stableWidthCh: number,
 * }}
 */
export function resolveSessionActionPresentation(action, t = (key) => key, options = {}) {
  const translate = typeof t === 'function' ? t : (key) => key
  const loading = action === PRIMARY_SESSION_ACTION.LOADING
  const disabled = loading
    || action === PRIMARY_SESSION_ACTION.NONE

  /** @type {Record<string, { labelKey: string, icon: string, fallback: string }>} */
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
    // End is the primary action while live — never pair with a second End button.
    showEndCompanion: false,
    stableWidthCh: Number(options.stableWidthCh || 16),
  }
}

function resolveLoadingLabelKey(status) {
  if (status === SESSION_STATUS.STARTING) return 'common.startingSession'
  if (status === SESSION_STATUS.RESUMING) return 'common.resumingSession'
  if (status === SESSION_STATUS.ENDING) return 'common.endingSession'
  return 'common.loading'
}

/**
 * Build a snapshot consumed by Vue computeds / multiple UI surfaces so they
 * stay synchronised.
 *
 * @param {object} input
 */
export function buildSessionLifecycleViewModel(input = {}) {
  const status = deriveSessionStatus(input)
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
      hasValidatedContinuePayload: !!input.hasValidatedContinuePayload,
      backendUnfinished: !!input.backendUnfinished,
      wasInterrupted: !!input.wasInterrupted,
      mutation: input.mutation || SESSION_MUTATION.IDLE,
      lastError: input.lastError || null,
    },
    {
      isPlaying: !!input.isPlaying,
    }
  )
  const presentation = resolveSessionActionPresentation(action, input.t, { status })

  return {
    status,
    action,
    presentation,
    canResume: action === PRIMARY_SESSION_ACTION.RESUME_SESSION,
    canStart: action === PRIMARY_SESSION_ACTION.START_SESSION,
    canEnd: action === PRIMARY_SESSION_ACTION.END_SESSION,
    isLoading: action === PRIMARY_SESSION_ACTION.LOADING,
  }
}

/**
 * Serialise mutation lock to prevent double-start / double-end / resume races.
 */
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

/**
 * Cross-tab session event bus (BroadcastChannel with storage fallback).
 *
 * @param {string} [channelName]
 */
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
      const message = {
        type,
        payload,
        at: Date.now(),
      }
      if (channel) {
        try {
          channel.postMessage(message)
        } catch {
          // ignore
        }
      }
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem(storageKey, JSON.stringify(message))
        }
      } catch {
        // ignore
      }
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
        } catch {
          // ignore
        }
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
      try {
        channel?.close?.()
      } catch {
        // ignore
      }
      channel = null
    },
  }
}

/**
 * Map engine/mutqin session blob fields onto a backend-friendly status.
 *
 * @param {object} sessionState
 */
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

/**
 * Ignore stale local continue hints when the backend says the session ended.
 *
 * @param {object|null} localPayload
 * @param {object|null} backendSession
 */
export function reconcileContinuePayloadWithBackend(localPayload, backendSession) {
  if (!isResumableSessionPayload(localPayload)) return null
  if (!backendSession) {
    // No backend row yet (guest or not synced) — keep validated local payload.
    return localPayload
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

export default {
  SESSION_STATUS,
  PRIMARY_SESSION_ACTION,
  SESSION_MUTATION,
  BACKEND_SESSION_STATUS,
  LEGAL_TRANSITIONS,
  canTransition,
  assertTransition,
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
}
