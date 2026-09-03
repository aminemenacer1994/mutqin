import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const confetti = await import(pathToFileURL(join(root, 'resources/js/utils/viewportConfetti.js')).href)

const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const component = readFileSync(join(root, 'resources/js/components/ViewportConfetti.vue'), 'utf8')

function createFakeCanvas() {
  const style = {
    position: '',
    pointerEvents: '',
    zIndex: '',
    width: '',
    height: '',
  }
  const calls = { clear: 0, draws: 0 }
  const ctx = {
    setTransform() {},
    clearRect() { calls.clear += 1 },
    save() {},
    restore() {},
    translate() {},
    rotate() {},
    fillRect() { calls.draws += 1 },
    beginPath() {},
    rect() {},
    roundRect() {},
    clip() {},
    arc() {},
    fill() { calls.draws += 1 },
  }
  const canvas = {
    width: 0,
    height: 0,
    clientWidth: 0,
    clientHeight: 0,
    style,
    className: '',
    parentNode: null,
    getContext() { return ctx },
    setAttribute() {},
  }
  canvas._calls = calls
  return { canvas, ctx, calls }
}

function createFakeWindow({
  width = 1440,
  height = 900,
  reducedMotion = false,
  dpr = 1,
} = {}) {
  const listeners = new Map()
  const frames = []
  let now = 0
  let rafId = 0
  const { canvas, calls } = createFakeCanvas()
  const bodyChildren = []
  const win = {
    innerWidth: width,
    innerHeight: height,
    devicePixelRatio: dpr,
    matchMedia(query) {
      return {
        matches: String(query).includes('prefers-reduced-motion')
          ? reducedMotion
          : String(query).includes('max-width')
            ? width <= 767
            : false,
      }
    },
    addEventListener(type, fn) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type).add(fn)
    },
    removeEventListener(type, fn) {
      listeners.get(type)?.delete(fn)
    },
    requestAnimationFrame(cb) {
      rafId += 1
      frames.push({ id: rafId, cb })
      return rafId
    },
    cancelAnimationFrame(id) {
      const idx = frames.findIndex((frame) => frame.id === id)
      if (idx >= 0) frames.splice(idx, 1)
    },
    document: {
      createElement(tag) {
        assert.equal(tag, 'canvas')
        return canvas
      },
      body: {
        appendChild(node) {
          canvas.parentNode = this
          bodyChildren.push(node)
        },
        removeChild(node) {
          const idx = bodyChildren.indexOf(node)
          if (idx >= 0) bodyChildren.splice(idx, 1)
          if (node === canvas) canvas.parentNode = null
        },
      },
    },
    _frames: frames,
    _listeners: listeners,
    _bodyChildren: bodyChildren,
    _calls: calls,
    _canvas: canvas,
    advance(ms) {
      now += ms
      const queued = frames.splice(0, frames.length)
      for (const frame of queued) frame.cb(now)
    },
    now() { return now },
  }
  return win
}

test('desktop profile uses a fuller burst; mobile is lighter; both last 3s; reduced-motion skips', () => {
  assert.equal(confetti.resolveViewportConfettiProfile({ reducedMotion: true }).skip, true)
  assert.equal(confetti.resolveViewportConfettiProfile({ reducedMotion: true }).particleCount, 0)

  const desktop = confetti.resolveViewportConfettiProfile({ mobile: false })
  const mobile = confetti.resolveViewportConfettiProfile({ mobile: true })
  assert.equal(desktop.skip, false)
  assert.ok(desktop.particleCount > mobile.particleCount)
  assert.equal(desktop.durationMs, confetti.VIEWPORT_CONFETTI_DURATION_MS)
  assert.equal(mobile.durationMs, confetti.VIEWPORT_CONFETTI_DURATION_MS)
  assert.equal(confetti.VIEWPORT_CONFETTI_DURATION_MS, 3000)
  assert.ok(mobile.particleCount >= 48)
  assert.ok(mobile.particleCount < 90)

  assert.equal(confetti.prefersReducedMotion(() => ({ matches: true })), true)
  assert.equal(confetti.prefersReducedMotion(() => ({ matches: false })), false)
  assert.equal(confetti.isMobileViewport({ innerWidth: 390, matchMedia: () => ({ matches: true }) }), true)
  assert.equal(confetti.isMobileViewport({ innerWidth: 1440, matchMedia: () => ({ matches: false }) }), false)
})

test('canvas is sized to the viewport and updates on resize', () => {
  const win = createFakeWindow({ width: 1440, height: 900, dpr: 2 })
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    random: () => 0.5,
    now: () => win.now(),
  })

  assert.equal(burst.running, true)
  assert.equal(burst.viewport.width, 1440)
  assert.equal(burst.viewport.height, 900)
  assert.equal(win._canvas.width, 2880)
  assert.equal(win._canvas.height, 1800)
  assert.equal(win._canvas.style.width, '1440px')
  assert.equal(win._canvas.style.height, '900px')
  assert.equal(win._canvas.style.pointerEvents, 'none')
  assert.equal(win._canvas.style.zIndex, String(confetti.VIEWPORT_CONFETTI_Z_INDEX))
  assert.ok(win._listeners.get('resize')?.size === 1)

  win.innerWidth = 800
  win.innerHeight = 600
  for (const fn of win._listeners.get('resize') || []) fn()

  assert.equal(burst.viewport.width, 800)
  assert.equal(burst.viewport.height, 600)
  assert.equal(win._canvas.width, 1600)
  assert.equal(win._canvas.height, 1200)

  burst.stop()
  assert.equal(burst.running, false)
  assert.equal(win._listeners.get('resize')?.size || 0, 0)
  assert.equal(win._canvas[confetti.VIEWPORT_CONFETTI_RUN_KEY], undefined)
})

test('a second start on the same canvas does not duplicate the burst', () => {
  const win = createFakeWindow({ width: 1280, height: 800 })
  const first = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    random: () => 0.4,
    now: () => win.now(),
  })
  const count = first.particleCount
  const second = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    random: () => 0.4,
    now: () => win.now(),
  })
  assert.equal(first, second)
  assert.equal(second.particleCount, count)
  first.stop()
})

test('created portal canvas is attached to body and removed on stop', () => {
  const win = createFakeWindow({ width: 1100, height: 720 })
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    random: () => 0.3,
    now: () => win.now(),
  })
  assert.equal(win._bodyChildren.includes(win._canvas), true)
  assert.equal(win._canvas.parentNode, win.document.body)
  burst.stop()
  assert.equal(win._bodyChildren.includes(win._canvas), false)
  assert.equal(win._canvas.parentNode, null)
})

test('reduced-motion skips the animation and still cleans up', () => {
  const win = createFakeWindow({ width: 1440, height: 900, reducedMotion: true })
  let completed = 0
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    reducedMotion: true,
    now: () => win.now(),
    onComplete() { completed += 1 },
  })
  assert.equal(burst.skipped, true)
  assert.equal(burst.running, false)
  assert.equal(burst.particleCount, 0)
  assert.equal(completed, 1)
  assert.equal(win._listeners.get('resize')?.size || 0, 0)
  assert.equal(win._frames.length, 0)
})

test('mobile burst uses fewer particles than desktop', () => {
  const desktopWin = createFakeWindow({ width: 1440, height: 900 })
  const mobileWin = createFakeWindow({ width: 390, height: 844 })
  const desktop = confetti.startViewportConfetti({
    window: desktopWin,
    document: desktopWin.document,
    canvas: desktopWin._canvas,
    random: () => 0.5,
    now: () => desktopWin.now(),
  })
  const mobile = confetti.startViewportConfetti({
    window: mobileWin,
    document: mobileWin.document,
    canvas: mobileWin._canvas,
    random: () => 0.5,
    now: () => mobileWin.now(),
  })
  assert.ok(desktop.particleCount > mobile.particleCount)
  assert.equal(mobile.profile.durationMs, desktop.profile.durationMs)
  assert.equal(desktop.profile.durationMs, 3000)
  desktop.stop()
  mobile.stop()
})

test('host card size is ignored; canvas always covers the viewport', () => {
  const win = createFakeWindow({ width: 1440, height: 900, dpr: 2 })
  const host = { clientWidth: 480, clientHeight: 360 }
  win._canvas.clientWidth = 480
  win._canvas.clientHeight = 360
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    host,
    random: () => 0.5,
    now: () => win.now(),
  })

  assert.equal(burst.viewport.width, 1440)
  assert.equal(burst.viewport.height, 900)
  assert.equal(win._canvas.width, 2880)
  assert.equal(win._canvas.height, 1800)
  assert.equal(win._canvas.style.width, '1440px')
  assert.equal(win._canvas.style.height, '900px')
  assert.equal(win._canvas.style.position, 'fixed')
  assert.equal(win._canvas.style.inset, '0')
  burst.stop()
})

test('mobile canvas is sized to the full phone viewport, not a modal card', () => {
  const win = createFakeWindow({ width: 390, height: 844, dpr: 2 })
  win._canvas.clientWidth = 320
  win._canvas.clientHeight = 280
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    host: { clientWidth: 320, clientHeight: 280 },
    random: () => 0.5,
    now: () => win.now(),
  })

  assert.equal(burst.viewport.width, 390)
  assert.equal(burst.viewport.height, 844)
  assert.equal(win._canvas.style.position, 'fixed')
  assert.equal(win._canvas.style.pointerEvents, 'none')
  burst.stop()
})

test('animation completes and removes listeners without leaving a click overlay', () => {
  const win = createFakeWindow({ width: 1440, height: 900 })
  let completed = 0
  const burst = confetti.startViewportConfetti({
    window: win,
    document: win.document,
    canvas: win._canvas,
    random: () => 0.5,
    now: () => win.now(),
    onComplete() { completed += 1 },
  })
  assert.equal(win._canvas.style.pointerEvents, 'none')
  win.advance(burst.profile.durationMs)
  assert.equal(burst.running, false)
  assert.equal(completed, 1)
  assert.equal(win._frames.length, 0)
  assert.equal(win._listeners.get('resize')?.size || 0, 0)
})

test('completion confetti teleports to the full viewport for 3s and is never clipped to the dialog', () => {
  const dialog = vue.match(/post-session-simple__dialog[\s\S]*?<\/footer>/)?.[0] || ''
  assert.ok(dialog.length > 0)
  assert.doesNotMatch(dialog, /onboarding-post-session-confetti-layer/)
  assert.doesNotMatch(dialog, /postSessionConfettiPieces/)
  assert.doesNotMatch(dialog, /<ViewportConfetti/)
  assert.match(
    vue,
    /<ViewportConfetti\s+v-if="showPostSessionConfetti && !workspaceTourActive && !onboardingSampleSessionActive && !postSessionAiReciteActive"/,
  )
  assert.match(component, /Teleport to="body"/)
  assert.match(component, /position:\s*fixed/)
  assert.match(component, /overflow:\s*visible/)
  assert.match(component, /pointer-events: none/)
  assert.match(component, /prefers-reduced-motion: reduce/)
  assert.match(component, /100dvh/)
  assert.match(js, /import ViewportConfetti from '\.\.\/components\/ViewportConfetti\.vue'/)
  assert.match(js, /VIEWPORT_CONFETTI_DURATION_MS/)
  assert.match(js, /ViewportConfetti,/)
  assert.match(js, /clearPostSessionConfettiTimer\(\)/)
  assert.match(js, /schedulePostSessionConfettiHide\(\)/)
  assert.match(js, /postSessionConfettiTimer: null/)
  assert.match(js, /VIEWPORT_CONFETTI_DURATION_MS\)/)
  assert.doesNotMatch(css, /post-session-simple__dialog--lg \.onboarding-post-session-confetti-layer/)
  assert.doesNotMatch(css, /post-session-simple__dialog > \.viewport-confetti/)
  assert.match(css, /body > \.viewport-confetti/)
  assert.match(css, /prefers-reduced-motion: reduce[\s\S]*viewport-confetti-canvas/)
})

test('session completion still triggers confetti once from openPostSessionModal', () => {
  const open = js.match(/openPostSessionModal\(snapshot = null, options = \{\}\) \{[\s\S]*?schedulePostSessionConfettiHide\(\)/)?.[0]
  assert.ok(open, 'openPostSessionModal still owns the completion trigger')
  assert.match(open, /showPostSessionConfetti = !\(/)
  assert.match(open, /workspaceTourActive/)
  assert.match(open, /onboardingSampleSessionActive/)
  assert.match(open, /clearPostSessionConfettiTimer\(\)/)
  assert.doesNotMatch(open, /window\.setTimeout\(\(\) => \{\s*this\.showPostSessionConfetti = false/)
})
