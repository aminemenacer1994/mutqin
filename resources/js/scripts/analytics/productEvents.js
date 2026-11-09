/**
 * Product analytics for acquisition, activation and retention.
 *
 * GA4 (existing gtag.js) receives these events. Meta Pixel stays on the
 * existing opt-in bridge. There is no Firebase Analytics SDK and no Vue Router.
 *
 * Never send audio, transcripts, names, emails, or other personal data.
 * Failures are swallowed so measurement cannot break a learner action.
 *
 * Mark these as GA4 key events (Admin → Events → Mark as key event):
 * sign_up, login, memorisation_started, memorisation_completed,
 * revision_started, revision_completed, ai_recitation_started,
 * ai_recitation_completed, session_resumed.
 * Do not mark page_view, session_abandoned, or onboarding_complete.
 */

export const ACQUISITION_KEY = 'mutqin_acq_attr'

export const PRODUCT_EVENTS = Object.freeze({
  SIGN_UP: 'sign_up',
  LOGIN: 'login',
  ONBOARDING_COMPLETE: 'onboarding_complete',
  SESSION_STARTED: 'session_started',
  MEMORISATION_STARTED: 'memorisation_started',
  SESSION_COMPLETED: 'session_completed',
  MEMORISATION_COMPLETED: 'memorisation_completed',
  SESSION_ABANDONED: 'session_abandoned',
  REVISION_STARTED: 'revision_started',
  REVISION_COMPLETED: 'revision_completed',
  SESSION_RESUMED: 'session_resumed',
  RECITATION_STARTED: 'recitation_started',
  AI_RECITATION_STARTED: 'ai_recitation_started',
  AI_ASSESSMENT_COMPLETED: 'ai_assessment_completed',
  AI_RECITATION_COMPLETED: 'ai_recitation_completed',
  PAGE_VIEW: 'page_view',
})

const ALLOWED_EVENTS = new Set(Object.values(PRODUCT_EVENTS))
const SESSION_TYPES = new Set(['new', 'revision', 'sample', 'planner'])
const LEARNING_MODES = new Set(['auto', 'manual', 'follow', 'beginner', 'advanced', 'planner'])
const METHODS = new Set(['email', 'google', 'demo'])
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign']

const onceMemory = new Set()
let pageHooked = false
let lastPagePath = ''
let consentBound = false

function storage() {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

/**
 * GA4 measurement stays on unless the visitor has refused marketing/analytics
 * or the browser sends Global Privacy Control. An unset choice matches the
 * existing tag, which loads without a consent banner. Meta still requires
 * an explicit grant via hasMarketingConsent().
 */
export function analyticsMeasurementAllowed() {
  if (typeof window === 'undefined') return false
  if (typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true) return false
  if (window.mutqinMarketingConsent === false) return false
  return true
}

export function clearAcquisitionAttribution() {
  try {
    storage()?.removeItem(ACQUISITION_KEY)
  } catch {
    /* private mode */
  }
}

function readAcquisition() {
  const store = storage()
  if (!store) return {}
  try {
    const parsed = JSON.parse(store.getItem(ACQUISITION_KEY) || 'null')
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function safeToken(value, max = 40) {
  const text = String(value || '').trim()
  if (!text || text.length > max) return ''
  if (/[@\u0600-\u06FF]/.test(text)) return ''
  if (!/^[\p{L}\p{N} _.,~+\-]+$/u.test(text)) return ''
  return text
}

function sanitisePath(pathname = '') {
  const path = String(pathname || '/').split('?')[0].split('#')[0] || '/'
  if (/^\/email\/verify(\/|$)/i.test(path)) return '/email/verify'
  if (/^\/reset-password(\/|$)/i.test(path)) return '/reset-password'
  if (/^\/password\/reset(\/|$)/i.test(path)) return '/password/reset'
  if (/^\/verify-email(\/|$)/i.test(path)) return '/verify-email'
  if (path.length > 120 || /@/.test(path)) return '/'
  return path.startsWith('/') ? path : `/${path}`
}

/**
 * First-touch campaign labels for this tab. Not personal data: no fbclid,
 * no full referrer, no account fields. Cleared when measurement is refused.
 */
export function captureAcquisitionAttribution() {
  if (typeof window === 'undefined') return getAcquisitionAttribution()
  bindConsent()
  if (!analyticsMeasurementAllowed()) {
    clearAcquisitionAttribution()
    return {}
  }
  let params
  try {
    params = new URLSearchParams(window.location.search || '')
  } catch {
    return getAcquisitionAttribution()
  }
  const prev = readAcquisition()
  const next = { ...prev }
  let changed = false
  for (const key of UTM_KEYS) {
    if (next[key]) continue
    const value = safeToken(params.get(key))
    if (!value) continue
    next[key] = value
    changed = true
  }
  if (changed) {
    try {
      storage()?.setItem(ACQUISITION_KEY, JSON.stringify(next))
    } catch {
      /* storage is optional */
    }
  }
  return next
}

export function getAcquisitionAttribution() {
  if (!analyticsMeasurementAllowed()) return {}
  const stored = readAcquisition()
  const safe = {}
  for (const key of UTM_KEYS) {
    const value = safeToken(stored[key])
    if (value) safe[key] = value
  }
  return safe
}

function onceStorageKey(eventName, onceKey) {
  return `mutqin_evt_${eventName}_${String(onceKey).slice(0, 80)}`
}

function alreadySent(eventName, onceKey) {
  if (!onceKey) return false
  const memoryKey = `${eventName}:${onceKey}`
  if (onceMemory.has(memoryKey)) return true
  try {
    return storage()?.getItem(onceStorageKey(eventName, onceKey)) === '1'
  } catch {
    return false
  }
}

function markSent(eventName, onceKey) {
  if (!onceKey) return
  onceMemory.add(`${eventName}:${onceKey}`)
  try {
    storage()?.setItem(onceStorageKey(eventName, onceKey), '1')
  } catch {
    /* private mode */
  }
}

export function sanitiseProductParams(params = {}) {
  const safe = {}
  const sessionType = String(params.session_type || '')
  if (SESSION_TYPES.has(sessionType)) safe.session_type = sessionType
  const learningMode = String(params.learning_mode || '')
  if (LEARNING_MODES.has(learningMode)) safe.learning_mode = learningMode
  const method = String(params.method || '')
  if (METHODS.has(method)) safe.method = method
  const surah = Number(params.surah_id)
  if (Number.isInteger(surah) && surah >= 1 && surah <= 114) safe.surah_id = surah
  const duration = Number(params.duration_seconds)
  if (Number.isFinite(duration) && duration >= 0 && duration <= 86400) {
    safe.duration_seconds = Math.round(duration)
  }
  const pagePath = params.page_path ? sanitisePath(params.page_path) : ''
  if (pagePath) safe.page_path = pagePath
  const location = safePageLocation(params.page_location)
  if (location) safe.page_location = location
  const tool = safeToken(params.tool, 40)
  if (tool) safe.tool = tool
  return safe
}

function safePageLocation(value) {
  const text = String(value || '')
  if (!text || text.length > 180 || /[@?#]/.test(text)) return ''
  if (!/^https:\/\/[a-z0-9.-]+(?::\d+)?\/[a-z0-9/_-]{0,120}$/i.test(text)) return ''
  return text
}

export function contextFromWorkspace(source = {}) {
  let sessionType = 'new'
  if (source.sample) sessionType = 'sample'
  else if (source.sessionMode === 'revision') sessionType = 'revision'
  else if (source.currentMode === 'planner') sessionType = 'planner'
  const play = String(source.playMode || '')
  const learningMode = LEARNING_MODES.has(play) ? play : String(source.currentMode || '')
  return sanitiseProductParams({
    session_type: sessionType,
    learning_mode: learningMode,
    surah_id: source.surahId,
    duration_seconds: source.durationSeconds,
  })
}

function sendGtag(eventName, params) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  const payload = {
    ...getAcquisitionAttribution(),
    ...sanitiseProductParams(params),
  }
  window.gtag('event', eventName, payload)
  return true
}

/**
 * Send one allow-listed GA4 event. Pass onceKey to guarantee a single send
 * for that successful action in this tab. Omit it only for page views, which
 * are deduped by path instead.
 */
export function trackProductEvent(eventName, params = {}, { onceKey = '' } = {}) {
  try {
    if (!ALLOWED_EVENTS.has(eventName)) return false
    bindConsent()
    if (!analyticsMeasurementAllowed()) return false
    if (onceKey && alreadySent(eventName, onceKey)) return false
    const sent = sendGtag(eventName, params)
    if (sent && onceKey) markSent(eventName, onceKey)
    return sent
  } catch {
    return false
  }
}

export function trackLoginFromFlash() {
  if (typeof window === 'undefined' || !window.mutqinJustLoggedInFlash) return false
  const onceKey = safeToken(window.mutqinLoginEventId, 64) || 'login'
  const method = String(window.mutqinLoginMethod || '').toLowerCase()
  return trackProductEvent(PRODUCT_EVENTS.LOGIN, {
    method: METHODS.has(method) ? method : undefined,
  }, { onceKey })
}

function currentPath() {
  try {
    return sanitisePath(window.location.pathname)
  } catch {
    return '/'
  }
}

function sendPageView(path) {
  if (!path || path === lastPagePath) return
  lastPagePath = path
  let pageLocation = path
  try {
    pageLocation = `${window.location.origin}${path}`
  } catch {
    pageLocation = path
  }
  trackProductEvent(PRODUCT_EVENTS.PAGE_VIEW, {
    page_path: path,
    page_location: pageLocation,
  })
}

function onSpaNavigation() {
  try {
    sendPageView(currentPath())
  } catch {
    /* never interrupt navigation */
  }
}

/**
 * One GA4 page_view per real pathname change after the initial load.
 * The tag's config call already recorded the first view.
 */
export function initSpaPageViews() {
  if (typeof window === 'undefined' || pageHooked || !window.history) return
  pageHooked = true
  lastPagePath = currentPath()
  bindConsent()
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history[method]
    if (typeof original !== 'function' || original.__mutqinProductPageView) continue
    const wrapped = function productPageViewHistory(...args) {
      const result = original.apply(this, args)
      onSpaNavigation()
      return result
    }
    wrapped.__mutqinProductPageView = true
    window.history[method] = wrapped
  }
  window.addEventListener('popstate', onSpaNavigation)
}

function bindConsent() {
  if (consentBound || typeof window === 'undefined') return
  if (typeof window.addEventListener !== 'function') return
  consentBound = true
  try {
    window.addEventListener('mutqin:marketing-consent', () => {
      if (!analyticsMeasurementAllowed()) clearAcquisitionAttribution()
    })
  } catch {
    consentBound = false
  }
}

export function resetProductAnalyticsForTests() {
  onceMemory.clear()
  pageHooked = false
  lastPagePath = ''
  consentBound = false
}
