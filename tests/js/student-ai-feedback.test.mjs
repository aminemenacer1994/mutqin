import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  applyFeedbackToSummary,
  feedbackPracticeHref,
  practiceReasonKey,
  practiceRevisionHref,
  teacherReviewOf,
} from '../../resources/js/scripts/dashboardAiRecite/studentFeedback.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const dashboard = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')
const card = readFileSync(join(root, 'resources/js/components/dashboard/DashAiReciteAttemptCard.vue'), 'utf8')

const href = practiceRevisionHref('/memorisation', {
  surah_number: 112,
  ayah_start: 1,
  ayah_end: 2,
})
assert.match(href, /goal=revise/)
assert.match(href, /setup=1/)
assert.match(href, /surah=112/)
assert.match(href, /from=1/)
assert.match(href, /to=2/)
assert.match(href, /return_tab=home/)
assert.doesNotMatch(href, /assignment_recipient/)
assert.equal(practiceRevisionHref('/memorisation', {}), '')

const linked = feedbackPracticeHref('/memorisation', {
  feedback: {
    practice: { tool: 'revise', surah_number: 2, ayah_start: 255, ayah_end: 255, reason: 'uncertain' },
  },
})
assert.match(linked, /surah=2/)
assert.match(linked, /from=255/)
assert.match(linked, /goal=revise/)
assert.equal(feedbackPracticeHref('/memorisation', { surah_number: 2, ayah_start: 1 }), '')
assert.equal(feedbackPracticeHref('/memorisation', { practice: { tool: 'memorise', surah_number: 2, ayah_start: 1 } }), '')
assert.equal(practiceReasonKey({ practice: { reason: 'uncertain' } }), 'dashboard.ai_recite.practice_reason_uncertain')
assert.equal(practiceReasonKey({ practice: { reason: 'invented' } }), '')

const cleared = applyFeedbackToSummary({
  percent: 40,
  matched: 1,
  uncertain: 2,
  mismatch: 3,
  skipped: 1,
  attention: 6,
  hasDetailedCounts: true,
}, { valid: false, quality: 'invalid' })
assert.equal(cleared.percent, null)
assert.equal(cleared.mismatch, null)
assert.equal(cleared.hasDetailedCounts, false)

const uncertain = applyFeedbackToSummary({
  percent: 80,
  matched: 4,
  uncertain: 0,
  mismatch: 2,
  skipped: 0,
  hasDetailedCounts: true,
}, {
  valid: true,
  quality: 'usable',
  wording: { percent: 80, matched: 4, uncertain: 2, mismatch: 0, skipped: 0, differences_reliable: true },
})
assert.equal(uncertain.uncertain, 2)
assert.equal(uncertain.mismatch, 0)
assert.equal(uncertain.matched, 4)

const hiddenTeacher = teacherReviewOf({ teacher_review: { visible: true, authority: 'ai_suggestion', note: 'secret' } })
assert.equal(hiddenTeacher, null)
const visibleTeacher = teacherReviewOf({
  teacher_review: { visible: true, authority: 'teacher', note: 'Lengthen the madd.', tajweed_score: 7, is_tajweed: true },
})
assert.equal(visibleTeacher.note, 'Lengthen the madd.')
assert.equal(visibleTeacher.is_tajweed, true)

assert.match(dashboard, /progressAiRevision/)
assert.match(dashboard, /feedbackPracticeHref\(item\)/)
assert.match(dashboard, /practiceRevisionHref/)
assert.match(dashboard, /data-testid="ai-revision-practice"/)
assert.match(card, /data-testid="ai-feedback-practice"/)
assert.match(card, /data-testid="ai-feedback-teacher-review"/)
assert.match(card, /not_tajweed_note/)
assert.match(card, /teacherReviewOf/)
assert.match(card, /differences_reliable === false/)

console.log('student-ai-feedback.test.mjs: ok')
