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
  hasResumePlaybackPosition,
  isBackendSessionUnfinished,
  isResumableSessionPayload,
  pickContinuePayloadForResume,
  buildContinuePayloadFromLastPosition,
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
  assert.equal(resolveResumeAyahNumber({}, { ayah_number: 5 }), 5)
  // Relative progress index must not be treated as an absolute mushaf ayah.
  assert.equal(resolveResumeAyahNumber({
    config: { chapterId: 2, rangeStart: 10, rangeEnd: 20 },
  }, { currentPosition: 3 }), 10)
  // Absolute ayah inside the range is still accepted via legacy currentPosition.
  assert.equal(resolveResumeAyahNumber({
    config: { chapterId: 2, rangeStart: 10, rangeEnd: 20 },
  }, { currentPosition: 15 }), 15)
  // Mid-range verse key with queueIndex 0 is still a real resume place.
  assert.equal(hasResumePlaybackPosition({
    activeVerseKey: '2:15',
    queueIndex: 0,
    config: { chapterId: 2, rangeStart: 10, rangeEnd: 20 },
  }), true)
  assert.equal(hasResumePlaybackPosition({
    activeVerseKey: '2:10',
    queueIndex: 0,
    config: { chapterId: 2, rangeStart: 10, rangeEnd: 20 },
  }), false)
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
  assert.equal(isResumableSessionPayload(ikhlas, {
    backendStatus: BACKEND_SESSION_STATUS.ENDED_EARLY,
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

{
  const lastPlace = buildContinuePayloadFromLastPosition({
    surah_number: 1,
    ayah_number: 1,
    last_step: 0,
    last_opened_at: '2026-08-23T21:12:31.000Z',
    metadata: {
      mode: 'advanced',
      activeVerseKey: '1:1',
      config: { chapterId: 1, rangeStart: 1, rangeEnd: 7, reciterId: 'ar.alafasy' },
    },
  })
  assert.equal(lastPlace.fromLastPosition, true)
  assert.equal(lastPlace.config.chapterId, 1)
  assert.equal(lastPlace.config.rangeStart, 1)
  assert.equal(lastPlace.config.rangeEnd, 7)
  assert.equal(lastPlace.activeVerseKey, '1:1')
  assert.equal(isResumableSessionPayload(lastPlace), true)
  assert.equal(buildContinuePayloadFromLastPosition(null), null)
  assert.equal(buildContinuePayloadFromLastPosition({ surah_number: 0 }), null)
}

// --- Wiring contracts in Memorisation.js ---

{
  assert.match(source, /stashDashboardEntryIntent\(entry,\s*null,\s*this\.currentAuthUserId\(\)\)/)
  assert.match(source, /readStashedDashboardEntryIntent\(null,\s*this\.currentAuthUserId\(\)\)/)
  assert.match(source, /markDashboardEntryIntentConsumed\(/)
  assert.match(source, /clearStashedDashboardEntryIntent\(null,\s*this\.currentAuthUserId\(\)\)/)
  assert.match(source, /clearSharedMutqinBrowserResidue/)
  assert.match(source, /offlineScopedLocalKey/)
  assert.match(source, /resolvePreferredSessionResumeGate\(/)
  assert.match(source, /canSkipHydrateForContinue\(/)
  assert.match(source, /pickContinuePayloadForResume\(/)
  assert.match(source, /resolveResumeAyahNumber\(/)
  assert.match(source, /resolveLiveAbsoluteAyahNumber\(/)
  assert.match(source, /restoreWorkspaceToContinuePayload\(/)
  assert.match(source, /welcomeBackContinueSession\(\{\s*preferredSessionId/)
  assert.match(source, /restoreContinueFromLastPosition\(/)
  assert.match(source, /hasRestorableLastPlace/)
  assert.match(source, /getContinuePosition\(/)
  assert.match(source, /revealRestoredLastPlace\(/)
  assert.match(source, /fromLastPosition/)
  assert.match(source, /sessionRangesMatch\(restorePayload,\s*live\.session\)/)
  assert.match(source, /That session is no longer available to resume/)
  assert.match(source, /backendSessionId/)
  // Pause / unload must persist absolute ayah, not relative currentPosition.
  assert.match(source, /ayah_number:\s*this\.resolveLiveAbsoluteAyahNumber\(\)/)
  assert.doesNotMatch(
    source,
    /ayah_number:\s*Number\(this\.currentPosition\s*\|\|\s*this\.rangeStart/,
    'ayah_number must not use relative currentPosition',
  )
  // Fast path no longer trusts hasVerses alone
  assert.doesNotMatch(source, /if \(this\.hasVerses && chapterReady\)/)
}

console.log('return-to-set-resume.test.mjs: ok')
