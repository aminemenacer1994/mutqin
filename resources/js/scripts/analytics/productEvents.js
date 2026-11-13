/**
 * Product analytics for acquisition, activation and retention.
 *
 * GA4 (existing gtag.js) and PostHog EU receive these events. Meta Pixel stays
 * on the existing opt-in bridge. There is no Firebase Analytics SDK and no
 * Vue Router. PostHog page views use the History API hook below.
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

import { capturePostHogProductEvent } from './posthog.js'

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
  LANDING_PAGE_VIEWED: 'landing_page_viewed',
  SIGNUP_STARTED: 'signup_started',
  ONBOARDING_STARTED: 'onboarding_started',
  ONBOARDING_STEP_VIEWED: 'onboarding_step_viewed',
  ONBOARDING_STEP_COMPLETED: 'onboarding_step_completed',
  ONBOARDING_ABANDONED: 'onboarding_abandoned',
  ONBOARDING_COMPLETED: 'onboarding_completed',
  PROGRESSIVE_HIDING_USED: 'progressive_hiding_used',
  AI_RECITE_STARTED: 'ai_recite_started',
  REFERRAL_LINK_OPENED: 'referral_link_opened',
  TUTORIAL_PLAYED: 'tutorial_played',
  TUTORIAL_COMPLETED: 'tutorial_completed',
  DAILY_MUTQIN_STARTED: 'daily_mutqin_started',
  DAILY_MUTQIN_STEP_VIEWED: 'daily_mutqin_step_viewed',
  DAILY_MUTQIN_COMPLETED: 'daily_mutqin_completed',
  ACHIEVEMENT_VIEWED: 'achievement_viewed',
  ACHIEVEMENT_PROGRESS_VIEWED: 'achievement_progress_viewed',
})

const ALLOWED_EVENTS = new Set(Object.values(PRODUCT_EVENTS))
const SESSION_TYPES = new Set(['new', 'revision', 'sample', 'planner'])
const LEARNING_MODES = new Set(['auto', 'manual', 'follow', 'beginner', 'advanced', 'planner'])
const METHODS = new Set(['email', 'google', 'demo'])
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign']
const REFERRAL_KEY = 'referral_code'
const ANON_KEY = 'mutqin_anon_id'

/** Browser events that are real actions. Account and session completion stay on the server. */
const CLIENT_INGEST = new Set([
  PRODUCT_EVENTS.LANDING_PAGE_VIEWED,
  PRODUCT_EVENTS.SIGNUP_STARTED,
  PRODUCT_EVENTS.ONBOARDING_STARTED,
  PRODUCT_EVENTS.ONBOARDING_STEP_VIEWED,
  PRODUCT_EVENTS.ONBOARDING_STEP_COMPLETED,
  PRODUCT_EVENTS.ONBOARDING_ABANDONED,
  PRODUCT_EVENTS.ONBOARDING_COMPLETED,
  PRODUCT_EVENTS.PROGRESSIVE_HIDING_USED,
  PRODUCT_EVENTS.AI_RECITE_STARTED,
  PRODUCT_EVENTS.REFERRAL_LINK_OPENED,
  PRODUCT_EVENTS.TUTORIAL_PLAYED,
  PRODUCT_EVENTS.TUTORIAL_COMPLETED,
  PRODUCT_EVENTS.DAILY_MUTQIN_STARTED,
  PRODUCT_EVENTS.DAILY_MUTQIN_STEP_VIEWED,
  PRODUCT_EVENTS.DAILY_MUTQIN_COMPLETED,
  PRODUCT_EVENTS.ACHIEVEMENT_VIEWED,
  PRODUCT_EVENTS.ACHIEVEMENT_PROGRESS_VIEWED,
])

const INGEST_ALIAS = Object.freeze({
  onboarding_complete: PRODUCT_EVENTS.ONBOARDING_COMPLETED,
  ai_recitation_started: PRODUCT_EVENTS.AI_RECITE_STARTED,
})

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
  if (!next[REFERRAL_KEY]) {
    const referral = safeToken(params.get('ref') || params.get('referral_code'))
    if (referral) {
      next[REFERRAL_KEY] = referral
      changed = true
    }
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
  const referral = safeToken(stored[REFERRAL_KEY])
  if (referral) safe[REFERRAL_KEY] = referral
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
  const feature = safeToken(params.feature_id, 40)
  if (feature && /^[a-z0-9-]{1,40}$/.test(feature)) safe.feature_id = feature
  const video = String(params.video_id || '')
  if (/^[A-Za-z0-9_-]{11}$/.test(video)) safe.video_id = video
  const referral = safeToken(params.referral_code, 40)
  if (referral) safe.referral_code = referral
  for (const idKey of ['session_id', 'recommendation_id', 'feedback_id']) {
    const id = Number(params[idKey])
    if (Number.isInteger(id) && id > 0) safe[idKey] = id
  }
  const stage = String(params.stage || '')
  if (stage === 'ended_early' || stage === 'abandoned' || stage === 'discarded') safe.stage = stage
  const achievementId = String(params.achievement_id || '')
  if (/^[a-z][a-z0-9_]{1,62}$/.test(achievementId)) safe.achievement_id = achievementId
  const achievementCategory = String(params.achievement_category || '')
  if (/^[a-z][a-z0-9_]{1,40}$/.test(achievementCategory)) safe.achievement_category = achievementCategory
  const progressPct = Number(params.progress_percentage)
  if (Number.isFinite(progressPct) && progressPct >= 0 && progressPct <= 100) {
    safe.progress_percentage = Math.round(progressPct)
  }
  const unlockSource = String(params.unlock_source || '')
  if (/^[a-z][a-z0-9_]{1,40}$/.test(unlockSource)) safe.unlock_source = unlockSource
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

function anonymousId() {
  const store = storage()
  if (!store) return ''
  try {
    const existing = String(store.getItem(ANON_KEY) || '')
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(existing)) {
      return existing.toLowerCase()
    }
    const id = (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function')
      ? crypto.randomUUID()
      : ''
    if (!id) return ''
    store.setItem(ANON_KEY, id)
    return id
  } catch {
    return ''
  }
}

function postClientEvent(eventName, params, onceKey) {
  const canonical = INGEST_ALIAS[eventName] || eventName
  if (!CLIENT_INGEST.has(canonical)) return false
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return false
  const safe = sanitiseProductParams(params)
  const acquisition = getAcquisitionAttribution()
  const anon = anonymousId()
  const idempotency = String(onceKey || `${canonical}:${anon || 'once'}`)
    .replace(/\s+/g, '_')
    .slice(0, 80)
  if (!/^[A-Za-z0-9:._-]+$/.test(idempotency)) return false
  const headers = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    if (csrf) headers['X-CSRF-TOKEN'] = csrf
  } catch {
    /* registration still proceeds */
  }
  window.fetch('/api/product-events', {
    method: 'POST',
    credentials: 'same-origin',
    headers,
    keepalive: true,
    body: JSON.stringify({
      event: canonical,
      anonymous_id: anon || undefined,
      idempotency_key: idempotency,
      utm_source: acquisition.utm_source,
      utm_medium: acquisition.utm_medium,
      utm_campaign: acquisition.utm_campaign,
      referral_code: safe.referral_code || acquisition.referral_code,
      properties: safe,
    }),
  }).catch(() => {})
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
    const posted = postClientEvent(eventName, params, onceKey)
    try {
      capturePostHogProductEvent(eventName, params, { onceKey })
    } catch {
      /* PostHog must not change the GA4 result */
    }
    if ((sent || posted) && onceKey) markSent(eventName, onceKey)
    return sent || posted
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
  if (path === '/admin' || path.startsWith('/admin/')) return
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
 * One GA4 page_view and one PostHog $pageview per real pathname change after
 * the initial load. There is no Vue Router; this History API hook is the
 * navigation integration. PostHog's own pageview capture stays off so the
 * change is not counted twice. The GA tag's config call already recorded
 * the first GA4 view. PostHog records that first view itself.
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

export function trackLandingAndSignupSurface() {
  try {
    const path = currentPath()
    if (path === '/') {
      trackProductEvent(PRODUCT_EVENTS.LANDING_PAGE_VIEWED, {}, { onceKey: 'landing' })
    }
    if (path === '/register') {
      trackProductEvent(PRODUCT_EVENTS.SIGNUP_STARTED, {}, { onceKey: 'signup' })
    }
    const acquisition = getAcquisitionAttribution()
    let params
    try {
      params = new URLSearchParams(window.location.search || '')
    } catch {
      params = new URLSearchParams()
    }
    const medium = safeToken(params.get('utm_medium'))
    const source = safeToken(params.get('utm_source'))
    const referral = acquisition.referral_code || ''
    if (referral || medium === 'referral' || source === 'learner') {
      trackProductEvent(PRODUCT_EVENTS.REFERRAL_LINK_OPENED, {
        referral_code: referral,
      }, { onceKey: `ref:${referral || source || medium || 'open'}` })
    }
  } catch {
    /* never block the page */
  }
}

export function resetProductAnalyticsForTests() {
  onceMemory.clear()
  pageHooked = false
  lastPagePath = ''
  consentBound = false
}
