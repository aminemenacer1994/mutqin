import assert from 'node:assert/strict'
import test from 'node:test'

function browser(url, referrer = '') {
  const values = new Map()
  const listeners = {}
  const calls = []
  globalThis.document = { referrer }
  Object.defineProperty(globalThis, 'navigator', { value: { globalPrivacyControl: false }, configurable: true })
  globalThis.window = {
    location: new URL(url),
    mutqinMarketingConsent: false,
    sessionStorage: {
      getItem: (key) => values.get(key) || null,
      setItem: (key, value) => values.set(key, value),
      removeItem: (key) => values.delete(key),
    },
    addEventListener: (name, callback) => { (listeners[name] ||= []).push(callback) },
    fbq: (...args) => calls.push(args),
  }
  window.history = {
    pushState: (_state, _title, target) => { window.location = new URL(target, window.location.href) },
    replaceState: (_state, _title, target) => { window.location = new URL(target, window.location.href) },
  }
  return { values, calls, dispatch: (name) => (listeners[name] || []).forEach((callback) => callback()) }
}

test('retains first and last touches through navigation only with consent and records one SPA page view', async () => {
  const env = browser('https://mutqin.ai/?utm_source=facebook&utm_medium=paid_social&utm_campaign=launch&fbclid=abc-123', 'https://l.facebook.com/with-private-query?email=test')
  window.mutqinMarketingConsent = true
  const module = await import('../../resources/js/scripts/analytics/waitingListAttribution.js?consented')
  module.initWaitingListAttribution()
  window.history.pushState({}, '', '/waiting-list?utm_source=google&utm_campaign=search')
  window.history.replaceState({}, '', '/waiting-list?utm_source=google&utm_campaign=search#form')
  const value = module.getWaitingListAttribution()
  assert.equal(value.first.utm_campaign, 'launch')
  assert.equal(value.first.fbclid, 'abc-123')
  assert.equal(value.first.referrer_host, 'l.facebook.com')
  assert.equal(value.last.utm_campaign, 'search')
  assert.deepEqual(env.calls, [['track', 'PageView']])
  assert.equal(env.values.size, 1)
  assert.doesNotMatch([...env.values.values()][0], /email|private-query/)
  window.mutqinMarketingConsent = false
  env.dispatch('mutqin:marketing-consent')
  assert.equal(env.values.size, 0)
})

test('does not persist attribution or retain fbclid without consent', async () => {
  const env = browser('https://mutqin.ai/waiting-list?utm_source=facebook&utm_medium=paid&fbclid=abc')
  const module = await import('../../resources/js/scripts/analytics/waitingListAttribution.js?declined')
  module.initWaitingListAttribution()
  assert.equal(module.getWaitingListAttribution().first.utm_source, 'facebook')
  assert.equal(module.getWaitingListAttribution().first.fbclid, undefined)
  assert.equal(env.values.size, 0)
  window.history.pushState({}, '', '/next')
  assert.equal(env.calls.length, 0)
})

test('global privacy control prevents persistent storage even with a consent flag', async () => {
  const env = browser('https://mutqin.ai/?utm_source=instagram')
  window.mutqinMarketingConsent = true
  navigator.globalPrivacyControl = true
  const module = await import('../../resources/js/scripts/analytics/waitingListAttribution.js?gpc')
  module.initWaitingListAttribution()
  assert.equal(env.values.size, 0)
  assert.equal(module.hasMarketingConsent(), false)
})

test('restores a previously consented touch when the consent provider loads asynchronously', async () => {
  const env = browser('https://mutqin.ai/waiting-list', 'https://mutqin.ai/')
  delete window.mutqinMarketingConsent
  const stored = { first: { utm_source: 'facebook', utm_campaign: 'launch' }, last: { utm_source: 'facebook', utm_campaign: 'launch' } }
  env.values.set('mutqin_waiting_attribution_v1', JSON.stringify(stored))
  const module = await import('../../resources/js/scripts/analytics/waitingListAttribution.js?restored')
  module.initWaitingListAttribution()
  assert.equal(env.values.size, 1)
  window.mutqinMarketingConsent = true
  env.dispatch('mutqin:marketing-consent')
  assert.equal(module.getWaitingListAttribution().first.utm_campaign, 'launch')
})
