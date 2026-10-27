import { HAFS_AYAH_COUNTS_PER_SURAH } from '../mutashabihat/hafsAyahCounts'

/** Teacher-facing task choices mapped to existing kind + hifz_category values. */
export const TEACHER_TASK_TYPES = [
  {
    id: 'new_memorisation',
    labelKey: 'teacher.task_type_new',
    helpKey: 'teacher.task_type_new_help',
    kind: 'practice',
    hifz_category: 'sabaq',
    matches: [{ kind: 'practice', hifz_category: 'sabaq' }],
  },
  {
    id: 'revision',
    labelKey: 'teacher.task_type_revision',
    helpKey: 'teacher.task_type_revision_help',
    kind: 'practice',
    hifz_category: 'sabqi',
    matches: [
      { kind: 'practice', hifz_category: 'sabqi' },
      { kind: 'practice', hifz_category: 'manzil' },
    ],
  },
  {
    id: 'recitation_check',
    labelKey: 'teacher.task_type_recite',
    helpKey: 'teacher.task_type_recite_help',
    kind: 'ai_recite',
    hifz_category: 'sabqi',
    matches: [
      { kind: 'ai_recite', hifz_category: 'sabqi' },
      { kind: 'ai_recite', hifz_category: 'manzil' },
      { kind: 'ai_recite', hifz_category: 'sabaq' },
    ],
  },
]

export function surahAyahCount(surahs, surahNumber) {
  const fromApi = surahs?.find((surah) => String(surah.number) === String(surahNumber))?.ayah_count
  const parsed = Number(fromApi)
  if (parsed > 0) return parsed
  const index = Number(surahNumber) - 1
  return HAFS_AYAH_COUNTS_PER_SURAH[index] || 1
}

export function defaultAyahRange(surahs, surahNumber) {
  const end = surahAyahCount(surahs, surahNumber)
  return { ayah_start: 1, ayah_end: end }
}

export function resolveTeacherTaskType(kind, hifzCategory) {
  const normalizedKind = kind || 'practice'
  const normalizedCategory = hifzCategory || 'sabaq'
  for (const type of TEACHER_TASK_TYPES) {
    if (type.matches.some((entry) => entry.kind === normalizedKind && entry.hifz_category === normalizedCategory)) {
      return type.id
    }
  }
  return normalizedKind === 'ai_recite' ? 'recitation_check' : 'new_memorisation'
}

export function applyTeacherTaskType(form, taskTypeId) {
  const type = TEACHER_TASK_TYPES.find((entry) => entry.id === taskTypeId)
  if (!type) return { ...form, task_type: taskTypeId }
  return {
    ...form,
    task_type: type.id,
    kind: type.kind,
    hifz_category: type.hifz_category,
  }
}

export function teacherTaskTypeLabel(typeId, t) {
  const type = TEACHER_TASK_TYPES.find((entry) => entry.id === typeId)
  return type ? t(type.labelKey) : t('teacher.hifz_uncategorized')
}
