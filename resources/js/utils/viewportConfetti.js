/**
 * Full-viewport canvas confetti. Always paints across the visual screen
 * (desktop and mobile). Never clips to a modal, card, or transformed parent.
 */

export const VIEWPORT_CONFETTI_Z_INDEX = 14150
export const VIEWPORT_CONFETTI_DURATION_MS = 3000
export const VIEWPORT_CONFETTI_RUN_KEY = '__mutqinViewportConfetti'

const COLORS = [
  '#1A5336',
  '#2f6f58',
  '#4a8a6e',
  '#a8d4bc',
  '#c9a86c',
  '#d4b87a',
  '#efe6d4',
  '#8b7355',
]

const SHAPES = ['rect', 'circle', 'streamer']

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
  const docEl = win?.document?.documentElement
  const vv = win?.visualViewport
  return {
    width: Math.max(
      1,
      Math.floor(Number(vv?.width) || 0),
      Math.floor(Number(win?.innerWidth) || 0),
      Math.floor(Number(docEl?.clientWidth) || 0),
    ),
    height: Math.max(
      1,
      Math.floor(Number(vv?.height) || 0),
      Math.floor(Number(win?.innerHeight) || 0),
      Math.floor(Number(docEl?.clientHeight) || 0),
    ),
    dpr: Math.min(2, Math.max(1, Number(win?.devicePixelRatio) || 1)),
  }
}

export function measureConfettiBounds({ window: win = globalThis } = {}) {
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
    return { skip: false, particleCount: 72, durationMs: VIEWPORT_CONFETTI_DURATION_MS }
  }
  return { skip: false, particleCount: 168, durationMs: VIEWPORT_CONFETTI_DURATION_MS }
}

export function applyFullViewportCanvasStyle(canvas, zIndex = VIEWPORT_CONFETTI_Z_INDEX) {
  if (!canvas?.style) return canvas
  Object.assign(canvas.style, {
    position: 'fixed',
    inset: '0',
    top: '0',
    right: '0',
    bottom: '0',
    left: '0',
    width: '100%',
    height: '100%',
    minWidth: '100%',
    minHeight: '100%',
    maxWidth: 'none',
    maxHeight: 'none',
    pointerEvents: 'none',
    zIndex: String(zIndex),
    overflow: 'visible',
  })
  return canvas
}

export function applyCanvasViewportSize(canvas, viewport, ctx, zIndex) {
  if (!canvas) return viewport
  const { width, height, dpr } = viewport
  canvas.width = Math.max(1, Math.floor(width * dpr))
  canvas.height = Math.max(1, Math.floor(height * dpr))
  applyFullViewportCanvasStyle(
    canvas,
    zIndex || Number(canvas.style?.zIndex) || VIEWPORT_CONFETTI_Z_INDEX,
  )
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
  applyFullViewportCanvasStyle(canvas, zIndex)
  doc.body.appendChild(canvas)
  return canvas
}

function spawnParticles({ width, height, count, mobile, random }) {
  const columns = mobile ? 8 : 12

  return Array.from({ length: count }, (_, index) => {
    const column = (index % columns + 0.25 + random() * 0.5) / columns
    return {
      x: column * width,
      y: random() * height,
      vx: (random() - 0.5) * (mobile ? 1.8 : 2.4),
      vy: 0.45 + random() * 1.6,
      gravity: mobile ? 0.05 : 0.042,
      rot: random() * Math.PI * 2,
      vr: (random() - 0.5) * 0.12,
      w: 2.6 + random() * (mobile ? 2.4 : 3.2),
      h: 4.4 + random() * (mobile ? 3.4 : 4.8),
      color: COLORS[index % COLORS.length],
      shape: SHAPES[index % SHAPES.length],
      opacity: 0.62 + random() * 0.26,
      drift: (random() - 0.5) * 0.16,
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
    ctx.arc(0, 0, particle.w * 0.48, 0, Math.PI * 2)
    ctx.fill()
  } else if (particle.shape === 'streamer') {
    ctx.fillRect(-particle.w * 0.14, -particle.h, particle.w * 0.28, particle.h * 1.65)
  } else {
    ctx.fillRect(-particle.w / 2, -particle.h / 2, particle.w, particle.h)
  }

  ctx.restore()
}

function bindViewportResize(win, onResize) {
  win.addEventListener?.('resize', onResize)
  const vv = win.visualViewport
  vv?.addEventListener?.('resize', onResize)
  vv?.addEventListener?.('scroll', onResize)
  return () => {
    win.removeEventListener?.('resize', onResize)
    vv?.removeEventListener?.('resize', onResize)
    vv?.removeEventListener?.('scroll', onResize)
  }
}

/**
 * Start a one-shot full-viewport confetti burst. A second call on the same
 * canvas is ignored while a burst is already running.
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
  const random = typeof options.random === 'function' ? options.random : Math.random
  const nowFn = typeof options.now === 'function'
    ? options.now
    : () => (typeof performance !== 'undefined' && performance.now ? performance.now() : Date.now())

  if (canvas[VIEWPORT_CONFETTI_RUN_KEY]) {
    return canvas[VIEWPORT_CONFETTI_RUN_KEY]
  }

  applyFullViewportCanvasStyle(canvas, zIndex)

  const ctx = canvas.getContext?.('2d')
  const readBounds = () => measureViewport(win)
  let viewport = applyCanvasViewportSize(canvas, readBounds(), ctx, zIndex)
  let frameId = 0
  let stopped = false
  let particles = []
  let unbindResize = null

  const stop = () => {
    if (stopped) return
    stopped = true
    handle.running = false
    if (frameId) {
      const cancel = win.cancelAnimationFrame || globalThis.cancelAnimationFrame
      if (typeof cancel === 'function') cancel(frameId)
      frameId = 0
    }
    unbindResize?.()
    unbindResize = null
    if (createdCanvas && canvas.parentNode) {
      canvas.parentNode.removeChild(canvas)
    } else if (ctx && viewport) {
      ctx.clearRect(0, 0, viewport.width, viewport.height)
    }
    delete canvas[VIEWPORT_CONFETTI_RUN_KEY]
    options.onComplete?.()
  }

  const onResize = () => {
    viewport = applyCanvasViewportSize(canvas, readBounds(), ctx, zIndex)
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
  unbindResize = bindViewportResize(win, onResize)

  const startedAt = nowFn()
  const tick = () => {
    if (stopped) return
    const elapsed = nowFn() - startedAt
    const t = Math.min(1, elapsed / profile.durationMs)
    ctx.clearRect(0, 0, viewport.width, viewport.height)

    for (const particle of particles) {
      particle.vy += particle.gravity
      particle.vx += particle.drift * 0.04
      particle.x += particle.vx
      particle.y += particle.vy
      particle.rot += particle.vr
      particle.opacity = particle.opacity * (t > 0.68 ? 0.95 : 1)
      if (
        particle.x > -48
        && particle.x < viewport.width + 48
        && particle.y > -48
        && particle.y < viewport.height + 48
        && particle.opacity > 0.04
      ) {
        drawParticle(ctx, particle)
      }
    }

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
    ctx.clearRect(0, 0, viewport.width, viewport.height)
  }

  return handle
}
