export function learnerConnectionPhase(circle) {
  if (!circle || typeof circle !== 'object') return 'none'
  const teachers = Array.isArray(circle.teachers) ? circle.teachers : []
  if (teachers.length > 0) return 'connected'
  const memberships = Array.isArray(circle.memberships) ? circle.memberships : []
  const active = memberships.filter((row) => {
    const status = String(row?.status || '').toLowerCase()
    return status === 'approved' || status === 'pending'
  })
  if (active.some((row) => String(row?.status || '').toLowerCase() === 'approved')) return 'connected'
  if (active.length) return 'pending'
  if (circle.institution && typeof circle.institution === 'object') return 'pending'
  return 'none'
}

export function learnerCircleHasNetwork(circle) {
  if (!circle || typeof circle !== 'object') return false
  const teachers = Array.isArray(circle.teachers) ? circle.teachers.length : 0
  if (teachers > 0) return true
  const memberships = Array.isArray(circle.memberships) ? circle.memberships : []
  return memberships.some((row) => row?.status === 'approved' || row?.status === 'pending')
}

/**
 * Standalone individuals are hidden from teacher-linked UI; connected learners see the full workspace.
 */
export function learnerHasLearningNetwork({ auth, support, supportLoading = false } = {}) {
  if (auth?.learner_teacher_section_enabled !== true) return false

  const circle = support?.circle
  if (circle && typeof circle === 'object') {
    return learnerCircleHasNetwork(circle)
  }

  if (support && !supportLoading) {
    return auth?.learner_learning_network_connected === true
  }

  if (supportLoading) {
    return auth?.learner_learning_network_connected === true
  }

  return auth?.learner_learning_network_connected === true
}