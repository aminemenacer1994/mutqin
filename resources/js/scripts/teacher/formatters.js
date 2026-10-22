export function formatTeacherWhen(value) {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
}

export function assignmentProgressLabel(item, t) {
  const progress = item?.progress
  const target = Math.max(1, Number(progress?.target || 1))
  const completed = Math.min(target, Math.max(0, Number(progress?.completed || 0)))

  if (item?.assignment?.kind === 'ai_recite') {
    const attempts = Math.max(completed, Number(progress?.attempt_count ?? progress?.activity_count ?? 0))
    return t(
      attempts === 1 ? 'teacher.assignment_progress_attempt_one' : 'teacher.assignment_progress_attempt_other',
      { count: attempts, target },
    )
  }

  return t('teacher.assignment_progress_repetitions', { completed, target })
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
    if (!groups.has(key)) groups.set(key, { key, title: ayahRangeLabel(item.surah_name, item.ayah_number, item.ayah_number, t), findings: [], seen: new Set(), first: item })
    const group = groups.get(key)
    const findingKey = `${item.spot_type || 'unknown'}:${item.word_index ?? 'ayah'}`
    if (group.seen.has(findingKey)) continue
    group.seen.add(findingKey)
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
  if (counts.awaiting_confirmation) parts.push(t('teacher.awaiting_confirmation_n', { n: counts.awaiting_confirmation }))
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

export function attentionReasonTags(student, t) {
  const tags = []
  if ((student?.assignments?.overdue || 0) > 0) {
    tags.push({ key: 'tasks', tone: 'danger', icon: 'bi bi-clock', label: t('teacher.kpi_overdue_tasks') })
  }
  if ((student?.revision_overdue || 0) > 0) {
    tags.push({ key: 'revision', tone: 'warn', icon: 'bi bi-arrow-repeat', label: t('teacher.overdue_revisions') })
  }
  if (typeof student?.ai_success_rate === 'number' && student.ai_success_rate < 65) {
    tags.push({ key: 'score', tone: 'danger', icon: 'bi bi-mic', label: t('teacher.reason_low_score') })
  }
  if ((student?.recurring_weak || student?.weak_count || 0) > 0) {
    tags.push({ key: 'weak', tone: 'warn', icon: 'bi bi-exclamation-triangle', label: t('teacher.reason_hard_ayahs') })
  }
  if (student?.active_7 === false || (!student?.active_7 && !student?.last_activity_at)) {
    tags.push({ key: 'inactive', tone: 'quiet', icon: 'bi bi-moon', label: t('teacher.reason_inactive') })
  }
  if (!tags.length && student?.needs_attention) {
    tags.push({ key: 'help', tone: 'warn', icon: 'bi bi-hand-index', label: t('teacher.need_look') })
  }
  return tags.slice(0, 3)
}

export function attentionReasons(student, t) {
  return attentionReasonTags(student, t).map((tag) => tag.label)
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
