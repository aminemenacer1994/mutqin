/**
 * Centralised calm scroll-into-view for memorisation session entry.
 * Call only from explicit session navigation (start / resume / saved / recommended).
 * Never from word-recognition watchers, setting tweaks, or modal toggles.
 */

export const SESSION_WORKSPACE_SCROLL_REASON = Object.freeze({
  NEW_SESSION: 'new_session',
  RESUME_SESSION: 'resume_session',
  SAVED_SESSION: 'saved_session',
  RECOMMENDED_REVISION: 'recommended_revision',
  SESSION_SWITCH: 'session_switch',
  DASHBOARD_RETURN: 'dashboard_return',
})

/** Entry reasons that should bring the session chrome into view. */
export const SESSION_ENTRY_SCROLL_REASONS = Object.freeze(
  Object.values(SESSION_WORKSPACE_SCROLL_REASON)
)

/** Internal mushaf / modal scrollers — never treat these as the page scroller. */
export const SESSION_SCROLL_EXCLUDED_SELECTORS = Object.freeze([
  '.mushaf-viewport-scroll',
  '.mushaf-viewport',
  '.amd-mushaf-shell',
  '.amd-mushaf-panel',
  '.modal-body',
  '.modal-dialog',
  '.offcanvas',
  '.offcanvas-body',
  '.tools',
  '.tools-body',
  '[data-session-scroll-ignore]',
])

export const DEFAULT_NAV_OFFSET_PX = 64
export const SESSION_SCROLL_DEDUPEms = 900

/**
 * @param {MediaQueryList | { matches?: boolean } | null | undefined} media
 */
export function prefersReducedMotion(media = null) {
  if (media && typeof media.matches === 'boolean') return media.matches
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false
  try {
    return !!window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

/**
 * @param {Document | null | undefined} doc
 * @param {number} fallback
 */
export function measureStickyNavOffset(doc = typeof document !== 'undefined' ? document : null, fallback = DEFAULT_NAV_OFFSET_PX) {
  if (!doc || typeof doc.querySelector !== 'function') return fallback
  const nav = doc.querySelector('nav.navbar.app-navbar, .app-navbar, [data-app-navbar]')
  if (nav && typeof nav.getBoundingClientRect === 'function') {
    const height = Math.round(nav.getBoundingClientRect().height || 0)
    if (height > 0) return height
  }
  try {
    const root = doc.documentElement
    const raw = root && typeof getComputedStyle === 'function'
      ? getComputedStyle(root).getPropertyValue('--navbar-offset')
      : ''
    const parsed = Number.parseFloat(String(raw || '').trim())
    if (Number.isFinite(parsed) && parsed > 0) return Math.round(parsed)
  } catch {
    // ignore
  }
  return fallback
}

/**
 * @param {Element | null | undefined} el
 * @param {string[]} excludedSelectors
 */
export function isExcludedScrollContainer(el, excludedSelectors = SESSION_SCROLL_EXCLUDED_SELECTORS) {
  if (!el || el.nodeType !== 1) return true
  return excludedSelectors.some((selector) => {
    try {
      return typeof el.matches === 'function' && el.matches(selector)
    } catch {
      return false
    }
  })
}

/**
 * @param {Element | null | undefined} el
 */
export function elementCanScroll(el) {
  if (!el || el.nodeType !== 1) return false
  if (typeof window === 'undefined' || typeof window.getComputedStyle !== 'function') {
    return Number(el.scrollHeight || 0) > Number(el.clientHeight || 0) + 1
  }
  try {
    const style = window.getComputedStyle(el)
    const overflowY = String(style.overflowY || style.overflow || '')
    if (!/(auto|scroll|overlay)/i.test(overflowY)) return false
    return Number(el.scrollHeight || 0) > Number(el.clientHeight || 0) + 1
  } catch {
    return false
  }
}

/**
 * Resolve the single scroll container for the session chrome.
 * Prefers a page-level ancestor; never picks mushaf/modal scrollers.
 * Falls back to the window/document.
 *
 * @returns {{ type: 'window' | 'element', element: Element | null }}
 */
export function resolveSessionScrollContainer(
  target,
  {
    root = typeof document !== 'undefined' ? document : null,
    excludedSelectors = SESSION_SCROLL_EXCLUDED_SELECTORS,
  } = {}
) {
  if (!target || !root) {
    return { type: 'window', element: null }
  }

  let node = target.parentElement
  while (node && node !== root.documentElement && node !== root.body) {
    if (!isExcludedScrollContainer(node, excludedSelectors) && elementCanScroll(node)) {
      return { type: 'element', element: node }
    }
    node = node.parentElement
  }

  return { type: 'window', element: null }
}

/**
 * Prefer the session overview shell (title / range / actions); fall back to workspace main.
 *
 * @param {ParentNode | null | undefined} root
 */
export function resolveSessionScrollTarget(root = typeof document !== 'undefined' ? document : null) {
  if (!root || typeof root.querySelector !== 'function') return null
  return (
    root.querySelector('[data-session-scroll-target]')
    || root.querySelector('.workspace-shell')
    || root.querySelector('#memorisationWorkspaceMain')
    || root.querySelector('[ref="workspaceMain"]')
    || null
  )
}

/**
 * Build a stable session identity so reactive updates do not re-scroll.
 */
export function buildSessionScrollIdentity({
  reason = '',
  chapterId = 0,
  rangeStart = 0,
  rangeEnd = 0,
  sessionId = '',
  recommendationId = '',
} = {}) {
  return [
    String(reason || ''),
    String(sessionId || recommendationId || 'live'),
    String(Number(chapterId) || 0),
    String(Number(rangeStart) || 0),
    String(Number(rangeEnd) || 0),
  ].join('|')
}

/**
 * Gate: only explicit entry reasons, and never while blocked (reciting / auto-follow / etc.).
 */
export function shouldScrollSessionWorkspace({
  reason = '',
  blocked = false,
  identity = '',
  lastIdentity = '',
  lastScrolledAt = 0,
  now = Date.now(),
  dedupeMs = SESSION_SCROLL_DEDUPEms,
  allowedReasons = SESSION_ENTRY_SCROLL_REASONS,
} = {}) {
  if (blocked) {
    return { ok: false, reason: 'blocked' }
  }
  if (!allowedReasons.includes(reason)) {
    return { ok: false, reason: 'invalid_reason' }
  }
  if (identity && identity === lastIdentity && (now - Number(lastScrolledAt || 0)) < dedupeMs) {
    return { ok: false, reason: 'duplicate' }
  }
  return { ok: true, reason: 'allowed' }
}

/**
 * Compute the scrollTop needed so `target` sits just below the sticky nav.
 *
 * @returns {{ nextScrollTop: number, delta: number }}
 */
export function computeSessionScrollTop({
  containerType = 'window',
  containerScrollTop = 0,
  targetOffsetTop = 0,
  navOffset = DEFAULT_NAV_OFFSET_PX,
  padding = 8,
} = {}) {
  const desired = Math.max(0, Number(targetOffsetTop) - Number(navOffset) - Number(padding))
  if (containerType === 'window') {
    return {
      nextScrollTop: desired,
      delta: Math.abs(desired - Number(containerScrollTop)),
    }
  }
  // Element container: targetOffsetTop is relative to the container's content box.
  return {
    nextScrollTop: desired,
    delta: Math.abs(desired - Number(containerScrollTop)),
  }
}

/**
 * Apply scroll to exactly one container (window XOR element).
 *
 * @returns {{ scrolled: boolean, containerType: string, behavior: string, nextScrollTop: number }}
 */
export function applySessionWorkspaceScroll({
  container,
  target,
  navOffset = DEFAULT_NAV_OFFSET_PX,
  reduceMotion = false,
  minDeltaPx = 4,
  win = typeof window !== 'undefined' ? window : null,
  doc = typeof document !== 'undefined' ? document : null,
} = {}) {
  if (!target) {
    return { scrolled: false, containerType: 'none', behavior: 'auto', nextScrollTop: 0 }
  }

  const behavior = reduceMotion ? 'auto' : 'smooth'
  const resolved = container || resolveSessionScrollContainer(target, { root: doc })
  const offset = Math.max(0, Number(navOffset) || 0)

  if (resolved.type === 'element' && resolved.element) {
    const el = resolved.element
    const elRect = el.getBoundingClientRect()
    const targetRect = target.getBoundingClientRect()
    const targetOffsetTop = (targetRect.top - elRect.top) + Number(el.scrollTop || 0)
    const plan = computeSessionScrollTop({
      containerType: 'element',
      containerScrollTop: Number(el.scrollTop || 0),
      targetOffsetTop,
      navOffset: offset,
    })
    if (plan.delta < minDeltaPx) {
      return { scrolled: false, containerType: 'element', behavior, nextScrollTop: plan.nextScrollTop, reason: 'already_visible' }
    }
    try {
      if (typeof el.scrollTo === 'function') {
        el.scrollTo({ top: plan.nextScrollTop, left: 0, behavior })
      } else {
        el.scrollTop = plan.nextScrollTop
      }
    } catch {
      el.scrollTop = plan.nextScrollTop
    }
    return { scrolled: true, containerType: 'element', behavior, nextScrollTop: plan.nextScrollTop }
  }

  // Window / document scroll only — do not also touch mushaf viewports.
  const currentY = win
    ? (Number(win.scrollY) || Number(win.pageYOffset) || Number(doc?.documentElement?.scrollTop) || 0)
    : 0
  const absoluteTop = (() => {
    if (typeof target.getBoundingClientRect === 'function') {
      return currentY + target.getBoundingClientRect().top
    }
    return Number(target.offsetTop || 0)
  })()
  const plan = computeSessionScrollTop({
    containerType: 'window',
    containerScrollTop: currentY,
    targetOffsetTop: absoluteTop,
    navOffset: offset,
  })
  if (plan.delta < minDeltaPx) {
    return { scrolled: false, containerType: 'window', behavior, nextScrollTop: plan.nextScrollTop, reason: 'already_visible' }
  }

  try {
    if (win && typeof win.scrollTo === 'function') {
      win.scrollTo({ top: plan.nextScrollTop, left: 0, behavior })
    } else if (doc?.documentElement) {
      doc.documentElement.scrollTop = plan.nextScrollTop
    }
  } catch {
    if (win) win.scrollTo(0, plan.nextScrollTop)
  }

  return { scrolled: true, containerType: 'window', behavior, nextScrollTop: plan.nextScrollTop }
}

/**
 * Stateful controller: waits for render, dedupes, respects blockers & reduced motion.
 */
export function createSessionWorkspaceScrollController(options = {}) {
  const {
    getTarget = () => resolveSessionScrollTarget(),
    getNavOffset = () => measureStickyNavOffset(),
    isBlocked = () => false,
    prefersReducedMotion: prefersReducedMotionFn = prefersReducedMotion,
    schedule = (fn) => {
      if (typeof window !== 'undefined' && typeof window.requestAnimationFrame === 'function') {
        return window.requestAnimationFrame(() => {
          window.requestAnimationFrame(fn)
        })
      }
      return setTimeout(fn, 32)
    },
    now = () => Date.now(),
    dedupeMs = SESSION_SCROLL_DEDUPEms,
    applyScroll = applySessionWorkspaceScroll,
    win = typeof window !== 'undefined' ? window : null,
    doc = typeof document !== 'undefined' ? document : null,
  } = options

  let lastIdentity = ''
  let lastScrolledAt = 0
  let pendingToken = 0
  let disposed = false
  let previousScrollRestoration = null

  function guardBrowserRestoration() {
    if (!win?.history || !('scrollRestoration' in win.history)) return
    try {
      if (previousScrollRestoration == null) {
        previousScrollRestoration = win.history.scrollRestoration
      }
      win.history.scrollRestoration = 'manual'
    } catch {
      // ignore
    }
  }

  function restoreBrowserRestoration() {
    if (!win?.history || previousScrollRestoration == null) return
    try {
      win.history.scrollRestoration = previousScrollRestoration
    } catch {
      // ignore
    }
    previousScrollRestoration = null
  }

  /**
   * @param {{ reason: string, identity?: string, force?: boolean }} request
   */
  function requestScroll(request = {}) {
    if (disposed) return { ok: false, reason: 'disposed' }
    const reason = String(request.reason || '')
    const identity = String(request.identity || `${reason}|${now()}`)
    const force = !!request.force
    const gate = shouldScrollSessionWorkspace({
      reason,
      blocked: !force && !!isBlocked(),
      identity: force ? `${identity}|force|${now()}` : identity,
      lastIdentity,
      lastScrolledAt,
      now: now(),
      dedupeMs,
    })
    if (!gate.ok) return gate

    const token = ++pendingToken
    guardBrowserRestoration()

    schedule(() => {
      if (disposed || token !== pendingToken) return
      if (!force && isBlocked()) return

      const target = getTarget()
      if (!target) return

      const result = applyScroll({
        target,
        navOffset: getNavOffset(),
        reduceMotion: prefersReducedMotionFn(),
        win,
        doc,
      })

      if (result.scrolled || result.reason === 'already_visible') {
        lastIdentity = identity
        lastScrolledAt = now()
      }
    })

    return { ok: true, reason: 'scheduled', identity }
  }

  function dispose() {
    disposed = true
    pendingToken += 1
    restoreBrowserRestoration()
  }

  function getState() {
    return { lastIdentity, lastScrolledAt, pendingToken, disposed }
  }

  return {
    requestScroll,
    dispose,
    getState,
    guardBrowserRestoration,
    restoreBrowserRestoration,
  }
}
