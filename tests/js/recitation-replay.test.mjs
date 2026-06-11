import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-replay.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const recitation = await loadModule('resources/js/engine/recitation_analysis.js')
const { replayRecognitionSession } = recitation.namespace

const targetText = 'قل هو الله أحد'
const finalEvents = [
  {
    provider: 'speechmatics',
    isFinal: true,
    start: 0,
    duration: 0.8,
    words: [
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.28 },
      { word: 'هو', confidence: 0.94, start: 0.31, end: 0.48 },
      { word: 'هو', confidence: 0.93, start: 0.5, end: 0.65 }
    ]
  },
  {
    provider: 'speechmatics',
    isFinal: true,
    start: 0.8,
    duration: 0.9,
    words: [
      { word: 'الله', confidence: 0.96, start: 0.84, end: 1.12 },
      { word: 'أحد', confidence: 0.97, start: 1.16, end: 1.42 }
    ]
  }
]

const noisyEvents = [
  {
    provider: 'speechmatics',
    isFinal: false,
    start: 0,
    duration: 0.8,
    transcript: 'قل هو غلط',
    words: [
      { word: 'قل', confidence: 0.91, start: 0.1, end: 0.28 },
      { word: 'غلط', confidence: 0.44, start: 0.31, end: 0.48 }
    ]
  },
  finalEvents[1],
  {
    provider: 'speechmatics',
    isFinal: false,
    start: 0.8,
    duration: 0.9,
    transcript: 'الله',
    words: [
      { word: 'الله', confidence: 0.62, start: 0.84, end: 1.12 }
    ]
  },
  finalEvents[0]
]

function comparable(result) {
  return {
    alignmentOutput: result.wordStatuses.map(word => ({
      text: word.text,
      status: word.status,
      actual: word.actual || '',
      outOfOrder: !!word.outOfOrder
    })),
    mistakeCounts: {
      missing: result.mistakes.missing.length,
      extra: result.mistakes.extra.length,
      partial: result.mistakes.partial.length,
      incorrect: result.mistakes.incorrect.length
    },
    scores: {
      accuracyScore: result.accuracyScore,
      completionPercentage: result.completionPercentage
    },
    progressStates: result.alignmentState,
    reviewRecommendations: result.reviewRecommendations,
    retentionSignals: result.retentionSignals
  }
}

const baseline = comparable(replayRecognitionSession(noisyEvents, targetText, {
  timestamp: '2026-06-11T00:00:00.000Z',
  metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
}))

for (let index = 0; index < 10; index += 1) {
  const replayed = comparable(replayRecognitionSession(noisyEvents, targetText, {
    timestamp: '2026-06-11T00:00:00.000Z',
    metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
  }))
  assert.deepEqual(replayed, baseline)
}

const reorderedFinals = comparable(replayRecognitionSession([...finalEvents].reverse(), targetText, {
  timestamp: '2026-06-11T00:00:00.000Z',
  metadata: { sessionId: 'session-1', audioHash: 'audio-1' }
}))

assert.deepEqual(reorderedFinals, baseline)
assert.equal(baseline.mistakeCounts.extra, 1)
assert.equal(baseline.scores.completionPercentage, 100)
assert.ok(baseline.retentionSignals.needsReview)

console.log('Recitation replay determinism tests passed')
