import { activityName, formatWhen, passageLabel } from './dashboard.js'
import { groupHomeworkRows, homeworkGroupKey } from './homeworkGroups.js'

export function homeworkGroupCounts(rows = []) {
  const counts = { overdue: 0, active: 0, waiting: 0, done: 0 }
  for (const row of rows) {
    const key = homeworkGroupKey(row)
    if (counts[key] !== undefined) counts[key] += 1
  }
  return counts
}

export function homeworkStatusChartBars(t, rows = []) {
  const counts = homeworkGroupCounts(rows)
  const defs = [
    { key: 'overdue', label: t('parent.homework_group_overdue'), tone: 'warn' },
    { key: 'active', label: t('parent.homework_group_active'), tone: 'neutral' },
    { key: 'waiting', label: t('parent.homework_group_waiting'), tone: 'neutral' },
    { key: 'done', label: t('parent.homework_group_done'), tone: 'ok' },
  ]
  return defs
    .map((row) => ({
      ...row,
      value: counts[row.key] || 0,
      display: String(counts[row.key] || 0),
    }))
    .filter((row) => row.value > 0)
}

export function homeworkActivityChartBars(t, rows = []) {
  const tally = new Map()
  for (const row of rows) {
    const activity = row?.assignment?.activity || 'other'
    tally.set(activity, (tally.get(activity) || 0) + 1)
  }
  return [...tally.entries()]
    .map(([activity, value]) => ({
      key: activity,
      label: activityName(t, activity) || activity,
      value,
      display: String(value),
      tone: activity === 'hifz' ? 'ok' : 'neutral',
    }))
    .sort((a, b) => b.value - a.value)
}

export function homeworkSummaryCards(t, rows = []) {
  const counts = homeworkGroupCounts(rows)
  return [
    {
      key: 'overdue',
      icon: 'bi bi-exclamation-circle',
      label: t('parent.homework_group_overdue'),
      value: counts.overdue,
      tone: 'warn',
    },
    {
      key: 'active',
      icon: 'bi bi-pencil',
      label: t('parent.homework_group_active'),
      value: counts.active,
      tone: 'neutral',
    },
    {
      key: 'waiting',
      icon: 'bi bi-hourglass',
      label: t('parent.homework_group_waiting'),
      value: counts.waiting,
      tone: 'neutral',
    },
    {
      key: 'done',
      icon: 'bi bi-check-circle',
      label: t('parent.homework_group_done'),
      value: counts.done,
      tone: 'ok',
    },
  ]
}

export function homeworkBreakdownGroups(rows = []) {
  return groupHomeworkRows(rows)
}

export function homeworkDetailFields(t, item) {
  if (!item) return []
  const assignment = item.assignment || {}
  const fields = [
    { key: 'passage', label: t('parent.homework_field_passage'), value: passageLabel(assignment) },
    { key: 'activity', label: t('parent.filter_category'), value: activityName(t, assignment.activity) },
    {
      key: 'due',
      label: t('parent.modal_due'),
      value: assignment.due_at ? formatWhen(assignment.due_at) : t('parent.not_yet'),
    },
    { key: 'teacher', label: t('parent.modal_teacher'), value: item.teacher_name || '—' },
  ]
  if (assignment.hifz_category) {
    const catKey = `teacher.hifz_${assignment.hifz_category}`
    const cat = t(catKey)
    fields.push({
      key: 'hifz',
      label: t('parent.homework_field_hifz_stage'),
      value: cat && cat !== catKey ? cat : assignment.hifz_category,
    })
  }
  if (item.review_state) {
    const stateKey = `parent.homework_review_${item.review_state}`
    const stateLabel = t(stateKey)
    fields.push({
      key: 'review',
      label: t('parent.homework_field_review'),
      value: stateLabel && stateLabel !== stateKey ? stateLabel : item.review_state,
    })
  }
  return fields.filter((row) => row.value && row.value !== '—')
}

export function homeHomeworkStatusBars(t, homework = []) {
  if (!homework.length) return []
  const overdue = homework.filter((row) => row.overdue).length
  const dueSoon = homework.filter((row) => row.due_soon && !row.overdue).length
  const onTrack = Math.max(0, homework.length - overdue - dueSoon)
  return [
    { key: 'overdue', label: t('parent.homework_group_overdue'), value: overdue, display: String(overdue), tone: 'warn' },
    { key: 'soon', label: t('parent.homework_due_soon'), value: dueSoon, display: String(dueSoon), tone: 'neutral' },
    { key: 'open', label: t('parent.reports_chart_open'), value: onTrack, display: String(onTrack), tone: 'ok' },
  ].filter((row) => row.value > 0)
}