import { buildSessionVoiceHref } from '../sessionVoice/href.js'
import { studentDashboardUrlForPane } from '../dashboard/studentDashboardNavigation.js'

/**
 * Apply a Mr. Mutqin server response using shell-specific bridges.
 */
export function executeMrMutqinResponse(result, bridge = {}) {
  if (!result?.ok) {
    return { applied: false, reason: result?.reason || 'error' }
  }

  const mode = String(result.response_mode || '')
  let navigated = false

  if (result.tool_config && bridge.onWorkspaceControl) {
    bridge.onWorkspaceControl(result.tool_config)
  }

  const navigation = result.navigation
  if (navigation && mode !== 'ANSWER_ONLY' && mode !== 'EXECUTE_ACTION') {
    navigated = applyNavigation(navigation, bridge)
  }

  return {
    applied: true,
    navigated,
    speak: result.spoken || null,
    mode,
  }
}

function applyNavigation(navigation, bridge) {
  const shell = String(navigation.shell || '')
  if (shell === 'memorisation') {
    const base = bridge.memorisationUrl || '/memorisation'
    const href = navigation.href
      || (navigation.query ? buildHrefFromQuery(base, navigation.query) : buildSessionVoiceHref(base, {}))
    if (bridge.onDismiss) bridge.onDismiss()
    window.location.assign(href)
    return true
  }

  if (shell === 'teacher' && bridge.openTeacherView) {
    if (navigation.view === 'student' && navigation.student_id) {
      bridge.openTeacherStudent?.(navigation.student_id, navigation.section || 'ai')
    } else if (navigation.view) {
      if (navigation.filter && bridge.openTeacherAssignments) {
        bridge.openTeacherAssignments(navigation.filter)
      } else {
        bridge.openTeacherView(navigation.view)
      }
    }
    if (bridge.onDismiss) bridge.onDismiss()
    return true
  }

  if (shell === 'student' && bridge.openStudentPane) {
    const pane = navigation.view || 'home'
    const href = studentDashboardUrlForPane(window.location, pane)
    if (bridge.onDismiss) bridge.onDismiss()
    if (bridge.useHistory !== false) {
      window.history.pushState({ studentDashboardPane: pane }, '', href)
      bridge.openStudentPane(pane)
    } else {
      window.location.assign(href)
    }
    return true
  }

  return false
}

function buildHrefFromQuery(base, query) {
  const params = new URLSearchParams()
  Object.entries(query || {}).forEach(([key, value]) => {
    if (value !== null && value !== undefined && value !== '') {
      params.set(key, String(value))
    }
  })
  const next = params.toString()
  return `${base}${next ? `?${next}` : ''}`
}