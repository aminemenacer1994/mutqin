/**
 * Regression coverage for Practice + Saved Sessions lifecycle:
 * start, save, exit, resume, refresh, complete, duplicate click,
 * failed save/end, invalid session.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BACKEND_SESSION_STATUS,
  PRIMARY_SESSION_ACTION,
  SESSION_MUTATION,
  SESSION_STATUS,
  buildSessionLifecycleViewModel,
  createSessionActionLock,
  isBackendSessionUnfinished,
  isResumableSessionPayload,
  reconcileBootstrapSessionState,
  resolveCompletionGate,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const t = (key) => key
const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const apiSource = readFileSync(new URL('../../resources/js/scripts/api/learning.js', import.meta.url), 'utf8')

// 1. Start — unique attempt keys + backend id capture
{
  assert.match(source, /buildStartIdempotencyKey\s*\(/)
  assert.match(source, /applyBackendStartResult\s*\(/)
  assert.match(source, /start-reuse-\$\{unfinishedId\}/)
  assert.match(source, /sessionState\.backendSessionId\s*=\s*session\.id/)
  assert.match(source, /await startPromise/)
}

// 2. Save — upsert by backendSessionId, persist + sync, recoverable failure
{
  assert.match(source, /findSavedSessionDuplicateIndex\s*\(/)
  assert.match(source, /backendSessionId/)
  assert.match(source, /persistSavedSessions\s*\(\)/)
  assert.match(source, /scheduleLearningSync\s*\(\)/)
  assert.match(source, /replaceOldestWhenFull/)
  assert.match(source, /_pendingPostEndSaveRecord/)
  assert.match(source, /sessionSaveFailed|Could not save this session/)
  assert.match(source, /pushLearningState\(true\)/)
}

// 3. Exit / pause — distinct paused state, no arbitrary pause timeout mask
{
  assert.match(source, /applyLocalPausedSessionState\s*\(/)
  assert.doesNotMatch(source, /pause_timeout/)
  assert.doesNotMatch(source, /reject\(new Error\('pause_timeout'\)\)/)
  const pausedVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(pausedVm.status, SESSION_STATUS.PAUSED)
  assert.equal(pausedVm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
}

// 4. Resume — dashboard ?session= preferred id + session_id on API
{
  assert.match(source, /preferredSessionId/)
  assert.match(source, /validateSessionLifecycleAgainstBackend\(\{\s*preferredSessionId/)
  assert.match(source, /session_id:\s*sessionId/)
  assert.match(apiSource, /query\.id\s*=\s*id/)
  assert.equal(isBackendSessionUnfinished({ status: 'paused', id: 12 }), true)
  assert.equal(isBackendSessionUnfinished({ status: 'completed', id: 12 }), false)
}

// 5. Refresh — bootstrap demotes live → resumable; completed stays completed
{
  const refreshedLive = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.ACTIVE,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 }, queueIndex: 2 },
    mutqinSessionActive: true,
  })
  assert.equal(refreshedLive.mutqinSessionActive, false)
  assert.equal(refreshedLive.resumable, true)
  assert.equal(refreshedLive.sessionCompleted, false)

  const refreshedDone = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 112 } },
    sessionCompleted: true,
    mutqinSessionActive: true,
  })
  assert.equal(refreshedDone.resumable, false)
  assert.equal(refreshedDone.sessionCompleted, true)
  assert.equal(refreshedDone.continuePayload, null)
}

// 6. Complete — success opens completion; failure stays recoverable
{
  const ok = resolveCompletionGate({ persistenceSucceeded: true })
  assert.equal(ok.openCompletionScreen, true)
  assert.equal(ok.showPostCompletionActions, true)

  const failed = resolveCompletionGate({
    persistenceSucceeded: false,
    priorStatus: SESSION_STATUS.ACTIVE,
  })
  assert.equal(failed.keepRecoverable, true)
  assert.equal(failed.openCompletionScreen, false)
  assert.match(source, /persistenceSucceeded\s*=\s*!this\.learningBackendEnabled/)
  assert.match(source, /persistenceSucceeded\s*=\s*false/)
  assert.match(source, /toasts\.sessionEndFailed/)
}

// 7. Duplicate click — action lock rejects concurrent start/pause/end
{
  const lock = createSessionActionLock()
  let runs = 0
  const first = lock.run('start', async () => {
    runs += 1
    return 'started'
  })
  const second = await lock.run('start', async () => {
    runs += 1
    return 'dup'
  })
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'locked')
  await first
  assert.equal(runs, 1)

  const loading = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    mutation: SESSION_MUTATION.STARTING,
    t,
  })
  assert.equal(loading.presentation.disabled, true)
}

// 8. Failed save — save helpers surface recoverable banners
{
  assert.match(source, /saveCurrentSessionSilentlyAsync/)
  assert.match(source, /sessionSaveSyncFailed|Sync will retry/)
  assert.match(source, /Could not save this session\. Try again\./)
}

// 9. Invalid session — load/resume fail safely
{
  assert.match(source, /invalidRequested/)
  assert.match(source, /sessionResumeUnavailable/)
  assert.match(source, /That saved session is no longer available/)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
  }, { backendStatus: BACKEND_SESSION_STATUS.COMPLETED }), false)
  assert.equal(isResumableSessionPayload(null), false)
}

// Completed bookmarks must not look like active resumable rows
{
  assert.equal(isBackendSessionUnfinished({
    status: BACKEND_SESSION_STATUS.ENDED_EARLY,
  }), false)
  assert.match(source, /isSavedSessionComplete\s*\(/)
  assert.match(source, /ended_early === true\) return false/)
}

console.log('practice-saved-sessions-flow.test.mjs: ok')
