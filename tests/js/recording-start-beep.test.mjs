import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  playRecordingStartBeep,
  resetRecordingStartBeepDebounce,
} from '../../resources/js/scripts/audio/recordingStartBeep.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const amdModal = readFileSync(join(root, 'resources/js/components/AiMemorisationDetectionModal.vue'), 'utf8')
const dashModal = readFileSync(join(root, 'resources/js/components/DashboardAiReciteModal.vue'), 'utf8')
const beepModule = readFileSync(join(root, 'resources/js/scripts/audio/recordingStartBeep.js'), 'utf8')

assert.match(beepModule, /880/, 'start beep uses a short 880Hz tone')
assert.match(beepModule, /minGapMs/, 'start beep debounces rapid repeats')

resetRecordingStartBeepDebounce()
assert.equal(typeof playRecordingStartBeep(), 'boolean', 'beep helper returns a boolean')

assert.match(amdModal, /playRecordingStartBeep\(\)/, 'AMD modal beeps on Record click')
assert.match(amdModal, /onStart\(\)[\s\S]*playRecordingStartBeep/, 'beep runs inside the Record click handler')
assert.match(dashModal, /playRecordingStartBeep\(\)/, 'dashboard AI recite beeps when recording starts')

console.log('recording-start-beep.test.mjs passed')
