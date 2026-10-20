export const TEACHER_VIEWS = ['overview', 'students', 'student', 'assignments', 'groups', 'settings']

export const TEACHER_CHART_DAY_OPTIONS = [7, 30, 90]

export const TEACHER_NAV = [
  { id: 'overview', label: 'teacher.nav_overview', icon: 'bi bi-grid' },
  { id: 'students', label: 'teacher.nav_students', icon: 'bi bi-people' },
  { id: 'assignments', label: 'teacher.nav_assignments', icon: 'bi bi-journal-check' },
  { id: 'groups', label: 'teacher.nav_groups', icon: 'bi bi-collection' },
  { id: 'settings', label: 'teacher.nav_settings', icon: 'bi bi-gear' },
]

export const TEACHER_PROFILE_TABS = ['overview', 'practice', 'weak', 'ai', 'revision']

export function defaultAssignmentForm() {
  return {
    kind: 'practice',
    target: 'student',
    student_id: '',
    learning_group_id: '',
    surah_number: '1',
    ayah_start: 1,
    ayah_end: 7,
    repetition_target: 1,
    due_at: '',
    feedback: '',
  }
}

export function defaultStudentFilters() {
  return { q: '', group_id: '', activity: '', performance: '', attention: '' }
}
