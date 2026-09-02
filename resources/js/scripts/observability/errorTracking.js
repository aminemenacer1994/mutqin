import {
  featureFromPath,
  fingerprintEvent,
  redactPayload,
  redactString,
  shouldReportHttpFailure,
} from './sanitizeErrorPayload.js'

const DEDUP_WINDOW_MS = 8000
const recentFingerprints = new Map()

function readMeta(name) {
  if (typeof document === 'undefined') return ''
  return document.querySelector(`meta[name="${name}"]`)?.content || ''
}

function currentRoute() {
  if (typeof window === 'undefined') return ''
  try {
    return `${window.location.pathname || ''}${window.location.search || ''}`.slice(0, 200)
  } catch (_) {
    return ''
  }
}

function currentRelease() {
  return readMeta('mutqin-release')
    || readMeta('mutqin-asset-build')
    || (typeof document !== 'undefined' ? document.documentElement?.dataset?.mutqinAssetBuild : '')
    || 'dev'
}

function currentEnvironment() {
  return readMeta('mutqin-environment') || 'production'
}

function safeUserId() {
  if (typeof window === 'undefined') return undefined
  const raw = window.mutqinUserId
  const id = Number(raw)
  return Number.isFinite(id) && id > 0 ? id : undefined
}

export function currentRequestId() {
  if (typeof window === 'undefined') return ''
  if (window.__mutqinRequestId) return window.__mutqinRequestId
  try {
    window.__mutqinRequestId = globalThis.crypto?.randomUUID?.()
      || `mutqin-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`
  } catch (_) {
    window.__mutqinRequestId = `mutqin-${Date.now()}`
  }
  return window.__mutqinRequestId
}

export function rememberRequestId(value) {
  const id = String(value || '').trim()
  if (!id || !/^[A-Za-z0-9._-]{8,80}$/.test(id)) return
  if (typeof window !== 'undefined') window.__mutqinRequestId = id
}

function seenRecently(fingerprint) {
  const now = Date.now()
  for (const [key, seenAt] of recentFingerprints) {
    if (now - seenAt > DEDUP_WINDOW_MS) recentFingerprints.delete(key)
  }
  if (recentFingerprints.has(fingerprint)) return true
  recentFingerprints.set(fingerprint, now)
  return false
}

function markReported(error) {
  if (error && typeof error === 'object') {
    try {
      error.__mutqinReported = true
    } catch (_) { /* sealed objects */ }
  }
}

function alreadyReported(error) {
  return !!(error && typeof error === 'object' && error.__mutqinReported)
}

function buildPayload(error, context = {}) {
  const name = redactString(error?.name || context.name || 'Error', 120)
  const message = redactString(error?.message || context.message || String(error || 'Error'), 300)
  const stack = redactString(error?.stack || context.stack || '', 1500)
  const route = redactString(context.route || currentRoute(), 200)
  const feature = redactString(context.feature || featureFromPath(route), 60)

  return redactPayload({
    name,
    message,
    stack,
    kind: context.kind || 'error',
    feature,
    route,
    release: currentRelease(),
    request_id: currentRequestId(),
    status: Number.isFinite(Number(context.status)) ? Number(context.status) : undefined,
    latency_ms: Number.isFinite(Number(context.latency_ms)) ? Number(context.latency_ms) : undefined,
    environment: currentEnvironment(),
    meta: context.meta && typeof context.meta === 'object' ? context.meta : undefined,
    user_id: safeUserId(),
  })
}

function postClientError(payload) {
  if (typeof window === 'undefined' || typeof fetch !== 'function') return
  const token = typeof document !== 'undefined'
    ? document.head?.querySelector('meta[name="csrf-token"]')?.content
    : ''

  fetch('/api/client-errors', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
      'X-Request-Id': payload.request_id || currentRequestId(),
      ...(token ? { 'X-CSRF-TOKEN': token } : {}),
    },
    body: JSON.stringify(payload),
  }).catch(() => { /* never recurse on ingest failure */ })
}

export function reportError(error, context = {}) {
  if (alreadyReported(error)) return null
  markReported(error)

  const payload = buildPayload(error, context)
  const fingerprint = fingerprintEvent(payload)
  if (seenRecently(fingerprint)) return null

  if (currentEnvironment() !== 'production') {
    try {
      console.error('[mutqin]', payload.kind || 'error', payload)
    } catch (_) { /* ignore */ }
  }

  postClientError(payload)
  return payload
}

export function captureHttpFailure(error, options = {}) {
  if (alreadyReported(error)) return null

  const status = Number(error?.response?.status || error?.status || 0)
  const url = String(error?.config?.url || error?.url || options.url || '')
  const aborted = !!(
    error?.code === 'ERR_CANCELED'
    || error?.name === 'CanceledError'
    || error?.name === 'AbortError'
    || error?.__CANCEL__
  )
  const offline = typeof navigator !== 'undefined' && navigator.onLine === false

  if (url.includes('/client-errors')) return null
  if (!shouldReportHttpFailure({ status, aborted, offline })) return null

  const startedAt = Number(error?.config?.metadata?.startedAt || options.startedAt || 0)
  const latency = startedAt ? Math.max(0, Math.round((
    (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startedAt
  ))) : options.latency_ms

  return reportError(error, {
    kind: status >= 500 ? 'api_error' : (status === 429 ? 'api_throttled' : 'api_network'),
    feature: options.feature || featureFromPath(url),
    status: status || undefined,
    latency_ms: Number.isFinite(Number(latency)) ? Number(latency) : undefined,
    meta: {
      method: redactString(error?.config?.method || options.method || '', 12),
    },
  })
}

export function attachHttpErrorTracking(httpClient, { feature } = {}) {
  if (!httpClient?.interceptors) return httpClient

  httpClient.interceptors.request.use((config) => {
    const next = config || {}
    next.metadata = { ...(next.metadata || {}), startedAt: (typeof performance !== 'undefined' ? performance.now() : Date.now()) }
    next.headers = next.headers || {}
    const requestId = currentRequestId()
    if (requestId && !next.headers['X-Request-Id']) next.headers['X-Request-Id'] = requestId
    return next
  })

  httpClient.interceptors.response.use(
    (response) => {
      rememberRequestId(response?.headers?.['x-request-id'] || response?.headers?.['X-Request-Id'])
      return response
    },
    (error) => {
      rememberRequestId(error?.response?.headers?.['x-request-id'] || error?.response?.headers?.['X-Request-Id'])
      captureHttpFailure(error, { feature })
      return Promise.reject(error)
    }
  )

  return httpClient
}

export function attachVueErrorHandler(app) {
  if (!app?.config) return
  const previous = app.config.errorHandler
  app.config.errorHandler = (error, instance, info) => {
    reportError(error, {
      kind: 'vue',
      feature: featureFromPath(currentRoute()),
      meta: { info: redactString(info, 80) },
    })
    if (typeof previous === 'function') previous(error, instance, info)
    else console.error('Mutqin Vue error:', error, info)
  }
}

export function installErrorTracking(app) {
  if (typeof window === 'undefined' || window.__mutqinErrorTrackingInstalled) return
  window.__mutqinErrorTrackingInstalled = true

  if (app) attachVueErrorHandler(app)

  window.addEventListener('error', (event) => {
    if (alreadyReported(event?.error)) return
    reportError(event?.error || event?.message, {
      kind: 'window.onerror',
      feature: featureFromPath(currentRoute()),
    })
  })

  window.addEventListener('unhandledrejection', (event) => {
    const reason = event?.reason
    if (alreadyReported(reason)) return
    reportError(reason, {
      kind: 'unhandledrejection',
      feature: featureFromPath(currentRoute()),
    })
  })
}

export function resetErrorTrackingForTests() {
  recentFingerprints.clear()
  if (typeof window !== 'undefined') {
    window.__mutqinErrorTrackingInstalled = false
    window.__mutqinRequestId = ''
  }
}
