import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BACKEND_SESSION_STATUS,
  END_SESSION_CONFIRM_ACTION,
  PRIMARY_SESSION_ACTION,
  SESSION_MUTATION,
  SESSION_STATUS,
  buildRepetitionProgressSummary,
  buildSessionLifecycleViewModel,
  createSessionActionLock,
  isResumableSessionPayload,
  reconcileBootstrapSessionState,
  resolveCompletionGate,
  resolveEndSessionConfirmDecision,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const t = (key, params = {}) => {
  const map = {
    'common.pauseSession': 'Pause Session',
    'common.resumeSession': 'Resume Session',
    'common.pausingSession': 'Pausing…',
    'common.endingSession': 'Ending…',
    'memorisation.sessionExit.repetitionsProgress': `${params.completed} of ${params.total} repetitions completed`,
    'memorisation.sessionExit.repetitionsProgressOne': `${params.completed} of ${params.total} repetition completed`,
    'memorisation.sessionExit.repetitionsProgressOther': `${params.completed} of ${params.total} repetitions completed`,
    'sessionStatus.end': 'End Session',
  }
  return map[key] || key
}

// Keep practising closes modal only — no session mutation
{
  const decision = resolveEndSessionConfirmDecision(END_SESSION_CONFIRM_ACTION.KEEP_PRACTISING)
  assert.equal(decision.closeModal, true)
  assert.equal(decision.mutateSession, false)
  assert.equal(decision.completeSession, false)
}

// Pause action while active
{
  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    t,
  })
  assert.equal(vm.status, SESSION_STATUS.ACTIVE)
  assert.equal(vm.action, PRIMARY_SESSION_ACTION.PAUSE_SESSION)
  assert.equal(vm.presentation.label, 'Pause Session')
  assert.equal(vm.presentation.showEndCompanion, true)
  assert.equal(vm.canPause, true)
}

// Resume action while paused (not completed)
{
  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(vm.status, SESSION_STATUS.PAUSED)
  assert.equal(vm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(vm.presentation.label, 'Resume Session')
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
  }, { backendStatus: BACKEND_SESSION_STATUS.PAUSED }), true)
}

// Successful completion opens completion screen and unlocks post actions
{
  const gate = resolveCompletionGate({ persistenceSucceeded: true })
  assert.equal(gate.openCompletionScreen, true)
  assert.equal(gate.keepRecoverable, false)
  assert.equal(gate.status, SESSION_STATUS.COMPLETED)
  assert.equal(gate.showPostCompletionActions, true)

  const endDecision = resolveEndSessionConfirmDecision(END_SESSION_CONFIRM_ACTION.END_SESSION)
  assert.equal(endDecision.completeSession, true)
  assert.equal(endDecision.mutateSession, true)
}

// Failed completion keeps session recoverable and hides completion CTAs
{
  const gate = resolveCompletionGate({ persistenceSucceeded: false })
  assert.equal(gate.openCompletionScreen, false)
  assert.equal(gate.keepRecoverable, true)
  assert.equal(gate.status, SESSION_STATUS.ACTIVE)
  assert.equal(gate.showPostCompletionActions, false)

  const pausedGate = resolveCompletionGate({
    persistenceSucceeded: false,
    priorStatus: SESSION_STATUS.PAUSED,
  })
  assert.equal(pausedGate.status, SESSION_STATUS.PAUSED)
  assert.equal(pausedGate.keepRecoverable, true)
}

// Duplicate end clicks are locked
{
  const lock = createSessionActionLock()
  let runs = 0
  const first = lock.run('end', async () => {
    runs += 1
    return 'done'
  })
  const second = await lock.run('end', async () => {
    runs += 1
    return 'dup'
  })
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'locked')
  await first
  assert.equal(runs, 1)

  const completing = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    mutation: SESSION_MUTATION.ENDING,
    t,
  })
  assert.equal(completing.status, SESSION_STATUS.COMPLETING)
  assert.equal(completing.presentation.disabled, true)
}

// Refresh after completion must not reopen as active/resumable
{
  const refreshed = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 2 }, queueIndex: 3 },
    centralSessionStatus: 'completed',
    sessionCompleted: true,
    mutqinSessionActive: true,
    activeSnapshot: { config: { chapterId: 2 } },
  })
  assert.equal(refreshed.mutqinSessionActive, false)
  assert.equal(refreshed.sessionCompleted, true)
  assert.equal(refreshed.resumable, false)
  assert.equal(refreshed.continuePayload, null)
  assert.equal(refreshed.activeSnapshot, null)
  assert.equal(refreshed.status, SESSION_STATUS.COMPLETED)
}

// Stale local completed must not hide Continue when backend still has unfinished/paused work
{
  const paused = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 1 }, queueIndex: 2 },
    centralSessionStatus: 'completed',
    sessionCompleted: true,
    mutqinSessionActive: false,
  })
  assert.equal(paused.resumable, true)
  assert.equal(paused.sessionCompleted, false)
  assert.equal(paused.sessionPaused, true)
  assert.equal(paused.status, SESSION_STATUS.PAUSED)
  assert.ok(paused.continuePayload?.config?.chapterId)
}

// Authoritative empty unfinished clears stale resume after completion
{
  const cleared = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 1 } },
    mutqinSessionActive: true,
    activeSnapshot: { config: { chapterId: 1 } },
  })
  assert.equal(cleared.resumable, false)
  assert.equal(cleared.mutqinSessionActive, false)
  assert.equal(cleared.continuePayload, null)
}

// Completed sessions are never resumable
{
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 4 },
    completed: true,
  }), false)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 4 },
  }, { backendStatus: BACKEND_SESSION_STATUS.COMPLETED }), false)

  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionCompleted: true,
    hasValidatedContinuePayload: false,
    backendUnfinished: false,
    t,
  })
  assert.equal(vm.status, SESSION_STATUS.COMPLETED)
  assert.notEqual(vm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
}

// Concise progress indicator copy
{
  assert.equal(
    buildRepetitionProgressSummary({ completed: 3, total: 5 }, t),
    '3 of 5 repetitions completed'
  )
  assert.equal(
    buildRepetitionProgressSummary({ completed: 0, total: 1 }, t),
    '0 of 1 repetition completed'
  )
}

// Pausing audio still leaves lifecycle ACTIVE with Pause primary (media separate)
{
  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: false,
    isPaused: true,
    hasAudio: true,
    t,
  })
  assert.equal(vm.status, SESSION_STATUS.ACTIVE)
  assert.equal(vm.action, PRIMARY_SESSION_ACTION.PAUSE_SESSION)
  assert.equal(vm.mediaStatus, 'paused')
}

// Explicit practice states used by End / Pause / Resume
{
  assert.equal(SESSION_STATUS.ACTIVE, 'active')
  assert.equal(SESSION_STATUS.PAUSED, 'paused')
  assert.equal(SESSION_STATUS.COMPLETING, 'completing')
  assert.equal(SESSION_STATUS.COMPLETED, 'completed')
}

// End Session confirm copy keys remain exact product strings
{
  const en = JSON.parse(readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8'))
  assert.equal(en.memorisation.sessionExit.confirmTitle, 'End this session?')
  assert.equal(
    en.memorisation.sessionExit.confirmDescription,
    'Your progress will be saved and this session will be marked as complete.'
  )
  assert.equal(en.memorisation.sessionExit.keepPractising, 'Keep practising')
  assert.equal(en.memorisation.sessionExit.confirmEnd, 'End session')
}

console.log('session-exit-flow.test.mjs: all assertions passed')
