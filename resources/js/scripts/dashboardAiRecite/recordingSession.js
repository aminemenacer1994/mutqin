import axios from 'axios'
import {
  chooseSupportedRecorderMimeType,
  createObjectUrlFromBlob,
  revokeObjectUrl,
  stopMediaRecorderAndCollectBlob,
} from '../audio/recordingPlayback'
import { probeMicrophonePermission, validateRecordingEnvironment } from '../audio/recordingResilience'
import {
  createSpeechmaticsRealtimeProvider,
  createTranscriptionAudioBridge,
} from '../memorisationRuntime'
import { resolveAdaptiveSpeechmaticsDelays } from '../memorisationDetection/speechmaticsDelays'

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
    error.code = 'transcription_unavailable'
    throw error
  }
  return { accessToken, websocketHost }
}

function formatElapsed(ms) {
  const total = Math.max(0, Math.floor(Number(ms) / 1000))
  const minutes = String(Math.floor(total / 60)).padStart(2, '0')
  const seconds = String(total % 60).padStart(2, '0')
  return `${minutes}:${seconds}`
}

export function createDashboardAiReciteRecorder(options = {}) {
  const onState = typeof options.onState === 'function' ? options.onState : () => {}
  let stream = null
  let recorder = null
  let chunks = []
  let bridge = null
  let provider = null
  let pumpTimer = null
  let elapsedTimer = null
  let startedAt = 0
  let stopping = false
  let recording = false
  let words = []
  let objectUrl = ''

  const emit = (patch) => {
    onState({
      recording,
      stopping,
      elapsedMs: startedAt ? Date.now() - startedAt : 0,
      elapsedLabel: formatElapsed(startedAt ? Date.now() - startedAt : 0),
      ...patch,
    })
  }

  const stopTracks = () => {
    try { stream?.getTracks?.().forEach((track) => track.stop()) } catch { /* ignore */ }
    stream = null
  }

  const stopPump = () => {
    if (pumpTimer) window.clearInterval(pumpTimer)
    pumpTimer = null
  }

  const stopElapsed = () => {
    if (elapsedTimer) window.clearInterval(elapsedTimer)
    elapsedTimer = null
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

  const stopBridge = () => {
    try { bridge?.stop?.() } catch { /* ignore */ }
    bridge = null
  }

  const revokeUrl = () => {
    revokeObjectUrl(objectUrl)
    objectUrl = ''
  }

  return {
    formatElapsed,
    async start() {
      if (recording || stopping) return
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

      revokeUrl()
      words = []
      chunks = []
      stopping = false

      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            echoCancellation: true,
            noiseSuppression: true,
            autoGainControl: true,
            channelCount: 1,
          },
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      }

      const mimeType = chooseSupportedRecorderMimeType()
      recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
      recorder.ondataavailable = (event) => {
        if (event.data?.size) chunks.push(event.data)
      }
      recorder.start(250)

      bridge = createTranscriptionAudioBridge(stream)
      if (bridge) await bridge.ensureRunning?.()
      const delays = resolveAdaptiveSpeechmaticsDelays({ amdLive: false })
      try {
        provider = createSpeechmaticsRealtimeProvider({
          getAccessToken: () => fetchTranscriptionAccessToken(),
          getSampleRate: () => Number(bridge?.sampleRate || 48000),
          handshakeTimeoutMs: 2800,
          maxDelaySeconds: delays.maxDelaySeconds,
          endOfUtteranceSeconds: delays.endOfUtteranceSeconds,
        }).onTranscript((payload) => {
          const incoming = Array.isArray(payload?.words) ? payload.words : []
          if (payload?.isFinal && incoming.length) {
            words = words.concat(incoming)
          }
        })
        await provider.connect()
      } catch {
        provider = null
      }

      recording = true
      startedAt = Date.now()
      pumpTimer = window.setInterval(flushBridge, 40)
      elapsedTimer = window.setInterval(() => emit(), 250)
      emit({ recording: true })
    },

    async stop() {
      if (!recording || stopping) return null
      stopping = true
      recording = false
      emit({ recording: false, stopping: true })
      stopPump()
      stopElapsed()
      flushBridge()

      let blob = null
      try {
        blob = await stopMediaRecorderAndCollectBlob(recorder, chunks, {
          mimeType: recorder?.mimeType || '',
        })
      } catch {
        blob = null
      }

      try { provider?.endStream?.() } catch { /* ignore */ }
      await new Promise((resolve) => window.setTimeout(resolve, words.length ? 700 : 280))

      const durationMs = startedAt ? Date.now() - startedAt : 0
      revokeUrl()
      objectUrl = blob ? createObjectUrlFromBlob(blob) : ''
      const transcript = words.map((word) => word.word || word.text || '').filter(Boolean).join(' ')

      disconnectProvider()
      stopBridge()
      stopTracks()
      recorder = null
      stopping = false
      startedAt = 0
      emit({ recording: false, stopping: false, elapsedMs: durationMs, elapsedLabel: formatElapsed(durationMs) })

      return {
        blob,
        objectUrl,
        durationMs,
        transcript,
        words: words.slice(),
      }
    },

    dispose() {
      stopping = false
      recording = false
      stopPump()
      stopElapsed()
      disconnectProvider()
      stopBridge()
      stopTracks()
      try {
        if (recorder && recorder.state !== 'inactive') recorder.stop()
      } catch { /* ignore */ }
      recorder = null
      revokeUrl()
      words = []
      chunks = []
    },
  }
}
