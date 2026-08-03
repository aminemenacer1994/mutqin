import assert from 'node:assert/strict'
import {
  AMD_AUTO_FOLLOW_PREF_KEY,
  AUTO_FOLLOW_IDLE_RESUME_MS,
  AUTO_FOLLOW_MAX_RATIO,
  AUTO_FOLLOW_MIN_DELTA_PX,
  AUTO_FOLLOW_MIN_RATIO,
  AUTO_FOLLOW_TARGET_RATIO,
  buildWordElementCache,
  computeAutoFollowScroll,
  createLiveAutoFollowController,
  prefersReducedMotion,
  readStoredAutoFollowEnabled,
  resolveActiveWordElement,
  storeAutoFollowEnabled,
} from '../../resources/js/scripts/memorisationDetection/liveAutoFollow.js'

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

// Preference is always on (product rule); store always writes enabled.
{
  const storage = createMemoryStorage()
  assert.equal(readStoredAutoFollowEnabled(storage), true)
  storeAutoFollowEnabled(false, storage)
  assert.equal(storage.getItem(AMD_AUTO_FOLLOW_PREF_KEY), '1')
  assert.equal(readStoredAutoFollowEnabled(storage), true)
  storeAutoFollowEnabled(true, storage)
  assert.equal(readStoredAutoFollowEnabled(storage), true)
}

// No-scroll when the active word remains inside the preferred reading zone.
{
  const plan = computeAutoFollowScroll({
    containerHeight: 400,
    scrollTop: 100,
    scrollHeight: 2000,
    activeOffsetTop: 400 * AUTO_FOLLOW_TARGET_RATIO,
    activeHeight: 28,
  })
  assert.equal(plan.shouldScroll, false)
  assert.equal(plan.reason, 'in_zone')
  assert.ok(plan.ratio >= AUTO_FOLLOW_MIN_RATIO && plan.ratio <= AUTO_FOLLOW_MAX_RATIO)
}

// Active-word positioning: scroll toward ~40% when below the zone.
{
  const plan = computeAutoFollowScroll({
    containerHeight: 400,
    scrollTop: 0,
    scrollHeight: 2400,
    activeOffsetTop: 360,
    activeHeight: 30,
  })
  assert.equal(plan.shouldScroll, true, 'word near bottom should trigger follow')
  assert.equal(plan.reason, 'below_zone')
  const expected = 0 + (360 + 30 * 0.35) - 400 * AUTO_FOLLOW_TARGET_RATIO
  assert.ok(Math.abs(plan.nextScrollTop - expected) < 1)
}

// Active-word positioning: scroll when above the zone.
{
  const plan = computeAutoFollowScroll({
    containerHeight: 400,
    scrollTop: 500,
    scrollHeight: 2400,
    activeOffsetTop: 20,
    activeHeight: 24,
  })
  assert.equal(plan.shouldScroll, true)
  assert.equal(plan.reason, 'above_zone')
}

// Micro-movements are ignored.
{
  const plan = computeAutoFollowScroll({
    containerHeight: 400,
    scrollTop: 200,
    scrollHeight: 2400,
    activeOffsetTop: 400 * AUTO_FOLLOW_MAX_RATIO + 2,
    activeHeight: 10,
    minDeltaPx: AUTO_FOLLOW_MIN_DELTA_PX,
  })
  // May or may not scroll depending on delta — if it would move < min delta, skip.
  if (plan.shouldScroll) {
    assert.ok(plan.delta >= AUTO_FOLLOW_MIN_DELTA_PX)
  } else {
    assert.ok(plan.reason === 'micro_delta' || plan.reason === 'in_zone')
  }
}

// Word element cache + stable IDs avoid full rescans when indexes are known.
{
  const root = {
    querySelectorAll(selector) {
      assert.equal(selector, '[data-recitation-word-index]')
      return [
        {
          getAttribute: (name) => (name === 'data-recitation-word-index' ? '3' : null),
          isConnected: true,
          className: 'wbw-word',
        },
        {
          getAttribute: (name) => (name === 'data-recitation-word-index' ? '7' : null),
          isConnected: true,
          className: 'wbw-word amd-word-current',
        },
      ]
    },
    querySelector() {
      throw new Error('should use cache for known indexes')
    },
  }
  const cache = buildWordElementCache(root)
  assert.equal(cache.size, 2)
  const active = resolveActiveWordElement(root, cache, 7)
  assert.equal(active.getAttribute('data-recitation-word-index'), '7')
}

// Manual-scroll pause + resume behaviour + idle resume.
{
  let now = 1000
  let followNowCalls = 0
  const timers = []
  const realSetTimeout = global.setTimeout
  const realClearTimeout = global.clearTimeout
  global.setTimeout = (fn, ms) => {
    const id = { fn, ms, at: now + ms }
    timers.push(id)
    return id
  }
  global.clearTimeout = (id) => {
    const idx = timers.indexOf(id)
    if (idx >= 0) timers.splice(idx, 1)
  }

  try {
    const controller = createLiveAutoFollowController({
      enabled: true,
      now: () => now,
      idleResumeMs: AUTO_FOLLOW_IDLE_RESUME_MS,
      followNow: () => { followNowCalls += 1 },
    })

    assert.equal(controller.isFollowing, true)
    assert.equal(controller.onContainerScroll(), true, 'manual scroll pauses follow')
    assert.equal(controller.paused, true)
    assert.equal(controller.isFollowing, false)

    // Explicit resume.
    controller.resume({ followNow: true })
    assert.equal(controller.paused, false)
    assert.equal(followNowCalls, 1)

    controller.pauseFromManualScroll()
    assert.equal(controller.paused, true)
    now += AUTO_FOLLOW_IDLE_RESUME_MS
    // Fire due idle timers.
    timers.splice(0).forEach((timer) => timer.fn())
    assert.equal(controller.paused, false, 'idle period resumes auto-follow')
    assert.equal(followNowCalls, 2)

    controller.setEnabled(false, { persist: false })
    assert.equal(controller.onContainerScroll(), false, 'disabled follow ignores manual scroll pause')
    controller.dispose()
  } finally {
    global.setTimeout = realSetTimeout
    global.clearTimeout = realClearTimeout
  }
}

// Reduced motion: applyScroll uses instant assignment, not smooth scrollTo.
{
  const scrolls = []
  const container = {
    scrollTop: 0,
    clientHeight: 400,
    scrollHeight: 2000,
    scrollTo(opts) { scrolls.push(['scrollTo', opts]) },
  }
  Object.defineProperty(container, 'scrollTop', {
    get() { return this._top || 0 },
    set(v) { this._top = v; scrolls.push(['assign', v]) },
    configurable: true,
  })
  container._top = 0

  const controller = createLiveAutoFollowController({ enabled: true })
  controller.applyScroll(container, 180, { reducedMotion: true })
  assert.equal(container.scrollTop, 180)
  assert.ok(scrolls.some(([type]) => type === 'assign'))
  assert.ok(!scrolls.some(([type, opts]) => type === 'scrollTo' && opts?.behavior === 'smooth'))
  controller.dispose()
}

// Reduced-motion helper
{
  assert.equal(prefersReducedMotion(() => ({ matches: true })), true)
  assert.equal(prefersReducedMotion(() => ({ matches: false })), false)
}

// Controller does not scroll when word stays in zone (mobile-sized viewport too).
{
  const container = {
    scrollTop: 0,
    clientHeight: 640,
    scrollHeight: 1800,
    getBoundingClientRect: () => ({ top: 100, height: 640 }),
    scrollTo() { throw new Error('should not scroll') },
  }
  Object.defineProperty(container, 'scrollTop', {
    get() { return this._top || 0 },
    set() { throw new Error('should not scroll') },
    configurable: true,
  })
  container._top = 0

  const activeEl = {
    getBoundingClientRect: () => ({
      top: 100 + 640 * AUTO_FOLLOW_TARGET_RATIO,
      height: 32,
    }),
  }
  const controller = createLiveAutoFollowController({ enabled: true })
  const result = controller.followActive({
    container,
    root: { querySelector: () => activeEl },
    activeIndex: 12,
    reducedMotion: true,
  })
  assert.equal(result.scrolled, false)
  assert.equal(result.reason, 'in_zone')
  controller.dispose()
}

console.log('ai-memorisation-auto-follow.test.mjs: ok')
