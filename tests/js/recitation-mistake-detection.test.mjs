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
  classifyRecitationWordColor,
  getRecitationColorCounts,
  deriveWeakAyahsFromWordStatuses,
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
  // Soft ق/ك conflation must stay below the correct floor
  assert.ok(
    getRecitationWordSimilarity('قل', 'كل') < 0.79,
    'soft ق/ك conflation must stay below the correct floor'
  )
  const result = buildDeterministicRecitationResult(target, createWordsFromTranscript('كل هو الله أحد'), opts)
  assert.notEqual(statusMap(result)['قل'], 'correct', 'ق→ك letter mistake must not be green')
  assert.ok(['partial', 'incorrect'].includes(statusMap(result)['قل']))
}

// Longer soft letter swaps (صراط/سراط) must also stay below green
{
  assert.ok(
    getRecitationWordSimilarity('الصراط', 'السراط') <= 0.74,
    'ص/س on longer words must stay at/under soft cap'
  )
  const result = buildDeterministicRecitationResult(
    'اهدنا الصراط المستقيم',
    createWordsFromTranscript('اهدنا السراط المستقيم'),
    opts,
  )
  assert.notEqual(statusMap(result)['الصراط'], 'correct', 'صراط→سراط must not be green')
  assert.equal(statusMap(result)['الصراط'], 'partial')
}

// Hard single-letter edits on longer words must not paint green (1 − 1/n hole)
{
  assert.ok(
    getRecitationWordSimilarity('الضالين', 'الدالين') <= 0.74,
    'ض→د single edit must stay at/under soft cap'
  )
  const result = buildDeterministicRecitationResult(
    'غير المغضوب عليهم ولا الضالين',
    createWordsFromTranscript('غير المغضوب عليهم ولا الدالين'),
    opts,
  )
  assert.equal(statusMap(result)['الضالين'], 'partial', 'ض→د ASR near-miss stays amber, never green')
  assert.ok(!result.mistakes.incorrect.some(item => item.expected === 'الضالين'))
}

// Soft mid-length near-miss (الحمد→الحمت) stays amber, never green
{
  const result = buildDeterministicRecitationResult(
    'الحمد لله',
    createWordsFromTranscript('الحمت لله'),
    opts,
  )
  assert.notEqual(statusMap(result)['الحمد'], 'correct')
  assert.equal(statusMap(result)['الحمد'], 'partial')
}

// ASR truncation (insertion/deletion) stays amber, never green
{
  assert.ok(getRecitationWordSimilarity('العالمين', 'العالمي') <= 0.74)
  const result = buildDeterministicRecitationResult(
    'الحمد لله رب العالمين',
    createWordsFromTranscript('الحمد لله رب العالمي'),
    opts,
  )
  assert.equal(statusMap(result)['العالمين'], 'partial')
}

// Mushaf dagger-alef (ٰ) must match plain ASR — these were permanent false reds
{
  assert.equal(getRecitationWordSimilarity('ٱلْعَٰلَمِينَ', 'العالمين'), 1)
  assert.equal(getRecitationWordSimilarity('ٱلصِّرَٰطَ', 'الصراط'), 1)
  assert.equal(getRecitationWordSimilarity('مَلِكِ', 'ملك'), 1)
  assert.equal(getRecitationWordSimilarity('مَٰلِكِ', 'ملك'), 1)
  assert.equal(getRecitationWordSimilarity('الرَّحْمَٰنِ', 'الرحمن'), 1)
  // Even the historically broken stem (dagger deleted) must still match via optional alef.
  assert.equal(getRecitationWordSimilarity('العلمين', 'العالمين'), 1)
  assert.equal(getRecitationWordSimilarity('الصرط', 'الصراط'), 1)

  const result = buildDeterministicRecitationResult(
    'الْحَمْدُ لِلَّهِ رَبِّ ٱلْعَٰلَمِينَ مَلِكِ يَوْمِ ٱلدِّينِ ٱهْدِنَا ٱلصِّرَٰطَ ٱلْمُسْتَقِيمَ',
    createWordsFromTranscript('الحمد لله رب العالمين ملك يوم الدين اهدنا الصراط المستقيم'),
    opts,
  )
  assert.equal(statusMap(result)['ٱلْعَٰلَمِينَ'], 'correct')
  assert.equal(statusMap(result)['مَلِكِ'], 'correct')
  assert.equal(statusMap(result)['ٱلصِّرَٰطَ'], 'correct')
  assert.ok(result.accuracyScore >= 95)
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

  // Short-gap ASR re-emit (non-overlapping) must not count as a learner repetition.
  const shortGapReemit = [
    { word: 'قل', confidence: 0.95, start: 0.1, end: 0.3, segmentId: 'a' },
    { word: 'هو', confidence: 0.9, start: 0.35, end: 0.5, segmentId: 'a' },
    { word: 'هو', confidence: 0.95, start: 0.72, end: 0.9, segmentId: 'a' },
    { word: 'الله', confidence: 0.95, start: 0.95, end: 1.2, segmentId: 'a' },
    { word: 'أحد', confidence: 0.95, start: 1.25, end: 1.5, segmentId: 'a' },
  ]
  const shortGapResult = buildDeterministicRecitationResult(target, shortGapReemit, opts)
  assert.equal(shortGapResult.extraWords.length, 0)
  assert.equal(shortGapResult.mistakes.repeated.length, 0)
  assert.equal(shortGapResult.repeatedWords.length, 0)
  assert.ok(shortGapResult.accuracyScore >= 95)
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

// Live exact-skip with stop-on-mistake still paints omissions (AMD path)
{
  const liveSkip = buildRealtimePreviewAlignment(
    target,
    createWordsFromTranscript('قل أحد'),
    {
      lookahead: 0,
      exactSkipLookahead: 3,
      strictProgression: true,
      advanceOnIncorrect: false,
      partialAdvances: true,
      correctSimilarity: 0.79,
      partialSimilarity: 0.45,
    }
  )
  assert.equal(liveSkip.statuses[0].status, 'correct')
  assert.equal(liveSkip.statuses[1].status, 'omitted', 'skipped words must be omitted, not false incorrect')
  assert.equal(liveSkip.statuses[2].status, 'omitted')
  assert.equal(liveSkip.statuses[3].status, 'correct')
}

// Soft-continue must not overwrite a red with the next heard word on the same slot
{
  const live = buildRealtimePreviewAlignment(
    'الحمد لله رب العالمين الرحمن الرحيم',
    createWordsFromTranscript('الحمد لله رب صمد الرحمن الرحيم'),
    {
      lookahead: 0,
      exactSkipLookahead: 3,
      strictProgression: true,
      advanceOnIncorrect: true,
      partialAdvances: true,
      correctSimilarity: 0.79,
      partialSimilarity: 0.45,
    }
  )
  assert.equal(live.statuses[3].status, 'incorrect', 'صمد must stay red on العالمين')
  assert.equal(live.statuses[3].actual, 'صمد')
  assert.equal(live.statuses[4].status, 'correct')
  assert.equal(live.statuses[5].status, 'correct')
}

// Soft-continue skip: next-word match paints omitted, not false incorrect
{
  const live = buildRealtimePreviewAlignment(
    'الحمد لله رب العالمين',
    createWordsFromTranscript('الحمد لله العالمين'),
    {
      lookahead: 0,
      exactSkipLookahead: 3,
      strictProgression: true,
      advanceOnIncorrect: true,
      partialAdvances: true,
      correctSimilarity: 0.79,
      partialSimilarity: 0.45,
    }
  )
  assert.equal(live.statuses[2].status, 'omitted', 'رب skipped must be omitted')
  assert.equal(live.statuses[3].status, 'correct')
}

// Stop-on-mistake: a later correct retry of the same word must recover the slot
{
  const live = buildRealtimePreviewAlignment(
    'الحمد لله رب العالمين',
    createWordsFromTranscript('الحمد لله رب صمد العالمين'),
    {
      lookahead: 0,
      exactSkipLookahead: 0,
      strictProgression: true,
      advanceOnIncorrect: false,
      partialAdvances: false,
      correctSimilarity: 0.70,
      partialSimilarity: 0.45,
    }
  )
  assert.equal(live.statuses[3].status, 'correct', 'retry of العالمين after صمد must recover')
  assert.equal(live.statuses[3].actual, 'العالمين')
}

// Mid-confidence wrong words must paint red, not vanish as noise
{
  const words = createWordsFromTranscript('قل هو الله صمد').map((w) => ({ ...w, confidence: 0.52 }))
  const live = buildRealtimePreviewAlignment(target, words, {
    lookahead: 0,
    exactSkipLookahead: 3,
    strictProgression: true,
    advanceOnIncorrect: false,
    partialAdvances: true,
    correctSimilarity: 0.79,
    partialSimilarity: 0.45,
    uncertainConfidence: 0.48,
    minConfidenceForSimilarityCorrect: 0.28,
  })
  assert.equal(live.statuses[3].status, 'incorrect')
  assert.equal(live.statuses[3].actual, 'صمد')
}

// Partial near-miss stays amber
{
  const live = buildRealtimePreviewAlignment(
    'الحمد لله رب العالمين',
    createWordsFromTranscript('الحمد لله رب العاليمن'),
    {
      lookahead: 0,
      exactSkipLookahead: 3,
      strictProgression: true,
      advanceOnIncorrect: true,
      partialAdvances: true,
      correctSimilarity: 0.79,
      partialSimilarity: 0.45,
    }
  )
  assert.equal(live.statuses[3].status, 'partial')
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

{
  assert.equal(classifyRecitationWordColor('word-correct'), 'green')
  assert.equal(classifyRecitationWordColor('close'), 'amber')
  // API / server "missing" is an omission (black), not a substitution (red).
  assert.equal(classifyRecitationWordColor('missing'), 'black')
  assert.equal(classifyRecitationWordColor('omission'), 'black')
  assert.equal(classifyRecitationWordColor('minor_mistake'), 'amber')
  assert.equal(classifyRecitationWordColor('pending'), 'gray')
  const counts = getRecitationColorCounts([
    { status: 'correct', ayahNumber: 1 },
    { status: 'close', ayahNumber: 1 },
    { status: 'incorrect', ayahNumber: 2 },
    { status: 'omitted', ayahNumber: 2 },
  ])
  assert.equal(counts.green, 1)
  assert.equal(counts.amber, 1)
  assert.equal(counts.red, 1)
  assert.equal(counts.black, 1)
  const weak = deriveWeakAyahsFromWordStatuses([
    { status: 'incorrect', ayahNumber: 2 },
    { status: 'partial', ayah_number: 3 },
    { status: 'partial', ayah_number: 3 },
  ])
  assert.equal(weak.map(Number).join(','), '2,3')
  // A single amber is enough to surface a weak ayah.
  assert.equal(
    deriveWeakAyahsFromWordStatuses([{ status: 'partial', ayahNumber: 4 }]).map(Number).join(','),
    '4',
  )
}

// Surah Quraysh: mushaf hamza orthography must match plain ASR (وءامن vs وامن, li-ilaaf).
{
  const quraysh = 'لِإِيلَٰفِ قُرَيْشٍ إِيلَٰفِهِمْ رِحْلَةَ ٱلشِّتَآءِ وَٱلصَّيْفِ ٱلَّذِىٓ أَطْعَمَهُم مِّن جُوعٍ وَءَامَنَهُم مِّنْ خَوْفٍ'
  const heard = 'لإيلاف قريش إيلافهم رحلة الشتاء والصيف الذي أطعمهم من جوع وآمنهم من خوف'
  assert.equal(getRecitationWordSimilarity('وَءَامَنَهُم', 'وآمنهم'), 1)
  assert.equal(getRecitationWordSimilarity('وَءَامَنَهُم', 'وامنهم'), 1)
  assert.equal(getRecitationWordSimilarity('لِإِيلَٰفِ', 'لإيلاف'), 1)
  assert.equal(getRecitationWordSimilarity('إِيلَٰفِهِمْ', 'إيلافهم'), 1)

  const final = buildDeterministicRecitationResult(
    quraysh,
    createWordsFromTranscript(heard),
    opts,
  )
  assert.equal(final.wordStatuses.find((w) => w.text === 'وَءَامَنَهُم')?.status, 'correct')
  assert.equal(final.wordStatuses.find((w) => w.text === 'لِإِيلَٰفِ')?.status, 'correct')
  assert.equal(final.wordStatuses.find((w) => w.text === 'إِيلَٰفِهِمْ')?.status, 'correct')

  const live = buildRealtimePreviewAlignment(quraysh, createWordsFromTranscript(heard), {
    ...opts,
    correctSimilarity: 0.63,
    partialSimilarity: 0.36,
    uncertainConfidence: 0.48,
    minConfidenceForSimilarityCorrect: 0.28,
  })
  assert.ok(live.statuses.every((word) => word.status === 'correct'))
}

console.log('recitation-mistake-detection: ok')
