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
  groupLabel,
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
  const studentMeta = ref({ current_page: 1, last_page: 1 })
  const filters = ref(defaultStudentFilters())
  const searchTimer = ref(null)
  const groups = ref([])
  const groupDetail = ref(null)
  const openGroupId = ref(null)
  const groupName = ref('')
  const groupSaving = ref(false)
  const profile = ref(null)
  const profileSection = ref('overview')
  const profileLoading = ref(false)
  const note = ref({ kind: 'feedback', body: '' })
  const noteSaving = ref(false)
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
  const teachingGroups = computed(() => groups.value.filter((group) => group.teaches))

  const kpiCards = computed(() => {
    const kpis = overview.value?.kpis || {}
    return [
      { key: 'students', label: t('teacher.kpi_students'), value: kpis.authorised_students ?? 0, icon: 'bi bi-people', tone: 'teal' },
      { key: 'active', label: t('teacher.kpi_active'), value: `${kpis.active_7_days ?? 0} / ${kpis.active_30_days ?? 0}`, icon: 'bi bi-lightning-charge', tone: 'gold' },
      { key: 'ai', label: t('teacher.kpi_ai'), value: kpis.ai_success_rate === null || kpis.ai_success_rate === undefined ? t('teacher.unavailable') : `${kpis.ai_success_rate}%`, icon: 'bi bi-mic', tone: 'sky' },
      { key: 'attention', label: t('teacher.kpi_attention'), value: kpis.needs_attention ?? 0, icon: 'bi bi-exclamation-circle', tone: 'accent' },
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
        borderRadius: 6,
        maxBarThickness: chartDays.value === 7 ? 22 : 12,
      }],
    }
  })

  const chartOptions = computed(() => {
    const ink = cssThemeColor('--text', '#1c1917')
    const grid = cssThemeColor('--border', 'rgba(120, 100, 70, 0.2)')
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { enabled: true } },
      scales: {
        x: { ticks: { color: ink, maxRotation: 0, autoSkip: true }, grid: { display: false } },
        y: { beginAtZero: true, ticks: { color: ink, precision: 0 }, grid: { color: grid } },
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
      loadGroups()
    }
    if (nextView === 'assignments') {
      loadStudents(1)
      loadGroups()
      loadAssignments()
    }
    if (nextView === 'groups') loadGroups()
  }

  function queueStudentSearch() {
    clearTimeout(searchTimer.value)
    searchTimer.value = setTimeout(() => loadStudents(1), 250)
  }

  async function loadStudents(page = 1) {
    studentsLoading.value = true
    try {
      const payload = await learningApi.getTeacherStudents({ ...filters.value, page, per_page: 20 })
      students.value = payload.data || []
      studentMeta.value = payload.meta || { current_page: 1, last_page: 1 }
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      studentsLoading.value = false
    }
  }

  async function loadGroups() {
    try {
      const payload = await learningApi.getTeacherGroups()
      groups.value = payload.data || []
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  async function loadAssignments() {
    try {
      const payload = await learningApi.getTeacherAssignments()
      assignmentRows.value = payload.data || []
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  async function openStudent(id, section = 'overview') {
    view.value = 'student'
    await loadProfile(id, section)
  }

  async function loadProfile(id, section = 'overview') {
    profileLoading.value = !profile.value || profile.value.student?.id !== Number(id)
    profileSection.value = section
    formError.value = ''
    try {
      profile.value = await learningApi.getTeacherStudent(id, section)
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

  async function saveNote() {
    if (!profile.value?.student?.id || !note.value.body.trim()) return
    noteSaving.value = true
    formError.value = ''
    try {
      await learningApi.saveTeacherNote(profile.value.student.id, note.value)
      note.value.body = ''
      await loadProfile(profile.value.student.id, 'overview')
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      noteSaving.value = false
    }
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
    if (assignment.value.target === 'group') payload.learning_group_id = Number(assignment.value.learning_group_id)
    else payload.student_id = Number(assignment.value.student_id)
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

  async function createGroup() {
    groupSaving.value = true
    formError.value = ''
    try {
      await learningApi.createTeacherGroup(groupName.value)
      groupName.value = ''
      await loadGroups()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      groupSaving.value = false
    }
  }

  async function joinGroup(group) {
    formError.value = ''
    try {
      await learningApi.joinTeacherGroup(group.id)
      await loadGroups()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  async function toggleGroup(group) {
    if (openGroupId.value === group.id) {
      openGroupId.value = null
      groupDetail.value = null
      return
    }
    formError.value = ''
    try {
      groupDetail.value = await learningApi.getTeacherGroup(group.id)
      openGroupId.value = group.id
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  async function reviewMembership(membership, action) {
    formError.value = ''
    try {
      await learningApi.reviewTeacherMembership(membership.id, action)
      if (openGroupId.value) groupDetail.value = await learningApi.getTeacherGroup(openGroupId.value)
      await loadGroups()
      await loadOverview()
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
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
    if (view.value === 'groups' || view.value === 'assignments' || view.value === 'students') await loadGroups()
    if (view.value === 'assignments') await loadAssignments()
    const params = new URLSearchParams(window.location.search)
    if (view.value === 'student' && params.get('student')) {
      await loadProfile(params.get('student'), params.get('section') || 'overview')
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
    studentMeta,
    filters,
    groups,
    groupDetail,
    openGroupId,
    groupName,
    groupSaving,
    profile,
    profileSection,
    profileLoading,
    note,
    noteSaving,
    assignmentRows,
    assignmentSaving,
    assignment,
    featuresEnabled,
    firstName,
    practiceUrl,
    profileUrl,
    surahs,
    teachingGroups,
    kpiCards,
    chartData,
    chartOptions,
    practiceTime,
    comparisons,
    loadOverview,
    setDays,
    openView,
    queueStudentSearch,
    loadStudents,
    openStudent,
    loadProfile,
    metric,
    saveNote,
    createAssignment,
    createGroup,
    joinGroup,
    toggleGroup,
    reviewMembership,
    isNavActive: (id) => isTeacherNavActive(view.value, id),
    formatWhen: formatTeacherWhen,
    studentInitial,
    groupLabel: (student) => groupLabel(student, t),
    weakLabel: (student) => weakLabel(student, t),
    revisionLabel: (student) => revisionLabel(student, t),
    assignmentLabel: (counts) => assignmentLabel(counts, t),
    sessionLabel: (session) => sessionLabel(session, t),
    issueLabel: (issues) => issueLabel(issues, t),
  }
}
