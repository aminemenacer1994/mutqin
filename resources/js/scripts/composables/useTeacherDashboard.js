import { computed, nextTick, onMounted, onUnmounted, ref } from 'vue'
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
  practiceMinutes,
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
  const assignmentRoster = ref([])
  const studentsLoading = ref(false)
  const studentsLoadingMore = ref(false)
  const studentMeta = ref({ current_page: 1, last_page: 1, total: 0 })
  const filters = ref(defaultStudentFilters())
  const searchTimer = ref(null)
  const profile = ref(null)
  const profileSection = ref('overview')
  const profileLoading = ref(false)
  const assignmentRows = ref([])
  const assignmentsLoading = ref(false)
  const assignmentSaving = ref(false)
  const assignment = ref(defaultAssignmentForm())
  const assignmentFormOpen = ref(false)
  const editingAssignmentId = ref(null)
  const formSuccess = ref('')
  const attentionPreview = ref([])
  const teacherGroups = ref([])
  let profileRequestId = 0
  let studentRequestId = 0

  const featuresEnabled = computed(() => authRef?.teacher_features_enabled === true)

  const firstName = computed(() => {
    return String(authRef?.name || '').split(/\s+/)[0] || t('teacher.teacher')
  })

  const practiceUrl = computed(() => authRef?.practice_url || '/dashboard')
  const profileUrl = computed(() => authRef?.profile_url || '/profile')

  const surahs = computed(() => overview.value?.surahs || [])

  const kpiCards = computed(() => {
    const kpis = overview.value?.kpis || {}
    const overdueTasks = Number(kpis.overdue_assignments ?? 0)
    return [
      {
        key: 'students',
        label: t('teacher.kpi_students'),
        description: t('teacher.kpi_students_help'),
        value: kpis.authorised_students ?? '—',
        icon: 'bi bi-people',
        tone: 'teal',
        action: t('teacher.kpi_open_students'),
      },
      {
        key: 'active',
        label: t('teacher.kpi_active_7d'),
        description: t('teacher.kpi_active_help'),
        value: kpis.active_7_days ?? '—',
        icon: 'bi bi-calendar-week',
        tone: 'teal',
        action: t('teacher.kpi_open_week'),
      },
      {
        key: 'overdue',
        label: t('teacher.kpi_overdue_tasks'),
        description: t('teacher.kpi_overdue_help'),
        value: overdueTasks,
        icon: 'bi bi-clock-history',
        tone: 'teal',
        action: t('teacher.view_all'),
      },
      {
        key: 'attention',
        label: t('teacher.kpi_need_support'),
        description: t('teacher.kpi_support_help'),
        value: kpis.needs_attention ?? '—',
        icon: 'bi bi-exclamation-circle',
        tone: 'teal',
        action: t('teacher.kpi_open_help'),
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
    const minutes = practiceMinutes(seconds)
    if (minutes === null) return t('teacher.unavailable')
    return t('teacher.minutes', { n: minutes })
  })

  const comparisons = computed(() => (
    (profile.value?.payload?.assignments || []).filter((item) => item.assignment)
  ))

  function syncUrl(pushHistory = false) {
    const params = new URLSearchParams()
    if (view.value !== 'overview') params.set('view', view.value)
    if (chartDays.value !== 30) params.set('days', String(chartDays.value))
    Object.entries(filters.value || {}).forEach(([key, value]) => {
      if (value) params.set(key, String(value))
    })
    if (view.value === 'student' && profile.value?.student?.id) {
      params.set('student', String(profile.value.student.id))
      params.set('section', profileSection.value)
    }
    const query = params.toString()
    const nextUrl = `${window.location.pathname}${query ? `?${query}` : ''}`
    const currentUrl = `${window.location.pathname}${window.location.search}`
    if (nextUrl === currentUrl) return
    window.history[pushHistory ? 'pushState' : 'replaceState']({}, '', nextUrl)
  }

  async function loadAttentionPreview() {
    try {
      const payload = await learningApi.getTeacherStudents({ attention: '1', page: 1, per_page: 100 })
      attentionPreview.value = payload.data || []
    } catch {
      attentionPreview.value = []
    }
  }

  async function loadTeacherGroups() {
    try {
      const payload = await learningApi.getTeacherGroups()
      teacherGroups.value = Array.isArray(payload) ? payload : (payload.data || [])
    } catch {
      teacherGroups.value = []
    }
  }

  async function loadOverview() {
    loading.value = !overview.value
    error.value = false
    try {
      overview.value = await learningApi.getTeacherOverview(chartDays.value)
      chartReady.value = false
      await nextTick()
      chartReady.value = true
      await loadAttentionPreview()
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
    if (nextView !== 'student') profileRequestId += 1
    const changed = view.value !== nextView
    view.value = nextView
    formError.value = ''
    formSuccess.value = ''
    syncUrl(changed)
    if (nextView === 'students') {
      loadStudents(1)
      loadTeacherGroups()
    }
    if (nextView === 'assignments') {
      loadStudents(1)
      loadAssignmentRoster()
      loadTeacherGroups()
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

  function prefillAssignmentFromStudent(student) {
    const next = {
      ...defaultAssignmentForm(),
      student_id: student?.id ? String(student.id) : '',
      kind: 'practice',
    }
    const weak = student?.weak_example
    if (weak?.surah_number) {
      next.surah_number = String(weak.surah_number)
      next.ayah_start = Number(weak.ayah_number) || 1
      next.ayah_end = Number(weak.ayah_number) || 1
    }
    assignment.value = next
  }

  function openAssignRevision(student) {
    editingAssignmentId.value = null
    prefillAssignmentFromStudent(student)
    assignmentFormOpen.value = true
    openView('assignments')
  }

  function queueStudentSearch() {
    clearTimeout(searchTimer.value)
    searchTimer.value = setTimeout(() => loadStudents(1), 250)
  }

  async function loadStudents(page = 1, append = false) {
    const requestId = ++studentRequestId
    if (append) studentsLoadingMore.value = true
    else studentsLoading.value = true
    try {
      const payload = await learningApi.getTeacherStudents({ ...filters.value, page, per_page: 24 })
      if (requestId !== studentRequestId) return
      const next = payload.data || []
      students.value = append ? [...students.value, ...next] : next
      studentMeta.value = payload.meta || { current_page: 1, last_page: 1, total: 0 }
    } catch (err) {
      if (requestId !== studentRequestId) return
      formError.value = teacherErrorMessage(err, t)
      if (!append) {
        students.value = []
        studentMeta.value = { current_page: 1, last_page: 1, total: 0 }
      }
    } finally {
      if (requestId === studentRequestId) {
        studentsLoading.value = false
        studentsLoadingMore.value = false
      }
    }
  }

  async function loadAssignmentRoster() {
    try {
      const roster = []
      let page = 1
      let lastPage = 1
      do {
        const payload = await learningApi.getTeacherStudents({ page, per_page: 50 })
        roster.push(...(payload.data || []))
        lastPage = Number(payload.meta?.last_page || 1)
        page += 1
      } while (page <= lastPage)
      assignmentRoster.value = roster
    } catch {
      // The currently loaded student list remains available if the roster refresh fails.
      assignmentRoster.value = students.value
    }
  }

  function loadMoreStudents() {
    if (studentsLoading.value || studentsLoadingMore.value) return
    return loadStudents(Number(studentMeta.value.current_page || 1) + 1, true)
  }

  async function loadAssignments() {
    assignmentsLoading.value = true
    try {
      const payload = await learningApi.getTeacherAssignments()
      assignmentRows.value = payload.data || []
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentsLoading.value = false
    }
  }

  function profileTabIds() {
    return TEACHER_PROFILE_TABS.map((tab) => (typeof tab === 'string' ? tab : tab.id))
  }

  function resolveProfileSection(section) {
    if (section === 'weak' || section === 'revision') return 'focus'
    if (profileTabIds().includes(section)) return section
    return 'overview'
  }

  async function openStudent(id, section = 'overview') {
    view.value = 'student'
    await loadProfile(id, section, true)
  }

  async function loadProfile(id, section = 'overview', pushHistory = false) {
    const requestId = ++profileRequestId
    const resolved = resolveProfileSection(section)
    const sameStudent = profile.value?.student?.id === Number(id)
    profileLoading.value = !sameStudent
    profileSection.value = resolved
    formError.value = ''
    try {
      const nextProfile = await learningApi.getTeacherStudent(id, resolved)
      if (requestId !== profileRequestId) return
      profile.value = nextProfile
      view.value = 'student'
      syncUrl(pushHistory)
    } catch (err) {
      if (requestId !== profileRequestId) return
      profile.value = null
      formError.value = teacherErrorMessage(err, t)
    } finally {
      if (requestId === profileRequestId) profileLoading.value = false
    }
  }

  function metric(key) {
    const value = profile.value?.payload?.metrics?.[key]
    return value === null || value === undefined ? t('teacher.unavailable') : value
  }

  function beginCreateAssignment() {
    if (!assignmentRoster.value.length) loadAssignmentRoster()
    editingAssignmentId.value = null
    assignment.value = defaultAssignmentForm()
    formError.value = ''
    formSuccess.value = ''
    assignmentFormOpen.value = true
  }

  function beginEditAssignment(row) {
    const source = row?.assignment
    const recipient = row?.recipients?.[0]
    if (!row?.can_manage || !source || !recipient) return
    editingAssignmentId.value = source.id
    assignment.value = {
      kind: source.kind,
      student_id: String(recipient.student_id),
      surah_number: String(source.surah_number),
      ayah_start: source.ayah_start,
      ayah_end: source.ayah_end,
      repetition_target: source.repetition_target || 1,
      due_at: source.due_at ? source.due_at.slice(0, 10) : '',
      feedback: source.feedback || '',
    }
    formError.value = ''
    formSuccess.value = ''
    assignmentFormOpen.value = true
  }

  async function saveAssignment() {
    if (assignmentSaving.value) return
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
    if (!editingAssignmentId.value) payload.student_id = Number(assignment.value.student_id)
    try {
      if (editingAssignmentId.value) await learningApi.updateTeacherAssignment(editingAssignmentId.value, payload)
      else await learningApi.createTeacherAssignment(payload)
      const wasEditing = Boolean(editingAssignmentId.value)
      editingAssignmentId.value = null
      assignment.value = { ...defaultAssignmentForm(), surah_number: assignment.value.surah_number }
      assignmentFormOpen.value = false
      formSuccess.value = wasEditing ? t('teacher.task_updated') : t('teacher.assign_success')
      await loadAssignments()
      await loadOverview()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentSaving.value = false
    }
  }

  async function removeAssignment(id) {
    if (assignmentSaving.value) return
    assignmentSaving.value = true
    formError.value = ''
    formSuccess.value = ''
    try {
      await learningApi.deleteTeacherAssignment(id)
      formSuccess.value = t('teacher.task_removed')
      await loadAssignments()
      await loadOverview()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentSaving.value = false
    }
  }

  async function sendTeacherMessage(recipientId, body) {
    const payload = await learningApi.sendTeacherAssignmentMessage(recipientId, body)
    return payload?.message || null
  }

  function bootstrapFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const urlView = params.get('view') || 'overview'
    view.value = TEACHER_VIEWS.includes(urlView) ? urlView : 'overview'
    profileSection.value = resolveProfileSection(params.get('section') || 'overview')
    const days = Number(params.get('days'))
    chartDays.value = TEACHER_CHART_DAY_OPTIONS.includes(days) ? days : 30
    filters.value = Object.fromEntries(
      Object.keys(defaultStudentFilters()).map((key) => [key, params.get(key) || '']),
    )
  }

  async function bootstrapData() {
    await loadOverview()
    if (view.value === 'students' || view.value === 'assignments') await loadStudents(1)
    if (view.value === 'assignments') await Promise.all([loadAssignments(), loadAssignmentRoster()])
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
    window.addEventListener('popstate', onHistoryNavigation)
  })

  onUnmounted(() => {
    window.removeEventListener('popstate', onHistoryNavigation)
    clearTimeout(searchTimer.value)
  })

  function onHistoryNavigation() {
    profileRequestId += 1
    bootstrapFromUrl()
    bootstrapData()
  }

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
    assignmentRoster,
    studentsLoading,
    studentsLoadingMore,
    studentMeta,
    filters,
    profile,
    profileSection,
    profileLoading,
    assignmentRows,
    assignmentsLoading,
    assignmentSaving,
    assignment,
    assignmentFormOpen,
    editingAssignmentId,
    formSuccess,
    attentionPreview,
    teacherGroups,
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
    syncUrl,
    openView,
    openStudentsFromKpi,
    queueStudentSearch,
    loadStudents,
    loadMoreStudents,
    openStudent,
    loadProfile,
    metric,
    beginCreateAssignment,
    beginEditAssignment,
    saveAssignment,
    removeAssignment,
    sendTeacherMessage,
    openAssignRevision,
    prefillAssignmentFromStudent,
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
