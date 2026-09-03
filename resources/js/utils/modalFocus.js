export const FOCUSABLE_SELECTOR = [
  'a[href]',
  'button:not([disabled])',
  'textarea:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  '[tabindex]:not([tabindex="-1"])',
].join(', ')

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
  return active
}

export function restoreReturnFocus(target) {
  if (!target || typeof target.focus !== 'function') return
  if (typeof document !== 'undefined' && !document.contains(target)) return
  try {
    target.focus({ preventScroll: true })
  } catch (_) {
    try { target.focus() } catch (__) { /* ignore */ }
  }
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
  } else if (active === last) {
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
