import assert from 'node:assert/strict'
import test from 'node:test'

import {
  ACKEE_EVENTS,
  initAckee,
  isAckeeRuntimeEnabled,
  isLocalHost,
  resetAckeeForTests,
  sanitiseSiteLocation,
  trackEvent,
} from '../../resources/js/scripts/analytics/ackee.js'

const DOMAIN_ID = '11111111-1111-4111-8111-111111111111'
const EVENT_ID = '22222222-2222-4222-8222-222222222222'

function installWindow({ hostname = 'app.mutqin.ai', href = 'https://app.mutqin.ai/memorisation?token=secret', environment = 'production' } = {}) {
  const calls = []
  const session = new Map()
  const location = new URL(href)
  Object.defineProperty(location, 'hostname', { value: hostname })
  globalThis.window = {
    mutqinAckee: {
      enabled: true,
      server: 'https://analytics.mutqin.ai',
      domainId: DOMAIN_ID,
      eventId: EVENT_ID,
      allowLocalhost: false,
    },
    mutqinEnvironment: environment,
    location,
    history: {
      pushState(state, title, url) {
        if (url) location.href = new URL(String(url), location.origin).href
      },
      replaceState(state, title, url) {
        if (url) location.href = new URL(String(url), location.origin).href
      },
    },
    sessionStorage: {
      getItem: (key) => session.get(key) ?? null,
      setItem: (key, value) => { session.set(key, String(value)) },
      removeItem: (key) => { session.delete(key) },
    },
    addEventListener() {},
  }
  globalThis.document = {
    referrer: 'https://mutqin.ai/waiting-list?email=user@example.com',
    querySelector() { return null },
  }
  globalThis.fetch = async (url, options) => {
    calls.push({ url, options })
    return {
      ok: true,
      json: async () => ({ data: { createRecord: { payload: { id: 'rec-1' } }, createAction: { payload: { id: 'act-1' } } } }),
    }
  }
  return calls
}

test('strips query strings and reset tokens from Ackee locations', () => {
  assert.equal(
    sanitiseSiteLocation('https://app.mutqin.ai/memorisation?email=a@b.com#notes'),
    'https://app.mutqin.ai/memorisation',
  )
  assert.equal(
    sanitiseSiteLocation('https://app.mutqin.ai/reset-password/super-secret-token'),
    'https://app.mutqin.ai/reset-password',
  )
  assert.equal(
    sanitiseSiteLocation('https://app.mutqin.ai/email/verify/9/abcHASH'),
    'https://app.mutqin.ai/email/verify',
  )
})

test('localhost and development stay off unless allowed', () => {
  assert.equal(isLocalHost('localhost'), true)
  assert.equal(isLocalHost('127.0.0.1'), true)
  assert.equal(isLocalHost('app.mutqin.ai'), false)

  installWindow({ hostname: 'localhost', href: 'http://localhost:8000/', environment: 'local' })
  assert.equal(isAckeeRuntimeEnabled(), false)

  window.mutqinAckee.allowLocalhost = true
  window.mutqinAckee.server = 'http://127.0.0.1:3000'
  assert.equal(isAckeeRuntimeEnabled(), true)
})

test('records one page view and updates on History API path changes', async () => {
  const calls = installWindow()
  resetAckeeForTests()
  initAckee()
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(calls.length, 1)
  const body = JSON.parse(calls[0].options.body)
  assert.equal(body.variables.domainId, DOMAIN_ID)
  assert.equal(body.variables.input.siteLocation, 'https://app.mutqin.ai/memorisation')
  assert.equal(body.variables.input.siteReferrer, 'https://mutqin.ai/waiting-list')
  assert.equal(calls[0].options.credentials, 'omit')

  window.history.pushState({}, '', '/madani/page/2')
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(calls.length, 2)
  const second = JSON.parse(calls[1].options.body)
  assert.equal(second.variables.input.siteLocation, 'https://app.mutqin.ai/madani/page/2')

  window.history.replaceState({}, '', '/madani/page/2?checkout=1')
  await new Promise((resolve) => setTimeout(resolve, 20))
  assert.equal(calls.length, 2)
})

test('sends allowlisted events once and never unknown payloads', async () => {
  const calls = installWindow()
  resetAckeeForTests()
  initAckee()
  await new Promise((resolve) => setTimeout(resolve, 20))
  calls.length = 0

  trackEvent(ACKEE_EVENTS.REGISTER_COMPLETED)
  trackEvent(ACKEE_EVENTS.REGISTER_COMPLETED)
  trackEvent('email_captured', { email: 'a@b.com' })
  trackEvent(ACKEE_EVENTS.AI_RECITE_STARTED)
  trackEvent(ACKEE_EVENTS.AI_RECITE_STARTED)
  await new Promise((resolve) => setTimeout(resolve, 20))

  assert.equal(calls.length, 2)
  const keys = calls.map((call) => JSON.parse(call.options.body).variables.input.key)
  assert.deepEqual(keys, [
    ACKEE_EVENTS.REGISTER_COMPLETED,
    ACKEE_EVENTS.AI_RECITE_STARTED,
  ])
  const bodies = calls.map((call) => JSON.parse(call.options.body))
  for (const body of bodies) {
    assert.equal(Object.keys(body.variables.input).sort().join(','), 'key,value')
    assert.equal(typeof body.variables.input.key, 'string')
    assert.equal(typeof body.variables.input.value, 'number')
  }
})

test('Ackee fetch failures do not throw', () => {
  installWindow()
  resetAckeeForTests()
  globalThis.fetch = async () => {
    throw new Error('offline')
  }
  assert.doesNotThrow(() => initAckee())
  assert.doesNotThrow(() => trackEvent(ACKEE_EVENTS.PRICING_VIEWED))
})
