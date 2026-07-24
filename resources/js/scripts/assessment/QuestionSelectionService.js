/**
 * Selects the minimum relevant question set for the learner.
 * Priority: weak/uncertain → session range → overdue review → strong interleaving.
 */

import {
  ASSESSMENT_LIMITS,
  DIFFICULTY,
  QUESTION_TYPES,
  QUESTION_TYPES_BY_DIFFICULTY,
  SKILLS,
} from './constants.js'
import {
  buildDistractors,
  buildMushafHidePrompt,
  splitIntoPhrases,
  tokenizeVerifiedText,
} from './QuestionValidationService.js'

/**
 * @typedef {{
 *   key: string,
 *   surah: number,
 *   ayah: number,
 *   arabic: string,
 *   surahName?: string,
 * }} VerseRef
 */

/**
 * @param {VerseRef[]} verses
 * @param {{
 *   masteryByKey?: Record<string, object>,
 *   sessionWeakAyahs?: number[],
 *   overdueKeys?: string[],
 *   sessionRange?: { surah: number, from: number, to: number },
 * }} ctx
 * @returns {VerseRef[]}
 */
export function prioritiseVerses(verses, ctx = {}) {
  const list = Array.isArray(verses) ? [...verses] : []
  const mastery = ctx.masteryByKey || {}
  const weakSet = new Set((ctx.sessionWeakAyahs || []).map(Number))
  const overdue = new Set(ctx.overdueKeys || [])
  const range = ctx.sessionRange || null

  const score = (v) => {
    let s = 0
    const m = mastery[v.key]
    const recall = Number(m?.recallMastery ?? m?.masteryScore ?? 0.5)
    if (weakSet.has(Number(v.ayah))) s += 100
    if (recall < 0.45) s += 80
    if (recall < 0.65) s += 40
    if (overdue.has(v.key)) s += 60
    if (
      range
      && Number(v.surah) === Number(range.surah)
      && Number(v.ayah) >= Number(range.from)
      && Number(v.ayah) <= Number(range.to)
    ) {
      s += 30
    }
    // Slight boost for strong content (interleaving) so it can appear sparsely
    if (recall >= 0.8) s += 5
    return s
  }

  return list.sort((a, b) => score(b) - score(a))
}

/**
 * Pick one question type for the current difficulty, avoiding recent repeats.
 * @param {number} difficulty
 * @param {string[]} recentTypes
 * @param {() => number} [rng]
 */
export function pickQuestionType(difficulty, recentTypes = [], rng = Math.random) {
  const level = Math.max(1, Math.min(4, Number(difficulty) || DIFFICULTY.GUIDED_RECALL))
  const pool = [...(QUESTION_TYPES_BY_DIFFICULTY[level] || QUESTION_TYPES_BY_DIFFICULTY[2])]
  const fresh = pool.filter((t) => !recentTypes.includes(t))
  const choices = fresh.length ? fresh : pool
  // Weight toward simple MCQ so the quick check feels tap-and-go.
  const mcqPreferred = new Set([
    QUESTION_TYPES.MISSING_WORD_OPTIONS,
    QUESTION_TYPES.SELECT_NEXT_PHRASE,
    QUESTION_TYPES.SURAH_IDENTIFICATION,
    QUESTION_TYPES.COMPLETE_AYAH_REDUCED,
    QUESTION_TYPES.PREVIOUS_NEXT_AYAH,
    QUESTION_TYPES.MATCH_BEGINNING_ENDING,
    QUESTION_TYPES.BEGINNING_END_RECALL,
    QUESTION_TYPES.MISSING_AYAH,
    QUESTION_TYPES.HARAKAH_CHECK,
    QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION,
  ])
  const weighted = []
  for (const type of choices) {
    weighted.push(type)
    if (mcqPreferred.has(type)) weighted.push(type, type)
  }
  return weighted[Math.floor(rng() * weighted.length)] || QUESTION_TYPES.MISSING_WORD_OPTIONS
}

/**
 * Map question type → primary diagnostic skills probed.
 * @param {string} type
 * @returns {string[]}
 */
export function skillsForQuestionType(type) {
  switch (type) {
    case QUESTION_TYPES.SURAH_IDENTIFICATION:
      return [SKILLS.BEGINNINGS, SKILLS.PHRASE_RECALL]
    case QUESTION_TYPES.MISSING_WORD_OPTIONS:
    case QUESTION_TYPES.COMPLETE_AYAH_REDUCED:
    case QUESTION_TYPES.COMPLETE_AYAH_OPEN:
      return [SKILLS.PHRASE_RECALL, SKILLS.TEXTUAL_PRECISION]
    case QUESTION_TYPES.SELECT_NEXT_PHRASE:
    case QUESTION_TYPES.BASIC_PHRASE_ORDERING:
    case QUESTION_TYPES.ARRANGE_AYAH_SEGMENTS:
      return [SKILLS.PHRASE_RECALL, SKILLS.AYAH_SEQUENCE]
    case QUESTION_TYPES.MATCH_BEGINNING_ENDING:
    case QUESTION_TYPES.BEGINNING_END_RECALL:
      return [SKILLS.BEGINNINGS, SKILLS.ENDINGS]
    case QUESTION_TYPES.PREVIOUS_NEXT_AYAH:
    case QUESTION_TYPES.MISSING_AYAH:
    case QUESTION_TYPES.CROSS_RANGE_SEQUENCE:
      return [SKILLS.AYAH_SEQUENCE]
    case QUESTION_TYPES.MUSHAF_HIDE_PARTIAL:
    case QUESTION_TYPES.MUSHAF_HIDE_HEAVY:
      return [SKILLS.PHRASE_RECALL, SKILLS.VISUAL_TEXT_DEPENDENCY, SKILLS.INDEPENDENCE]
    case QUESTION_TYPES.RANDOM_START_CONTINUATION:
      return [SKILLS.PHRASE_RECALL, SKILLS.INDEPENDENCE]
    case QUESTION_TYPES.AI_RECITE_NO_TEXT:
    case QUESTION_TYPES.PRONUNCIATION_FLUENCY:
      return [SKILLS.SPOKEN_RECALL, SKILLS.FLUENCY, SKILLS.INDEPENDENCE]
    case QUESTION_TYPES.HARAKAH_CHECK:
      return [SKILLS.TEXTUAL_PRECISION]
    case QUESTION_TYPES.MUTASHABIHAT_COMPARISON:
    case QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION:
      return [SKILLS.SIMILAR_AYAH_CONFUSION, SKILLS.TEXTUAL_PRECISION]
    case QUESTION_TYPES.DELAYED_RECALL:
      return [SKILLS.DELAYED_RETENTION, SKILLS.PHRASE_RECALL]
    default:
      return [SKILLS.PHRASE_RECALL]
  }
}

/**
 * Build a single validated question from verified verses.
 *
 * @param {{
 *   verses: VerseRef[],
 *   difficulty: number,
 *   type?: string,
 *   recentTypes?: string[],
 *   masteryByKey?: Record<string, object>,
 *   sessionWeakAyahs?: number[],
 *   overdueKeys?: string[],
 *   sessionRange?: object,
 *   surahCatalog?: { id: number, name: string }[],
 *   rng?: () => number,
 * }} input
 * @returns {object|null}
 */
export function selectNextQuestion(input = {}) {
  const verses = Array.isArray(input.verses) ? input.verses.filter((v) => v?.arabic && v?.key) : []
  if (!verses.length) return null

  const rng = typeof input.rng === 'function' ? input.rng : Math.random
  const difficulty = Math.max(1, Math.min(4, Number(input.difficulty) || ASSESSMENT_LIMITS.START_DIFFICULTY))
  const prioritized = prioritiseVerses(verses, input)
  const type = input.type || pickQuestionType(difficulty, input.recentTypes || [], rng)

  // Try up to a few target verses until a valid question builds
  for (let attempt = 0; attempt < Math.min(6, prioritized.length); attempt += 1) {
    const target = prioritized[attempt]
    const built = buildQuestionForType({
      type,
      target,
      verses: prioritized,
      difficulty,
      surahCatalog: input.surahCatalog || [],
      rng,
    })
    if (built) return built
  }

  // Fallback: simple missing-word on the top priority verse
  const fallbackTarget = prioritized[0]
  return buildQuestionForType({
    type: QUESTION_TYPES.MISSING_WORD_OPTIONS,
    target: fallbackTarget,
    verses: prioritized,
    difficulty: DIFFICULTY.RECOGNITION,
    surahCatalog: input.surahCatalog || [],
    rng,
  })
}

/**
 * @param {{
 *   type: string,
 *   target: VerseRef,
 *   verses: VerseRef[],
 *   difficulty: number,
 *   surahCatalog: { id: number, name: string }[],
 *   rng: () => number,
 * }} args
 */
function buildQuestionForType(args) {
  const { type, target, verses, difficulty, surahCatalog, rng } = args
  if (!target?.arabic) return null

  const poolTexts = verses.map((v) => v.arabic)
  const tokens = tokenizeVerifiedText(target.arabic)
  const base = {
    id: `q_${target.key}_${type}_${Date.now()}`,
    type,
    difficulty,
    skills: skillsForQuestionType(type),
    verseKey: target.key,
    surah: Number(target.surah),
    ayah: Number(target.ayah),
    prompt: '',
    promptHtml: null,
    options: null,
    correctAnswer: null,
    correctIndex: null,
    segments: null,
    expectedOrder: null,
    hidePercent: null,
    requiresAiRecite: false,
    renderer: 'mcq',
    hint: null,
  }

  switch (type) {
    case QUESTION_TYPES.SURAH_IDENTIFICATION: {
      const correctName = target.surahName || `Surah ${target.surah}`
      const names = new Set([correctName])
      for (const s of surahCatalog) {
        if (names.size >= 4) break
        if (Number(s.id) !== Number(target.surah) && s.name) names.add(s.name)
      }
      // Pad from nearby surah numbers if catalog is thin
      let n = Number(target.surah)
      while (names.size < 4 && n > 1) {
        n -= 1
        names.add(`Surah ${n}`)
      }
      n = Number(target.surah)
      while (names.size < 4 && n < 114) {
        n += 1
        names.add(`Surah ${n}`)
      }
      const options = [...names]
      for (let i = options.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]]
      }
      return {
        ...base,
        prompt: 'Which surah is this from?',
        promptHtml: target.arabic,
        options,
        correctAnswer: correctName,
        correctIndex: options.findIndex((o) => o === correctName),
        renderer: 'mcq',
      }
    }

    case QUESTION_TYPES.MISSING_WORD_OPTIONS:
    case QUESTION_TYPES.COMPLETE_AYAH_REDUCED: {
      if (tokens.length < 3) return null
      const idx = Math.max(1, Math.min(tokens.length - 2, Math.floor(rng() * (tokens.length - 2)) + 1))
      const missing = tokens[idx]
      const promptTokens = tokens.map((t, i) => (i === idx ? '____' : t))
      const built = buildDistractors({
        correct: missing,
        poolTexts,
        mode: 'token',
        count: type === QUESTION_TYPES.COMPLETE_AYAH_REDUCED ? 3 : 4,
        rng,
      })
      if (!built.valid) return null
      return {
        ...base,
        prompt: 'Which word is missing?',
        promptHtml: promptTokens.join(' '),
        options: built.options,
        correctAnswer: missing,
        correctIndex: built.correctIndex,
        renderer: 'mcq',
        hint: tokens.slice(Math.max(0, idx - 1), idx).join(' '),
      }
    }

    case QUESTION_TYPES.SELECT_NEXT_PHRASE: {
      const phrases = splitIntoPhrases(target.arabic, 3)
      if (phrases.length < 2) return null
      const correct = phrases[1]
      const built = buildDistractors({ correct, poolTexts, mode: 'phrase', count: 4, rng })
      if (!built.valid) return null
      return {
        ...base,
        prompt: 'What comes next?',
        promptHtml: phrases[0],
        options: built.options,
        correctAnswer: correct,
        correctIndex: built.correctIndex,
        renderer: 'mcq',
      }
    }

    case QUESTION_TYPES.BASIC_PHRASE_ORDERING:
    case QUESTION_TYPES.ARRANGE_AYAH_SEGMENTS: {
      const phrases = splitIntoPhrases(target.arabic, 3)
      if (phrases.length < 2) return null
      const shuffled = [...phrases]
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      // Ensure not already correct
      if (shuffled.every((p, i) => p === phrases[i])) {
        if (shuffled.length >= 2) [shuffled[0], shuffled[1]] = [shuffled[1], shuffled[0]]
      }
      return {
        ...base,
        prompt: 'Put these in order',
        promptHtml: null,
        segments: shuffled,
        expectedOrder: phrases,
        correctAnswer: phrases.join(' | '),
        renderer: 'ordering',
      }
    }

    case QUESTION_TYPES.MATCH_BEGINNING_ENDING:
    case QUESTION_TYPES.BEGINNING_END_RECALL: {
      if (tokens.length < 4) return null
      const beginning = tokens.slice(0, Math.min(3, Math.ceil(tokens.length / 3))).join(' ')
      const ending = tokens.slice(-Math.min(3, Math.ceil(tokens.length / 3))).join(' ')
      const built = buildDistractors({ correct: ending, poolTexts, mode: 'phrase', count: 4, rng })
      if (!built.valid) return null
      return {
        ...base,
        prompt: 'How does this ayah end?',
        promptHtml: beginning + ' …',
        options: built.options,
        correctAnswer: ending,
        correctIndex: built.correctIndex,
        renderer: 'mcq',
      }
    }

    case QUESTION_TYPES.PREVIOUS_NEXT_AYAH:
    case QUESTION_TYPES.MISSING_AYAH: {
      const idx = verses.findIndex((v) => v.key === target.key)
      const next = verses[idx + 1] || verses[idx - 1]
      if (!next) return null
      const askNext = type === QUESTION_TYPES.PREVIOUS_NEXT_AYAH || !verses[idx - 1]
      const neighbour = askNext ? verses[idx + 1] : verses[idx - 1]
      if (!neighbour) return null
      const built = buildDistractors({
        correct: neighbour.arabic,
        poolTexts,
        mode: 'full',
        count: 4,
        rng,
      })
      if (!built.valid) return null
      return {
        ...base,
        prompt: askNext ? 'Which ayah comes next?' : 'Which ayah comes before?',
        promptHtml: target.arabic,
        options: built.options,
        correctAnswer: neighbour.arabic,
        correctIndex: built.correctIndex,
        verseKey: neighbour.key,
        ayah: Number(neighbour.ayah),
        renderer: 'mcq',
      }
    }

    case QUESTION_TYPES.MUSHAF_HIDE_PARTIAL:
    case QUESTION_TYPES.MUSHAF_HIDE_HEAVY: {
      const hidePercent = type === QUESTION_TYPES.MUSHAF_HIDE_HEAVY
        ? (rng() > 0.5 ? 100 : 75)
        : (rng() > 0.5 ? 50 : 25)
      const hide = buildMushafHidePrompt(target.arabic, hidePercent, rng)
      if (!hide.hiddenTokens.length) return null
      return {
        ...base,
        prompt: 'What are the hidden words?',
        promptHtml: hide.promptTokens.join(' '),
        hidePercent,
        correctAnswer: hide.original,
        hiddenTokens: hide.hiddenTokens,
        renderer: hidePercent >= 75 ? 'open' : 'open',
        hint: hidePercent <= 50 ? hide.hiddenTokens[0] : null,
      }
    }

    case QUESTION_TYPES.COMPLETE_AYAH_OPEN:
    case QUESTION_TYPES.RANDOM_START_CONTINUATION: {
      if (tokens.length < 4) return null
      const startCount = Math.max(1, Math.floor(tokens.length * 0.35))
      const start = tokens.slice(0, startCount).join(' ')
      return {
        ...base,
        prompt: 'Continue from memory',
        promptHtml: start + ' …',
        correctAnswer: tokens.join(' '),
        renderer: 'open',
        hint: tokens[startCount] || null,
      }
    }

    case QUESTION_TYPES.AI_RECITE_NO_TEXT:
    case QUESTION_TYPES.PRONUNCIATION_FLUENCY: {
      return {
        ...base,
        prompt: 'Recite this ayah from memory',
        promptHtml: null,
        correctAnswer: target.arabic,
        requiresAiRecite: true,
        renderer: 'ai_recite',
        hint: tokens.slice(0, 2).join(' '),
      }
    }

    case QUESTION_TYPES.HARAKAH_CHECK: {
      // Simpler renderer: show undiacritized options vs verified original snippet
      if (tokens.length < 2) return null
      const focus = tokens[Math.floor(rng() * tokens.length)]
      const built = buildDistractors({ correct: focus, poolTexts, mode: 'token', count: 3, rng })
      if (!built.valid) return null
      return {
        ...base,
        prompt: 'Which word is correct?',
        promptHtml: target.arabic,
        options: built.options,
        correctAnswer: focus,
        correctIndex: built.correctIndex,
        renderer: 'mcq_simple',
      }
    }

    case QUESTION_TYPES.MUTASHABIHAT_COMPARISON:
    case QUESTION_TYPES.SIMILAR_AYAH_IDENTIFICATION: {
      const others = verses.filter((v) => v.key !== target.key)
      if (!others.length) return null
      const similar = others[Math.floor(rng() * others.length)]
      const options = [target.arabic, similar.arabic]
      // Add more distractors if available
      for (const v of others) {
        if (options.length >= 4) break
        if (!options.includes(v.arabic)) options.push(v.arabic)
      }
      for (let i = options.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [options[i], options[j]] = [options[j], options[i]]
      }
      return {
        ...base,
        prompt: 'Which ayah matches?',
        promptHtml: tokenizeVerifiedText(target.arabic).slice(0, 3).join(' ') + ' …',
        options,
        correctAnswer: target.arabic,
        correctIndex: options.findIndex((o) => o === target.arabic),
        renderer: 'mcq_simple',
      }
    }

    case QUESTION_TYPES.CROSS_RANGE_SEQUENCE: {
      if (verses.length < 3) return null
      const slice = verses.slice(0, Math.min(4, verses.length))
      const keys = slice.map((v) => v.key)
      const shuffled = [...keys]
      for (let i = shuffled.length - 1; i > 0; i -= 1) {
        const j = Math.floor(rng() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
      }
      return {
        ...base,
        prompt: 'Put these ayahs in order',
        segments: shuffled.map((k) => {
          const v = slice.find((x) => x.key === k)
          return { key: k, label: `${k}`, text: v?.arabic || '' }
        }),
        expectedOrder: keys,
        correctAnswer: keys.join(','),
        renderer: 'ordering',
      }
    }

    case QUESTION_TYPES.DELAYED_RECALL: {
      if (tokens.length < 3) return null
      const missing = tokens[Math.floor(tokens.length / 2)]
      const built = buildDistractors({ correct: missing, poolTexts, mode: 'token', count: 4, rng })
      if (!built.valid) return null
      return {
        ...base,
        prompt: 'Which word belongs here?',
        promptHtml: tokens.map((t, i) => (i === Math.floor(tokens.length / 2) ? '____' : t)).join(' '),
        options: built.options,
        correctAnswer: missing,
        correctIndex: built.correctIndex,
        renderer: 'mcq_simple',
        delayed: true,
      }
    }

    default:
      return null
  }
}

export const QuestionSelectionService = {
  prioritiseVerses,
  pickQuestionType,
  skillsForQuestionType,
  selectNextQuestion,
}

export default QuestionSelectionService
