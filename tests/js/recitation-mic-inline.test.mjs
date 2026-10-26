import assert from 'node:assert/strict'
import { MICROPHONE_ACCESS_KIND } from '../../resources/js/scripts/audio/microphonePermissionHelp.js'
import {
  RECITATION_MIC_INLINE_STATUS,
  inlineMicStatusFromHelpKind,
  micInlineGuidanceSteps,
  micInputLevelPercent,
} from '../../resources/js/scripts/audio/recitationMicInline.js'

{
  assert.equal(
    inlineMicStatusFromHelpKind(MICROPHONE_ACCESS_KIND.NOT_ALLOWED),
    RECITATION_MIC_INLINE_STATUS.NEED_ACCESS,
  )
  assert.equal(
    inlineMicStatusFromHelpKind(MICROPHONE_ACCESS_KIND.NOT_FOUND),
    RECITATION_MIC_INLINE_STATUS.NO_DEVICE,
  )
  assert.equal(
    inlineMicStatusFromHelpKind(MICROPHONE_ACCESS_KIND.UNSUPPORTED),
    RECITATION_MIC_INLINE_STATUS.UNAVAILABLE,
  )
  assert.equal(
    inlineMicStatusFromHelpKind(MICROPHONE_ACCESS_KIND.NOT_READABLE),
    RECITATION_MIC_INLINE_STATUS.RECORDING_ISSUE,
  )
}

{
  const steps = micInlineGuidanceSteps({
    explanation: 'Blocked.',
    steps: ['Open Settings', 'Enable Microphone'],
  })
  assert.deepEqual(steps, ['Open Settings', 'Enable Microphone'])
}

{
  assert.equal(micInputLevelPercent(0), 0)
  assert.ok(micInputLevelPercent(0.06) > 40)
  assert.equal(micInputLevelPercent(0.2), 100)
}

console.log('recitation-mic-inline.test.mjs: ok')
