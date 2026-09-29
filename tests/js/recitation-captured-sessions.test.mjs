import assert from 'node:assert/strict'
import { resolveRecitationResultState } from '../../resources/js/scripts/recommendations/recitationResultState.js'
import { recitationCapturedSessions } from './fixtures/recitation-captured-sessions.mjs'
import { extractCapturedTranscriptWords, scoreSpeechmaticsPath } from './helpers/scoreRecitationScenario.mjs'

assert.ok(recitationCapturedSessions.length >= 5, 'keep a small captured-session set')

for (const session of recitationCapturedSessions) {
  const recognitionWords = extractCapturedTranscriptWords(session.speechmaticsMessage, {
    isPartial: false,
  })
  assert.ok(recognitionWords.length > 0, `${session.id}: extracted no words`)
  assert.ok(
    recognitionWords.every((word) => Number.isFinite(Number(word.confidence))),
    `${session.id}: missing Speechmatics confidence`,
  )

  const scored = scoreSpeechmaticsPath({
    id: session.id,
    targetText: session.targetText,
    recognitionWords,
  })

  assert.ok(
    Math.abs(scored.accuracy - session.expectedAccuracy) <= 1,
    `${session.id}: accuracy ${scored.accuracy} != ${session.expectedAccuracy}`,
  )

  const state = resolveRecitationResultState(scored.result, {
    confidence: scored.confidence,
    recordingDurationSeconds: 8,
    usableSpeechSeconds: 4,
  })
  assert.equal(state, session.expectedResultState, `${session.id} result state`)
}

console.log('recitation-captured-sessions.test.mjs: ok')
