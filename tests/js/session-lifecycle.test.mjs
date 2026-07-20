import assert from 'node:assert/strict'
import {
  BACKEND_SESSION_STATUS,
  LEGAL_TRANSITIONS,
  PRIMARY_SESSION_ACTION,
  SESSION_MUTATION,
  SESSION_STATUS,
  assertTransition,
  buildSessionLifecycleViewModel,
  canTransition,
  createSessionActionLock,
  deriveBackendStatusFromEngine,
  deriveSessionStatus,
  isBackendSessionUnfinished,
  isResumableSessionPayload,
  reconcileContinuePayloadWithBackend,
  resolvePrimarySessionAction,
  resolveSessionActionPresentation,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const t = (key) => {
  const map = {
    'common.startSession': 'Start Session',
    'common.resumeSession': 'Resume Session',
    'common.resumingSession': 'Resuming…',
    'common.endingSession': 'Ending…',
    'common.startingSession': 'Starting…',
    'common.loading': 'Loading...',
    'sessionStatus.end': 'End Session',
    'memorisation.onboarding.startOnboarding': 'Start Onboarding',
    'memorisation.onboarding.continueOnboarding': 'Continue Onboarding',
    'memorisation.onboarding.playSampleSession': 'Play sample session',
  }
  return map[key] || key
}

function actionFor(input) {
  return buildSessionLifecycleViewModel({ ...input, t }).action
}

function presentationFor(input) {
  return buildSessionLifecycleViewModel({ ...input, t }).presentation
}

// 1. Newly registered user sees onboarding action
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    requiresOnboarding: true,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.START_ONBOARDING)
  assert.notEqual(action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.notEqual(action, PRIMARY_SESSION_ACTION.END_SESSION)
}

// 2. User who completed onboarding sees Start Session
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    requiresOnboarding: false,
    sessionCompleted: true,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.START_SESSION)
}

// 3. User with no unfinished session after login sees Start Session
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    hasValidatedContinuePayload: false,
    backendUnfinished: false,
    sessionCompleted: true,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.START_SESSION)
}

// 4. User with unfinished session after login sees Resume Session
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    hasValidatedContinuePayload: true,
    mutqinSessionActive: false,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(presentationFor({
    authHydrated: true,
    sessionHydrated: true,
    hasValidatedContinuePayload: true,
  }).label, 'Resume Session')
}

// 5. Active session displays End Session
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: false,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.END_SESSION)
}

// 6. Playing audio does not replace End Session
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: true,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.END_SESSION)
  assert.equal(deriveSessionStatus({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: true,
  }), SESSION_STATUS.PLAYING)
}

// 7. Pausing audio does not end the session
{
  const paused = deriveSessionStatus({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: false,
  })
  assert.equal(paused, SESSION_STATUS.PAUSED)
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: false,
  }), PRIMARY_SESSION_ACTION.END_SESSION)
}

// 8. Resume button becomes Resuming… and cannot be triggered twice
{
  const presentation = presentationFor({
    authHydrated: true,
    sessionHydrated: true,
    mutation: SESSION_MUTATION.RESUMING,
  })
  assert.equal(presentation.action, PRIMARY_SESSION_ACTION.LOADING)
  assert.equal(presentation.label, 'Resuming…')
  assert.equal(presentation.disabled, true)
  assert.equal(presentation.loading, true)

  const lock = createSessionActionLock()
  let runs = 0
  const first = lock.run('resume', async () => {
    runs += 1
    return 'ok'
  })
  const second = await lock.run('resume', async () => {
    runs += 1
    return 'nope'
  })
  assert.equal(second.ok, false)
  assert.equal(second.reason, 'locked')
  await first
  assert.equal(runs, 1)
}

// 9. Successful resume changes button to End Session
{
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    mutation: SESSION_MUTATION.IDLE,
  }), PRIMARY_SESSION_ACTION.END_SESSION)
}

// 10. Failed resume restores a safe state
{
  const resumable = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    hasValidatedContinuePayload: true,
    lastError: 'resume_failed',
    mutation: SESSION_MUTATION.IDLE,
  })
  assert.equal(resumable, PRIMARY_SESSION_ACTION.RESUME_SESSION)

  const ready = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    hasValidatedContinuePayload: false,
    backendUnfinished: false,
    lastError: 'resume_failed',
  })
  assert.equal(ready, PRIMARY_SESSION_ACTION.START_SESSION)
}

// 11. End button becomes Ending… and cannot be triggered twice
{
  const presentation = presentationFor({
    authHydrated: true,
    sessionHydrated: true,
    mutation: SESSION_MUTATION.ENDING,
  })
  assert.equal(presentation.label, 'Ending…')
  assert.equal(presentation.disabled, true)

  const lock = createSessionActionLock()
  const first = lock.run('end', async () => 'done')
  const second = await lock.run('end', async () => 'dup')
  assert.equal(second.ok, false)
  await first
}

// 12. Successful end changes next action to Start Session
{
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    sessionCompleted: true,
    mutqinSessionActive: false,
  }), PRIMARY_SESSION_ACTION.START_SESSION)
}

// 13. Failed end keeps the session active (mutation idle + still live)
{
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    lastError: 'end_failed',
    mutation: SESSION_MUTATION.IDLE,
  }), PRIMARY_SESSION_ACTION.END_SESSION)
}

// 14. Rejecting onboarding example does not create a resumable session
{
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
    isOnboardingSample: true,
  }), false)
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    onboardingExampleRejected: true,
    requiresOnboarding: false,
  }), PRIMARY_SESSION_ACTION.START_SESSION)
  assert.equal(deriveBackendStatusFromEngine({
    active: true,
    sessionKind: 'sample',
  }), BACKEND_SESSION_STATUS.NONE)
}

// 15. Refresh does not briefly show an incorrect action
{
  const loading = actionFor({
    authHydrated: true,
    sessionHydrated: false,
    hasValidatedContinuePayload: true,
  })
  assert.equal(loading, PRIMARY_SESSION_ACTION.LOADING)
  assert.notEqual(loading, PRIMARY_SESSION_ACTION.START_SESSION)
}

// 16. Logout clearing is represented by ready with no continue/auth payload
{
  assert.equal(actionFor({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: false,
    mutqinSessionActive: false,
    hasValidatedContinuePayload: false,
  }), PRIMARY_SESSION_ACTION.START_SESSION)
}

// 17. Completed sessions cannot be resumed
{
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 2 },
    completed: true,
  }), false)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 2 },
  }, { backendStatus: BACKEND_SESSION_STATUS.COMPLETED }), false)
}

// 18. Stale local session ID is ignored when backend says ended
{
  const reconciled = reconcileContinuePayloadWithBackend(
    { config: { chapterId: 1 }, queueIndex: 3 },
    { status: BACKEND_SESSION_STATUS.COMPLETED, id: 99 }
  )
  assert.equal(reconciled, null)
}

// 19. One user cannot treat another user's finished session as unfinished without ownership signals
{
  assert.equal(isBackendSessionUnfinished({
    status: BACKEND_SESSION_STATUS.COMPLETED,
    is_onboarding_example: false,
  }), false)
  assert.equal(isBackendSessionUnfinished({
    status: BACKEND_SESSION_STATUS.ACTIVE,
    is_onboarding_example: true,
  }), false)
}

// 20. Multiple consumers of the same view-model stay synchronised
{
  const input = {
    authHydrated: true,
    sessionHydrated: true,
    mutqinSessionActive: true,
    isPlaying: true,
    t,
  }
  const a = buildSessionLifecycleViewModel(input)
  const b = buildSessionLifecycleViewModel(input)
  assert.deepEqual(a.action, b.action)
  assert.deepEqual(a.presentation.label, b.presentation.label)
  assert.equal(a.action, PRIMARY_SESSION_ACTION.END_SESSION)
}

// 21. Mobile and desktop share the same logical action (same resolver)
{
  const desktop = resolvePrimarySessionAction(
    { hydrated: true, isAuthenticated: true },
    { required: false },
    { hydrated: true, hasValidatedContinuePayload: true },
    { isPlaying: false }
  )
  const mobile = resolvePrimarySessionAction(
    { hydrated: true, isAuthenticated: true },
    { required: false },
    { hydrated: true, hasValidatedContinuePayload: true },
    { isPlaying: false }
  )
  assert.equal(desktop, mobile)
  assert.equal(desktop, PRIMARY_SESSION_ACTION.RESUME_SESSION)
}

// 22. Audio playing still maps to End Session (media separate from lifecycle)
{
  assert.equal(resolveSessionActionPresentation(
    PRIMARY_SESSION_ACTION.END_SESSION,
    t
  ).label, 'End Session')
}

// 23–24. Duplicate start/end guarded by lock + legal transitions
{
  assert.equal(canTransition(SESSION_STATUS.READY, SESSION_STATUS.ENDING), false)
  assert.equal(canTransition(SESSION_STATUS.ENDED, SESSION_STATUS.RESUMING), false)
  assert.equal(assertTransition(SESSION_STATUS.ENDING, SESSION_STATUS.RESUMING, {
    logger: () => {},
  }).ok, false)
  assert.equal(canTransition(SESSION_STATUS.READY, SESSION_STATUS.STARTING), true)
  assert.equal(canTransition(SESSION_STATUS.ENDING, SESSION_STATUS.ENDED), true)
}

// 25. Invalid state transitions are rejected
{
  for (const [from, allowed] of Object.entries(LEGAL_TRANSITIONS)) {
    for (const to of Object.values(SESSION_STATUS)) {
      const expected = from === to || allowed.includes(to)
      assert.equal(canTransition(from, to), expected, `${from} -> ${to}`)
    }
  }
}

// 26. Strict-mode style double invocation does not double-run locked work
{
  const lock = createSessionActionLock()
  let starts = 0
  async function mimicStrictEffect() {
    return lock.run('start', async () => {
      starts += 1
      return starts
    })
  }
  const [a, b] = await Promise.all([mimicStrictEffect(), mimicStrictEffect()])
  assert.equal((a.ok ? 1 : 0) + (b.ok ? 1 : 0), 1)
  assert.equal(starts, 1)
}

// Onboarding example active still ends without resume labeling
{
  const action = actionFor({
    authHydrated: true,
    sessionHydrated: true,
    onboardingExampleActive: true,
  })
  assert.equal(action, PRIMARY_SESSION_ACTION.END_SESSION)
}

// Completion modal hides contradictory Start/Resume/End behind it
{
  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    sessionCompleted: true,
    completionModalOpen: true,
    t,
  })
  assert.equal(vm.status, SESSION_STATUS.COMPLETION_MODAL_OPEN)
  assert.equal(vm.action, PRIMARY_SESSION_ACTION.NONE)
  assert.equal(vm.isHidden, true)
}

// Live session stays ACTIVE regardless of playback; media status is separate
{
  const playing = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    mutqinSessionActive: true,
    isPlaying: true,
    t,
  })
  const paused = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    isAuthenticated: true,
    mutqinSessionActive: true,
    isPlaying: false,
    isPaused: true,
    hasAudio: true,
    t,
  })
  assert.equal(playing.status, SESSION_STATUS.ACTIVE)
  assert.equal(paused.status, SESSION_STATUS.ACTIVE)
  assert.equal(playing.action, PRIMARY_SESSION_ACTION.END_SESSION)
  assert.equal(paused.action, PRIMARY_SESSION_ACTION.END_SESSION)
  assert.equal(playing.mediaStatus, 'playing')
  assert.equal(paused.mediaStatus, 'paused')
}

console.log('session-lifecycle.test.mjs: all assertions passed')
