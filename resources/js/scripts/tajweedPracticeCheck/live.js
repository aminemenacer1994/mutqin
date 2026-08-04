import { getPracticeRule, getColourHex } from './catalog.js'
import { buildExpectedTajweedSegments } from './segments.js'

/**
 * Resolve the compact live coach card for the current expected word.
 * Returns null when tajweed is off or the word has no practice rule.
 */
export function resolveLiveTajweedCoach({
  verses = [],
  expectedWordIndex = 0,
  listening = true,
  t = null,
} = {}) {
  if (!listening) return null
  const segments = buildExpectedTajweedSegments(verses)
  if (!segments.length) return null

  const index = Number(expectedWordIndex)
  const atWord = segments.filter((seg) => Number(seg.globalWordIndex) === index)
  const seg = atWord[0]
    || segments.find((row) => Number(row.globalWordIndex) >= index)
    || null
  if (!seg) return null

  const meta = getPracticeRule(seg.ruleKey) || seg
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }

  return {
    ruleKey: seg.ruleKey,
    rule: meta.label || seg.label || 'Tajweed',
    instruction: meta.liveInstruction || meta.beginnerHint || seg.beginnerHint || '',
    status: translate(
      'memorisation.tajweedPracticeCheck.live.listening',
      'Listening…',
    ),
    colour: meta.colour || seg.colour || 'gray',
    colourHex: meta.colourHex || seg.colourHex || getColourHex(meta.colour || seg.colour),
    globalWordIndex: seg.globalWordIndex,
    verseKey: seg.verseKey,
  }
}

/**
 * Local recurring-weakness counter (client-side only).
 * One slightly short/long attempt must not create a persistent weakness.
 */
const WEAKNESS_STORAGE_KEY = 'mutqin.tajweedPractice.weaknessCounts.v1'

export function readWeaknessCounts(storage = null) {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return {}
    const raw = store.getItem(WEAKNESS_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : {}
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch (_) {
    return {}
  }
}

export function writeWeaknessCounts(counts = {}, storage = null) {
  try {
    const store = storage || (typeof localStorage !== 'undefined' ? localStorage : null)
    if (!store) return
    store.setItem(WEAKNESS_STORAGE_KEY, JSON.stringify(counts || {}))
  } catch (_) { /* ignore quota / private mode */ }
}

/**
 * Update weakness counters from assessed segments.
 * Only reliable review/practice outcomes increment; strong outcomes decay.
 * @returns {{ recurringWeaknesses: string[], counts: Record<string, number> }}
 */
export function updateRecurringWeaknesses({
  segments = [],
  timingReliable = false,
  threshold = 3,
  storage = null,
} = {}) {
  const counts = { ...readWeaknessCounts(storage) }
  if (!timingReliable) {
    return { recurringWeaknesses: Object.keys(counts).filter((k) => counts[k] >= threshold), counts }
  }

  const byRule = new Map()
  for (const seg of segments) {
    if (!seg?.ruleKey) continue
    const prev = byRule.get(seg.ruleKey) || { review: 0, practice: 0, strong: 0 }
    if (seg.outcome === 'review') prev.review += 1
    else if (seg.outcome === 'practice') prev.practice += 1
    else if (seg.outcome === 'strong') prev.strong += 1
    byRule.set(seg.ruleKey, prev)
  }

  byRule.forEach((stats, ruleKey) => {
    // Slight single-layer notes do not escalate alone.
    if (stats.review >= 1 || stats.practice >= 2) {
      counts[ruleKey] = (Number(counts[ruleKey]) || 0) + 1
    } else if (stats.strong > 0 && !stats.review && stats.practice === 0) {
      counts[ruleKey] = Math.max(0, (Number(counts[ruleKey]) || 0) - 1)
    }
  })

  writeWeaknessCounts(counts, storage)
  const recurringWeaknesses = Object.keys(counts).filter((k) => counts[k] >= threshold)
  return { recurringWeaknesses, counts }
}
