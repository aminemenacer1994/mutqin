import { resolveMushafAnnotationCategory } from './mushafAnnotationCategories.js'

function locationKey(surah, ayah, wordIndex) {
  const s = Number(surah)
  const a = Number(ayah)
  const w = Number(wordIndex)
  if (!Number.isInteger(s) || s < 1 || !Number.isInteger(a) || a < 1 || !Number.isInteger(w) || w < 0) return ''
  return `${s}:${a}:${w + 1}`
}

function aiCategory(word) {
  const status = word?.status || ''
  if (status === 'skipped' || status === 'omitted') return 'memorisation'
  if (['uncertain', 'partial'].includes(status)) return 'fluency'
  return 'pronunciation'
}

/**
 * Build non-destructive overlay metadata keyed by Mushaf word location (`surah:ayah:position`).
 *
 * @param {{
 *   surah: number,
 *   coachings?: object[],
 *   words?: object[],
 *   manualAnnotations?: object[],
 *   includeAiFlags?: boolean,
 *   publishedOnly?: boolean,
 * }} input
 */
export function buildMushafAnnotationOverlayMap(input) {
  const surah = Number(input?.surah)
  const map = Object.create(null)
  if (!Number.isInteger(surah) || surah < 1) return map

  const coachings = Array.isArray(input?.coachings) ? input.coachings : []
  for (const coaching of coachings) {
    const ayah = Number(coaching?.ayah)
    const index = Number(coaching?.word_index)
    const key = locationKey(surah, ayah, index)
    if (!key) continue
    const corrections = (Array.isArray(coaching?.corrections) ? coaching.corrections : [])
      .filter((row) => {
        if (input?.publishedOnly && row?.is_published === false) return false
        if (input?.publishedOnly && row?.is_draft) return false
        return true
      })
    const latest = corrections[corrections.length - 1]
    if (latest) {
      map[key] = {
        id: latest.id,
        category: resolveMushafAnnotationCategory(latest),
        severity: latest.severity || null,
        source: 'teacher',
        guidance: latest.body,
        correctionIds: corrections.map((c) => c.id),
      }
      continue
    }
    if (coaching?.decision === 'confirmed') {
      map[key] = { category: 'pronunciation', source: 'teacher', confirmedAi: true }
    }
  }

  const manual = Array.isArray(input?.manualAnnotations) ? input.manualAnnotations : []
  for (const row of manual) {
    if (input?.publishedOnly && !row?.is_published) continue
    const ayah = Number(row?.ayah)
    if (row?.granularity === 'ayah') {
      const ayahKey = `${surah}:${ayah}:_ayah`
      map[ayahKey] = {
        id: row.id,
        category: resolveMushafAnnotationCategory(row),
        severity: row.severity || null,
        source: 'teacher',
        guidance: row.guidance,
        ayahLevel: true,
      }
      continue
    }
    const key = locationKey(surah, ayah, Number(row?.word_index))
    if (!key) continue
    map[key] = {
      id: row.id,
      category: resolveMushafAnnotationCategory(row),
      severity: row.severity || null,
      source: 'teacher',
      guidance: row.guidance,
    }
  }

  if (input?.includeAiFlags) {
    const words = Array.isArray(input?.words) ? input.words : []
    for (const word of words) {
      const state = String(word?.status || word?.alignment_state || '')
      if (!['mismatch', 'uncertain', 'skipped', 'partial', 'incorrect', 'omitted', 'wrong', 'missing'].includes(state)) continue
      const ayah = Number(word?.ayah)
      const index = Number(word?.word_index)
      const key = locationKey(surah, ayah, index)
      if (!key || map[key]?.source === 'teacher') continue
      map[key] = {
        category: aiCategory(word),
        source: 'ai_word_match',
        tentative: true,
      }
    }
  }

  return map
}

export function parseMushafWordLocation(location) {
  const parts = String(location || '').trim().split(':')
  if (parts.length < 3) return null
  const surah = Number(parts[0])
  const ayah = Number(parts[1])
  const position = Number(parts[2])
  if (!Number.isInteger(surah) || !Number.isInteger(ayah) || !Number.isInteger(position)) return null
  return { surah, ayah, word_index: Math.max(0, position - 1) }
}