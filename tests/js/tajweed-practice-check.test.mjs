import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON, Array, Object, Set, Map, Number, String, Boolean })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/tajweed-practice-check.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') || specifier.endsWith('.mjs') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  // Reserve the cache slot before async I/O so concurrent links share one module.
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

const mod = await loadModule('resources/js/scripts/tajweedPracticeCheck/index.js')
const {
  shouldRunTajweedPracticeCheck,
  selectedRangeHasTajweedMetadata,
  buildExpectedTajweedSegments,
  classifyHoldDuration,
  expectedHoldRangeSec,
  recognitionWordsHaveReliableTimestamps,
  classifySegmentOutcome,
  aggregatePracticeBand,
  buildPracticeMessages,
  runTajweedPracticeCheck,
  resolveLiveTajweedCoach,
  holdStatusLabel,
  trimHoldDurationSec,
  HOLD_TOLERANCE,
} = mod.namespace

// Real AlQuran quran-tajweed shape: [marker[text]
const sampleTajweed = 'بِسْمِ [h:1[ٱ]للَّهِ [n[ـٰ]نِ'

assert.equal(
  shouldRunTajweedPracticeCheck({
    wasRecording: true,
    tajweedHighlightingEnabled: true,
    verses: [{ key: '1:1', arabic_tajweed: sampleTajweed }],
  }),
  true,
  'gate should pass when recording + tajweed + metadata',
)

assert.equal(
  shouldRunTajweedPracticeCheck({
    wasRecording: true,
    tajweedHighlightingEnabled: false,
    verses: [{ key: '1:1', arabic_tajweed: sampleTajweed }],
  }),
  false,
  'gate must fail when tajweed highlighting is off',
)

assert.equal(
  shouldRunTajweedPracticeCheck({
    wasRecording: false,
    tajweedHighlightingEnabled: true,
    verses: [{ key: '1:1', arabic_tajweed: sampleTajweed }],
  }),
  false,
  'gate must fail when not from a recording',
)

const verseWithGhunnah = {
  key: '2:1',
  arabic: 'الٓمٓ',
  arabic_tajweed: '[g[الٓمٓ]',
}
assert.equal(selectedRangeHasTajweedMetadata([verseWithGhunnah]), true)

const segments = buildExpectedTajweedSegments([verseWithGhunnah])
assert.ok(segments.length >= 1, `expected at least one tajweed segment, got ${segments.length}`)
assert.ok(
  segments.some((s) => s.ruleKey === 'ghunnah' || s.colour === 'green'),
  'ghunnah/green segment expected',
)

const fatihaSnippet = {
  key: '1:1',
  arabic: 'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  arabic_tajweed: 'بِسْمِ [h:1[ٱ]للَّهِ [h:2[ٱ][l[ل]رَّحْمَ[n[ـٰ]نِ [h:3[ٱ][l[ل]رَّح[p[ِي]مِ',
}
const fatihaSegments = buildExpectedTajweedSegments([fatihaSnippet])
assert.ok(fatihaSegments.length >= 2, 'fatiha sample should yield multiple rule segments')
assert.ok(fatihaSegments.some((s) => s.ruleKey === 'madd_two' || s.colour === 'red'), 'madd/red expected')

const heuristicVerse = {
  key: '1:2',
  arabic: 'الْحَمْدُ لِلَّهِ',
  arabic_tajweed: '',
}
assert.ok(Array.isArray(buildExpectedTajweedSegments([heuristicVerse])))

assert.ok(HOLD_TOLERANCE.byBeats[2].minCounts <= 1.5)
assert.ok(HOLD_TOLERANCE.byBeats[2].maxCounts >= 2.75)
assert.ok(HOLD_TOLERANCE.byBeats[4].minCounts <= 3.25)
assert.ok(HOLD_TOLERANCE.byBeats[4].maxCounts >= 5)
assert.ok(HOLD_TOLERANCE.byBeats[6].minCounts <= 5)
assert.ok(HOLD_TOLERANCE.byBeats[6].maxCounts >= 7)

const range = expectedHoldRangeSec({ expectedHoldBeats: 4, beatMs: 500, ruleKey: 'madd_four' })
assert.ok(range.minSec < range.maxSec)
assert.match(String(range.minSec), /\d/)
// 4-count @ 500ms → ~1.625s–2.5s acceptable
assert.ok(range.minSec <= 1.7)
assert.ok(range.maxSec >= 2.4)

// Wide beginner bands: near-target holds stay ok
assert.equal(classifyHoldDuration({ measuredSec: 1.0, expectedHoldBeats: 2, beatMs: 500, ruleKey: 'madd_two' }), 'ok')
assert.equal(classifyHoldDuration({ measuredSec: 0.75, expectedHoldBeats: 2, beatMs: 500, ruleKey: 'ghunnah' }), 'ok')
assert.equal(classifyHoldDuration({ measuredSec: 1.35, expectedHoldBeats: 2, beatMs: 500, ruleKey: 'ghunnah' }), 'ok')
assert.equal(classifyHoldDuration({ measuredSec: 0.2, expectedHoldBeats: 2, beatMs: 500, ruleKey: 'madd_two' }), 'short')
assert.equal(classifyHoldDuration({ measuredSec: 3.5, expectedHoldBeats: 2, beatMs: 500, ruleKey: 'madd_two' }), 'long')
assert.equal(classifyHoldDuration({ measuredSec: null, expectedHoldBeats: 2, beatMs: 500 }), 'unable_to_assess')
assert.equal(classifyHoldDuration({ measuredSec: 1.0, expectedHoldBeats: null }), 'not_applicable')

assert.equal(holdStatusLabel('ok'), 'Within the expected range')
assert.equal(holdStatusLabel('short'), 'A little short')
assert.equal(holdStatusLabel('long'), 'A little long')
assert.equal(holdStatusLabel('unable_to_assess'), 'Could not assess clearly')

assert.ok(
  Math.abs(trimHoldDurationSec({
    measuredSec: 2.5,
    startSec: 1,
    endSec: 3.5,
    nextStartSec: 2.2,
    maxPlausibleSec: 3,
  }) - 1.2) < 1e-9,
  'trailing pause before next word must be trimmed from hold',
)

assert.equal(
  recognitionWordsHaveReliableTimestamps([
    { word: 'ا', start: 0.1, end: 0.4 },
    { word: 'ب', start: 0.4, end: 0.7 },
  ]),
  true,
)
assert.equal(
  recognitionWordsHaveReliableTimestamps([{ word: 'ا' }, { word: 'ب' }]),
  false,
)

assert.equal(classifySegmentOutcome({ hold: 'ok', sound: 'similar', wordMatchOk: true }), 'strong')
assert.equal(classifySegmentOutcome({ hold: 'short', sound: 'similar', wordMatchOk: true }), 'practice')
assert.equal(classifySegmentOutcome({ hold: 'short', sound: 'different', wordMatchOk: true }), 'review')
assert.equal(classifySegmentOutcome({ hold: 'unable_to_assess', sound: 'unable_to_assess', wordMatchOk: true }), 'unable_to_assess')

assert.equal(
  aggregatePracticeBand([
    { outcome: 'strong' },
    { outcome: 'strong' },
    { outcome: 'strong' },
  ]),
  'strong',
)
assert.equal(
  aggregatePracticeBand([
    { outcome: 'strong' },
    { outcome: 'practice' },
    { outcome: 'strong' },
  ]),
  'strong',
  'one practice tip alone should stay gentle',
)
assert.equal(
  aggregatePracticeBand([
    { outcome: 'strong' },
    { outcome: 'practice' },
    { outcome: 'practice' },
  ]),
  'average',
)
assert.equal(
  aggregatePracticeBand([
    { outcome: 'review' },
    { outcome: 'review' },
    { outcome: 'review' },
  ]),
  'needs_work',
)
assert.equal(
  aggregatePracticeBand([{ outcome: 'unable_to_assess' }, { outcome: 'unable_to_assess' }]),
  'unable',
)

const strongMsg = buildPracticeMessages({
  band: 'strong',
  segments: [{ outcome: 'strong', colour: 'red', beginnerHint: 'Hold the vowel gently.', label: 'Madd', hold: 'ok', sound: 'similar' }],
})
assert.match(strongMsg.headline, /steady|practis/i)
assert.ok(strongMsg.disclaimer.length > 20)
assert.match(strongMsg.disclaimer, /practice|range|teacher/i)
assert.equal(strongMsg.crossRefs.length, 0, 'strong results should not list Continue cards')
assert.ok(strongMsg.viewDetailsLabel)

const issueMsg = buildPracticeMessages({
  band: 'needs_work',
  segments: [
    {
      outcome: 'review',
      colour: 'red',
      colourHex: '#d55245',
      beginnerHint: 'Hold the vowel gently.',
      label: 'Madd',
      ruleKey: 'madd_four',
      hold: 'short',
      sound: 'different',
      expectedHoldBeats: 4,
      beatMs: 500,
      expectedHoldSec: 2,
      holdRangeMinSec: 1.6,
      holdRangeMaxSec: 2.5,
    },
    {
      outcome: 'review',
      colour: 'red',
      colourHex: '#d55245',
      beginnerHint: 'Hold the vowel gently.',
      label: 'Madd',
      ruleKey: 'madd_four',
      hold: 'short',
      sound: 'different',
      expectedHoldBeats: 4,
      beatMs: 500,
      expectedHoldSec: 2,
      holdRangeMinSec: 1.6,
      holdRangeMaxSec: 2.5,
    },
  ],
})
assert.ok(issueMsg.crossRefs.length === 1, 'duplicate rules should collapse to one tip')
assert.equal(issueMsg.crossRefs[0].count, 2)
assert.match(issueMsg.crossRefs[0].beginner.hold, /short|range/i)
assert.match(issueMsg.crossRefs[0].beginner.sound, /listen|similar|assess/i)
assert.match(issueMsg.crossRefs[0].beginner.next, /Listen|hold|Continue|slower/i)
assert.doesNotMatch(issueMsg.segmentTips[0], /0\.\d+s vs/)
assert.doesNotMatch(JSON.stringify(issueMsg.crossRefs[0].beginner), /ms|%|confidence|similarity/i)

const withReciter = buildPracticeMessages({
  band: 'average',
  reciterName: 'Alafasy',
  segments: [{
    outcome: 'practice',
    colour: 'green',
    colourHex: '#2e9d62',
    beginnerHint: 'Keep a soft nasal sound.',
    label: 'Ghunnah',
    ruleKey: 'ghunnah',
    hold: 'short',
    sound: 'different',
    measuredHoldSec: 0.3,
    expectedHoldSec: 1.0,
    expectedHoldBeats: 2,
    beatMs: 500,
    holdRangeMinSec: 0.75,
    holdRangeMaxSec: 1.375,
  }],
})
assert.match(withReciter.crossRefs[0].beginner.rule, /Ghunnah/i)
assert.match(withReciter.crossRefs[0].beginner.hold, /short|range/i)
assert.doesNotMatch(withReciter.crossRefs[0].line, /0\.3s vs/)

const liveCoach = resolveLiveTajweedCoach({
  verses: [verseWithGhunnah],
  expectedWordIndex: 0,
  listening: true,
})
assert.ok(liveCoach)
assert.match(liveCoach.rule, /Ghunnah/i)
assert.match(liveCoach.instruction, /nasal|soft/i)
assert.match(liveCoach.status, /Listening/i)
assert.equal(liveCoach.colour, 'green')

const check = await runTajweedPracticeCheck({
  verses: [verseWithGhunnah],
  wordStatuses: [{ status: 'correct', text: 'الٓمٓ' }],
  recognitionWords: [{ word: 'الٓمٓ', confidence: 0.9 }],
  learnerBlob: null,
  resolveAyahAudioUrl: async () => {
    throw new Error('should not fetch reference audio without learner blob')
  },
  reciterName: 'Alafasy',
  trackWeakness: false,
})
assert.equal(check.assessed, true)
assert.equal(check.version, 2)
assert.ok(['strong', 'average', 'needs_work', 'unable'].includes(check.band))
assert.equal(check.timingReliable, false)
assert.equal(check.acousticAttempted, false)
assert.equal(check.reciterName, 'Alafasy')
assert.ok(check.segments.length >= 1)
assert.ok(
  check.segments.every((s) => s.hold === 'unable_to_assess' || s.hold === 'not_applicable'),
  'without timestamps, hold must not invent precise assessment',
)
assert.ok(
  check.segments.every((s) => s.sound === 'unable_to_assess'),
  'without timestamps/audio, sound must be unable_to_assess',
)
assert.match(check.disclaimer, /practice|range|teacher/i)
assert.ok(check.viewDetailsLabel)

console.log('Tajweed practice check unit tests passed')
