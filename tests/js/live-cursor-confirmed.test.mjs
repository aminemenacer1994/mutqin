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
  clampCursorToPaceLimit,
  resolveLivePaceLimit,
  clampStatusesToConfirmedCursor,
  gateUnsettledIssueStatuses,
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

// Pace guard: colouring must not settle more words than were recited.
{
  const cursor = clampCursorToPaceLimit({
    confirmedWordIndex: 9,
    candidateWordIndex: 9,
    expectedWordIndex: 9,
    activeTajweedSegmentIndex: 9,
  }, resolveLivePaceLimit({ spokenWordCount: 3, elapsedMs: 60_000 }))
  assert.equal(cursor.confirmedWordIndex, 6, 'cursor caps at spoken words plus slack')
  assert.equal(cursor.expectedWordIndex, 6)
  assert.equal(cursor.activeTajweedSegmentIndex, 6)
  assert.equal(cursor.candidateWordIndex, 6)
}

{
  const source = {
    confirmedWordIndex: 3,
    candidateWordIndex: 4,
    expectedWordIndex: 3,
    activeTajweedSegmentIndex: 3,
  }
  assert.equal(
    clampCursorToPaceLimit(source, resolveLivePaceLimit({ spokenWordCount: 5, elapsedMs: 60_000 })),
    source,
    'cursor within the pace budget is untouched (same object, no repaint)',
  )
}

// Time ceiling: recognition can transcribe a familiar passage ahead of the
// voice, so the recognised word count alone cannot keep the paint with the
// reciter — elapsed recitation time has to bind too.
{
  assert.equal(
    resolveLivePaceLimit({ spokenWordCount: 40, elapsedMs: 2_000 }),
    9,
    'two seconds of recitation cannot settle forty words',
  )
  assert.ok(
    resolveLivePaceLimit({ spokenWordCount: 12, elapsedMs: 10_000 }) >= 15,
    'a genuine fast reciter is never held back by the time ceiling',
  )
  assert.equal(
    resolveLivePaceLimit({ spokenWordCount: 6, elapsedMs: null }),
    9,
    'the speech budget still applies when no timing is available',
  )
}

// Settle gate: a fresh issue on the newest word waits one pass before painting.
{
  const counts = new Map()
  const statuses = [
    { status: 'correct' },
    { status: 'correct' },
    { status: 'incorrect', similarity: 0.3 },
  ]
  const first = gateUnsettledIssueStatuses(statuses, { active: true, counts })
  assert.equal(first[2].status, 'pending', 'first sighting of a trailing mistake is held')
  assert.equal(first[1].status, 'correct', 'earlier words keep their paint')
  const second = gateUnsettledIssueStatuses(statuses, { active: true, counts })
  assert.equal(second[2].status, 'incorrect', 'a repeated mistake paints on the next pass')
}

{
  const counts = new Map()
  const statuses = [{ status: 'correct' }, { status: 'incorrect' }]
  assert.equal(
    gateUnsettledIssueStatuses(statuses, { active: false, counts })[1].status,
    'incorrect',
    'gate is inert once recording stops (or in stop-on-mistake mode)',
  )
}

{
  const counts = new Map()
  const statuses = [{ status: 'correct' }, { status: 'correct' }]
  assert.equal(
    gateUnsettledIssueStatuses(statuses, { active: true, counts })[1].status,
    'correct',
    'greens are never held back',
  )
}

// Wiring: AMD live alignment must apply the pace guard and drop skip-ahead.
{
  const js = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  assert.match(js, /clampCursorToPaceLimit\(cursor, resolveLivePaceLimit\(/)
  assert.match(js, /elapsedMs:\s*this\.getAmdLivePaceElapsedMs\(\)/)
  assert.match(js, /spokenWordCount:\s*committedWords\.length/)
  assert.match(js, /liveAlignmentOptions\.lookahead\s*=\s*0/)
  assert.match(js, /livePreviewAlignmentOptions\.lookahead\s*=\s*0/)
  assert.match(js, /gateUnsettledIssueStatuses\(statuses,\s*\{/)
  // Words held back by the ceiling must repaint on the timer, not wait for
  // recognition that may never arrive — and the signature guard would skip it.
  assert.match(js, /releaseAmdPaceHold\(\)\s*\{/)
  assert.match(js, /this\.recitationLiveAlignmentSignature\s*=\s*''/)
  // The ceiling must lift the moment recording stops, so the final result paints in full.
  assert.match(js, /getAmdLivePaceElapsedMs\(\)\s*\{\s*\n\s*if\s*\(!this\.recitationCheckRecording\) return null/)
}

console.log('Live cursor confirmed-position tests passed')
