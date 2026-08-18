import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import {
  FORBIDDEN_USER_TIMING_TERMS,
  containsForbiddenUserTimingTerms,
  sanitizeLiveWordNote,
  sanitizeRecitationReviewNote,
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
  assert.equal(sanitizeLiveWordNote('Not heard yet.', { liveRecording: true, status: 'pending' }), '')
  assert.equal(sanitizeLiveWordNote('Low recognition confidence.', { status: 'uncertain' }), '')
  assert.equal(sanitizeLiveWordNote('Locked until the previous word is green.', { liveRecording: true }), '')
  assert.equal(sanitizeRecitationReviewNote('Low recognition confidence.', 'Missed word.'), 'Missed word.')
  assert.equal(sanitizeRecitationReviewNote('Expected الرحمن; heard الرحيم.', ''), 'Expected الرحمن; heard الرحيم.')
}

{
  const bufferSource = readFileSync(
    join(process.cwd(), 'resources/js/scripts/memorisationDetection/recitationTimingBuffer.js'),
    'utf8',
  )
  assert.doesNotMatch(bufferSource, /note:\s*'Waiting for this word\.'/)
}

{
  const analysisSource = readFileSync(
    join(process.cwd(), 'resources/js/scripts/engine/recitation_analysis.js'),
    'utf8',
  )
  assert.doesNotMatch(analysisSource, /note:\s*'Low recognition confidence/)
  assert.doesNotMatch(analysisSource, /note:\s*'Locked until/)
  assert.doesNotMatch(analysisSource, /note:\s*'Not heard yet\.'/)
}

{
  const memorisationSource = readFileSync(
    join(process.cwd(), 'resources/js/views/Memorisation.js'),
    'utf8',
  )
  assert.match(memorisationSource, /sanitizeRecitationReviewNote/)
  assert.doesNotMatch(memorisationSource, /Waiting for your first recognized word/)
  assert.doesNotMatch(memorisationSource, /Locked until the previous word is green/)
}
{
  const en = readFileSync(join(process.cwd(), 'resources/js/locales/en.json'), 'utf8')
  assert.doesNotMatch(en, FORBIDDEN_USER_TIMING_TERMS)
}

console.log('user-facing-feedback.test.mjs: ok')
