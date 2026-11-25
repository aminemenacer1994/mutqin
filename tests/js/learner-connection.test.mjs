import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import {
  learnerCircleHasNetwork,
  learnerConnectionPhase,
  learnerHasLearningNetwork,
} from '../../resources/js/scripts/dashboard/learnerConnection.js'
import { studentNavItems } from '../../resources/js/scripts/dashboard/studentDashboardNavigation.js'

assert.equal(learnerCircleHasNetwork(null), false)
assert.equal(learnerCircleHasNetwork({ teachers: [], memberships: [] }), false)
assert.equal(learnerCircleHasNetwork({ teachers: [{ id: 1 }], memberships: [] }), true)
assert.equal(
  learnerCircleHasNetwork({ teachers: [], memberships: [{ status: 'pending' }] }),
  true,
)

assert.equal(learnerConnectionPhase(null), 'none')
assert.equal(learnerConnectionPhase({ teachers: [{ id: 1 }], memberships: [] }), 'connected')
assert.equal(learnerConnectionPhase({ teachers: [], memberships: [{ status: 'pending' }] }), 'pending')

const standalone = learnerHasLearningNetwork({
  auth: { learner_teacher_section_enabled: true, learner_learning_network_connected: false },
  support: null,
})
assert.equal(standalone, false)

const connected = learnerHasLearningNetwork({
  auth: { learner_teacher_section_enabled: true, learner_learning_network_connected: true },
  support: { circle: { teachers: [], memberships: [{ status: 'approved' }] } },
})
assert.equal(connected, true)

const disconnectedAfterSupport = learnerHasLearningNetwork({
  auth: { learner_teacher_section_enabled: true, learner_learning_network_connected: true },
  support: { circle: { teachers: [], memberships: [] } },
})
assert.equal(disconnectedAfterSupport, false)

const navStandalone = studentNavItems({ learning: false, messaging: false })
assert.deepEqual(navStandalone.map((item) => item.id), ['home', 'practice', 'progress', 'activity'])

const navConnected = studentNavItems({ learning: true, messaging: true })
assert.deepEqual(navConnected.map((item) => item.id), ['home', 'learning', 'practice', 'progress', 'activity', 'messages'])

const dashboard = readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
assert.match(dashboard, /learnerHasLearningNetwork/)
assert.match(dashboard, /learnerLearningNetworkConnected/)
assert.match(dashboard, /v-if="showLearnerTeacherSection"[\s\S]*id="progress-feedback"/)
assert.match(dashboard, /learning: this\.learnerLearningNetworkConnected/)
assert.match(dashboard, /LearnerSettingsSection/)
assert.match(dashboard, /learnerConnectSettingsHref/)

console.log('learner-connection.test.mjs: ok')