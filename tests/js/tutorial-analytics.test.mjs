import assert from 'node:assert/strict'
import {
  TUTORIAL_EVENTS,
  attributeTutorialRegistration,
  noteTutorialPlaybackTime,
  resetTutorialAnalyticsForTests,
  trackTutorialComplete,
  trackTutorialCta,
  trackTutorialImpression,
  trackTutorialPlay,
  trackTutorialProgress,
} from '../../resources/js/scripts/analytics/tutorialAnalytics.js'
import { resetProductAnalyticsForTests } from '../../resources/js/scripts/analytics/productEvents.js'

const DAY = 24 * 60 * 60 * 1000
const video = {
  id: 'u9B3FyKnqn4',
  featureId: 'dark-mode',
  feature: 'Dark Mode',
}

function installBrowser({ consent } = {}) {
  const values = new Map()
  const events = []
  resetProductAnalyticsForTests()
  resetTutorialAnalyticsForTests()
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
  const playback = 'play-1'
  assert.equal(trackTutorialImpression(video), true)
  assert.equal(trackTutorialImpression(video), false)
  assert.equal(trackTutorialPlay(video, playback), true)
  assert.equal(trackTutorialPlay(video, playback), false)
  noteTutorialPlaybackTime(video, playback, 10, 40)
  noteTutorialPlaybackTime(video, playback, 20, 40)
  noteTutorialPlaybackTime(video, playback, 30, 40)
  noteTutorialPlaybackTime(video, playback, 36, 40)
  noteTutorialPlaybackTime(video, playback, 40, 40)
  trackTutorialComplete(video, playback)
  assert.deepEqual(names(env.events), [
    TUTORIAL_EVENTS.IMPRESSION,
    TUTORIAL_EVENTS.PLAY,
    TUTORIAL_EVENTS.PROGRESS,
    TUTORIAL_EVENTS.PROGRESS,
    TUTORIAL_EVENTS.PROGRESS,
    TUTORIAL_EVENTS.COMPLETE,
  ])
  const progress = env.events.filter((entry) => entry[1] === TUTORIAL_EVENTS.PROGRESS).map((entry) => entry[2].progress_percent)
  assert.deepEqual(progress, [25, 50, 75])
  assert.equal(env.events.filter((entry) => entry[1] === TUTORIAL_EVENTS.COMPLETE).length, 1)
  assert.equal(env.events[1][2].video_id, video.id)
  assert.equal(env.events[1][2].feature_id, video.featureId)
  assert.equal(env.events[1][2].video_title, 'Dark Mode')
}

{
  const env = installBrowser({ consent: undefined })
  trackTutorialImpression(video)
  assert.equal(attributeTutorialRegistration({ justRegistered: true, now: Date.now() }), false)
  assert.equal(names(env.events).includes(TUTORIAL_EVENTS.REGISTRATION), false)

  trackTutorialCta(video)
  const sent = attributeTutorialRegistration({ justRegistered: true, now: Date.now() })
  assert.equal(sent, true)
  const registration = env.events.find((entry) => entry[1] === TUTORIAL_EVENTS.REGISTRATION)
  assert.equal(registration[2].relationship, 'attributed')
  assert.equal(registration[2].causation, 'not_established')
  assert.equal(registration[2].watch_completed, false)
  assert.equal(attributeTutorialRegistration({ justRegistered: true, now: Date.now() }), false)
}

{
  const env = installBrowser({ consent: undefined })
  trackTutorialComplete(video, 'done')
  const stored = JSON.parse(env.values.get('mutqin_tutorial_attr'))
  stored.interactions[0].at = Date.now() - (8 * DAY)
  env.values.set('mutqin_tutorial_attr', JSON.stringify(stored))
  assert.equal(attributeTutorialRegistration({ justRegistered: true, now: Date.now() }), false)
}

{
  const env = installBrowser({ consent: false })
  assert.equal(trackTutorialPlay(video, 'blocked'), false)
  assert.equal(trackTutorialProgress(video, 'blocked', 25), false)
  assert.equal(env.events.length, 0)
  assert.equal(env.values.has('mutqin_tutorial_attr'), false)
}

{
  installBrowser({ consent: undefined })
  assert.equal(trackTutorialProgress(video, 'marks', 10), false)
  assert.equal(trackTutorialPlay({ id: 'short', featureId: 'dark-mode', feature: 'Dark Mode' }, 'bad'), false)
}

console.log('tutorial-analytics.test.mjs: ok')
