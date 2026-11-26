import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { learningApi } from '../api/learning'
import { classifyRequestFailure } from '../../utils/networkStatus'
import {
  TEACHER_ADMIN_NAV,
  TEACHER_CHART_DAY_OPTIONS,
  TEACHER_NAV,
  TEACHER_PROFILE_TABS,
  TEACHER_VIEWS,
  defaultAssignmentForm,
  defaultStudentFilters,
} from '../teacher/constants'
import {
  sanitizeTeacherAssignmentSessionSettings,
  sessionSettingsFromAssignment,
} from '../teacher/assignmentListeningSettings'
import {
  assignmentLabel,
  formatTeacherWhen,
  isTeacherNavActive,
  issueLabel,
  practiceMinutes,
  revisionLabel,
  sessionLabel,
  studentInitial,
  weakLabel,
} from '../teacher/formatters'
import { applyTeacherTaskType, defaultAyahRange, resolveTeacherTaskType } from '../teacher/taskTypes'
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
  const overviewRefreshing = ref(false)
  const overviewError = ref('')
  const students = ref([])
  const assignmentRoster = ref([])
  const studentsLoading = ref(false)
  const studentsLoadingMore = ref(false)
  const studentMeta = ref({ current_page: 1, last_page: 1, total: 0 })
  const filters = ref(defaultStudentFilters())
  const searchTimer = ref(null)
  const profile = ref(null)
  const profileSection = ref('ai')
  const profileLearningSubview = ref('recite')
  const profileLoading = ref(false)
  const profileSectionPayloads = ref({})
  const profileFocus = ref(null)
  const assignmentRows = ref([])
  const assignmentEntryFilter = ref('all')
  const assignmentsLoading = ref(false)
  const assignmentSaving = ref(false)
  const assignment = ref(defaultAssignmentForm())
  const assignmentFormOpen = ref(false)
  const editingAssignmentId = ref(null)
  const formSuccess = ref('')
  let successTimer = null
  watch(formSuccess, (message) => {
    if (successTimer) clearTimeout(successTimer)
    successTimer = message ? setTimeout(() => { formSuccess.value = '' }, 3000) : null
  })
  const attentionPreview = ref([])
  const teacherGroups = ref([])
  let profileRequestId = 0
  let studentRequestId = 0
  let navigationEpoch = 0
  let overviewRequestId = 0

  function noteNavigation() {
    navigationEpoch += 1
  }

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
        description: t('teacher.kpi_students_help'),
        value: kpis.authorised_students ?? '—',
        icon: 'bi bi-people',
        tone: 'teal',
        action: t('teacher.kpi_open_students'),
      },
      {
        key: 'active',
        label: t('teacher.kpi_active_30d'),
        description: t('teacher.kpi_active_30d_help'),
        value: kpis.active_30_days ?? '—',
        icon: 'bi bi-calendar3',
        tone: 'teal',
        action: t('teacher.kpi_open_students'),
      },
      {
        key: 'tasks',
        label: t('teacher.kpi_open_tasks'),
        description: t('teacher.kpi_open_tasks_help'),
        value: Number(kpis.outstanding_assignments ?? 0),
        icon: 'bi bi-list-check',
        tone: 'teal',
        action: t('teacher.kpi_open_tasks_action'),
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
      if (profileFocus.value?.taskId) params.set('task', String(profileFocus.value.taskId))
      if (profileFocus.value?.attemptId) params.set('attempt', String(profileFocus.value.attemptId))
      if (profileFocus.value?.filter) params.set('task_filter', String(profileFocus.value.filter))
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
    const requestId = ++overviewRequestId
    loading.value = !overview.value
    overviewRefreshing.value = true
    overviewError.value = ''
    error.value = false
    try {
      const payload = await learningApi.getTeacherOverview(chartDays.value)
      if (requestId !== overviewRequestId) return
      overview.value = payload
      await loadAttentionPreview()
    } catch (err) {
      if (requestId !== overviewRequestId) return
      error.value = !overview.value
      failureKind.value = classifyRequestFailure(err)
      overviewError.value = teacherErrorMessage(err, t)
      formError.value = overviewError.value
    } finally {
      if (requestId === overviewRequestId) {
        loading.value = false
        overviewRefreshing.value = false
      }
    }
  }

  function setDays(days) {
    if (!TEACHER_CHART_DAY_OPTIONS.includes(days) || chartDays.value === days || overviewRefreshing.value) return
    chartDays.value = days
    syncUrl()
    loadOverview()
  }

  function openView(nextView) {
    noteNavigation()
    if (nextView !== 'assignments') assignmentEntryFilter.value = 'all'
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
    if (nextView === 'reviews' && !overview.value) loadOverview()
    if (nextView === 'overview') loadOverview()
    if (nextView === 'attendance') loadTeacherGroups()
    if (nextView === 'messages') {
      loadStudents(1)
      loadAssignmentRoster()
      loadOverview()
    }
    if (nextView === 'plans') {
      loadStudents(1)
      loadAssignmentRoster()
    }
    if (nextView === 'settings') loadTeacherGroups()
  }

  function openStudentsFromKpi(key) {
    if (key === 'tasks') {
      assignmentEntryFilter.value = 'all'
      openView('assignments')
      return
    }
    filters.value = {
      ...defaultStudentFilters(),
      attention: key === 'attention' ? '1' : '',
      activity: key === 'active' ? 'active_7' : '',
    }
    openView('students')
  }

  async function markReviewReviewed({ id, studentId }) {
    try {
      await learningApi.completeTeacherReview(studentId, id)
      formSuccess.value = t('teacher.review_marked')
      await publishTeacherWork([studentId])
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    }
  }

  function prefillAssignmentFromStudent(student) {
    const taskType = student?.weak_example ? 'revision' : 'new_memorisation'
    let next = applyTeacherTaskType({
      ...defaultAssignmentForm(surahs.value),
      student_id: student?.id ? String(student.id) : '',
    }, taskType)
    const weak = student?.weak_example
    if (weak?.surah_number) {
      const surahNumber = String(weak.surah_number)
      const start = Number(weak.ayah_start || weak.ayah_number) || 1
      const end = Number(weak.ayah_end || weak.ayah_number) || start
      next = {
        ...next,
        surah_number: surahNumber,
        ayah_start: start,
        ayah_end: end,
      }
    }
    assignment.value = next
  }

  function rememberRosterStudent(student) {
    if (!student?.id) return
    if (assignmentRoster.value.some((row) => String(row.id) === String(student.id))) return
    assignmentRoster.value = [...assignmentRoster.value, student]
  }

  function ensureAssignmentContext() {
    if (!assignmentRoster.value.length) loadAssignmentRoster()
    if (!assignmentRows.value.length && !assignmentsLoading.value) loadAssignments()
  }

  function openAssignRevision(student) {
    editingAssignmentId.value = null
    rememberRosterStudent(student)
    ensureAssignmentContext()
    prefillAssignmentFromStudent(student)
    formError.value = ''
    formSuccess.value = ''
    assignmentFormOpen.value = true
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

  function canonicalProfileSection(section) {
    if (section === 'recite' || section === 'recitation' || section === 'revision' || section === 'focus' || section === 'weak') return 'ai'
    if (section === 'profile' || section === 'overview' || section === 'notes' || section === 'history' || section === 'practice' || section === 'memorisation' || section === 'learning') return 'ai'
    if (profileTabIds().includes(section)) return section
    return 'ai'
  }

  function learningSubviewFor(section) {
    if (section === 'ai') return 'recite'
    if (section === 'revision') return 'revision'
    if (section === 'plan') return 'plan'
    return 'memorisation'
  }

  function resolveProfileSection(section) {
    const canonical = canonicalProfileSection(section)
    profileLearningSubview.value = learningSubviewFor(canonical)
    return canonical
  }

  function profileFetchSection(section) {
    if (section === 'revision') return 'focus'
    if (section === 'plan' || section === 'attendance' || section === 'guardians') return 'overview'
    return section
  }

  async function openStudent(id, section = 'ai', focus = null) {
    noteNavigation()
    profileFocus.value = focus && typeof focus === 'object' ? focus : null
    view.value = 'student'
    await loadProfile(id, section, true, { force: Boolean(profileFocus.value) })
  }

  async function loadProfile(id, section = 'ai', pushHistory = false, options = {}) {
    const epoch = navigationEpoch
    const requestId = ++profileRequestId
    const resolved = resolveProfileSection(section)
    const studentKey = String(id)
    const sameStudent = profile.value?.student?.id === Number(id)
    const cached = profileSectionPayloads.value[studentKey]?.[resolved]
    if (sameStudent && cached && !options.force) {
      profileSection.value = resolved
      profile.value = {
        ...profile.value,
        section: resolved,
        payload: cached,
        sectionPayloads: profileSectionPayloads.value[studentKey],
      }
      view.value = 'student'
      syncUrl(pushHistory)
      return
    }
    profileLoading.value = !sameStudent
    profileSection.value = resolved
    if (!sameStudent) {
      profileSectionPayloads.value = {}
    }
    formError.value = ''
    try {
      const nextProfile = await learningApi.getTeacherStudent(id, profileFetchSection(resolved))
      if (requestId !== profileRequestId || epoch !== navigationEpoch) return
      const payloads = {
        ...(profileSectionPayloads.value[studentKey] || {}),
        [resolved]: nextProfile.payload,
      }
      profileSectionPayloads.value = {
        ...profileSectionPayloads.value,
        [studentKey]: payloads,
      }
      profile.value = {
        ...nextProfile,
        section: resolved,
        sectionPayloads: payloads,
      }
      view.value = 'student'
      syncUrl(pushHistory)
    } catch (err) {
      if (requestId !== profileRequestId || epoch !== navigationEpoch) return
      if (!sameStudent) profile.value = null
      else {
        profileSection.value = profile.value.section
        syncUrl()
      }
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
    ensureAssignmentContext()
    editingAssignmentId.value = null
    assignment.value = defaultAssignmentForm(surahs.value)
    formError.value = ''
    formSuccess.value = ''
    assignmentFormOpen.value = true
  }

  function beginEditStudentTask(recipient) {
    const source = recipient?.assignment
    const studentId = recipient?.student_id || profile.value?.student?.id
    if (!source || !studentId) return
    editingAssignmentId.value = source.id
    assignment.value = {
      task_type: resolveTeacherTaskType(source.kind, source.hifz_category, source.activity),
      activity: source.activity || null,
      kind: source.kind,
      hifz_category: source.hifz_category || 'sabaq',
      recording_required: Boolean(source.recording_required),
      student_id: String(studentId),
      surah_number: String(source.surah_number),
      ayah_start: source.ayah_start,
      ayah_end: source.ayah_end,
      repetition_target: source.repetition_target || 1,
      due_at: source.due_at ? String(source.due_at).slice(0, 10) : '',
      priority: source.priority || 'normal',
      feedback: source.feedback || '',
      session_settings: sessionSettingsFromAssignment(source),
    }
    formError.value = ''
    formSuccess.value = ''
    rememberRosterStudent(profile.value?.student)
    ensureAssignmentContext()
    assignmentFormOpen.value = true
  }

  function forgetStudentCache(studentIds = []) {
    const ids = [...new Set((studentIds || []).map((id) => String(id)).filter((id) => Number(id) > 0))]
    if (!ids.length) return
    const next = { ...profileSectionPayloads.value }
    ids.forEach((id) => { delete next[id] })
    profileSectionPayloads.value = next
  }

  async function publishTeacherWork(studentIds = []) {
    const ids = [...new Set((studentIds || []).map((id) => Number(id)).filter((id) => id > 0))]
    forgetStudentCache(ids)
    const openId = Number(profile.value?.student?.id || 0)
    const affectsOpen = openId > 0 && (!ids.length || ids.includes(openId))
    const jobs = [loadOverview()]
    if (students.value.length || view.value === 'students') {
      jobs.push(loadStudents(Number(studentMeta.value.current_page || 1)))
    }
    if (affectsOpen && view.value === 'student') {
      jobs.push(loadProfile(openId, profileSection.value, false, { force: true }))
    }
    await Promise.all(jobs)
  }

  function studentIdsForAssignment(id) {
    const row = assignmentRows.value.find((item) => Number(item.assignment?.id || item.id) === Number(id))
    return (row?.recipients || []).map((recipient) => recipient.student_id).filter((studentId) => Number(studentId) > 0)
  }

  function studentIdForRecipient(recipientId) {
    for (const row of assignmentRows.value) {
      const match = (row.recipients || []).find((recipient) => Number(recipient.id) === Number(recipientId))
      if (Number(match?.student_id) > 0) return match.student_id
    }
    return null
  }

  function refreshStudentProfile() {
    const id = profile.value?.student?.id
    return publishTeacherWork(id ? [id] : [])
  }

  function beginEditAssignment(row) {
    const source = row?.assignment
    const recipient = row?.recipients?.[0]
    if (!row?.can_manage || !source || !recipient) return
    editingAssignmentId.value = source.id
    assignment.value = {
      task_type: resolveTeacherTaskType(source.kind, source.hifz_category, source.activity),
      activity: source.activity || null,
      kind: source.kind,
      hifz_category: source.hifz_category || 'sabaq',
      recording_required: Boolean(source.recording_required),
      student_id: String(recipient.student_id),
      surah_number: String(source.surah_number),
      ayah_start: source.ayah_start,
      ayah_end: source.ayah_end,
      repetition_target: source.repetition_target || 1,
      due_at: source.due_at ? source.due_at.slice(0, 10) : '',
      priority: source.priority || 'normal',
      feedback: source.feedback || '',
      session_settings: sessionSettingsFromAssignment(source),
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
      hifz_category: assignment.value.hifz_category || 'sabaq',
      activity: assignment.value.activity || null,
      recording_required: Boolean(assignment.value.recording_required),
      surah_number: Number(assignment.value.surah_number),
      ayah_start: Number(assignment.value.ayah_start),
      ayah_end: Number(assignment.value.ayah_end),
      repetition_target: assignment.value.repetition_target ? Number(assignment.value.repetition_target) : null,
      due_at: assignment.value.due_at || null,
      priority: assignment.value.priority || 'normal',
      feedback: assignment.value.feedback || null,
      session_settings: sanitizeTeacherAssignmentSessionSettings(assignment.value.session_settings),
    }
    const studentIds = !editingAssignmentId.value && Array.isArray(assignment.value.student_ids) && assignment.value.student_ids.length
      ? [...new Set(assignment.value.student_ids.map((id) => Number(id)).filter((id) => id > 0))]
      : [Number(assignment.value.student_id)]
    try {
      if (editingAssignmentId.value) {
        await learningApi.updateTeacherAssignment(editingAssignmentId.value, payload)
      } else {
        const failures = []
        let created = 0
        for (const studentId of studentIds) {
          const name = assignmentRoster.value.find((student) => Number(student.id) === studentId)?.name
            || students.value.find((student) => Number(student.id) === studentId)?.name
            || String(studentId)
          const duplicate = assignmentRows.value.some((row) => {
            const source = row.assignment || {}
            return source.kind === payload.kind
              && Number(source.surah_number) === payload.surah_number
              && Number(source.ayah_start) === payload.ayah_start
              && Number(source.ayah_end) === payload.ayah_end
              && (row.recipients || []).some((recipient) => Number(recipient.student_id) === studentId && recipient.status !== 'completed')
          })
          if (duplicate) {
            failures.push(t('teacher.task_bulk_skipped', { name }))
            continue
          }
          try {
            await learningApi.createTeacherAssignment({ ...payload, student_id: studentId })
            created += 1
          } catch (err) {
            failures.push(teacherErrorMessage(err, t) || t('teacher.task_bulk_failed', { name }))
          }
        }
        if (!created && failures.length) {
          formError.value = failures.join(' ')
          return
        }
        formSuccess.value = studentIds.length > 1 ? t('teacher.task_bulk_done', { n: created }) : t('teacher.assign_success')
        if (failures.length) formError.value = failures.join(' ')
      }
      const wasEditing = Boolean(editingAssignmentId.value)
      editingAssignmentId.value = null
      assignment.value = { ...defaultAssignmentForm(surahs.value), surah_number: assignment.value.surah_number }
      assignmentFormOpen.value = false
      if (wasEditing) formSuccess.value = t('teacher.task_updated')
      await loadAssignments()
      await publishTeacherWork(studentIds)
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentSaving.value = false
    }
  }

  function beginAssignStudents(ids = []) {
    const unique = [...new Set((ids || []).map((id) => String(id)).filter(Boolean))]
    if (!unique.length) return
    beginCreateAssignment()
    assignment.value = { ...assignment.value, student_id: unique[0], student_ids: unique }
  }

  async function exportStudentProgress() {
    const rows = []
    let page = 1
    let lastPage = 1
    do {
      const payload = await learningApi.getTeacherStudents({ page, per_page: 50 })
      rows.push(...(payload.data || []))
      lastPage = Number(payload.meta?.last_page || 1)
      page += 1
    } while (page <= lastPage)
    const lines = [[
      'Name',
      'Memorised ayahs',
      'Ayahs still in progress',
      'AI wording match',
      'Wording checks',
      'Overdue tasks',
      'Submissions awaiting review',
      'Last activity',
    ].join(',')]
    rows.forEach((student) => {
      const cells = [
        student.name || '',
        student.memorised_ayahs ?? 0,
        student.learning_ayahs ?? 0,
        student.ai_success_rate ?? '',
        student.ai_attempts ?? '',
        student.assignments?.overdue ?? 0,
        student.assignments?.awaiting_confirmation ?? 0,
        student.last_activity_at || '',
      ].map((value) => `"${String(value).replaceAll('"', '""')}"`)
      lines.push(cells.join(','))
    })
    const url = URL.createObjectURL(new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'mutqin-student-progress.csv'
    link.click()
    URL.revokeObjectURL(url)
  }

  async function removeAssignment(id) {
    if (assignmentSaving.value) return
    assignmentSaving.value = true
    formError.value = ''
    formSuccess.value = ''
    try {
      const studentIds = studentIdsForAssignment(id)
      await learningApi.deleteTeacherAssignment(id)
      formSuccess.value = t('teacher.task_removed')
      await loadAssignments()
      await publishTeacherWork(studentIds)
    } catch (err) {
      formError.value = teacherErrorMessage(err, t)
    } finally {
      assignmentSaving.value = false
    }
  }

  async function sendTeacherMessage(recipientId, body, recording = null) {
    const payload = await learningApi.sendTeacherAssignmentMessage(recipientId, body, recording)
    const studentId = studentIdForRecipient(recipientId)
    if (studentId) await publishTeacherWork([studentId])
    return payload?.message || null
  }

  function bootstrapFromUrl() {
    const params = new URLSearchParams(window.location.search)
    const urlView = params.get('view') || 'overview'
    view.value = TEACHER_VIEWS.includes(urlView) ? urlView : 'overview'
    profileSection.value = resolveProfileSection(params.get('section') || 'ai')
    const taskId = Number(params.get('task') || 0)
    const attemptId = Number(params.get('attempt') || 0)
    const taskFilter = params.get('task_filter') || ''
    profileFocus.value = (taskId || attemptId || taskFilter)
      ? { taskId: taskId || null, attemptId: attemptId || null, filter: taskFilter }
      : null
    const days = Number(params.get('days'))
    chartDays.value = TEACHER_CHART_DAY_OPTIONS.includes(days) ? days : 30
    filters.value = Object.fromEntries(
      Object.keys(defaultStudentFilters()).map((key) => [key, params.get(key) || '']),
    )
  }

  async function bootstrapData() {
    const epoch = navigationEpoch
    await loadOverview()
    if (epoch !== navigationEpoch) return
    if (view.value === 'students' || view.value === 'assignments') await loadStudents(1)
    if (epoch !== navigationEpoch) return
    if (view.value === 'assignments') await Promise.all([loadAssignments(), loadAssignmentRoster()])
    if (epoch !== navigationEpoch) return
    if (view.value === 'settings') await loadTeacherGroups()
    const params = new URLSearchParams(window.location.search)
    if (epoch !== navigationEpoch) return
    if (view.value === 'student' && params.get('student')) {
      await loadProfile(params.get('student'), params.get('section') || 'ai', false, { force: Boolean(profileFocus.value) })
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
    if (successTimer) clearTimeout(successTimer)
  })

  function onHistoryNavigation() {
    noteNavigation()
    profileRequestId += 1
    bootstrapFromUrl()
    bootstrapData()
  }

  return {
    t,
    TEACHER_ADMIN_NAV,
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
    overviewRefreshing,
    overviewError,
    students,
    assignmentRoster,
    studentsLoading,
    studentsLoadingMore,
    studentMeta,
    filters,
    profile,
    profileSection,
    profileLearningSubview,
    profileLoading,
    profileFocus,
    assignmentRows,
    assignmentEntryFilter,
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
    practiceTime,
    comparisons,
    loadOverview,
    setDays,
    noteNavigation,
    syncUrl,
    openView,
    openStudentsFromKpi,
    markReviewReviewed,
    queueStudentSearch,
    loadStudents,
    loadMoreStudents,
    openStudent,
    loadProfile,
    metric,
    beginCreateAssignment,
    beginAssignStudents,
    exportStudentProgress,
    beginEditAssignment,
    beginEditStudentTask,
    refreshStudentProfile,
    publishTeacherWork,
    saveAssignment,
    removeAssignment,
    sendTeacherMessage,
    loadAssignments,
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
