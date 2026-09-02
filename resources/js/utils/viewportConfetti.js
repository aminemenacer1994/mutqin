/**
 * Host-bound canvas confetti. Renders inside a positioned parent (the session
 * complete card) so overflow + border-radius clip the burst to that area.
 */

export const VIEWPORT_CONFETTI_Z_INDEX = 6
export const VIEWPORT_CONFETTI_DURATION_MS = 4000
export const VIEWPORT_CONFETTI_RUN_KEY = '__mutqinViewportConfetti'

const COLORS = [
  '#2f6f58',
  '#b8723c',
  '#d4a24f',
  '#c49a6c',
  '#74d99e',
  '#f4ce9d',
  '#8b5e3c',
  '#58b68e',
]

const SHAPES = ['rect', 'circle', 'streamer', 'diamond']

export function prefersReducedMotion(matchMedia) {
  const query = typeof matchMedia === 'function'
    ? matchMedia
    : (typeof globalThis.matchMedia === 'function' ? globalThis.matchMedia.bind(globalThis) : null)
  try {
    return !!query?.('(prefers-reduced-motion: reduce)')?.matches
  } catch {
    return false
  }
}

export function isMobileViewport(win = globalThis) {
  const width = Number(win?.innerWidth || 0)
  if (width > 0 && width <= 767) return true
  try {
    return !!win?.matchMedia?.('(max-width: 767.98px)')?.matches
  } catch {
    return false
  }
}

export function measureViewport(win = globalThis) {
  return {
    width: Math.max(1, Math.floor(Number(win?.innerWidth) || 1)),
    height: Math.max(1, Math.floor(Number(win?.innerHeight) || 1)),
    dpr: Math.min(2, Math.max(1, Number(win?.devicePixelRatio) || 1)),
  }
}

export function measureConfettiBounds({ host, canvas, window: win = globalThis } = {}) {
  const el = host || canvas
  const width = Math.max(0, Math.floor(Number(el?.clientWidth) || 0))
  const height = Math.max(0, Math.floor(Number(el?.clientHeight) || 0))
  if (width > 0 && height > 0) {
    return {
      width,
      height,
      dpr: Math.min(2, Math.max(1, Number(win?.devicePixelRatio) || 1)),
    }
  }
  return measureViewport(win)
}

export function resolveViewportConfettiProfile({
  reducedMotion = false,
  mobile = false,
} = {}) {
  if (reducedMotion) {
    return { skip: true, particleCount: 0, durationMs: 0 }
  }
  if (mobile) {
    return { skip: false, particleCount: 36, durationMs: VIEWPORT_CONFETTI_DURATION_MS }
  }
  return { skip: false, particleCount: 84, durationMs: VIEWPORT_CONFETTI_DURATION_MS }
}

export function applyCanvasViewportSize(canvas, viewport, ctx) {
  if (!canvas) return viewport
  const { width, height, dpr } = viewport
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  if (canvas.style) {
    canvas.style.width = `${width}px`
    canvas.style.height = `${height}px`
  }
  const context = ctx || canvas.getContext?.('2d')
  context?.setTransform?.(dpr, 0, 0, dpr, 0, 0)
  return { width, height, dpr }
}

function createPortalCanvas(doc, zIndex) {
  const canvas = doc.createElement('canvas')
  canvas.className = 'viewport-confetti-canvas'
  canvas.setAttribute?.('aria-hidden', 'true')
  canvas.setAttribute?.('role', 'presentation')
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    width: '100vw',
    height: '100vh',
    pointerEvents: 'none',
    zIndex: String(zIndex),
  })
  doc.body.appendChild(canvas)
  return canvas
}

function spawnParticles({ width, height, count, mobile, random }) {
  const origins = mobile
    ? [{ x: 0.5, y: 0.08 }]
    : [{ x: 0.18, y: 0.08 }, { x: 0.82, y: 0.08 }, { x: 0.5, y: 0.04 }]

  const spread = Math.max(4.5, Math.min(mobile ? 7 : 11, width / 70))
  const lift = Math.max(2.2, Math.min(mobile ? 3.2 : 4.2, height / 90))

  return Array.from({ length: count }, (_, index) => {
    const origin = origins[index % origins.length]
    return {
      x: origin.x * width + (random() - 0.5) * Math.min(24, width * 0.06),
      y: origin.y * height,
      vx: (random() - 0.5) * spread,
      vy: -lift - random() * lift,
      gravity: mobile ? 0.11 : 0.085,
      rot: random() * Math.PI * 2,
      vr: (random() - 0.5) * 0.22,
      w: 4 + random() * (mobile ? 4 : 6),
      h: 6 + random() * (mobile ? 5 : 8),
      color: COLORS[index % COLORS.length],
      shape: SHAPES[index % SHAPES.length],
      opacity: 0.78 + random() * 0.18,
      drift: (random() - 0.5) * 0.28,
    }
  })
}

function drawParticle(ctx, particle) {
  ctx.save()
  ctx.translate(particle.x, particle.y)
  ctx.rotate(particle.rot)
  ctx.globalAlpha = Math.max(0, particle.opacity)
  ctx.fillStyle = particle.color

  if (particle.shape === 'circle') {
    ctx.beginPath()
    ctx.arc(0, 0, particle.w * 0.55, 0, Math.PI * 2)
    ctx.fill()
  } else if (particle.shape === 'streamer') {
    ctx.fillRect(-particle.w * 0.18, -particle.h, particle.w * 0.36, particle.h * 1.8)
  } else if (particle.shape === 'diamond') {
    ctx.rotate(Math.PI / 4)
    ctx.fillRect(-particle.w * 0.45, -particle.w * 0.45, particle.w * 0.9, particle.w * 0.9)
  } else {
    ctx.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h)
  }

  ctx.restore()
}

/**
 * Start a one-shot confetti burst. A second call on the same canvas
 * is ignored while a burst is already running.
 */
export function startViewportConfetti(options = {}) {
  const win = options.window || (typeof window !== 'undefined' ? window : globalThis)
  const doc = options.document || win?.document
  if (!doc?.body) {
    return { stop() {}, running: false, skipped: true, canvas: null }
  }

  const reducedMotion = options.reducedMotion ?? prefersReducedMotion(win.matchMedia?.bind(win))
  const mobile = options.mobile ?? isMobileViewport(win)
  const profile = resolveViewportConfettiProfile({ reducedMotion, mobile })
  const zIndex = Number(options.zIndex || VIEWPORT_CONFETTI_Z_INDEX)
  const createdCanvas = !options.canvas
  const canvas = options.canvas || createPortalCanvas(doc, zIndex)
  const host = options.host || null
  const random = typeof options.random === 'function' ? options.random : Math.random
  const nowFn = typeof options.now === 'function'
    ? options.now
    : () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

  if (canvas[VIEWPORT_CONFETTI_RUN_KEY]) {
    return canvas[VIEWPORT_CONFETTI_RUN_KEY]
  }

  if (canvas.style) {
    canvas.style.pointerEvents = 'none'
    canvas.style.zIndex = String(zIndex)
    if (host) {
      canvas.style.position = 'absolute'
      canvas.style.inset = '0'
    } else {
      canvas.style.position = canvas.style.position || 'fixed'
    }
  }

  const ctx = canvas.getContext?.('2d')
  const readBounds = () => measureConfettiBounds({ host, canvas, window: win })
  let viewport = applyCanvasViewportSize(canvas, readBounds(), ctx)
  let frameId = 0
  let stopped = false
  let particles = []
  let resizeObserver = null

  const stop = () => {
    if (stopped) return
    stopped = true
    handle.running = false
    if (frameId) {
      const cancel = win.cancelAnimationFrame || globalThis.cancelAnimationFrame
      if (typeof cancel === 'function') cancel(frameId)
      frameId = 0
    }
    win.removeEventListener?.('resize', onResize)
    try { resizeObserver?.disconnect?.() } catch { /* ignore */ }
    resizeObserver = null
    if (createdCanvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    } else if (ctx && viewport) {
      ctx.clearRect(0, 0, viewport.width, viewport.height)
    }
    delete canvas[VIEWPORT_CONFETTI_RUN_KEY]
    options.onComplete?.()
  }

  const onResize = () => {
    viewport = applyCanvasViewportSize(canvas, readBounds(), ctx)
  }

  const handle = {
    stop,
    running: false,
    skipped: false,
    canvas,
    profile,
    get viewport() { return viewport },
    get particleCount() { return particles.length },
  }

  canvas[VIEWPORT_CONFETTI_RUN_KEY] = handle

  if (profile.skip || !ctx) {
    handle.skipped = true
    stop()
    return handle
  }

  particles = spawnParticles({
    width: viewport.width,
    height: viewport.height,
    count: profile.particleCount,
    mobile,
    random,
  })

  handle.running = true
  win.addEventListener?.('resize', onResize)
  const ResizeObserverImpl = win.ResizeObserver || globalThis.ResizeObserver
  if (typeof ResizeObserverImpl === 'function' && (host || canvas)) {
    try {
      resizeObserver = new ResizeObserverImpl(onResize)
      resizeObserver.observe(host || canvas)
    } catch {
      resizeObserver = null
    }
  }

  const startedAt = nowFn()
  const tick = () => {
    if (stopped) return
    const elapsed = nowFn() - startedAt
    const t = Math.min(1, elapsed / profile.durationMs)
    ctx.clearRect(0, 0, viewport.width, viewport.height)
    ctx.save()
    ctx.beginPath()
    if (typeof ctx.roundRect === 'function') {
      ctx.roundRect(0, 0, viewport.width, viewport.height, 18)
    } else {
      ctx.rect(0, 0, viewport.width, viewport.height)
    }
    ctx.clip()

    for (const particle of particles) {
      particle.vy += particle.gravity
      particle.vx += particle.drift * 0.04
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rot += particle.vr
      particle.opacity = particle.opacity * (t > 0.72 ? 0.96 : 1)
      if (
        particle.x > -40
        && particle.x < viewport.width + 40
        && particle.y > -40
        && particle.y < viewport.height + 40
        && particle.opacity > 0.04
      ) {
        drawParticle(ctx, particle)
      }
    }

    ctx.restore()

    if (t >= 1) {
      stop()
      return
    }
    const raf = win.requestAnimationFrame || globalThis.requestAnimationFrame
    frameId = typeof raf === 'function' ? raf(tick) : 0
    if (!frameId) stop()
  }

  const raf = win.requestAnimationFrame || globalThis.requestAnimationFrame
  frameId = typeof raf === 'function' ? raf(tick) : 0
  if (!frameId) {
    // Tests / environments without rAF still expose a sized canvas + particles.
    ctx.clearRect(0, 0, viewport.width, viewport.height)
  }

  return handle
}
