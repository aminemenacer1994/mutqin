/** @typedef {'green'|'purple'|'orange'|'red'|'blue'|'gray'} TajweedColourId */

/**
 * Mutqin Tajweed practice catalogue — rule → colour, expected hold, beginner copy.
 * Cautious practice aid language only (not teacher grading).
 */
export const TAJWEED_PRACTICE_VERSION = 2

export const DEFAULT_BEAT_MS = 500

/**
 * Configurable hold / acoustic tolerances — keep out of Vue components.
 * Count ranges are generous so natural timing variation is not flagged.
 */
export const HOLD_TOLERANCE = Object.freeze({
  defaultBeatMs: DEFAULT_BEAT_MS,
  /** Soft floor/ceiling for estimated beat length from a reciter. */
  beatMsMin: 350,
  beatMsMax: 650,
  /**
   * Accepted count windows keyed by nominal beat count.
   * Preferred band sits inside the acceptable band.
   */
  byBeats: Object.freeze({
    2: Object.freeze({
      minCounts: 1.5,
      preferredMin: 1.75,
      preferredMax: 2.35,
      maxCounts: 2.75,
    }),
    4: Object.freeze({
      minCounts: 3.25,
      preferredMin: 3.5,
      preferredMax: 4.5,
      maxCounts: 5,
    }),
    6: Object.freeze({
      minCounts: 5,
      preferredMin: 5.5,
      preferredMax: 6.5,
      maxCounts: 7,
    }),
  }),
  maddFlexible: Object.freeze({
    minCounts: 1.5,
    preferredMin: 2,
    preferredMax: 6,
    maxCounts: 7,
  }),
  /** Short bounce — never a single millisecond target. */
  qalqalah: Object.freeze({
    minSec: 0.04,
    preferredMinSec: 0.06,
    preferredMaxSec: 0.22,
    maxSec: 0.38,
  }),
  /** Ignore low-level noise for silent / clear (no-hold) rules. */
  silentNoiseFloorSec: 0.08,
  /** How far outside preferred still counts as “within range”. */
  preferredGraceRatio: 0.12,
  /** Extra STT jitter grace beyond the published max/min. */
  classifyGraceRatio: 0.2,
  /** Cap measured hold so a trailing pause is not treated as madd. */
  trailingPauseCapRatio: 1.15,
  /** Acoustic envelope similarity threshold (broad, not strict). */
  acousticSimilarityThreshold: 0.5,
  /** Confidence below this → unable_to_assess when timing is shaky. */
  confidenceThreshold: 0.4,
  /**
   * Require this many reliable practice/review hits on the same rule
   * before treating it as a recurring weakness.
   */
  weaknessRepeatThreshold: 3,
})

/** Mutqin colour hex map (shared by live CSS variables + result chips). */
export const TAJWEED_COLOUR_HEX = Object.freeze({
  gray: '#7e8a97',
  green: '#2e9d62',
  purple: '#9b59b6',
  orange: '#d98824',
  red: '#d55245',
  blue: '#2b7bbb',
})

/** @type {Record<string, { label: string, group: string, order: number, colour: TajweedColourId, colourHex: string, expectedHoldBeats: number|null, beginnerHint: string, holdHint: string, liveInstruction: string }>} */
export const TAJWEED_PRACTICE_CATALOG = {
  noon_idhaar: {
    label: 'Idhaar',
    group: 'Noon Sakinah & Tanween',
    order: 10,
    colour: 'gray',
    colourHex: TAJWEED_COLOUR_HEX.gray,
    expectedHoldBeats: null,
    beginnerHint: 'Say the noon clearly.',
    holdHint: 'No special stretch.',
    liveInstruction: 'Say it clearly — no merge.',
  },
  noon_idghaam: {
    label: 'Idghaam',
    group: 'Noon Sakinah & Tanween',
    order: 20,
    colour: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    expectedHoldBeats: 2,
    beginnerHint: 'Merge with a soft nasal sound.',
    holdHint: 'Hold the nasal sound gently.',
    liveInstruction: 'Keep a soft nasal sound.',
  },
  noon_iqlaab: {
    label: 'Iqlaab',
    group: 'Noon Sakinah & Tanween',
    order: 30,
    colour: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    expectedHoldBeats: 2,
    beginnerHint: 'Turn toward a meem with a light nasal hold.',
    holdHint: 'Hold the nasal sound gently.',
    liveInstruction: 'Keep a soft nasal sound.',
  },
  noon_ikhfaa: {
    label: 'Ikhfaa',
    group: 'Noon Sakinah & Tanween',
    order: 40,
    colour: 'purple',
    colourHex: TAJWEED_COLOUR_HEX.purple,
    expectedHoldBeats: 2,
    beginnerHint: 'Hide the noon lightly.',
    holdHint: 'Hold the hidden nasal sound gently.',
    liveInstruction: 'Hide the sound lightly.',
  },
  ghunnah: {
    label: 'Ghunnah',
    group: 'Ghunnah',
    order: 50,
    colour: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    expectedHoldBeats: 2,
    beginnerHint: 'Keep a soft nasal sound.',
    holdHint: 'Hold about two gentle counts.',
    liveInstruction: 'Keep a soft nasal sound.',
  },
  meem_ikhfaa_shafawy: {
    label: 'Ikhfaa Shafawy',
    group: 'Meem Sakinah',
    order: 60,
    colour: 'purple',
    colourHex: TAJWEED_COLOUR_HEX.purple,
    expectedHoldBeats: 2,
    beginnerHint: 'Lightly hide the meem.',
    holdHint: 'Hold the hidden nasal sound gently.',
    liveInstruction: 'Hide the sound lightly.',
  },
  meem_idghaam_shafawy: {
    label: 'Idghaam Shafawy',
    group: 'Meem Sakinah',
    order: 70,
    colour: 'blue',
    colourHex: TAJWEED_COLOUR_HEX.blue,
    expectedHoldBeats: 2,
    beginnerHint: 'Merge the meem with a nasal hold.',
    holdHint: 'Hold the nasal sound gently.',
    liveInstruction: 'Keep a soft nasal sound.',
  },
  meem_izhaar_shafawy: {
    label: 'Izhaar Shafawy',
    group: 'Meem Sakinah',
    order: 80,
    colour: 'gray',
    colourHex: TAJWEED_COLOUR_HEX.gray,
    expectedHoldBeats: null,
    beginnerHint: 'Say the meem clearly.',
    holdHint: 'No special stretch.',
    liveInstruction: 'Say it clearly — no hide.',
  },
  qalqalah: {
    label: 'Qalqalah',
    group: 'Qalqalah',
    order: 90,
    colour: 'orange',
    colourHex: TAJWEED_COLOUR_HEX.orange,
    expectedHoldBeats: null,
    beginnerHint: 'Give a light bounce.',
    holdHint: 'A short bounce — not a stretch.',
    liveInstruction: 'Give a light bounce.',
  },
  madd_two: {
    label: 'Madd',
    group: 'Al-Madd',
    order: 100,
    colour: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    expectedHoldBeats: 2,
    beginnerHint: 'Hold the vowel gently.',
    holdHint: 'Hold about two gentle counts.',
    liveInstruction: 'Hold the vowel gently.',
  },
  madd_flexible: {
    label: 'Madd',
    group: 'Al-Madd',
    order: 110,
    colour: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    expectedHoldBeats: 4,
    beginnerHint: 'Hold the vowel steadily.',
    holdHint: 'Aim for a steady stretch.',
    liveInstruction: 'Hold the vowel steadily.',
  },
  madd_four: {
    label: 'Madd',
    group: 'Al-Madd',
    order: 120,
    colour: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    expectedHoldBeats: 4,
    beginnerHint: 'Hold the vowel gently.',
    holdHint: 'Hold about four gentle counts.',
    liveInstruction: 'Hold the vowel gently.',
  },
  madd_six: {
    label: 'Madd',
    group: 'Al-Madd',
    order: 130,
    colour: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    expectedHoldBeats: 6,
    beginnerHint: 'Hold the vowel a little longer.',
    holdHint: 'Hold about six gentle counts.',
    liveInstruction: 'Hold the vowel a little longer.',
  },
  quranic_symbols: {
    label: 'Mushaf mark',
    group: 'Mushaf marks',
    order: 140,
    colour: 'gray',
    colourHex: TAJWEED_COLOUR_HEX.gray,
    expectedHoldBeats: null,
    beginnerHint: 'Follow the mushaf mark carefully.',
    holdHint: 'Usually no stretch.',
    liveInstruction: 'Watch the mushaf mark.',
  },
}

/** Marker class suffix → practice rule key (AlQuran quran-tajweed). */
export const TAJWEED_CLASS_TO_RULE = {
  ham_wasl: 'quranic_symbols',
  slnt: 'quranic_symbols',
  madda_normal: 'madd_two',
  madda_permissible: 'madd_flexible',
  madda_obligatory: 'madd_four',
  madda_pbligatory: 'madd_four',
  madda_necessary: 'madd_six',
  qlq: 'qalqalah',
  lqlq: 'qalqalah',
  ikhf_shfw: 'meem_ikhfaa_shafawy',
  ikhf: 'noon_ikhfaa',
  idghm_shfw: 'meem_idghaam_shafawy',
  idgh_shfw: 'meem_idghaam_shafawy',
  iqlb: 'noon_iqlaab',
  idgh_ghn: 'noon_idghaam',
  idgh_w_ghn: 'noon_idghaam',
  idgh_mus: 'noon_idghaam',
  ghn: 'ghunnah',
}

export const COLOUR_BEGINNER_LABELS = {
  gray: 'Gray — silent, wasl, or clear (no merge) marks',
  green: 'Green — nasal hold (ghunnah / idgham with ghunnah / iqlaab)',
  purple: 'Purple — hidden sound (ikhfa)',
  orange: 'Orange — qalqalah bounce',
  red: 'Red — stretch / madd',
  blue: 'Blue — labial merge (idgham shafawi)',
}

export function getPracticeRule(ruleKey) {
  return TAJWEED_PRACTICE_CATALOG[ruleKey] || null
}

export function getRuleKeyFromClass(className) {
  const key = String(className || '').replace(/^tajweed-/, '')
  return TAJWEED_CLASS_TO_RULE[key] || ''
}

export function getColourHex(colourId) {
  return TAJWEED_COLOUR_HEX[colourId] || TAJWEED_COLOUR_HEX.gray
}

/**
 * Resolve the count / second window for a rule.
 * @returns {{ minCounts?: number, preferredMin?: number, preferredMax?: number, maxCounts?: number, minSec?: number, preferredMinSec?: number, preferredMaxSec?: number, maxSec?: number, mode: 'counts'|'seconds'|'none' }}
 */
export function resolveHoldTolerance(ruleKey = '', expectedHoldBeats = null) {
  const key = String(ruleKey || '')
  if (key === 'qalqalah') {
    return { ...HOLD_TOLERANCE.qalqalah, mode: 'seconds' }
  }
  if (key === 'madd_flexible') {
    return { ...HOLD_TOLERANCE.maddFlexible, mode: 'counts' }
  }
  if (
    key === 'quranic_symbols'
    || key === 'noon_idhaar'
    || key === 'meem_izhaar_shafawy'
    || expectedHoldBeats == null
  ) {
    return { mode: 'none' }
  }
  const beats = Number(expectedHoldBeats)
  const nearest = beats <= 2.5 ? 2 : (beats <= 5 ? 4 : 6)
  const band = HOLD_TOLERANCE.byBeats[nearest] || HOLD_TOLERANCE.byBeats[2]
  return { ...band, mode: 'counts' }
}
