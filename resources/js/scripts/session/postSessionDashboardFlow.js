const DASHBOARD_REFRESH_KEY = 'mutqin.dashboard.refresh-after-session'
const SESSION_COMPLETION_RETRY_KEY = 'mutqin.session.completion-retry'
const AI_ASSESSMENT_RETRY_KEY = 'mutqin.ai-assessment.retry'

function storage() {
  if (typeof window === 'undefined') return null
  try {
    return window.sessionStorage
  } catch (_) {
    return null
  }
}

export function markDashboardRefreshAfterSession({ saveFailed = false, completedSessionId = null } = {}) {
  try {
    storage()?.setItem(DASHBOARD_REFRESH_KEY, JSON.stringify({
      at: Date.now(),
      saveFailed: !!saveFailed,
      completedSessionId: Number(completedSessionId || 0) || null,
    }))
  } catch (_) { /* navigation must still continue */ }
}

export function peekDashboardRefreshAfterSession() {
  try {
    const value = JSON.parse(storage()?.getItem(DASHBOARD_REFRESH_KEY) || 'null')
    return value && typeof value === 'object' ? value : null
  } catch (_) {
    return null
  }
}

export function consumeDashboardRefreshAfterSession() {
  const value = peekDashboardRefreshAfterSession()
  try { storage()?.removeItem(DASHBOARD_REFRESH_KEY) } catch (_) { /* ignore */ }
  return value
}

export function queueSessionCompletionRetry(payload) {
  if (!payload || typeof payload !== 'object') return
  try {
    storage()?.setItem(SESSION_COMPLETION_RETRY_KEY, JSON.stringify({
      payload,
      queuedAt: Date.now(),
    }))
  } catch (_) { /* best-effort offline retry */ }
}

export function readSessionCompletionRetry() {
  try {
    const value = JSON.parse(storage()?.getItem(SESSION_COMPLETION_RETRY_KEY) || 'null')
    return value?.payload && typeof value.payload === 'object' ? value : null
  } catch (_) {
    return null
  }
}

export function clearSessionCompletionRetry() {
  try { storage()?.removeItem(SESSION_COMPLETION_RETRY_KEY) } catch (_) { /* ignore */ }
}

export function queueAiAssessmentRetry(payload) {
  if (!payload || typeof payload !== 'object') return
  try {
    storage()?.setItem(AI_ASSESSMENT_RETRY_KEY, JSON.stringify({
      payload,
      queuedAt: Date.now(),
    }))
  } catch (_) { /* best-effort offline retry */ }
}

export function readAiAssessmentRetry() {
  try {
    const value = JSON.parse(storage()?.getItem(AI_ASSESSMENT_RETRY_KEY) || 'null')
    return value?.payload && typeof value.payload === 'object' ? value : null
  } catch (_) {
    return null
  }
}

export function clearAiAssessmentRetry() {
  try { storage()?.removeItem(AI_ASSESSMENT_RETRY_KEY) } catch (_) { /* ignore */ }
}

export function replaceWithDashboard(href = '/dashboard') {
  if (typeof window === 'undefined') return
  window.location.replace(String(href || '/dashboard'))
}

