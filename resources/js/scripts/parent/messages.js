export function createSearchDebouncer(delayMs = 280) {
  let timer = null
  return {
    push(callback) {
      if (timer) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        callback()
      }, delayMs)
    },
    cancel() {
      if (timer) clearTimeout(timer)
      timer = null
    },
  }
}

export function filterConversations(conversations, { selectedId = null, query = '', unreadOnly = false } = {}) {
  const rows = Array.isArray(conversations) ? conversations : []
  let filtered = rows
  if (selectedId) {
    filtered = filtered.filter((row) => row.child_id === selectedId)
  }
  if (unreadOnly) {
    filtered = filtered.filter((row) => Number(row.unread || 0) > 0)
  }
  const needle = String(query || '').trim().toLocaleLowerCase()
  if (needle) {
    filtered = filtered.filter((row) => {
      const haystack = `${row.teacher_name || ''} ${row.child_name || ''} ${row.preview || ''}`.toLocaleLowerCase()
      return haystack.includes(needle)
    })
  }
  return filtered
}

export function matchContextFeedback(feedback, active) {
  if (!active || !Array.isArray(feedback)) return null
  return (
    feedback.find(
      (item) =>
        item.child_id === active.child_id
        && (item.teacher_id === active.teacher_id
          || (!item.teacher_id && item.teacher_name && item.teacher_name === active.teacher_name)),
    ) || null
  )
}

function normaliseThreadText(value) {
  return String(value || '').trim().toLocaleLowerCase()
}

export function contextFeedbackForThread(feedback, active, messages = []) {
  const row = matchContextFeedback(feedback, active)
  if (!row?.excerpt) return null
  const excerpt = normaliseThreadText(row.excerpt)
  if (!excerpt) return null
  const rows = Array.isArray(messages) ? messages : []
  const duplicated = rows.some((message) => {
    const body = normaliseThreadText(message?.body)
    return body && (body === excerpt || body.includes(excerpt) || excerpt.includes(body))
  })
  return duplicated ? null : row
}

export function conversationKey(row) {
  return `${row.teacher_id}-${row.child_id}`
}