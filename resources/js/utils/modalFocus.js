export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

/** Reader scrollers whose position must survive a modal round trip. */
export const READING_SCROLL_POSITION_SELECTOR = [
  '[data-reading-scroll-position]',
  '.mushaf-viewport-scroll',
  '.mushaf-viewport',
  '.madani-qpc-viewport',
  '.qpc-madani-session-scroll',
  '.madani-qpc-workspace',
  '.verse-words',
].join(', ')

const returnReadingPositions = new WeakMap()

function scrollCoordinate(value, fallback = 0) {
  const number = Number(value)
  return Number.isFinite(number) ? number : fallback
}

function pageScrollPosition(win, doc) {
  return {
    left: scrollCoordinate(win?.scrollX, scrollCoordinate(win?.pageXOffset, scrollCoordinate(doc?.documentElement?.scrollLeft))),
    top: scrollCoordinate(win?.scrollY, scrollCoordinate(win?.pageYOffset, scrollCoordinate(doc?.documentElement?.scrollTop))),
  }
}

/**
 * Save just the reader's page and nested scroll positions. Element references
 * deliberately keep this exact while a teleported dialog is open.
 */
export function captureReadingPosition({
  doc = typeof document !== 'undefined' ? document : null,
  win = typeof window !== 'undefined' ? window : null,
} = {}) {
  const workspace = doc?.getElementById?.('memorisationWorkspaceMain')
    || doc?.querySelector?.('[data-tour="workspace-main"]')
    || null
  const elements = workspace?.querySelectorAll
    ? Array.from(workspace.querySelectorAll(READING_SCROLL_POSITION_SELECTOR))
    : []

  return {
    window: pageScrollPosition(win, doc),
    elements: elements.map((element) => ({
      element,
      top: scrollCoordinate(element?.scrollTop),
      left: scrollCoordinate(element?.scrollLeft),
    })),
  }
}

function applyReadingPosition(snapshot, {
  doc = typeof document !== 'undefined' ? document : null,
  win = typeof window !== 'undefined' ? window : null,
} = {}) {
  if (!snapshot) return false
  const page = snapshot.window || { top: 0, left: 0 }
  try {
    if (win?.scrollTo) {
      win.scrollTo({ top: scrollCoordinate(page.top), left: scrollCoordinate(page.left), behavior: 'auto' })
    } else if (doc?.documentElement) {
      doc.documentElement.scrollTop = scrollCoordinate(page.top)
      doc.documentElement.scrollLeft = scrollCoordinate(page.left)
    }
  } catch (_) {
    try { win?.scrollTo?.(scrollCoordinate(page.left), scrollCoordinate(page.top)) } catch (__) { /* ignore */ }
  }

  ;(Array.isArray(snapshot.elements) ? snapshot.elements : []).forEach(({ element, top, left }) => {
    if (!element || element.isConnected === false) return
    try {
      element.scrollTop = scrollCoordinate(top)
      element.scrollLeft = scrollCoordinate(left)
    } catch (_) { /* detached reader surface */ }
  })
  return true
}

/**
 * Restore immediately and after modal/body-lock teardown. This avoids a focus
 * return or a Teleport unmount moving the learner to a neighbouring ayah.
 */
export function restoreReadingPosition(snapshot, options = {}) {
  if (!snapshot) return false
  const doc = options.doc ?? (typeof document !== 'undefined' ? document : null)
  const win = options.win ?? (typeof window !== 'undefined' ? window : null)
  const apply = () => applyReadingPosition(snapshot, { doc, win })
  apply()
  const schedule = typeof options.schedule === 'function'
    ? options.schedule
    : (callback) => {
      if (typeof win?.requestAnimationFrame === 'function') return win.requestAnimationFrame(callback)
      return setTimeout(callback, 16)
    }
  schedule(() => schedule(apply))
  return true
}

function isVisibleFocusable(el) {
  if (!el || typeof el !== 'object') return false
  if (typeof HTMLElement !== 'undefined' && !(el instanceof HTMLElement)) return false
  if (el.hasAttribute?.('disabled') || el.getAttribute?.('aria-hidden') === 'true') return false
  if (el.tabIndex < 0) return false
  if (typeof window === 'undefined') return true
  const style = window.getComputedStyle(el)
  if (style.visibility === 'hidden' || style.display === 'none') return false
  return true
}

export function getFocusableElements(root) {
  if (!root || typeof root.querySelectorAll !== 'function') return []
  return Array.from(root.querySelectorAll(FOCUSABLE_SELECTOR)).filter(isVisibleFocusable)
}

export function captureReturnFocus(container = null) {
  if (typeof document === 'undefined') return null
  const active = document.activeElement
  if (!(active instanceof HTMLElement)) return null
  if (container?.contains?.(active)) return null
  returnReadingPositions.set(active, captureReadingPosition())
  return active
}

export function restoreReturnFocus(target) {
  const position = target ? returnReadingPositions.get(target) : null
  if (target) returnReadingPositions.delete(target)
  if (target && typeof target.focus === 'function' && (typeof document === 'undefined' || document.contains(target))) {
    try {
      target.focus({ preventScroll: true })
    } catch (_) {
      try { target.focus() } catch (__) { /* ignore */ }
    }
  }
  restoreReadingPosition(position)
}

export function focusInitialElement(root, titleSelector = '[id*="Title"], [id*="title"], h1, h2') {
  if (!root) return
  const title = root.querySelector?.(titleSelector)
  if (title instanceof HTMLElement && typeof title.focus === 'function') {
    title.focus({ preventScroll: true })
    return
  }
  const first = getFocusableElements(root)[0]
  if (first) first.focus({ preventScroll: true })
}

export function trapFocusInContainer(event, container) {
  if (!container || event.key !== 'Tab') return false
  const focusable = getFocusableElements(container)
  if (!focusable.length) {
    event.preventDefault()
    focusInitialElement(container)
    return true
  }
  const first = focusable[0]
  const last = focusable[focusable.length - 1]
  const active = typeof document !== 'undefined' ? document.activeElement : null
  if (event.shiftKey) {
    if (active === first || !container.contains(active)) {
      event.preventDefault()
      last.focus()
      return true
    }
  } else if (active === last || !container.contains(active)) {
    event.preventDefault()
    first.focus()
    return true
  }
  return false
}

export function handleModalKeydown(event, { container, onEscape, open = true } = {}) {
  if (!open) return false
  if (event.key === 'Escape') {
    if (typeof onEscape === 'function') {
      event.stopPropagation()
      event.preventDefault()
      onEscape()
      return true
    }
    return false
  }
  return trapFocusInContainer(event, container)
}
