import assert from 'node:assert/strict'
import {
  buildFeedbackSegmentMarkers,
  nextFeedbackSegmentIndex,
  previousFeedbackSegmentIndex,
  resolvePlaybackAttempt,
} from '../../resources/js/scripts/teacher/learnerAttemptPlayback.js'

const durationMs = 10_000

assert.deepEqual(
  buildFeedbackSegmentMarkers([{ id: 1, start_ms: 1000, end_ms: 3000 }], durationMs),
  [{
    index: 'feedback-1',
    segmentIndex: 0,
    markerKind: 'feedback',
    segment: { id: 1, start_ms: 1000, end_ms: 3000 },
    mistake: { type: 'feedback' },
    anchorMs: 2000,
    percent: 20,
  }],
  'feedback segments become seekable timeline markers',
)

const segments = [
  { id: 1, start_ms: 500, end_ms: 1500 },
  { id: 2, start_ms: 4000, end_ms: 6000 },
]

assert.equal(nextFeedbackSegmentIndex(segments, null, durationMs), 0)
assert.equal(nextFeedbackSegmentIndex(segments, 0, durationMs), 1)
assert.equal(nextFeedbackSegmentIndex(segments, 1, durationMs), 0)
assert.equal(previousFeedbackSegmentIndex(segments, 1, durationMs), 0)

const row = {
  completion_result: {
    attempt: {
      feedback_segments: [{ id: 9, start_ms: 1, end_ms: 2 }],
      mistakes: [],
    },
  },
  assignment: { ayah_start: 1, ayah_end: 1 },
}

assert.equal(resolvePlaybackAttempt(row).feedbackSegments.length, 1)

console.log('learner-attempt-playback.test.mjs: ok')