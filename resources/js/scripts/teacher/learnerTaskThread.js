import { formatLearnerDisplayDate } from '../../utils/learnerDisplayDate.js'

export const LEARNER_VOICE_MAX_MS = 60000
export const SEND_COOLDOWN_MS = 1200
export const DRAFT_STORAGE_PREFIX = 'mutqin.learner.task-thread.draft.'

const HTML_TAG_RE = /<[^>]*>/g

export function sanitizeThreadText(value) {
  if (value === null || value === undefined) return ''
  return String(value).replace(HTML_TAG_RE, '').trim()
}

/**
 * @param {object} raw API message row
 * @param {number|string} taskId recipient id
 */
export function normalizeThreadMessage(raw, taskId) {
  if (!raw || typeof raw !== 'object') return null
  const senderRole = raw.sender === 'teacher' || raw.senderRole === 'teacher' ? 'teacher' : 'student'
  const hasVoice = Boolean(raw.audio?.available && raw.audio?.url) || raw.type === 'voice'
  return {
    id: raw.id ?? raw.client_message_id ?? `tmp-${Math.random()}`,
    taskId: Number(taskId),
    senderRole,
    type: hasVoice ? 'voice' : 'text',
    body: sanitizeThreadText(raw.body),
    audioUrl: raw.audio?.url ?? raw.audioUrl ?? null,
    durationMs: Number(raw.audio?.duration_ms ?? raw.durationMs ?? 0) || null,
    sentAt: raw.created_at ?? raw.sentAt ?? null,
    readAt: raw.read_at ?? raw.readAt ?? null,
    unread: Boolean(raw.unread),
    delivery_status: raw.delivery_status ?? (raw.readAt || raw.read_at ? 'read' : 'sent'),
    pending: Boolean(raw.pending),
    failed: Boolean(raw.failed),
    clientMessageId: raw.client_message_id ?? raw.clientMessageId ?? null,
  }
}

export function normalizeThreadMessages(list, taskId) {
  return (Array.isArray(list) ? list : [])
    .map((row) => normalizeThreadMessage(row, taskId))
    .filter(Boolean)
    .sort((a, b) => String(a.sentAt || '').localeCompare(String(b.sentAt || '')) || Number(a.id) - Number(b.id))
}

export function threadUnreadCount(messages) {
  return (messages || []).filter(
    (message) => message.senderRole === 'teacher' && (message.unread || (!message.readAt && message.senderRole === 'teacher')),
  ).length
}

/**
 * @param {Array<object>} messages normalized
 * @param {(key: string, params?: object) => string} t
 * @param {string} locale
 * @param {Date} [now]
 */
export function groupThreadMessagesByDay(messages, t, locale, now = new Date()) {
  const groups = []
  let currentKey = null
  for (const message of messages || []) {
    const dayKey = message.sentAt ? String(message.sentAt).slice(0, 10) : 'unknown'
    if (dayKey !== currentKey) {
      currentKey = dayKey
      const label = message.sentAt
        ? formatLearnerDisplayDate(message.sentAt, t, locale, now)
        : t('teacher.unavailable')
      groups.push({ dayKey, label, messages: [] })
    }
    groups[groups.length - 1].messages.push(message)
  }
  return groups
}

/** Latest outgoing (student) message id for read receipt row. */
export function latestStudentMessageId(messages) {
  const students = (messages || []).filter((m) => m.senderRole === 'student' && !m.pending && !m.failed)
  return students.length ? students[students.length - 1].id : null
}

export function shouldShowReadReceipt(message, messages) {
  if (message.senderRole !== 'student') return false
  return latestStudentMessageId(messages) === message.id
}

export function readReceiptLabel(message, t) {
  if (message.delivery_status === 'read' || message.readAt) {
    return t('teacher.learner_message_seen')
  }
  return t('teacher.message_sent_status')
}

export function createOptimisticMessage(taskId, body, recording, clientMessageId) {
  const hasVoice = Boolean(recording?.blob)
  return {
    id: `optimistic-${clientMessageId}`,
    taskId: Number(taskId),
    senderRole: 'student',
    type: hasVoice ? 'voice' : 'text',
    body: sanitizeThreadText(body),
    audioUrl: hasVoice ? URL.createObjectURL(recording.blob) : null,
    durationMs: hasVoice ? Number(recording.durationMs || 0) : null,
    sentAt: new Date().toISOString(),
    readAt: null,
    unread: false,
    delivery_status: 'sent',
    pending: true,
    failed: false,
    clientMessageId,
  }
}

export function markOptimisticFailed(messages, optimisticId) {
  return (messages || []).map((message) => (
    message.id === optimisticId ? { ...message, pending: false, failed: true } : message
  ))
}

export function replaceOptimisticMessage(messages, optimisticId, serverMessage) {
  return (messages || [])
    .filter((message) => message.id !== optimisticId)
    .concat([serverMessage])
    .sort((a, b) => String(a.sentAt || '').localeCompare(String(b.sentAt || '')) || Number(a.id) - Number(b.id))
}

export function messagePreviewFromRow(raw) {
  if (!raw || typeof raw !== 'object') return ''
  const body = sanitizeThreadText(raw.body)
  if (body) return body.slice(0, 120)
  if (raw.audio?.available || raw.type === 'voice') return 'voice'
  return ''
}

/**
 * Immutable support patch after thread send/refetch (fixes prop mutation in child).
 */
export function applyAssignmentThreadUpdate(support, { taskId, messages, append, threadUnreadCount } = {}) {
  if (!support || !Array.isArray(support.assignments)) return support
  const id = Number(taskId)
  return {
    ...support,
    assignments: support.assignments.map((row) => {
      if (Number(row.id) !== id) return row
      let nextMessages = Array.isArray(row.messages) ? [...row.messages] : []
      if (append) {
        const appendId = append.id ?? append.client_message_id
        const exists = nextMessages.some((m) => (
          (appendId != null && Number(m.id) === Number(appendId))
          || (append.client_message_id && m.client_message_id === append.client_message_id)
        ))
        if (!exists) nextMessages.push(append)
      } else if (Array.isArray(messages)) {
        nextMessages = messages
      }
      const previewSource = append || nextMessages[nextMessages.length - 1]
      return {
        ...row,
        messages: nextMessages,
        thread_unread_count: threadUnreadCount ?? row.thread_unread_count ?? 0,
        last_message_preview: messagePreviewFromRow(previewSource) || row.last_message_preview,
      }
    }),
  }
}

export function mergeThreadAppendMessages(existing, append, taskId) {
  const normalized = normalizeThreadMessage(append, taskId)
  if (!normalized) return existing || []
  const list = Array.isArray(existing) ? [...existing] : []
  const dup = list.some((m) => (
    Number(m.id) === Number(normalized.id)
    || (normalized.clientMessageId && m.clientMessageId === normalized.clientMessageId)
  ))
  if (dup) return list
  return [...list, normalized].sort(
    (a, b) => String(a.sentAt || '').localeCompare(String(b.sentAt || '')) || String(a.id).localeCompare(String(b.id)),
  )
}

export function canSendNow(lastSentAtMs, now = Date.now(), cooldownMs = SEND_COOLDOWN_MS) {
  if (!lastSentAtMs) return true
  return now - lastSentAtMs >= cooldownMs
}

export function draftStorageKey(taskId) {
  return `${DRAFT_STORAGE_PREFIX}${taskId}`
}

export function loadThreadDraft(taskId) {
  if (typeof sessionStorage === 'undefined') return ''
  try {
    return sessionStorage.getItem(draftStorageKey(taskId)) || ''
  } catch {
    return ''
  }
}

export function saveThreadDraft(taskId, draft) {
  if (typeof sessionStorage === 'undefined') return
  try {
    const key = draftStorageKey(taskId)
    const value = String(draft || '')
    if (!value.trim()) {
      sessionStorage.removeItem(key)
      return
    }
    sessionStorage.setItem(key, value)
  } catch {
    // ignore
  }
}

/** Recorder UI state machine (tests). */
export function recordingStateReducer(state, event) {
  const s = state || 'idle'
  switch (event) {
    case 'request':
      if (s === 'idle') return 'requesting'
      return s
    case 'start':
      if (s === 'requesting') return 'recording'
      return s
    case 'stop':
      if (s === 'recording') return 'recorded'
      return s
    case 'discard':
      return 'idle'
    case 'permission_denied':
      return 'error'
    case 'send':
      if (s === 'recorded') return 'idle'
      return s
    default:
      return s
  }
}

export function recordingAnnouncement(state, t) {
  if (state === 'recording') return t('teacher.recording_voice_note')
  if (state === 'requesting') return t('teacher.preparing_recording')
  if (state === 'recorded') return t('teacher.voice_note_ready')
  if (state === 'error') return t('teacher.microphone_unavailable')
  return ''
}
