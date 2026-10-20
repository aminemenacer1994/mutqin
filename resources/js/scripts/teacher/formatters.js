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
  const name = session.surah_name || t('teacher.surah_n', { n: session.surah_number || '—' })
  if (session.ayah_start && session.ayah_end) return `${name} ${session.ayah_start}–${session.ayah_end}`
  if (session.ayah_number) return `${name} ${session.ayah_number}`
  return name
}

export function issueLabel(issues, t) {
  if (!issues || issues.wrong === null) return t('teacher.unavailable')
  return t('teacher.issues', issues)
}

export function isTeacherNavActive(view, id) {
  if (id === 'students') return view === 'students' || view === 'student'
  return view === id
}
