/**
 * Keep first-touch campaign labels on public registration links.
 *
 * Instagram and TikTok in-app browsers often isolate or drop sessionStorage
 * between taps. Copying utm_source / utm_medium / utm_campaign onto /register
 * hrefs is the fallback. fbclid and other click ids stay out of the URL.
 *
 * After /register has stored those labels, the visible query is cleaned so the
 * form does not advertise tracking parameters. This does not send analytics
 * events — existing GA4 / Meta helpers remain the only conversion trackers.
 */

import {
  analyticsMeasurementAllowed,
  captureAcquisitionAttribution,
  getAcquisitionAttribution,
} from './productEvents.js'

export const REGISTER_UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign']

const TOKEN_RE = /^[\p{L}\p{N} _.,~+\-]+$/u
const IN_APP_UA_RE = /Instagram|FBAN|FBAV|FB_IAB|FBIOS|TikTok|BytedanceWebview|musical_ly|Twitter/i

function safeToken(value, max = 40) {
  const text = String(value || '').trim()
  if (!text || text.length > max) return ''
  if (/[@\u0600-\u06FF]/.test(text)) return ''
  if (!TOKEN_RE.test(text)) return ''
  return text
}

function currentSearchParams() {
  if (typeof window === 'undefined') return new URLSearchParams()
  try {
    return new URLSearchParams(window.location.search || '')
  } catch {
    return new URLSearchParams()
  }
}

function utmsFromSearch(params) {
  const out = {}
  for (const key of REGISTER_UTM_KEYS) {
    const value = safeToken(params.get(key))
    if (value) out[key] = value
  }
  return out
}

/**
 * First-touch labels for this tab: live query, then stored acquisition.
 * Never includes fbclid or the full referrer.
 */
export function getRegistrationUtms() {
  const fromUrl = utmsFromSearch(currentSearchParams())
  const stored = analyticsMeasurementAllowed() ? getAcquisitionAttribution() : {}
  const out = {}
  for (const key of REGISTER_UTM_KEYS) {
    const value = safeToken(fromUrl[key] || stored[key])
    if (value) out[key] = value
  }
  return out
}

function pageOrigin() {
  try {
    if (typeof window !== 'undefined' && window.location?.origin) {
      return String(window.location.origin)
    }
  } catch {
    /* ignore */
  }
  return ''
}

function hostKey(hostname) {
  return String(hostname || '').replace(/^www\./i, '').toLowerCase()
}

/**
 * Relative /register path (+ query/hash) for same-app register links.
 * Laravel `route('register')` often emits an absolute URL; keep those usable
 * without putting fbclid onto the href.
 */
export function registerPathFromHref(href) {
  const raw = String(href || '').trim()
  if (!raw || raw.startsWith('#') || /^javascript:/i.test(raw)) return null
  if (raw.startsWith('/register')) return raw
  try {
    const origin = pageOrigin()
    const url = origin ? new URL(raw, origin) : new URL(raw)
    if (url.pathname !== '/register') return null
    if (origin) {
      const here = new URL(origin)
      if (url.origin !== here.origin && hostKey(url.hostname) !== hostKey(here.hostname)) {
        return null
      }
    }
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return null
  }
}

function splitPathQuery(path) {
  const raw = String(registerPathFromHref(path) || path || '/register')
  const hashIndex = raw.indexOf('#')
  const withoutHash = hashIndex >= 0 ? raw.slice(0, hashIndex) : raw
  const hash = hashIndex >= 0 ? raw.slice(hashIndex) : ''
  const qIndex = withoutHash.indexOf('?')
  return {
    pathname: qIndex >= 0 ? withoutHash.slice(0, qIndex) : withoutHash,
    search: qIndex >= 0 ? withoutHash.slice(qIndex + 1) : '',
    hash,
  }
}

export function withRegistrationQuery(path = '/register') {
  const { pathname, search, hash } = splitPathQuery(path)
  const params = new URLSearchParams(search)
  const utms = getRegistrationUtms()
  for (const key of REGISTER_UTM_KEYS) {
    if (params.get(key)) continue
    if (utms[key]) params.set(key, utms[key])
  }
  params.delete('fbclid')
  const query = params.toString()
  return `${pathname || '/register'}${query ? `?${query}` : ''}${hash}`
}

export function publicRegisterHref(extraQuery = {}) {
  const params = new URLSearchParams()
  Object.entries(extraQuery).forEach(([key, value]) => {
    if (value) params.set(key, String(value))
  })
  const suffix = params.toString()
  return withRegistrationQuery(suffix ? `/register?${suffix}` : '/register')
}

export function isInAppBrowser(userAgent = typeof navigator === 'undefined' ? '' : navigator.userAgent) {
  return IN_APP_UA_RE.test(String(userAgent || ''))
}

function storedUtmsComplete(utms) {
  const live = utmsFromSearch(currentSearchParams())
  return REGISTER_UTM_KEYS.every((key) => !live[key] || utms[key] === live[key])
}

/**
 * Hide campaign labels on /register after they are stored for GA4.
 * Leave them visible when storage failed so the sign_up hit can still read them.
 */
export function concealTrackingQuery({ path = '', historyApi } = {}) {
  if (typeof window === 'undefined') return false
  const pagePath = path || window.location.pathname || ''
  if (pagePath !== '/register' && pagePath !== '/login') return false

  const live = utmsFromSearch(currentSearchParams())
  if (!Object.keys(live).length && !currentSearchParams().get('fbclid')) return false

  captureAcquisitionAttribution()
  const stored = analyticsMeasurementAllowed() ? getAcquisitionAttribution() : {}
  if (Object.keys(live).length && !storedUtmsComplete(stored)) return false

  const next = new URLSearchParams(window.location.search || '')
  let changed = false
  for (const key of [...REGISTER_UTM_KEYS, 'fbclid', 'utm_content', 'utm_term']) {
    if (next.has(key)) {
      next.delete(key)
      changed = true
    }
  }
  if (!changed) return false

  const query = next.toString()
  const hash = window.location.hash || ''
  const url = `${pagePath}${query ? `?${query}` : ''}${hash}`
  try {
    const history = historyApi || window.history
    history.replaceState(history.state, '', url)
    return true
  } catch {
    return false
  }
}

export function decoratePublicRegisterLinks(root = typeof document === 'undefined' ? null : document) {
  if (!root?.querySelectorAll) return 0
  const utms = getRegistrationUtms()
  if (!Object.keys(utms).length) return 0
  let count = 0
  root.querySelectorAll('a[href]').forEach((anchor) => {
    const href = anchor.getAttribute('href') || ''
    const path = registerPathFromHref(href)
    if (!path) return
    if (anchor.dataset?.skipUtm === '1') return
    const next = withRegistrationQuery(path)
    if (next !== href) {
      anchor.setAttribute('href', next)
      count += 1
    }
  })
  return count
}

function applyPublicRegisterLinks() {
  captureAcquisitionAttribution()
  decoratePublicRegisterLinks(document)
  concealTrackingQuery()
  if (isInAppBrowser()) document.documentElement.dataset.mutqinInapp = '1'
}

export function initPublicRegisterLinks() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  try {
    applyPublicRegisterLinks()
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        try { applyPublicRegisterLinks() } catch { /* never block navigation */ }
      }, { once: true })
    }
    window.addEventListener('mutqin:app-mounted', () => {
      try { decoratePublicRegisterLinks(document) } catch { /* never block navigation */ }
    }, { once: true })
  } catch {
    /* never block navigation */
  }
}
