export function formatTeacherWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function studentInitial(name) {
  const trimmed = String(name || '').trim()
  if (!trimmed) return '?'
  return trimmed.charAt(0).toUpperCase()
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
  if (session.ayah_start && session.ayah_end) return `${name} ${session.ayah_start} to ${session.ayah_end}`
  if (session.ayah_number) return `${name} ${session.ayah_number}`
  return name
}

export function issueLabel(issues, t) {
  if (!issues || issues.wrong === null) return t('teacher.unavailable')
  return t('teacher.issues', issues)
}

export function studentStatus(student, t) {
  if (!student?.last_activity_at && !student?.sessions) {
    return { key: 'quiet', label: t('teacher.stage_new'), hint: t('teacher.stage_new_hint') }
  }
  if (student?.needs_attention) {
    return { key: 'attention', label: t('teacher.stage_help'), hint: t('teacher.stage_help_hint') }
  }
  if (typeof student?.ai_success_rate === 'number' && student.ai_success_rate >= 85) {
    return { key: 'strong', label: t('teacher.stage_strong'), hint: t('teacher.stage_strong_hint') }
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
