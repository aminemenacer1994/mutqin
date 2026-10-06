/**
 * Ackee analytics for Mutqin (Laravel Mix / Vue, not Vite).
 *
 * Config arrives on window.mutqinAckee from Blade (see App\Support\Ackee).
 * Never send: name, email, audio, transcripts, auth/reset tokens, notes, Speechmatics payloads.
 * Failures are swallowed so Mutqin never depends on Ackee.
 */

export const ACKEE_EVENTS = Object.freeze({
  WAITING_LIST_SIGNUP_COMPLETED: 'waiting_list_signup_completed',
  REGISTER_COMPLETED: 'register_completed',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  MEMORISATION_SESSION_STARTED: 'memorisation_session_started',
  MEMORISATION_SESSION_COMPLETED: 'memorisation_session_completed',
  AI_RECITE_STARTED: 'ai_recite_started',
  AI_RECITE_COMPLETED: 'ai_recite_completed',
  FIND_AYAH_RESULT_SELECTED: 'find_ayah_result_selected',
  PROGRESS_DASHBOARD_VIEWED: 'progress_dashboard_viewed',
  PRICING_VIEWED: 'pricing_viewed',
  UPGRADE_CLICKED: 'upgrade_clicked',
})

const ALLOWED_EVENTS = new Set(Object.values(ACKEE_EVENTS))

const ONCE_PER_TAB = new Set([
  ACKEE_EVENTS.WAITING_LIST_SIGNUP_COMPLETED,
  ACKEE_EVENTS.REGISTER_COMPLETED,
  ACKEE_EVENTS.ONBOARDING_COMPLETED,
  ACKEE_EVENTS.PROGRESS_DASHBOARD_VIEWED,
  ACKEE_EVENTS.PRICING_VIEWED,
])

const CREATE_RECORD = `
  mutation createRecord($domainId: ID!, $input: CreateRecordInput!) {
    createRecord(domainId: $domainId, input: $input) {
      payload { id }
    }
  }
`

const CREATE_ACTION = `
  mutation createAction($eventId: ID!, $input: CreateActionInput!) {
    createAction(eventId: $eventId, input: $input) {
      payload { id }
    }
  }
`

const DEDUPE_MS = 1500

let started = false
let historyHooked = false
let lastPageKey = ''
let recordInFlight = false
let pendingHref = ''
let historyListener = () => {}
const recentEvents = new Map()
const onceMemory = new Set()

function readConfig(overrides = {}) {
  const raw = (typeof window !== 'undefined' && window.mutqinAckee) || {}
  return {
    enabled: Boolean(overrides.enabled ?? raw.enabled),
    server: String(overrides.server ?? raw.server ?? '').replace(/\/+$/, ''),
    domainId: String(overrides.domainId ?? raw.domainId ?? ''),
    eventId: String(overrides.eventId ?? raw.eventId ?? ''),
    allowLocalhost: Boolean(overrides.allowLocalhost ?? raw.allowLocalhost),
  }
}

export function isLocalHost(hostname = '') {
  const host = String(hostname || '').replace(/^\[|\]$/g, '').toLowerCase()
  if (host === '::1' || host.startsWith('::1')) return true
  return /^(localhost|127\.0\.0\.1|0\.0\.0\.0)(?::\d+)?$/.test(host)
}

function isAllowedAckeeServer(server = '') {
  const value = String(server || '')
  if (/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value)) return true
  return /^http:\/\/(localhost|127\.0\.0\.1|\[::1\])(?::\d+)?$/i.test(value)
}

function currentHostname() {
  if (typeof window === 'undefined') return ''
  try {
    return String(window.location.hostname || '')
  } catch {
    return ''
  }
}

function currentEnvironment() {
  if (typeof window === 'undefined') return ''
  return String(window.mutqinEnvironment || document.querySelector('meta[name="mutqin-environment"]')?.content || '')
}

export function isAckeeRuntimeEnabled(config = readConfig()) {
  if (!config.enabled || !config.server || !config.domainId) return false
  if (!isAllowedAckeeServer(config.server)) return false
  if (!/^[0-9a-f-]{36}$/i.test(config.domainId)) return false
  const host = currentHostname()
  if (isLocalHost(host) && !config.allowLocalhost) return false
  const env = currentEnvironment()
  if ((env === 'local' || env === 'testing') && !config.allowLocalhost) return false
  return true
}

export function sanitiseSiteLocation(href = '', origin = '') {
  try {
    const url = new URL(href, origin || (typeof window !== 'undefined' ? window.location.origin : 'https://app.mutqin.ai'))
    let path = url.pathname || '/'
    if (/^\/email\/verify(\/|$)/i.test(path)) path = '/email/verify'
    else if (/^\/reset-password(\/|$)/i.test(path)) path = '/reset-password'
    else if (/^\/password\/reset(\/|$)/i.test(path)) path = '/password/reset'
    else if (/^\/verify-email(\/|$)/i.test(path)) path = '/verify-email'
    return `${url.origin}${path}`
  } catch {
    return ''
  }
}

function pageKey(location = '') {
  try {
    const url = new URL(location)
    return `${url.origin}${url.pathname}`
  } catch {
    return location
  }
}

function onceStorageKey(eventName) {
  return `mutqin_ackee_once_${eventName}`
}

function hasFiredOnce(eventName) {
  if (onceMemory.has(eventName)) return true
  if (typeof window === 'undefined') return false
  try {
    return window.sessionStorage.getItem(onceStorageKey(eventName)) === '1'
  } catch {
    return onceMemory.has(eventName)
  }
}

function markFiredOnce(eventName) {
  onceMemory.add(eventName)
  if (typeof window === 'undefined') return
  try {
    window.sessionStorage.setItem(onceStorageKey(eventName), '1')
  } catch {
    /* private mode */
  }
}

function recentlySent(eventName) {
  const now = Date.now()
  for (const [key, seenAt] of recentEvents) {
    if (now - seenAt > DEDUPE_MS) recentEvents.delete(key)
  }
  if (recentEvents.has(eventName)) return true
  recentEvents.set(eventName, now)
  return false
}

async function graphql(server, query, variables) {
  try {
    const response = await fetch(`${server}/api`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({ query, variables }),
      credentials: 'omit',
      keepalive: true,
      mode: 'cors',
    })
    if (!response.ok) return null
    const payload = await response.json().catch(() => null)
    if (payload?.errors?.length) return null
    return payload?.data || null
  } catch {
    return null
  }
}

async function createPageRecord(config, href) {
  const siteLocation = sanitiseSiteLocation(href)
  if (!siteLocation) return
  const key = pageKey(siteLocation)
  if (key === lastPageKey) return
  if (recordInFlight) {
    pendingHref = href
    return
  }
  recordInFlight = true
  pendingHref = ''
  try {
    let siteReferrer = ''
    if (typeof document !== 'undefined' && document.referrer) {
      siteReferrer = sanitiseSiteLocation(document.referrer)
    }
    await graphql(config.server, CREATE_RECORD, {
      domainId: config.domainId,
      input: {
        siteLocation,
        ...(siteReferrer ? { siteReferrer } : {}),
      },
    })
    lastPageKey = key
  } finally {
    recordInFlight = false
    if (pendingHref) {
      const next = pendingHref
      pendingHref = ''
      void createPageRecord(config, next)
    }
  }
}

function currentHref() {
  if (typeof window === 'undefined') return ''
  try {
    return window.location.href
  } catch {
    return ''
  }
}

function hookHistory() {
  if (typeof window === 'undefined' || !window.history) return
  if (window.history.__mutqinAckeeHooked) {
    historyHooked = true
    return
  }
  historyHooked = true
  window.history.__mutqinAckeeHooked = true
  const wrap = (method) => {
    const original = window.history[method]
    if (typeof original !== 'function') return
    window.history[method] = function patchedHistory(...args) {
      const result = original.apply(this, args)
      try {
        historyListener()
      } catch {
        /* never break navigation */
      }
      return result
    }
  }
  wrap('pushState')
  wrap('replaceState')
  window.addEventListener('popstate', () => {
    try {
      historyListener()
    } catch {
      /* ignore */
    }
  })
}

/**
 * Start page-view tracking. Safe to call more than once.
 * Mutqin is Laravel + Vue (no Vue Router): full page loads plus History API
 * changes (e.g. Madani pages) are recorded as distinct views.
 */
export function initAckee(overrides = {}) {
  try {
    if (started) return
    const config = readConfig(overrides)
    if (!isAckeeRuntimeEnabled(config)) return
    started = true
    historyListener = () => {
      void createPageRecord(readConfig(overrides), currentHref())
    }
    void createPageRecord(config, currentHref())
    hookHistory()
  } catch {
    /* Ackee must never break Mutqin */
  }
}

export function trackEvent(eventName, { value = 1 } = {}) {
  try {
    const name = String(eventName || '')
    if (!ALLOWED_EVENTS.has(name)) return
    const config = readConfig()
    if (!isAckeeRuntimeEnabled(config) || !config.eventId) return
    if (!/^[0-9a-f-]{36}$/i.test(config.eventId)) return
    if (ONCE_PER_TAB.has(name) && hasFiredOnce(name)) return
    if (recentlySent(name)) return
    if (ONCE_PER_TAB.has(name)) markFiredOnce(name)
    void graphql(config.server, CREATE_ACTION, {
      eventId: config.eventId,
      input: {
        key: name,
        value: Number.isFinite(Number(value)) ? Number(value) : 1,
      },
    })
  } catch {
    /* Ackee must never break Mutqin */
  }
}

export function resetAckeeForTests() {
  started = false
  historyHooked = false
  lastPageKey = ''
  recordInFlight = false
  pendingHref = ''
  recentEvents.clear()
  onceMemory.clear()
}
