export function formatTeacherWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

export function practiceMinutes(seconds) {
  if (seconds === null || seconds === undefined) return null
  return Math.ceil(Math.max(0, Number(seconds) || 0) / 60)
}

/** Scored AI wording checks are the only completions for a recitation-check assignment. */
export function assignmentCountsScoredChecks(assignment) {
  return assignment?.kind === 'ai_recite'
}

export function assignmentRequirementLabel(assignment, t) {
  return t(assignmentCountsScoredChecks(assignment)
    ? 'teacher.required_ai_wording_checks'
    : 'teacher.repetitions')
}

export function assignmentProgressLabel(item, t) {
  const progress = item?.progress
  const target = Math.max(1, Number(progress?.target || 1))
  const raw = Math.max(0, Number(progress?.activity_count ?? progress?.completed ?? 0))
  const completed = Math.min(target, raw)

  if (assignmentCountsScoredChecks(item?.assignment)) {
    return t(
      completed === 1 ? 'teacher.assignment_progress_attempt_one' : 'teacher.assignment_progress_attempt_other',
      { count: completed, target },
    )
  }

  return t('teacher.assignment_progress_repetitions', { completed, target })
}

/** Explains the counter the teacher and student already share. */
export function assignmentAttemptHelp(item, t) {
  if (!item?.assignment?.kind) return t('teacher.attempt_help')
  if (assignmentCountsScoredChecks(item.assignment)) return t('teacher.attempt_help_wording')
  return t('teacher.attempt_help_practice')
}

export function assignmentCountLabel(assignment, count, t) {
  const n = Math.max(0, Number(count) || 0)
  if (assignmentCountsScoredChecks(assignment)) {
    return t(n === 1 ? 'teacher.assignment_count_checks_one' : 'teacher.assignment_count_checks_other', { n })
  }
  return t(n === 1 ? 'teacher.assignment_count_attempts_one' : 'teacher.assignment_count_attempts_other', { n })
}

export function studentInitial(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
}

export function ayahRangeLabel(name, from, to, t) {
  const surah = name || t('teacher.unavailable')
  if (!from || !to) return surah
  if (Number(from) === Number(to)) return `${surah} · ${t('teacher.ayah_n', { n: from })}`
  return `${surah} · ${t('teacher.ayahs_range', { from, to })}`
}

export function groupAyahFindings(items, t) {
  const groups = new Map()
  for (const item of items || []) {
    const key = `${item.surah_number}:${item.ayah_number}`
    if (!groups.has(key)) groups.set(key, { key, title: ayahRangeLabel(item.surah_name, item.ayah_number, item.ayah_number, t), findings: [], seen: new Set(), first: item, maxChecks: 0 })
    const group = groups.get(key)
    const findingKey = `${item.spot_type || 'unknown'}:${item.word_index ?? 'ayah'}`
    if (group.seen.has(findingKey)) continue
    group.seen.add(findingKey)
    group.maxChecks = Math.max(group.maxChecks, Number(item.affected_attempt_count || 0))
    const place = item.word_index === null || item.word_index === undefined
      ? t('teacher.ayah_n', { n: item.ayah_number })
      : t('teacher.word_n', { n: Number(item.word_index) + 1 })
    const checks = t(item.affected_attempt_count === 1 ? 'teacher.weak_spot_hint_one' : 'teacher.weak_spot_hint', { n: item.affected_attempt_count })
    group.findings.push(`${place}: ${checks}`)
  }
  return [...groups.values()]
}

export function cssThemeColor(name, fallback) {
  if (typeof window === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

export function groupLabel(student, t) {
  return student.groups?.length ? student.groups.map((group) => group.name).join(', ') : t('teacher.no_group')
}

export function weakLabel(student, t) {
  if (!student.weak_count) return t('teacher.none')
  const example = student.weak_example
  const where = example ? `${example.surah_name} ${example.ayah_number}` : ''
  return `${student.weak_count}${where ? ` · ${where}` : ''}`
}

export function revisionLabel(student, t) {
  if (student.revision_overdue) return t('teacher.overdue_n', { n: student.revision_overdue })
  if (student.revision_upcoming) return t('teacher.upcoming_n', { n: student.revision_upcoming })
  return t('teacher.none')
}

export function assignmentLabel(counts = {}, t) {
  const parts = []
  if (counts.overdue) parts.push(t('teacher.overdue_n', { n: counts.overdue }))
  if (counts.pending) parts.push(t('teacher.pending_n', { n: counts.pending }))
  if (counts.in_progress) parts.push(t('teacher.progress_n', { n: counts.in_progress }))
  if (counts.completed) parts.push(t('teacher.completed_n', { n: counts.completed }))
  return parts.length ? parts.join(' · ') : t('teacher.none')
}

export function sessionLabel(session, t) {
  const name = session.surah_name || t('teacher.surah_n', { n: session.surah_number || t('teacher.unavailable') })
  if (session.ayah_start && session.ayah_end) return `${name} ${session.ayah_start}–${session.ayah_end}`
  if (session.ayah_number) return `${name} ${session.ayah_number}`
  return name
}

export function issueLabel(issues, t) {
  if (!issues || issues.wrong === null) return t('teacher.unavailable')
  return [
    ['wrong', 'teacher.issue_missed'],
    ['skipped', 'teacher.issue_skipped'],
    ['extra', 'teacher.issue_extra'],
    ['repeated', 'teacher.issue_repeated'],
  ].filter(([key]) => Number(issues[key]) > 0)
    .map(([key, label]) => {
      const count = Number(issues[key])
      if (key === 'wrong') return t(count === 1 ? 'teacher.issue_word_missed_one' : 'teacher.issue_word_missed', { n: count })
      return `${count} ${t(label)}`
    })
    .join(' · ')
}

export function learnerRecitationReviewRow(row) {
  const assignment = row?.assignment || {}
  const evidence = row?.evidence || {}
  const assigned = evidence.assigned_range || {
    surah: assignment.surah_number,
    from: assignment.ayah_start,
    to: assignment.ayah_end,
    surah_name: assignment.surah_name,
  }
  const range = evidence?.range?.surah
    ? evidence.range
    : {
      surah: assignment.surah_number,
      from: assignment.ayah_start,
      to: assignment.ayah_end,
    }
  const title = assignment.surah_name
    ? `${assignment.surah_name} · ${assignment.ayah_start}–${assignment.ayah_end}`
    : ''
  return teacherRecitationEvidenceRow({
    title,
    transcript: evidence.transcript || '',
    audio: evidence.audio,
    evidenceState: evidence.state,
  }, {
    audio: evidence.audio,
    transcript: evidence.transcript,
    words: evidence.words,
    range,
    assigned_range: assigned,
    state: evidence.state,
  })
}

export function teacherRecitationEvidenceRow(base = {}, evidence = null, rangeFallback = null) {
  const ev = evidence && typeof evidence === 'object' ? evidence : {}
  const range = ev.range || rangeFallback || {}
  const assigned = ev.assigned_range ?? base.assignedRange ?? null
  return {
    ...base,
    attemptId: base.attemptId ?? ev.attempt_id ?? null,
    studentId: base.studentId ?? null,
    audio: ev.audio ?? base.audio ?? null,
    transcript: ev.transcript ?? base.transcript ?? '',
    words: ev.words ?? base.words ?? [],
    assignedRange: assigned,
    practicedRange: base.practicedRange ?? null,
    range: {
      surah: range.surah ?? range.surah_number ?? null,
      from: range.from ?? null,
      to: range.to ?? null,
    },
    evidenceState: ev.state ?? base.evidenceState,
    transcriptState: ev.transcript_state ?? base.transcriptState,
  }
}

export function attentionReasonTags(student, t) {
  const tags = []
  if (student?.repeated_absence) {
    tags.push({ key: 'attendance', tone: 'danger', icon: 'bi bi-calendar-x', label: t('teacher.reason_repeated_absence') })
  }
  const overdueTasks = Number(student?.assignments?.overdue || 0)
  if (overdueTasks > 0) {
    tags.push({
      key: 'tasks',
      tone: 'danger',
      icon: 'bi bi-clock',
      label: t(overdueTasks === 1 ? 'teacher.needs_help_overdue_task_one' : 'teacher.needs_help_overdue_task_other', { n: overdueTasks }),
      help: t('teacher.needs_help_overdue_task_help'),
    })
  }
  const overdueReviews = Number(student?.revision_overdue || 0)
  const pendingReviews = Number(student?.assignments?.awaiting_confirmation || 0)
  if (pendingReviews > 0) {
    tags.push({ key: 'pending-review', tone: 'warn', icon: 'bi bi-clipboard-check', label: `${t('teacher.status_awaiting_confirmation')} · ${pendingReviews}` })
  }
  if (overdueReviews > 0) {
    tags.push({
      key: 'revision',
      tone: 'warn',
      icon: 'bi bi-arrow-repeat',
      label: t(overdueReviews === 1 ? 'teacher.needs_help_review_due_one' : 'teacher.needs_help_review_due_other', { n: overdueReviews }),
      help: t('teacher.needs_help_review_due_help'),
    })
  }
  if (typeof student?.ai_success_rate === 'number' && student.ai_success_rate < 65) {
    tags.push({
      key: 'score',
      tone: 'danger',
      icon: 'bi bi-mic',
      label: t('teacher.needs_help_low_recitation', { n: student.ai_success_rate }),
      help: t('teacher.needs_help_low_recitation_help'),
    })
  }
  const weakAyahs = Number(student?.recurring_weak || 0)
  if (weakAyahs > 0) {
    tags.push({
      key: 'weak',
      tone: 'warn',
      icon: 'bi bi-exclamation-triangle',
      label: t(weakAyahs === 1 ? 'teacher.needs_help_hard_ayah_one' : 'teacher.needs_help_hard_ayah_other', { n: weakAyahs }),
      help: t('teacher.needs_help_hard_ayah_help'),
    })
  }
  if (student?.active_7 === false || (!student?.active_7 && !student?.last_activity_at)) {
    tags.push({ key: 'inactive', tone: 'quiet', icon: 'bi bi-moon', label: t('teacher.reason_inactive') })
  }
  if (!tags.length && student?.needs_attention) {
    tags.push({ key: 'help', tone: 'warn', icon: 'bi bi-hand-index', label: t('teacher.need_look') })
  }
  return tags
}

/**
 * Shared overview counts.
 * reviews: task submissions awaiting the teacher.
 * recitations: scored checks that still need this teacher. Matches the Reviews badge.
 * reviewedRecitations: checks this teacher has already heard.
 * recitationHistory: earlier AI checks that are not waiting for this teacher.
 * reviewsDueToday: scheduled revision whose date is today.
 * legacyRecitations: earlier AI-only checks kept on record and left out of the queue.
 */
export function teacherReviewLists(overview = {}) {
  const queue = overview?.review_queue || {}
  return {
    awaiting: Array.isArray(queue.actionable) ? queue.actionable : [],
    reviewed: Array.isArray(queue.reviewed) ? queue.reviewed : [],
    history: Array.isArray(queue.history) ? queue.history : [],
  }
}

export function teacherReviewView(overview = {}, filter = 'awaiting') {
  const lists = teacherReviewLists(overview)
  if (filter === 'reviewed' || filter === 'history') return lists[filter]
  return lists.awaiting
}

export function teacherDeskCounts(overview = {}) {
  const assignments = overview?.assignments || {}
  const kpis = overview?.kpis || {}
  const snapshot = overview?.snapshot || {}
  const lists = teacherReviewLists(overview)
  const hasActionable = Array.isArray(overview?.review_queue?.actionable)
  const hasReviewed = Array.isArray(overview?.review_queue?.reviewed)
  const hasHistory = Array.isArray(overview?.review_queue?.history)
  return {
    reviews: Number(assignments.awaiting_confirmation ?? snapshot.submissions_awaiting_review ?? 0),
    recitations: hasActionable ? lists.awaiting.length : Number(snapshot.recitations_awaiting_review || 0),
    reviewedRecitations: hasReviewed ? lists.reviewed.length : Number(snapshot.reviewed_recitations || 0),
    recitationHistory: hasHistory ? lists.history.length : Number(snapshot.recitation_history || 0),
    reviewsDueToday: Number(snapshot.reviews_due_today || 0),
    legacyRecitations: Number(snapshot.legacy_ai_only_unreviewed || 0),
    overdue: Number(snapshot.overdue_tasks ?? kpis.overdue_assignments ?? assignments.overdue ?? 0),
    plans: Number(kpis.open_recommendations || 0),
    unread: Number(snapshot.unread_messages || 0),
    attendanceUnmarked: Number(snapshot.attendance_unmarked_today || 0),
  }
}

/**
 * Up to five urgent records, in this order:
 * recitations awaiting this teacher, overdue assignments, revision decisions, then other students.
 * A student already queued is not added again.
 */
export function teacherActionQueue(overview = {}, students = []) {
  const items = []
  const seenStudents = new Set()
  const push = (item) => {
    if (items.length >= 5) return
    const studentId = Number(item.studentId || 0)
    const recordId = Number(item.recordId || 0)
    if (items.some((row) => row.kind === item.kind && row.studentId === studentId && row.recordId === recordId)) return
    items.push({ ...item, studentId, recordId })
    if (studentId > 0) seenStudents.add(studentId)
  }

  for (const row of overview?.review_queue?.actionable || []) {
    push({
      kind: 'recitation',
      studentId: row.student_id,
      recordId: row.id,
      name: row.student_name || '',
      detail: [row.surah_name, row.ayah_start && row.ayah_end ? `${row.ayah_start}–${row.ayah_end}` : ''].filter(Boolean).join(' · '),
    })
  }
  const overdue = [...(overview?.outstanding_revision || [])]
    .filter((row) => row?.overdue)
    .sort((a, b) => String(a.due_at || '9999').localeCompare(String(b.due_at || '9999')))
  for (const row of overdue) {
    push({
      kind: 'overdue',
      studentId: row.student_id,
      recordId: row.recipient_id,
      name: row.student_name || '',
      detail: row.label || '',
    })
  }
  const decisions = [...(overview?.revision_decisions || [])].sort((a, b) => {
    const rank = (row) => (row?.status === 'accepted' ? 0 : 1)
    return rank(a) - rank(b)
  })
  for (const row of decisions) {
    push({
      kind: 'decision',
      studentId: row.student_id,
      recordId: row.id,
      name: row.student_name || '',
      detail: row.label || '',
      status: row.status || 'pending',
    })
  }
  for (const student of students) {
    if (!student?.id || seenStudents.has(Number(student.id))) continue
    push({
      kind: 'attention',
      studentId: student.id,
      recordId: student.id,
      name: student.name || '',
      detail: '',
    })
  }

  return items
}

export function assignmentPassageKey(item) {
  const assignment = item?.assignment || {}
  return [
    item?.studentId || '',
    assignment.surah_number || '',
    assignment.ayah_start || '',
    assignment.ayah_end || '',
    assignment.kind || '',
  ].join(':')
}

export function attentionReasons(student, t) {
  return attentionReasonTags(student, t).map((tag) => tag.label)
}

/** Lower rank is more urgent. Overdue stays a date signal and does not outrank a waiting review. */
export function teacherAttentionRank(student) {
  const pending = Number(student?.assignments?.awaiting_confirmation || 0)
  const overdue = Number(student?.assignments?.overdue || 0)
  const revision = Number(student?.revision_overdue || 0)
  const weak = Number(student?.recurring_weak || 0)
  const low = typeof student?.ai_success_rate === 'number' && student.ai_success_rate < 65 && Number(student?.ai_attempts || 0) >= 2
  if (pending > 0) return 0
  if (overdue > 0) return 1
  if (revision > 0) return 2
  if (weak > 0) return 3
  if (low) return 4
  if (student?.repeated_absence || student?.active_7 === false) return 5
  return 6
}

/** One real next step. Focus ids come from the dashboard payload when the server has them. */
export function teacherAttentionAction(student, t) {
  const pending = Number(student?.assignments?.awaiting_confirmation || 0)
  const overdue = Number(student?.assignments?.overdue || 0)
  const revision = Number(student?.revision_overdue || 0)
  const weak = Number(student?.recurring_weak || 0)
  const low = typeof student?.ai_success_rate === 'number' && student.ai_success_rate < 65 && Number(student?.ai_attempts || 0) >= 2
  if (pending > 0 && student?.attention_awaiting_attempt_id) {
    return {
      id: 'review_recitation',
      label: t('teacher.overview_action_review'),
      section: 'ai',
      focus: { attemptId: student.attention_awaiting_attempt_id },
    }
  }
  if (pending > 0) {
    return {
      id: 'review_submission',
      label: t('teacher.task_review_submission'),
      section: 'tasks',
      focus: student.attention_awaiting_recipient_id
        ? { taskId: student.attention_awaiting_recipient_id }
        : { filter: 'needs_review' },
    }
  }
  if (overdue > 0) {
    return {
      id: 'overdue',
      label: t('teacher.overview_action_overdue'),
      section: 'tasks',
      focus: student.attention_overdue_recipient_id
        ? { taskId: student.attention_overdue_recipient_id }
        : { filter: 'overdue' },
    }
  }
  if (revision > 0) {
    return {
      id: 'revision',
      label: t('teacher.overview_action_revision'),
      section: 'plan',
      focus: null,
    }
  }
  if (weak > 0) {
    return { id: 'assign', label: t('teacher.assign_revision'), assign: true }
  }
  if (low) {
    return { id: 'progress', label: t('teacher.overview_action_progress'), section: 'ai', focus: null }
  }
  if (student?.repeated_absence || student?.active_7 === false || !student?.last_activity_at) {
    return { id: 'message', label: t('teacher.message_student'), section: 'messages', focus: null }
  }
  return { id: 'progress', label: t('teacher.overview_action_progress'), section: 'ai', focus: null }
}

export function scoreBadgeTone(score) {
  if (typeof score !== 'number') return 'muted'
  if (score >= 85) return 'good'
  if (score >= 65) return 'mid'
  return 'warn'
}

export function stageMeta(stageKey) {
  const map = {
    quiet: { icon: 'bi bi-seedling', tone: 'quiet' },
    attention: { icon: 'bi bi-exclamation-circle', tone: 'warn' },
    strong: { icon: 'bi bi-star', tone: 'good' },
    practising: { icon: 'bi bi-play-circle', tone: 'accent' },
  }
  return map[stageKey] || map.practising
}

export function studentStatus(student, t) {
  const recommendation = student?.recommendation
  if (recommendation?.type === 'focus' || recommendation?.type === 'needs_help') {
    return { key: 'attention', label: t('teacher.stage_help'), hint: recommendation.reason }
  }
  if (recommendation?.type === 'ready_next') {
    return { key: 'strong', label: t('teacher.ready_next_passage'), hint: recommendation.reason }
  }
  if (!student?.last_activity_at && !student?.sessions) {
    return { key: 'quiet', label: t('teacher.stage_new'), hint: t('teacher.stage_new_hint') }
  }
  if (student?.needs_attention) {
    return { key: 'attention', label: t('teacher.stage_help'), hint: t('teacher.stage_help_hint') }
  }
  return { key: 'practising', label: t('teacher.stage_practising'), hint: t('teacher.stage_practising_hint') }
}

export const STUDENT_PERFORMANCE_ORDER = ['attention', 'practising', 'strong', 'quiet']

export function groupStudentsByPerformance(students, t) {
  const buckets = {
    attention: [],
    practising: [],
    strong: [],
    quiet: [],
  }
  for (const student of students || []) {
    const key = studentStatus(student, t).key
    if (buckets[key]) buckets[key].push(student)
    else buckets.practising.push(student)
  }
  return STUDENT_PERFORMANCE_ORDER
    .map((key) => ({
      key,
      title: t(`teacher.group_${key}`),
      students: buckets[key],
    }))
    .filter((group) => group.students.length > 0)
}

export function isTeacherNavActive(view, id) {
  if (id === 'students') return view === 'students' || view === 'student'
  return view === id
}
