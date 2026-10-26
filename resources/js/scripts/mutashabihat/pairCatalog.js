import { HAFS_AYAH_COUNTS_PER_SURAH } from './hafsAyahCounts.js'

/**
 * Al Quran Cloud edition: full words with standard harakat (no KFGQPC PUA / broken glyphs).
 * @see https://api.alquran.cloud/v1/edition?type=quran
 */
export const MUTASHABIHAT_ARABIC_EDITION = 'quran-simple'

/** Minimum shared normalised tokens for a pair to appear in practice UI. */
export const MIN_MUTASHABIHAT_SHARED_TOKENS = 10

/** Minimum share of aligned tokens that must match (filters phrase-only / thematic pairs). */
export const MIN_MUTASHABIHAT_SHARED_RATIO = 0.22

/** Ayahs must be similar length (full-ayah diff, not one line vs a paragraph). */
export const MIN_MUTASHABIHAT_LENGTH_RATIO = 0.45

/** Skip catalog mistakes only when both ayahs are fully loaded (avoid hiding during partial fetch). */
const MIN_WORDS_FOR_OVERLAP_CHECK = 8

export function isValidVerseReference(surah, ayah) {
  const s = Number(surah)
  const a = Number(ayah)
  const counts = HAFS_AYAH_COUNTS_PER_SURAH
  if (!Number.isFinite(s) || !Number.isFinite(a) || s < 1 || s > counts.length) {
    return false
  }
  const max = counts[s - 1]
  return a >= 1 && a <= max
}

export function mutashabihatOverlapMetrics(stats, leftWordCount = 0, rightWordCount = 0) {
  const shared = Number(stats?.shared || 0)
  const different = Number(stats?.different || 0)
  const inserted = Number(stats?.inserted || 0)
  const omitted = Number(stats?.omitted || 0)
  const aligned = shared + different + inserted + omitted
  const sharedRatio = aligned > 0 ? shared / aligned : 0
  const left = Number(leftWordCount) || 0
  const right = Number(rightWordCount) || 0
  const lengthRatio = left > 0 && right > 0 ? Math.min(left, right) / Math.max(left, right) : 0
  return { shared, sharedRatio, lengthRatio, aligned }
}

export function pairPassesOverlapQuality(stats, leftWordCount = 0, rightWordCount = 0) {
  if (!stats) return true
  const { shared, sharedRatio, lengthRatio } = mutashabihatOverlapMetrics(stats, leftWordCount, rightWordCount)
  return shared >= MIN_MUTASHABIHAT_SHARED_TOKENS
    && sharedRatio >= MIN_MUTASHABIHAT_SHARED_RATIO
    && lengthRatio >= MIN_MUTASHABIHAT_LENGTH_RATIO
}

export function pairHasMinimumOverlap(stats, leftWordCount = 0, rightWordCount = 0) {
  if (!stats) return true
  const left = Number(leftWordCount) || 0
  const right = Number(rightWordCount) || 0
  if (left < MIN_WORDS_FOR_OVERLAP_CHECK || right < MIN_WORDS_FOR_OVERLAP_CHECK) {
    return true
  }
  return pairPassesOverlapQuality(stats, leftWordCount, rightWordCount)
}
