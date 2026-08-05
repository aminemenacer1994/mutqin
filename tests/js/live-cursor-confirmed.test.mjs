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
  clampCursorToSpokenWords,
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
  const cursor = clampCursorToSpokenWords({
    confirmedWordIndex: 7,
    candidateWordIndex: 7,
    expectedWordIndex: 7,
    activeTajweedSegmentIndex: 7,
  }, 3)
  assert.equal(cursor.confirmedWordIndex, 4, 'cursor caps at spoken words + one word of slack')
  assert.equal(cursor.expectedWordIndex, 4)
  assert.equal(cursor.activeTajweedSegmentIndex, 4)
  assert.equal(cursor.candidateWordIndex, 4)
}

{
  const source = {
    confirmedWordIndex: 3,
    candidateWordIndex: 4,
    expectedWordIndex: 3,
    activeTajweedSegmentIndex: 3,
  }
  assert.equal(
    clampCursorToSpokenWords(source, 5),
    source,
    'cursor within the spoken budget is untouched',
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
  assert.match(js, /clampCursorToSpokenWords\(cursor, spokenWordCount\)/)
  assert.match(js, /spokenWordCount:\s*committedWords\.length/)
  assert.match(js, /liveAlignmentOptions\.lookahead\s*=\s*0/)
  assert.match(js, /livePreviewAlignmentOptions\.lookahead\s*=\s*0/)
  assert.match(js, /gateUnsettledIssueStatuses\(statuses,\s*\{/)
}

console.log('Live cursor confirmed-position tests passed')
