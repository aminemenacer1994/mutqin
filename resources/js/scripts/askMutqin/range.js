import { SURAH_AYAH_COUNTS } from '../engine/hifz_session_engine.js'

export const ASK_MUTQIN_PLAYBACK_SPEEDS = Object.freeze([0.5, 0.75, 1, 1.25, 1.5, 2])

export function askMutqinSurahAyahCount(surah) {
  const id = Number(surah || 0)
  if (id < 1 || id > 114) return 0
  return Number(SURAH_AYAH_COUNTS[id - 1] || 0)
}

/**
 * Resolve a detected ayah into a reader range. Never invents ayah_end.
 *
 * Detected ayah 6:
 *   give me 5          → 6–10
 *   next 5 after this  → 7–11
 *   until 12           → 6–12
 *   just this          → 6
 *   open from here     → 6 (no end required)
 */
export function resolveAskMutqinRange({
  surah,
  ayahStart,
  count = null,
  afterThis = false,
  untilAyah = null,
  justThis = false,
} = {}) {
  const chapter = Number(surah || 0)
  const start = Number(ayahStart || 0)
  const max = askMutqinSurahAyahCount(chapter)
  if (chapter < 1 || chapter > 114 || start < 1 || !max || start > max) {
    return { ok: false, reason: 'invalid_ayah' }
  }

  if (justThis) {
    return { ok: true, surah: chapter, ayahStart: start, ayahEnd: start, openEnded: false }
  }

  const until = Number(untilAyah)
  if (Number.isFinite(until) && until > 0) {
    if (until < start || until > max) {
      return { ok: false, reason: 'invalid_range' }
    }
    return { ok: true, surah: chapter, ayahStart: start, ayahEnd: until, openEnded: false }
  }

  const n = Number(count)
  if (Number.isFinite(n) && n > 0) {
    const from = afterThis ? start + 1 : start
    if (from > max) return { ok: false, reason: 'invalid_range' }
    const end = Math.min(max, from + Math.round(n) - 1)
    return { ok: true, surah: chapter, ayahStart: from, ayahEnd: end, openEnded: false }
  }

  // Open / play / memorise from here — focus the detected ayah only.
  return { ok: true, surah: chapter, ayahStart: start, ayahEnd: start, openEnded: true }
}

export function snapAskMutqinSpeed(value, fallback = null) {
  const n = Number(value)
  if (!Number.isFinite(n) || n <= 0) return fallback
  let best = ASK_MUTQIN_PLAYBACK_SPEEDS[0]
  let bestDelta = Math.abs(n - best)
  for (const option of ASK_MUTQIN_PLAYBACK_SPEEDS) {
    const delta = Math.abs(n - option)
    if (delta < bestDelta) {
      best = option
      bestDelta = delta
    }
  }
  return best
}

export function stepAskMutqinSpeed(current, direction) {
  const now = snapAskMutqinSpeed(current, 1)
  const index = ASK_MUTQIN_PLAYBACK_SPEEDS.indexOf(now)
  const next = direction < 0 ? index - 1 : index + 1
  return ASK_MUTQIN_PLAYBACK_SPEEDS[Math.max(0, Math.min(ASK_MUTQIN_PLAYBACK_SPEEDS.length - 1, next))]
}

export function clampAskMutqinRepetitions(value) {
  const n = Number(value)
  if (!Number.isFinite(n) || n < 1) return null
  return Math.max(1, Math.min(50, Math.round(n)))
}
