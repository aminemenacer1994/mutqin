import assert from 'node:assert/strict'
import {
  AMD_MISTAKE_SOUND_PREF_KEY,
  MISTAKE_HANDLING_MODES,
  MISTAKE_CUE_DEBOUNCE_MS,
  MISTAKE_CUE_MIN_CONFIDENCE,
  createMistakeFeedbackController,
  isConfirmedMistakeStatus,
  normaliseMistakeSoundEnabled,
  readStoredMistakeSoundEnabled,
  shouldPlayMistakeCue,
  storeMistakeSoundEnabled,
} from '../../resources/js/scripts/memorisationDetection/mistakeFeedback.js'

function createMemoryStorage(seed = {}) {
  const map = new Map(Object.entries(seed))
  return {
    getItem(key) {
      return map.has(key) ? map.get(key) : null
    },
    setItem(key, value) {
      map.set(key, String(value))
    },
  }
}

function createMockAudioContext() {
  const sources = []
  return {
    state: 'running',
    sampleRate: 44100,
    resume: async () => { this.state = 'running' },
    close: async () => {},
    createBuffer(channels, length, sampleRate) {
      return {
        duration: length / sampleRate,
        getChannelData: () => new Float32Array(length),
      }
    },
    createBufferSource() {
      const source = {
        buffer: null,
        onended: null,
        connect() { return this },
        start() {
          sources.push(this)
          queueMicrotask(() => this.onended?.())
        },
      }
      return source
    },
    createGain() {
      return {
        gain: { value: 1 },
        connect() { return this },
      }
    },
    destination: {},
    _sources: sources,
  }
}

// Preference persistence
{
  const storage = createMemoryStorage()
  assert.equal(readStoredMistakeSoundEnabled(storage), true, 'default preference is on')
  storeMistakeSoundEnabled(false, storage)
  assert.equal(storage.getItem(AMD_MISTAKE_SOUND_PREF_KEY), '0')
  assert.equal(readStoredMistakeSoundEnabled(storage), false)
  storeMistakeSoundEnabled(true, storage)
  assert.equal(readStoredMistakeSoundEnabled(storage), true)
  assert.equal(normaliseMistakeSoundEnabled('off'), false)
  assert.equal(normaliseMistakeSoundEnabled('on'), true)
}

// Gate: one confirmed mistake only
{
  assert.equal(isConfirmedMistakeStatus('incorrect'), true)
  assert.equal(isConfirmedMistakeStatus('omitted'), true)
  assert.equal(isConfirmedMistakeStatus('skipped'), true)
  assert.equal(isConfirmedMistakeStatus('correct'), false)
  assert.equal(isConfirmedMistakeStatus('partial'), false)

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    reviewing: false,
    muted: false,
  }).play, true, 'confirmed incorrect should cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'omitted',
    micActive: true,
  }).play, true, 'confirmed omitted should cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'skipped',
    micActive: true,
  }).play, true, 'out-of-order skipped should cue')
}

// No sound for correct / uncertain / interim / muted / inactive / review / duplicates / low confidence
{
  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'correct',
    micActive: true,
  }).play, false, 'correct must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'partial',
    micActive: true,
  }).play, false, 'close-match/partial must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    interim: true,
  }).play, false, 'interim hypotheses must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    muted: true,
  }).play, false, 'muted must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: false,
  }).play, false, 'inactive mic must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    reviewing: true,
  }).play, false, 'result review must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'incorrect',
    nextStatus: 'incorrect',
    micActive: true,
  }).play, false, 'already confirmed must not re-cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    alreadySignalled: true,
  }).play, false, 'duplicate word index must not cue')

  assert.equal(shouldPlayMistakeCue({
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    micActive: true,
    confidence: MISTAKE_CUE_MIN_CONFIDENCE - 0.2,
  }).play, false, 'low-confidence detections must not cue')
}

// Controller: one sound per confirmed mistake, muted, preference, no duplicates
{
  let now = 1_000
  const storage = createMemoryStorage()
  const audioContext = createMockAudioContext()
  const controller = createMistakeFeedbackController({
    storage,
    audioContext,
    enabled: true,
    now: () => now,
  })

  assert.equal(controller.preload(), true)
  assert.equal(await controller.prepareAfterUserGesture(), true)

  const first = controller.notifyWordTransition({
    wordIndex: 2,
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    confidence: 0.9,
    micActive: true,
    reviewing: false,
  })
  assert.equal(first.played, true, 'first confirmed mistake plays once')
  assert.equal(first.visual, true)
  assert.equal(first.shouldStop, false, 'default continue-and-review mode')
  assert.equal(audioContext._sources.length, 1)

  const duplicate = controller.notifyWordTransition({
    wordIndex: 2,
    previousStatus: 'incorrect',
    nextStatus: 'incorrect',
    confidence: 0.9,
    micActive: true,
  })
  assert.equal(duplicate.played, false, 'same word must not re-play')
  assert.equal(audioContext._sources.length, 1)

  now += MISTAKE_CUE_DEBOUNCE_MS + 5
  const correct = controller.notifyWordTransition({
    wordIndex: 3,
    previousStatus: 'pending',
    nextStatus: 'correct',
    micActive: true,
  })
  assert.equal(correct.played, false, 'correct words never play')

  now += MISTAKE_CUE_DEBOUNCE_MS + 5
  const uncertain = controller.notifyWordTransition({
    wordIndex: 4,
    previousStatus: 'pending',
    nextStatus: 'partial',
    micActive: true,
  })
  assert.equal(uncertain.played, false, 'uncertain/partial never plays')

  controller.setEnabled(false, { persist: true })
  assert.equal(readStoredMistakeSoundEnabled(storage), false, 'muted preference persists')
  now += MISTAKE_CUE_DEBOUNCE_MS + 5
  const muted = controller.notifyWordTransition({
    wordIndex: 5,
    previousStatus: 'pending',
    nextStatus: 'omitted',
    micActive: true,
  })
  assert.equal(muted.played, false, 'muted state blocks playback')
  assert.equal(audioContext._sources.length, 1)

  controller.setEnabled(true, { persist: true })
  controller.resetSessionSignals()
  now += MISTAKE_CUE_DEBOUNCE_MS + 5
  const afterReset = controller.notifyWordTransition({
    wordIndex: 2,
    previousStatus: 'pending',
    nextStatus: 'incorrect',
    confidence: 0.88,
    micActive: true,
  })
  assert.equal(afterReset.played, true, 'session reset allows the same index again')
  assert.equal(audioContext._sources.length, 2)

  controller.setMode(MISTAKE_HANDLING_MODES.STOP_ON_MISTAKE)
  now += MISTAKE_CUE_DEBOUNCE_MS + 5
  const stopMode = controller.notifyWordTransition({
    wordIndex: 8,
    previousStatus: 'pending',
    nextStatus: 'skipped',
    confidence: 0.9,
    micActive: true,
  })
  assert.equal(stopMode.played, true)
  assert.equal(stopMode.shouldStop, true, 'stop-on-mistake mode requests a stop')

  controller.dispose()
}

console.log('ai-memorisation-mistake-sound.test.mjs: ok')
