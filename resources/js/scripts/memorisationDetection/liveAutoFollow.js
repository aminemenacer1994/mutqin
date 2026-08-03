/**
 * Calm live auto-follow scrolling for the AI memorisation mushaf shell.
 * Pure geometry helpers + a small controller; no Vue dependency.
 */

export const AMD_AUTO_FOLLOW_PREF_KEY = 'mutqin.amd.autoFollow'

/** Target active line around natural eye level (~40% from top). */
export const AUTO_FOLLOW_TARGET_RATIO = 0.4
/** Comfortable reading band — scroll only when the active line leaves this zone. */
export const AUTO_FOLLOW_MIN_RATIO = 0.28
export const AUTO_FOLLOW_MAX_RATIO = 0.55
/** Ignore tiny adjustments that would feel like shaking. */
export const AUTO_FOLLOW_MIN_DELTA_PX = 20
/** After manual scroll, wait before auto-resuming. */
export const AUTO_FOLLOW_IDLE_RESUME_MS = 4500
/** Coalesce rapid recognition updates. */
export const AUTO_FOLLOW_RAF_COALESCE = true

export function normaliseAutoFollowEnabled(value, fallback = true) {
  if (value === true || value === 1 || value === '1' || value === 'on' || value === 'true') return true
  if (value === false || value === 0 || value === '0' || value === 'off' || value === 'false') return false
  return fallback
}

export function readStoredAutoFollowEnabled(storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  // Product rule: auto-follow is always on; storage is ignored for enablement.
  void storage
  return true
}

export function storeAutoFollowEnabled(enabled, storage = typeof localStorage !== 'undefined' ? localStorage : null) {
  if (!storage) return
  try {
    // Always persist as enabled so older clients that still read the pref stay on.
    storage.setItem(AMD_AUTO_FOLLOW_PREF_KEY, '1')
  } catch { /* ignore */ }
  void enabled
}

/**
 * Compute whether / how far to scroll so the active element sits near targetRatio.
 *
 * Metrics use container-local coordinates:
 * - activeOffsetTop: distance from the top of the visible container to the active element
 * - activeHeight: height of the active word/line
 *
 * @returns {{ shouldScroll: boolean, nextScrollTop: number, reason: string, ratio: number }}
 */
export function computeAutoFollowScroll({
  containerHeight = 0,
  scrollTop = 0,
  scrollHeight = 0,
  activeOffsetTop = 0,
  activeHeight = 0,
  targetRatio = AUTO_FOLLOW_TARGET_RATIO,
  minRatio = AUTO_FOLLOW_MIN_RATIO,
  maxRatio = AUTO_FOLLOW_MAX_RATIO,
  minDeltaPx = AUTO_FOLLOW_MIN_DELTA_PX,
} = {}) {
  const height = Number(containerHeight) || 0
  if (height <= 0) {
    return { shouldScroll: false, nextScrollTop: scrollTop, reason: 'no_container', ratio: 0 }
  }

  const midOffset = Number(activeOffsetTop) + Math.max(0, Number(activeHeight) || 0) * 0.35
  const ratio = midOffset / height
  if (ratio >= minRatio && ratio <= maxRatio) {
    return { shouldScroll: false, nextScrollTop: scrollTop, reason: 'in_zone', ratio }
  }

  const desiredTop = Number(scrollTop) + midOffset - height * targetRatio
  const maxScroll = Math.max(0, Number(scrollHeight) - height)
  const nextScrollTop = Math.max(0, Math.min(maxScroll, desiredTop))
  const delta = Math.abs(nextScrollTop - Number(scrollTop))
  if (delta < minDeltaPx) {
    return { shouldScroll: false, nextScrollTop: scrollTop, reason: 'micro_delta', ratio }
  }

  return {
    shouldScroll: true,
    nextScrollTop,
    reason: ratio < minRatio ? 'above_zone' : 'below_zone',
    ratio,
    delta,
  }
}

/**
 * Build a cache of word nodes keyed by data-recitation-word-index.
 * Avoids full-DOM scans on every speech update when indexes are stable.
 */
export function buildWordElementCache(root) {
  const cache = new Map()
  if (!root || typeof root.querySelectorAll !== 'function') return cache
  const nodes = root.querySelectorAll('[data-recitation-word-index]')
  nodes.forEach((node) => {
    const index = Number(node.getAttribute('data-recitation-word-index'))
    if (Number.isFinite(index)) cache.set(index, node)
  })
  return cache
}

export function resolveActiveWordElement(root, cache = null, preferredIndex = null) {
  if (Number.isFinite(preferredIndex) && cache?.has(Number(preferredIndex))) {
    const cached = cache.get(Number(preferredIndex))
    if (cached?.isConnected) return cached
  }
  if (Number.isFinite(preferredIndex) && root?.querySelector) {
    const byIndex = root.querySelector(`[data-recitation-word-index="${Number(preferredIndex)}"]`)
    if (byIndex) return byIndex
  }
  return root?.querySelector?.(
    '.amd-word-current, .amd-ayah-run.is-active .amd-word-current, .amd-ayah-run.is-active, .amd-ayah-block.is-active'
  ) || null
}

export function prefersReducedMotion(media = typeof window !== 'undefined' ? window.matchMedia : null) {
  try {
    return !!media?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

/**
 * Session controller for preference, manual-pause, idle resume, and scroll application.
 */
export function createLiveAutoFollowController(options = {}) {
  const nowFn = typeof options.now === 'function' ? options.now : () => Date.now()
  let enabled = options.enabled != null
    ? normaliseAutoFollowEnabled(options.enabled, true)
    : readStoredAutoFollowEnabled(options.storage)
  let paused = false
  let lastActiveIndex = null
  let idleTimer = null
  let rafId = null
  let programmaticScroll = false
  let wordCache = options.wordCache instanceof Map ? options.wordCache : new Map()
  const idleMs = Number.isFinite(options.idleResumeMs) ? options.idleResumeMs : AUTO_FOLLOW_IDLE_RESUME_MS
  const onPauseChange = typeof options.onPauseChange === 'function' ? options.onPauseChange : null

  function clearIdleTimer() {
    if (idleTimer) {
      clearTimeout(idleTimer)
      idleTimer = null
    }
  }

  function notifyPause() {
    onPauseChange?.({ enabled, paused })
  }

  function setEnabled(next, { persist = true } = {}) {
    enabled = normaliseAutoFollowEnabled(next, enabled)
    if (persist) storeAutoFollowEnabled(enabled, options.storage)
    if (!enabled) {
      paused = false
      clearIdleTimer()
    }
    notifyPause()
    return enabled
  }

  function resume({ followNow = false } = {}) {
    paused = false
    clearIdleTimer()
    notifyPause()
    if (followNow && typeof options.followNow === 'function') {
      options.followNow()
    }
    return true
  }

  function pauseFromManualScroll() {
    if (!enabled) return false
    if (!paused) {
      paused = true
      notifyPause()
    }
    clearIdleTimer()
    idleTimer = setTimeout(() => {
      idleTimer = null
      if (enabled && paused) resume({ followNow: true })
    }, idleMs)
    return true
  }

  function setWordCache(cache) {
    wordCache = cache instanceof Map ? cache : new Map()
  }

  function rebuildWordCache(root) {
    wordCache = buildWordElementCache(root)
    return wordCache
  }

  function applyScroll(container, nextScrollTop, { reducedMotion = false } = {}) {
    if (!container) return false
    const max = Math.max(0, (container.scrollHeight || 0) - (container.clientHeight || 0))
    const clamped = Math.max(0, Math.min(max, Number(nextScrollTop) || 0))
    if (Math.abs(clamped - (container.scrollTop || 0)) < 1) return false
    programmaticScroll = true
    try {
      if (!reducedMotion && typeof container.scrollTo === 'function') {
        container.scrollTo({ top: clamped, behavior: 'smooth' })
      } else {
        container.scrollTop = clamped
      }
    } finally {
      // Keep the programmatic flag long enough to ignore smooth-scroll events.
      const releaseDelay = reducedMotion ? 50 : 420
      setTimeout(() => { programmaticScroll = false }, releaseDelay)
    }
    return true
  }

  function evaluate(container, activeEl) {
    if (!enabled || paused) {
      return { shouldScroll: false, reason: !enabled ? 'disabled' : 'paused' }
    }
    if (!container || !activeEl) {
      return { shouldScroll: false, reason: 'missing_nodes' }
    }
    const containerRect = container.getBoundingClientRect?.() || {
      top: 0,
      height: container.clientHeight || 0,
    }
    const activeRect = activeEl.getBoundingClientRect?.() || {
      top: containerRect.top,
      height: activeEl.offsetHeight || 0,
    }
    return computeAutoFollowScroll({
      containerHeight: containerRect.height || container.clientHeight || 0,
      scrollTop: container.scrollTop || 0,
      scrollHeight: container.scrollHeight || 0,
      activeOffsetTop: activeRect.top - containerRect.top,
      activeHeight: activeRect.height || 0,
    })
  }

  function followActive({
    container,
    root,
    activeIndex = null,
    force = false,
    reducedMotion = prefersReducedMotion(),
  } = {}) {
    if (!enabled || (paused && !force)) {
      return { scrolled: false, reason: !enabled ? 'disabled' : 'paused' }
    }
    const indexChanged = Number.isFinite(activeIndex) && activeIndex !== lastActiveIndex
    if (Number.isFinite(activeIndex)) lastActiveIndex = activeIndex

    const activeEl = resolveActiveWordElement(root, wordCache, activeIndex)
    const plan = evaluate(container, activeEl)
    if (!plan.shouldScroll && !force) {
      return { scrolled: false, reason: plan.reason, ratio: plan.ratio, indexChanged }
    }
    if (!plan.shouldScroll && force && activeEl && container) {
      // Forced resume: still only move if outside the zone.
      return { scrolled: false, reason: plan.reason || 'in_zone', ratio: plan.ratio }
    }
    const scrolled = applyScroll(container, plan.nextScrollTop, { reducedMotion })
    return {
      scrolled,
      reason: plan.reason,
      ratio: plan.ratio,
      nextScrollTop: plan.nextScrollTop,
      indexChanged,
    }
  }

  function scheduleFollow(args = {}) {
    if (rafId != null) return
    const run = () => {
      rafId = null
      followActive(args)
    }
    if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
      rafId = window.requestAnimationFrame(run)
    } else {
      rafId = setTimeout(run, 16)
    }
  }

  function onContainerScroll() {
    if (programmaticScroll) return false
    return pauseFromManualScroll()
  }

  function dispose() {
    clearIdleTimer()
    if (rafId != null) {
      if (typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
        window.cancelAnimationFrame(rafId)
      } else {
        clearTimeout(rafId)
      }
      rafId = null
    }
    wordCache = new Map()
  }

  return {
    get enabled() { return enabled },
    get paused() { return paused },
    get isFollowing() { return enabled && !paused },
    get isProgrammaticScroll() { return programmaticScroll },
    get lastActiveIndex() { return lastActiveIndex },
    get wordCache() { return wordCache },
    setEnabled,
    resume,
    pauseFromManualScroll,
    setWordCache,
    rebuildWordCache,
    evaluate,
    followActive,
    scheduleFollow,
    onContainerScroll,
    applyScroll,
    dispose,
  }
}
