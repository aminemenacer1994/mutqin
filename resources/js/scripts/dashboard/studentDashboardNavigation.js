export const STUDENT_DASHBOARD_PANES = Object.freeze(['home', 'learning', 'progress', 'activity'])

const PANE_SET = new Set(STUDENT_DASHBOARD_PANES)
const CONTEXT_HASH_PANES = Object.freeze({
  '#ai-recite-results': 'progress',
  '#achievements': 'activity',
})

export function normalizeStudentDashboardPane(value, fallback = 'home') {
  const pane = String(value || '').trim().toLowerCase()
  if (pane === 'my-learning' || pane === 'my_learning') return 'learning'
  return PANE_SET.has(pane) ? pane : (PANE_SET.has(fallback) ? fallback : 'home')
}

export function studentDashboardPaneFromLocation(locationLike, fallback = 'home') {
  if (!locationLike) return normalizeStudentDashboardPane(fallback)
  const params = new URLSearchParams(String(locationLike.search || '').replace(/^\?/, ''))
  const queryPane = params.get('tab')
  if (queryPane) return normalizeStudentDashboardPane(queryPane, fallback)
  const hashPane = CONTEXT_HASH_PANES[String(locationLike.hash || '').toLowerCase()]
  return normalizeStudentDashboardPane(hashPane, fallback)
}

export function studentDashboardUrlForPane(locationLike, pane, { clearContextHash = false } = {}) {
  const base = locationLike?.href || 'http://localhost/progress'
  const url = new URL(base, 'http://localhost')
  url.searchParams.set('tab', normalizeStudentDashboardPane(pane))
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
