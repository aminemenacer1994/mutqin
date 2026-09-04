/**
 * Silent Saved Sessions autosave: create one in_progress row, update it,
 * leave as in_progress, complete the same row, never spawn empties/duplicates.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  AUTOSAVED_SESSION_STATUS,
  buildAutosavedSessionFingerprint,
  buildStableAutosaveSessionName,
  canReuseAutosavedRecord,
  findReusableAutosavedSessionIndex,
  hasMeaningfulSessionActivity,
  hasStartedMemorisationSession,
  isAutosavedSessionComplete,
  mergeAutosavedSessionRecord,
  resolveAutosavedSessionStatus,
  shouldAutosaveNamedSession,
  shouldSkipAutosavedSessionWrite,
} from '../../resources/js/scripts/session/savedSessionAutosave.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationSource = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

const startedCtx = {
  isLive: true,
  sessionStartedAt: 1_700_000_000_000,
  chapterId: 112,
  rangeStart: 1,
  rangeEnd: 4,
}

// Opening the page / picking a surah must not create a bookmark.
{
  assert.equal(hasStartedMemorisationSession({
    chapterId: 112,
    rangeStart: 1,
    rangeEnd: 4,
  }), false)
  assert.equal(hasMeaningfulSessionActivity({
    chapterId: 112,
    rangeStart: 1,
    rangeEnd: 4,
  }), false)
  assert.equal(shouldAutosaveNamedSession({
    chapterId: 112,
    rangeStart: 1,
    rangeEnd: 4,
  }), false)
}

// Real start creates an in_progress bookmark; sample / bootstrap / starting do not.
{
  assert.equal(hasMeaningfulSessionActivity(startedCtx), true)
  assert.equal(shouldAutosaveNamedSession(startedCtx), true)
  assert.equal(resolveAutosavedSessionStatus(startedCtx), AUTOSAVED_SESSION_STATUS.IN_PROGRESS)
  assert.equal(shouldAutosaveNamedSession({
    ...startedCtx,
    onboardingSample: true,
  }), false)
  assert.equal(shouldAutosaveNamedSession({
    ...startedCtx,
    isBootstrapping: true,
  }), false)
  assert.equal(shouldAutosaveNamedSession({
    ...startedCtx,
    lifecycleMutation: 'starting',
  }), false)
  assert.equal(shouldAutosaveNamedSession({
    ...startedCtx,
    signupIsolation: true,
  }), false)
}

// Guests can autosave locally (backendEnabled is not required).
{
  assert.equal(shouldAutosaveNamedSession({
    ...startedCtx,
    backendEnabled: false,
  }), true)
}

// Genuine completion is the only completed status.
{
  assert.equal(resolveAutosavedSessionStatus({ completed: true }), AUTOSAVED_SESSION_STATUS.COMPLETED)
  assert.equal(resolveAutosavedSessionStatus({
    ...startedCtx,
    isPausedUnfinished: true,
    isLive: false,
  }), AUTOSAVED_SESSION_STATUS.IN_PROGRESS)
  assert.equal(isAutosavedSessionComplete({
    status: 'in_progress',
    restore: { continueSession: { completed: false, backendStatus: 'paused' } },
  }), false)
  assert.equal(isAutosavedSessionComplete({
    status: 'completed',
    restore: { centralSession: { sessionStatus: 'completed' } },
  }), true)
  assert.equal(isAutosavedSessionComplete({
    restore: { continueSession: { ended_early: true } },
  }), false)
}

// Fingerprint ignores audio clock; same progress must not rewrite.
{
  const a = buildAutosavedSessionFingerprint({
    ...startedCtx,
    queueIndex: 2,
    ayahNumber: 3,
    reciterId: 'r1',
    currentTime: 12.4,
  })
  const b = buildAutosavedSessionFingerprint({
    ...startedCtx,
    queueIndex: 2,
    ayahNumber: 3,
    reciterId: 'r1',
    currentTime: 18.1,
  })
  const c = buildAutosavedSessionFingerprint({
    ...startedCtx,
    queueIndex: 3,
    ayahNumber: 4,
    reciterId: 'r1',
  })
  assert.equal(a, b)
  assert.equal(shouldSkipAutosavedSessionWrite(a, b), true)
  assert.equal(shouldSkipAutosavedSessionWrite(a, c), false)
}

// One record: backend id / local id / same-range in_progress. Never reuse completed.
{
  const inProgress = {
    id: 'local-1',
    backendSessionId: 44,
    status: 'in_progress',
    autoSaved: true,
    config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
    restore: { continueSession: { completed: false, backendSessionId: 44, sessionStartedAt: 9 } },
  }
  const completed = {
    id: 'done-1',
    backendSessionId: 40,
    status: 'completed',
    config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
    restore: { centralSession: { sessionStatus: 'completed' }, continueSession: { completed: true } },
  }
  const sessions = [completed, inProgress]

  assert.equal(canReuseAutosavedRecord(completed, { completed: false }), false)
  assert.equal(canReuseAutosavedRecord(inProgress, { completed: true }), true)

  assert.equal(findReusableAutosavedSessionIndex(sessions, {
    backendSessionId: 44,
    completed: false,
  }), 1)
  assert.equal(findReusableAutosavedSessionIndex(sessions, {
    id: 'local-1',
    completed: false,
  }), 1)
  assert.equal(findReusableAutosavedSessionIndex(sessions, {
    config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
    completed: true,
  }), 1)
  assert.equal(findReusableAutosavedSessionIndex(sessions, {
    backendSessionId: 40,
    completed: false,
    config: { chapterId: 112, rangeStart: 1, rangeEnd: 4 },
  }), 1)
  assert.equal(findReusableAutosavedSessionIndex(sessions, {
    config: { chapterId: 2, rangeStart: 1, rangeEnd: 5 },
    completed: false,
  }), -1)
}

// Merge keeps the original id/name and attaches a late backend id.
{
  const merged = mergeAutosavedSessionRecord(
    { id: 'local-1', name: 'Al-Ikhlas 1-4', autoSaved: true, backendSessionId: null },
    { id: 'new', name: 'Al-Ikhlas 1-4 · Ayah 2', backendSessionId: 88, status: 'in_progress' },
  )
  assert.equal(merged.id, 'local-1')
  assert.equal(merged.name, 'Al-Ikhlas 1-4')
  assert.equal(merged.backendSessionId, 88)
  assert.equal(merged.status, 'in_progress')
}

{
  assert.equal(buildStableAutosaveSessionName({
    chapterName: 'Al-Ikhlas',
    rangeStart: 1,
    rangeEnd: 4,
  }), 'Al-Ikhlas 1-4')
}

// Memorisation wiring: silent upsert, no toast spam, same-record complete, no list refetch.
{
  assert.match(memorisationSource, /from '\.\.\/scripts\/session\/savedSessionAutosave'/)
  assert.match(memorisationSource, /scheduleSavedSessionAutosave\s*\(/)
  assert.match(memorisationSource, /upsertAutosavedSession\s*\(/)
  assert.match(memorisationSource, /flushSavedSessionAutosave\s*\(/)
  assert.match(memorisationSource, /this\.scheduleLearningSync\(\)\s*\n\s*this\.scheduleSessionCheckpoint\(\)\s*\n\s*this\.scheduleSavedSessionAutosave\(\)/)
  assert.match(memorisationSource, /this\.sessionBroadcast\?\.publish\('session-started'[\s\S]{0,280}scheduleSavedSessionAutosave/)
  assert.match(memorisationSource, /applyBackendStartResult\([\s\S]{0,500}scheduleSavedSessionAutosave/)
  assert.match(memorisationSource, /this\.sessionBroadcast\?\.publish\('session-paused'[\s\S]{0,220}upsertAutosavedSession\(\{\s*immediate:\s*true/)
  assert.match(memorisationSource, /saveSessionForLaterFromExitModal\([\s\S]*?upsertAutosavedSession\(\{\s*immediate:\s*true/)
  assert.match(memorisationSource, /upsertAutosavedSession\(\{\s*completed:\s*true,\s*immediate:\s*true\s*\}\)/)
  assert.match(memorisationSource, /persistAllState\([\s\S]{0,500}flushSavedSessionAutosave/)
  assert.match(memorisationSource, /flushSessionLifecycleForBackground\([\s\S]{0,500}flushSavedSessionAutosave/)
  assert.match(memorisationSource, /addSavedSession\([\s\S]{0,180}silent:\s*true/)
  assert.doesNotMatch(
    memorisationSource,
    /upsertAutosavedSession\([^)]*\)[\s\S]{0,400}showSavedSessionToast/,
  )
  assert.doesNotMatch(
    memorisationSource,
    /upsertAutosavedSession\([^)]*\)[\s\S]{0,400}loadSavedSessions\(\)/,
  )
  const completedUpserts = memorisationSource.match(/upsertAutosavedSession\(\{\s*completed:\s*true,\s*immediate:\s*true\s*\}\)/g) || []
  assert.ok(completedUpserts.length >= 2, 'guest + auth completion paths must both upsert the same completed bookmark')
}

console.log('saved-session-autosave.test.mjs: ok')
