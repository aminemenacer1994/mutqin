import assert from 'node:assert/strict'
import {
  REVIEW_AUDIO_STATES,
  chooseSupportedRecorderMimeType,
  createObjectUrlFromBlob,
  extensionForMimeType,
  revokeObjectUrl,
  sanitizeAudioDuration,
} from '../../resources/js/scripts/audio/recordingPlayback.js'

{
  assert.equal(sanitizeAudioDuration(12.4), 12.4)
  assert.equal(sanitizeAudioDuration(Infinity), 0)
  assert.equal(sanitizeAudioDuration(NaN), 0)
  assert.equal(sanitizeAudioDuration(0), 0)
  assert.equal(sanitizeAudioDuration(-3), 0)
}

{
  assert.equal(extensionForMimeType('audio/webm;codecs=opus'), 'webm')
  assert.equal(extensionForMimeType('audio/mp4'), 'm4a')
  assert.equal(extensionForMimeType('audio/ogg'), 'ogg')
  assert.equal(extensionForMimeType('audio/wav'), 'wav')
}

{
  // Without MediaRecorder in Node, selection returns ''.
  assert.equal(chooseSupportedRecorderMimeType(), '')
}

{
  const blob = new Blob([new Uint8Array([1, 2, 3, 4])], { type: 'audio/webm' })
  assert.ok(blob.size > 0)
  const url = createObjectUrlFromBlob(blob)
  assert.match(String(url), /^blob:/)
  revokeObjectUrl(url)
}

{
  assert.equal(REVIEW_AUDIO_STATES.IDLE, 'idle')
  assert.equal(REVIEW_AUDIO_STATES.PLAYING, 'playing')
  assert.equal(REVIEW_AUDIO_STATES.ENDED, 'ended')
  assert.equal(REVIEW_AUDIO_STATES.ERROR, 'error')
  assert.equal(REVIEW_AUDIO_STATES.LOADING_AUDIO, 'loading_audio')
}

console.log('Recording playback helper tests passed')
