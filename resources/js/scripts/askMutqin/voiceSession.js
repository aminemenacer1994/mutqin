import axios from 'axios'
import { probeMicrophonePermission, validateRecordingEnvironment } from '../audio/recordingResilience.js'
import {
  createSpeechmaticsRealtimeProvider,
  createTranscriptionAudioBridge,
} from '../memorisationRuntime.js'
import { resolveAdaptiveSpeechmaticsDelays } from '../memorisationDetection/speechmaticsDelays.js'

function readCsrfToken() {
  if (typeof document === 'undefined') return ''
  return document.head?.querySelector('meta[name="csrf-token"]')?.content || ''
}

async function fetchTranscriptionAccessToken() {
  const headers = {
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  }
  const csrf = readCsrfToken()
  if (csrf) headers['X-CSRF-TOKEN'] = csrf

  const post = () => axios.post('/memorisation/transcription-token', null, {
    withCredentials: true,
    headers,
  })

  let response
  try {
    response = await post()
  } catch (firstError) {
    if (Number(firstError?.response?.status) !== 419) throw firstError
    await axios.get('/sanctum/csrf-cookie', { withCredentials: true }).catch(() => null)
    response = await post()
  }

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

  const flushBridge = () => {
    const pending = bridge?.flush?.()
    if (pending?.byteLength && provider?.isOpen?.()) {
      provider.streamAudioChunk(pending)
    }
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
    const delays = resolveAdaptiveSpeechmaticsDelays({ live: true })
    provider = createSpeechmaticsRealtimeProvider({
      language,
      getAccessToken: getToken,
      getSampleRate: () => Number(bridge?.sampleRate || 16000),
      // Longer silence hold so short pauses mid-ayah do not freeze the Heard line.
      maxDelaySeconds: Math.max(delays.maxDelaySeconds, 1.2),
      endOfUtteranceSeconds: Math.max(delays.endOfUtteranceSeconds, 1.25),
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
        const probe = await probeMicrophonePermission()
        if (probe.denied) {
          const error = new Error('permission_denied')
          error.code = 'permission_denied'
          throw error
        }

        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
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
