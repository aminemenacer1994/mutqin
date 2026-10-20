import { computed, nextTick, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { learningApi } from '../api/learning'
import { classifyRequestFailure } from '../../utils/networkStatus'
import {
  TEACHER_CHART_DAY_OPTIONS,
  TEACHER_NAV,
  TEACHER_PROFILE_TABS,
  TEACHER_VIEWS,
  defaultAssignmentForm,
  defaultStudentFilters,
} from '../teacher/constants'
import {
  assignmentLabel,
  cssThemeColor,
  formatTeacherWhen,
  isTeacherNavActive,
  issueLabel,
  revisionLabel,
  sessionLabel,
  studentInitial,
  weakLabel,
} from '../teacher/formatters'
import { teacherErrorMessage } from '../teacher/errors'

export function useTeacherDashboard(authRef) {
  const { t } = useI18n()

  const view = ref('overview')
  const loading = ref(true)
  const error = ref(false)
  const failureKind = ref('failure')
  const formError = ref('')
  const overview = ref(null)
  const chartDays = ref(30)
  const chartReady = ref(true)
  const students = ref([])
  const studentsLoading = ref(false)
  const studentsLoadingMore = ref(false)
  const studentMeta = ref({ current_page: 1, last_page: 1, total: 0 })
  const filters = ref(defaultStudentFilters())
  const searchTimer = ref(null)
  const profile = ref(null)
  const profileSection = ref('overview')
  const profileLoading = ref(false)
  const assignmentRows = ref([])
  const assignmentSaving = ref(false)
  const assignment = ref(defaultAssignmentForm())

  const featuresEnabled = computed(() => authRef?.teacher_features_enabled === true)

  const firstName = computed(() => {
    return String(authRef?.name || '').split(/\s+/)[0] || t('teacher.teacher')
  })

  const practiceUrl = computed(() => authRef?.practice_url || '/dashboard')
  const profileUrl = computed(() => authRef?.profile_url || '/profile')

  const surahs = computed(() => overview.value?.surahs || [])

  const kpiCards = computed(() => {
    const kpis = overview.value?.kpis || {}
    return [
      {
        key: 'students',
        label: t('teacher.kpi_students'),
        value: kpis.authorised_students ?? '—',
        icon: 'bi bi-people',
        tone: 'teal',
        action: t('teacher.kpi_open_students'),
      },
      {
        key: 'attention',
        label: t('teacher.kpi_attention'),
        value: kpis.needs_attention ?? '—',
        icon: 'bi bi-exclamation-circle',
        tone: 'teal',
        action: t('teacher.kpi_open_help'),
      },
      {
        key: 'active',
        label: t('teacher.kpi_active'),
        value: kpis.active_7_days ?? '—',
        icon: 'bi bi-calendar-week',
        tone: 'teal',
        action: t('teacher.kpi_open_week'),
      },
    ]
  })

  const chartData = computed(() => {
    const points = overview.value?.chart?.points || []
    const color = cssThemeColor('--accent', '#3f6f6d')
    return {
      labels: points.map((point) => point.date.slice(5)),
      datasets: [{
        label: t('teacher.sessions'),
        data: points.map((point) => point.sessions),
        backgroundColor: color,
        hoverBackgroundColor: cssThemeColor('--accent-strong', color),
        borderRadius: 8,
        borderSkipped: false,
        maxBarThickness: chartDays.value === 7 ? 28 : 16,
      }],
    }
  })

  const chartOptions = computed(() => {
    const ink = cssThemeColor('--text', '#1c1917')
    const muted = cssThemeColor('--text-muted', '#6b635a')
    const grid = cssThemeColor('--border', 'rgba(120, 100, 70, 0.2)')
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: { duration: 420, easing: 'easeOutQuart' },
      plugins: {
        legend: { display: false },
        tooltip: {
          enabled: true,
          backgroundColor: cssThemeColor('--surface-strong', '#fffaf3'),
          titleColor: ink,
          bodyColor: ink,
          borderColor: grid,
          borderWidth: 1,
          padding: 10,
          displayColors: false,
        },
      },
      scales: {
        x: {
          ticks: { color: muted, maxRotation: 0, autoSkip: true, font: { size: 11, weight: '600' } },
          grid: { display: false },
        },
        y: {
          beginAtZero: true,
          ticks: { color: muted, precision: 0, font: { size: 11, weight: '600' } },
          grid: { color: grid, drawBorder: false },
        },
      },
    }
  })

  const practiceTime = computed(() => {
    const seconds = profile.value?.payload?.metrics?.practice_seconds
    if (seconds === null || seconds === undefined) return t('teacher.unavailable')
    const minutes = Math.round(Number(seconds) / 60)
    return t('teacher.minutes', { n: minutes })
  })

  const comparisons = computed(() => (
    (profile.value?.payload?.assignments || []).filter((item) => item.assignment)
  ))

  function syncUrl() {
    const params = new URLSearchParams()
    if (view.value !== 'overview') params.set('view', view.value)
    if (chartDays.value !== 30) params.set('days', String(chartDays.value))
    if (view.value === 'student' && profile.value?.student?.id) {
      params.set('student', String(profile.value.student.id))
      params.set('section', profileSection.value)
    }
    const query = params.toString()
    window.history.replaceState({}, '', `${window.location.pathname}${query ? `?${query}` : ''}`)
  }

  async function loadOverview() {
    loading.value = !overview.value
    error.value = false
    try {
      overview.value = await learningApi.getTeacherOverview(chartDays.value)
      chartReady.value = false
      await nextTick()
      chartReady.value = true
    } catch (err) {
      error.value = !overview.value
      failureKind.value = classifyRequestFailure(err)
      formError.value = teacherErrorMessage(err, t)
    } finally {
      loading.value = false
    }
  }

  function setDays(days) {
    chartDays.value = days
    syncUrl()
    loadOverview()
  }

  function openView(nextView) {
    view.value = nextView
    formError.value = ''
    syncUrl()
    if (nextView === 'students') {
      loadStudents(1)
    }
    if (nextView === 'assignments') {
      loadStudents(1)
      loadAssignments()
    }
  }

  function openStudentsFromKpi(key) {
    filters.value = {
      ...defaultStudentFilters(),
      attention: key === 'attention' ? '1' : '',
      activity: key === 'active' ? 'active_7' : '',
    }
    openView('students')
  }

  function queueStudentSearch() {
    clearTimeout(searchTimer.value)
    searchTimer.value = setTimeout(() => loadStudents(1), 250)
  }

  async function loadStudents(page = 1, append = false) {
    if (append) studentsLoadingMore.value = true
    else studentsLoading.value = true
    try {
      const payload = await learningApi.getTeacherStudents({ ...filters.value, page, per_page: 24 })
      const next = payload.data || []
      students.value = append ? [...students.value, ...next] : next
      studentMeta.value = payload.meta || { current_page: 1, last_page: 1, total: 0 }
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      studentsLoading.value = false
      studentsLoadingMore.value = false
    }
  }

  function loadMoreStudents() {
    return loadStudents(Number(studentMeta.value.current_page || 1) + 1, true)
  }

  async function loadAssignments() {
    try {
      const payload = await learningApi.getTeacherAssignments()
      assignmentRows.value = payload.data || []
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  function resolveProfileSection(section) {
    if (TEACHER_PROFILE_TABS.includes(section)) return section
    return 'overview'
  }

  async function openStudent(id, section = 'overview') {
    view.value = 'student'
    await loadProfile(id, section)
  }

  async function loadProfile(id, section = 'overview') {
    const resolved = resolveProfileSection(section)
    const sameStudent = profile.value?.student?.id === Number(id)
    profileLoading.value = !sameStudent
    profileSection.value = resolved
    formError.value = ''
    try {
      profile.value = await learningApi.getTeacherStudent(id, resolved)
      view.value = 'student'
      syncUrl()
    } catch (err) {
      profile.value = null
      formError.value = teacherErrorMessage(err, t)
    } finally {
      profileLoading.value = false
    }
  }

  function metric(key) {
    const value = profile.value?.payload?.metrics?.[key]
    return value === null || value === undefined ? t('teacher.unavailable') : value
  }

  async function createAssignment() {
    assignmentSaving.value = true
    formError.value = ''
    const payload = {
      kind: assignment.value.kind,
      surah_number: Number(assignment.value.surah_number),
      ayah_start: Number(assignment.value.ayah_start),
      ayah_end: Number(assignment.value.ayah_end),
      repetition_target: assignment.value.repetition_target ? Number(assignment.value.repetition_target) : null,
      due_at: assignment.value.due_at || null,
      feedback: assignment.value.feedback || null,
    }
    payload.student_id = Number(assignment.value.student_id)
    try {
      await learningApi.createTeacherAssignment(payload)
      assignment.value.feedback = ''
      await loadAssignments()
      await loadOverview()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentSaving.value = false
    }
  }

  function bootstrapFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const urlView = params.get('view') || 'overview'
    view.value = TEACHER_VIEWS.includes(urlView) ? urlView : 'overview'
    const days = Number(params.get('days'))
    chartDays.value = TEACHER_CHART_DAY_OPTIONS.includes(days) ? days : 30
  }

  async function bootstrapData() {
    await loadOverview()
    if (view.value === 'students' || view.value === 'assignments') await loadStudents(1)
    if (view.value === 'assignments') await loadAssignments()
    const params = new URLSearchParams(window.location.search)
    if (view.value === 'student' && params.get('student')) {
      await loadProfile(params.get('student'), resolveProfileSection(params.get('section') || 'overview'))
    }
  }

  onMounted(() => {
    if (!featuresEnabled.value) {
      loading.value = false
      return
    }
    bootstrapFromUrl()
    bootstrapData()
  })

  return {
    t,
    TEACHER_NAV,
    TEACHER_PROFILE_TABS,
    TEACHER_CHART_DAY_OPTIONS,
    view,
    loading,
    error,
    failureKind,
    formError,
    overview,
    chartDays,
    chartReady,
    students,
    studentsLoading,
    studentsLoadingMore,
    studentMeta,
    filters,
    profile,
    profileSection,
    profileLoading,
    assignmentRows,
    assignmentSaving,
    assignment,
    featuresEnabled,
    firstName,
    practiceUrl,
    profileUrl,
    surahs,
    kpiCards,
    chartData,
    chartOptions,
    practiceTime,
    comparisons,
    loadOverview,
    setDays,
    openView,
    openStudentsFromKpi,
    queueStudentSearch,
    loadStudents,
    loadMoreStudents,
    openStudent,
    loadProfile,
    metric,
    createAssignment,
    isNavActive: (id) => isTeacherNavActive(view.value, id),
    formatWhen: formatTeacherWhen,
    studentInitial,
    weakLabel: (student) => weakLabel(student, t),
    revisionLabel: (student) => revisionLabel(student, t),
    assignmentLabel: (counts) => assignmentLabel(counts, t),
    sessionLabel: (session) => sessionLabel(session, t),
    issueLabel: (issues) => issueLabel(issues, t),
  }
}
