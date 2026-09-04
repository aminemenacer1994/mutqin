import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BACKEND_SESSION_STATUS,
  END_SESSION_CONFIRM_ACTION,
  PRACTICE_SESSION_PERSISTENCE,
  PRIMARY_SESSION_ACTION,
  SESSION_STATUS,
  buildSessionLifecycleViewModel,
  isBackendSessionUnfinished,
  isResumableSessionPayload,
  reconcileBootstrapSessionState,
  resolveEndSessionConfirmDecision,
  resolveExitRangeComplete,
  resolvePracticeSessionPersistence,
  resolveSessionExitTransition,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const t = (key) => key

// Persistence labels are distinct — no overloaded boolean
{
  assert.equal(PRACTICE_SESSION_PERSISTENCE.NONE, 'none')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.ACTIVE, 'active')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.PAUSED, 'paused')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.UNFINISHED, 'unfinished')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.COMPLETED, 'completed')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.SAVED_FOR_LATER, 'saved_for_later')
  assert.equal(PRACTICE_SESSION_PERSISTENCE.ENDED_EARLY, 'ended_early')
}

// Active sitting
{
  assert.equal(resolvePracticeSessionPersistence({
    mutqinSessionActive: true,
  }), PRACTICE_SESSION_PERSISTENCE.ACTIVE)
}

// Soft pause / save-for-later
{
  assert.equal(resolvePracticeSessionPersistence({
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
  }), PRACTICE_SESSION_PERSISTENCE.PAUSED)
}

// Interrupted unfinished (resumable, not actively paused locally)
{
  assert.equal(resolvePracticeSessionPersistence({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.INTERRUPTED,
    hasValidatedContinuePayload: true,
  }), PRACTICE_SESSION_PERSISTENCE.UNFINISHED)
}

// Genuine completion
{
  assert.equal(resolvePracticeSessionPersistence({
    sessionCompleted: true,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
  }), PRACTICE_SESSION_PERSISTENCE.COMPLETED)
}

// Terminal ended_early (discard / API end) is not unfinished
{
  assert.equal(resolvePracticeSessionPersistence({
    backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
  }), PRACTICE_SESSION_PERSISTENCE.ENDED_EARLY)
  assert.equal(isBackendSessionUnfinished({ status: 'ended_early' }), false)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 2 },
  }, { backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY }), false)
}

// Named saved sittings are distinct from Resume unfinished state
{
  assert.equal(resolvePracticeSessionPersistence({
    hasNamedSavedSession: true,
  }), PRACTICE_SESSION_PERSISTENCE.SAVED_FOR_LATER)
}

// No active session
{
  assert.equal(resolvePracticeSessionPersistence({}), PRACTICE_SESSION_PERSISTENCE.NONE)
}

// --- State transitions ---

// Soft early exit → paused + unfinished + resumable
{
  const soft = resolveSessionExitTransition({ rangeComplete: false })
  assert.equal(soft.kind, 'save_for_later')
  assert.equal(soft.persistence, PRACTICE_SESSION_PERSISTENCE.PAUSED)
  assert.equal(soft.backendStatus, BACKEND_SESSION_STATUS.PAUSED)
  assert.equal(soft.unfinished, true)
  assert.equal(soft.resumable, true)
  assert.equal(soft.clearContinue, false)
  assert.equal(soft.pauseSession, true)
  assert.equal(soft.completeSession, false)

  const decision = resolveEndSessionConfirmDecision(END_SESSION_CONFIRM_ACTION.END_SESSION, {
    rangeComplete: false,
  })
  assert.equal(decision.endEarly, true)
  assert.equal(decision.saveForLater, false)
  assert.equal(decision.completeSession, false)

  const endedEarly = resolveSessionExitTransition({ endEarly: true })
  assert.equal(endedEarly.kind, 'end_early')
  assert.equal(endedEarly.resumable, false)
  assert.equal(endedEarly.clearContinue, true)

  const afterSoftExit = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    backendAuthoritative: true,
    localContinuePayload: {
      config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
      queueIndex: 1,
      currentPosition: 2,
    },
    mutqinSessionActive: false,
  })
  assert.equal(afterSoftExit.resumable, true)
  assert.equal(afterSoftExit.sessionPaused, false)
  assert.equal(afterSoftExit.sessionCompleted, false)
  assert.ok(afterSoftExit.continuePayload?.config?.chapterId)
  assert.equal(afterSoftExit.status, SESSION_STATUS.INTERRUPTED_RESUMABLE)

  const softExitVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: false,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(softExitVm.status, SESSION_STATUS.INTERRUPTED_RESUMABLE)
  assert.equal(softExitVm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(softExitVm.presentation.showEndCompanion, false)

  const livePausedVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(livePausedVm.status, SESSION_STATUS.PAUSED)
  assert.equal(livePausedVm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(livePausedVm.presentation.showEndCompanion, true)

  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(vm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
}

// Genuine complete → completed, not resumable
{
  const done = resolveSessionExitTransition({ rangeComplete: true })
  assert.equal(done.kind, 'complete')
  assert.equal(done.persistence, PRACTICE_SESSION_PERSISTENCE.COMPLETED)
  assert.equal(done.unfinished, false)
  assert.equal(done.resumable, false)
  assert.equal(done.clearContinue, true)
  assert.equal(done.completeSession, true)

  const afterComplete = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 1 } },
    sessionCompleted: true,
    mutqinSessionActive: true,
  })
  assert.equal(afterComplete.resumable, false)
  assert.equal(afterComplete.sessionCompleted, true)
  assert.equal(afterComplete.continuePayload, null)
  assert.equal(afterComplete.status, SESSION_STATUS.COMPLETED)

  const vm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionCompleted: true,
    backendUnfinished: false,
    t,
  })
  assert.notEqual(vm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
}

// Explicit discard → clear resumable
{
  const discard = resolveSessionExitTransition({ discard: true })
  assert.equal(discard.kind, 'discard')
  assert.equal(discard.unfinished, false)
  assert.equal(discard.resumable, false)
  assert.equal(discard.clearContinue, true)
  assert.equal(discard.backendStatus, BACKEND_SESSION_STATUS.ENDED_EARLY)

  const afterDiscard = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 5 } },
  })
  assert.equal(afterDiscard.resumable, false)
  assert.equal(afterDiscard.continuePayload, null)
}

// Refresh after soft exit keeps Resume (backend unfinished wins)
{
  const refreshed = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    backendAuthoritative: true,
    localContinuePayload: {
      config: { chapterId: 36, rangeStart: 1, rangeEnd: 10 },
      currentPosition: 4,
    },
    centralSessionStatus: 'paused',
    sessionCompleted: false,
    mutqinSessionActive: false,
  })
  assert.equal(refreshed.resumable, true)
  assert.equal(refreshed.sessionPaused, false)
  assert.equal(refreshed.status, SESSION_STATUS.INTERRUPTED_RESUMABLE)
  assert.equal(Number(refreshed.continuePayload?.config?.chapterId), 36)
}

// Stale ended_early must never advertise Resume after refresh
{
  const stale = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
    backendAuthoritative: true,
    localContinuePayload: { config: { chapterId: 2 } },
    mutqinSessionActive: true,
  })
  assert.equal(stale.resumable, false)
  assert.equal(stale.mutqinSessionActive, false)
  assert.equal(stale.continuePayload, null)
}

// Memorisation wiring: return-later copy only on soft-exit path that preserves resume
{
  const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
  assert.match(source, /saveSessionForLaterFromExitModal/)
  assert.match(
    source,
    /pauseSessionFromPrimaryAction\(\{\s*quiet:\s*true,\s*reason:\s*'save_for_later'/,
  )
  assert.match(
    source,
    /const endStatus = rangeComplete \? 'completed' : 'ended_early'/,
  )
  assert.match(source, /demoteSoftExitedSitting/)
  assert.match(
    source,
    /saveSessionForLaterFromExitModal[\s\S]{0,2500}?demoteSoftExitedSitting\(/,
  )
  // Soft exit must not clear continue on the early path
  assert.doesNotMatch(
    source,
    /saveSessionForLaterFromExitModal[\s\S]{0,800}clearContinueSessionQuietly/,
  )
  // End session must open even when verses have not hydrated yet
  assert.match(
    source,
    /openSessionExitModal\(\) \{[\s\S]*?canOpenWithoutWorkspace[\s\S]*?showHeaderEndSessionAction/,
  )
  assert.doesNotMatch(
    source,
    /openSessionExitModal\(\) \{\s*if \(!this\.hasVerses && !this\.playerVisible\) return/,
    'End session must not silent-return solely for missing verses',
  )
  // Already-paused backend 422 must still count as soft-exit success
  assert.match(
    source,
    /reason === 'save_for_later' \|\| options\.reason === 'park_set'[\s\S]*?return true/,
  )
  assert.doesNotMatch(
    source,
    /reason === 'save_for_later' \|\| options\.reason === 'park_set'[\s\S]{0,400}?return false/,
    'save_for_later/park_set 422 must not make End session a silent no-op',
  )
  // Explicit discard clears backend unfinished
  assert.match(
    source,
    /clearContinueSession\(\) \{[\s\S]*?resolveSessionExitTransition\(\{\s*discard:\s*true/,
  )
  assert.match(
    source,
    /clearContinueSession\(\) \{[\s\S]*?learningApi\.endSession\(/,
  )
  assert.match(source, /resolveExitRangeComplete\(/)
  assert.doesNotMatch(
    source,
    /completedAll = coveredAyah >= totalAyahs && progressPercent >= 100/,
    'position-based completedAll must not decide exit',
  )
}

// Position / progressPercent must never mean range-complete for exit
{
  // 1-ayah sitting mid-practice looks like 100% by position — still soft-exit.
  assert.equal(resolveExitRangeComplete({
    mutqinSessionActive: true,
    sessionCompleted: false,
  }), false)

  assert.equal(resolveExitRangeComplete({
    sessionPaused: true,
    sessionCompleted: false,
  }), false)

  // Genuine completion after queue finished.
  assert.equal(resolveExitRangeComplete({
    sessionCompleted: true,
    mutqinSessionActive: false,
    sessionPaused: false,
    centralStatus: 'completed',
  }), true)

  // Stale completed flag while still live must soft-exit.
  assert.equal(resolveExitRangeComplete({
    sessionCompleted: true,
    mutqinSessionActive: true,
  }), false)

  // End on a live sitting (including 1-ayah "100%") is terminal, not Resume.
  const early = resolveEndSessionConfirmDecision(END_SESSION_CONFIRM_ACTION.END_SESSION, {
    rangeComplete: resolveExitRangeComplete({ mutqinSessionActive: true }),
  })
  assert.equal(early.endEarly, true)
  assert.equal(early.saveForLater, false)
  assert.equal(early.completeSession, false)
}

console.log('session-persistence-state.test.mjs: all assertions passed')
