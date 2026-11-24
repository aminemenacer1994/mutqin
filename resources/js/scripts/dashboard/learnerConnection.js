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