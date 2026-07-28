import test from 'node:test'
import assert from 'node:assert/strict'
import {
  AI_RECITE_MAX_ATTEMPTS,
  averageAttemptAccuracy,
  accuracyPracticeBand,
  extractWeakWordsFromResult,
  selectPracticeTechniques,
  buildAiReciteDynamicPlan,
  ACCURACY_BAND,
} from '../../resources/js/scripts/recommendations/aiRecitePracticePlan.js'

test('AI_RECITE_MAX_ATTEMPTS is 3', () => {
  assert.equal(AI_RECITE_MAX_ATTEMPTS, 3)
})

test('averageAttemptAccuracy averages finite scores', () => {
  assert.equal(averageAttemptAccuracy([{ accuracy: 80 }, { accuracy: 90 }]), 85)
  assert.equal(averageAttemptAccuracy([{ accuracy: 0.8 }, { accuracy: 1 }]), 90)
  assert.equal(averageAttemptAccuracy([]), null)
})

test('accuracyPracticeBand matches thresholds', () => {
  assert.equal(accuracyPracticeBand(90), ACCURACY_BAND.STRONG)
  assert.equal(accuracyPracticeBand(80), ACCURACY_BAND.STRONG)
  assert.equal(accuracyPracticeBand(70), ACCURACY_BAND.FOCUSED)
  assert.equal(accuracyPracticeBand(55), ACCURACY_BAND.FOCUSED)
  assert.equal(accuracyPracticeBand(40), ACCURACY_BAND.GENTLE)
})

test('extractWeakWordsFromResult keeps red amber black', () => {
  const words = extractWeakWordsFromResult({
    ayahKey: '93:1',
    wordStatuses: [
      { text: 'وَالضُّحَىٰ', status: 'incorrect', index: 0 },
      { text: 'وَاللَّيْلِ', status: 'correct', index: 1 },
      { text: 'إِذَا', status: 'partial', index: 2 },
      { text: 'سَجَىٰ', status: 'omitted', index: 3 },
    ],
  })
  assert.equal(words.length, 3)
  assert.equal(words[0].severity, 'black')
  assert.ok(words.some((w) => w.severity === 'red'))
  assert.ok(words.some((w) => w.severity === 'amber'))
  assert.ok(words.some((w) => w.severity === 'black'))
})

test('extractWeakWordsFromResult treats pending as omitted', () => {
  const words = extractWeakWordsFromResult({
    ayahKey: '93:1',
    wordStatuses: [
      { text: 'وَالضُّحَىٰ', status: 'correct', index: 0 },
      { text: 'وَاللَّيْلِ', status: 'pending', index: 1 },
      { text: 'إِذَا', status: 'pending', index: 2 },
    ],
  })
  assert.equal(words.length, 2)
  assert.ok(words.every((w) => w.severity === 'black'))
})

test('different mistake patterns produce different techniques', () => {
  const strong = buildAiReciteDynamicPlan({
    range: { from: 1, to: 3, surahName: 'Ad-Duha' },
    results: [{
      ayahKey: '93:1',
      ayahNumber: 1,
      accuracyScore: 92,
      wordStatuses: [
        { text: 'a', status: 'correct', index: 0 },
        { text: 'b', status: 'correct', index: 1 },
        { text: 'c', status: 'partial', index: 2 },
        { text: 'd', status: 'correct', index: 3 },
      ],
    }],
  })
  const weak = buildAiReciteDynamicPlan({
    range: { from: 1, to: 3, surahName: 'Ad-Duha' },
    results: [{
      ayahKey: '93:1',
      ayahNumber: 1,
      accuracyScore: 40,
      wordStatuses: [
        { text: 'a', status: 'pending', index: 0 },
        { text: 'b', status: 'incorrect', index: 1 },
        { text: 'c', status: 'pending', index: 2 },
        { text: 'd', status: 'partial', index: 3 },
        { text: 'e', status: 'incorrect', index: 4 },
      ],
      weakAyahs: [1],
    }],
  })
  assert.notEqual(strong.settings.technique, weak.settings.technique)
  assert.ok(strong.averageAccuracy > weak.averageAccuracy)
  assert.ok(weak.weakWords.length > strong.weakWords.length)
  assert.ok(weak.settings.repetitions >= strong.settings.repetitions)
})

test('selectPracticeTechniques: 2–4 weak words → Anchor Method', () => {
  const techniques = selectPracticeTechniques({
    weakWords: [
      { ayahNumber: 1, wordIndex: 0, severity: 'red' },
      { ayahNumber: 1, wordIndex: 2, severity: 'black' },
      { ayahNumber: 1, wordIndex: 4, severity: 'red' },
    ],
    ayahWordCounts: { 1: 12 },
    band: ACCURACY_BAND.FOCUSED,
  })
  assert.ok(techniques.some((t) => t.id === 'anchor'))
})

test('selectPracticeTechniques: entire ayah weak → Talqin', () => {
  const techniques = selectPracticeTechniques({
    weakWords: [
      { ayahNumber: 2, wordIndex: 0, severity: 'red' },
      { ayahNumber: 2, wordIndex: 1, severity: 'red' },
      { ayahNumber: 2, wordIndex: 2, severity: 'black' },
      { ayahNumber: 2, wordIndex: 3, severity: 'amber' },
    ],
    ayahWordCounts: { 2: 5 },
    band: ACCURACY_BAND.GENTLE,
  })
  assert.ok(techniques.some((t) => t.id === 'talqin'))
})

test('selectPracticeTechniques: scattered mistakes → chaining primary', () => {
  const techniques = selectPracticeTechniques({
    weakWords: [
      { ayahNumber: 1, wordIndex: 0, severity: 'red' },
      { ayahNumber: 2, wordIndex: 1, severity: 'red' },
      { ayahNumber: 3, wordIndex: 2, severity: 'black' },
      { ayahNumber: 3, wordIndex: 4, severity: 'red' },
      { ayahNumber: 4, wordIndex: 0, severity: 'amber' },
    ],
    ayahWordCounts: { 1: 8, 2: 8, 3: 10, 4: 7 },
    band: ACCURACY_BAND.FOCUSED,
  })
  assert.equal(techniques[0]?.id, 'chaining')
  assert.ok(techniques.filter((t) => !t.tipOnly).length === 1)
})

test('selectPracticeTechniques: strong recall → blur, never talqin from one word', () => {
  const techniques = selectPracticeTechniques({
    weakWords: [
      { ayahNumber: 4, wordIndex: 0, severity: 'black' },
    ],
    ayahWordCounts: { 4: 1 },
    band: ACCURACY_BAND.STRONG,
    accuracyPercent: 94,
  })
  assert.equal(techniques[0]?.id, 'blur')
  assert.ok(!techniques.some((t) => t.id === 'talqin'))
})

test('selectPracticeTechniques: mostly good focused → focus or blur', () => {
  const techniques = selectPracticeTechniques({
    weakWords: [
      { ayahNumber: 1, wordIndex: 0, severity: 'amber' },
    ],
    ayahWordCounts: { 1: 10 },
    band: ACCURACY_BAND.FOCUSED,
  })
  assert.ok(techniques.some((t) => t.id === 'blur' || t.id === 'focus'))
})

test('strong vs weak plans use different primary techniques', () => {
  const strong = buildAiReciteDynamicPlan({
    range: { from: 1, to: 3, surahName: 'Ad-Duha' },
    results: [{
      ayahKey: '93:1',
      ayahNumber: 1,
      accuracyScore: 94,
      wordStatuses: [
        { text: 'a', status: 'correct', index: 0, ayahNumber: 1 },
        { text: 'b', status: 'correct', index: 1, ayahNumber: 1 },
        { text: 'c', status: 'correct', index: 2, ayahNumber: 1 },
        { text: 'd', status: 'omitted', index: 3, ayahNumber: 1 },
        { text: 'e', status: 'correct', index: 4, ayahNumber: 1 },
        { text: 'f', status: 'correct', index: 5, ayahNumber: 1 },
      ],
    }],
  })
  const weak = buildAiReciteDynamicPlan({
    range: { from: 1, to: 3, surahName: 'Ad-Duha' },
    results: [{
      ayahKey: '93:1',
      ayahNumber: 1,
      accuracyScore: 40,
      wordStatuses: [
        { text: 'a', status: 'pending', index: 0, ayahNumber: 1 },
        { text: 'b', status: 'incorrect', index: 1, ayahNumber: 1 },
        { text: 'c', status: 'pending', index: 2, ayahNumber: 1 },
        { text: 'd', status: 'partial', index: 3, ayahNumber: 1 },
        { text: 'e', status: 'incorrect', index: 4, ayahNumber: 1 },
      ],
      weakAyahs: [1],
    }],
  })
  assert.equal(strong.settings.technique, 'blur')
  assert.equal(weak.settings.technique, 'talqin')
  assert.notEqual(strong.settings.technique, weak.settings.technique)
  assert.match(strong.planDetail.setup.find((s) => s.key === 'speed')?.label || '', /speed/i)
  assert.match(strong.planDetail.setup.find((s) => s.key === 'reps')?.label || '', /repetition/i)
})

test('buildAiReciteDynamicPlan returns Laravel-ready settings and weak words', () => {
  const plan = buildAiReciteDynamicPlan({
    range: { from: 1, to: 3, surahId: 93, surahName: 'Ad-Duha' },
    results: [{
      ayahKey: '93:1',
      ayahNumber: 1,
      accuracyScore: 48,
      wordStatuses: [
        { text: 'وَالضُّحَىٰ', status: 'incorrect', index: 0 },
        { text: 'وَاللَّيْلِ', status: 'omitted', index: 1 },
        { text: 'إِذَا', status: 'partial', index: 2 },
        { text: 'سَجَىٰ', status: 'correct', index: 3 },
      ],
      weakAyahs: [1],
    }],
  })
  assert.equal(plan.outcome, 'weak')
  assert.ok(plan.settings.technique)
  assert.ok(Array.isArray(plan.weakWords) && plan.weakWords.length >= 2)
  assert.equal(plan.planDetail.source, 'ai_recite_dynamic')
  assert.ok(plan.settings.repetitions >= 4)
  assert.ok(plan.settings.playback_speed >= 1.25)
  assert.match(plan.feedback, /Allah|strengthen|time|effort|Mā|Allah|Take|Good|gently/i)
  assert.equal(plan.ayah_range.from, 1)
  assert.equal(plan.ayah_range.to, 1)
  assert.equal(plan.settings.talqin_enabled, plan.settings.technique === 'talqin')
})

test('resolvePracticeRange uses weak ayahs only without neighbor padding', async () => {
  const { resolvePracticeRange } = await import('../../resources/js/scripts/recommendations/aiRecitePracticePlan.js')
  const range = resolvePracticeRange({
    sessionFrom: 1,
    sessionTo: 7,
    weakAyahs: [6, 7],
    weakWords: [
      { ayahNumber: 6 },
      { ayahNumber: 7 },
      { ayahNumber: 7 },
    ],
  })
  assert.equal(range.from, 6)
  assert.equal(range.to, 7)
  assert.deepEqual(range.focus_ayahs, [6, 7])
})

test('resolvePracticeRange picks densest 3-ayah window when span is wide', async () => {
  const { resolvePracticeRange } = await import('../../resources/js/scripts/recommendations/aiRecitePracticePlan.js')
  const range = resolvePracticeRange({
    sessionFrom: 1,
    sessionTo: 10,
    weakAyahs: [1, 2, 8, 9, 10],
    weakWords: [
      { ayahNumber: 8 }, { ayahNumber: 8 },
      { ayahNumber: 9 }, { ayahNumber: 9 }, { ayahNumber: 9 },
      { ayahNumber: 10 },
      { ayahNumber: 1 },
    ],
  })
  assert.equal(range.to - range.from + 1, 3)
  assert.equal(range.from, 8)
  assert.equal(range.to, 10)
})
