import axios from 'axios'
import { validateRecordingEnvironment } from '../audio/recordingResilience.js'
import {
  createSpeechmaticsRealtimeProvider,
  createTranscriptionAudioBridge,
} from '../memorisationRuntime.js'
import { resolveAdaptiveSpeechmaticsDelays } from '../memorisationDetection/speechmaticsDelays.js'
import { evaluateSpeechmaticsAudioGate } from '../audio/speechmaticsAudioGate.js'
import { buildCsrfHeaders, ensureCsrfCookie, withCsrfRetry } from '../http/csrf.js'

async function fetchTranscriptionAccessToken() {
  await ensureCsrfCookie()
  const response = await withCsrfRetry(() => axios.post('/memorisation/transcription-token', null, {
    withCredentials: true,
    headers: buildCsrfHeaders(),
  }))

  const payload = response?.data || {}
  const accessToken = String(payload?.access_token || '').trim()
  const websocketHost = String(payload?.websocket_host || '').trim()
  if (payload?.available === false || !accessToken || !websocketHost) {
    const error = new Error(String(payload?.message || 'transcription_unavailable'))
    error.code = payload?.reason === 'usage_cap' ? 'usage_cap' : 'transcription_unavailable'
    throw error
  }
  return { accessToken, websocketHost }
}

export function createAskMutqinVoiceSession(options = {}) {
  const onTranscript = typeof options.onTranscript === 'function' ? options.onTranscript : () => {}
  const onError = typeof options.onError === 'function' ? options.onError : () => {}
  const onAudioQuality = typeof options.onAudioQuality === 'function' ? options.onAudioQuality : () => {}

  let stream = null
  let bridge = null
  let provider = null
  let pumpTimer = null
  let language = 'ar'
  let starting = false
  let active = false
  let tokenPromise = null
  let switching = false

  const stopPump = () => {
    if (pumpTimer) window.clearInterval(pumpTimer)
    pumpTimer = null
  }

  let lastQualityEmitAt = 0

  const emitAudioQuality = (force = false) => {
    const metrics = bridge?.getQualityMetrics?.()
    if (!metrics) return
    const now = Date.now()
    if (!force && now - lastQualityEmitAt < 450) return
    lastQualityEmitAt = now
    const gate = evaluateSpeechmaticsAudioGate(metrics)
    onAudioQuality({ metrics, gate })
  }

  const flushBridge = () => {
    const pending = bridge?.flush?.()
    if (pending?.byteLength && provider?.isOpen?.()) {
      provider.streamAudioChunk(pending)
    }
    emitAudioQuality(false)
  }

  const disconnectProvider = () => {
    try { provider?.endStream?.() } catch { /* ignore */ }
    try { provider?.disconnect?.() } catch { /* ignore */ }
    provider = null
  }

  const stopTracks = () => {
    try { stream?.getTracks?.().forEach((track) => track.stop()) } catch { /* ignore */ }
    stream = null
  }

  const stopBridge = () => {
    try { bridge?.stop?.() } catch { /* ignore */ }
    bridge = null
  }

  const getToken = () => {
    if (!tokenPromise) {
      tokenPromise = fetchTranscriptionAccessToken().catch((error) => {
        tokenPromise = null
        throw error
      })
    }
    return tokenPromise
  }

  const connectProvider = async (nextLanguage) => {
    disconnectProvider()
    language = nextLanguage || language || 'ar'
    const delays = resolveAdaptiveSpeechmaticsDelays({ live: true, amdLive: true, paceFactor: 1 })
    provider = createSpeechmaticsRealtimeProvider({
      language,
      getAccessToken: getToken,
      getSampleRate: () => Number(bridge?.sampleRate || 16000),
      amdLive: true,
      maxDelaySeconds: delays.maxDelaySeconds,
      endOfUtteranceSeconds: delays.endOfUtteranceSeconds,
      handshakeTimeoutMs: 4500,
    })
    provider.onTranscript(onTranscript)
    provider.onError(onError)
    provider.onDisconnect(() => {
      if (active && !switching) onError(Object.assign(new Error('disconnected'), { code: 'disconnected' }))
    })
    await provider.connect()
  }

  const startPump = () => {
    stopPump()
    pumpTimer = window.setInterval(flushBridge, 40)
  }

  return {
    isActive: () => active,
    isStarting: () => starting,
    language: () => language,
    async start(nextLanguage = 'ar') {
      if (starting || active) return
      starting = true
      try {
        const env = validateRecordingEnvironment()
        if (!env.supported) {
          const error = new Error(env.reason || 'unsupported')
          error.code = env.reason || 'unsupported'
          throw error
        }
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
            sampleRate: { ideal: 48000 },
          },
        })
        bridge = createTranscriptionAudioBridge(stream)
        if (!bridge) {
          const error = new Error('unsupported')
          error.code = 'unsupported'
          throw error
        }
        await bridge.ensureRunning?.()
        await connectProvider(nextLanguage)
        startPump()
        emitAudioQuality(true)
        active = true
      } catch (error) {
        stopPump()
        disconnectProvider()
        stopBridge()
        stopTracks()
        const denied = /Permission|NotAllowed|denied/i.test(String(error?.name || error?.message || ''))
        if (denied && !error.code) error.code = 'permission_denied'
        throw error
      } finally {
        starting = false
      }
    },
    async setLanguage(nextLanguage) {
      const lang = String(nextLanguage || 'ar')
      if (!active || lang === language) return
      switching = true
      tokenPromise = null
      try {
        await connectProvider(lang)
      } finally {
        switching = false
      }
    },
    getAudioQualityMetrics() {
      return bridge?.getQualityMetrics?.() || null
    },
    stop() {
      active = false
      starting = false
      switching = false
      stopPump()
      flushBridge()
      disconnectProvider()
      stopBridge()
      stopTracks()
      tokenPromise = null
    },
  }
}
