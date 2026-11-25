export const REGISTRATION_CLASS_NAME = 'Shared class'

export function displayClassName(name, t) {
  const trimmed = String(name || '').trim()
  if (!trimmed || trimmed === REGISTRATION_CLASS_NAME) {
    return typeof t === 'function' ? t('ui.connections_class_general') : 'General class'
  }
  return trimmed
}

export function relationshipOrganisationKey(row) {
  if (row?.independent) return 'independent'
  const name = String(row?.organisation_name || '').trim()
  if (name) return `org:${name.toLowerCase()}`
  return 'independent'
}

export function buildRelationshipGroups(circle, t) {
  const memberships = (Array.isArray(circle?.memberships) ? circle.memberships : [])
    .filter((row) => row.status === 'pending' || row.status === 'approved')
  const teachers = Array.isArray(circle?.teachers) ? circle.teachers : []

  const groups = new Map()

  const ensureGroup = (key, seed) => {
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        organisationName: key === 'independent' ? null : (seed?.organisation_name || null),
        independent: key === 'independent',
        classes: [],
        teachers: [],
      })
    }
    return groups.get(key)
  }

  for (const membership of memberships) {
    const key = relationshipOrganisationKey(membership)
    const group = ensureGroup(key, membership)
    group.classes.push({
      id: membership.id,
      name: displayClassName(membership.group?.name, t),
      rawName: membership.group?.name,
      status: membership.status,
      consent: membership.consent,
      canLeave: membership.can_leave,
      leaveRestricted: membership.leave_restricted,
      membership,
    })
  }

  for (const teacher of teachers) {
    const key = relationshipOrganisationKey(teacher)
    const group = ensureGroup(key, teacher)
    group.teachers.push(teacher)
  }

  const rows = Array.from(groups.values())
  rows.sort((a, b) => {
    if (a.independent !== b.independent) return a.independent ? 1 : -1
    const an = String(a.organisationName || '').toLowerCase()
    const bn = String(b.organisationName || '').toLowerCase()
    return an.localeCompare(bn)
  })

  return rows
}

export function learnerCircleCompactSummary(circle, t) {
  const teachers = Array.isArray(circle?.teachers) ? circle.teachers.length : 0
  const memberships = Array.isArray(circle?.memberships) ? circle.memberships : []
  const pending = memberships.filter((row) => row.status === 'pending').length
  const approvedClasses = memberships.filter((row) => row.status === 'approved').length

  if (teachers && pending) {
    return t('ui.connections_summary_teachers_pending', { teachers, pending })
  }
  if (teachers) {
    return t('ui.connections_summary_teachers_connected', { count: teachers })
  }
  if (pending) {
    return t('ui.connections_summary_classes_pending', { count: pending })
  }
  if (approvedClasses) {
    return t('ui.connections_summary_classes_active', { count: approvedClasses })
  }
  return t('ui.connections_status_none')
}