import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({
  console,
  Date,
  Math,
  JSON,
  Array,
  Object,
  Set,
  Map,
  Number,
  String,
  Boolean,
  setInterval,
  clearInterval,
  window: {
    setInterval,
    clearInterval,
  },
  document: {
    hidden: false,
    addEventListener() {},
    removeEventListener() {},
  },
})
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/session-timer.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') || specifier.endsWith('.mjs') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  let resolveMod
  const pending = new Promise((resolve) => { resolveMod = resolve })
  moduleCache.set(resolved, pending)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  resolveMod(mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const mod = await loadModule('resources/js/scripts/memorisationDetection/sessionTimer.js')
const {
  TIMER_STATES,
  formatElapsedLabel,
  createSessionTimer,
} = mod.namespace

assert.equal(formatElapsedLabel(0), '00:00')
assert.equal(formatElapsedLabel(65_000), '01:05')
assert.equal(formatElapsedLabel(3_661_000), '1:01:01')

{
  let now = 1_000_000
  const ticks = []
  const timer = createSessionTimer({
    now: () => now,
    onTick: (snap) => ticks.push({ ...snap }),
  })

  assert.equal(timer.state, TIMER_STATES.IDLE)
  assert.equal(timer.getElapsedMs(), 0)

  timer.start({ at: now })
  assert.equal(timer.state, TIMER_STATES.RUNNING)
  assert.equal(timer.startedAt, 1_000_000)

  now += 5_000
  assert.equal(timer.getElapsedMs(), 5_000)
  assert.equal(timer.getElapsedSeconds(), 5)

  timer.pause({ at: now })
  assert.equal(timer.state, TIMER_STATES.PAUSED)
  assert.equal(timer.getElapsedMs(), 5_000)

  now += 10_000
  assert.equal(timer.getElapsedMs(), 5_000, 'paused time does not count')

  timer.resume({ at: now })
  assert.equal(timer.state, TIMER_STATES.RUNNING)

  now += 2_000
  assert.equal(timer.getElapsedMs(), 7_000, 'resumes from previous elapsed')

  timer.stop({ at: now })
  assert.equal(timer.state, TIMER_STATES.STOPPED)
  assert.equal(timer.getElapsedMs(), 7_000)

  now += 50_000
  assert.equal(timer.getElapsedMs(), 7_000, 'stopped elapsed is frozen')

  // Accidental start after stop must not wipe the attempt.
  timer.start({ at: now })
  assert.equal(timer.state, TIMER_STATES.STOPPED)
  assert.equal(timer.getElapsedMs(), 7_000)

  timer.reset()
  assert.equal(timer.state, TIMER_STATES.IDLE)
  assert.equal(timer.getElapsedMs(), 0)
  assert.equal(timer.startedAt, 0)

  timer.destroy()
  assert.ok(ticks.length >= 3)
}

{
  let now = 5000
  const timer = createSessionTimer({ now: () => now })
  timer.start({ at: now })
  now += 1500
  // Re-render / second start while running must not reset.
  timer.start({ at: now })
  assert.equal(timer.getElapsedMs(now), 1500)
  timer.destroy()
}

{
  const source = await fs.readFile(
    path.join(root, 'resources/js/views/Memorisation.js'),
    'utf8',
  )
  assert.match(source, /createSessionTimer/)
  assert.match(source, /startAmdElapsedTimer\(/)
  assert.match(source, /stopAmdElapsedTimer\(/)
  assert.match(source, /pauseAmdElapsedTimer\(/)
  assert.match(source, /resetAmdElapsedTimer\(/)
  assert.doesNotMatch(source, /amdElapsedTimer:\s*null/)
  assert.doesNotMatch(source, /amdElapsedSeconds\s*=\s*Math\.max\(0,\s*Number\(this\.amdElapsedSeconds/)
}

console.log('session-timer.test.mjs: ok')
