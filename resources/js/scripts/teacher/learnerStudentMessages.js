/**
 * Student Messages workspace helpers (inbox list sorting, previews, unread).
 */

export function threadMessages(thread) {
  return Array.isArray(thread?.messages) ? thread.messages : []
}

export function threadLastAt(thread) {
  const messages = threadMessages(thread)
  if (!messages.length) return ''
  return messages[messages.length - 1]?.created_at || ''
}

export function threadPreview(thread) {
  const messages = threadMessages(thread)
  if (!messages.length) return ''
  const last = messages[messages.length - 1]
  return String(last?.preview || last?.body || '').trim()
}

export function directThreadUnreadCount(thread) {
  return threadMessages(thread).filter((message) => message.unread && message.sender === 'teacher').length
}

export function sortTeacherThreads(threads) {
  return [...(Array.isArray(threads) ? threads : [])].sort((a, b) => {
    const atA = threadLastAt(a)
    const atB = threadLastAt(b)
    if (atA && atB) return atB.localeCompare(atA)
    if (atA) return -1
    if (atB) return 1
    return String(a?.teacher_name || '').localeCompare(String(b?.teacher_name || ''))
  })
}

export function mergeThreadMessages(existing, incoming) {
  const rows = [...(Array.isArray(existing) ? existing : []), ...(Array.isArray(incoming) ? incoming : [])]
  return [...new Map(rows.map((row) => [row.id, row])).values()].sort(
    (left, right) => String(left.created_at || '').localeCompare(String(right.created_at || '')) || Number(left.id) - Number(right.id),
  )
}

export function patchThreadRow(threads, teacherId, messages) {
  const id = Number(teacherId)
  return (Array.isArray(threads) ? threads : []).map((row) => (
    Number(row.teacher_id) === id ? { ...row, messages: messages || row.messages } : row
  ))
}

export function filterTeacherThreads(threads, { query = '', unreadOnly = false } = {}) {
  let filtered = Array.isArray(threads) ? threads : []
  if (unreadOnly) {
    filtered = filtered.filter((row) => directThreadUnreadCount(row) > 0)
  }
  const needle = String(query || '').trim().toLocaleLowerCase()
  if (needle) {
    filtered = filtered.filter((row) => {
      const haystack = `${row.teacher_name || ''} ${threadPreview(row) || ''}`.toLocaleLowerCase()
      return haystack.includes(needle)
    })
  }
  return sortTeacherThreads(filtered)
}

/** @returns {'feedback'|'assignment'|''} */
export function threadLastActivityKind(thread) {
  const messages = threadMessages(thread)
  if (!messages.length) return ''
  const last = messages[messages.length - 1]
  if (last?.feedback_type && last.feedback_type !== 'message') return 'feedback'
  if (last?.task?.id || last?.message_kind === 'note') return 'assignment'
  if (last?.message_kind === 'feedback') return 'feedback'
  return ''
}