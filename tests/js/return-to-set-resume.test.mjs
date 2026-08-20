/**
 * Return-to-this-set / resume / refresh destination coverage.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  BACKEND_SESSION_STATUS,
  canSkipHydrateForContinue,
  clearStashedDashboardEntryIntent,
  extractSessionRange,
  isBackendSessionUnfinished,
  isResumableSessionPayload,
  pickContinuePayloadForResume,
  readStashedDashboardEntryIntent,
  reconcileBootstrapSessionState,
  reconcileContinuePayloadWithBackend,
  resolvePreferredSessionResumeGate,
  resolveResumeAyahNumber,
  sessionRangesMatch,
  stashDashboardEntryIntent,
} from '../../resources/js/scripts/session/sessionLifecycle.js'

const source = readFileSync(new URL('../../resources/js/views/Memorisation.js', import.meta.url), 'utf8')

const ikhlas = {
  config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
  activeVerseKey: '112:3',
  queueIndex: 2,
  backendSessionId: 41,
}

const nas = {
  config: { chapterId: 114, rangeStart: 1, rangeEnd: 6 },
  activeVerseKey: '114:1',
  queueIndex: 0,
  backendSessionId: 99,
}

const unfinishedIkhlas = {
  id: 41,
  status: BACKEND_SESSION_STATUS.PAUSED,
  surah_number: 112,
  ayah_number: 3,
  metadata: { config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 } },
}

// --- Pure helpers ---

{
  assert.deepEqual(extractSessionRange(ikhlas), { chapterId: 112, rangeStart: 1, rangeEnd: 4 })
  assert.equal(sessionRangesMatch(ikhlas, unfinishedIkhlas), true)
  assert.equal(sessionRangesMatch(ikhlas, nas), false)
}

{
  assert.equal(resolveResumeAyahNumber(ikhlas), 3)
  assert.equal(resolveResumeAyahNumber({
    config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
    queueIndex: 1,
  }), 2)
  assert.equal(resolveResumeAyahNumber({}, { currentPosition: 5 }), 5)
}

{
  assert.equal(canSkipHydrateForContinue({
    hasVerses: true,
    payload: ikhlas,
    loaded: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
  }), true)
  assert.equal(canSkipHydrateForContinue({
    hasVerses: true,
    payload: ikhlas,
    loaded: { chapterId: 114, rangeStart: 1, rangeEnd: 6 },
  }), false)
  assert.equal(canSkipHydrateForContinue({
    hasVerses: false,
    payload: ikhlas,
    loaded: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
  }), false)
}

{
  assert.deepEqual(resolvePreferredSessionResumeGate({
    preferredSessionId: 41,
    snapshot: unfinishedIkhlas,
    unfinished: true,
  }), { ok: true, reason: null })
  assert.equal(resolvePreferredSessionResumeGate({
    preferredSessionId: 41,
    snapshot: { id: 99, status: 'paused' },
    unfinished: true,
  }).ok, false)
  assert.equal(resolvePreferredSessionResumeGate({
    preferredSessionId: 41,
    invalidRequested: true,
  }).reason, 'invalid_requested')
  assert.equal(resolvePreferredSessionResumeGate({
    preferredSessionId: 41,
    unfinished: false,
  }).reason, 'unavailable')
}

{
  // Wrong local set must not win over unfinished backend session.
  const picked = pickContinuePayloadForResume({
    continuePayload: nas,
    backendSession: unfinishedIkhlas,
    localCandidates: [nas, ikhlas],
    preferredSessionId: 41,
    buildFromBackend: () => ({
      ...ikhlas,
      backendSessionId: 41,
      backendStatus: BACKEND_SESSION_STATUS.PAUSED,
    }),
  })
  assert.equal(picked.config.chapterId, 112)
  assert.equal(picked.backendSessionId, 41)
}

{
  assert.equal(
    reconcileContinuePayloadWithBackend(nas, unfinishedIkhlas, { backendAuthoritative: true, unfinished: true }),
    null
  )
  const matched = reconcileContinuePayloadWithBackend(ikhlas, unfinishedIkhlas, {
    backendAuthoritative: true,
    unfinished: true,
  })
  assert.equal(matched.backendSessionId, 41)
  assert.equal(matched.config.chapterId, 112)
}

{
  const store = new Map()
  const storage = {
    getItem: (key) => (store.has(key) ? store.get(key) : null),
    setItem: (key, value) => { store.set(key, String(value)) },
    removeItem: (key) => { store.delete(key) },
  }
  const intent = { resume: true, sessionId: '41', journey: 'main' }
  assert.equal(stashDashboardEntryIntent(intent, storage), true)
  assert.deepEqual(readStashedDashboardEntryIntent(storage), intent)
  clearStashedDashboardEntryIntent(storage)
  assert.equal(readStashedDashboardEntryIntent(storage), null)
}

{
  // Refresh demotes live → resumable and keeps the same set.
  const refreshed = reconcileBootstrapSessionState({
    backendUnfinished: true,
    backendStatus: BACKEND_SESSION_STATUS.ACTIVE,
    backendAuthoritative: true,
    localContinuePayload: ikhlas,
    mutqinSessionActive: true,
  })
  assert.equal(refreshed.mutqinSessionActive, false)
  assert.equal(refreshed.resumable, true)
  assert.equal(refreshed.continuePayload.config.chapterId, 112)
}

{
  // Completed / abandoned sessions are not resumable.
  assert.equal(isResumableSessionPayload(ikhlas, {
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
  }), false)
  assert.equal(isResumableSessionPayload(ikhlas, {
    backendStatus: BACKEND_SESSION_STATUS.ABANDONED,
  }), false)
  assert.equal(isBackendSessionUnfinished({ status: 'completed' }), false)
  assert.equal(isBackendSessionUnfinished({ status: 'ended_early' }), false)
  assert.equal(isBackendSessionUnfinished({ status: 'paused' }), true)

  const done = reconcileBootstrapSessionState({
    backendUnfinished: false,
    backendStatus: BACKEND_SESSION_STATUS.COMPLETED,
    backendAuthoritative: true,
    localContinuePayload: ikhlas,
    sessionCompleted: true,
  })
  assert.equal(done.resumable, false)
  assert.equal(done.continuePayload, null)
}

// --- Wiring contracts in Memorisation.js ---

{
  assert.match(source, /stashDashboardEntryIntent\(entry\)/)
  assert.match(source, /readStashedDashboardEntryIntent\(/)
  assert.match(source, /markDashboardEntryIntentConsumed\(/)
  assert.match(source, /clearStashedDashboardEntryIntent\(/)
  assert.match(source, /resolvePreferredSessionResumeGate\(/)
  assert.match(source, /canSkipHydrateForContinue\(/)
  assert.match(source, /pickContinuePayloadForResume\(/)
  assert.match(source, /resolveResumeAyahNumber\(/)
  assert.match(source, /welcomeBackContinueSession\(\{\s*preferredSessionId/)
  assert.match(source, /sessionRangesMatch\(restorePayload,\s*live\.session\)/)
  assert.match(source, /That session is no longer available to resume/)
  assert.match(source, /backendSessionId/)
  // Fast path no longer trusts hasVerses alone
  assert.doesNotMatch(source, /if \(this\.hasVerses && chapterReady\)/)
}

console.log('return-to-set-resume.test.mjs: ok')
