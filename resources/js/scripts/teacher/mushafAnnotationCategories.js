/** Spec categories — manual teacher assessment only (no AI Tajweed scores). */
export const MUSHAF_ANNOTATION_CATEGORIES = [
  ['memorisation', 'teacher.mushaf_category_memorisation'],
  ['tajweed', 'teacher.mushaf_category_tajweed'],
  ['makharij', 'teacher.mushaf_category_makharij'],
  ['pronunciation', 'teacher.mushaf_category_pronunciation'],
  ['hesitation', 'teacher.mushaf_category_hesitation'],
  ['fluency', 'teacher.mushaf_category_fluency'],
  ['other', 'teacher.mushaf_category_other'],
]

export const MUSHAF_ANNOTATION_SEVERITIES = [
  ['minor', 'teacher.mushaf_severity_minor'],
  ['moderate', 'teacher.mushaf_severity_moderate'],
  ['major', 'teacher.mushaf_severity_major'],
]

/** Legacy focus → spec category when category is absent. */
export function resolveMushafAnnotationCategory(row) {
  const explicit = String(row?.category || '').trim()
  if (explicit) return explicit
  const focus = String(row?.focus || '').trim()
  if (focus === 'memorisation') return 'memorisation'
  if (focus === 'pronunciation') return 'pronunciation'
  if (['makharij', 'sifaat'].includes(focus)) return 'makharij'
  if (['madd', 'ghunnah', 'noon_meem', 'qalqalah', 'waqf'].includes(focus)) return 'tajweed'
  return row?.finding === 'difficulty' ? 'memorisation' : 'other'
}

export function mushafAnnotationOverlayClass(category, source = 'teacher') {
  const slug = String(category || 'other').replace(/[^a-z_]/g, '') || 'other'
  const origin = source === 'ai_word_match' ? 'is-ai' : 'is-teacher'
  return `mushaf-annotation-overlay mushaf-annotation--${slug} ${origin}`
}