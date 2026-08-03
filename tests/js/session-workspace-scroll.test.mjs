/**
 * Session workspace entry scroll — calm, centralised, non-reactive.
 */
import assert from 'node:assert/strict'
import {
  SESSION_WORKSPACE_SCROLL_REASON,
  SESSION_ENTRY_SCROLL_REASONS,
  SESSION_SCROLL_EXCLUDED_SELECTORS,
  prefersReducedMotion,
  measureStickyNavOffset,
  isExcludedScrollContainer,
  elementCanScroll,
  resolveSessionScrollContainer,
  resolveSessionScrollTarget,
  buildSessionScrollIdentity,
  shouldScrollSessionWorkspace,
  computeSessionScrollTop,
  applySessionWorkspaceScroll,
  createSessionWorkspaceScrollController,
} from '../../resources/js/scripts/session/sessionWorkspaceScroll.js'

function createFakeRect(top, height = 40, left = 0, width = 320) {
  return {
    top,
    bottom: top + height,
    left,
    right: left + width,
    width,
    height,
    x: left,
    y: top,
  }
}

function createElement({
  tag = 'div',
  className = '',
  id = '',
  scrollHeight = 0,
  clientHeight = 0,
  scrollTop = 0,
  rect = createFakeRect(0),
  parent = null,
  dataset = {},
} = {}) {
  const el = {
    nodeType: 1,
    tagName: tag.toUpperCase(),
    className,
    id,
    scrollHeight,
    clientHeight,
    scrollTop,
    parentElement: parent,
    dataset,
    children: [],
    style: {},
    scrollToCalls: [],
    matches(selector) {
      if (selector.startsWith('.')) {
        return this.className.split(/\s+/).includes(selector.slice(1))
      }
      if (selector.startsWith('#')) return this.id === selector.slice(1)
      if (selector.startsWith('[') && selector.endsWith(']')) {
        const attr = selector.slice(1, -1)
        if (attr.startsWith('data-')) {
          const key = attr.replace(/^data-/, '').replace(/-([a-z])/g, (_, c) => c.toUpperCase())
          return this.dataset?.[key] != null || Object.prototype.hasOwnProperty.call(this.dataset || {}, key)
        }
      }
      return false
    },
    getBoundingClientRect() {
      return rect
    },
    querySelector(selector) {
      const stack = [...this.children]
      while (stack.length) {
        const node = stack.shift()
        if (node.matches?.(selector) || (selector.startsWith('.') && node.className.split(/\s+/).includes(selector.slice(1)))) {
          return node
        }
        if (node.id && selector === `#${node.id}`) return node
        if (selector === '[data-session-scroll-target]' && node.dataset?.sessionScrollTarget != null) return node
        stack.push(...(node.children || []))
      }
      return null
    },
    querySelectorAll(selector) {
      const found = []
      const stack = [...this.children]
      while (stack.length) {
        const node = stack.shift()
        if (node.matches?.(selector)) found.push(node)
        stack.push(...(node.children || []))
      }
      return found
    },
    scrollTo(opts) {
      this.scrollToCalls.push(opts)
      if (opts && typeof opts.top === 'number') this.scrollTop = opts.top
    },
  }
  if (parent) parent.children.push(el)
  return el
}

// --- Reasons ---
{
  assert.ok(SESSION_ENTRY_SCROLL_REASONS.includes(SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION))
  assert.ok(SESSION_ENTRY_SCROLL_REASONS.includes(SESSION_WORKSPACE_SCROLL_REASON.RESUME_SESSION))
  assert.ok(SESSION_ENTRY_SCROLL_REASONS.includes(SESSION_WORKSPACE_SCROLL_REASON.SAVED_SESSION))
  assert.ok(SESSION_ENTRY_SCROLL_REASONS.includes(SESSION_WORKSPACE_SCROLL_REASON.RECOMMENDED_REVISION))
  assert.ok(SESSION_SCROLL_EXCLUDED_SELECTORS.includes('.mushaf-viewport-scroll'))
}

// --- Reduced motion ---
{
  assert.equal(prefersReducedMotion({ matches: true }), true)
  assert.equal(prefersReducedMotion({ matches: false }), false)
}

// --- Sticky nav offset ---
{
  const nav = createElement({ className: 'navbar app-navbar', rect: createFakeRect(0, 72) })
  const doc = {
    querySelector(sel) {
      if (String(sel).includes('app-navbar')) return nav
      return null
    },
    documentElement: {},
  }
  assert.equal(measureStickyNavOffset(doc, 64), 72)
  assert.equal(measureStickyNavOffset(null, 64), 64)
}

// --- Exclude mushaf / modal containers ---
{
  const mushaf = createElement({ className: 'mushaf-viewport-scroll' })
  assert.equal(isExcludedScrollContainer(mushaf), true)
  const page = createElement({ className: 'page-scroll' })
  assert.equal(isExcludedScrollContainer(page), false)
}

// --- Resolve window vs internal container (never both) ---
{
  const pageScroller = createElement({
    className: 'app-page-scroll',
    scrollHeight: 2000,
    clientHeight: 600,
    scrollTop: 400,
  })
  // Force overflow detection without window.getComputedStyle
  const originalGcs = globalThis.window?.getComputedStyle
  globalThis.window = {
    ...(globalThis.window || {}),
    getComputedStyle() {
      return { overflowY: 'auto', overflow: 'auto' }
    },
  }

  const shell = createElement({
    className: 'workspace-shell',
    parent: pageScroller,
    rect: createFakeRect(180, 120),
  })
  const mushaf = createElement({
    className: 'mushaf-viewport-scroll',
    parent: shell,
    scrollHeight: 3000,
    clientHeight: 400,
  })
  const target = createElement({
    className: 'workspace-shell-head',
    parent: shell,
    rect: createFakeRect(180, 80),
  })

  const resolved = resolveSessionScrollContainer(target, {
    root: { documentElement: createElement({ tag: 'html' }), body: createElement({ tag: 'body' }) },
  })
  assert.equal(resolved.type, 'element')
  assert.equal(resolved.element, pageScroller)
  assert.notEqual(resolved.element, mushaf)

  // Window fallback when no internal page scroller
  const lonely = createElement({ className: 'workspace-shell', rect: createFakeRect(300) })
  const winResolved = resolveSessionScrollContainer(lonely, {
    root: { documentElement: createElement({ tag: 'html' }), body: createElement({ tag: 'body' }) },
  })
  assert.equal(winResolved.type, 'window')

  if (originalGcs) {
    globalThis.window.getComputedStyle = originalGcs
  }
}

// --- Target preference: session shell over workspace main ---
{
  const root = createElement({ tag: 'div' })
  const main = createElement({ id: 'memorisationWorkspaceMain', parent: root })
  const shell = createElement({
    className: 'workspace-shell',
    parent: root,
    dataset: { sessionScrollTarget: '' },
  })
  // Make matches work for data attr
  shell.matches = function matches(selector) {
    if (selector === '[data-session-scroll-target]') return true
    if (selector === '.workspace-shell') return true
    return false
  }
  root.querySelector = function querySelector(selector) {
    if (selector === '[data-session-scroll-target]' || selector === '.workspace-shell') return shell
    if (selector === '#memorisationWorkspaceMain') return main
    return null
  }
  assert.equal(resolveSessionScrollTarget(root), shell)
}

// --- Identity + gate: no repeated scroll on reactive updates ---
{
  const identity = buildSessionScrollIdentity({
    reason: SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
    chapterId: 1,
    rangeStart: 1,
    rangeEnd: 7,
    sessionId: 'abc',
  })
  assert.equal(
    identity,
    buildSessionScrollIdentity({
      reason: SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
      chapterId: 1,
      rangeStart: 1,
      rangeEnd: 7,
      sessionId: 'abc',
    })
  )

  assert.equal(
    shouldScrollSessionWorkspace({
      reason: SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
      identity,
      lastIdentity: identity,
      lastScrolledAt: Date.now(),
      now: Date.now(),
      dedupeMs: 900,
    }).ok,
    false
  )

  assert.equal(
    shouldScrollSessionWorkspace({
      reason: 'word_update',
      identity: 'x',
    }).ok,
    false
  )

  assert.equal(
    shouldScrollSessionWorkspace({
      reason: SESSION_WORKSPACE_SCROLL_REASON.RESUME_SESSION,
      blocked: true,
      identity: 'y',
    }).reason,
    'blocked'
  )

  assert.equal(
    shouldScrollSessionWorkspace({
      reason: SESSION_WORKSPACE_SCROLL_REASON.SAVED_SESSION,
      identity: 'fresh',
      lastIdentity: 'old',
    }).ok,
    true
  )
}

// --- Nav offset math ---
{
  const plan = computeSessionScrollTop({
    containerType: 'window',
    containerScrollTop: 800,
    targetOffsetTop: 900,
    navOffset: 64,
    padding: 8,
  })
  assert.equal(plan.nextScrollTop, 900 - 64 - 8)
  assert.ok(plan.delta > 0)
}

// --- applySessionWorkspaceScroll: window only, never mushaf ---
{
  const mushafScrolls = []
  const mushaf = createElement({ className: 'mushaf-viewport-scroll', scrollTop: 220 })
  mushaf.scrollTo = (opts) => {
    mushafScrolls.push(opts)
    mushaf.scrollTop = opts.top
  }

  const winCalls = []
  const fakeWin = {
    scrollY: 500,
    pageYOffset: 500,
    scrollTo(opts) {
      winCalls.push(opts)
      this.scrollY = opts.top
    },
  }
  const target = createElement({
    className: 'workspace-shell',
    rect: createFakeRect(240, 100),
  })

  const result = applySessionWorkspaceScroll({
    target,
    container: { type: 'window', element: null },
    navOffset: 64,
    reduceMotion: false,
    win: fakeWin,
    doc: { documentElement: { scrollTop: 500 } },
  })
  assert.equal(result.scrolled, true)
  assert.equal(result.containerType, 'window')
  assert.equal(result.behavior, 'smooth')
  assert.equal(winCalls.length, 1)
  assert.equal(mushafScrolls.length, 0)
  assert.equal(mushaf.scrollTop, 220)
}

// --- Reduced motion → immediate scroll ---
{
  const winCalls = []
  const fakeWin = {
    scrollY: 300,
    scrollTo(opts) { winCalls.push(opts) },
  }
  const target = createElement({ className: 'workspace-shell', rect: createFakeRect(200) })
  const result = applySessionWorkspaceScroll({
    target,
    container: { type: 'window', element: null },
    navOffset: 64,
    reduceMotion: true,
    win: fakeWin,
    doc: { documentElement: { scrollTop: 300 } },
  })
  assert.equal(result.behavior, 'auto')
  assert.equal(winCalls[0].behavior, 'auto')
}

// --- Mobile viewport: element container scroll with offset ---
{
  globalThis.window = {
    ...(globalThis.window || {}),
    getComputedStyle() {
      return { overflowY: 'auto', overflow: 'auto' }
    },
  }
  const scroller = createElement({
    className: 'mobile-page-scroll',
    scrollHeight: 2400,
    clientHeight: 640,
    scrollTop: 480,
    rect: createFakeRect(0, 640),
  })
  const target = createElement({
    className: 'workspace-shell',
    parent: scroller,
    rect: createFakeRect(160, 120),
  })
  const result = applySessionWorkspaceScroll({
    target,
    container: { type: 'element', element: scroller },
    navOffset: 56,
    reduceMotion: false,
    win: { scrollY: 0, scrollTo() {} },
    doc: {},
  })
  assert.equal(result.scrolled, true)
  assert.equal(result.containerType, 'element')
  assert.equal(scroller.scrollToCalls.length, 1)
  // target content offset = (160-0)+480 = 640; desired = 640 - 56 - 8 = 576
  assert.equal(scroller.scrollToCalls[0].top, 576)
}

// --- Controller: new / resume / saved / recommended; no conflict with auto-follow block ---
{
  let blocked = false
  let target = createElement({ className: 'workspace-shell', rect: createFakeRect(300) })
  const winCalls = []
  const scheduled = []
  const controller = createSessionWorkspaceScrollController({
    getTarget: () => target,
    getNavOffset: () => 64,
    isBlocked: () => blocked,
    prefersReducedMotion: () => false,
    schedule: (fn) => { scheduled.push(fn) },
    now: (() => {
      let t = 1_000
      return () => { t += 1; return t }
    })(),
    dedupeMs: 900,
    applyScroll: (opts) => {
      winCalls.push(opts)
      return { scrolled: true, containerType: 'window', behavior: 'smooth', nextScrollTop: 0 }
    },
    win: {
      history: { scrollRestoration: 'auto' },
      scrollTo() {},
    },
    doc: {},
  })

  const cases = [
    SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
    SESSION_WORKSPACE_SCROLL_REASON.RESUME_SESSION,
    SESSION_WORKSPACE_SCROLL_REASON.SAVED_SESSION,
    SESSION_WORKSPACE_SCROLL_REASON.RECOMMENDED_REVISION,
    SESSION_WORKSPACE_SCROLL_REASON.DASHBOARD_RETURN,
  ]
  for (const reason of cases) {
    const identity = buildSessionScrollIdentity({ reason, chapterId: 2, rangeStart: 1, rangeEnd: 5, sessionId: reason })
    const gate = controller.requestScroll({ reason, identity })
    assert.equal(gate.ok, true, reason)
    // Flush this entry before the next so each navigation is observed independently.
    assert.equal(scheduled.length, 1, reason)
    scheduled.shift()()
  }
  assert.equal(winCalls.length, cases.length)

  // Rapid re-entry coalesces to the latest pending frame only.
  winCalls.length = 0
  for (let i = 0; i < 3; i += 1) {
    controller.requestScroll({
      reason: SESSION_WORKSPACE_SCROLL_REASON.SESSION_SWITCH,
      identity: `rapid-${i}-${Date.now()}`,
    })
  }
  assert.equal(scheduled.length, 3)
  while (scheduled.length) scheduled.shift()()
  assert.equal(winCalls.length, 1, 'only the latest coalesced scroll should apply')

  // Immediate repeat of the same identity is ignored (reactive noise guard).
  const repeatIdentity = 'rapid-repeat-same'
  assert.equal(
    controller.requestScroll({
      reason: SESSION_WORKSPACE_SCROLL_REASON.SESSION_SWITCH,
      identity: repeatIdentity,
    }).ok,
    true
  )
  scheduled.shift()()
  const dup = controller.requestScroll({
    reason: SESSION_WORKSPACE_SCROLL_REASON.SESSION_SWITCH,
    identity: repeatIdentity,
  })
  assert.equal(dup.ok, false)
  assert.equal(dup.reason, 'duplicate')

  // Live auto-follow / reciting block
  blocked = true
  const blockedGate = controller.requestScroll({
    reason: SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
    identity: 'during-recite',
  })
  assert.equal(blockedGate.ok, false)
  assert.equal(blockedGate.reason, 'blocked')

  // Setting / word-update style reason never scheduled
  blocked = false
  assert.equal(
    controller.requestScroll({ reason: 'recognition_tick', identity: 'noise' }).ok,
    false
  )

  controller.dispose()
  assert.equal(controller.requestScroll({
    reason: SESSION_WORKSPACE_SCROLL_REASON.NEW_SESSION,
    identity: 'after-dispose',
  }).reason, 'disposed')
}

// elementCanScroll smoke
{
  globalThis.window = {
    getComputedStyle() {
      return { overflowY: 'auto', overflow: 'auto' }
    },
  }
  assert.equal(elementCanScroll(createElement({ scrollHeight: 900, clientHeight: 400 })), true)
  assert.equal(elementCanScroll(createElement({ scrollHeight: 400, clientHeight: 400 })), false)
}

console.log('session-workspace-scroll.test.mjs: all assertions passed')
