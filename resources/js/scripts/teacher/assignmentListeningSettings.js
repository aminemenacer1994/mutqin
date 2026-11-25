import { ALQURAN_RECITER_OPTIONS } from '../memorisationRuntime.js'
import { SPEED_OPTIONS } from '../settings/workspacePreferences.js'
import { globalAyahNumber } from '../quran/contentIntegrity.js'

/** Reciters teachers see first for memorisation homework (Murattal / measured). */
export const TEACHER_MEMORISATION_RECITER_ORDER = [
  'ar.husary',
  'ar.minshawi',
  'ar.abdulbasitmurattal',
  'ar.alafasy',
  'ar.abdurrahmaansudais',
]

const RECITER_HINT_KEYS = {
  'ar.husary': 'teacher.assignment_reciter_hint_husary',
  'ar.minshawi': 'teacher.assignment_reciter_hint_minshawi',
  'ar.abdulbasitmurattal': 'teacher.assignment_reciter_hint_abdulbasit',
  'ar.alafasy': 'teacher.assignment_reciter_hint_alafasy',
  'ar.abdurrahmaansudais': 'teacher.assignment_reciter_hint_sudais',
}

const ALLOWED_TECHNIQUES = new Set(['talqin', 'focus', 'blur'])

export function teacherMemorisationReciterOptions() {
  const byId = new Map(ALQURAN_RECITER_OPTIONS.map((row) => [row.id, row]))
  const ordered = []
  for (const id of TEACHER_MEMORISATION_RECITER_ORDER) {
    const row = byId.get(id)
    if (row) {
      ordered.push({
        ...row,
        hintKey: RECITER_HINT_KEYS[id] || 'teacher.assignment_reciter_hint_default',
        memorisationPick: true,
      })
      byId.delete(id)
    }
  }
  const rest = [...byId.values()]
    .sort((a, b) => a.name.localeCompare(b.name))
    .map((row) => ({
      ...row,
      hintKey: 'teacher.assignment_reciter_hint_default',
      memorisationPick: false,
    }))
  return [...ordered, ...rest]
}

export function defaultAssignmentSessionSettings() {
  return {
    reciter: '',
    speed: '',
    repetitions: '',
    technique: 'talqin',
    repetitions_per_ayah_enabled: false,
    repetitions_per_ayah: {},
  }
}

export function assignmentSupportsRecommendedReciter(form = {}) {
  const taskType = String(form.task_type || form.activity || '')
  return ['hifz', 'new_memorisation', 'revision'].includes(taskType)
}

export function sanitizeTeacherAssignmentSessionSettings(raw) {
  if (!raw || typeof raw !== 'object') return null
  const clean = {}
  const reciter = String(raw.reciter || '').trim()
  if (reciter && ALQURAN_RECITER_OPTIONS.some((row) => row.id === reciter)) {
    clean.reciter = reciter
  }
  const speed = Number(raw.speed)
  if (Number.isFinite(speed) && SPEED_OPTIONS.includes(speed)) {
    clean.speed = speed
  }
  const reps = Number(raw.repetitions)
  if (Number.isFinite(reps) && reps >= 1 && reps <= 8) {
    clean.repetitions = Math.round(reps)
  }
  const technique = String(raw.technique || '').toLowerCase().trim()
  if (ALLOWED_TECHNIQUES.has(technique)) {
    clean.technique = technique
  }
  if (raw.repetitions_per_ayah && typeof raw.repetitions_per_ayah === 'object') {
    const perAyah = {}
    Object.entries(raw.repetitions_per_ayah).forEach(([ayah, count]) => {
      const ayahNum = Number(ayah)
      const n = Number(count)
      if (!Number.isFinite(ayahNum) || !Number.isFinite(n)) return
      if (ayahNum < 1 || n < 1 || n > 8) return
      perAyah[Math.round(ayahNum)] = Math.round(n)
    })
    if (Object.keys(perAyah).length) clean.repetitions_per_ayah = perAyah
  }
  return Object.keys(clean).length ? clean : null
}

export function sessionSettingsFromAssignment(assignment) {
  const settings = assignment?.session_settings
  if (!settings || typeof settings !== 'object') return defaultAssignmentSessionSettings()
  return {
    reciter: settings.reciter || '',
    speed: settings.speed ?? '',
    repetitions: settings.repetitions ?? '',
    technique: settings.technique || 'talqin',
    repetitions_per_ayah_enabled: Boolean(settings.repetitions_per_ayah && Object.keys(settings.repetitions_per_ayah).length),
    repetitions_per_ayah: { ...(settings.repetitions_per_ayah || {}) },
  }
}

export function buildAyahPreviewAudioUrl(reciterId, surahNumber, ayahNumber) {
  const reciter = String(reciterId || '').trim()
  const surah = Number(surahNumber)
  const ayah = Number(ayahNumber)
  if (!reciter || !(surah > 0) || !(ayah > 0)) return null
  const global = globalAyahNumber(surah, ayah)
  if (!(global > 0)) return null
  return `/audio/ayah/${encodeURIComponent(reciter)}/${global}.mp3`
}

export function buildRepeatAyahMap(surah, fromAyah, toAyah, repetitions) {
  const start = Number(fromAyah)
  const end = Number(toAyah)
  const reps = Number(repetitions)
  if (!(start > 0) || !(end >= start) || !(reps > 0)) return {}
  const map = {}
  for (let ayah = start; ayah <= end; ayah += 1) {
    map[ayah] = Math.min(8, Math.round(reps))
  }
  return map
}