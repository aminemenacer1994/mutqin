import assert from 'node:assert/strict'
import {
  idleWaveformBarLevels,
  sampleWaveformBarLevels,
  VOICE_NOTE_WAVEFORM_BAR_COUNT,
} from '../../resources/js/scripts/audio/voiceNoteLiveAnalyser.js'

const bins = new Uint8Array([0, 10, 40, 128, 255, 64, 8, 0])
const levels = sampleWaveformBarLevels(bins, 4)
assert.equal(levels.length, 4)
assert.ok(levels.every((level) => level >= 0.08 && level <= 1))
assert.ok(levels[2] >= levels[0])

const idle = idleWaveformBarLevels(6)
assert.equal(idle.length, 6)
assert.equal(idle[0], 0.08)

const defaultIdle = idleWaveformBarLevels()
assert.equal(defaultIdle.length, VOICE_NOTE_WAVEFORM_BAR_COUNT)

console.log('voiceNoteLiveAnalyser.test.mjs: ok')
