import assert from 'node:assert/strict'
import {
  RECITATION_LIFECYCLE_PHASE,
  mediaRecorderIsCapturing,
  mediaStreamHasLiveAudioTracks,
  reconcileRecitationAfterForeground,
  resolveRecitationLifecyclePhase,
  shouldInterruptRecitationOnBackground,
} from '../../resources/js/scripts/audio/recitationLifecycleInterrupt.js'
import { RECITATION_PROCESSING_STAGE } from '../../resources/js/scripts/audio/recordingResilience.js'

assert.equal(resolveRecitationLifecyclePhase({}), RECITATION_LIFECYCLE_PHASE.IDLE)
assert.equal(
  resolveRecitationLifecyclePhase({ preparing: true }),
  RECITATION_LIFECYCLE_PHASE.PREPARING,
)
assert.equal(
  resolveRecitationLifecyclePhase({ recording: true }),
  RECITATION_LIFECYCLE_PHASE.RECORDING,
)
assert.equal(
  resolveRecitationLifecyclePhase({ processingStage: RECITATION_PROCESSING_STAGE.ASSESSING }),
  RECITATION_LIFECYCLE_PHASE.PROCESSING,
)
assert.equal(
  resolveRecitationLifecyclePhase({ submitInFlight: true }),
  RECITATION_LIFECYCLE_PHASE.PROCESSING,
)

assert.equal(shouldInterruptRecitationOnBackground({}), false)
assert.equal(shouldInterruptRecitationOnBackground({ recording: true }), true)
assert.equal(shouldInterruptRecitationOnBackground({ capturingForReplay: true, recording: true }), false)

{
  const liveTrack = { kind: 'audio', readyState: 'live' }
  const stream = { getTracks: () => [liveTrack] }
  assert.equal(mediaStreamHasLiveAudioTracks(stream), true)
  assert.equal(mediaStreamHasLiveAudioTracks({ getTracks: () => [{ kind: 'audio', readyState: 'ended' }] }), false)
}

assert.equal(mediaRecorderIsCapturing({ state: 'recording' }), true)
assert.equal(mediaRecorderIsCapturing({ state: 'inactive' }), false)

{
  const plan = reconcileRecitationAfterForeground({
    recitation: { recording: true, stream: null, recorder: null },
  })
  assert.equal(plan.resetRecitationUi, true)
  assert.equal(plan.syncAmdSurface, true)
}

{
  const stream = { getTracks: () => [{ kind: 'audio', readyState: 'live', stop() {} }] }
  const plan = reconcileRecitationAfterForeground({
    recitation: { recording: false, stream, recorder: null },
  })
  assert.equal(plan.stopOrphanRecitationStream, true)
}

console.log('recitation-lifecycle-interrupt.test.mjs: ok')
