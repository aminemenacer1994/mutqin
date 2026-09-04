/**
 * Session autosave + crash recovery unit / source tests.
 *
 * Manual Safari / mobile checklist (verify on device when changing this area):
 * - screen lock / app background → visibility/freeze flush parks or checkpoints
 * - background tab restore → Resume from unfinished session
 * - temporary offline → local continue + online reconcile
 * - rapid progress → debounced/batched checkpoint (not per-second spam)
 * - abrupt tab close → keepalive pause + local continue
 * - stale response ordering → older client_revision ignored
 */

import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  buildCheckpointPayload,
  flushActionToPath,
  isStaleAutosaveResponse,
  nextClientRevision,
  postKeepalive,
  resolveLifecycleFlushAction,
  shouldAutosave,
  stripAutosaveAudio,
} from '../../resources/js/scripts/session/sessionAutosave.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationSource = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const learningSource = readFileSync(join(root, 'resources/js/scripts/api/learning.js'), 'utf8')

// --- nextClientRevision ---
{
  assert.equal(nextClientRevision(undefined), 1)
  assert.equal(nextClientRevision(null), 1)
  assert.equal(nextClientRevision(0), 1)
  assert.equal(nextClientRevision(4), 5)
  assert.equal(nextClientRevision('7'), 8)
}

// --- stripAutosaveAudio ---
{
  const cleaned = stripAutosaveAudio({
    active: true,
    audioBlob: 'raw-bytes',
    recordingUrl: 'blob:x',
    config: { chapterId: 1 },
    nested: { waveform: [1, 2], queueIndex: 2 },
  })
  assert.equal(cleaned.active, true)
  assert.equal(cleaned.config.chapterId, 1)
  assert.equal(cleaned.nested.queueIndex, 2)
  assert.equal('audioBlob' in cleaned, false)
  assert.equal('recordingUrl' in cleaned, false)
  assert.equal('waveform' in cleaned.nested, false)
}

// --- buildCheckpointPayload ---
{
  const payload = buildCheckpointPayload({
    sessionId: 42,
    surahNumber: 2,
    ayahNumber: 255,
    currentStep: 3,
    memorisationMode: 'beginner',
    repetitionsCompleted: 2,
    clientRevision: 9,
    active: true,
    paused: false,
    sessionState: {
      active: true,
      queue: [{ ayahId: '2:255' }],
      audioRecording: 'SECRET',
      config: { chapterId: 2, rangeStart: 255, rangeEnd: 256 },
    },
    nowIso: '2026-09-03T12:00:00.000Z',
  })
  assert.equal(payload.action, 'save')
  assert.equal(payload.session_id, 42)
  assert.equal(payload.ayah_number, 255)
  assert.equal(payload.current_step, 3)
  assert.equal(payload.client_revision, 9)
  assert.equal(payload.status, 'active')
  assert.equal(payload.metadata.client_revision, 9)
  assert.equal(payload.metadata.completed, false)
  assert.equal(payload.metadata.config.chapterId, 2)
  assert.equal('audioRecording' in payload.metadata, false)
}

{
  const payload = buildCheckpointPayload({
    sessionId: 8,
    surahNumber: 2,
    ayahNumber: 1,
    currentStep: 0,
    active: true,
    sessionState: {
      queue: [{
        ayahId: '2:1',
        phase: 'Cumulative',
        verse: { key: '2:1', arabic: 'الم', words: [{ ar: 'الم' }], audio: 'https://example.test/a.mp3' },
      }],
    },
    nowIso: '2026-09-04T12:00:00.000Z',
  })
  assert.equal(payload.metadata.queue[0].ayahId, '2:1')
  assert.equal(payload.metadata.queue[0].verse, undefined)
}

// --- shouldAutosave ---
{
  assert.equal(shouldAutosave({
    backendEnabled: true,
    isLive: true,
    lifecycleMutation: 'idle',
  }), true)
  assert.equal(shouldAutosave({
    backendEnabled: true,
    isLive: true,
    lifecycleMutation: 'starting',
  }), false)
  assert.equal(shouldAutosave({
    backendEnabled: true,
    isLive: true,
    completed: true,
  }), false)
  assert.equal(shouldAutosave({
    backendEnabled: true,
    isLive: true,
    manualLockHeld: true,
  }), false)
  assert.equal(shouldAutosave({
    backendEnabled: true,
    isPausedUnfinished: true,
  }), true)
  assert.equal(shouldAutosave({
    backendEnabled: false,
    isLive: true,
  }), false)
}

// --- isStaleAutosaveResponse ---
{
  assert.equal(isStaleAutosaveResponse({
    sentRevision: 5,
    currentRevision: 5,
    sentGeneration: 1,
    currentGeneration: 1,
  }), false)
  assert.equal(isStaleAutosaveResponse({
    sentRevision: 5,
    currentRevision: 7,
  }), true)
  assert.equal(isStaleAutosaveResponse({
    sentGeneration: 1,
    currentGeneration: 2,
  }), true)
  assert.equal(isStaleAutosaveResponse({
    sentRevision: 8,
    responseRevision: 3,
  }), true)
}

// --- resolveLifecycleFlushAction ---
{
  assert.equal(resolveLifecycleFlushAction({ isLiveActive: true }), 'pause')
  assert.equal(resolveLifecycleFlushAction({ isPausedUnfinished: true }), 'save')
  assert.equal(resolveLifecycleFlushAction({
    isLiveActive: true,
    isPausedUnfinished: true,
  }), 'pause')
  assert.equal(resolveLifecycleFlushAction({ completed: true, isLiveActive: true }), null)
  assert.equal(resolveLifecycleFlushAction({}), null)
  assert.equal(flushActionToPath('pause'), '/api/session/pause')
  assert.equal(flushActionToPath('save'), '/api/session')
  assert.equal(flushActionToPath(null), null)
}

// --- postKeepalive prefers fetch keepalive ---
{
  let fetchCalls = 0
  const result = await postKeepalive('/api/session/pause', { action: 'pause' }, {
    csrfToken: 't',
    xsrfToken: 'x',
    fetchImpl: async (url, init) => {
      fetchCalls += 1
      assert.equal(url, '/api/session/pause')
      assert.equal(init.method, 'POST')
      assert.equal(init.keepalive, true)
      assert.equal(init.headers['X-CSRF-TOKEN'], 't')
      return { ok: true }
    },
    beacon: () => {
      throw new Error('beacon should not run when fetch works')
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.transport, 'fetch')
  assert.equal(fetchCalls, 1)
}

// --- postKeepalive falls back to beacon ---
{
  let beaconCalls = 0
  const result = await postKeepalive('/api/session', { action: 'save' }, {
    fetchImpl: async () => {
      throw new Error('network dead')
    },
    beacon: (url, blob) => {
      beaconCalls += 1
      assert.equal(url, '/api/session')
      assert.ok(blob)
      return true
    },
  })
  assert.equal(result.ok, true)
  assert.equal(result.transport, 'beacon')
  assert.equal(beaconCalls, 1)
}

// --- Memorisation wiring source guards ---
{
  assert.match(memorisationSource, /from '\.\.\/scripts\/session\/sessionAutosave'/)
  assert.match(memorisationSource, /visibilitychange.*handleVisibilityAutosave|handleVisibilityAutosave/)
  assert.match(memorisationSource, /addEventListener\('visibilitychange',\s*this\.handleVisibilityAutosave\)/)
  assert.match(memorisationSource, /addEventListener\('freeze',\s*this\.handleVisibilityAutosave\)/)
  assert.match(memorisationSource, /flushSessionLifecycleForBackground/)
  assert.match(memorisationSource, /scheduleSessionCheckpoint/)
  assert.match(memorisationSource, /pushSessionCheckpoint/)
  assert.match(memorisationSource, /cancelSessionAutosave/)
  assert.match(memorisationSource, /postKeepalive\('\/api\/session\/pause'/)
  assert.match(memorisationSource, /cancelSessionAutosave\(\{\s*bumpGeneration:\s*true\s*\}\)/)
  // Manual lifecycle actions cancel pending autosave.
  assert.match(memorisationSource, /pauseSessionFromPrimaryAction[\s\S]{0,200}cancelSessionAutosave/)
  assert.match(memorisationSource, /confirmSessionExit[\s\S]{0,200}cancelSessionAutosave/)
  assert.match(memorisationSource, /handleSessionComplete\([\s\S]{0,600}?cancelSessionAutosave/)
  assert.match(memorisationSource, /performDeleteSavedSession\([\s\S]{0,200}?cancelSessionAutosave/)
  assert.match(learningSource, /checkpointSession\s*\(/)
}

console.log('session-autosave.test.mjs: ok')
