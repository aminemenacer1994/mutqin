export const STUDENT_DASHBOARD_PANES = Object.freeze(['home', 'learning', 'practice', 'progress', 'activity', 'messages', 'settings'])

const PANE_SET = new Set(STUDENT_DASHBOARD_PANES)
const CONTEXT_HASH_PANES = Object.freeze({
  '#ai-recite-results': 'progress',
  '#achievements': 'progress',
})

export function studentNavItems({ learning = false, messaging = false } = {}) {
  const items = [
    { id: 'home', label: 'dashboard.jump_home', icon: 'bi bi-house' },
  ]
  if (learning) {
    items.push({ id: 'learning', label: 'dashboard.jump_learning', mobileLabel: 'dashboard.jump_learning_mobile', icon: 'bi bi-journal-check' })
  }
  items.push(
    { id: 'practice', label: 'dashboard.jump_practice', mobileLabel: 'dashboard.jump_practice_mobile', icon: 'bi bi-play-circle' },
    { id: 'progress', label: 'dashboard.jump_progress', icon: 'bi bi-graph-up' },
    { id: 'activity', label: 'dashboard.jump_activity', icon: 'bi bi-clock-history' },
  )
  if (messaging) {
    items.push({ id: 'messages', label: 'dashboard.jump_messages', mobileLabel: 'dashboard.jump_messages_mobile', icon: 'bi bi-chat-left-text' })
  }
  return items
}

export function normalizeStudentDashboardPane(value, fallback = 'home') {
  const pane = String(value || '').trim().toLowerCase()
  if (pane === 'my-learning' || pane === 'my_learning') return 'learning'
  if (pane === 'practice') return 'practice'
  return PANE_SET.has(pane) ? pane : (PANE_SET.has(fallback) ? fallback : 'home')
}

export function studentDashboardPaneFromLocation(locationLike, fallback = 'home') {
  if (!locationLike) return normalizeStudentDashboardPane(fallback)
  if (String(locationLike.hash || '').toLowerCase() === '#achievements') return 'progress'
  const params = new URLSearchParams(String(locationLike.search || '').replace(/^\?/, ''))
  const queryPane = params.get('tab')
  if (queryPane) return normalizeStudentDashboardPane(queryPane, fallback)
  const hashPane = CONTEXT_HASH_PANES[String(locationLike.hash || '').toLowerCase()]
  return normalizeStudentDashboardPane(hashPane, fallback)
}

export function progressWindowFromSearch(search) {
  const params = new URLSearchParams(String(search || '').replace(/^\?/, ''))
  const raw = String(params.get('window') || '').trim().toLowerCase()
  if (raw === 'week') return 'week'
  if (raw === 'month') return 'month'
  return null
}

export function studentDashboardUrlForPane(locationLike, pane, { clearContextHash = false, progressWindow = null } = {}) {
  const base = locationLike?.href || 'http://localhost/progress'
  const url = new URL(base, 'http://localhost')
  const normalized = normalizeStudentDashboardPane(pane)
  url.searchParams.set('tab', normalized)
  if (normalized === 'progress' && (progressWindow === 'week' || progressWindow === 'month')) {
    url.searchParams.set('window', progressWindow)
  } else {
    url.searchParams.delete('window')
  }
  if (clearContextHash && CONTEXT_HASH_PANES[url.hash.toLowerCase()]) url.hash = ''
  return `${url.pathname}${url.search}${url.hash}`
}

export function studentDashboardReturnHref(base, pane) {
  const url = new URL(String(base || '/dashboard'), 'http://localhost')
  url.searchParams.set('tab', normalizeStudentDashboardPane(pane))
  return `${url.pathname}${url.search}${url.hash}`
}

export function studentDashboardHistoryState(currentState, pane, scrollY = 0) {
  return {
    ...(currentState && typeof currentState === 'object' ? currentState : {}),
    studentDashboardPane: normalizeStudentDashboardPane(pane),
    studentDashboardScrollY: Math.max(0, Number(scrollY) || 0),
  }
}

export function studentDashboardPaneFromHistory(eventState, locationLike, fallback = 'home') {
  const statePane = eventState?.studentDashboardPane
  return statePane
    ? normalizeStudentDashboardPane(statePane, fallback)
    : studentDashboardPaneFromLocation(locationLike, fallback)
}

export function isStudentDashboardContextHash(hash) {
  return Boolean(CONTEXT_HASH_PANES[String(hash || '').toLowerCase()])
}
