/**
 * Tutorial discovery events for the existing GA4 tag (window.gtag).
 *
 * No new analytics vendor. No names, emails, or account ids.
 * A registration after a tutorial interaction is attributed, never treated
 * as proof that the tutorial caused the signup.
 */

import { analyticsMeasurementAllowed, trackProductEvent } from './productEvents.js'

export const TUTORIAL_EVENTS = Object.freeze({
  IMPRESSION: 'tutorial_impression',
  PLAY: 'tutorial_play',
  PROGRESS: 'tutorial_progress',
  COMPLETE: 'tutorial_complete',
  CTA: 'tutorial_cta_click',
  REGISTRATION: 'tutorial_registration',
})

const STORAGE_KEY = 'mutqin_tutorial_attr'
const WINDOW_MS = 7 * 24 * 60 * 60 * 1000
const QUALIFYING = new Set(['play', 'progress', 'complete', 'cta'])
const PROGRESS_MARKS = new Set([25, 50, 75])

const sentKeys = new Set()
const impressed = new Set()

function storage() {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage
  } catch {
    return null
  }
}

function safeVideoId(value) {
  const text = String(value || '').trim()
  return /^[A-Za-z0-9_-]{11}$/.test(text) ? text : ''
}

function safeFeatureId(value) {
  const text = String(value || '').trim()
  return /^[a-z0-9-]{1,40}$/.test(text) ? text : ''
}

function safeTitle(value) {
  const text = String(value || '')
    .replace(/[^\p{L}\p{N} &'|:-]+/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim()
  if (!text || text.length > 80 || /@/.test(text)) return ''
  return text
}

function videoParams(video) {
  const videoId = safeVideoId(video?.id)
  const featureId = safeFeatureId(video?.featureId)
  const videoTitle = safeTitle(video?.feature)
  if (!videoId || !featureId || !videoTitle) return null
  return {
    video_id: videoId,
    feature_id: featureId,
    video_title: videoTitle,
  }
}

function send(eventName, params) {
  if (!analyticsMeasurementAllowed()) return false
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return false
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

export function clearTutorialAttribution() {
  sentKeys.clear()
  impressed.clear()
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

function rememberInteraction(video, kind) {
  if (!QUALIFYING.has(kind) || !analyticsMeasurementAllowed()) return
  const params = videoParams(video)
  if (!params) return
  const record = readRecord()
  record.interactions.push({
    ...params,
    kind,
    at: Date.now(),
  })
  writeRecord(record)
}

export function trackTutorialImpression(video) {
  try {
    const params = videoParams(video)
    if (!params || impressed.has(params.video_id)) return false
    impressed.add(params.video_id)
    return send(TUTORIAL_EVENTS.IMPRESSION, params)
  } catch {
    return false
  }
}

export function trackTutorialPlay(video, playbackId) {
  try {
    const params = videoParams(video)
    if (!params) return false
    return once(`${playbackId}:play`, () => {
      rememberInteraction(video, 'play')
      trackProductEvent('tutorial_played', params, { onceKey: `tutorial-play:${playbackId}` })
      return send(TUTORIAL_EVENTS.PLAY, params)
    })
  } catch {
    return false
  }
}

export function trackTutorialProgress(video, playbackId, percent) {
  try {
    const mark = Number(percent)
    if (!PROGRESS_MARKS.has(mark)) return false
    const params = videoParams(video)
    if (!params) return false
    return once(`${playbackId}:progress:${mark}`, () => {
      rememberInteraction(video, 'progress')
      return send(TUTORIAL_EVENTS.PROGRESS, { ...params, progress_percent: mark })
    })
  } catch {
    return false
  }
}

export function trackTutorialComplete(video, playbackId) {
  try {
    const params = videoParams(video)
    if (!params) return false
    return once(`${playbackId}:complete`, () => {
      rememberInteraction(video, 'complete')
      trackProductEvent('tutorial_completed', params, { onceKey: `tutorial-complete:${playbackId}` })
      return send(TUTORIAL_EVENTS.COMPLETE, params)
    })
  } catch {
    return false
  }
}

export function noteTutorialPlaybackTime(video, playbackId, current, duration) {
  try {
    const length = Number(duration)
    const time = Number(current)
    if (!(length > 0) || !(time >= 0)) return
    const ratio = time / length
    if (ratio >= 0.25) trackTutorialProgress(video, playbackId, 25)
    if (ratio >= 0.5) trackTutorialProgress(video, playbackId, 50)
    if (ratio >= 0.75) trackTutorialProgress(video, playbackId, 75)
    if (ratio >= 0.9) trackTutorialComplete(video, playbackId)
  } catch {
    /* playback continues */
  }
}

export function trackTutorialCta(video) {
  try {
    const params = videoParams(video)
    if (!params) return false
    rememberInteraction(video, 'cta')
    return send(TUTORIAL_EVENTS.CTA, params)
  } catch {
    return false
  }
}

/**
 * Fire when a registration just completed. Qualifying interactions are play,
 * progress, completion, or the feature link — not a mere impression — inside
 * seven days. `causation` stays `not_established`: watching is not proof of cause.
 */
export function attributeTutorialRegistration({ justRegistered = false, now = Date.now() } = {}) {
  try {
    if (!justRegistered) return false
    if (!analyticsMeasurementAllowed()) {
      clearTutorialAttribution()
      return false
    }
    const qualifying = readRecord().interactions.filter((item) => (
      QUALIFYING.has(item?.kind)
      && safeVideoId(item.video_id)
      && safeFeatureId(item.feature_id)
      && Number.isFinite(item.at)
      && now >= item.at
      && now - item.at <= WINDOW_MS
    ))
    if (!qualifying.length) return false
    const first = qualifying.slice().sort((a, b) => a.at - b.at)[0]
    const sent = send(TUTORIAL_EVENTS.REGISTRATION, {
      video_id: first.video_id,
      feature_id: first.feature_id,
      video_title: safeTitle(first.video_title),
      relationship: 'attributed',
      causation: 'not_established',
      watch_completed: qualifying.some((item) => item.kind === 'complete'),
    })
    if (sent) clearTutorialAttribution()
    return sent
  } catch {
    return false
  }
}

export function resetTutorialAnalyticsForTests() {
  sentKeys.clear()
  impressed.clear()
  try {
    storage()?.removeItem(STORAGE_KEY)
  } catch {
    /* ignore */
  }
}
