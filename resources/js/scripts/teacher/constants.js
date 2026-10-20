export const TEACHER_VIEWS = ['overview', 'students', 'student', 'assignments', 'settings']

export const TEACHER_CHART_DAY_OPTIONS = [7, 30, 90]

export const TEACHER_NAV = [
  { id: 'overview', label: 'teacher.nav_overview', icon: 'bi bi-house-door' },
  { id: 'students', label: 'teacher.nav_students', icon: 'bi bi-people' },
  { id: 'assignments', label: 'teacher.nav_assignments', icon: 'bi bi-journal-text' },
  { id: 'settings', label: 'teacher.nav_settings', icon: 'bi bi-person' },
]

export const TEACHER_PROFILE_TABS = ['overview']

export function defaultAssignmentForm() {
  return {
    kind: 'practice',
    student_id: '',
    surah_number: '1',
    ayah_start: 1,
    ayah_end: 7,
    repetition_target: 1,
    due_at: '',
    feedback: '',
  }
}

export function defaultStudentFilters() {
  return { q: '', activity: '', performance: '', attention: '' }
}
