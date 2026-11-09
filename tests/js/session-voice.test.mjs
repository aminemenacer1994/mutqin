import assert from 'node:assert/strict'
import { createSilenceTracker, SESSION_VOICE_SILENCE_MS } from '../../resources/js/scripts/sessionVoice/silence.js'
import { buildSessionVoiceHref } from '../../resources/js/scripts/sessionVoice/href.js'
import { matchSpokenNames, matchSpokenRequest } from '../../resources/js/scripts/sessionVoice/names.js'

const tracker = createSilenceTracker({ silenceMs: SESSION_VOICE_SILENCE_MS })

assert.deepEqual(tracker.push(false, 0), { phase: 'waiting', speechSeen: false, silenceFor: 0 })
assert.deepEqual(tracker.push(false, 5000), { phase: 'waiting', speechSeen: false, silenceFor: 0 })

assert.equal(tracker.push(true, 6000).phase, 'speaking')
assert.equal(tracker.push(false, 6500).phase, 'silence')
assert.equal(tracker.push(true, 7000).phase, 'speaking')
assert.equal(tracker.push(false, 7100).phase, 'silence')
assert.equal(tracker.push(false, 7100 + SESSION_VOICE_SILENCE_MS - 1).phase, 'silence')
assert.equal(tracker.push(false, 7100 + SESSION_VOICE_SILENCE_MS).phase, 'finished')

const href = buildSessionVoiceHref('/memorisation', {
  surah: 1,
  start_ayah: 1,
  end_ayah: 5,
  goal: 'memorise',
  reciter: 'ar.abdurrahmaansudais',
  repetitions: 3,
  speed: 0.5,
})
const params = new URLSearchParams(href.split('?')[1])
assert.equal(params.get('surah'), '1')
assert.equal(params.get('from'), '1')
assert.equal(params.get('to'), '5')
assert.equal(params.get('goal'), 'memorise')
assert.equal(params.get('reciter'), 'ar.abdurrahmaansudais')
assert.equal(params.get('repetitions'), '3')
assert.equal(params.get('speed'), '0.5')
assert.equal(params.get('return'), 'dashboard')

const defaults = buildSessionVoiceHref('/memorisation?setup=1', {
  surah: 67,
  start_ayah: 1,
  end_ayah: 5,
  goal: 'revise',
})
const defaultParams = new URLSearchParams(defaults.split('?')[1])
assert.equal(defaultParams.get('goal'), 'revise')
assert.equal(defaultParams.get('reciter'), null)
assert.equal(defaultParams.get('speed'), null)
assert.equal(defaultParams.get('setup'), '1')

const spoken = matchSpokenNames(
  'I want to recite Sora till Cafrune . And I want the reciter to be . A Sudice .'
)
assert.equal(spoken.surah, 'الكافرون')
assert.equal(spoken.reciter, 'عبد الرحمن السديس')
assert.deepEqual(matchSpokenNames('Play Al-Fatiha'), { surah: '', reciter: '' })

const combined = matchSpokenRequest(
  'I want to recite Sora till Cafrune from verse 1 to 6 at half speed three times. And I want the reciter to be A Sudice.'
)
assert.equal(combined.surah, 'الكافرون')
assert.equal(combined.reciter, 'عبد الرحمن السديس')
assert.equal(combined.mode, 'recite')
assert.equal(combined.start, 1)
assert.equal(combined.end, 6)
assert.equal(combined.speed, 0.5)
assert.equal(combined.repetitions, 3)

console.log('session-voice.test.mjs: ok')
