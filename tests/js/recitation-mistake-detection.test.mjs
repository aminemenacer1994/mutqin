import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-mistake-detection.test.mjs')) {
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

const recitation = await loadModule('resources/js/scripts/engine/recitation_analysis.js')
const {
  buildDeterministicRecitationResult,
  buildRealtimePreviewAlignment,
  createWordsFromTranscript,
  getRecitationWordSimilarity,
  stabilizeRecognitionEvent,
  createRecognitionState,
} = recitation.namespace

const target = 'قل هو الله أحد'
const opts = { strictProgression: false, timestamp: '2026-08-10T00:00:00.000Z' }

function statusesOf(result) {
  return result.wordStatuses.map(word => String(word.status))
}

function statusMap(result) {
  return Object.fromEntries(result.wordStatuses.map(word => [String(word.text), String(word.status)]))
}

function assertStatuses(result, expected) {
  assert.equal(statusesOf(result).join('|'), expected.join('|'))
}

// Fully correct recitation
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هو الله أحد'), opts)
  assertStatuses(result, ['correct', 'correct', 'correct', 'correct'])
  assert.equal(result.mistakes.missing.length, 0)
  assert.equal(result.mistakes.incorrect.length, 0)
  assert.equal(result.mistakes.extra.length, 0)
  assert.ok(result.accuracyScore >= 95)
}

// One wrong word
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هو الله صمد'), opts)
  assert.equal(statusMap(result)['أحد'], 'incorrect')
  assert.ok(result.mistakes.incorrect.some(item => item.expected === 'أحد' && item.actual === 'صمد'))
  assert.ok(result.accuracyScore < 100)
}

// Omission
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل الله أحد'), opts)
  assert.equal(statusMap(result)['هو'], 'omitted')
  assert.ok(result.mistakes.missing.includes('هو'))
}

// Repetition
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هو هو الله أحد'), opts)
  assert.ok(result.mistakes.repeated.includes('هو') || result.repeatedWords.some(item => item.normalizedWord === 'هو'))
  assert.equal(
    result.wordStatuses.filter(word => word.status === 'correct').map(word => word.text).join('|'),
    ['قل', 'هو', 'الله', 'أحد'].join('|')
  )
}

// Insertion
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هو يا الله أحد'), opts)
  assert.ok(result.extraWords.some(item => item.word === 'يا'))
  assert.ok(result.mistakes.extra.includes('يا'))
  assert.equal(statusMap(result)['الله'], 'correct')
}

// Skipped phrase
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل أحد'), opts)
  assert.equal(statusMap(result)['هو'], 'omitted')
  assert.equal(statusMap(result)['الله'], 'omitted')
  assert.equal(statusMap(result)['أحد'], 'correct')
  assert.ok(result.mistakes.missing.includes('هو'))
  assert.ok(result.mistakes.missing.includes('الله'))
}

// Soft ASR letter swap must not silently mark correct (false negative)
{
  assert.ok(
    getRecitationWordSimilarity('قل', 'كل') < 0.78,
    'soft ق/ك conflation must stay below the correct floor'
  )
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('كل هو الله أحد'), opts)
  assert.notEqual(statusMap(result)['قل'], 'correct', 'ق→ك letter mistake must not be green')
  assert.ok(['partial', 'incorrect'].includes(statusMap(result)['قل']))
}

// Short-word substitution is a real mistake, not amber "close"
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هي الله أحد'), opts)
  assert.equal(statusMap(result)['هو'], 'incorrect')
  assert.ok(result.mistakes.incorrect.some(item => item.expected === 'هو' && item.actual === 'هي'))
}

// Recognition failure / low confidence must not become a learner omission
{
  let state = createRecognitionState()
  state = stabilizeRecognitionEvent(state, {
    provider: 'speechmatics',
    isFinal: true,
    start: 0,
    duration: 2,
    words: [
      { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3 },
      { word: 'هو', confidence: 0.25, start: 0.35, end: 0.5 },
      { word: 'الله', confidence: 0.9, start: 0.55, end: 0.8 },
      { word: 'أحد', confidence: 0.92, start: 0.85, end: 1.1 },
    ],
  }, { confidenceThreshold: 0.40 })
  assert.ok(state.rejectedWords.some(word => word.word === 'هو'))
  const result = buildDeterministicRecitationResult(target, state.committedWords, {
    ...opts,
    rejectedWords: state.rejectedWords,
  })
  assert.equal(statusMap(result)['هو'], 'uncertain')
  assert.ok(!result.mistakes.missing.includes('هو'), 'uncertain recognition must not count as missing')
  assert.ok((result.mistakes.uncertain || []).some(item => item.expected === 'هو'))
}

// Pause-separated repetition is kept; nearby ASR re-emit is not a learner mistake
{
  const pauseRepeat = [
    { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3, segmentId: 'a' },
    { word: 'هو', confidence: 0.95, start: 0.35, end: 0.5, segmentId: 'a' },
    { word: 'هو', confidence: 0.95, start: 1.2, end: 1.4, segmentId: 'b' },
    { word: 'الله', confidence: 0.95, start: 1.5, end: 1.8, segmentId: 'b' },
    { word: 'أحد', confidence: 0.95, start: 1.9, end: 2.1, segmentId: 'b' },
  ]
  const pauseResult = buildDeterministicRecitationResult(target, pauseRepeat, opts)
  assert.ok(pauseResult.extraWords.some(item => item.type === 'repetition' && item.word === 'هو'))
  assert.equal(statusMap(pauseResult)['أحد'], 'correct')

  const reemit = [
    { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3, segmentId: 'a' },
    { word: 'هو', confidence: 0.9, start: 0.35, end: 0.5, segmentId: 'a' },
    { word: 'هو', confidence: 0.95, start: 0.36, end: 0.52, segmentId: 'a' },
    { word: 'الله', confidence: 0.95, start: 0.55, end: 0.8, segmentId: 'a' },
    { word: 'أحد', confidence: 0.95, start: 0.85, end: 1.1, segmentId: 'a' },
  ]
  const reemitResult = buildDeterministicRecitationResult(target, reemit, opts)
  assert.equal(reemitResult.extraWords.length, 0)
  assert.equal(reemitResult.mistakes.repeated.length, 0)
  assert.ok(reemitResult.accuracyScore >= 95)
}

// Live exact-skip window detects skipped phrases without fuzzy lookahead
{
  const liveSkip = buildRealtimePreviewAlignment(
    target,
    createWordsFromTranscript('قل أحد'),
    {
      lookahead: 0,
      exactSkipLookahead: 3,
      strictProgression: true,
      advanceOnIncorrect: true,
      correctSimilarity: 0.85,
      partialSimilarity: 0.55,
    }
  )
  assert.equal(liveSkip.statuses[0].status, 'correct')
  assert.equal(liveSkip.statuses[1].status, 'omitted')
  assert.equal(liveSkip.statuses[2].status, 'omitted')
  assert.equal(liveSkip.statuses[3].status, 'correct')
}

// Partial phrase recitation marks remaining words omitted (final assessment)
{
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('قل هو'), opts)
  assert.equal(statusMap(result)['قل'], 'correct')
  assert.equal(statusMap(result)['هو'], 'correct')
  assert.equal(statusMap(result)['الله'], 'omitted')
  assert.equal(statusMap(result)['أحد'], 'omitted')
}

// Jump ahead across ayahs
{
  const rangeAyahs = [
    { key: '112:1', number: 1, text: 'قل هو الله أحد' },
    { key: '112:2', number: 2, text: 'الله الصمد' },
  ]
  const result = buildDeterministicRecitationResult(
    'قل هو الله أحد الله الصمد',
    createWordsFromTranscript('قل هو الله الصمد'),
    { ...opts, targetAyahs: rangeAyahs }
  )
  assert.ok(result.mistakes.missing.includes('أحد') || result.wordStatuses.some(word => word.text === 'أحد' && word.status === 'omitted'))
  assert.ok(result.verseJumpDetected || result.mistakes.missing.length >= 1)
}

console.log('recitation-mistake-detection: ok')
