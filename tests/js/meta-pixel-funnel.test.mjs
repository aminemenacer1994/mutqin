import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

import {
  META_PIXEL_EVENTS,
  trackMetaPixelEvent,
  trackWaitingListConversion,
} from '../../resources/js/scripts/analytics/metaPixel.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function withPixel(run) {
  const calls = []
  globalThis.window = {
    mutqinMarketingConsent: true,
    fbq: (...args) => calls.push(args),
  }
  try {
    run(calls)
  } finally {
    delete globalThis.window
  }
}

test('uses the existing Pixel API for the landing funnel without personal data', () => {
  withPixel((calls) => {
    trackMetaPixelEvent(META_PIXEL_EVENTS.PRIMARY_CTA_CLICKED, { destination: 'waiting_list' })
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: 'fa88c991-9152-49a5-8999-d17363206389' })
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: 'fa88c991-9152-49a5-8999-d17363206389' })
    trackWaitingListConversion(200, { already_joined: true, conversion_event_id: 'fa88c991-9152-49a5-8999-d17363206389' })
    trackWaitingListConversion(422, {})
    trackMetaPixelEvent(META_PIXEL_EVENTS.REGISTRATION_COMPLETED)
    trackMetaPixelEvent(META_PIXEL_EVENTS.MEMORISATION_SESSION_STARTED)
    trackMetaPixelEvent(META_PIXEL_EVENTS.MEMORISATION_SESSION_COMPLETED)

    assert.deepEqual(calls, [
      ['trackCustom', 'MutqinPrimaryCtaClicked', { destination: 'waiting_list' }],
      ['track', 'Lead', {}, { eventID: 'fa88c991-9152-49a5-8999-d17363206389' }],
      ['track', 'CompleteRegistration', {}],
      ['trackCustom', 'MutqinMemorisationSessionStarted', {}],
      ['trackCustom', 'MutqinMemorisationSessionCompleted', {}],
    ])
  })
})

test('ignores unknown events and unsafe CTA properties', () => {
  withPixel((calls) => {
    trackMetaPixelEvent('not_an_event')
    trackMetaPixelEvent(META_PIXEL_EVENTS.PRIMARY_CTA_CLICKED, { destination: 'waiting-list?email=user@example.com' })

    assert.deepEqual(calls, [
      ['trackCustom', 'MutqinPrimaryCtaClicked', {}],
    ])
  })
})

test('is safe when the Pixel is unavailable', () => {
  delete globalThis.window
  assert.doesNotThrow(() => trackMetaPixelEvent(META_PIXEL_EVENTS.PRIMARY_CTA_CLICKED))
})

test('does not emit a Lead without consent, for failed responses, or without a valid new-registration event ID', () => {
  withPixel((calls) => {
    const id = '92da4c64-46f0-417f-a310-f845752ad08c'
    window.mutqinMarketingConsent = false
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: id })
    window.mutqinMarketingConsent = true
    trackWaitingListConversion(422, { already_joined: false, conversion_event_id: id })
    trackWaitingListConversion(200, { already_joined: true, conversion_event_id: id })
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: 'invalid' })
    assert.deepEqual(calls, [])
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: id })
    trackWaitingListConversion(201, { already_joined: false, conversion_event_id: id })
    assert.deepEqual(calls, [['track', 'Lead', {}, { eventID: id }]])
  })
})

test('wires funnel events to the actual successful action points', () => {
  const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
  const waitingList = readFileSync(join(root, 'resources/js/views/WaitingList.vue'), 'utf8')
  const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  const app = readFileSync(join(root, 'resources/js/app.js'), 'utf8')

  assert.match(homepage, /trackMetaPixelEvent\(META_PIXEL_EVENTS\.PRIMARY_CTA_CLICKED/)
  assert.match(waitingList, /joined\.value = true;[\s\S]{0,240}trackWaitingListConversion\(response\.status, payload\)/)
  assert.doesNotMatch(waitingList, /window\.fbq\(/)
  assert.match(memorisation, /trackAckeeEvent\(ACKEE_EVENTS\.MEMORISATION_SESSION_STARTED\)[\s\S]{0,120}trackMetaPixelEvent\(META_PIXEL_EVENTS\.MEMORISATION_SESSION_STARTED\)/)
  assert.match(memorisation, /trackAckeeEvent\(ACKEE_EVENTS\.MEMORISATION_SESSION_COMPLETED\)[\s\S]{0,120}trackMetaPixelEvent\(META_PIXEL_EVENTS\.MEMORISATION_SESSION_COMPLETED\)/)
  assert.match(app, /trackMetaPixelEvent\(META_PIXEL_EVENTS\.REGISTRATION_COMPLETED\)/)
})
