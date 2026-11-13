/**
 * PostHog EU Cloud for the existing product events.
 *
 * Mutqin has no Vue Router. Page views follow the History API hook in
 * productEvents.js (initSpaPageViews), which is the app's navigation. This
 * module sends those as PostHog $pageview and does not turn on PostHog's own
 * history listener, so a path change is recorded once.
 *
 * The SDK is loaded only when POSTHOG_KEY is set (Laravel config, passed once
 * as window.mutqinPosthog). Product events use the same measurement gate as
 * GA4. Session replay stays off until marketing consent is explicitly granted.
 * Inputs, emails, notes, payment fields, and request bodies stay masked.
 * Failures never affect registration or practice.
 */

import {
  analyticsMeasurementAllowed,
  getAcquisitionAttribution,
  sanitiseProductParams,
} from './productEvents.js'

export const POSTHOG_EU_API_HOST = 'https://eu.i.posthog.com'
export const POSTHOG_EU_UI_HOST = 'https://eu.posthog.com'

const RESET_FLAG = 'mutqin_posthog_reset'
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign']
const QUEUE_LIMIT = 30

const INPUT_EVENTS = new Set([
  'sign_up',
  'signup_completed',
  'registration_completed',
  'login',
  'onboarding_complete',
  'onboarding_completed',
  'onboarding_started',
  'onboarding_abandoned',
  'onboarding_skipped',
  'session_started',
  'memorisation_started',
  'revision_started',
  'first_practice_started',
  'practice_day_active',
  'session_paused',
  'session_resumed',
  'session_completed',
  'memorisation_completed',
  'revision_completed',
  'session_abandoned',
  'session_ended_early',
  'ai_recitation_started',
  'ai_recite_started',
  'ai_assessment_completed',
  'ai_recitation_completed',
  'ai_recite_completed',
  'progressive_hiding_used',
  'translation_toggled',
  'transliteration_toggled',
  'tajweed_colours_toggled',
  'audio_repetition_used',
  'mushaf_layout_changed',
  'revision_recommendation_accepted',
  'saved_session_resumed',
  'mr_mutqin_used',
  'page_view',
  'landing_page_viewed',
  'signup_started',
  'achievement_unlocked',
  'achievement_viewed',
  'achievement_progress_viewed',
])

const OUTPUT_EVENTS = new Set([
  '$pageview',
  'registration_completed',
  'login',
  'onboarding_started',
  'onboarding_completed',
  'onboarding_skipped',
  'first_practice_started',
  'practice_day_active',
  'session_started',
  'session_paused',
  'session_resumed',
  'session_completed',
  'session_ended_early',
  'ai_recite_started',
  'ai_recite_completed',
  'progressive_hiding_used',
  'translation_toggled',
  'transliteration_toggled',
  'tajweed_colours_toggled',
  'audio_repetition_used',
  'mushaf_layout_changed',
  'revision_recommendation_accepted',
  'saved_session_resumed',
  'mr_mutqin_used',
  'landing_page_viewed',
  'signup_started',
  'achievement_unlocked',
  'achievement_viewed',
  'achievement_progress_viewed',
])

const ALIAS = Object.freeze({
  sign_up: 'registration_completed',
  signup_completed: 'registration_completed',
  registration_completed: 'registration_completed',
  onboarding_complete: 'onboarding_completed',
  onboarding_completed: 'onboarding_completed',
  onboarding_abandoned: 'onboarding_skipped',
  onboarding_skipped: 'onboarding_skipped',
  memorisation_started: 'session_started',
  revision_started: 'session_started',
  session_started: 'session_started',
  memorisation_completed: 'session_completed',
  revision_completed: 'session_completed',
  session_completed: 'session_completed',
  session_abandoned: 'session_ended_early',
  session_ended_early: 'session_ended_early',
  ai_recitation_started: 'ai_recite_started',
  ai_recite_started: 'ai_recite_started',
  ai_assessment_completed: 'ai_recite_completed',
  ai_recitation_completed: 'ai_recite_completed',
  page_view: '$pageview',
  achievement_unlocked: 'achievement_unlocked',
  achievement_viewed: 'achievement_viewed',
  achievement_progress_viewed: 'achievement_progress_viewed',
})

const SENSITIVE_KEYS = new Set([
  'email',
  '$email',
  'name',
  '$name',
  'password',
  'token',
  'secret',
  'transcript',
  'audio',
  'ayah',
  'ayah_text',
  'fbclid',
  'phone',
  'first_name',
  'last_name',
  'username',
])

const URL_KEYS = new Set([
  '$current_url',
  '$referrer',
  '$initial_current_url',
  '$initial_referrer',
  'page_location',
])

const REFERRER_KEYS = new Set(['$referrer', '$initial_referrer'])

let sdkLoader = () => import(/* webpackChunkName: "posthog" */ 'posthog-js')
let client = null
let bootPromise = null
let finishBoot = () => {}
let failed = false
let booted = false
let consentBound = false
let identifiedId = ''
let blockIdentify = false
let initialPageviewSent = false
let configRetryScheduled = false
let loadAttempts = 0
const MAX_LOAD_ATTEMPTS = 3
const sentKeys = new Set()
const queue = []

function storage() {
  try {
    return window.sessionStorage
  } catch {
    return null
  }
}

function runtimeConfig() {
  try {
    const runtime = window.mutqinPosthog
    if (runtime && typeof runtime === 'object') return runtime
  } catch {
    /* the page did not receive Laravel config */
  }
  return {}
}

function buildTimeValue(primary, fallback) {
  try {
    return String(primary || fallback || '')
  } catch {
    return ''
  }
}

export function posthogProjectKey() {
  try {
    const key = String(
      runtimeConfig().key
      || buildTimeValue(process.env.POSTHOG_KEY, process.env.VITE_POSTHOG_KEY)
      || ''
    ).trim()
    if (!/^phc_[A-Za-z0-9]{8,180}$/.test(key)) return ''
    return key
  } catch {
    return ''
  }
}

/**
 * Project 347076 is EU Cloud. A missing or non-EU host still uses the EU
 * ingestion endpoint so events cannot be sent to another region by mistake.
 */
export function resolvePostHogApiHost(configured = runtimeConfig().host || process.env.POSTHOG_HOST || process.env.VITE_POSTHOG_HOST) {
  const value = String(configured || '').trim().replace(/\/+$/, '')
  if (value === POSTHOG_EU_API_HOST) return POSTHOG_EU_API_HOST
  return POSTHOG_EU_API_HOST
}

function internalUserId() {
  try {
    if (typeof window === 'undefined' || window.mutqinUserId == null) return ''
    const id = String(window.mutqinUserId).trim()
    if (!/^[1-9]\d{0,17}$/.test(id)) return ''
    return id
  } catch {
    return ''
  }
}

function namesFor(eventName) {
  const canonical = ALIAS[eventName] || eventName
  return [canonical]
}

function storageKey(eventName, onceKey) {
  return `mutqin_ph_${eventName}_${String(onceKey).slice(0, 60)}`.slice(0, 90)
}

function alreadyQueued(eventName, onceKey) {
  if (!onceKey) return false
  const memoryKey = `${eventName}:${onceKey}`
  if (sentKeys.has(memoryKey)) return true
  try {
    return storage()?.getItem(storageKey(eventName, onceKey)) === '1'
  } catch {
    return false
  }
}

function remember(eventName, onceKey) {
  if (!onceKey) return
  sentKeys.add(`${eventName}:${onceKey}`)
  try {
    storage()?.setItem(storageKey(eventName, onceKey), '1')
  } catch {
    /* private mode */
  }
}

function durableStorage() {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function retentionSeen(eventName, onceKey) {
  const memoryKey = `${eventName}:${onceKey}`
  if (sentKeys.has(memoryKey)) return true
  try {
    return durableStorage()?.getItem(storageKey(eventName, onceKey)) === '1'
  } catch {
    return false
  }
}

function rememberRetention(eventName, onceKey) {
  sentKeys.add(`${eventName}:${onceKey}`)
  try {
    durableStorage()?.setItem(storageKey(eventName, onceKey), '1')
  } catch {
    /* private mode */
  }
}

/** One first-practice event per learner, and one practice day per UTC date. */
function practiceRetention(names) {
  if (!names.includes('session_started')) return []
  const who = internalUserId() || 'browser'
  const day = new Date().toISOString().slice(0, 10)
  const extras = []
  if (!retentionSeen('first_practice_started', who)) {
    rememberRetention('first_practice_started', who)
    extras.push('first_practice_started')
  }
  const dayKey = `${who}:${day}`
  if (!retentionSeen('practice_day_active', dayKey)) {
    rememberRetention('practice_day_active', dayKey)
    extras.push('practice_day_active')
  }
  return extras
}

function currentPage() {
  try {
    return {
      page_path: window.location?.pathname || '/',
      page_location: `${window.location?.origin || ''}${window.location?.pathname || '/'}`,
    }
  } catch {
    return { page_path: '/' }
  }
}

function safeProperties(params = {}) {
  const safe = {
    ...getAcquisitionAttribution(),
    ...sanitiseProductParams(params),
  }
  if (typeof params.enabled === 'boolean') safe.enabled = params.enabled
  const layout = String(params.layout || '')
  if (/^[a-z0-9_-]{1,40}$/i.test(layout)) safe.layout = layout
  const path = safe.page_path
  if (path) {
    try {
      const origin = String(window.location?.origin || '')
      if (/^https?:\/\/[a-z0-9.:\[\]-]+$/i.test(origin)) {
        safe.$current_url = `${origin}${path}`
      }
    } catch {
      /* location is optional */
    }
  }
  return safe
}

function cleanUrl(value, referrer) {
  try {
    const url = new URL(String(value))
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return ''
    if (referrer) return url.origin
    const path = url.pathname.length > 120 || url.pathname.includes('@') ? '/' : url.pathname || '/'
    return `${url.origin}${path}`
  } catch {
    return ''
  }
}

function containsPrivateText(value) {
  return /@/.test(value) || /[\u0600-\u06FF]/.test(value)
}

/**
 * Last line of defence before the request leaves the browser. Replay payloads
 * are left intact only while explicit consent is on; everything else loses
 * emails, query strings, and free text.
 */
export function sanitisePostHogPayload(event) {
  try {
    if (!event || typeof event !== 'object') return null
    if (!analyticsMeasurementAllowed()) return null
    const distinct = event.distinct_id
    if (typeof distinct === 'string' && (distinct.includes('@') || distinct.length > 80)) return null
    const name = String(event.event || '')
    if (name === '$snapshot' || name === '$$heatmap' || name.startsWith('$snapshot')) {
      if (window.mutqinMarketingConsent !== true) return null
      return event
    }
    if (!name.startsWith('$') && !OUTPUT_EVENTS.has(name)) return null
    const source = event.properties && typeof event.properties === 'object' ? event.properties : {}
    const properties = {}
    for (const [key, value] of Object.entries(source)) {
      if (SENSITIVE_KEYS.has(key)) continue
      if (typeof value === 'string') {
        if (URL_KEYS.has(key)) {
          const cleaned = cleanUrl(value, REFERRER_KEYS.has(key))
          if (cleaned) properties[key] = cleaned
          continue
        }
        if (containsPrivateText(value) || value.length > 180) continue
        properties[key] = value
        continue
      }
      if (value && typeof value === 'object' && (key === '$set' || key === '$set_once')) {
        const next = {}
        for (const [innerKey, inner] of Object.entries(value)) {
          if (SENSITIVE_KEYS.has(innerKey)) continue
          if (typeof inner === 'string' && (containsPrivateText(inner) || inner.length > 180)) continue
          next[innerKey] = inner
        }
        properties[key] = next
        continue
      }
      properties[key] = value
    }
    return { ...event, properties }
  } catch {
    return null
  }
}

function analyticsEnvironment() {
  try {
    const value = String(runtimeConfig().environment || '').trim()
    if (value === 'production' || value === 'local' || value === 'testing' || value === 'other') return value
  } catch {
    /* the page did not receive a coarse environment label */
  }
  return 'other'
}

function isAdminAnalyticsPath(path) {
  const value = String(path || '')
  return value === '/admin' || value.startsWith('/admin/')
}

function registerAttribution(sdk) {
  const attribution = getAcquisitionAttribution()
  const props = { environment: analyticsEnvironment() }
  for (const key of UTM_KEYS) {
    if (attribution[key]) props[key] = attribution[key]
  }
  if (typeof sdk.register === 'function') sdk.register(props)
}

function syncIdentity(sdk) {
  if (blockIdentify || typeof sdk.identify !== 'function') return
  const id = internalUserId()
  if (!id || id === identifiedId) return
  sdk.identify(id)
  identifiedId = id
}

function consumeLogoutReset(sdk) {
  let flagged = false
  try {
    flagged = storage()?.getItem(RESET_FLAG) === '1'
    if (flagged) storage()?.removeItem(RESET_FLAG)
  } catch {
    flagged = false
  }
  if (!flagged || typeof sdk.reset !== 'function') return
  sdk.reset()
  identifiedId = ''
}

function applyConsent(sdk) {
  if (!sdk) return
  if (!analyticsMeasurementAllowed()) {
    if (typeof sdk.stopSessionRecording === 'function') sdk.stopSessionRecording()
    if (typeof sdk.opt_out_capturing === 'function') sdk.opt_out_capturing()
    queue.length = 0
    return
  }
  consumeLogoutReset(sdk)
  if (typeof sdk.opt_in_capturing === 'function') sdk.opt_in_capturing()
  registerAttribution(sdk)
  syncIdentity(sdk)
  if (window.mutqinMarketingConsent === true) {
    if (typeof sdk.startSessionRecording === 'function') sdk.startSessionRecording()
  } else if (typeof sdk.stopSessionRecording === 'function') {
    sdk.stopSessionRecording()
  }
}

function sdkConfig() {
  return {
    api_host: resolvePostHogApiHost(),
    ui_host: POSTHOG_EU_UI_HOST,
    defaults: '2026-01-30',
    capture_pageview: false,
    capture_pageleave: true,
    autocapture: false,
    capture_exceptions: false,
    disable_session_recording: true,
    disable_surveys: true,
    disable_web_experiments: true,
    enable_recording_console_log: false,
    capture_performance: false,
    advanced_disable_feature_flags: true,
    person_profiles: 'identified_only',
    mask_personal_data_properties: true,
    mask_all_text: true,
    mask_all_element_attributes: true,
    custom_personal_data_properties: ['email', 'name', 'token', 'password', 'fbclid'],
    property_denylist: [
      'email',
      '$email',
      'name',
      '$name',
      'password',
      'token',
      'transcript',
      'audio',
      'ayah',
      'ayah_text',
      'fbclid',
    ],
    // Match GA4: product events still fire when the browser DNT flag is on.
    respect_dnt: false,
    cross_subdomain_cookie: false,
    session_recording: {
      maskAllInputs: true,
      maskTextSelector: '[data-ph-mask]',
      maskTextFn(text) {
        const value = String(text || '')
        if (!value || !value.includes('@')) return value
        return '*'.repeat(Math.min(value.length, 8))
      },
      blockSelector: 'input[type="password"], input[type="email"], input[autocomplete="cc-number"], input[name="cardnumber"], .ayah-notes-modal, .ayah-notes-dialog, .ph-no-capture, [data-ph-no-capture], audio, video',
      recordCrossOriginIframes: false,
      recordHeaders: false,
      recordBody: false,
      captureJsonLd: false,
    },
    before_send: sanitisePostHogPayload,
    loaded(instance) {
      onReady(instance)
    },
  }
}

function onReady(instance) {
  if (booted) return
  booted = true
  client = instance || client
  if (client) {
    applyConsent(client)
    flush()
  }
  finishBoot(true)
}

function flush() {
  if (!client || !analyticsMeasurementAllowed()) {
    queue.length = 0
    return
  }
  const pending = queue.splice(0, queue.length)
  for (const item of pending) deliver(item)
}

function deliver(item) {
  if (!client || typeof client.capture !== 'function') return
  if (!analyticsMeasurementAllowed()) return
  registerAttribution(client)
  syncIdentity(client)
  for (const name of item.names) {
    client.capture(name, item.properties)
  }
}

function beginLoad() {
  const key = posthogProjectKey()
  if (!key) return Promise.resolve(false)
  if (client && booted) return Promise.resolve(true)
  if (failed && loadAttempts >= MAX_LOAD_ATTEMPTS) return Promise.resolve(false)
  if (failed) {
    failed = false
    bootPromise = null
  }
  if (bootPromise) return bootPromise
  bootPromise = new Promise((resolve) => {
    finishBoot = resolve
    const begin = () => {
      sdkLoader().then((mod) => {
        const sdk = mod && (mod.default || mod)
        if (!sdk || typeof sdk.init !== 'function') {
          loadAttempts += 1
          failed = loadAttempts >= MAX_LOAD_ATTEMPTS
          bootPromise = null
          resolve(false)
          return
        }
        client = sdk
        try {
          sdk.init(key, sdkConfig())
        } catch {
          loadAttempts += 1
          failed = loadAttempts >= MAX_LOAD_ATTEMPTS
          bootPromise = null
          resolve(false)
          return
        }
        if (sdk.__loaded && !booted) onReady(sdk)
      }).catch(() => {
        loadAttempts += 1
        failed = loadAttempts >= MAX_LOAD_ATTEMPTS
        bootPromise = null
        resolve(false)
      })
    }
    try {
      const schedule = window.requestIdleCallback
      if (typeof schedule === 'function') schedule(begin, { timeout: 1500 })
      else begin()
    } catch {
      begin()
    }
  })
  return bootPromise
}

function bindConsent() {
  if (consentBound || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  consentBound = true
  window.addEventListener('mutqin:marketing-consent', () => {
    try {
      if (!analyticsMeasurementAllowed()) {
        queue.length = 0
        if (client) applyConsent(client)
        return
      }
      ensureInitialPageview()
      if (client && booted) {
        applyConsent(client)
        return
      }
      beginLoad().then(() => {
        if (client) applyConsent(client)
      })
    } catch {
      /* consent changes must not throw into the page */
    }
  })
}

function ensureInitialPageview() {
  if (initialPageviewSent || !posthogProjectKey() || !analyticsMeasurementAllowed()) return
  const page = currentPage()
  initialPageviewSent = true
  if (isAdminAnalyticsPath(page.page_path)) return
  capturePostHogProductEvent('page_view', page)
}

function schedulePostHogConfigRetry() {
  if (configRetryScheduled || typeof document === 'undefined') return
  configRetryScheduled = true
  const retry = () => {
    try {
      if (!posthogProjectKey() || !analyticsMeasurementAllowed()) return
      ensureInitialPageview()
      beginLoad()
    } catch {
      /* analytics must never throw into the page */
    }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', retry, { once: true })
  } else {
    queueMicrotask(retry)
  }
}

export function initPostHog() {
  try {
    bindConsent()
    if (!posthogProjectKey()) {
      schedulePostHogConfigRetry()
      return Promise.resolve(false)
    }
    if (!analyticsMeasurementAllowed()) return Promise.resolve(false)
    ensureInitialPageview()
    return beginLoad()
  } catch {
    return Promise.resolve(false)
  }
}

export function capturePostHogProductEvent(eventName, params = {}, { onceKey = '' } = {}) {
  try {
    if (!INPUT_EVENTS.has(eventName)) return false
    if (!posthogProjectKey() || !analyticsMeasurementAllowed()) return false
    const names = namesFor(eventName).filter((name) => OUTPUT_EVENTS.has(name) && !alreadyQueued(name, onceKey))
    if (names.length === 0) return false
    for (const name of names) remember(name, onceKey)
    const properties = safeProperties(params)
    const extras = practiceRetention(names, properties)
    if (client && booted) {
      deliver({ names, properties })
      if (extras.length) deliver({ names: extras, properties })
      return true
    }
    queue.push({ names, properties })
    if (extras.length) queue.push({ names: extras, properties })
    if (queue.length > QUEUE_LIMIT) queue.splice(0, queue.length - QUEUE_LIMIT)
    beginLoad()
    return true
  } catch {
    return false
  }
}

/** Call before the logout form navigates away. The next page load starts anonymous. */
export function resetPostHogOnLogout() {
  blockIdentify = true
  identifiedId = ''
  try {
    storage()?.setItem(RESET_FLAG, '1')
  } catch {
    /* private mode */
  }
  try {
    if (client && typeof client.reset === 'function') client.reset()
  } catch {
    /* the next page still honours RESET_FLAG */
  }
}

export function setPostHogLoaderForTests(loader) {
  sdkLoader = loader
}

export function resetPostHogForTests() {
  client = null
  bootPromise = null
  failed = false
  booted = false
  consentBound = false
  identifiedId = ''
  blockIdentify = false
  initialPageviewSent = false
  configRetryScheduled = false
  loadAttempts = 0
  finishBoot = () => {}
  sentKeys.clear()
  queue.length = 0
  sdkLoader = () => import(/* webpackChunkName: "posthog" */ 'posthog-js')
}
