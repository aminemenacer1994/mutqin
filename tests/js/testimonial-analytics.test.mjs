import assert from 'node:assert/strict'
import {
  TESTIMONIAL_ATTRIBUTION_WINDOW_MS,
  TESTIMONIAL_EVENTS,
  attributeTestimonialRegistration,
  resetTestimonialAnalyticsForTests,
  trackTestimonialCta,
  trackTestimonialImpression,
  trackTestimonialNavigation,
  trackTestimonialSectionView,
} from '../../resources/js/scripts/analytics/testimonialAnalytics.js'
import { resetProductAnalyticsForTests } from '../../resources/js/scripts/analytics/productEvents.js'

const DAY = 24 * 60 * 60 * 1000

function installBrowser({ consent } = {}) {
  const values = new Map()
  const events = []
  resetProductAnalyticsForTests()
  resetTestimonialAnalyticsForTests()
  Object.defineProperty(globalThis, 'navigator', {
    value: { globalPrivacyControl: false },
    configurable: true,
  })
  globalThis.window = {
    mutqinMarketingConsent: consent,
    gtag(...args) {
      events.push(args)
    },
    localStorage: {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => { values.set(key, String(value)) },
      removeItem: (key) => { values.delete(key) },
    },
    sessionStorage: {
      getItem: () => null,
      setItem() {},
      removeItem() {},
    },
    addEventListener() {},
  }
  return { events, values }
}

function names(events) {
  return events.filter((entry) => entry[0] === 'event').map((entry) => entry[1])
}

{
  const env = installBrowser({ consent: undefined })
  assert.equal(trackTestimonialSectionView(), true)
  assert.equal(trackTestimonialSectionView(), false)
  assert.equal(trackTestimonialImpression({ id: 'huda', position: 1 }), true)
  assert.equal(trackTestimonialImpression({ id: 'huda', position: 1 }), false)
  assert.equal(trackTestimonialImpression({ id: 'Learner Name', position: 2 }), false)
  assert.equal(trackTestimonialNavigation({ id: 'huda', position: 2, method: 'arrow' }), true)
  assert.equal(trackTestimonialCta({ id: 'huda', position: 2, destination: 'registration' }), true)
  assert.deepEqual(names(env.events), [
    TESTIMONIAL_EVENTS.SECTION_VIEW,
    TESTIMONIAL_EVENTS.IMPRESSION,
    TESTIMONIAL_EVENTS.NAVIGATION,
    TESTIMONIAL_EVENTS.CTA,
  ])
  assert.equal(env.events[2][2].testimonial_id, 'huda')
  assert.equal(env.events[2][2].position, 2)
  assert.equal(env.events[2][2].interaction_type, 'navigation')
  assert.equal(env.events[3][2].destination, 'registration')
  const stored = JSON.parse(env.values.get('mutqin_testimonial_attr'))
  assert.equal(stored.interactions.length, 2)
  assert.equal(stored.interactions.some((item) => item.kind === 'impression'), false)
}

{
  const env = installBrowser({ consent: undefined })
  trackTestimonialImpression({ id: 'huda', position: 1 })
  assert.equal(attributeTestimonialRegistration({ justRegistered: true }), false)
  assert.equal(names(env.events).includes(TESTIMONIAL_EVENTS.REGISTRATION), false)

  trackTestimonialNavigation({ id: 'huda', position: 1, method: 'swipe' })
  const now = Date.now()
  assert.equal(attributeTestimonialRegistration({
    justRegistered: true,
    now: now + (8 * DAY),
  }), false)

  assert.equal(attributeTestimonialRegistration({ justRegistered: true, now }), true)
  const registration = env.events.find((entry) => entry[1] === TESTIMONIAL_EVENTS.REGISTRATION)
  assert.equal(registration[2].testimonial_id, 'huda')
  assert.equal(registration[2].relationship, 'attributed')
  assert.equal(registration[2].causation, 'not_established')
  assert.equal(registration[2].qualifying_interaction, 'navigation')
  assert.equal(registration[2].interaction_type, 'registration')
  assert.equal(env.values.has('mutqin_testimonial_attr'), false)
  assert.equal(TESTIMONIAL_ATTRIBUTION_WINDOW_MS, 7 * DAY)
}

{
  const env = installBrowser({ consent: false })
  assert.equal(trackTestimonialCta({ id: 'huda', position: 1, destination: 'registration' }), false)
  assert.equal(attributeTestimonialRegistration({ justRegistered: true }), false)
  assert.equal(env.events.length, 0)
  assert.equal(env.values.has('mutqin_testimonial_attr'), false)
}

console.log('testimonial-analytics.test.mjs: ok')
