import { HAFS_AYAH_COUNTS_PER_SURAH } from '../mutashabihat/hafsAyahCounts.js'

/** Coaching activities mapped onto the existing practice and recitation flows. */
export const TEACHER_TASK_TYPES = [
  {
    id: 'nazra',
    labelKey: 'teacher.activity_nazra',
    helpKey: 'teacher.activity_nazra_help',
    kind: 'practice',
    hifz_category: 'sabqi',
    recordingRequired: false,
    matches: [],
  },
  {
    id: 'hifz',
    labelKey: 'teacher.activity_hifz',
    helpKey: 'teacher.activity_hifz_help',
    kind: 'practice',
    hifz_category: 'sabaq',
    recordingRequired: true,
    matches: [],
  },
  {
    id: 'tajweed',
    labelKey: 'teacher.activity_tajweed',
    helpKey: 'teacher.activity_tajweed_help',
    kind: 'ai_recite',
    hifz_category: 'sabqi',
    recordingRequired: true,
    recordingLocked: true,
    matches: [],
  },
  {
    id: 'revision',
    labelKey: 'teacher.activity_revision',
    helpKey: 'teacher.activity_revision_help',
    kind: 'practice',
    hifz_category: 'sabqi',
    recordingRequired: false,
    matches: [],
  },
  {
    id: 'new_memorisation',
    labelKey: 'teacher.task_type_new',
    helpKey: 'teacher.task_type_new_help',
    kind: 'practice',
    hifz_category: 'sabaq',
    legacy: true,
    matches: [{ kind: 'practice', hifz_category: 'sabaq' }],
  },
  {
    id: 'recitation_check',
    labelKey: 'teacher.task_type_recite',
    helpKey: 'teacher.task_type_recite_help',
    kind: 'ai_recite',
    hifz_category: 'sabqi',
    legacy: true,
    matches: [
      { kind: 'ai_recite', hifz_category: 'sabqi' },
      { kind: 'ai_recite', hifz_category: 'manzil' },
      { kind: 'ai_recite', hifz_category: 'sabaq' },
    ],
  },
]

export const TEACHER_FINDING_FOCI = [
  ['makharij', 'teacher.focus_makharij'],
  ['sifaat', 'teacher.focus_sifaat'],
  ['madd', 'teacher.focus_madd'],
  ['ghunnah', 'teacher.focus_ghunnah'],
  ['noon_meem', 'teacher.focus_noon_meem'],
  ['qalqalah', 'teacher.focus_qalqalah'],
  ['waqf', 'teacher.focus_waqf'],
  ['pronunciation', 'teacher.focus_pronunciation'],
  ['memorisation', 'teacher.focus_memorisation'],
  ['other', 'teacher.focus_other'],
]

export const TEACHER_FINDINGS = [
  ['strength', 'teacher.finding_strength'],
  ['difficulty', 'teacher.finding_difficulty'],
  ['correction', 'teacher.finding_correction'],
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

export function resolveTeacherTaskType(kind, hifzCategory, activity = null) {
  if (activity && TEACHER_TASK_TYPES.some((entry) => entry.id === activity && !entry.legacy)) return activity
  const normalizedKind = kind || 'practice'
  const normalizedCategory = hifzCategory || 'sabaq'
  for (const type of TEACHER_TASK_TYPES) {
    if (type.matches.some((entry) => entry.kind === normalizedKind && entry.hifz_category === normalizedCategory)) {
      return type.id
    }
  }
  if (normalizedKind === 'practice' && (normalizedCategory === 'sabqi' || normalizedCategory === 'manzil')) return 'revision'
  return normalizedKind === 'ai_recite' ? 'recitation_check' : 'new_memorisation'
}

export function applyTeacherTaskType(form, taskTypeId) {
  const type = TEACHER_TASK_TYPES.find((entry) => entry.id === taskTypeId)
  if (!type) return { ...form, task_type: taskTypeId }
  const recordingRequired = type.recordingLocked ? true : Boolean(type.recordingRequired)
  return {
    ...form,
    task_type: type.id,
    activity: type.legacy ? null : type.id,
    kind: recordingRequired ? 'ai_recite' : type.kind,
    hifz_category: type.hifz_category,
    recording_required: recordingRequired,
  }
}

export function applyRecordingRequirement(form, required) {
  const type = TEACHER_TASK_TYPES.find((entry) => entry.id === form.task_type)
  const recordingRequired = type?.recordingLocked ? true : Boolean(required)
  return {
    ...form,
    recording_required: recordingRequired,
    kind: recordingRequired ? 'ai_recite' : (type?.kind || 'practice'),
  }
}

export function teacherTaskTypeLabel(typeId, t) {
  const type = TEACHER_TASK_TYPES.find((entry) => entry.id === typeId)
  return type ? t(type.labelKey) : t('teacher.hifz_uncategorized')
}

const HIFZ_STAGE_KEYS = {
  sabaq: 'teacher.hifz_sabaq',
  sabqi: 'teacher.hifz_sabqi',
  manzil: 'teacher.hifz_manzil',
}

/** Sabaq, Sabqi, and Manzil are Hifz stages, not Nazra, Revision, or Recitation check. */
export function assignmentUsesHifzStage(kind, hifzCategory, activity = null) {
  const typeId = resolveTeacherTaskType(kind, hifzCategory, activity)
  return typeId === 'hifz' || typeId === 'new_memorisation'
}

export function hifzStageLabel(category, t) {
  const key = HIFZ_STAGE_KEYS[category]
  return key ? t(key) : ''
}

/** Task type, with the Hifz stage only when this assignment is Hifz. */
export function assignmentDisplayLabel(assignment, t) {
  if (!assignment) return ''
  const typeId = resolveTeacherTaskType(assignment.kind, assignment.hifz_category, assignment.activity)
  const type = teacherTaskTypeLabel(typeId, t)
  if (!assignmentUsesHifzStage(assignment.kind, assignment.hifz_category, assignment.activity)) return type
  const stage = hifzStageLabel(assignment.hifz_category, t)
  return stage ? `${type} · ${stage}` : type
}
