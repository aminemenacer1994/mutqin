import axios from 'axios'
import { buildCsrfHeaders, ensureCsrfCookie, withCsrfRetry } from '../http/csrf.js'

/**
 * Duration and latency only. The transcript and audio stay on the device.
 */
export function reportSessionVoiceMetrics(metrics = {}) {
  const duration = Number(metrics.duration_ms)
  if (!Number.isFinite(duration) || duration < 0) return
  const payload = {
    duration_ms: Math.min(180000, Math.round(duration)),
    language: String(metrics.language || 'en').slice(0, 12),
    provider: metrics.provider === 'webspeech' ? 'webspeech' : 'speechmatics',
    outcome: String(metrics.outcome || '').slice(0, 32) || null,
  }
  const first = Number(metrics.first_partial_ms)
  const finalLatency = Number(metrics.final_latency_ms)
  if (Number.isFinite(first) && first >= 0) payload.first_partial_ms = Math.min(180000, Math.round(first))
  if (Number.isFinite(finalLatency) && finalLatency >= 0) payload.final_latency_ms = Math.min(180000, Math.round(finalLatency))

  void ensureCsrfCookie()
    .then(() => withCsrfRetry(() => axios.post(
      '/api/memorisation/ask-mutqin/voice-metrics',
      payload,
      { withCredentials: true, headers: buildCsrfHeaders({ 'Content-Type': 'application/json' }) },
    )))
    .catch(() => {})
}
