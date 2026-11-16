import assert from 'node:assert/strict'
import fs from 'node:fs'

const source = fs.readFileSync(new URL('../../resources/js/views/Dashboard.vue', import.meta.url), 'utf8')
const body = source.match(/async loadLearnerSupport\(\) \{([\s\S]*?)\n    \},\n    async startSupportAssignment/)[1]
const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor
const refresh = new AsyncFunction('learningApi', body)
const state = { supportRequestId: 0, assignmentSavingId: 0, support: null, supportLoading: false, supportError: '', t: key => key }
const pending = []
const api = { getLearnerSupport: () => new Promise((resolve, reject) => pending.push({ resolve, reject })) }

const older = refresh.call(state, api)
const newer = refresh.call(state, api)
pending[1].resolve({ assignments: [{ id: 2, status: 'in_progress' }] })
await newer
pending[0].resolve({ assignments: [{ id: 2, status: 'pending' }] })
await older
assert.equal(state.support.assignments[0].status, 'in_progress', 'An older refresh cannot restore stale task progress')
assert.equal(state.supportLoading, false)

const staleFailure = refresh.call(state, api)
const latest = refresh.call(state, api)
pending[3].resolve({ assignments: [{ id: 3, status: 'completed' }] })
await latest
pending[2].reject(new Error('An older request failed'))
await staleFailure
assert.equal(state.supportError, '', 'An obsolete network error cannot replace a successful refresh')
assert.equal(state.support.assignments[0].id, 3)

state.assignmentSavingId = 3
await refresh.call(state, api)
assert.equal(pending.length, 4, 'Support polling waits while a task mutation is in progress')
console.log('Learner support refresh sequencing passed')
