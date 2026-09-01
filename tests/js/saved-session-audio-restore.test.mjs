/**
 * Saved / in-progress session restore must rehydrate audio, then countdown → play.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')

assert.match(source, /prepareRestoredSessionAudio\s*\(/)
assert.match(source, /resumeRestoredSessionWithCountdown\s*\(/)
assert.match(source, /_restoredAudioPrepKey/)

// Resolve from active ayah + reciter; do not bail on stale persisted src mismatch.
assert.match(
  source,
  /prepareRestoredSessionAudio\(options = \{\}\) \{[\s\S]*ensureVerseAudioUrl\(verse\)/,
)
assert.doesNotMatch(
  source,
  /applyRestoredAudioState\(options = \{\}\) \{[\s\S]*activeAudio !== restoredAudio[\s\S]*return/,
)

// Hydrate preloads source only; countdown owns playback start.
assert.match(
  source,
  /hydrateSessionFromPayload\(payload[\s\S]*prepareRestoredSessionAudio\(\{[\s\S]*autoplay: false/,
)

// Login / saved restore: 3-2-1 countdown then audio plays.
assert.match(
  source,
  /resumeRestoredSessionWithCountdown\(\) \{[\s\S]*showCountdown\(async \(\) => \{[\s\S]*playQueueEntry\(entry, \{ force: true, queueIndex: this\.queueIndex \}\)/,
)
assert.match(source, /revealLoadedPreviousSession\(\)[\s\S]*resumeRestoredSessionWithCountdown\(\)/)
assert.match(source, /loadSavedSession\(sessionId\)[\s\S]*resumeRestoredSessionWithCountdown\(\)/)

// Explicit header Resume (mid-session) skips countdown.
assert.match(source, /continueLastSession\(\{ skipCountdown: true, prepareOnly \}\)/)
assert.match(source, /softResumePausedSession\(options = \{\}\)[\s\S]*autoplay = options\.autoplay !== false/)

// Stale audio from prior session/user is cleared before attach.
assert.match(
  source,
  /prepareRestoredSessionAudio\(options = \{\}\) \{[\s\S]*softPausePlayback\(\)[\s\S]*claimAudioElement\(this\.audioElement\)/,
)
assert.match(source, /stopSessionMediaResources\(\)[\s\S]*_restoredAudioPrepKey = null/)

console.log('saved-session-audio-restore.test.mjs: ok')
