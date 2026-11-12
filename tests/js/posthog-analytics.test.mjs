import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  captureAcquisitionAttribution,
  initSpaPageViews,
  resetProductAnalyticsForTests,
  trackProductEvent,
} from '../../resources/js/scripts/analytics/productEvents.js'
import { trackRegistrationComplete } from '../../resources/js/scripts/seoTools/track.js'
import {
  POSTHOG_EU_API_HOST,
  capturePostHogProductEvent,
  initPostHog,
  posthogProjectKey,
  resetPostHogForTests,
  resetPostHogOnLogout,
  resolvePostHogApiHost,
  sanitisePostHogPayload,
  setPostHogLoaderForTests,
} from '../../resources/js/scripts/analytics/posthog.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function installBrowser({ consent, search = '', path = '/', gpc = false, userId = null } = {}) {
  const values = new Map()
  const listeners = {}
  resetProductAnalyticsForTests()
  resetPostHogForTests()
  Object.defineProperty(globalThis, 'navigator', {
    value: { globalPrivacyControl: gpc },
    configurable: true,
  })
  globalThis.window = {
    mutqinMarketingConsent: consent,
    mutqinUserId: userId,
    location: {
      origin: 'https://mutqin.ai',
      pathname: path,
      search,
    },
    gtag() {},
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
  const calls = []
  let loads = 0
  const sdk = {
    init(token, config) {
      calls.push(['init', token, config])
      sdk.config = config
      sdk.__loaded = true
      config.loaded(sdk)
    },
    capture(name, props) { calls.push(['capture', name, props]) },
    identify(id, props) { calls.push(['identify', id, props]) },
    reset() { calls.push(['reset']) },
    register(props) { calls.push(['register', props]) },
    opt_in_capturing() { calls.push(['opt_in']) },
    opt_out_capturing() { calls.push(['opt_out']) },
    startSessionRecording() { calls.push(['start_replay']) },
    stopSessionRecording() { calls.push(['stop_replay']) },
  }
  setPostHogLoaderForTests(() => {
    loads += 1
    return Promise.resolve({ default: sdk })
  })
  return {
    calls,
    values,
    sdk,
    loads: () => loads,
    consent() {
      (listeners['mutqin:marketing-consent'] || []).forEach((callback) => callback())
    },
    popstate() {
      (listeners.popstate || []).forEach((callback) => callback())
    },
  }
}

function captured(calls, name) {
  return calls.filter((entry) => entry[0] === 'capture' && entry[1] === name)
}

{
  delete process.env.VITE_POSTHOG_KEY
  const env = installBrowser({ consent: undefined, userId: 42 })
  assert.equal(posthogProjectKey(), '')
  assert.equal(await initPostHog(), false)
  assert.equal(env.loads(), 0)
  assert.equal(capturePostHogProductEvent('memorisation_started', { session_type: 'new' }), false)
}

{
  process.env.VITE_POSTHOG_KEY = 'phc_testtoken12345678'
  process.env.VITE_POSTHOG_HOST = 'https://us.i.posthog.com'
  assert.equal(resolvePostHogApiHost(), POSTHOG_EU_API_HOST)
  assert.equal(resolvePostHogApiHost('https://eu.i.posthog.com'), POSTHOG_EU_API_HOST)
  assert.equal(resolvePostHogApiHost('https://eu.posthog.com'), POSTHOG_EU_API_HOST)

  const refused = installBrowser({ consent: false, userId: 42 })
  assert.equal(await initPostHog(), false)
  assert.equal(refused.loads(), 0)

  const gpc = installBrowser({ consent: true, gpc: true, userId: 42 })
  assert.equal(await initPostHog(), false)
  assert.equal(gpc.loads(), 0)
}

{
  process.env.VITE_POSTHOG_KEY = 'phc_testtoken12345678'
  process.env.VITE_POSTHOG_HOST = 'https://us.i.posthog.com'
  const env = installBrowser({
    consent: undefined,
    userId: 42,
    path: '/',
    search: '?utm_source=newsletter&utm_medium=email&utm_campaign=launch&fbclid=click-secret&email=learner@example.com',
  })
  captureAcquisitionAttribution()
  assert.equal(await initPostHog(), true)
  assert.equal(await initPostHog(), true)
  assert.equal(env.loads(), 1)

  const config = env.sdk.config
  assert.equal(env.calls.filter((entry) => entry[0] === 'init').length, 1)
  assert.equal(env.calls.find((entry) => entry[0] === 'init')[1], 'phc_testtoken12345678')
  assert.equal(config.api_host, POSTHOG_EU_API_HOST)
  assert.equal(config.ui_host, 'https://eu.posthog.com')
  assert.equal(config.capture_pageview, false)
  assert.equal(config.autocapture, false)
  assert.equal(config.capture_exceptions, false)
  assert.equal(config.disable_session_recording, true)
  assert.equal(config.disable_surveys, true)
  assert.equal(config.person_profiles, 'identified_only')
  assert.equal(config.session_recording.maskAllInputs, true)
  assert.equal(config.session_recording.recordBody, false)
  assert.equal(config.session_recording.recordHeaders, false)
  assert.equal(config.session_recording.maskTextFn('learner@example.com'), '********')
  assert.equal(config.session_recording.maskTextFn('Al-Fatiha'), 'Al-Fatiha')
  assert.equal(env.calls.some((entry) => entry[0] === 'start_replay'), false)
  assert.equal(env.calls.some((entry) => entry[0] === 'stop_replay'), true)
  assert.deepEqual(env.calls.find((entry) => entry[0] === 'identify').slice(1), ['42', undefined])
  assert.equal(env.calls.find((entry) => entry[0] === 'register')[1].utm_source, 'newsletter')
  assert.equal(env.calls.find((entry) => entry[0] === 'register')[1].fbclid, undefined)
  assert.equal(captured(env.calls, '$pageview').length, 1)
  assert.equal(env.calls.find((entry) => entry[0] === 'register')[1].environment, 'other')
  assert.equal(captured(env.calls, '$pageview')[0][2].$current_url, 'https://mutqin.ai/')
  assert.equal(String(captured(env.calls, '$pageview')[0][2].$current_url).includes('fbclid'), false)
  assert.equal(captured(env.calls, '$pageview')[0][2].email, undefined)

  trackProductEvent('memorisation_started', {
    session_type: 'new',
    learning_mode: 'follow',
    surah_id: 1,
    email: 'learner@example.com',
    transcript: 'بسم الله',
    name: 'Amina',
  }, { onceKey: 'sit-1' })
  trackProductEvent('memorisation_started', { session_type: 'new', surah_id: 1 }, { onceKey: 'sit-1' })
  assert.equal(captured(env.calls, 'memorisation_started').length, 0)
  assert.equal(captured(env.calls, 'session_started').length, 1)
  assert.equal(captured(env.calls, 'first_practice_started').length, 1)
  assert.equal(captured(env.calls, 'practice_day_active').length, 1)
  const started = captured(env.calls, 'session_started')[0][2]
  assert.equal(started.session_type, 'new')
  assert.equal(started.surah_id, 1)
  assert.equal(started.email, undefined)
  assert.equal(started.transcript, undefined)
  assert.equal(started.name, undefined)
  assert.equal(started.utm_source, 'newsletter')

  trackProductEvent('revision_started', { session_type: 'revision', surah_id: 2 }, { onceKey: 'rev-1' })
  trackProductEvent('revision_completed', {
    session_type: 'revision',
    surah_id: 2,
    duration_seconds: 90,
  }, { onceKey: 'rev-1' })
  trackProductEvent('session_abandoned', {
    session_type: 'new',
    duration_seconds: 12,
    stage: 'ended_early',
  }, { onceKey: 'early-1' })
  trackProductEvent('onboarding_complete', { session_type: 'new' }, { onceKey: 'onboarding' })
  trackProductEvent('ai_recitation_started', { session_type: 'new' }, { onceKey: 'ai-1' })
  trackProductEvent('ai_recitation_completed', { session_type: 'new', duration_seconds: 20 }, { onceKey: 'ai-1' })
  trackProductEvent('progressive_hiding_used', { session_type: 'new' }, { onceKey: 'blur:1' })
  assert.equal(captured(env.calls, 'revision_started').length, 0)
  assert.equal(captured(env.calls, 'session_started').length, 2)
  assert.equal(captured(env.calls, 'first_practice_started').length, 1)
  assert.equal(captured(env.calls, 'revision_completed').length, 0)
  assert.equal(captured(env.calls, 'session_completed').length, 1)
  assert.equal(captured(env.calls, 'session_ended_early')[0][2].stage, 'ended_early')
  assert.equal(captured(env.calls, 'session_abandoned').length, 0)
  assert.equal(captured(env.calls, 'onboarding_completed').length, 1)
  assert.equal(captured(env.calls, 'onboarding_complete').length, 0)
  assert.equal(captured(env.calls, 'ai_recite_started').length, 1)
  assert.equal(captured(env.calls, 'ai_recitation_started').length, 0)
  assert.equal(captured(env.calls, 'ai_recite_completed').length, 1)
  assert.equal(captured(env.calls, 'progressive_hiding_used').length, 1)

  trackRegistrationComplete({ method: 'email' })
  trackRegistrationComplete({ method: 'email' })
  assert.equal(captured(env.calls, 'registration_completed').length, 1)
  assert.equal(captured(env.calls, 'registration_completed')[0][2].method, 'email')
  assert.equal(captured(env.calls, 'sign_up').length, 0)
  assert.equal(capturePostHogProductEvent('onboarding_abandoned', {}, { onceKey: 'skip-1' }), true)
  assert.equal(captured(env.calls, 'onboarding_skipped').length, 1)
  assert.equal(capturePostHogProductEvent('translation_toggled', { enabled: true }), true)
  assert.equal(captured(env.calls, 'translation_toggled')[0][2].enabled, true)

  const cleaned = sanitisePostHogPayload({
    event: 'session_completed',
    distinct_id: '018f1c3a-7c2b-7b2a-8c1a-9b0a8d7e6f50',
    properties: {
      session_type: 'revision',
      email: 'learner@example.com',
      $current_url: 'https://mutqin.ai/memorisation?fbclid=click-secret&email=learner@example.com',
      $referrer: 'https://www.google.com/search?q=secret',
      $set: { utm_source: 'newsletter', email: 'learner@example.com' },
    },
  })
  assert.equal(cleaned.properties.email, undefined)
  assert.equal(cleaned.properties.$current_url, 'https://mutqin.ai/memorisation')
  assert.equal(cleaned.properties.$referrer, 'https://www.google.com')
  assert.equal(cleaned.properties.$set.utm_source, 'newsletter')
  assert.equal(cleaned.properties.$set.email, undefined)
  assert.equal(sanitisePostHogPayload({
    event: '$snapshot',
    properties: { text: 'learner@example.com' },
  }), null)
  assert.equal(sanitisePostHogPayload({
    event: 'session_completed',
    distinct_id: 'learner@example.com',
    properties: {},
  }), null)

  window.mutqinMarketingConsent = true
  env.consent()
  assert.equal(env.calls.filter((entry) => entry[0] === 'start_replay').length, 1)

  window.mutqinMarketingConsent = false
  env.consent()
  assert.equal(env.calls.some((entry) => entry[0] === 'opt_out'), true)
  const before = captured(env.calls, 'login').length
  assert.equal(capturePostHogProductEvent('login', { method: 'email' }, { onceKey: 'login-2' }), false)
  assert.equal(captured(env.calls, 'login').length, before)

  window.mutqinMarketingConsent = undefined
  env.consent()
  resetPostHogOnLogout()
  assert.equal(env.values.get('mutqin_posthog_reset'), '1')
  assert.equal(env.calls.filter((entry) => entry[0] === 'reset').length >= 1, true)
}

{
  process.env.VITE_POSTHOG_KEY = 'phc_testtoken12345678'
  const env = installBrowser({ consent: undefined, userId: null, path: '/memorisation' })
  env.values.set('mutqin_posthog_reset', '1')
  window.mutqinUserId = 'learner@example.com'
  assert.equal(await initPostHog(), true)
  assert.equal(env.calls.some((entry) => entry[0] === 'reset'), true)
  assert.equal(env.calls.some((entry) => entry[0] === 'identify'), false)
  assert.equal(env.values.has('mutqin_posthog_reset'), false)

  initSpaPageViews()
  window.history.pushState({}, '', '/dashboard')
  window.history.pushState({}, '', '/dashboard')
  assert.equal(captured(env.calls, '$pageview').map((entry) => entry[2].page_path).includes('/dashboard'), true)
  assert.equal(captured(env.calls, 'page_view').length, 0)
  const dashboardViews = captured(env.calls, '$pageview').filter((entry) => entry[2].page_path === '/dashboard')
  assert.equal(dashboardViews.length, 1)

  const admin = installBrowser({ consent: undefined, userId: 7, path: '/admin/growth' })
  assert.equal(await initPostHog(), true)
  assert.equal(captured(admin.calls, '$pageview').length, 0)
  initSpaPageViews()
  window.history.pushState({}, '', '/admin/users')
  assert.equal(captured(admin.calls, '$pageview').length, 0)
  window.history.pushState({}, '', '/memorisation')
  assert.equal(captured(admin.calls, '$pageview').some((entry) => entry[2].page_path === '/memorisation'), true)
}

{
  const app = readFileSync(join(root, 'resources/js/app.js'), 'utf8')
  const events = readFileSync(join(root, 'resources/js/scripts/analytics/productEvents.js'), 'utf8')
  const mix = readFileSync(join(root, 'webpack.mix.cjs'), 'utf8')
  const policy = readFileSync(join(root, 'app/Http/Middleware/SetMutqinContentSecurityPolicy.php'), 'utf8')
  assert.match(app, /initPostHog\(\)/)
  assert.match(app, /resetPostHogOnLogout\(\)/)
  assert.match(events, /capturePostHogProductEvent\(eventName, params, \{ onceKey \}\)/)
  assert.match(events, /capture_pageview stays off|PostHog's own pageview capture stays off/)
  assert.match(mix, /VITE_POSTHOG_KEY/)
  assert.match(mix, /VITE_POSTHOG_HOST/)
  assert.doesNotMatch(mix, /POSTHOG_PERSONAL_API_KEY/)
  assert.match(policy, /https:\/\/eu-assets\.i\.posthog\.com/)
  assert.match(policy, /https:\/\/eu\.i\.posthog\.com/)
}

delete process.env.VITE_POSTHOG_KEY
delete process.env.VITE_POSTHOG_HOST

console.log('posthog-analytics.test.mjs: ok')
