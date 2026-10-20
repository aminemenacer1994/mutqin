export function teacherErrorMessage(error, t) {
  const errors = error?.response?.data?.errors
  if (errors && typeof errors === 'object') {
    const first = Object.values(errors).flat()[0]
    if (first) return String(first)
  }
  if (error?.response?.status === 404) return t('teacher.student_unavailable')
  return error?.response?.data?.message || t('teacher.action_failed')
}
