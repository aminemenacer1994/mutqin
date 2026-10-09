/**
 * Canonical edge scenarios for Speechmatics + recitation API accuracy probes.
 *
 * Add new product scenarios here first. Downstream consumers:
 * - scripts/recitation-scenario-accuracy.mjs (JS/PHP parity audit)
 * - tests/js/recitation-edge-scenarios.test.mjs
 * - tests/js/speechmatics-edge-scenarios.test.mjs (live/AMD extras may
 *   still live there — reuse recognitionWords via scenarioById)
 *
 * `expected` is the Speechmatics stabilize + score path (not raw align()).
 */

const words = (tokens, confidence = 0.95, step = 0.3) => tokens.map((word, index) => ({
  word,
  confidence,
  start: index * step,
  end: index * step + Math.min(0.2, step * 0.7),
  token: `sm-${index}`,
  speaker: 'S1',
}))

export const recitationEdgeScenarios = Object.freeze([
  {
    id: 'perfect_fatiha_fragment',
    label: 'Perfect recitation (4 words)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'رب', 'العالمين']),
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: [],
      resultState: 'strong',
    },
  },
  {
    id: 'substitution_wrong_word',
    label: 'Substitution (wrong word)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'رب', 'الرحمن']),
    expectedSpeechmaticsAccuracy: 80,
    expectedApiAccuracy: 80,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION'],
      statuses: ['correct', 'correct', 'correct', 'partial'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'skipped_middle_word',
    label: 'Skipped / deleted word',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'العالمين']),
    expectedSpeechmaticsAccuracy: 75,
    expectedApiAccuracy: 75,
    expected: {
      types: ['MATCH', 'MATCH', 'DELETION', 'MATCH'],
      statuses: ['correct', 'correct', 'omitted', 'correct'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'insertion_extra_word',
    label: 'Insertion (extra spoken word)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'العظيم', 'رب', 'العالمين']),
    expectedSpeechmaticsAccuracy: 93,
    expectedApiAccuracy: 93,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: ['INSERTION'],
      resultState: 'strong',
    },
  },
  {
    id: 'repetition_stutter',
    label: 'Repetition (stutter same word)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'لله', 'رب', 'العالمين']),
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: [],
      resultState: 'strong',
    },
  },
  {
    id: 'self_correction',
    label: 'Self-correction (wrong then right)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: [
      { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2, token: 'a', speaker: 'S1' },
      { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5, token: 'b', speaker: 'S1' },
      { word: 'الرحمن', confidence: 0.95, start: 0.6, end: 0.8, token: 'c', speaker: 'S1' },
      { word: 'رب', confidence: 0.95, start: 1.5, end: 1.7, token: 'd', speaker: 'S1' },
      { word: 'العالمين', confidence: 0.95, start: 1.8, end: 2.1, token: 'e', speaker: 'S1' },
    ],
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: ['SELF_CORRECTION'],
      resultState: 'strong',
    },
  },
  {
    id: 'restart_from_beginning',
    label: 'Restart (repeat opening phrase)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'الحمد', 'لله', 'رب', 'العالمين']),
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: ['RESTART', 'RESTART'],
      resultState: 'strong',
    },
  },
  {
    id: 'hesitation_long_pause',
    label: 'Hesitation (long pause, correct words)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: [
      { word: 'الحمد', confidence: 0.95, start: 0, end: 0.2, token: 'h0', speaker: 'S1' },
      { word: 'لله', confidence: 0.95, start: 0.3, end: 0.5, token: 'h1', speaker: 'S1' },
      { word: 'رب', confidence: 0.95, start: 2.1, end: 2.3, token: 'h2', speaker: 'S1' },
      { word: 'العالمين', confidence: 0.95, start: 2.4, end: 2.7, token: 'h3', speaker: 'S1' },
    ],
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: [],
      resultState: 'strong',
    },
  },
  {
    id: 'drift_realignment',
    label: 'Drift then realignment',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الرحمن', 'الرحيم', 'رب', 'العالمين']),
    expectedSpeechmaticsAccuracy: 50,
    expectedApiAccuracy: 50,
    expected: {
      types: ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
      statuses: ['incorrect', 'incorrect', 'correct', 'correct'],
      extras: [],
      resultState: 'needs_practice',
    },
  },
  {
    id: 'ikhlas_drift_return',
    label: 'Ayah drift (112:2) then return',
    targetText: 'قل هو الله أحد',
    recognitionWords: words(['الله', 'الصمد', 'الله', 'أحد']),
    expectedSpeechmaticsAccuracy: 45,
    expectedApiAccuracy: 45,
    expected: {
      types: ['DIVERGENCE', 'DIVERGENCE', 'REALIGNMENT', 'MATCH'],
      statuses: ['incorrect', 'incorrect', 'correct', 'correct'],
      extras: [],
      resultState: 'needs_practice',
    },
  },
  {
    id: 'basmala_glued_token',
    label: 'Speechmatics glued basmala token',
    targetText: 'بسم الله الرحمن الرحيم',
    recognitionWords: words(['بسمالله', 'الرحمن', 'الرحيم']),
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: [],
      resultState: 'strong',
    },
  },
  {
    id: 'low_confidence_noise_filtered',
    label: 'Low-confidence noise (not scored as insertion)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: [
      ...words(['الحمد', 'لله']),
      { word: 'العظيم', confidence: 0.4, start: 0.6, end: 0.8, token: 'low', speaker: 'S1' },
      ...words(['رب', 'العالمين']).map((entry, index) => ({
        ...entry,
        start: 0.9 + index * 0.3,
        end: 1.1 + index * 0.3,
        token: `tail-${index}`,
      })),
    ],
    expectedSpeechmaticsAccuracy: 100,
    expectedApiAccuracy: 100,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: ['UNASSESSED'],
      resultState: 'strong',
    },
  },
  {
    id: 'out_of_range_tail',
    label: 'Out-of-range words after ayah',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'رب', 'العالمين', 'الرحمن', 'الرحيم']),
    expectedSpeechmaticsAccuracy: 86,
    expectedApiAccuracy: 86,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'correct', 'correct'],
      extras: ['OUT_OF_RANGE', 'OUT_OF_RANGE'],
      resultState: 'strong',
    },
  },
  {
    id: 'fast_skip_middle',
    label: 'Fast recitation with skipped middle word',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: [
      { word: 'الحمد', confidence: 0.95, start: 0, end: 0.06, token: 'f0', speaker: 'S1' },
      { word: 'لله', confidence: 0.95, start: 0.07, end: 0.13, token: 'f1', speaker: 'S1' },
      { word: 'العالمين', confidence: 0.95, start: 0.14, end: 0.22, token: 'f2', speaker: 'S1' },
    ],
    expectedSpeechmaticsAccuracy: 75,
    expectedApiAccuracy: 75,
    expected: {
      types: ['MATCH', 'MATCH', 'DELETION', 'MATCH'],
      statuses: ['correct', 'correct', 'omitted', 'correct'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'clear_ikhlas_error',
    label: 'Clear word error (صمد vs أحد)',
    targetText: 'قل هو الله أحد',
    recognitionWords: words(['قل', 'هو', 'الله', 'صمد']),
    expectedSpeechmaticsAccuracy: 75,
    expectedApiAccuracy: 75,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'SUBSTITUTION'],
      statuses: ['correct', 'correct', 'correct', 'incorrect'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'unresolved_substitution',
    label: 'Unresolved substitution (no correction)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'الرحمن', 'العالمين']),
    expectedSpeechmaticsAccuracy: 75,
    expectedApiAccuracy: 75,
    expected: {
      types: ['MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH'],
      statuses: ['correct', 'correct', 'incorrect', 'correct'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'early_stop_trailing_omission',
    label: 'Early stop (trailing unread words omitted, not incorrect)',
    targetText: 'الحمد لله رب العالمين',
    recognitionWords: words(['الحمد', 'لله', 'رب']),
    expectedSpeechmaticsAccuracy: 75,
    expectedApiAccuracy: 75,
    expected: {
      types: ['MATCH', 'MATCH', 'MATCH', 'DELETION'],
      statuses: ['correct', 'correct', 'correct', 'omitted'],
      extras: [],
      resultState: 'developing',
    },
  },
  {
    id: 'wrong_ayah_ikhlas_vs_basmala',
    label: 'Wrong ayah (Ikhlas target, Basmala spoken)',
    targetText: 'قل هو الله أحد',
    recognitionWords: words(['بسم', 'الله', 'الرحمن', 'الرحيم']),
    expectedSpeechmaticsAccuracy: 18,
    expectedApiAccuracy: 18,
    expected: {
      types: ['SUBSTITUTION', 'DELETION', 'MATCH', 'SUBSTITUTION'],
      statuses: ['incorrect', 'omitted', 'correct', 'incorrect'],
      extras: ['OUT_OF_RANGE'],
      resultState: 'needs_practice',
    },
  },
  {
    id: 'cascade_single_error_no_spread',
    label: 'Single middle error does not cascade',
    targetText: 'الحمد لله رب العالمين الرحمن الرحيم',
    recognitionWords: words(['الحمد', 'لله', 'الرحمن', 'العالمين', 'الرحمن', 'الرحيم']),
    expectedSpeechmaticsAccuracy: 80,
    expectedApiAccuracy: 80,
    expected: {
      types: ['MATCH', 'MATCH', 'SUBSTITUTION', 'MATCH', 'MATCH', 'MATCH'],
      statuses: ['correct', 'correct', 'incorrect', 'correct', 'correct', 'correct'],
      extras: [],
      resultState: 'developing',
    },
  },
])

const byId = Object.freeze(Object.fromEntries(
  recitationEdgeScenarios.map((scenario) => [scenario.id, scenario]),
))

export function scenarioById(id) {
  const scenario = byId[id]
  if (!scenario) {
    throw new Error(`Unknown recitation edge scenario: ${id}`)
  }
  return scenario
}
