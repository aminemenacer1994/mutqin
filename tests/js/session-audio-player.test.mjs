import assert from 'node:assert/strict'
import { describe, it } from 'node:test'
import { readFileSync } from 'node:fs'
import {
  SessionAudioPlayer,
  SESSION_AUDIO_STATES,
  describeMediaError,
  isBenignMediaError,
  normalizeComparableAudioUrl,
} from '../../resources/js/scripts/audio/sessionAudioPlayer.js'

function createFakeAudio(overrides = {}) {
  const listeners = new Map()
  const audio = {
    src: '',
    currentSrc: '',
    currentTime: 0,
    duration: NaN,
    readyState: 0,
    networkState: 0,
    paused: true,
    ended: false,
    muted: false,
    volume: 1,
    defaultPlaybackRate: 1,
    playbackRate: 1,
    error: null,
    _mutqinUnlockToken: 0,
    getAttribute(name) {
      if (name === 'src') return this.src
      return null
    },
    setAttribute(name, value) {
      if (name === 'src') this.src = value
    },
    removeAttribute(name) {
      if (name === 'src') this.src = ''
    },
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
    load() {
      this.networkState = 2
    },
    play() {
      this.paused = false
      this.ended = false
      this.dispatch('playing')
      return Promise.resolve()
    },
    pause() {
      this.paused = true
      this.dispatch('pause')
    },
    ...overrides,
  }
  return audio
}

describe('SessionAudioPlayer', () => {
  it('owns a single element and reports playback states', async () => {
    const audio = createFakeAudio()
    const states = []
    const player = new SessionAudioPlayer({
      onStateChange: ({ state }) => states.push(state),
    })
    player.bind(audio)
    assert.equal(player.element, audio)

    audio.readyState = 1
    audio.duration = 12
    audio.currentSrc = 'https://cdn.example/a.mp3'
    audio.src = 'https://cdn.example/a.mp3'

    const gen = player.bumpGeneration()
    const attach = await player.attachSource('https://cdn.example/a.mp3', { generation: gen })
    assert.equal(attach.sameSource, true)

    await player.play({ generation: gen })
    assert.equal(player.state, SESSION_AUDIO_STATES.PLAYING)

    player.pause({ generation: gen })
    assert.equal(player.state, SESSION_AUDIO_STATES.PAUSED)
    assert.ok(states.includes(SESSION_AUDIO_STATES.PLAYING))
    assert.ok(states.includes(SESSION_AUDIO_STATES.PAUSED))
  })

  it('does not reload an already-valid same source', async () => {
    let loadCount = 0
    const audio = createFakeAudio({
      src: 'https://cdn.example/a.mp3',
      currentSrc: 'https://cdn.example/a.mp3',
      readyState: 4,
      duration: 10,
      load() {
        loadCount += 1
        this.networkState = 2
      },
    })
    const player = new SessionAudioPlayer()
    player.bind(audio)
    const gen = player.bumpGeneration()
    const result = await player.attachSource('https://cdn.example/a.mp3', { generation: gen })
    assert.equal(result.sameSource, true)
    assert.equal(loadCount, 0)
  })

  it('cancels stale play() with generation tokens', async () => {
    const audio = createFakeAudio({
      src: 'https://cdn.example/a.mp3',
      currentSrc: 'https://cdn.example/a.mp3',
      readyState: 4,
      duration: 10,
      play() {
        this.paused = false
        return new Promise((resolve) => setTimeout(resolve, 30))
      },
    })
    const player = new SessionAudioPlayer()
    player.bind(audio)
    const first = player.bumpGeneration()
    const playPromise = player.play({ generation: first })
    player.bumpGeneration()
    await assert.rejects(playPromise, /superseded/)
    assert.equal(audio.paused, true)
  })

  it('never leaves playing state after play() rejection', async () => {
    const audio = createFakeAudio({
      src: 'https://cdn.example/a.mp3',
      currentSrc: 'https://cdn.example/a.mp3',
      readyState: 4,
      duration: 10,
      play() {
        return Promise.reject(Object.assign(new Error('blocked'), { name: 'NotAllowedError' }))
      },
    })
    const player = new SessionAudioPlayer()
    player.bind(audio)
    const gen = player.bumpGeneration()
    await assert.rejects(player.play({ generation: gen }))
    assert.notEqual(player.state, SESSION_AUDIO_STATES.PLAYING)
    assert.equal(player.isPlaying, false)
  })

  it('cleans up listeners on destroy', () => {
    const audio = createFakeAudio()
    const player = new SessionAudioPlayer()
    player.bind(audio)
    player.destroy()
    assert.equal(player.element, null)
    assert.equal(player.state, SESSION_AUDIO_STATES.IDLE)
  })

  it('classifies abort / empty-src errors as benign', () => {
    assert.equal(isBenignMediaError({ error: { code: 1 }, getAttribute: () => 'x', currentSrc: 'x' }), true)
    assert.equal(isBenignMediaError({
      error: { code: 4 },
      getAttribute: () => '',
      currentSrc: '',
    }), true)
    assert.equal(isBenignMediaError({
      error: { code: 2 },
      getAttribute: () => 'https://x',
      currentSrc: 'https://x',
    }), false)
    assert.equal(describeMediaError({ error: { code: 3, message: 'decode' } }).label, 'MEDIA_ERR_DECODE')
    assert.equal(
      normalizeComparableAudioUrl('https://cdn.example/a.mp3?x=1'),
      'https://cdn.example/a.mp3?x=1'
    )
  })
})

describe('Memorisation session audio ownership', () => {
  const source = readFileSync(
    new URL('../../resources/js/views/Memorisation.js', import.meta.url),
    'utf8'
  )

  it('uses SessionAudioPlayer as the main playback owner', () => {
    assert.match(source, /from '\.\.\/scripts\/audio\/sessionAudioPlayer'/)
    assert.match(source, /new SessionAudioPlayer\(/)
    assert.match(source, /beginPlaybackGeneration\(\)/)
    assert.match(source, /promptAudioPlaybackRetry\(/)
    assert.match(source, /sessionAudioPlayer\?\.destroy/)
  })

  it('does not create competing ayah Audio() fallbacks', () => {
    assert.doesNotMatch(source, /fallbackAudio = new Audio\(/)
    assert.match(
      source,
      /async attemptMutedAutoplayRecovery\(\) \{[\s\S]*return false/
    )
    assert.doesNotMatch(
      source,
      /async attemptMutedAutoplayRecovery\(\) \{[\s\S]*audio\.muted = true[\s\S]*await audio\.play\(\)/
    )
  })

  it('keeps playVerse race-safe with a single play() path', () => {
    assert.match(
      source,
      /async playVerse\([\s\S]*const playGeneration = this\.beginPlaybackGeneration\(\)[\s\S]*await player\.play\(/
    )
    assert.match(
      source,
      /togglePlay\(\) \{[\s\S]*this\.isPlaying = false[\s\S]*promptAudioPlaybackRetry/
    )
  })
})
