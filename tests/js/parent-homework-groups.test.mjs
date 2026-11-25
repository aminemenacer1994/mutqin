import assert from 'node:assert/strict'
import { groupHomeworkRows, homeworkGroupKey } from '../../resources/js/scripts/parent/homeworkGroups.js'

assert.equal(homeworkGroupKey({ display_status: 'overdue' }), 'overdue')
assert.equal(homeworkGroupKey({ display_status: 'completed' }), 'done')

const groups = groupHomeworkRows([
  { id: 1, display_status: 'overdue' },
  { id: 2, display_status: 'in_progress' },
  { id: 3, display_status: 'completed' },
])

assert.equal(groups.length, 3)
assert.equal(groups[0].key, 'overdue')
assert.equal(groups[0].rows.length, 1)

console.log('parent-homework-groups.test.mjs: ok')