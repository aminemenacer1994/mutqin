import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  FORBIDDEN_USER_TIMING_TERMS,
  containsForbiddenUserTimingTerms,
  sanitizeLiveWordNote,
  sanitizeUserFacingFeedback,
} from '../../resources/js/utils/userFacingFeedback.js'

{
  const forbidden = [
    'timing buffer active',
    'below confidence threshold',
    'alignment window exceeded',
    'network latency spike',
    'pacing coefficient 1.4',
  ]
  forbidden.forEach((text) => {
    assert.ok(containsForbiddenUserTimingTerms(text), `should flag: ${text}`)
    assert.equal(sanitizeUserFacingFeedback(text, 'Try again.'), 'Try again.')
  })
}

{
  assert.equal(sanitizeUserFacingFeedback('Close — keep going.'), 'Close — keep going.')
  assert.equal(sanitizeLiveWordNote(''), '')
  assert.equal(sanitizeLiveWordNote('Waiting for this word.', { liveRecording: true, status: 'pending' }), '')
  assert.equal(sanitizeLiveWordNote('Waiting for confirmation.', { liveRecording: true, status: 'pending' }), '')
  assert.equal(sanitizeLiveWordNote('Expected الرحمن; heard الرحمن.', {
    liveRecording: true,
    status: 'incorrect',
  }), 'Expected الرحمن; heard الرحمن.')
  assert.equal(sanitizeLiveWordNote('Waiting for this word.', { timingBuffered: true, status: 'pending' }), '')
}

{
  const bufferSource = readFileSync(
    join(process.cwd(), 'resources/js/scripts/memorisationDetection/recitationTimingBuffer.js'),
    'utf8',
  )
  assert.doesNotMatch(bufferSource, /note:\s*'Waiting for this word\.'/)
}

{
  const en = readFileSync(join(process.cwd(), 'resources/js/locales/en.json'), 'utf8')
  assert.doesNotMatch(en, FORBIDDEN_USER_TIMING_TERMS)
}

console.log('user-facing-feedback.test.mjs: ok')
