/**
 * Strip secrets, tokens, raw audio, and scripture/PII before any client
 * error is logged or posted to the backend ingest.
 */

const SENSITIVE_KEY_FRAGMENTS = [
  'password',
  'passwd',
  'secret',
  'token',
  'api_key',
  'apikey',
  'authorization',
  'bearer',
  'cookie',
  'csrf',
  'xsrf',
  'jwt',
  'remember_token',
  'reset_token',
  'client_secret',
  'private_key',
  'audio',
  'recording',
  'microphone',
  'pcm',
  'learner_blob',
  'raw_audio',
  'audio_blob',
  'audio_data',
  'transcript',
  'transcription',
  'text_uthmani',
  'text_qpc',
  'ayah_text',
  'verse_text',
  'quran_text',
  'glyph',
  'credit_card',
  'card_number',
  'cvv',
  'ssn',
  'email',
  'phone',
]

const REDACTED = '[redacted]'

export function isSensitiveKey(key) {
  const normalized = String(key || '').toLowerCase().replace(/[-\s]/g, '_')
  return SENSITIVE_KEY_FRAGMENTS.some((fragment) => (
    normalized === fragment || normalized.includes(fragment)
  ))
}

export function looksSecret(value) {
  const text = String(value || '')
  if (/^bearer\s+\S+/i.test(text)) return true
  if (/^eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+/.test(text)) return true
  if (text.length > 180 && /^[A-Za-z0-9+/=_-]{180,}$/.test(text)) return true
  return false
}

export function looksAudio(value) {
  const text = String(value || '')
  return /^data:audio\//i.test(text) || /^blob:/i.test(text)
}

export function looksScriptureOrPii(value) {
  const text = String(value || '')
  return text.length > 40 && (text.match(/[\u0600-\u06FF]/g) || []).length >= 20
}

export function redactString(value, maxLength = 400) {
  if (value == null) return ''
  if (typeof value !== 'string' && typeof value !== 'number' && typeof value !== 'boolean') {
    return REDACTED
  }
  const text = String(value).trim()
  if (!text) return ''
  if (looksSecret(text) || looksAudio(text) || looksScriptureOrPii(text)) return REDACTED
  if (text.length > maxLength) return `${text.slice(0, maxLength)}…`
  return text
}

export function redactPayload(payload, depth = 0) {
  if (depth > 8) return { _truncated: true }
  if (!payload || typeof payload !== 'object') return redactString(payload)
  if (Array.isArray(payload)) {
    return payload.slice(0, 20).map((item) => redactPayload(item, depth + 1))
  }

  const clean = {}
  for (const [key, value] of Object.entries(payload)) {
    if (isSensitiveKey(key)) {
      clean[key] = REDACTED
      continue
    }
    if (value && typeof value === 'object') {
      clean[key] = redactPayload(value, depth + 1)
    } else if (typeof value === 'boolean' || typeof value === 'number' || value == null) {
      clean[key] = value
    } else {
      clean[key] = redactString(value)
    }
  }
  return clean
}

export function featureFromPath(path) {
  const value = String(path || '').toLowerCase()
  if (value.includes('transcription-token') || value.includes('speechmatics')) return 'speechmatics'
  if (value.includes('madani-mushaf') || value.includes('mushaf')) return 'mushaf'
  if (value.includes('quran-proxy') || value.includes('/quran')) return 'quran'
  if (value.includes('memorisation')) return 'memorisation'
  if (value.includes('session')) return 'session'
  if (value.includes('stripe') || value.includes('billing')) return 'billing'
  if (value.includes('admin')) return 'admin'
  if (value.includes('login') || value.includes('register') || value.includes('auth')) return 'auth'
  if (value.includes('dashboard')) return 'dashboard'
  if (value.includes('client-errors') || value.includes('error-test')) return 'error_tracking'
  return 'app'
}

export function fingerprintEvent(event) {
  return [
    event?.kind || '',
    event?.name || '',
    event?.message || '',
    event?.feature || '',
    event?.status ?? '',
    event?.route || '',
  ].join('|')
}

export function isExpectedHttpStatus(status) {
  const code = Number(status || 0)
  if (!code) return false
  return code < 500 && code !== 429
}

export function shouldReportHttpFailure({ status, aborted, offline } = {}) {
  if (aborted) return false
  if (offline && !status) return false
  if (isExpectedHttpStatus(status)) return false
  return true
}
