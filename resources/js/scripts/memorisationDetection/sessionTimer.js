/**
 * Shared timestamp-based session/recording timer for AI memorisation recitation.
 *
 * Source of truth is wall-clock timestamps, not a reactive counter.
 * Display ticks only refresh the UI; they never drive elapsed time.
 */

export const TIMER_STATES = Object.freeze({
  IDLE: 'idle',
  RUNNING: 'running',
  PAUSED: 'paused',
  STOPPED: 'stopped',
})

const DEFAULT_TICK_MS = 1000

function clampNonNegative(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return 0
  return n
}

/**
 * Format elapsed milliseconds as MM:SS, or H:MM:SS for long recordings.
 */
export function formatElapsedLabel(elapsedMs = 0) {
  const totalSeconds = Math.max(0, Math.floor(clampNonNegative(elapsedMs) / 1000))
  const hours = Math.floor(totalSeconds / 3600)
  const mins = Math.floor((totalSeconds % 3600) / 60)
  const secs = totalSeconds % 60
  if (hours > 0) {
    return `${hours}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`
}

export function createSessionTimer(options = {}) {
  const tickMs = Math.max(50, Number(options.tickMs) || DEFAULT_TICK_MS)
  const nowFn = typeof options.now === 'function' ? options.now : () => Date.now()
  let onTick = typeof options.onTick === 'function' ? options.onTick : null

  let startedAt = 0
  let pausedAt = 0
  let accumulatedPausedMs = 0
  let elapsedMs = 0
  let timerState = TIMER_STATES.IDLE
  let tickId = null
  let visibilityBound = false

  function snapshot(at = nowFn()) {
    return {
      startedAt,
      pausedAt,
      accumulatedPausedMs,
      elapsedMs: computeElapsedMs(at),
      timerState,
      label: formatElapsedLabel(computeElapsedMs(at)),
    }
  }

  function computeElapsedMs(at = nowFn()) {
    if (timerState === TIMER_STATES.IDLE) return 0
    if (timerState === TIMER_STATES.STOPPED) return elapsedMs
    if (!startedAt) return elapsedMs

    let pausedExtra = 0
    if (timerState === TIMER_STATES.PAUSED && pausedAt > 0) {
      pausedExtra = Math.max(0, at - pausedAt)
    }
    return Math.max(0, at - startedAt - accumulatedPausedMs - pausedExtra)
  }

  function emitTick() {
    const snap = snapshot()
    elapsedMs = snap.elapsedMs
    if (onTick) {
      try { onTick(snap) } catch (_) { /* ignore listener errors */ }
    }
    return snap
  }

  function clearTick() {
    if (tickId == null) return
    if (typeof window !== 'undefined' && typeof window.clearInterval === 'function') {
      window.clearInterval(tickId)
    } else {
      clearInterval(tickId)
    }
    tickId = null
  }

  function ensureTick() {
    if (tickId != null || timerState !== TIMER_STATES.RUNNING) return
    const schedule = typeof window !== 'undefined' && typeof window.setInterval === 'function'
      ? window.setInterval.bind(window)
      : setInterval
    tickId = schedule(() => {
      if (timerState !== TIMER_STATES.RUNNING) {
        clearTick()
        return
      }
      emitTick()
    }, tickMs)
  }

  function onVisibilityChange() {
    if (typeof document === 'undefined') return
    // Tab hide must not freeze wall-clock elapsed; refresh as soon as we can paint again.
    if (!document.hidden && timerState === TIMER_STATES.RUNNING) {
      emitTick()
    }
  }

  function bindVisibility() {
    if (visibilityBound || typeof document === 'undefined') return
    document.addEventListener('visibilitychange', onVisibilityChange)
    visibilityBound = true
  }

  function unbindVisibility() {
    if (!visibilityBound || typeof document === 'undefined') return
    document.removeEventListener('visibilitychange', onVisibilityChange)
    visibilityBound = false
  }

  function start({ at } = {}) {
    const now = Number.isFinite(Number(at)) ? Number(at) : nowFn()
    if (timerState === TIMER_STATES.RUNNING) {
      emitTick()
      return snapshot(now)
    }
    if (timerState === TIMER_STATES.PAUSED) {
      return resume({ at: now })
    }
    if (timerState === TIMER_STATES.STOPPED) {
      // New attempt must call reset() first; ignore accidental double-start.
      return snapshot(now)
    }

    startedAt = now
    pausedAt = 0
    accumulatedPausedMs = 0
    elapsedMs = 0
    timerState = TIMER_STATES.RUNNING
    bindVisibility()
    ensureTick()
    return emitTick()
  }

  function pause({ at } = {}) {
    const now = Number.isFinite(Number(at)) ? Number(at) : nowFn()
    if (timerState !== TIMER_STATES.RUNNING) return snapshot(now)
    elapsedMs = computeElapsedMs(now)
    pausedAt = now
    timerState = TIMER_STATES.PAUSED
    clearTick()
    return emitTick()
  }

  function resume({ at } = {}) {
    const now = Number.isFinite(Number(at)) ? Number(at) : nowFn()
    if (timerState === TIMER_STATES.RUNNING) return snapshot(now)
    if (timerState === TIMER_STATES.IDLE || timerState === TIMER_STATES.STOPPED) {
      return start({ at: now })
    }
    if (pausedAt > 0) {
      accumulatedPausedMs += Math.max(0, now - pausedAt)
    }
    pausedAt = 0
    timerState = TIMER_STATES.RUNNING
    bindVisibility()
    ensureTick()
    return emitTick()
  }

  function stop({ at } = {}) {
    const now = Number.isFinite(Number(at)) ? Number(at) : nowFn()
    if (timerState === TIMER_STATES.IDLE) return snapshot(now)
    if (timerState === TIMER_STATES.STOPPED) return snapshot(now)

    if (timerState === TIMER_STATES.PAUSED && pausedAt > 0) {
      accumulatedPausedMs += Math.max(0, now - pausedAt)
      pausedAt = 0
    }
    elapsedMs = computeElapsedMs(now)
    timerState = TIMER_STATES.STOPPED
    clearTick()
    return emitTick()
  }

  function reset() {
    clearTick()
    startedAt = 0
    pausedAt = 0
    accumulatedPausedMs = 0
    elapsedMs = 0
    timerState = TIMER_STATES.IDLE
    return emitTick()
  }

  /** Stop display updates without changing frozen elapsed (unmount / modal tear-down). */
  function detach() {
    clearTick()
    unbindVisibility()
  }

  function destroy() {
    detach()
    onTick = null
    startedAt = 0
    pausedAt = 0
    accumulatedPausedMs = 0
    elapsedMs = 0
    timerState = TIMER_STATES.IDLE
  }

  function getElapsedMs(at) {
    return computeElapsedMs(Number.isFinite(Number(at)) ? Number(at) : nowFn())
  }

  function getElapsedSeconds(at) {
    return Math.max(0, Math.round(getElapsedMs(at) / 1000))
  }

  return {
    start,
    pause,
    resume,
    stop,
    reset,
    detach,
    destroy,
    snapshot,
    getElapsedMs,
    getElapsedSeconds,
    formatLabel: () => formatElapsedLabel(getElapsedMs()),
    get state() {
      return timerState
    },
    get startedAt() {
      return startedAt
    },
  }
}
