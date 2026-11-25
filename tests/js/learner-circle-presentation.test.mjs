import assert from 'node:assert/strict'
import {
  REGISTRATION_CLASS_NAME,
  buildRelationshipGroups,
  displayClassName,
  learnerCircleCompactSummary,
  relationshipOrganisationKey,
} from '../../resources/js/scripts/dashboard/learnerCirclePresentation.js'

const t = (key, params = {}) => {
  const table = {
    'ui.connections_class_general': 'General class',
    'ui.connections_summary_teachers_pending': `${params.teachers} teachers · ${params.pending} pending`,
    'ui.connections_summary_teachers_connected': `${params.count} connected teachers`,
    'ui.connections_summary_classes_pending': `${params.count} class requests pending`,
    'ui.connections_summary_classes_active': `${params.count} active classes`,
    'ui.connections_status_none': 'Not connected yet',
  }
  return table[key] || key
}

assert.equal(displayClassName(REGISTRATION_CLASS_NAME, t), 'General class')
assert.equal(displayClassName('Beginners', t), 'Beginners')
assert.equal(relationshipOrganisationKey({ independent: true }), 'independent')
assert.equal(relationshipOrganisationKey({ organisation_name: 'Al-Noor' }), 'org:al-noor')

const groups = buildRelationshipGroups({
  memberships: [
    { id: 1, status: 'approved', independent: false, organisation_name: 'Al-Noor', group: { name: 'Beginners' } },
    { id: 2, status: 'pending', independent: true, organisation_name: null, group: { name: REGISTRATION_CLASS_NAME } },
  ],
  teachers: [
    { id: 10, name: 'Ustadh Ali', independent: false, organisation_name: 'Al-Noor', learning_areas: [{ kind: 'group', label: 'Beginners' }] },
    { id: 11, name: 'Ustadh Sam', independent: true, organisation_name: null, learning_areas: [] },
  ],
}, t)

assert.equal(groups.length, 2)
assert.equal(groups[0].organisationName, 'Al-Noor')
assert.equal(groups[0].classes.length, 1)
assert.equal(groups[0].teachers.length, 1)
assert.equal(groups[1].independent, true)
assert.equal(groups[1].classes[0].name, 'General class')

assert.equal(
  learnerCircleCompactSummary({ teachers: [{ id: 1 }], memberships: [{ status: 'pending' }] }, t),
  '1 teachers · 1 pending',
)
assert.equal(learnerCircleCompactSummary(null, t), 'Not connected yet')

console.log('learner-circle-presentation.test.mjs: ok')