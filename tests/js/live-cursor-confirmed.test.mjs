import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON, Array, Object, Set, Map, Number, String, Boolean })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/live-cursor-confirmed.test.mjs')) {
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

const mod = await loadModule('resources/js/scripts/memorisationDetection/liveCursor.js')
const {
  buildLiveRecitationCursor,
  clampStatusesToConfirmedCursor,
  mergeLiveRecitationStatuses,
  resolveConfirmedWordIndex,
  resolveExpectedWordIndex,
} = mod.namespace

{
  const confirmed = resolveConfirmedWordIndex([
    { status: 'correct' },
    { status: 'partial' },
    { status: 'pending' },
    { status: 'correct' },
  ])
  assert.equal(confirmed, 2, 'confirmed cursor stops at first unsettled word')
}

{
  const cursor = buildLiveRecitationCursor({
    committedStatuses: [
      { status: 'correct' },
      { status: 'pending' },
      { status: 'pending' },
    ],
    candidateStatuses: [
      { status: 'correct' },
      { status: 'correct' },
      { status: 'correct' },
    ],
  })
  assert.equal(cursor.confirmedWordIndex, 1)
  // Candidate may be ahead of committed...
  assert.equal(cursor.candidateWordIndex, 2, 'candidate tracks interim ahead')
  // ...but expected/active never follow it.
  assert.equal(cursor.expectedWordIndex, 1)
  assert.equal(cursor.activeTajweedSegmentIndex, 1)
  assert.equal(
    resolveExpectedWordIndex({
      confirmedWordIndex: cursor.confirmedWordIndex,
      candidateWordIndex: cursor.candidateWordIndex,
      allowCandidate: false,
    }),
    1,
  )
}

{
  const clamped = clampStatusesToConfirmedCursor([
    { status: 'correct' },
    { status: 'pending' },
    { status: 'correct' },
    { status: 'partial' },
  ], 1)
  assert.equal(clamped[0].status, 'correct')
  assert.equal(clamped[1].status, 'pending')
  assert.equal(clamped[2].status, 'pending', 'future interim correct must be stripped')
  assert.equal(clamped[3].status, 'pending', 'future interim partial must be stripped')
}

{
  const merged = mergeLiveRecitationStatuses(
    [
      { status: 'correct' },
      { status: 'pending' },
      { status: 'pending' },
    ],
    [
      { status: 'correct' },
      { status: 'correct' },
      { status: 'correct' },
    ],
    { confirmedOnly: true },
  )
  assert.equal(merged[0].status, 'correct')
  assert.equal(merged[1].status, 'pending', 'confirmedOnly ignores interim on current slot')
  assert.equal(merged[2].status, 'pending', 'confirmedOnly never paints ahead')
}

{
  const merged = mergeLiveRecitationStatuses(
    [
      { status: 'correct' },
      { status: 'pending' },
      { status: 'pending' },
    ],
    [
      { status: 'correct' },
      { status: 'correct' },
      { status: 'correct' },
    ],
    { confirmedOnly: false, protectAgainstInterimRed: true },
  )
  assert.equal(merged[0].status, 'correct')
  assert.equal(merged[1].status, 'correct', 'soft mode may paint the confirmed current slot')
  assert.equal(merged[2].status, 'pending', 'soft mode still cannot paint a future word')
}

{
  const merged = mergeLiveRecitationStatuses(
    [{ status: 'incorrect', note: 'wrong' }],
    [{ status: 'correct', note: 'rematch' }],
    { confirmedOnly: true },
  )
  assert.equal(merged[0].status, 'correct', 'confirmed red may recover to green on rematch')
}

console.log('Live cursor confirmed-position tests passed')
