/**
 * Session autosave + crash-recovery helpers.
 *
 * Coordinates mid-session checkpoints with the existing Start/Resume/Pause
 * lifecycle. Does not create a second session system.
 *
 * Safari / mobile checklist (covered by unit + feature tests where automation
 * allows; verify manually on device):
 * - screen lock / app background → visibility/freeze flush
 * - background tab restore
 * - temporary offline → local persist + online reconcile
 * - rapid progress → debounced/batched checkpoint
 * - abrupt tab close → keepalive pause + local continue
 * - stale response ordering → client_revision ignore
 */

/** @typedef {'pause'|'save'|null} LifecycleFlushAction */

/**
 * Monotonic client revision for optimistic concurrency.
 * @param {unknown} prev
 * @returns {number}
 */
export function nextClientRevision(prev) {
  const n = Number(prev)
  if (!Number.isFinite(n) || n < 0) return 1
  return Math.floor(n) + 1
}

/**
 * Strip audio / recording blobs from metadata before checkpoint.
 * @param {unknown} value
 * @returns {unknown}
 */
export function stripAutosaveAudio(value) {
  if (value == null) return value
  if (typeof Blob !== 'undefined' && value instanceof Blob) return undefined
  if (typeof ArrayBuffer !== 'undefined' && value instanceof ArrayBuffer) return undefined
  if (Array.isArray(value)) {
    return value.map(stripAutosaveAudio).filter((item) => item !== undefined)
  }
  if (typeof value !== 'object') return value

  const out = {}
  for (const [key, raw] of Object.entries(value)) {
    const lower = String(key).toLowerCase()
    if (
      lower.includes('audio')
      || lower.includes('recording')
      || lower.includes('waveform')
      || lower === 'blob'
      || lower === 'blobs'
      || lower.endsWith('_url') && (lower.includes('media') || lower.includes('record'))
    ) {
      continue
    }
    const cleaned = stripAutosaveAudio(raw)
    if (cleaned !== undefined) out[key] = cleaned
  }
  return out
}

/**
 * Build a lightweight mid-session checkpoint payload for POST /api/session.
 * Never includes raw audio.
 *
 * @param {object} ctx
 * @returns {object}
 */
export function buildCheckpointPayload(ctx = {}) {
  const sessionId = Number(ctx.sessionId || ctx.backendSessionId || 0)
  const revision = Number(ctx.clientRevision || 0)
  const nowIso = ctx.nowIso || new Date().toISOString()
  const sessionState = ctx.sessionState && typeof ctx.sessionState === 'object'
    ? ctx.sessionState
    : {}
  const config = ctx.config || sessionState.config || null
  const paused = !!ctx.paused
  const active = !!ctx.active && !paused

  const slimMeta = stripAutosaveAudio({
    ...sessionState,
    active,
    paused,
    completed: false,
    completed_at: null,
    config,
    queue: Array.isArray(sessionState.queue) ? sessionState.queue : undefined,
    current_index: Number.isFinite(Number(ctx.currentStep))
      ? Number(ctx.currentStep)
      : sessionState.current_index,
    client_revision: revision > 0 ? revision : undefined,
    last_saved_at: nowIso,
  })

  const payload = {
    action: 'save',
    surah_number: Number(ctx.surahNumber || 0) || null,
    ayah_number: Number(ctx.ayahNumber || 0) || null,
    current_step: Number.isFinite(Number(ctx.currentStep)) ? Number(ctx.currentStep) : 0,
    memorisation_mode: ctx.memorisationMode || null,
    repetitions_completed: Number.isFinite(Number(ctx.repetitionsCompleted))
      ? Math.max(0, Number(ctx.repetitionsCompleted))
      : 0,
    session_duration_seconds: Number.isFinite(Number(ctx.sessionDurationSeconds))
      ? Math.max(0, Number(ctx.sessionDurationSeconds))
      : undefined,
    last_activity_at: nowIso,
    client_revision: revision > 0 ? revision : undefined,
    metadata: slimMeta,
  }

  if (sessionId > 0) payload.session_id = sessionId
  if (paused) {
    payload.status = 'paused'
    payload.paused_at = ctx.pausedAt || nowIso
  } else if (active) {
    payload.status = 'active'
  }

  // Drop undefined keys so validation stays clean.
  return Object.fromEntries(
    Object.entries(payload).filter(([, v]) => v !== undefined)
  )
}

/**
 * Whether autosave may run for the current UI context.
 * @param {object} ctx
 * @returns {boolean}
 */
export function shouldAutosave(ctx = {}) {
  if (ctx.backendEnabled === false) return false
  if (ctx.onboardingSample) return false
  if (ctx.completed) return false
  if (ctx.signupIsolation) return false
  if (ctx.manualLockHeld) return false
  if (ctx.isBootstrapping) return false

  const mutation = String(ctx.lifecycleMutation || '').toLowerCase()
  if (mutation === 'starting' || mutation === 'ending' || mutation === 'pausing' || mutation === 'resuming') {
    return false
  }

  const status = String(ctx.lifecycleStatus || '').toLowerCase()
  if (status === 'starting' || status === 'completing' || status === 'completed' || status === 'hydrating') {
    return false
  }

  // Need an in-progress sitting (live or soft-paused unfinished).
  if (!ctx.isLive && !ctx.isPausedUnfinished && !ctx.hasUnfinished) return false
  return true
}

/**
 * Ignore out-of-order autosave responses.
 * @param {{ sentRevision?: number, responseRevision?: number, sentGeneration?: number, currentGeneration?: number }} input
 * @returns {boolean}
 */
export function isStaleAutosaveResponse(input = {}) {
  const sentGen = Number(input.sentGeneration)
  const curGen = Number(input.currentGeneration)
  if (Number.isFinite(sentGen) && Number.isFinite(curGen) && sentGen !== curGen) {
    return true
  }

  const sent = Number(input.sentRevision)
  const response = Number(input.responseRevision)
  if (Number.isFinite(sent) && Number.isFinite(response) && response > 0 && response < sent) {
    return true
  }

  // A newer local revision was issued while this response was in flight.
  const currentRev = Number(input.currentRevision)
  if (Number.isFinite(sent) && Number.isFinite(currentRev) && currentRev > sent) {
    return true
  }

  return false
}

/**
 * Decide unload / visibility flush action.
 * @param {{ isLiveActive?: boolean, isPausedUnfinished?: boolean, completed?: boolean }} input
 * @returns {LifecycleFlushAction}
 */
export function resolveLifecycleFlushAction(input = {}) {
  if (input.completed) return null
  if (input.isLiveActive) return 'pause'
  if (input.isPausedUnfinished) return 'save'
  return null
}

/**
 * Read CSRF token from document meta / XSRF cookie (best-effort for keepalive).
 * @param {{ document?: Document }} [env]
 * @returns {{ csrfToken: string, xsrfToken: string }}
 */
export function readKeepaliveCsrf(env = {}) {
  const doc = env.document || (typeof document !== 'undefined' ? document : null)
  let csrfToken = ''
  let xsrfToken = ''
  try {
    csrfToken = doc?.head?.querySelector?.('meta[name="csrf-token"]')?.content || ''
  } catch {
    csrfToken = ''
  }
  try {
    const cookie = typeof doc?.cookie === 'string' ? doc.cookie : ''
    const match = cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/)
    if (match?.[1]) {
      try {
        xsrfToken = decodeURIComponent(match[1])
      } catch {
        xsrfToken = match[1]
      }
    }
  } catch {
    xsrfToken = ''
  }
  return { csrfToken, xsrfToken }
}

/**
 * POST with keepalive for crash / background flushes.
 * Prefers fetch(keepalive); falls back to sendBeacon.
 *
 * @param {string} url
 * @param {object} body
 * @param {{ csrfToken?: string, xsrfToken?: string, fetchImpl?: typeof fetch, beacon?: Function, headers?: Record<string,string> }} [options]
 * @returns {Promise<{ ok: boolean, transport: 'fetch'|'beacon'|'none' }>}
 */
export async function postKeepalive(url, body, options = {}) {
  const payload = typeof body === 'string' ? body : JSON.stringify(body ?? {})
  const { csrfToken = '', xsrfToken = '' } = options
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
    ...(options.headers || {}),
  }
  if (csrfToken) headers['X-CSRF-TOKEN'] = csrfToken
  if (xsrfToken) headers['X-XSRF-TOKEN'] = xsrfToken

  const fetchImpl = options.fetchImpl
    || (typeof fetch === 'function' ? fetch.bind(globalThis) : null)

  if (fetchImpl) {
    try {
      const res = await fetchImpl(url, {
        method: 'POST',
        headers,
        body: payload,
        credentials: 'same-origin',
        keepalive: true,
      })
      return { ok: !!res?.ok, transport: 'fetch' }
    } catch {
      // Fall through to beacon.
    }
  }

  const beacon = options.beacon
    || (typeof navigator !== 'undefined' && typeof navigator.sendBeacon === 'function'
      ? navigator.sendBeacon.bind(navigator)
      : null)

  if (beacon) {
    try {
      const blob = typeof Blob !== 'undefined'
        ? new Blob([payload], { type: 'application/json' })
        : payload
      const ok = !!beacon(url, blob)
      return { ok, transport: 'beacon' }
    } catch {
      return { ok: false, transport: 'none' }
    }
  }

  return { ok: false, transport: 'none' }
}

/**
 * Map flush action to API path (relative to site origin).
 * @param {LifecycleFlushAction} action
 * @returns {string|null}
 */
export function flushActionToPath(action) {
  if (action === 'pause') return '/api/session/pause'
  if (action === 'save') return '/api/session'
  return null
}

export default {
  nextClientRevision,
  stripAutosaveAudio,
  buildCheckpointPayload,
  shouldAutosave,
  isStaleAutosaveResponse,
  resolveLifecycleFlushAction,
  readKeepaliveCsrf,
  postKeepalive,
  flushActionToPath,
}
