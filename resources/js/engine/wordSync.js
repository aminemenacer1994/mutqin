// Advanced word-by-word audio synchronisation engine for Quran recitation.
//
// This is a framework-agnostic engine. It owns nothing about the DOM or Vue.
// It is driven by a "clock" (normally an HTMLAudioElement's currentTime) and
// emits an active-word index to a render callback only when that index changes
// (or when a forced resync is requested).
//
// Architecture (see flow below):
//   Audio clock -> Playback Observer (rAF) -> Interpolator (hysteresis) ->
//   Drift Correction Loop -> Render Scheduler (onRender callback)
//
// Design goals: stable, drift-resistant, smooth under jank/buffering,
// correctable in real time, mobile-friendly, low-latency, never crashes the UI.

const DEFAULT_OPTIONS = {
  // Hysteresis margin (seconds) applied around word boundaries so that a
  // currentTime oscillating near a boundary does not toggle the highlight.
  hysteresisSeconds: 0.045,
  // Overlap tolerance (seconds): each word window is expanded by this amount so
  // small timestamp inaccuracies / gaps still resolve to a word.
  overlapToleranceSeconds: 0.06,
  // How often the authoritative drift-correction loop runs (ms).
  driftCheckIntervalMs: 700,
  // If, during a drift check, the clock sits outside the committed word's
  // window by more than this many seconds, snap immediately to the true word.
  driftThresholdSeconds: 0.1,
  // Optional hard cap on render-evaluation rate (ms between frame evaluations).
  // 0 = evaluate every animation frame (rAF already caps to the display refresh
  // rate). Set to e.g. 33 to target ~30fps evaluation on very low-end devices.
  minFrameIntervalMs: 0,
  // When the document is hidden the browser throttles rAF heavily; we pause the
  // loop entirely and resync on visibility regain instead of fighting the
  // throttle. Set false to keep ticking while hidden.
  pauseWhenHidden: true,
}

function clampNonNegative(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 0) return 0
  return n
}

function nowMs() {
  if (typeof performance !== 'undefined' && typeof performance.now === 'function') {
    return performance.now()
  }
  return Date.now()
}

export class WordSyncEngine {
  /**
   * @param {object} config
   * @param {() => ({time:number,paused:boolean,ended:boolean,seeking?:boolean,rate?:number}|null)} config.getClock
   *        Returns the current playback state. Returning null/invalid disables ticking safely.
   * @param {(payload:{index:number,previousIndex:number,context:*,time:number,reason:string}) => void} config.onRender
   *        Called ONLY when the active word index changes (or on forced resync).
   * @param {object} [config.options] Tuning overrides (see DEFAULT_OPTIONS).
   */
  constructor({ getClock, onRender, options } = {}) {
    this.getClock = typeof getClock === 'function' ? getClock : () => null
    this.onRender = typeof onRender === 'function' ? onRender : () => {}
    this.options = { ...DEFAULT_OPTIONS, ...(options || {}) }

    // ---- Timestamp Map Layer ----
    // Normalised, monotonic timeline. Each entry: { index, start, end }.
    this.timeline = []
    this.starts = [] // parallel array of start times for fast binary search
    this.context = null // opaque value handed back to onRender (e.g. verse key)

    // ---- Interpolator / committed state ----
    this.committedIndex = -1 // the index currently shown in the UI
    this.cursor = 0 // incremental search hint (amortised O(1) for monotonic play)

    // ---- Loop bookkeeping ----
    this.rafId = null
    this.running = false
    this.lastFrameAt = 0
    this.lastDriftCheckAt = 0

    this._frame = this._frame.bind(this)
    this._onVisibilityChange = this._onVisibilityChange.bind(this)

    if (this.options.pauseWhenHidden && typeof document !== 'undefined' && document.addEventListener) {
      document.addEventListener('visibilitychange', this._onVisibilityChange)
    }
  }

  // -------------------------------------------------------------------------
  // Timestamp Map Layer
  // -------------------------------------------------------------------------

  /**
   * Install a word timeline. Accepts the raw [{index,start,end}] produced by the
   * app and normalises it: sorts by start, repairs NaN / inverted / overlapping
   * windows, and fills gaps so every instant maps to exactly one word.
   * Missing / uncertain data is handled gracefully (entry dropped or repaired).
   */
  setTimeline(timeline, context = null) {
    this.context = context
    const normalised = this._normaliseTimeline(timeline)
    this.timeline = normalised
    this.starts = normalised.map(item => item.start)
    // A new timeline means a new track/verse: the previously committed index is
    // meaningless, so force the next resolve to render fresh (prevents a stale
    // highlight sticking when the new active index happens to match the old).
    this.committedIndex = -1
    this.cursor = 0
    return normalised
  }

  _normaliseTimeline(timeline) {
    if (!Array.isArray(timeline) || !timeline.length) return []

    // Keep only entries with a usable start; tolerate missing `end`.
    const cleaned = []
    for (let i = 0; i < timeline.length; i += 1) {
      const raw = timeline[i]
      if (!raw) continue
      const start = clampNonNegative(raw.start)
      let end = Number(raw.end)
      if (!Number.isFinite(end)) end = NaN // resolved during gap-fill below
      const index = Number.isFinite(Number(raw.index)) ? Number(raw.index) : cleaned.length
      cleaned.push({ index, start, end })
    }
    if (!cleaned.length) return []

    // Sort by start time so binary search and cursor walking stay valid even if
    // the source produced out-of-order or jittery timestamps.
    cleaned.sort((a, b) => a.start - b.start)

    // Repair monotonicity: each word must start no earlier than the previous one
    // and end after it starts. Fill missing/inverted ends from the next start.
    for (let i = 0; i < cleaned.length; i += 1) {
      const cur = cleaned[i]
      const next = cleaned[i + 1]
      if (i > 0 && cur.start < cleaned[i - 1].start) {
        cur.start = cleaned[i - 1].start
      }
      if (!Number.isFinite(cur.end)) {
        cur.end = next ? Math.max(cur.start, next.start) : cur.start + 0.4
      }
      if (cur.end <= cur.start) {
        cur.end = next ? Math.max(cur.start + 0.05, next.start) : cur.start + 0.4
      }
    }

    return cleaned
  }

  hasTimeline() {
    return this.timeline.length > 0
  }

  get activeIndex() {
    return this.committedIndex
  }

  // -------------------------------------------------------------------------
  // Interpolation Engine (boundary resolution + hysteresis)
  // -------------------------------------------------------------------------

  /**
   * Authoritative resolution: which word window contains `time`?
   * Uses an incremental cursor (cheap for monotonic playback) and falls back to
   * binary search after a jump (seek). Returns a position into `this.timeline`,
   * or -1 when before the first word.
   */
  _resolvePosition(time) {
    const tl = this.timeline
    const n = tl.length
    if (!n) return -1
    const tol = this.options.overlapToleranceSeconds

    // Fast path: walk the cursor for small forward/backward motion.
    let c = this.cursor
    if (c < 0) c = 0
    if (c > n - 1) c = n - 1

    if (time + tol < tl[0].start) {
      this.cursor = 0
      return -1
    }
    if (time >= tl[n - 1].start - tol) {
      // At or beyond the final word's start -> stick to last word.
      this.cursor = n - 1
      return n - 1
    }

    // Walk forward while the time is past the current window.
    let steps = 0
    while (c < n - 1 && time > tl[c].end + tol && time >= tl[c + 1].start - tol) {
      c += 1
      steps += 1
      if (steps > n) break // safety
    }
    // Walk backward (e.g. after a small seek back).
    steps = 0
    while (c > 0 && time < tl[c].start - tol) {
      c -= 1
      steps += 1
      if (steps > n) break
    }

    // If the cursor walk did not land inside a window (large jump), binary search.
    if (!this._isWithinPosition(time, c, tol)) {
      c = this._binarySearchPosition(time, tol)
    }

    if (c < 0) c = 0
    this.cursor = c
    return c
  }

  _isWithinPosition(time, pos, tol) {
    const item = this.timeline[pos]
    if (!item) return false
    return time >= item.start - tol && time <= item.end + tol
  }

  _binarySearchPosition(time, tol) {
    const tl = this.timeline
    let low = 0
    let high = tl.length - 1
    let best = 0
    while (low <= high) {
      const mid = (low + high) >> 1
      const item = tl[mid]
      if (time < item.start - tol) {
        high = mid - 1
      } else if (time > item.end + tol) {
        best = mid // candidate: time is past this word; remember it
        low = mid + 1
      } else {
        return mid
      }
    }
    return best
  }

  /**
   * Apply hysteresis so a clock hovering on a boundary does not flicker between
   * two adjacent words. Seeks / large jumps bypass hysteresis and snap.
   */
  _resolveWithHysteresis(time) {
    const tl = this.timeline
    if (!tl.length) return -1
    const rawPos = this._resolvePosition(time)
    const rawIndex = rawPos < 0 ? -1 : tl[rawPos].index

    const committed = this.committedIndex
    if (committed < 0) return rawIndex
    if (rawIndex === committed) return committed

    // Locate the committed entry (committedIndex is a word index, not a position).
    const committedPos = this._positionOfIndex(committed)
    if (committedPos < 0) return rawIndex // committed word no longer in timeline

    const cur = tl[committedPos]
    const h = this.options.hysteresisSeconds

    // Adjacent forward move: require the clock to clear the boundary by `h`.
    if (rawPos === committedPos + 1) {
      return time >= cur.end + h ? rawIndex : committed
    }
    // Adjacent backward move: require the clock to fall below the start by `h`.
    if (rawPos === committedPos - 1) {
      return time <= cur.start - h ? rawIndex : committed
    }
    // Non-adjacent (seek / scrub / buffering jump): accept immediately.
    return rawIndex
  }

  _positionOfIndex(wordIndex) {
    const tl = this.timeline
    for (let i = 0; i < tl.length; i += 1) {
      if (tl[i].index === wordIndex) return i
    }
    return -1
  }

  // -------------------------------------------------------------------------
  // Render Scheduler
  // -------------------------------------------------------------------------

  _commit(index, time, reason) {
    if (index === this.committedIndex && reason !== 'force') return false
    const previousIndex = this.committedIndex
    this.committedIndex = index
    try {
      this.onRender({ index, previousIndex, context: this.context, time, reason })
    } catch (err) {
      // Never let a render error kill the loop.
      if (typeof console !== 'undefined') console.error('WordSyncEngine onRender error', err)
    }
    return true
  }

  // -------------------------------------------------------------------------
  // Drift Correction Loop
  // -------------------------------------------------------------------------

  _driftCorrect(time) {
    if (this.committedIndex < 0) return
    const committedPos = this._positionOfIndex(this.committedIndex)
    if (committedPos < 0) {
      // Committed word vanished from timeline -> snap to truth.
      const pos = this._resolvePosition(time)
      this._commit(pos < 0 ? -1 : this.timeline[pos].index, time, 'drift')
      return
    }
    const cur = this.timeline[committedPos]
    const slack = this.options.driftThresholdSeconds + this.options.overlapToleranceSeconds
    const outsideAhead = time > cur.end + slack
    const outsideBehind = time < cur.start - slack
    if (outsideAhead || outsideBehind) {
      // The hysteresis-held / stale index has diverged from the real clock
      // (buffering, dropped frames, throttling). Snap to the true word now.
      const pos = this._resolvePosition(time)
      this._commit(pos < 0 ? -1 : this.timeline[pos].index, time, 'drift')
    }
  }

  // -------------------------------------------------------------------------
  // Playback Observer (rAF loop)
  // -------------------------------------------------------------------------

  start() {
    if (this.running) return
    if (typeof window === 'undefined' || typeof window.requestAnimationFrame !== 'function') {
      // No rAF available: do a single immediate resolution as a fallback.
      this.resync({ force: false })
      return
    }
    if (this.options.pauseWhenHidden && typeof document !== 'undefined' && document.hidden) {
      // Will start automatically on visibility regain; resolve once now.
      this.resync({ force: false })
      return
    }
    this.running = true
    this.lastFrameAt = 0
    this.lastDriftCheckAt = nowMs()
    this.rafId = window.requestAnimationFrame(this._frame)
  }

  stop() {
    this.running = false
    if (this.rafId != null && typeof window !== 'undefined' && typeof window.cancelAnimationFrame === 'function') {
      window.cancelAnimationFrame(this.rafId)
    }
    this.rafId = null
  }

  _frame(ts) {
    if (!this.running) return

    const clock = this._readClock()
    if (!clock) {
      this.rafId = window.requestAnimationFrame(this._frame)
      return
    }
    if (clock.paused || clock.ended) {
      // Audio stopped advancing (pause / end / stall). Park the loop; resume()
      // or the audio 'playing' handler will restart it.
      this.stop()
      return
    }

    // Optional frame throttle for very low-end devices.
    const minInterval = this.options.minFrameIntervalMs
    if (minInterval > 0) {
      const t = typeof ts === 'number' ? ts : nowMs()
      if (this.lastFrameAt && t - this.lastFrameAt < minInterval) {
        this.rafId = window.requestAnimationFrame(this._frame)
        return
      }
      this.lastFrameAt = t
    }

    this._tick(clock.time)
    this.rafId = window.requestAnimationFrame(this._frame)
  }

  _tick(time) {
    if (!this.timeline.length) return
    const safeTime = clampNonNegative(time)

    // Interpolation + hysteresis -> candidate index. Renders only on change.
    const next = this._resolveWithHysteresis(safeTime)
    this._commit(next, safeTime, 'tick')

    // Periodic authoritative drift correction.
    const t = nowMs()
    if (t - this.lastDriftCheckAt >= this.options.driftCheckIntervalMs) {
      this.lastDriftCheckAt = t
      this._driftCorrect(safeTime)
    }
  }

  _readClock() {
    let clock = null
    try {
      clock = this.getClock()
    } catch {
      clock = null
    }
    if (!clock || typeof clock !== 'object') return null
    const time = Number(clock.time)
    if (!Number.isFinite(time)) return null
    return {
      time,
      paused: !!clock.paused,
      ended: !!clock.ended,
      seeking: !!clock.seeking,
      rate: Number.isFinite(Number(clock.rate)) ? Number(clock.rate) : 1,
    }
  }

  // -------------------------------------------------------------------------
  // Seek / Pause / Resume / public control
  // -------------------------------------------------------------------------

  /**
   * Immediately recompute the active word from the current clock and render,
   * bypassing hysteresis. Use after a seek, rate change, or track swap.
   * @param {object} [opts]
   * @param {boolean} [opts.force] Force an onRender call even if the index is unchanged.
   */
  resync(opts = {}) {
    const clock = this._readClock()
    if (!clock) return
    if (!this.timeline.length) return
    const time = clampNonNegative(clock.time)
    const pos = this._resolvePosition(time)
    const index = pos < 0 ? -1 : this.timeline[pos].index
    this.lastDriftCheckAt = nowMs()
    this._commit(index, time, opts.force ? 'force' : 'seek')
  }

  /** Seek handler: snap instantly with no animation/hysteresis delay. */
  seek() {
    this.resync({ force: true })
  }

  /** Pause handler: freeze state, stop the loop, retain the active word. */
  pause() {
    this.stop()
  }

  /** Resume handler: re-sync from currentTime, then resume the loop. */
  resume() {
    this.resync({ force: false })
    this.start()
  }

  /** Clear committed highlight without touching the timeline. */
  clearActive(time = 0) {
    this._commit(-1, clampNonNegative(time), 'clear')
  }

  /** Reset everything (track ended / changed). */
  reset() {
    this.stop()
    this.timeline = []
    this.starts = []
    this.committedIndex = -1
    this.cursor = 0
    this.context = null
  }

  destroy() {
    this.stop()
    if (this.options.pauseWhenHidden && typeof document !== 'undefined' && document.removeEventListener) {
      document.removeEventListener('visibilitychange', this._onVisibilityChange)
    }
    this.timeline = []
    this.starts = []
    this.onRender = () => {}
    this.getClock = () => null
  }

  _onVisibilityChange() {
    if (typeof document === 'undefined') return
    if (document.hidden) {
      // Browser throttles rAF while hidden; park the loop to save battery/CPU.
      this.stop()
      return
    }
    // Back in view: snap to the true word immediately, then resume ticking if
    // the audio is still playing.
    const clock = this._readClock()
    if (clock && !clock.paused && !clock.ended) {
      this.resync({ force: false })
      this.start()
    }
  }
}

export function createWordSyncEngine(config) {
  return new WordSyncEngine(config)
}

export default WordSyncEngine
