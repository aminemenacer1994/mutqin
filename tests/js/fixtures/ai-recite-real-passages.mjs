/**
 * Real Qur'an passage fixtures for AI Recite regression.
 *
 * Source: Al Quran Cloud `quran-uthmani` (project arabic_edition).
 * Assessment text matches Memorisation reading convention: leading basmala is
 * stripped from ayah 1 of surahs ≥ 2 (dedicated basmala row); Al-Fatihah keeps
 * ayah 1 as the basmala.
 *
 * All scenarios use deterministic mocked recognition words (not live ASR).
 * Real-audio / live Speechmatics cases are marked BLOCKED in the QA report.
 */

import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { tokenizeRecitationWords } from '../../../resources/js/scripts/engine/recitation_analysis.js'
import { chapterHasBismillahPre } from '../../../resources/js/scripts/mushaf/madaniPageLayout.js'

const root = dirname(fileURLToPath(import.meta.url))
const rawPassages = JSON.parse(
  readFileSync(join(root, 'quran-uthmani-passages/passages.json'), 'utf8'),
)

const BASMALA_VARIANTS = [
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَٰنِ ٱلرَّحِيمِ',
  'بِسْمِ ٱللَّهِ ٱلرَّحْمَـٰنِ ٱلرَّحِيمِ',
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ',
  'بسم الله الرحمن الرحيم',
]

function stripRedundantQuranCircles(text = '') {
  return String(text || '').replace(/\u06DF/g, '').replace(/\s+/g, ' ').trim()
}

/** Mirror Memorisation.removeBasmala for assessment text. */
export function removeBasmala(arabicText = '') {
  let text = String(arabicText || '')
  for (const variant of BASMALA_VARIANTS) {
    if (text.startsWith(variant)) {
      text = text.slice(variant.length).trim()
      break
    }
  }
  return stripRedundantQuranCircles(text)
}

function prepareAyah(ayah) {
  const surah = Number(ayah.surah)
  let text = String(ayah.text || '')
  if (chapterHasBismillahPre(surah) && Number(ayah.ayah) === 1) {
    text = removeBasmala(text)
  } else {
    text = stripRedundantQuranCircles(text)
  }
  return {
    key: ayah.key,
    surah,
    ayah: Number(ayah.ayah),
    text,
    tokens: tokenizeRecitationWords(text),
  }
}

function loadPassage(key) {
  const raw = rawPassages[key]
  if (!raw) throw new Error(`Unknown passage key: ${key}`)
  const ayahs = (Array.isArray(raw) ? raw : []).map(prepareAyah)
  const targetText = ayahs.map((a) => a.text).filter(Boolean).join(' ')
  const tokens = ayahs.flatMap((a) => a.tokens)
  return {
    key: String(key),
    ayahs,
    targetText,
    tokens,
    targetAyahs: ayahs.map((a) => ({
      ayahKey: a.key,
      number: a.ayah,
      text: a.text,
    })),
  }
}

export const PASSAGE_KEYS = Object.freeze({
  FATIHA: '1',
  ASR: '103',
  MAUN: '107',
  KAWTHAR: '108',
  KAFIRUN: '109',
  QURAYSH: '106',
  IKHLAS: '112',
  FALAQ: '113',
  NAS: '114',
  BAQARAH_1_5: '2:1-5',
  BAQARAH_255: '2:255',
  RAHMAN_1_16: '55:1-16',
  MULK_1_10: '67:1-10',
})

export const passages = Object.freeze(
  Object.fromEntries(Object.values(PASSAGE_KEYS).map((key) => [key, loadPassage(key)])),
)

export function recognitionWords(tokens, {
  confidence = 0.95,
  step = 0.35,
  startAt = 0,
  speaker = 'S1',
} = {}) {
  return (Array.isArray(tokens) ? tokens : []).map((word, index) => ({
    word,
    confidence,
    start: startAt + index * step,
    end: startAt + index * step + Math.min(0.22, step * 0.65),
    token: `rp-${startAt}-${index}`,
    speaker,
  }))
}

function ayahTokenSlices(passage) {
  const slices = []
  let offset = 0
  for (const ayah of passage.ayahs) {
    slices.push({
      key: ayah.key,
      ayah: ayah.ayah,
      start: offset,
      end: offset + ayah.tokens.length,
      tokens: ayah.tokens,
    })
    offset += ayah.tokens.length
  }
  return slices
}

/**
 * Build a mocked recognition scenario against a real passage.
 * @returns {{ id: string, passageKey: string, label: string, kind: string, recognitionWords: object[], expectations: object }}
 */
export function buildPassageScenario(passageKey, kind, options = {}) {
  const passage = passages[passageKey]
  if (!passage) throw new Error(`Unknown passage: ${passageKey}`)
  const tokens = passage.tokens.slice()
  const slices = ayahTokenSlices(passage)
  const id = `${passageKey.replace(':', '-')}__${kind}`
  let heard = tokens.slice()
  const expectations = {
    kind,
    requireAllMatch: false,
    forbidIncorrectOnOmitted: true,
    maxIncorrect: null,
    minAccuracy: null,
    exactAccuracy: null,
    mustIncludeTypes: [],
    mustIncludeExtras: [],
    liveUnreadPending: false,
    incomplete: false,
  }

  switch (kind) {
    case 'perfect': {
      expectations.requireAllMatch = true
      expectations.exactAccuracy = 100
      break
    }
    case 'partial':
    case 'incomplete': {
      const keep = Math.max(1, Math.floor(tokens.length * (options.ratio ?? 0.45)))
      heard = tokens.slice(0, keep)
      expectations.incomplete = true
      expectations.liveUnreadPending = true
      expectations.minAccuracy = 0
      break
    }
    case 'skipped_word': {
      if (tokens.length < 3) throw new Error(`${id}: need ≥3 tokens`)
      const skipAt = options.skipAt ?? Math.floor(tokens.length / 2)
      heard = tokens.filter((_, index) => index !== skipAt)
      expectations.mustIncludeTypes = ['DELETION']
      expectations.maxIncorrect = Math.max(2, Math.ceil(tokens.length * 0.35))
      break
    }
    case 'repeated_word': {
      if (tokens.length < 2) throw new Error(`${id}: need ≥2 tokens`)
      const at = options.at ?? 1
      heard = [...tokens.slice(0, at + 1), tokens[at], ...tokens.slice(at + 1)]
      expectations.minAccuracy = 90
      break
    }
    case 'substituted_word': {
      if (!tokens.length) throw new Error(`${id}: empty`)
      const at = options.at ?? tokens.length - 1
      heard = tokens.slice()
      heard[at] = options.replacement || 'صمد'
      expectations.mustIncludeTypes = ['SUBSTITUTION']
      expectations.maxIncorrect = Math.max(2, Math.ceil(tokens.length * 0.4))
      break
    }
    case 'self_correction': {
      if (tokens.length < 3) throw new Error(`${id}: need ≥3 tokens`)
      const at = options.at ?? Math.min(2, tokens.length - 1)
      const wrong = options.wrong || 'صمد'
      // Pause before the correct word so SELF_CORRECTION can fire.
      heard = [
        ...recognitionWords(tokens.slice(0, at), { step: 0.3 }),
        { word: wrong, confidence: 0.95, start: at * 0.3, end: at * 0.3 + 0.2, token: 'wrong', speaker: 'S1' },
        ...recognitionWords(tokens.slice(at), { step: 0.3, startAt: at * 0.3 + 1.2 }),
      ]
      expectations.mustIncludeExtras = ['SELF_CORRECTION']
      expectations.minAccuracy = 85
      return {
        id,
        passageKey,
        label: `${passageKey} ${kind}`,
        kind,
        targetText: passage.targetText,
        targetAyahs: passage.targetAyahs,
        recognitionWords: heard,
        expectations,
        source: 'mocked_recognition',
      }
    }
    case 'skipped_ayah': {
      if (slices.length < 2) throw new Error(`${id}: need ≥2 ayahs`)
      const skipSlice = slices[options.ayahIndex ?? 1]
      heard = tokens.filter((_, index) => index < skipSlice.start || index >= skipSlice.end)
      expectations.mustIncludeTypes = ['DELETION']
      expectations.maxIncorrect = skipSlice.tokens.length + 2
      break
    }
    case 'restarted_ayah': {
      if (tokens.length < 4) throw new Error(`${id}: need ≥4 tokens`)
      const prefix = tokens.slice(0, Math.min(2, tokens.length))
      heard = [...prefix, ...tokens]
      expectations.minAccuracy = 90
      expectations.mustIncludeExtras = ['RESTART']
      break
    }
    case 'wrong_ayah_order': {
      if (slices.length < 3) throw new Error(`${id}: need ≥3 ayahs`)
      // Recite ayah 3, then ayah 2, then the rest in order.
      const reordered = [
        ...slices[2].tokens,
        ...slices[1].tokens,
        ...slices[0].tokens,
        ...slices.slice(3).flatMap((s) => s.tokens),
      ]
      heard = reordered
      // Wrong order is a hard failure mode — allow a high incorrect count, but
      // require the attempt not to be scored as a perfect strong recitation.
      expectations.maxIncorrect = tokens.length
      expectations.minAccuracy = 0
      expectations.maxAccuracy = 95
      break
    }
    case 'pause_hesitation': {
      if (tokens.length < 3) throw new Error(`${id}: need ≥3 tokens`)
      const split = Math.floor(tokens.length / 2)
      heard = [
        ...recognitionWords(tokens.slice(0, split), { step: 0.3 }),
        ...recognitionWords(tokens.slice(split), { step: 0.3, startAt: split * 0.3 + 2.0 }),
      ]
      expectations.requireAllMatch = true
      expectations.exactAccuracy = 100
      return {
        id,
        passageKey,
        label: `${passageKey} ${kind}`,
        kind,
        targetText: passage.targetText,
        targetAyahs: passage.targetAyahs,
        recognitionWords: heard,
        expectations,
        source: 'mocked_recognition',
      }
    }
    default:
      throw new Error(`Unknown scenario kind: ${kind}`)
  }

  return {
    id,
    passageKey,
    label: `${passageKey} ${kind}`,
    kind,
    targetText: passage.targetText,
    targetAyahs: passage.targetAyahs,
    recognitionWords: recognitionWords(heard),
    expectations,
    source: 'mocked_recognition',
  }
}

/** Quraysh full matrix requested by product QA. */
export const QURAYSH_KINDS = Object.freeze([
  'perfect',
  'partial',
  'skipped_word',
  'repeated_word',
  'substituted_word',
  'self_correction',
  'skipped_ayah',
  'restarted_ayah',
  'wrong_ayah_order',
])

/** Short full-surah kinds (all multi-ayah except Kawthar/Asr which still work). */
export const SHORT_SURAH_KINDS = Object.freeze([
  'perfect',
  'partial',
  'skipped_word',
  'repeated_word',
  'substituted_word',
  'self_correction',
  'pause_hesitation',
])

export const MULTI_AYAH_EXTRA_KINDS = Object.freeze([
  'skipped_ayah',
  'restarted_ayah',
  'wrong_ayah_order',
])

export const LONG_PASSAGE_KINDS = Object.freeze([
  'perfect',
  'partial',
  'skipped_word',
  'substituted_word',
  'pause_hesitation',
])

export function buildAllRealPassageScenarios() {
  const rows = []

  for (const kind of QURAYSH_KINDS) {
    rows.push(buildPassageScenario(PASSAGE_KEYS.QURAYSH, kind))
  }

  const shortKeys = [
    PASSAGE_KEYS.FATIHA,
    PASSAGE_KEYS.IKHLAS,
    PASSAGE_KEYS.FALAQ,
    PASSAGE_KEYS.NAS,
    PASSAGE_KEYS.KAWTHAR,
    PASSAGE_KEYS.ASR,
    PASSAGE_KEYS.MAUN,
    PASSAGE_KEYS.KAFIRUN,
  ]
  for (const key of shortKeys) {
    for (const kind of SHORT_SURAH_KINDS) {
      rows.push(buildPassageScenario(key, kind))
    }
    if (passages[key].ayahs.length >= 3) {
      for (const kind of MULTI_AYAH_EXTRA_KINDS) {
        rows.push(buildPassageScenario(key, kind))
      }
    } else if (passages[key].ayahs.length >= 2) {
      rows.push(buildPassageScenario(key, 'skipped_ayah'))
      rows.push(buildPassageScenario(key, 'restarted_ayah'))
    }
  }

  for (const key of [
    PASSAGE_KEYS.BAQARAH_255,
    PASSAGE_KEYS.BAQARAH_1_5,
    PASSAGE_KEYS.RAHMAN_1_16,
    PASSAGE_KEYS.MULK_1_10,
  ]) {
    for (const kind of LONG_PASSAGE_KINDS) {
      rows.push(buildPassageScenario(key, kind))
    }
    if (passages[key].ayahs.length >= 2) {
      rows.push(buildPassageScenario(key, 'skipped_ayah'))
      rows.push(buildPassageScenario(key, 'restarted_ayah'))
    }
    if (passages[key].ayahs.length >= 3) {
      rows.push(buildPassageScenario(key, 'wrong_ayah_order'))
    }
  }

  return rows
}
