/**
 * Browser online/offline helpers and safe classification of request failures.
 * Technical details stay in console logs; UI copy comes from i18n keys.
 */

export function isBrowserOffline() {
  if (typeof navigator === 'undefined') return false
  return navigator.onLine === false
}

export function isBrowserOnline() {
  return !isBrowserOffline()
}

export function isAbortError(error) {
  return !!(
    error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError'
    || error?.name === 'AbortError'
    || error?.__CANCEL__
  )
}

/**
 * True when the browser never got an HTTP response (connection drop, DNS, CORS
 * opaque failures, etc.). Excludes intentional aborts.
 */
export function isNetworkError(error) {
  if (!error || isAbortError(error)) return false
  if (error?.response) return false
  const code = String(error?.code || '')
  const message = String(error?.message || '')
  if (
    code === 'ERR_NETWORK'
    || code === 'ECONNABORTED'
    || code === 'ETIMEDOUT'
    || /network error|failed to fetch|load failed|timeout|offline/i.test(message)
  ) {
    return true
  }
  // Axios network failures typically have no response and a request object.
  return !!error?.request || code.startsWith('ERR_')
}

export function isServerError(error) {
  const status = Number(error?.response?.status || 0)
  return status >= 500 && status < 600
}

/**
 * @returns {'offline'|'network'|'failure'}
 */
export function classifyRequestFailure(error) {
  if (isBrowserOffline()) return 'offline'
  if (isNetworkError(error)) return 'offline'
  if (isServerError(error)) return 'failure'
  return 'failure'
}

/**
 * Strip stacks / HTTP / JSON noise from values that might leak into the UI.
 */
export function sanitizeUserFacingError(value, fallback = '') {
  const text = (() => {
    if (value == null) return ''
    if (typeof value === 'string') return value.trim()
    if (value instanceof Error) return String(value.message || '').trim()
    if (typeof value?.message === 'string') return value.message.trim()
    try {
      const asString = value?.toString?.()
      if (typeof asString === 'string' && asString && asString !== '[object Object]') {
        return asString.trim()
      }
    } catch (_) { /* ignore */ }
    return ''
  })()

  const safeFallback = String(fallback || '').trim()
  if (!text) return safeFallback
  if (
    text.length > 180
    || /stack|exception|traceback|sqlstate|etag|csrf|http\/|status code|econn|enotfound|timeout|undefined is not|cannot read/i.test(text)
    || /^[\w./:-]+\.(js|php|vue|ts)(:\d+)?/i.test(text)
    || /[{}\[\]]/.test(text)
  ) {
    return safeFallback || 'Something went wrong. Please try again.'
  }
  return text
}

/**
 * Subscribe to browser online/offline transitions.
 * @param {(online: boolean) => void} listener
 * @returns {() => void} unsubscribe
 */
export function subscribeNetworkStatus(listener) {
  if (typeof window === 'undefined' || typeof listener !== 'function') {
    return () => {}
  }

  const onOnline = () => listener(true)
  const onOffline = () => listener(false)
  window.addEventListener('online', onOnline)
  window.addEventListener('offline', onOffline)

  // Emit current state once so consumers can sync without a separate read.
  try {
    listener(isBrowserOnline())
  } catch (_) { /* ignore listener errors */ }

  return () => {
    window.removeEventListener('online', onOnline)
    window.removeEventListener('offline', onOffline)
  }
}

/**
 * Call `callback` the next time the browser reports online.
 * If already online, does nothing unless `{ immediate: true }`.
 * @returns {() => void} cancel
 */
export function onReconnect(callback, { immediate = false } = {}) {
  if (typeof callback !== 'function') return () => {}

  if (immediate && isBrowserOnline()) {
    try { callback() } catch (_) { /* ignore */ }
    return () => {}
  }

  if (typeof window === 'undefined') return () => {}

  let done = false
  const handler = () => {
    if (done) return
    done = true
    window.removeEventListener('online', handler)
    try { callback() } catch (_) { /* ignore */ }
  }
  window.addEventListener('online', handler)
  return () => {
    done = true
    window.removeEventListener('online', handler)
  }
}
