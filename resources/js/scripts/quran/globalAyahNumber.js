import { SURAH_AYAH_COUNTS } from '../engine/hifz_session_engine.js'

export function globalAyahNumber(surah, ayah, counts = SURAH_AYAH_COUNTS) {
  const s = Number(surah)
  const a = Number(ayah)
  const max = Number(counts[s - 1] || 0)
  if (!Number.isFinite(s) || !Number.isFinite(a) || s < 1 || s > 114 || a < 1 || a > max) {
    return null
  }
  let offset = 0
  for (let i = 1; i < s; i += 1) offset += Number(counts[i - 1] || 0)
  return offset + a
}