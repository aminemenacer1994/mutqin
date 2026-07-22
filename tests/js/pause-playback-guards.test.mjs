import assert from 'node:assert/strict'
import {
  isSessionAutomationHalted,
  shouldRunDeferredTalqinAdvance,
} from '../../resources/js/scripts/session/pausePlaybackGuards.js'

{
  assert.equal(isSessionAutomationHalted({}), false)
  assert.equal(isSessionAutomationHalted({ sessionPaused: true }), true)
  assert.equal(isSessionAutomationHalted({ sessionCompleted: true }), true)
  assert.equal(isSessionAutomationHalted({ sessionPaused: true, sessionCompleted: true }), true)
}

{
  // Pause Session during Talqin must cancel the nested settle callback.
  assert.equal(shouldRunDeferredTalqinAdvance({
    sessionPaused: true,
    talqinModeActive: true,
  }), false)

  assert.equal(shouldRunDeferredTalqinAdvance({
    sessionCompleted: true,
    talqinModeActive: true,
  }), false)

  assert.equal(shouldRunDeferredTalqinAdvance({
    sessionPaused: false,
    talqinModeActive: false,
  }), false)

  assert.equal(shouldRunDeferredTalqinAdvance({
    sessionPaused: false,
    sessionCompleted: false,
    talqinModeActive: true,
  }), true)
}

console.log('pause-playback-guards.test.mjs: ok')
