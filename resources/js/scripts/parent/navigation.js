export const PARENT_PRIMARY_VIEWS = Object.freeze([
  'overview',
  'children',
  'learning',
  'progress',
  'reports',
  'messages',
  'settings',
])

export const PARENT_DETAIL_VIEWS = Object.freeze(['child', 'child-messages', 'more'])

export const PARENT_MORE_VIEWS = PARENT_DETAIL_VIEWS

export const PARENT_VIEWS = Object.freeze([...PARENT_PRIMARY_VIEWS, ...PARENT_DETAIL_VIEWS])

export const PARENT_CHILD_STORAGE_KEY = 'mutqin_parent_active_child'

export const PARENT_NAV = [
  { id: 'overview', label: 'parent.nav_home', icon: 'bi bi-house' },
  { id: 'children', label: 'parent.nav_children', shortLabel: 'parent.nav_children_short', icon: 'bi bi-people' },
  { id: 'learning', label: 'parent.nav_learning', shortLabel: 'parent.nav_learning_short', icon: 'bi bi-journal-check' },
  { id: 'progress', label: 'parent.nav_progress', icon: 'bi bi-graph-up-arrow' },
  { id: 'reports', label: 'parent.nav_reports', shortLabel: 'parent.nav_reports_short', icon: 'bi bi-calendar2-heart', mobile: false },
  { id: 'messages', label: 'parent.nav_messages', icon: 'bi bi-chat-heart' },
  { id: 'settings', label: 'parent.nav_settings', icon: 'bi bi-gear' },
]

export function parentNavActiveView(view) {
  const id = String(view || '').trim()
  if (id === 'child' || id === 'child-messages') return 'children'
  if (id === 'more') return 'children'
  return PARENT_PRIMARY_VIEWS.includes(id) ? id : 'overview'
}

export function normalizeParentView(value, fallback = 'overview') {
  const view = String(value || '').trim()
  if (view === 'more') return 'children'
  return PARENT_VIEWS.includes(view) ? view : fallback
}

/** @param {string} view */
export function parentChildSelectorAllowsAll(view) {
  return ['overview', 'messages', 'learning', 'children', 'reports', 'progress'].includes(view)
}