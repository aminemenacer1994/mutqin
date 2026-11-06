export const SESSION_FEEDBACK_PROMPT_KEY = 'mutqin.feedback.sessionPromptAt'
export const SESSION_FEEDBACK_PROMPT_GAP_MS = 7 * 24 * 60 * 60 * 1000

export function shouldOfferSessionFeedback(storage, now = Date.now()) {
  if (!storage || typeof storage.getItem !== 'function') return true
  let raw = ''
  try {
    raw = storage.getItem(SESSION_FEEDBACK_PROMPT_KEY) || ''
  } catch {
    return true
  }
  const at = Number(raw)
  if (!Number.isFinite(at) || at <= 0) return true
  return (now - at) >= SESSION_FEEDBACK_PROMPT_GAP_MS
}

export function rememberSessionFeedbackPrompt(storage, now = Date.now()) {
  if (!storage || typeof storage.setItem !== 'function') return
  try {
    storage.setItem(SESSION_FEEDBACK_PROMPT_KEY, String(now))
  } catch {
    /* private mode */
  }
}
