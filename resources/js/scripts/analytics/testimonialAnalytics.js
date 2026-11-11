/**
 * Testimonial events for the existing GA4 tag (window.gtag).
 *
 * No new analytics vendor. No names, emails, quotes, or account ids.
 * A later registration is labelled as attributed when a deliberate carousel
 * or CTA interaction happened inside seven days. An impression is not enough,
 * and the event does not claim the testimonial caused the signup.
 */

import { analyticsMeasurementAllowed } from './productEvents.js'

export const TESTIMONIAL_EVENTS = Object.freeze({
  SECTION_VIEW: 'testimonial_section_view',
  IMPRESSION: 'testimonial_impression',
  NAVIGATION: 'testimonial_navigation',
  CTA: 'testimonial_cta_click',
  REGISTRATION: 'testimonial_registration',
})

export const TESTIMONIAL_ATTRIBUTION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000

const STORAGE_KEY = 'mutqin_testimonial_attr'
const INTERACTIONS = new Set(['section_view', 'impression', 'navigation', 'cta_click', 'registration'])
const METHODS = new Set(['arrow', 'keyboard', 'drag', 'dot', 'swipe'])
const DESTINATIONS = new Set(['registration', 'memorisation'])
const QUALIFYING = new Set(['navigation', 'cta_click'])
const RELATIONSHIPS = new Set(['attributed'])
const CAUSATION = new Set(['not_established'])

const sentKeys = new Set()
const impressed = new Set()
let consentBound = false

function storage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeId(value) {
  const text = String(value || '').trim()
  return /^[a-z0-9-]{1,40}$/.test(text) ? text : ''
}

function safePosition(value) {
  const position = Number(value)
  if (!Number.isInteger(position) || position < 1 || position > 24) return 0
  return position
}

function eventParams(partial = {}) {
  const interaction = INTERACTIONS.has(partial.interaction_type) ? partial.interaction_type : ''
  if (!interaction) return null
  const params = { interaction_type: interaction }
  const id = safeId(partial.id)
  if (id) params.testimonial_id = id
  const position = safePosition(partial.position)
  if (position) params.position = position
  const method = METHODS.has(partial.method) ? partial.method : ''
  if (method) params.navigation_method = method
  const destination = DESTINATIONS.has(partial.destination) ? partial.destination : ''
  if (destination) params.destination = destination
  if (RELATIONSHIPS.has(partial.relationship)) params.relationship = partial.relationship
  if (CAUSATION.has(partial.causation)) params.causation = partial.causation
  if (QUALIFYING.has(partial.qualifying_interaction)) {
    params.qualifying_interaction = partial.qualifying_interaction
  }
  return params
}

function send(eventName, partial) {
  if (!analyticsMeasurementAllowed()) return false
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
  const params = eventParams(partial)
  if (!params) return false
  window.gtag('event', eventName, params)
  return true
}

function once(key, sendEvent) {
  if (!key || sentKeys.has(key)) return false
  sentKeys.add(key)
  return sendEvent()
}

function readRecord() {
  const store = storage()
  if (!store) return { interactions: [] }
  try {
    const parsed = JSON.parse(store.getItem(STORAGE_KEY) || 'null')
    const interactions = Array.isArray(parsed?.interactions) ? parsed.interactions : []
    return { interactions }
  } catch {
    return { interactions: [] }
  }
}

function writeRecord(record) {
  const store = storage()
  if (!store || !analyticsMeasurementAllowed()) return
  try {
    store.setItem(STORAGE_KEY, JSON.stringify({
      interactions: record.interactions.slice(-24),
    }))
  } catch {
    /* private mode */
  }
}

export function clearTestimonialAttribution() {
  sentKeys.clear()
  impressed.clear()
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function bindTestimonialConsent() {
  if (consentBound || typeof window === 'undefined' || typeof window.addEventListener !== 'function') return
  consentBound = true
  try {
    window.addEventListener('mutqin:marketing-consent', () => {
      if (!analyticsMeasurementAllowed()) clearTestimonialAttribution()
    })
  } catch {
    consentBound = false
  }
}

function rememberInteraction(partial, kind) {
  if (!QUALIFYING.has(kind) || !analyticsMeasurementAllowed()) return
  const params = eventParams({ ...partial, interaction_type: kind })
  if (!params?.testimonial_id) return
  const record = readRecord()
  record.interactions.push({
    testimonial_id: params.testimonial_id,
    position: params.position || 1,
    kind,
    at: Date.now(),
  })
  writeRecord(record)
}

export function trackTestimonialSectionView() {
  try {
    return once('section', () => send(TESTIMONIAL_EVENTS.SECTION_VIEW, {
      interaction_type: 'section_view',
    }))
  } catch {
    return false
  }
}

export function trackTestimonialImpression({ id, position } = {}) {
  try {
    const safe = safeId(id)
    if (!safe || impressed.has(safe)) return false
    impressed.add(safe)
    return send(TESTIMONIAL_EVENTS.IMPRESSION, {
      id: safe,
      position,
      interaction_type: 'impression',
    })
  } catch {
    return false
  }
}

export function trackTestimonialNavigation({ id, position, method } = {}) {
  try {
    const partial = { id, position, method, interaction_type: 'navigation' }
    if (!eventParams(partial)?.testimonial_id) return false
    rememberInteraction(partial, 'navigation')
    return send(TESTIMONIAL_EVENTS.NAVIGATION, partial)
  } catch {
    return false
  }
}

export function trackTestimonialCta({ id, position, destination } = {}) {
  try {
    const partial = { id, position, destination, interaction_type: 'cta_click' }
    if (!eventParams(partial)?.testimonial_id) return false
    rememberInteraction(partial, 'cta_click')
    return send(TESTIMONIAL_EVENTS.CTA, partial)
  } catch {
    return false
  }
}

/**
 * Fire after a registration. Qualifying interactions are carousel navigation
 * or the testimonial CTA inside seven days — not a section view or impression.
 * `causation` stays `not_established`.
 */
export function attributeTestimonialRegistration({ justRegistered = false, now = Date.now() } = {}) {
  try {
    if (!justRegistered) return false
    bindTestimonialConsent()
    if (!analyticsMeasurementAllowed()) {
      clearTestimonialAttribution()
      return false
    }
    const qualifying = readRecord().interactions.filter((item) => (
      QUALIFYING.has(item?.kind)
      && safeId(item.testimonial_id)
      && Number.isFinite(item.at)
      && now >= item.at
      && now - item.at <= TESTIMONIAL_ATTRIBUTION_WINDOW_MS
    ))
    if (!qualifying.length) return false
    const latest = qualifying.slice().sort((a, b) => a.at - b.at).at(-1)
    const sent = send(TESTIMONIAL_EVENTS.REGISTRATION, {
      id: latest.testimonial_id,
      position: latest.position,
      interaction_type: 'registration',
      relationship: 'attributed',
      causation: 'not_established',
      qualifying_interaction: latest.kind,
    })
    if (sent) clearTestimonialAttribution()
    return sent
  } catch {
    return false
  }
}

export function resetTestimonialAnalyticsForTests() {
  sentKeys.clear()
  impressed.clear()
  consentBound = false
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
