import assert from 'node:assert/strict'
import fs from 'node:fs'
import { pickDashboardPrimaryKind } from '../../resources/js/scripts/dashboard/primaryAction.js'
import {
  buildHomeAttentionRows,
  homeAttentionAssignmentIds,
  homeAttentionAssignments,
  homeAttentionTailRows,
  homeNextActionItem,
  homeUpcomingAssignments,
} from '../../resources/js/scripts/dashboard/studentHome.js'
import { dailyMutqinHref, memorisationGoalHref } from '../../resources/js/scripts/session/sessionGoal.js'

const now = new Date('2026-03-15T12:00:00')

const correction = { id: 1, status: 'in_progress', review_state: 'needs_correction', assignment: { due_at: '2026-03-20T00:00:00' } }
const overdue = { id: 2, status: 'overdue', assignment: { due_at: '2026-03-10T00:00:00' } }
const today = { id: 3, status: 'pending', assignment: { due_at: '2026-03-15T18:00:00' } }
const tomorrow = { id: 4, status: 'pending', assignment: { due_at: '2026-03-16T18:00:00' } }
const dueSoon = { id: 9, status: 'pending', assignment: { due_at: '2026-03-17T18:00:00' } }
const later = { id: 5, status: 'pending', assignment: { due_at: '2026-03-25T00:00:00' } }
const undated = { id: 6, status: 'pending', assignment: {} }
const submitted = { id: 7, status: 'awaiting_confirmation', review_state: 'submitted', assignment: { due_at: '2026-03-14T00:00:00' } }
const approved = { id: 8, status: 'completed', review_state: 'approved', assignment: { due_at: '2026-03-12T00:00:00' } }

const rows = [later, approved, undated, dueSoon, tomorrow, submitted, today, overdue, correction]
const attention = homeAttentionAssignments(rows, now)
assert.deepEqual(attention.map((row) => row.id), [1, 2, 3])

const feedback = { id: 77, unread: true, created_at: '2026-03-15T08:00:00Z', preview: 'Nice effort' }
const mixed = buildHomeAttentionRows(rows, feedback, now)
assert.equal(mixed[0].kind, 'assignment')
assert.equal(mixed[0].row.id, 1)
assert.equal(mixed[1].row.id, 2)
assert.equal(mixed[2].kind, 'feedback')
assert.equal(mixed[3].row.id, 3)

const next = homeNextActionItem(mixed)
assert.equal(next.row.id, 1)
const tail = homeAttentionTailRows(mixed, next)
assert.equal(tail.length, 3)
assert.equal(tail[0].row.id, 2)

const upcoming = homeUpcomingAssignments(rows, homeAttentionAssignmentIds(mixed), now)
assert.deepEqual(upcoming.map((row) => row.id), [4, 9, 5])
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
assert.match(home, /data-testid="dashboard-home-next-action"/)
assert.match(home, /data-testid="dashboard-primary-continue"/)
assert.match(home, /:href="primaryContinueAction\.href"/)
assert.match(home, /homeMoreAttentionRows/)
assert.match(dashboard, /buildStudentPracticeTools|studentPracticeTools/)
assert.match(home, /dashboard\.home_attention/)
assert.match(home, /dashboard\.home_upcoming/)
assert.match(home, /homeMoreAttentionRows/)
assert.match(home, /learner-home__skeleton/)
assert.match(home, /openHomeFeedback/)
assert.match(home, /learner-home__stack/)
assert.match(home, /learner-home__tools-pane/)
assert.match(home, /learner-home__progress-metrics/)
assert.match(home, /learner-home__revision-row--link/)
assert.doesNotMatch(home, /startSession\(/)
assert.doesNotMatch(home, /homeRecentFeedback/)

console.log('student-home.test.mjs: ok')