import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  ACQUISITION_KEY,
  analyticsMeasurementAllowed,
  captureAcquisitionAttribution,
  contextFromWorkspace,
  getAcquisitionAttribution,
  initSpaPageViews,
  resetProductAnalyticsForTests,
  sanitiseProductParams,
  trackLoginFromFlash,
  trackProductEvent,
} from '../../resources/js/scripts/analytics/productEvents.js'
import { trackRegistrationComplete } from '../../resources/js/scripts/seoTools/track.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function installBrowser({ consent, search = '', path = '/', gpc = false } = {}) {
  const values = new Map()
  const events = []
  const listeners = {}
  resetProductAnalyticsForTests()
  Object.defineProperty(globalThis, 'navigator', {
    value: { globalPrivacyControl: gpc },
    configurable: true,
  })
  globalThis.window = {
    mutqinMarketingConsent: consent,
    location: {
      origin: 'https://mutqin.ai',
      pathname: path,
      search,
    },
    gtag(...args) {
      events.push(args)
    },
    sessionStorage: {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => { values.set(key, String(value)) },
      removeItem: (key) => { values.delete(key) },
    },
    addEventListener(name, callback) {
      (listeners[name] ||= []).push(callback)
    },
    dispatchEvent(event) {
      (listeners[event?.type] || []).forEach((callback) => callback())
      return true
    },
    history: {
      pushState(_state, _title, target) {
        const url = new URL(target, 'https://mutqin.ai')
        window.location.pathname = url.pathname
        window.location.search = url.search
      },
      replaceState(_state, _title, target) {
        const url = new URL(target, 'https://mutqin.ai')
        window.location.pathname = url.pathname
        window.location.search = url.search
      },
    },
  }
  return {
    events,
    values,
    popstate() {
      (listeners.popstate || []).forEach((callback) => callback())
    },
  }
}

function names(events) {
  return events.filter((entry) => entry[0] === 'event').map((entry) => entry[1])
}

{
  const env = installBrowser({ consent: undefined, path: '/memorisation' })
  const params = contextFromWorkspace({
    sessionMode: 'revision',
    playMode: 'follow',
    surahId: 1,
    durationSeconds: 90,
  })
  assert.equal(trackProductEvent('session_started', params, { onceKey: 'sit-1' }), true)
  assert.equal(trackProductEvent('session_started', params, { onceKey: 'sit-1' }), false)
  assert.equal(trackProductEvent('revision_started', params, { onceKey: 'sit-1' }), true)
  assert.equal(trackProductEvent('not_a_real_event', params, { onceKey: 'sit-1' }), false)
  assert.equal(trackProductEvent('session_completed', {
    ...params,
    email: 'learner@example.com',
    transcript: 'بسم الله',
    name: 'Amina',
  }, { onceKey: 'sit-1' }), true)
  const completed = env.events.find((entry) => entry[1] === 'session_completed')
  assert.equal(completed[2].session_type, 'revision')
  assert.equal(completed[2].learning_mode, 'follow')
  assert.equal(completed[2].surah_id, 1)
  assert.equal(completed[2].duration_seconds, 90)
  assert.equal(completed[2].email, undefined)
  assert.equal(completed[2].transcript, undefined)
  assert.equal(completed[2].name, undefined)
  assert.deepEqual(names(env.events), ['session_started', 'revision_started', 'session_completed'])
}

{
  const refused = installBrowser({ consent: false })
  captureAcquisitionAttribution()
  assert.equal(analyticsMeasurementAllowed(), false)
  assert.equal(trackProductEvent('login', { method: 'email' }, { onceKey: 'login-1' }), false)
  assert.equal(refused.events.length, 0)
  assert.equal(refused.values.has(ACQUISITION_KEY), false)

  installBrowser({ consent: true, gpc: true, search: '?utm_source=newsletter&utm_medium=email&utm_campaign=launch' })
  captureAcquisitionAttribution()
  assert.equal(getAcquisitionAttribution().utm_source, undefined)
  assert.equal(trackProductEvent('session_abandoned', { session_type: 'new' }, { onceKey: 'sit-2' }), false)
}

{
  const env = installBrowser({
    consent: undefined,
    path: '/',
    search: '?utm_source=newsletter&utm_medium=email&utm_campaign=launch&fbclid=click-secret&email=learner@example.com',
  })
  captureAcquisitionAttribution()
  const stored = env.values.get(ACQUISITION_KEY)
  assert.match(stored, /newsletter/)
  assert.doesNotMatch(stored, /fbclid|learner@example.com|click-secret/)

  window.location.pathname = '/register'
  window.location.search = ''
  trackRegistrationComplete({ method: 'email' })
  trackRegistrationComplete({ method: 'email' })
  const signups = env.events.filter((entry) => entry[1] === 'sign_up')
  assert.equal(signups.length, 1)
  assert.equal(signups[0][2].utm_source, 'newsletter')
  assert.equal(signups[0][2].utm_medium, 'email')
  assert.equal(signups[0][2].utm_campaign, 'launch')
  assert.equal(signups[0][2].method, 'email')
  assert.equal(signups[0][2].fbclid, undefined)

  window.mutqinMarketingConsent = false
  window.dispatchEvent(new Event('mutqin:marketing-consent'))
  assert.equal(trackProductEvent('onboarding_complete', {}, { onceKey: 'onboarding' }), false)
  assert.equal(env.events.filter((entry) => entry[1] === 'onboarding_complete').length, 0)
}

{
  const env = installBrowser({ consent: true, path: '/pricing' })
  initSpaPageViews()
  assert.deepEqual(names(env.events), [])

  window.history.pushState({}, '', '/memorisation')
  window.history.replaceState({}, '', '/memorisation')
  window.history.pushState({}, '', '/memorisation?utm_source=ignored')
  window.history.pushState({}, '', '/dashboard')
  window.location.pathname = '/memorisation'
  env.popstate()
  assert.deepEqual(names(env.events), ['page_view', 'page_view', 'page_view'])
  assert.deepEqual(env.events.map((entry) => entry[2].page_path), ['/memorisation', '/dashboard', '/memorisation'])
  assert.equal(env.events[0][2].page_location, 'https://mutqin.ai/memorisation')
  assert.equal(String(env.events[0][2].page_location).includes('?'), false)

  window.mutqinJustLoggedInFlash = true
  window.mutqinLoginEventId = 'login-event-1'
  window.mutqinLoginMethod = 'google'
  assert.equal(trackLoginFromFlash(), true)
  assert.equal(trackLoginFromFlash(), false)
  const login = env.events.find((entry) => entry[1] === 'login')
  assert.equal(login[2].method, 'google')
  assert.equal(login[2].mutqinLoginEventId, undefined)
}

assert.deepEqual(sanitiseProductParams({
  session_type: 'revision',
  learning_mode: 'not-a-mode',
  surah_id: 200,
  duration_seconds: -4,
  page_path: '/email/verify/secret-token',
  page_location: 'https://mutqin.ai/memorisation?email=learner@example.com',
}), {
  session_type: 'revision',
  page_path: '/email/verify',
})

{
  const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  const app = readFileSync(join(root, 'resources/js/app.js'), 'utf8')
  const layout = readFileSync(join(root, 'resources/views/layouts/app.blade.php'), 'utf8')

  assert.match(app, /initSpaPageViews\(\)/)
  assert.match(app, /trackLoginFromFlash\(\)/)
  assert.match(layout, /window\.mutqinJustLoggedInFlash/)
  assert.match(memorisation, /if \(!alreadyCompleted\) \{\s*trackProductEvent\('onboarding_complete'/)
  assert.match(memorisation, /trackProductEvent\('memorisation_started'/)
  assert.match(memorisation, /if \(startedContext\.session_type === 'revision'\) \{\s*trackProductEvent\('revision_started'/)
  assert.match(memorisation, /recitationCheckRecording = true[\s\S]{0,400}trackProductEvent\('ai_recitation_started'/)
  assert.match(memorisation, /'revision_completed' : 'memorisation_completed'/)
  assert.match(memorisation, /trackProductEvent\('session_abandoned'/)
  assert.match(memorisation, /trackProductEvent\('ai_recitation_completed'/)
  assert.match(memorisation, /trackProductEvent\('session_resumed'/)
  assert.doesNotMatch(memorisation, /trackProductEvent\('sign_up'/)
  assert.equal(trackProductEvent('memorisation_started', { session_type: 'new', surah_id: 1 }, { onceKey: 'new-1' }), true)
  assert.equal(trackProductEvent('memorisation_started', { session_type: 'new', surah_id: 1 }, { onceKey: 'new-1' }), false)
  assert.equal(trackProductEvent('session_resumed', { session_type: 'new', surah_id: 1 }, { onceKey: 'resume-1' }), true)
  assert.match(memorisation, /requiresFirstTimeOnboarding\(\) \{/)
  assert.doesNotMatch(memorisation, /this\.requiresFirstTimeOnboarding\(\)/)
  assert.doesNotMatch(memorisation, /this\.shouldAutoOpenOnboarding\(\)/)
  assert.match(memorisation, /trackProductEvent\('progressive_hiding_used'/)
  assert.match(memorisation, /trackProductEvent\('onboarding_started'/)
  assert.match(memorisation, /trackProductEvent\('onboarding_step_viewed'/)
  assert.match(memorisation, /trackProductEvent\('onboarding_step_completed'/)
  assert.match(memorisation, /trackProductEvent\('onboarding_abandoned'/)
  assert.match(readFileSync(join(root, 'resources/js/scripts/analytics/productEvents.js'), 'utf8'), /ONBOARDING_STEP_VIEWED/)
}

console.log('product-analytics.test.mjs: ok')
