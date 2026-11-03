import assert from 'node:assert/strict'
import {
  clearAiAssessmentRetry,
  clearSessionCompletionRetry,
  consumeDashboardRefreshAfterSession,
  markDashboardRefreshAfterSession,
  peekDashboardRefreshAfterSession,
  queueAiAssessmentRetry,
  queueSessionCompletionRetry,
  readAiAssessmentRetry,
  readSessionCompletionRetry,
  replaceWithDashboard,
} from '../../resources/js/scripts/session/postSessionDashboardFlow.js'

const values = new Map()
let replacedWith = ''
global.window = {
  sessionStorage: {
    getItem: (key) => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, String(value)),
    removeItem: (key) => values.delete(key),
  },
  location: {
    replace: (href) => { replacedWith = href },
  },
}

markDashboardRefreshAfterSession({ saveFailed: true, completedSessionId: 23 })
assert.equal(peekDashboardRefreshAfterSession()?.saveFailed, true)
assert.equal(peekDashboardRefreshAfterSession()?.completedSessionId, 23)
assert.equal(consumeDashboardRefreshAfterSession()?.saveFailed, true)
assert.equal(peekDashboardRefreshAfterSession(), null)

queueSessionCompletionRetry({ session_id: 17, range_complete: true })
assert.equal(readSessionCompletionRetry()?.payload?.session_id, 17)
clearSessionCompletionRetry()
assert.equal(readSessionCompletionRetry(), null)

queueAiAssessmentRetry({ surah_number: 1, start_ayah: 1, end_ayah: 7 })
assert.equal(readAiAssessmentRetry()?.payload?.end_ayah, 7)
clearAiAssessmentRetry()
assert.equal(readAiAssessmentRetry(), null)

replaceWithDashboard('/dashboard')
assert.equal(replacedWith, '/dashboard')

console.log('post-session-dashboard-flow.test.mjs: ok')
