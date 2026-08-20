import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  PRACTICE_SCOPE,
  applyScopeToRecommendationSettings,
  buildWeakOnlyPracticeSequence,
  canMarkAyahMasteredFromPractice,
  compareRevisionAttempts,
  doubleDownRevisionRepetitions,
  normalisePracticeScope,
  recommendPracticeScope,
  resolveRevisionSessionRange,
} from '../../resources/js/scripts/recommendations/revisionPracticeScope.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const learning = readFileSync(join(root, 'resources/js/scripts/api/learning.js'), 'utf8')
const saveReq = readFileSync(join(root, 'app/Http/Requests/Learning/SaveRecommendationSettingsRequest.php'), 'utf8')

{
  assert.equal(normalisePracticeScope('weak_areas'), PRACTICE_SCOPE.WEAK_AREAS)
  assert.equal(normalisePracticeScope('full_range'), PRACTICE_SCOPE.FULL_RANGE)
  assert.equal(normalisePracticeScope('garbage'), null)
}

// Weak-only session generation + phrase grouping
{
  const sequence = buildWeakOnlyPracticeSequence({
    surahId: 93,
    sessionFrom: 1,
    sessionTo: 5,
    weakAyahs: [],
    weakWords: [
      { surahId: 93, ayahNumber: 1, wordIndex: 0, text: 'وَالضُّحَىٰ' },
      { surahId: 93, ayahNumber: 1, wordIndex: 1, text: 'وَاللَّيْلِ' },
      { surahId: 93, ayahNumber: 1, wordIndex: 4, text: 'سَجَىٰ' },
    ],
    ayahTokensByKey: {
      '93:1': ['وَالضُّحَىٰ', 'وَاللَّيْلِ', 'إِذَا', 'سَجَىٰ', 'مَا', 'وَدَّعَكَ'],
    },
    ayahWordCounts: { '93:1': 6 },
  })
  assert.ok(sequence.focusItemCount >= 1)
  assert.ok(sequence.items.every((item) => Array.isArray(item.weakWordIndexes)))
  // Nearby indexes 0 and 1 should group; 4 is separate or padded into context.
  const phrases = sequence.items.filter((item) => item.type === 'phrase' || item.type === 'word')
  assert.ok(phrases.length >= 1)
  const grouped = phrases.find((item) => item.weakWordIndexes.includes(0) && item.weakWordIndexes.includes(1))
  assert.ok(grouped, 'nearby weak words group into one phrase')
  assert.equal(grouped.displayText.includes('وَالضُّحَىٰ'), true)
  assert.ok(sequence.estimatedDuration.minutes >= 1)
  assert.ok(sequence.wordIds.includes('93:1:0'))
}

// Invalid / missing weak-word references are skipped
{
  const sequence = buildWeakOnlyPracticeSequence({
    surahId: 1,
    weakWords: [
      { text: 'missing-index' },
      { ayahNumber: 2, wordIndex: -1, text: 'bad' },
      { surahId: 1, ayahNumber: 2, wordIndex: 3, text: 'ٱلرَّحْمَٰنِ' },
    ],
    ayahTokensByKey: {
      '1:2': ['ٱلْحَمْدُ', 'لِلَّهِ', 'رَبِّ', 'ٱلرَّحْمَٰنِ'],
    },
  })
  assert.equal(sequence.focusItemCount, 1)
  assert.deepEqual(sequence.ayahIds, [2])
  assert.ok(!sequence.items[0].displayText || sequence.items[0].displayText.includes('ٱلرَّحْمَٰنِ'))
}

// Full-session range keeps outer window; weak-only narrows
{
  const full = resolveRevisionSessionRange({
    scope: PRACTICE_SCOPE.FULL_RANGE,
    sessionFrom: 1,
    sessionTo: 8,
    weakAyahs: [3, 4],
  })
  assert.equal(full.from, 1)
  assert.equal(full.to, 8)
  assert.deepEqual(full.focus_ayahs, [3, 4])

  const weak = resolveRevisionSessionRange({
    scope: PRACTICE_SCOPE.WEAK_AREAS,
    sessionFrom: 1,
    sessionTo: 8,
    weakAyahs: [3, 4],
    weakWords: [
      { ayahNumber: 3, wordIndex: 0, text: 'a' },
      { ayahNumber: 4, wordIndex: 1, text: 'b' },
    ],
  })
  assert.ok(weak.to - weak.from + 1 <= 3)
  assert.ok(weak.focus_ayahs.includes(3))
}

// Recommendation picks focused vs full based on density
{
  const focused = recommendPracticeScope({
    sessionFrom: 1,
    sessionTo: 10,
    weakWords: [
      { ayahNumber: 2, wordIndex: 0, text: 'a' },
      { ayahNumber: 2, wordIndex: 1, text: 'b' },
    ],
    weakAyahs: [2],
    outcome: 'mixed',
  })
  assert.equal(focused.scope, PRACTICE_SCOPE.WEAK_AREAS)

  const spread = recommendPracticeScope({
    sessionFrom: 1,
    sessionTo: 6,
    weakAyahs: [1, 3, 5],
    weakWords: [
      { ayahNumber: 1, wordIndex: 0, text: 'a' },
      { ayahNumber: 3, wordIndex: 0, text: 'b' },
      { ayahNumber: 5, wordIndex: 0, text: 'c' },
    ],
    outcome: 'weak',
  })
  assert.equal(spread.scope, PRACTICE_SCOPE.FULL_RANGE)
}

// Persistence payload carries scope + weak refs + attempt
{
  const settings = applyScopeToRecommendationSettings(
    { technique: 'talqin', repetitions: 3 },
    PRACTICE_SCOPE.WEAK_AREAS,
    {
      weakWords: [{ surahId: 93, ayahNumber: 1, wordIndex: 0, text: 'وَالضُّحَىٰ' }],
      focusItems: [{
        type: 'phrase',
        surahId: 93,
        ayahNumber: 1,
        verseKey: '93:1',
        startWordIndex: 0,
        endWordIndex: 2,
        weakWordIndexes: [0],
        wordIds: ['93:1:0'],
      }],
      ayahIds: [1],
      attemptId: 'attempt-9',
      attemptReference: { id: 'attempt-9', accuracy: 62, outcome: 'mixed' },
    },
  )
  assert.equal(settings.practice_scope, 'weak_areas')
  assert.equal(settings.practice_weak_words_only, true)
  assert.equal(settings.source_attempt_id, 'attempt-9')
  assert.ok(settings.practice_weak_words.length === 1)
  assert.ok(settings.practice_focus_items.length === 1)
  assert.deepEqual(settings.focus_ayahs, [1])
  assert.equal(doubleDownRevisionRepetitions(3), 6)
  assert.equal(settings.repetitions_per_ayah[1], 6)
  assert.equal(settings.repetitions, 6)

  const full = applyScopeToRecommendationSettings(
    { technique: 'talqin', repetitions: 3 },
    PRACTICE_SCOPE.FULL_RANGE,
    { bumpRepsForEmphasis: true },
  )
  assert.equal(full.practice_scope, 'full_range')
  assert.equal(full.emphasize_weak_areas, true)
  assert.ok(full.repetitions >= 4)
}

// Mastery must not follow focused-word practice alone
{
  assert.equal(canMarkAyahMasteredFromPractice({
    practiceScope: PRACTICE_SCOPE.WEAK_AREAS,
  }), false)
  assert.equal(canMarkAyahMasteredFromPractice({
    focusPhraseRevisionActive: true,
  }), false)
  assert.equal(canMarkAyahMasteredFromPractice({
    practiceScope: PRACTICE_SCOPE.FULL_RANGE,
  }), true)
}

// Comparison with previous attempts
{
  const comparison = compareRevisionAttempts({
    previous: {
      accuracy: 55,
      weakWordIds: ['93:1:0', '93:1:2'],
      wordStatuses: [
        { verseKey: '93:1', wordIndex: 0, text: 'a', status: 'incorrect' },
        { verseKey: '93:1', wordIndex: 2, text: 'c', status: 'partial' },
      ],
    },
    current: {
      accuracy: 80,
      wordStatuses: [
        { verseKey: '93:1', wordIndex: 0, text: 'a', status: 'correct' },
        { verseKey: '93:1', wordIndex: 2, text: 'c', status: 'incorrect' },
      ],
    },
    trackedWordIds: ['93:1:0', '93:1:2'],
  })
  assert.equal(comparison.available, true)
  assert.equal(comparison.improved.length, 1)
  assert.equal(comparison.continuedWeak.length, 1)
  assert.equal(comparison.accuracyDelta, 25)

  const missing = compareRevisionAttempts({})
  assert.equal(missing.available, false)
}

// Full-session highlighting + UI wiring
{
  assert.match(vue, /data-testid="post-session-scope-picker"/)
  assert.match(vue, /selectPostSessionPracticeScope/)
  assert.match(vue, /scopeWeakAreasLabel|postSessionRevisionScopeOptions/)
  assert.match(vue, /data-testid="post-session-attempt-compare"/)
  assert.match(js, /buildRevisionScopedSettings/)
  assert.match(js, /ensurePostSessionPracticeScopeDefault/)
  assert.match(js, /captureRevisionBaselineAttempt/)
  assert.match(js, /updateRevisionAttemptComparison/)
  assert.match(js, /canMarkAyahMasteredFromPractice/)
  assert.match(js, /practice-focus-word--emphasis/)
  assert.match(js, /fromRevisionComplete:\s*true/)
  assert.match(js, /doubleDownRevisionRepetitions/)
  assert.match(js, /emphasize_weak_areas = true/)
  assert.match(css, /practice-focus-word--emphasis/)
  assert.match(css, /post-session-simple__scope-card/)
  assert.match(learning, /practice_scope/)
  assert.match(learning, /practice_focus_items/)
  assert.match(saveReq, /practice_scope/)
  assert.match(saveReq, /weak_areas,full_range/)
}

console.log('revision-practice-scope.test.mjs: ok')
