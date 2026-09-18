import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const cache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/speechmatics-pause-detection.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') ? '' : '.js'}`)
    : path.resolve(root, specifier)
  if (cache.has(resolved)) return cache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const module = new vm.SourceTextModule(source, {
    context,
    identifier: resolved,
  })
  cache.set(resolved, module)
  await module.link(child => loadModule(child, resolved))
  await module.evaluate()
  return module
}

const engine = await loadModule('resources/js/scripts/engine/recitation_analysis.js')
const { RECITATION_PAUSE_POLICY, buildQuranAlignment, buildRealtimePreviewAlignment } = engine.namespace

function timed(words, gap = 0.1) {
  let start = 0
  return words.map((word, index) => {
    const duration = 0.2
    const result = { word, confidence: 0.95, start, end: start + duration }
    start += duration + (Array.isArray(gap) ? gap[index] || 0 : gap)
    return result
  })
}

function hesitation(result) {
  return result.events.find(event => event.type === 'HESITATION')
}

// Normal short pauses, including a modest ayah-boundary pause, are ignored.
{
  const result = buildQuranAlignment('الحمد لله رب العالمين', timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.1, 0.8, 0.1, 0.1]))
  assert.equal(hesitation(result), undefined)
  assert.deepEqual(Array.from(result.wordStatuses, word => word.type), ['MATCH', 'MATCH', 'MATCH', 'MATCH'])
}

// A long Speechmatics word gap becomes amber feedback with both neighbours retained.
{
  const result = buildQuranAlignment('الحمد لله رب العالمين', timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.1, 1.6, 0.1, 0.1]))
  const event = hesitation(result)
  assert.equal(event.type, 'HESITATION')
  assert.equal(event.previousRecognisedIndex, 1)
  assert.equal(event.recognisedIndex, 2)
  assert.equal(event.previousExpectedIndex, 1)
  assert.equal(event.expectedIndex, 2)
  assert.equal(event.durationSeconds, 1.6)
  assert.equal(event.highlight, 'amber')
  assert.equal(event.fatal, false)
  assert.deepEqual(Array.from(result.wordStatuses, word => word.status), ['correct', 'correct', 'correct', 'correct'])
}

// Live committed Speechmatics words expose the same event and remain non-blocking.
{
  const result = buildRealtimePreviewAlignment(
    'الحمد لله رب العالمين',
    timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.1, 1.6, 0.1, 0.1]),
    { lifecycle: 'live' },
  )
  assert.equal(hesitation(result).lifecycle, 'live')
  assert.equal(result.wordStatuses.every(word => word.status === 'correct'), true)
  assert.equal(result.scenarioCounts.hesitations, 1)
}

// A pause before a corrected word keeps the correction amber and does not erase progress.
{
  const result = buildQuranAlignment('الحمد لله رب العالمين', [
    { word: 'الحمد', start: 0, end: 0.2 },
    { word: 'لله', start: 0.3, end: 0.5 },
    { word: 'الرحمن', start: 0.6, end: 0.8 },
    { word: 'رب', start: 2.3, end: 2.5 },
    { word: 'العالمين', start: 2.6, end: 2.9 },
  ])
  assert.equal(result.extraWords[0].type, 'SELF_CORRECTION')
  assert.equal(result.extraWords[0].highlight, 'amber')
  assert.equal(hesitation(result).previousRecognisedIndex, 2)
  assert.equal(hesitation(result).recognisedIndex, 3)
  assert.equal(result.wordStatuses.some(word => word.type === 'DELETION'), false)
}

// Silence is never a deletion: the following recognised word owns the next slot.
{
  const result = buildQuranAlignment('الحمد لله رب العالمين', timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.1, 2.0, 0.1, 0.1]))
  assert.equal(result.wordStatuses.some(word => word.type === 'DELETION'), false)
  assert.equal(result.scenarioCounts.skipped_words, 0)
  assert.equal(result.wordStatuses[2].status, 'correct')
}

// Fast and slow-but-natural recitations stay below the single central threshold.
{
  const fast = buildQuranAlignment('الحمد لله رب العالمين', timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.02, 0.02, 0.02, 0.02]))
  const slow = buildQuranAlignment('الحمد لله رب العالمين', timed(['الحمد', 'لله', 'رب', 'العالمين'], [0.7, 0.7, 0.7, 0.7]))
  assert.equal(hesitation(fast), undefined)
  assert.equal(hesitation(slow), undefined)
  assert.equal(RECITATION_PAUSE_POLICY.hesitationSeconds, 1.35)
}

console.log('speechmatics-pause-detection.test.mjs: ok')
