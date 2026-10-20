import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import {
  probeIndeterminateMediaDuration,
  readMediaDuration,
  sanitizeAudioDuration,
} from '../../resources/js/scripts/audio/recordingPlayback.js'

function createFakeAudio(overrides = {}) {
  const listeners = new Map()
  const audio = {
    src: '',
    currentSrc: '',
    duration: NaN,
    readyState: 0,
    paused: true,
    addEventListener(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set())
      listeners.get(name).add(fn)
    },
    removeEventListener(name, fn) {
      listeners.get(name)?.delete(fn)
    },
    dispatch(name) {
      for (const fn of listeners.get(name) || []) fn({ target: audio })
    },
    ...overrides,
  }
  if (!('currentTime' in overrides)) audio.currentTime = 0
  return audio
}

describe('recording playback duration', () => {
  it('readMediaDuration ignores Infinity and NaN', () => {
    assert.equal(readMediaDuration({ duration: Infinity }), 0)
    assert.equal(readMediaDuration({ duration: NaN }), 0)
    assert.equal(readMediaDuration({ duration: 12.4 }), 12.4)
    assert.equal(sanitizeAudioDuration(-1), 0)
  })

  it('probeIndeterminateMediaDuration resolves from seeked currentTime', async () => {
    let storedTime = 0
    const listeners = new Map()
    const audio = {
      readyState: 2,
      duration: Infinity,
      paused: true,
      get currentTime() {
        return storedTime
      },
      set currentTime(value) {
        storedTime = value === 1e10 ? 8.2 : value
        if (value === 1e10) {
          this.duration = 8.2
          queueMicrotask(() => {
            for (const fn of listeners.get('seeked') || []) fn({ target: audio })
          })
        }
      },
      addEventListener(name, fn) {
        if (!listeners.has(name)) listeners.set(name, new Set())
        listeners.get(name).add(fn)
      },
      removeEventListener(name, fn) {
        listeners.get(name)?.delete(fn)
      },
    }

    const duration = await probeIndeterminateMediaDuration(audio, { timeoutMs: 500 })
    assert.equal(duration, 8.2)
    assert.equal(storedTime, 0)
  })
})
