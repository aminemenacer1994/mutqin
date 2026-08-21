/**
 * Parked / completed set lifecycle — Back to mushaf, return later, resume, discard.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BACKEND_SESSION_STATUS,
  PRACTICE_SESSION_PERSISTENCE,
  PRACTICE_SET_STATE,
  PRIMARY_SESSION_ACTION,
  SESSION_STATUS,
  buildSessionLifecycleViewModel,
  isResumableSessionPayload,
  reconcileBootstrapSessionState,
  resolveBackToMushafTransition,
  resolvePracticeSessionPersistence,
  resolvePracticeSetState,
  resolveSessionExitTransition,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')
const en = JSON.parse(readFileSync(new URL('../../resources/js/locales/en.json', import.meta.url), 'utf8'))

const t = (key) => {
  const map = {
    'common.startSession': 'Start Session',
    'common.resumeSession': 'Resume Session',
    'common.pauseSession': 'Pause Session',
  }
  return map[key] || key
}

// --- Pure state model ---

{
  assert.equal(
    resolvePracticeSetState({ mutqinSessionActive: true }),
    PRACTICE_SET_STATE.ACTIVE,
  )
  assert.equal(
    resolvePracticeSetState({
      sessionPaused: true,
      backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    }),
    PRACTICE_SET_STATE.PARKED,
  )
  assert.equal(
    resolvePracticeSetState({
      backendUnfinished: true,
      backendStatus: BACKEND_SESSION_STATUS.INTERRUPTED,
    }),
    PRACTICE_SET_STATE.PARKED,
  )
  assert.equal(
    resolvePracticeSetState({ sessionCompleted: true }),
    PRACTICE_SET_STATE.COMPLETED,
  )
  assert.equal(resolvePracticeSetState({}), PRACTICE_SET_STATE.NONE)
}

{
  // Soft leave / return later → park (not completed, not discard).
  const soft = resolveSessionExitTransition({ rangeComplete: false })
  assert.equal(soft.kind, 'save_for_later')
  assert.equal(soft.persistence, PRACTICE_SESSION_PERSISTENCE.PAUSED)
  assert.equal(soft.resumable, true)
  assert.equal(soft.clearContinue, false)

  const done = resolveSessionExitTransition({ rangeComplete: true })
  assert.equal(done.kind, 'complete')
  assert.equal(done.persistence, PRACTICE_SESSION_PERSISTENCE.COMPLETED)
  assert.equal(done.resumable, false)
  assert.equal(done.clearContinue, true)

  const discard = resolveSessionExitTransition({ discard: true })
  assert.equal(discard.kind, 'discard')
  assert.equal(discard.resumable, false)
  assert.equal(discard.clearContinue, true)
}

{
  // Back to mushaf: incomplete / mastery → park; genuine complete → land set.
  const park = resolveBackToMushafTransition({ rangeComplete: false })
  assert.equal(park.kind, 'park')
  assert.equal(park.setState, PRACTICE_SET_STATE.PARKED)
  assert.equal(park.restoreSet, true)
  assert.equal(park.preserveProgress, true)
  assert.equal(park.clearContinue, false)
  assert.equal(park.resumable, true)

  const mastery = resolveBackToMushafTransition({
    rangeComplete: true,
    awaitingMasteryRetest: true,
  })
  assert.equal(mastery.kind, 'park')
  assert.equal(mastery.setState, PRACTICE_SET_STATE.PARKED)

  const early = resolveBackToMushafTransition({
    rangeComplete: false,
    sessionEndedEarly: true,
  })
  assert.equal(early.kind, 'park')

  const completeReturn = resolveBackToMushafTransition({ rangeComplete: true })
  assert.equal(completeReturn.kind, 'complete_return')
  assert.equal(completeReturn.setState, PRACTICE_SET_STATE.COMPLETED)
  assert.equal(completeReturn.restoreSet, true)
  assert.equal(completeReturn.resumable, false)
  assert.equal(completeReturn.clearContinue, true)

  const discard = resolveBackToMushafTransition({ discard: true, rangeComplete: false })
  assert.equal(discard.kind, 'discard')
  assert.equal(discard.setState, PRACTICE_SET_STATE.NONE)
  assert.equal(discard.restoreSet, false)
}

{
  // Parked set surfaces Resume; completed surfaces Start — never confuse the two.
  const parkedVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: true,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(parkedVm.status, SESSION_STATUS.PAUSED)
  assert.equal(parkedVm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(parkedVm.presentation.showEndCompanion, true)

  const softParkedVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionPaused: false,
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    hasValidatedContinuePayload: true,
    t,
  })
  assert.equal(softParkedVm.status, SESSION_STATUS.INTERRUPTED_RESUMABLE)
  assert.equal(softParkedVm.action, PRIMARY_SESSION_ACTION.RESUME_SESSION)
  assert.equal(softParkedVm.presentation.showEndCompanion, false)

  const completedVm = buildSessionLifecycleViewModel({
    authHydrated: true,
    sessionHydrated: true,
    sessionCompleted: true,
    t,
  })
  assert.equal(completedVm.status, SESSION_STATUS.COMPLETED)
  assert.equal(completedVm.action, PRIMARY_SESSION_ACTION.START_SESSION)

  assert.equal(
    resolvePracticeSessionPersistence({
      sessionCompleted: true,
      sessionPaused: true,
    }),
    PRACTICE_SESSION_PERSISTENCE.COMPLETED,
    'completed wins over parked signals',
  )
}

{
  // Refresh: unfinished stays parked/resumable; completed clears continue.
  const refreshed = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.ACTIVE,
    backendAuthoritative: true,
    localContinuePayload: {
      config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
      activeVerseKey: '112:2',
      queueIndex: 1,
    },
    mutqinSessionActive: true,
  })
  assert.equal(refreshed.resumable, true)
  assert.equal(refreshed.mutqinSessionActive, false)
  assert.equal(refreshed.continuePayload.config.chapterId, 112)

  const done = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
    backendAuthoritative: true,
    localContinuePayload: {
      config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
    },
    sessionCompleted: true,
  })
  assert.equal(done.resumable, false)
  assert.equal(done.continuePayload, null)

  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
  }, { backendStatus: BACKEND_SESSION_STATUS.PAUSED }), true)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
  }, { backendStatus: BACKEND_SESSION_STATUS.COMPLETED }), false)
  assert.equal(isResumableSessionPayload({
    config: { chapterId: 1 },
  }, { backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY }), false)
}

// --- Wiring: Back to mushaf / park / discard / multi-set ---

{
  assert.match(source, /resolveBackToMushafTransition\(/)
  assert.match(source, /parkPracticeSetAfterBackToMushaf\(/)
  assert.match(source, /landCompletedPracticeSetOnMushaf\(/)
  assert.match(source, /restorePracticeSetOntoWorkspace\(/)
  assert.match(source, /saveSessionForLaterFromExitModal\(/)

  const backFn = String(source.match(/async returnToMemorisationWorkspace\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0]
    || source.match(/returnToMemorisationWorkspace\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0]
    || '')
  assert.match(backFn, /resolveBackToMushafTransition/)
  assert.match(backFn, /parkPracticeSetAfterBackToMushaf/)
  assert.match(backFn, /landCompletedPracticeSetOnMushaf/)
  assert.doesNotMatch(backFn, /this\.clearContinueSessionQuietly\(\)/)
  assert.doesNotMatch(backFn, /centralSession\.sessionStatus = 'idle'/)
  assert.doesNotMatch(
    backFn,
    /rejectRecommendation|startRecommendedSession|upsertSavedSession|savedSessions\.unshift/,
    'Back to mushaf must not reject, restart, or duplicate sets',
  )

  const parkFn = String(source.match(/async parkPracticeSetAfterBackToMushaf\(snapshot[^=]*= null[\s\S]*?\n\s{4}\}/)?.[0]
    || source.match(/parkPracticeSetAfterBackToMushaf\(snapshot[^=]*= null[\s\S]*?\n\s{4}\}/)?.[0]
    || '')
  assert.match(parkFn, /persistContinueSession/)
  assert.match(parkFn, /applyLocalPausedSessionState/)
  assert.match(parkFn, /backendUnfinishedSession/)
  assert.match(parkFn, /pauseSessionFromPrimaryAction/)
  assert.doesNotMatch(parkFn, /clearContinueSessionQuietly/)

  const landFn = String(source.match(/landCompletedPracticeSetOnMushaf\(snapshot[^=]*= null[\s\S]*?\n\s{4}\}/)?.[0] || '')
  assert.match(landFn, /sessionCompleted = true/)
  assert.match(landFn, /SESSION_STATUS\.COMPLETED/)
  assert.match(landFn, /clearContinueSessionQuietly/)

  const cleanupFn = String(source.match(/finishSessionCleanup\(options = \{\}\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0] || '')
  assert.match(cleanupFn, /discardSet/)
  assert.match(cleanupFn, /if \(discardSet\)/)
}

{
  // Explicit discard is the only continue wipe path from confirm modals.
  assert.match(source, /discard-continue/)
  assert.match(source, /clearContinueSession\(\)/)
  assert.match(
    en.memorisation?.welcomeBack?.continuePreviousSession || '',
    /Return to this set/,
  )
  assert.equal(en.memorisation?.postSession?.actions?.returnToWorkspace, 'Back to mushaf')
}

{
  // Multiple sets: named saves stay distinct from park/resume; Back to mushaf must not unshift.
  assert.match(source, /savedSessions\.unshift/)
  assert.doesNotMatch(
    String(source.match(/returnToMemorisationWorkspace\(\)\s*\{[\s\S]*?\n\s{4}\}/)?.[0] || ''),
    /savedSessions\.unshift|upsertSavedSession|buildSessionRecord/,
  )
  assert.doesNotMatch(
    String(source.match(/parkPracticeSetAfterBackToMushaf\([\s\S]*?\n\s{4}\}/)?.[0] || ''),
    /savedSessions\.unshift|upsertSavedSession/,
  )
}

console.log('parked-set-lifecycle.test.mjs: all assertions passed')
