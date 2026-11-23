import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pickDashboardPrimaryKind } from '../../resources/js/scripts/dashboard/primaryAction.js'
import { homeAttentionAssignments, homeUpcomingAssignments } from '../../resources/js/scripts/dashboard/studentHome.js'
import { dailyMutqinHref, memorisationGoalHref } from '../../resources/js/scripts/session/sessionGoal.js'

const now = new Date('2026-03-15T12:00:00')

const correction = { id: 1, status: 'in_progress', review_state: 'needs_correction', assignment: { due_at: '2026-03-20T00:00:00' } }
const overdue = { id: 2, status: 'overdue', assignment: { due_at: '2026-03-10T00:00:00' } }
const today = { id: 3, status: 'pending', assignment: { due_at: '2026-03-15T18:00:00' } }
const tomorrow = { id: 4, status: 'pending', assignment: { due_at: '2026-03-16T18:00:00' } }
const later = { id: 5, status: 'pending', assignment: { due_at: '2026-03-25T00:00:00' } }
const undated = { id: 6, status: 'pending', assignment: {} }
const submitted = { id: 7, status: 'awaiting_confirmation', review_state: 'submitted', assignment: { due_at: '2026-03-14T00:00:00' } }
const approved = { id: 8, status: 'completed', review_state: 'approved', assignment: { due_at: '2026-03-12T00:00:00' } }

const rows = [later, approved, undated, tomorrow, submitted, today, overdue, correction]
const attention = homeAttentionAssignments(rows, now)
assert.deepEqual(attention.map((row) => row.id), [1, 2, 3])

const upcoming = homeUpcomingAssignments(rows, attention.map((row) => row.id), now)
assert.deepEqual(upcoming.map((row) => row.id), [4, 5, 6])
assert.equal(homeUpcomingAssignments([tomorrow], [4], now).length, 0)
assert.equal(homeAttentionAssignments([submitted, approved, later], now).length, 0)
assert.equal(homeAttentionAssignments([{ ...today, teacher_access: false }], now).length, 0)
assert.equal(homeUpcomingAssignments([{ ...later, teacher_access: false }], [], now).length, 0)

assert.equal(pickDashboardPrimaryKind({ hasSaved: true, journey: { href: '/memorisation?surah=1' } }), 'saved')
const resume = dailyMutqinHref('/memorisation', { surah: 2, from: 1, to: 5, resume: true, session: 44 })
assert.equal(new URL(resume, 'https://mutqin.test').searchParams.get('session'), '44')
assert.equal(new URL(resume, 'https://mutqin.test').searchParams.get('resume'), '1')
const setup = memorisationGoalHref('/memorisation?ignored=1', 'test')
assert.equal(new URL(setup, 'https://mutqin.test').searchParams.get('setup'), '1')
assert.equal(new URL(setup, 'https://mutqin.test').searchParams.get('goal'), 'test')
assert.equal(new URL(setup, 'https://mutqin.test').searchParams.get('session'), null)

const dashboard = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const home = dashboard.slice(dashboard.indexOf("studentPane === 'home'"), dashboard.indexOf("studentPane === 'learning'"))
assert.match(home, /data-testid="dashboard-primary-continue"/)
assert.match(home, /:href="primaryContinueAction\.href"/)
assert.match(home, /dashboard\.home_attention/)
assert.match(home, /dashboard\.home_upcoming/)
assert.match(home, /learner-home__feedback/)
assert.match(home, /learner-home__skeleton/)
assert.match(home, /openHomeFeedback/)
assert.doesNotMatch(home, /startSession\(/)

console.log('student-home.test.mjs: ok')
