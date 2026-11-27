import { defaultAyahRange } from './taskTypes'
import { defaultAssignmentSessionSettings } from './assignmentListeningSettings'

export const TEACHER_VIEWS = ['overview', 'students', 'student', 'plans', 'assignments', 'attendance', 'messages', 'reviews', 'settings']

export const TEACHER_CHART_DAY_OPTIONS = [7, 30, 90]

export const TEACHER_MOBILE_PRIMARY_NAV_IDS = Object.freeze(['overview', 'students', 'assignments', 'messages'])

export const TEACHER_NAV = [
  { id: 'overview', label: 'teacher.nav_overview', mobileLabel: 'teacher.nav_home', icon: 'bi bi-house' },
  { id: 'students', label: 'teacher.nav_students', icon: 'bi bi-people' },
  {
    id: 'assignments',
    label: 'teacher.nav_assignments_desk',
    shortLabel: 'teacher.nav_assignments_short',
    mobileLabel: 'teacher.nav_tasks_short',
    icon: 'bi bi-journal-text',
  },
  { id: 'plans', label: 'teacher.nav_plans', shortLabel: 'teacher.nav_plans_short', icon: 'bi bi-calendar-week', mobile: false },
  { id: 'reviews', label: 'teacher.nav_reviews', shortLabel: 'teacher.nav_reviews_short', icon: 'bi bi-ear', mobile: false },
  { id: 'messages', label: 'teacher.messages', icon: 'bi bi-chat-dots' },
]

/** Administrative destinations grouped at the bottom of the teacher sidebar. */
export const TEACHER_ADMIN_NAV = [
  { id: 'attendance', label: 'teacher.nav_attendance', icon: 'bi bi-calendar-check' },
  { id: 'settings', label: 'teacher.nav_settings', icon: 'bi bi-person' },
]

/** Bottom bar on viewports under 992px — five destinations including More. */
export function teacherMobilePrimaryNav() {
  return TEACHER_NAV.filter((item) => TEACHER_MOBILE_PRIMARY_NAV_IDS.includes(item.id))
}

/** Plans, reviews, attendance, and account live under More on mobile; desktop sidebar unchanged. */
export function teacherMobileMoreNav() {
  const secondary = TEACHER_NAV.filter((item) => ['plans', 'reviews'].includes(item.id))
  return [...secondary, ...TEACHER_ADMIN_NAV]
}

/** One profile tab row. Review is the working page: listen, then clear what is due. */
export const TEACHER_PROFILE_TABS = [
  { id: 'ai', label: 'teacher.tab_recitations', icon: 'bi bi-ear' },
  { id: 'tasks', label: 'teacher.nav_assignments', icon: 'bi bi-clipboard-check' },
  { id: 'attendance', label: 'teacher.nav_attendance', icon: 'bi bi-calendar-check' },
  { id: 'plan', label: 'teacher.tab_learning_plan', icon: 'bi bi-calendar-week' },
  { id: 'messages', label: 'teacher.messages', icon: 'bi bi-chat-dots' },
  { id: 'guardians', label: 'teacher.tab_guardians', icon: 'bi bi-people' },
  { id: 'reports', label: 'teacher.tab_progress_reports', icon: 'bi bi-file-earmark-bar-graph' },
]

/** Views inside the Learning tab. Recite covers the old Recitation tab. */
export const TEACHER_LEARNING_SUBVIEWS = [
  { id: 'memorisation', label: 'teacher.learning_memorisation' },
  { id: 'recite', label: 'teacher.learning_recite' },
  { id: 'revision', label: 'teacher.learning_revision' },
  { id: 'plan', label: 'teacher.learning_plan' },
]

export function defaultTeacherDueDate() {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

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
    due_at: defaultTeacherDueDate(),
    priority: 'normal',
    feedback: '',
    session_settings: defaultAssignmentSessionSettings(),
  }
}

export function defaultStudentFilters() {
  return { q: '', group_id: '', activity: '', performance: '', attention: '' }
}
