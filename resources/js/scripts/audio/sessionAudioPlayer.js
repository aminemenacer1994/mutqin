/**
 * Single-owner session ayah playback controller.
 *
 * Owns one HTMLAudioElement, a generation token for race safety, and a small
 * state machine. Does not create competing Audio() instances or muted-autoplay hacks.
 */

export const SESSION_AUDIO_STATES = Object.freeze({
  IDLE: 'idle',
  LOADING: 'loading',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
  STALLED: 'stalled',
  ABORTED: 'aborted',
})

const MEDIA_ERR_ABORTED = 1
const MEDIA_ERR_SRC_NOT_SUPPORTED = 4

export function isBenignMediaError(audio = null) {
  const code = Number(audio?.error?.code || 0)
  if (code === MEDIA_ERR_ABORTED) return true
  const src = String(audio?.getAttribute?.('src') || audio?.currentSrc || '').trim()
  if (code === MEDIA_ERR_SRC_NOT_SUPPORTED && !src) return true
  return false
}

export function describeMediaError(audio = null) {
  const mediaError = audio?.error || null
  const code = Number(mediaError?.code || 0)
  const labels = {
    1: 'MEDIA_ERR_ABORTED',
    2: 'MEDIA_ERR_NETWORK',
    3: 'MEDIA_ERR_DECODE',
    4: 'MEDIA_ERR_SRC_NOT_SUPPORTED',
  }
  return {
    code,
    label: labels[code] || (code ? `MEDIA_ERR_${code}` : 'UNKNOWN'),
    message: mediaError?.message || '',
    src: String(audio?.currentSrc || audio?.getAttribute?.('src') || ''),
  }
}

export function normalizeComparableAudioUrl(url) {
  if (!url || typeof url !== 'string') return ''
  const trimmed = url.trim()
  if (!trimmed) return ''
  try {
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      const absolute = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
      const parsed = new URL(absolute)
      return `${parsed.origin}${parsed.pathname}${parsed.search}`
    }
  } catch {
    // fall through
  }
  return trimmed
}

function urlsMatch(a, b) {
  const left = normalizeComparableAudioUrl(a)
  const right = normalizeComparableAudioUrl(b)
  if (!left || !right) return false
  return left === right || left.endsWith(right) || right.endsWith(left)
}

export class SessionAudioPlayer {
  /**
   * @param {object} [options]
   * @param {(payload:{state:string, previous:string, generation:number, detail?:*}) => void} [options.onStateChange]
   * @param {(event:Event) => void} [options.onTimeUpdate]
   * @param {(event:Event) => void} [options.onEnded]
   * @param {(event:Event, detail:object) => void} [options.onError]
   * @param {(event:Event) => void} [options.onPlaying]
   * @param {(event:Event) => void} [options.onPause]
   * @param {(event:Event) => void} [options.onWaiting]
   * @param {(event:Event) => void} [options.onStalled]
   * @param {(event:Event) => void} [options.onCanPlay]
   * @param {(event:Event) => void} [options.onSeeking]
   * @param {(event:Event) => void} [options.onSeeked]
   * @param {(event:Event) => void} [options.onRateChange]
   * @param {(event:Event) => void} [options.onLoadStart]
   * @param {(event:Event) => void} [options.onLoadedMetadata]
   */
  constructor(options = {}) {
    this.element = null
    this.generation = 0
    this.state = SESSION_AUDIO_STATES.IDLE
    this.ignorePauseEvent = false
    this._handlers = null
    this._waitToken = 0
    this.options = options
  }

  get audio() {
    return this.element
  }

  get isPlaying() {
    return this.state === SESSION_AUDIO_STATES.PLAYING
  }

  bind(element) {
    if (!element) return false
    if (this.element === element && this._handlers) return true
    this.unbind({ keepElement: false, clearSource: false })
    this.element = element
    this._attachListeners()
    if (element.paused) {
      this._setState(element.ended ? SESSION_AUDIO_STATES.ENDED : SESSION_AUDIO_STATES.PAUSED)
    } else {
      this._setState(SESSION_AUDIO_STATES.PLAYING)
    }
    return true
  }

  bumpGeneration() {
    this.generation += 1
    this._waitToken += 1
    return this.generation
  }

  isCurrent(generation) {
    return Number(generation) === Number(this.generation)
  }

  claim() {
    // Invalidate in-flight unlock / wait / play work before taking ownership.
    this.bumpGeneration()
    if (this.element) {
      try { this.element.muted = false } catch { /* ignore */ }
      this.element._mutqinUnlockToken = (Number(this.element._mutqinUnlockToken) || 0) + 1
    }
    return this.generation
  }

  currentSrc() {
    if (!this.element) return ''
    return normalizeComparableAudioUrl(
      this.element.currentSrc || this.element.getAttribute?.('src') || ''
    )
  }

  hasUsableSource() {
    const src = String(this.element?.getAttribute?.('src') || this.element?.currentSrc || '').trim()
    return !!src && src !== 'about:blank' && !src.startsWith('data:')
  }

  isReady() {
    const audio = this.element
    if (!audio) return false
    if (audio.error && !isBenignMediaError(audio)) return false
    const duration = Number(audio.duration || 0)
    return Number(audio.readyState || 0) >= 1 && Number.isFinite(duration) && duration > 0
  }

  /**
   * Attach a source without reloading when the element already holds the same
   * valid URL. Resolves with `{ sameSource, generation }`.
   */
  async attachSource(url, options = {}) {
    const audio = this.element
    const target = normalizeComparableAudioUrl(url)
    if (!audio || !target) {
      throw new Error('Audio source missing')
    }

    const generation = Number.isFinite(options.generation)
      ? Number(options.generation)
      : this.generation
    if (!this.isCurrent(generation)) {
      throw new Error('Audio wait superseded')
    }

    const activeSrc = this.currentSrc()
    const sameSource = urlsMatch(activeSrc, target)
    const needsReload = !!options.forceReload
      || !sameSource
      || Number(audio.readyState || 0) < 1
      || (!!audio.error && !isBenignMediaError(audio))

    if (needsReload) {
      this.ignorePauseEvent = true
      this._setState(SESSION_AUDIO_STATES.LOADING)
      audio.src = url
      try {
        audio.load()
      } catch (error) {
        this._setState(SESSION_AUDIO_STATES.ERROR, { error })
        throw error
      }
      await this.waitUntilReady({ generation, timeoutMs: options.timeoutMs })
    } else if (!this.isReady() && Number(audio.readyState || 0) < 1) {
      this._setState(SESSION_AUDIO_STATES.LOADING)
      await this.waitUntilReady({ generation, timeoutMs: options.timeoutMs })
    }

    if (!this.isCurrent(generation)) {
      throw new Error('Audio wait superseded')
    }

    if (this.state === SESSION_AUDIO_STATES.LOADING) {
      this._setState(audio.paused ? SESSION_AUDIO_STATES.PAUSED : SESSION_AUDIO_STATES.PLAYING)
    }

    return { sameSource, generation }
  }

  waitUntilReady({ generation = this.generation, timeoutMs = 15000 } = {}) {
    const audio = this.element
    if (!audio) return Promise.reject(new Error('No audio element'))
    if (!this.isCurrent(generation)) {
      return Promise.reject(new Error('Audio wait superseded'))
    }

    const isReadyEnough = () => Number(audio.readyState || 0) >= 1
    if (isReadyEnough()) return Promise.resolve()

    const hasSource = !!(audio.currentSrc || audio.getAttribute('src'))
    if (!hasSource) return Promise.reject(new Error('Audio source missing'))

    const waitToken = ++this._waitToken

    return new Promise((resolve, reject) => {
      let settled = false
      let poll = null

      const finish = (fn, value) => {
        if (settled) return
        settled = true
        cleanup()
        fn(value)
      }

      const stale = () => (
        waitToken !== this._waitToken
        || !this.isCurrent(generation)
      )

      const onReady = () => {
        if (stale()) {
          finish(reject, new Error('Audio wait superseded'))
          return
        }
        if (isReadyEnough()) finish(resolve)
      }

      const onError = () => {
        if (stale()) {
          finish(reject, new Error('Audio wait superseded'))
          return
        }
        if (isBenignMediaError(audio)) {
          this._setState(SESSION_AUDIO_STATES.ABORTED)
          return
        }
        if (isReadyEnough()) {
          finish(resolve)
          return
        }
        this._setState(SESSION_AUDIO_STATES.ERROR, { error: describeMediaError(audio) })
        finish(reject, new Error('Audio load error'))
      }

      const timeout = setTimeout(() => {
        if (isReadyEnough()) {
          finish(resolve)
          return
        }
        finish(reject, new Error('Audio load timeout'))
      }, timeoutMs)

      // Re-kick idle aborted loads without interrupting NETWORK_LOADING.
      const nudge = setTimeout(() => {
        if (settled || isReadyEnough() || stale()) return
        const src = audio.getAttribute('src') || audio.currentSrc || ''
        if (!src || src.startsWith('data:')) return
        if (Number(audio.networkState || 0) === 2) return
        try { audio.src = src } catch { /* ignore */ }
      }, 1800)

      const cleanup = () => {
        clearTimeout(timeout)
        clearTimeout(nudge)
        if (poll) clearInterval(poll)
        audio.removeEventListener('loadedmetadata', onReady)
        audio.removeEventListener('loadeddata', onReady)
        audio.removeEventListener('canplay', onReady)
        audio.removeEventListener('canplaythrough', onReady)
        audio.removeEventListener('error', onError)
      }

      audio.addEventListener('loadedmetadata', onReady)
      audio.addEventListener('loadeddata', onReady)
      audio.addEventListener('canplay', onReady)
      audio.addEventListener('canplaythrough', onReady)
      audio.addEventListener('error', onError)
      poll = setInterval(onReady, 200)
      if (isReadyEnough()) finish(resolve)
    })
  }

  async play({ generation = this.generation, rewindIfEnded = true } = {}) {
    const audio = this.element
    if (!audio) throw new Error('Audio player is unavailable')
    if (!this.isCurrent(generation)) throw new Error('Audio play superseded')

    if (rewindIfEnded) {
      try {
        const duration = Number(audio.duration || 0)
        const current = Number(audio.currentTime || 0)
        if (audio.ended || (duration > 0 && current >= duration - 0.05)) {
          audio.currentTime = 0
        }
      } catch { /* ignore seek */ }
    }

    try {
      const result = audio.play()
      if (result && typeof result.then === 'function') {
        await result
      }
      if (!this.isCurrent(generation)) {
        try { audio.pause() } catch { /* ignore */ }
        throw new Error('Audio play superseded')
      }
      this._setState(SESSION_AUDIO_STATES.PLAYING)
      return true
    } catch (error) {
      if (!this.isCurrent(generation)) throw new Error('Audio play superseded')
      // NotPlayingError / AbortError from superseding loads — treat as aborted.
      const name = String(error?.name || '')
      if (name === 'AbortError') {
        this._setState(SESSION_AUDIO_STATES.ABORTED, { error })
      } else {
        this._setState(SESSION_AUDIO_STATES.PAUSED, { error })
      }
      throw error
    }
  }

  pause({ generation = this.generation, bump = false } = {}) {
    if (bump) this.bumpGeneration()
    else if (!this.isCurrent(generation)) return false
    const audio = this.element
    if (!audio) return false
    try { audio.pause() } catch { /* ignore */ }
    this._setState(SESSION_AUDIO_STATES.PAUSED)
    return true
  }

  stop({ clearSource = false, bump = true } = {}) {
    if (bump) this.bumpGeneration()
    const audio = this.element
    if (!audio) {
      this._setState(SESSION_AUDIO_STATES.IDLE)
      return
    }
    this.ignorePauseEvent = true
    try { audio.pause() } catch { /* ignore */ }
    try { audio.currentTime = 0 } catch { /* ignore */ }
    if (clearSource) {
      try {
        audio.removeAttribute('src')
        audio.load()
      } catch { /* ignore */ }
      this._setState(SESSION_AUDIO_STATES.IDLE)
    } else {
      this._setState(SESSION_AUDIO_STATES.PAUSED)
    }
    window.setTimeout(() => {
      this.ignorePauseEvent = false
    }, 120)
  }

  setPlaybackRate(rate) {
    const audio = this.element
    if (!audio) return
    const safe = Math.max(0.5, Math.min(1.5, Number(rate) || 1))
    try {
      audio.defaultPlaybackRate = safe
      audio.playbackRate = safe
    } catch { /* ignore */ }
  }

  seek(time) {
    const audio = this.element
    if (!audio) return
    try {
      audio.currentTime = Math.max(0, Number(time) || 0)
    } catch { /* ignore */ }
  }

  unbind({ keepElement = false, clearSource = false } = {}) {
    this.bumpGeneration()
    this._detachListeners()
    if (this.element) {
      this.ignorePauseEvent = true
      try { this.element.pause() } catch { /* ignore */ }
      if (clearSource) {
        try {
          this.element.removeAttribute('src')
          this.element.load()
        } catch { /* ignore */ }
      }
    }
    if (!keepElement) this.element = null
    this._setState(SESSION_AUDIO_STATES.IDLE)
    this.ignorePauseEvent = false
  }

  destroy() {
    this.unbind({ keepElement: false, clearSource: true })
    this.options = {}
  }

  _setState(next, detail = null) {
    const previous = this.state
    if (previous === next && !detail) return
    this.state = next
    try {
      this.options.onStateChange?.({ state: next, previous, generation: this.generation, detail })
    } catch { /* ignore */ }
  }

  _attachListeners() {
    const audio = this.element
    if (!audio) return

    const handlers = {
      timeupdate: (event) => this.options.onTimeUpdate?.(event),
      ended: (event) => {
        this._setState(SESSION_AUDIO_STATES.ENDED)
        this.options.onEnded?.(event)
      },
      error: (event) => {
        if (isBenignMediaError(audio)) {
          this._setState(SESSION_AUDIO_STATES.ABORTED)
          return
        }
        const detail = describeMediaError(audio)
        this._setState(SESSION_AUDIO_STATES.ERROR, { error: detail })
        this.options.onError?.(event, detail)
      },
      pause: (event) => {
        if (this.ignorePauseEvent) return
        if (!audio.ended) this._setState(SESSION_AUDIO_STATES.PAUSED)
        this.options.onPause?.(event)
      },
      playing: (event) => {
        this._setState(SESSION_AUDIO_STATES.PLAYING)
        this.options.onPlaying?.(event)
      },
      waiting: (event) => {
        if (this.state === SESSION_AUDIO_STATES.PLAYING || !audio.paused) {
          this._setState(SESSION_AUDIO_STATES.STALLED)
        }
        this.options.onWaiting?.(event)
      },
      stalled: (event) => {
        if (this.state === SESSION_AUDIO_STATES.PLAYING || !audio.paused) {
          this._setState(SESSION_AUDIO_STATES.STALLED)
        }
        this.options.onStalled?.(event)
      },
      canplay: (event) => {
        if (this.state === SESSION_AUDIO_STATES.STALLED || this.state === SESSION_AUDIO_STATES.LOADING) {
          this._setState(audio.paused ? SESSION_AUDIO_STATES.PAUSED : SESSION_AUDIO_STATES.PLAYING)
        }
        this.options.onCanPlay?.(event)
      },
      seeking: (event) => this.options.onSeeking?.(event),
      seeked: (event) => this.options.onSeeked?.(event),
      ratechange: (event) => this.options.onRateChange?.(event),
      loadstart: (event) => {
        this._setState(SESSION_AUDIO_STATES.LOADING)
        this.options.onLoadStart?.(event)
      },
      loadedmetadata: (event) => this.options.onLoadedMetadata?.(event),
    }

    Object.entries(handlers).forEach(([name, fn]) => {
      audio.addEventListener(name, fn)
    })
    this._handlers = handlers
  }

  _detachListeners() {
    const audio = this.element
    const handlers = this._handlers
    if (!audio || !handlers) {
      this._handlers = null
      return
    }
    Object.entries(handlers).forEach(([name, fn]) => {
      audio.removeEventListener(name, fn)
    })
    this._handlers = null
  }
}

export default SessionAudioPlayer
