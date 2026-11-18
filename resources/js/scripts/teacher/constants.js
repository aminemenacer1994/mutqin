import { defaultAyahRange } from './taskTypes'

export const TEACHER_VIEWS = ['overview', 'students', 'student', 'plans', 'assignments', 'reviews', 'settings']

export const TEACHER_CHART_DAY_OPTIONS = [7, 30, 90]

export const TEACHER_NAV = [
  { id: 'overview', label: 'teacher.nav_overview', icon: 'bi bi-grid-1x2' },
  { id: 'students', label: 'teacher.nav_students', icon: 'bi bi-people' },
  { id: 'assignments', label: 'teacher.nav_assignments_desk', shortLabel: 'teacher.nav_assignments_short', icon: 'bi bi-journal-text' },
  { id: 'reviews', label: 'teacher.nav_reviews', shortLabel: 'teacher.nav_reviews_short', icon: 'bi bi-ear' },
]

/** One profile tab row. Review is the working page: listen, then clear what is due. */
export const TEACHER_PROFILE_TABS = [
  { id: 'ai', label: 'teacher.tab_recitations', icon: 'bi bi-ear' },
  { id: 'tasks', label: 'teacher.nav_assignments', icon: 'bi bi-clipboard-check' },
  { id: 'plan', label: 'teacher.tab_learning_plan', icon: 'bi bi-calendar-week' },
  { id: 'messages', label: 'teacher.messages', icon: 'bi bi-chat-dots' },
]

/** Views inside the Learning tab. Recite covers the old Recitation tab. */
export const TEACHER_LEARNING_SUBVIEWS = [
  { id: 'memorisation', label: 'teacher.learning_memorisation' },
  { id: 'recite', label: 'teacher.learning_recite' },
  { id: 'revision', label: 'teacher.learning_revision' },
  { id: 'plan', label: 'teacher.learning_plan' },
]

export function defaultAssignmentForm(surahs = []) {
  const surahNumber = '1'
  const range = defaultAyahRange(surahs, surahNumber)
  return {
    task_type: 'nazra',
    activity: 'nazra',
    kind: 'practice',
    hifz_category: 'sabqi',
    recording_required: false,
    student_id: '',
    surah_number: surahNumber,
    ayah_start: range.ayah_start,
    ayah_end: range.ayah_end,
    repetition_target: 1,
    due_at: '',
    priority: 'normal',
    feedback: '',
  }
}

export function defaultStudentFilters() {
  return { q: '', group_id: '', activity: '', performance: '', attention: '' }
}
