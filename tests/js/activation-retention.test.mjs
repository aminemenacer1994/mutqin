import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { pickDashboardPrimaryKind } from '../../resources/js/scripts/dashboard/primaryAction.js'
import {
  memorisationGoalHref,
  normaliseSessionGoal,
  sessionGoalToMode,
} from '../../resources/js/scripts/session/sessionGoal.js'
import { resumeFieldsFromBackendSession } from '../../resources/js/scripts/session/sessionLifecycle.js'
import {
  rememberSessionFeedbackPrompt,
  shouldOfferSessionFeedback,
  SESSION_FEEDBACK_PROMPT_GAP_MS,
} from '../../resources/js/scripts/feedback/sessionPrompt.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const dashboardVue = readFileSync(join(root, 'resources/js/views/Dashboard.vue'), 'utf8')

assert.equal(normaliseSessionGoal('revision'), 'revise')
assert.equal(normaliseSessionGoal('recite'), 'test')
assert.equal(normaliseSessionGoal(''), 'memorise')
assert.equal(sessionGoalToMode('revise'), 'revision')
assert.equal(sessionGoalToMode('test'), 'new_learning')
assert.equal(memorisationGoalHref('/memorisation', 'test'), '/memorisation?setup=1&goal=test')
assert.equal(
  memorisationGoalHref('/memorisation?panel=saved', 'revise'),
  '/memorisation?panel=saved&setup=1&goal=revise',
)

assert.equal(pickDashboardPrimaryKind({ hasSaved: true, review: { href: '/r' }, journey: { href: '/j' } }), 'saved')
assert.equal(pickDashboardPrimaryKind({
  review: { href: '/r' },
  journey: { href: '/j' },
  remembered: 3,
  rangeTotal: 5,
}), 'journey')
assert.equal(pickDashboardPrimaryKind({
  review: { href: '/r' },
  journey: { href: '/j' },
  remembered: 5,
  rangeTotal: 5,
}), 'revise')
assert.equal(pickDashboardPrimaryKind({
  review: { href: '/r' },
  journey: { href: '/j' },
  continueActionType: 'resume_session',
}), 'journey')
assert.equal(pickDashboardPrimaryKind({
  review: { href: '/r' },
  journey: { href: '/j' },
  continueActionType: 'continue_range',
}), 'journey')
assert.equal(pickDashboardPrimaryKind({}), 'fresh')

const resumed = resumeFieldsFromBackendSession({
  id: 9,
  surah_number: 2,
  ayah_number: 1,
  current_step: 0,
  status: 'interrupted',
  metadata: {
    current_index: 4,
    config: { chapterId: 2, rangeStart: 1, rangeEnd: 7 },
  },
})
assert.equal(resumed.chapterId, 2)
assert.equal(resumed.queueIndex, 4)
assert.equal(resumed.activeVerseKey, '2:5')
assert.equal(resumeFieldsFromBackendSession({ surah_number: 0 }), null)

const memory = new Map()
const storage = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => memory.set(key, value),
}
const now = 1_700_000_000_000
assert.equal(shouldOfferSessionFeedback(storage, now), true)
rememberSessionFeedbackPrompt(storage, now)
assert.equal(shouldOfferSessionFeedback(storage, now + 1000), false)
assert.equal(shouldOfferSessionFeedback(storage, now + SESSION_FEEDBACK_PROMPT_GAP_MS), true)

assert.match(memorisationVue, /session-goal/)
assert.match(memorisationVue, /sessionGoalOptions/)
assert.match(memorisationVue, /openSessionFeedbackPrompt/)
assert.doesNotMatch(memorisationVue, /data-testid="revise-current-range"/)
assert.match(dashboardVue, /pickDashboardPrimaryKind/)
assert.match(dashboardVue, /testRecitationHref/)
assert.match(dashboardVue, /open_practice/)

console.log('activation-retention passed')
