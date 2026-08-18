import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON, Array, Object, Number, String, Boolean })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-timing-buffer.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') || specifier.endsWith('.mjs') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const mod = await loadModule('resources/js/scripts/memorisationDetection/recitationTimingBuffer.js')
const {
  applyRecitationTimingBuffer,
  buildRecitationAdaptivePaceContext,
  computeSilenceAutoStopThresholdMs,
  computeWordTimingGraceMs,
  createRecitationPaceObserver,
  estimateRecitationPaceFactor,
  estimateSessionRecitationPaceFactor,
  isAyahBoundaryWord,
  isTajweedHeavyRecitation,
  observeRecitationPaceFromRecognition,
  resolveAdaptiveLivePaceParams,
  shouldDeferLiveIncorrectStatus,
  wordLikelyNeedsTajweedHold,
  ADAPTIVE_PACE_BASE_WORDS_PER_SECOND,
  ADAPTIVE_PACE_MAX_WORDS_PER_SECOND,
  ADAPTIVE_PACE_MIN_WORDS_PER_SECOND,
  RECITATION_MIN_SILENCE_STOP_MS,
  RECITATION_MAX_SILENCE_STOP_MS,
  RECENT_PACE_SAMPLE_MAX,
} = mod.namespace

{
  assert.equal(wordLikelyNeedsTajweedHold('الۤمۤ'), true)
  assert.equal(wordLikelyNeedsTajweedHold('الرحيم'), false)
}

{
  const units = [
    { display: 'قل', ayahNumber: 1, ayahKey: '112:1' },
    { display: 'هو', ayahNumber: 1, ayahKey: '112:1' },
    { display: 'الله', ayahNumber: 2, ayahKey: '112:2' },
  ]
  assert.equal(isAyahBoundaryWord(1, units, [{ start: 0, end: 2 }, { start: 2, end: 3 }]), true)
  assert.equal(isAyahBoundaryWord(0, units, [{ start: 0, end: 2 }, { start: 2, end: 3 }]), false)
}

{
  const slow = estimateRecitationPaceFactor({
    recognitionWords: [
      { start: 0.0, end: 0.8 },
      { start: 2.5, end: 3.3 },
      { start: 5.0, end: 5.9 },
    ],
  })
  assert.ok(slow > 1.2, 'long gaps between ASR words imply slower pace')
}

{
  const baseGrace = computeWordTimingGraceMs({
    wordIndex: 0,
    targetUnits: [
      { display: 'قل', ayahNumber: 1 },
      { display: 'هو', ayahNumber: 1 },
    ],
  })
  const ayahGrace = computeWordTimingGraceMs({
    wordIndex: 1,
    targetUnits: [
      { display: 'قل', ayahNumber: 1 },
      { display: 'هو', ayahNumber: 1 },
      { display: 'الله', ayahNumber: 2 },
    ],
    ayahBounds: [{ start: 0, end: 2 }, { start: 2, end: 3 }],
  })
  const maddGrace = computeWordTimingGraceMs({
    wordIndex: 0,
    targetUnits: [{ display: 'الۤمۤ' }],
    paceFactor: 1.4,
  })
  assert.ok(baseGrace >= 380)
  assert.ok(ayahGrace > baseGrace, 'ayah boundary adds extra tolerance')
  assert.ok(maddGrace > baseGrace, 'madd-like words add tajweed hold tolerance')
}

{
  const normalStop = computeSilenceAutoStopThresholdMs({
    wordIndex: 0,
    targetUnits: [{ display: 'قل' }],
  })
  const slowAyahStop = computeSilenceAutoStopThresholdMs({
    wordIndex: 1,
    targetUnits: [
      { display: 'الرحمن', ayahNumber: 1 },
      { display: 'الرحيم', ayahNumber: 1 },
    ],
    paceFactor: 1.8,
    ayahBounds: [{ start: 0, end: 2 }],
    isSessionRecitation: true,
  })
  assert.ok(normalStop >= RECITATION_MIN_SILENCE_STOP_MS)
  assert.ok(slowAyahStop <= RECITATION_MAX_SILENCE_STOP_MS)
  assert.ok(slowAyahStop > normalStop, 'slow ayah-end recitation gets a longer silence budget')
}

// Adaptive live pace: fast sessions raise the paint ceiling; slow sessions stay patient.
{
  const fast = resolveAdaptiveLivePaceParams({ paceFactor: 0.72 })
  const slow = resolveAdaptiveLivePaceParams({ paceFactor: 1.85, tajweedHeavy: true })
  assert.ok(fast.maxWordsPerSecond > ADAPTIVE_PACE_BASE_WORDS_PER_SECOND)
  assert.ok(fast.maxWordsPerSecond <= ADAPTIVE_PACE_MAX_WORDS_PER_SECOND)
  assert.ok(slow.maxWordsPerSecond < ADAPTIVE_PACE_BASE_WORDS_PER_SECOND)
  assert.ok(slow.maxWordsPerSecond >= ADAPTIVE_PACE_MIN_WORDS_PER_SECOND)
  assert.ok(fast.maxAdvancePerUpdate > slow.maxAdvancePerUpdate, 'fast reciters may paint ahead in larger steps')
  assert.ok(fast.dripMs < slow.dripMs, 'slow / tajweed-heavy sessions drip more patiently')
}

// Recent-session observer prefers rolling intervals over one early outlier.
{
  let observer = createRecitationPaceObserver()
  const units = [{ display: 'قل' }, { display: 'هو' }, { display: 'الۤمۤ' }, { display: 'الرحۤمۤن' }]
  const words = [
    { word: 'قل', start: 0.0, end: 0.5 },
    { word: 'هو', start: 3.0, end: 3.4 },
    { word: 'الۤمۤ', start: 3.8, end: 4.5 },
    { word: 'الرحۤمۤن', start: 5.0, end: 5.4 },
  ]
  for (let i = 1; i < words.length; i += 1) {
    observer = observeRecitationPaceFromRecognition(observer, {
      recognitionWords: words.slice(0, i + 1),
      targetUnits: units,
    })
  }
  assert.equal(observer.samples.length, words.length - 1)
  assert.ok(observer.samples.length <= RECENT_PACE_SAMPLE_MAX)
  const sessionPace = estimateSessionRecitationPaceFactor({
    observer,
    recognitionWords: words,
  })
  assert.ok(sessionPace > 1, 'recent slow steps dominate the rolling pace estimate')
  assert.ok(isTajweedHeavyRecitation(observer, sessionPace))
  const context = buildRecitationAdaptivePaceContext({
    observer,
    recognitionWords: words,
    targetUnits: units,
  })
  assert.ok(context.livePace.maxWordsPerSecond < ADAPTIVE_PACE_BASE_WORDS_PER_SECOND)
}

// Premature skip-ahead omissions are held pending during grace.
{
  const now = 10_000
  const statuses = [
    { text: 'قل', status: 'correct' },
    { text: 'هو', status: 'omitted' },
    { text: 'الله', status: 'omitted' },
    { text: 'أحد', status: 'correct' },
  ]
  const buffered = applyRecitationTimingBuffer(statuses, {
    nowMs: now,
    lastSpeechAtMs: now - 900,
    confirmedWordIndex: 1,
    recognitionWords: [
      { word: 'قل', start: 0.1, end: 0.4 },
      { word: 'أحد', start: 1.0, end: 1.3 },
    ],
    targetUnits: statuses,
  })
  assert.equal(buffered[1].status, 'pending')
  assert.equal(buffered[2].status, 'pending')
}

// Genuine omissions after grace still surface.
{
  const now = 20_000
  const statuses = [
    { text: 'قل', status: 'correct' },
    { text: 'هو', status: 'omitted' },
    { text: 'الله', status: 'omitted' },
    { text: 'أحد', status: 'correct' },
  ]
  const buffered = applyRecitationTimingBuffer(statuses, {
    nowMs: now,
    lastSpeechAtMs: now - 5000,
    confirmedWordIndex: 1,
    recognitionWords: [
      { word: 'قل', start: 0.1, end: 0.4 },
      { word: 'أحد', start: 1.0, end: 1.3 },
    ],
    targetUnits: statuses,
  })
  assert.equal(buffered[1].status, 'omitted')
  assert.equal(buffered[2].status, 'omitted')
}

// Final assessment must not be softened.
{
  const statuses = [{ text: 'قل', status: 'omitted' }]
  const buffered = applyRecitationTimingBuffer(statuses, {
    finalizing: true,
    lastSpeechAtMs: Date.now(),
  })
  assert.equal(buffered[0].status, 'omitted')
}

// Timing buffer never promotes to correct and never softens incorrect detection.
{
  const now = 10_000
  const statuses = [
    { text: 'قل', status: 'correct' },
    { text: 'هو', status: 'incorrect', similarity: 0.2, confidence: 0.3 },
    { text: 'الله', status: 'partial' },
    { text: 'أحد', status: 'omitted' },
  ]
  const buffered = applyRecitationTimingBuffer(statuses, {
    nowMs: now,
    lastSpeechAtMs: now - 500,
    confirmedWordIndex: 1,
    recognitionWords: [{ word: 'قل', start: 0.1, end: 0.4 }],
    targetUnits: statuses,
  })
  assert.equal(buffered[0].status, 'correct')
  assert.equal(buffered[1].status, 'incorrect', 'incorrect-word detection is never deferred')
  assert.equal(buffered[2].status, 'partial')
  assert.equal(buffered[3].status, 'pending', 'premature omission may wait during grace')
  assert.equal(buffered[3].note, '', 'timing buffer must not expose waiting copy to learners')
  assert.equal(shouldDeferLiveIncorrectStatus({ similarity: 0.2, confidence: 0.3 }), true)
}

// Wiring: live recitation applies the timing buffer while recording.
{
  const js = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  assert.match(js, /applyRecitationTimingBuffer\(/)
  assert.match(js, /computeSilenceAutoStopThresholdMs\(/)
  assert.match(js, /getRecitationAdaptivePaceContext\(/)
  assert.match(js, /resolveAdaptiveLivePaceParams\(/)
  assert.match(js, /adaptiveLivePace/)
  assert.match(js, /createRecitationPaceObserver\(/)
  assert.match(js, /finalizing:\s*!(?:this\.)?recitationCheckRecording/)
  assert.match(
    js,
    /buildAmdLiveAssessmentResult[\s\S]*?assessRecitationRecognitionWords\(/,
    'AMD final assessment uses deterministic alignment, not live paint',
  )
}

console.log('recitation-timing-buffer.test.mjs: ok')
