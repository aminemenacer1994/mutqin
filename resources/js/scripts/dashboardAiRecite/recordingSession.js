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
import {
  createRecognitionState,
  stabilizeRecognitionEvent,
  wordsToTranscript,
} from '../engine/recitation_analysis.js'
import { resolveAdaptiveSpeechmaticsDelays } from '../memorisationDetection/speechmaticsDelays'
import {
  buildRecitationAdaptivePaceContext,
  createRecitationPaceObserver,
} from '../memorisationDetection/recitationTimingBuffer'
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
  let recognitionState = createRecognitionState()
  let words = []
  let objectUrl = ''
  let browserRecognition = null
  let browserRecognitionStopping = false
  let browserFallbackDisabled = false
  let endOfTranscript = false
  let qualityMetrics = null
  let paceObserver = createRecitationPaceObserver()

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

  const stopBrowserFallback = () => {
    browserRecognitionStopping = true
    try { browserRecognition?.stop?.() } catch { /* ignore */ }
    browserRecognition = null
  }

  const pushPaceDelays = () => {
    if (!provider?.updateRecognitionDelays || words.length < 2) return
    const pace = buildRecitationAdaptivePaceContext({
      observer: paceObserver,
      recognitionWords: words,
    })
    paceObserver = pace.observer
    provider.updateRecognitionDelays(resolveAdaptiveSpeechmaticsDelays({
      live: true,
      paceFactor: pace.paceFactor,
      tajweedHeavy: pace.tajweedHeavy,
    }))
  }

  const applyTranscriptPayload = (payload = {}) => {
    if (payload?.type === 'end-of-transcript') {
      endOfTranscript = true
    }
    recognitionState = stabilizeRecognitionEvent(recognitionState, payload, {
      confidenceThreshold: payload?.isFinal ? 0.35 : 0.48,
    })
    words = Array.isArray(recognitionState.committedWords)
      ? recognitionState.committedWords.slice()
      : []
    pushPaceDelays()
  }

  const startBrowserFallback = () => {
    if (!recording || browserRecognition || browserFallbackDisabled || typeof window === 'undefined') return false
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (typeof Recognition !== 'function') return false

    browserRecognitionStopping = false
    const recognition = new Recognition()
    recognition.lang = 'ar-SA'
    recognition.continuous = true
    recognition.interimResults = true
    recognition.maxAlternatives = 3
    recognition.onresult = (event) => {
      for (let index = Number(event?.resultIndex || 0); index < (event?.results?.length || 0); index += 1) {
        const result = event.results[index]
        const alternatives = Array.from(result || [])
        const best = alternatives
          .filter((alternative) => String(alternative?.transcript || '').trim())
          .sort((left, right) => (Number(right?.confidence) || 0) - (Number(left?.confidence) || 0))[0]
        if (!best?.transcript) continue
        const confidence = Number(best.confidence)
        applyTranscriptPayload({
          type: result?.isFinal ? 'final' : 'partial',
          provider: 'web-speech',
          isFinal: !!result?.isFinal,
          speechFinal: !!result?.isFinal,
          transcript: String(best.transcript).trim(),
          confidence: Number.isFinite(confidence) && confidence > 0
            ? confidence
            : (result?.isFinal ? 1 : 0.72),
          segmentId: `web-speech:${index}`,
        })
      }
    }
    recognition.onerror = (event) => {
      // Browser STT is a fallback signal. A transient browser error must not
      // discard already committed Speechmatics words or the recording itself.
      if (['not-allowed', 'service-not-allowed'].includes(String(event?.error || ''))) {
        browserFallbackDisabled = true
      }
    }
    recognition.onend = () => {
      if (browserRecognition !== recognition) return
      browserRecognition = null
      if (recording && !stopping && !browserRecognitionStopping) {
        window.setTimeout(() => startBrowserFallback(), 80)
      }
    }
    browserRecognition = recognition
    try {
      recognition.start()
      return true
    } catch {
      browserRecognition = null
      return false
    }
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
      stopBrowserFallback()
      browserFallbackDisabled = false
      recognitionState = createRecognitionState()
      words = []
      chunks = []
      qualityMetrics = null
      endOfTranscript = false
      stopping = false
      startedAt = Date.now()
      paceObserver = createRecitationPaceObserver()

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
      try {
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data)
        }
        recorder.start(250)
      } catch (error) {
        stopTracks()
        startedAt = 0
        throw error
      }

      recording = true
      emit({ recording: true })

      try {
        bridge = createTranscriptionAudioBridge(stream)
        if (bridge) await bridge.ensureRunning?.()
      } catch {
        bridge = null
      }
      const delays = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: 1 })
      try {
        provider = createSpeechmaticsRealtimeProvider({
          getAccessToken: () => fetchTranscriptionAccessToken(),
          getSampleRate: () => Number(bridge?.sampleRate || 48000),
          handshakeTimeoutMs: 2800,
          maxDelaySeconds: delays.maxDelaySeconds,
          endOfUtteranceSeconds: delays.endOfUtteranceSeconds,
        }).onTranscript((payload) => applyTranscriptPayload(payload))
          .onDisconnect(() => {
            provider = null
            if (recording && !stopping) startBrowserFallback()
          })
        await provider.connect()
      } catch {
        provider = null
        startBrowserFallback()
      }

      pumpTimer = window.setInterval(flushBridge, 40)
      elapsedTimer = window.setInterval(() => emit(), 250)
    },

    async stop() {
      if (!recording || stopping) return null
      stopping = true
      recording = false
      emit({ recording: false, stopping: true })
      stopPump()
      stopElapsed()
      stopBrowserFallback()
      flushBridge()

      let blob = null
      try {
        blob = await stopMediaRecorderAndCollectBlob(recorder, chunks, {
          mimeType: recorder?.mimeType || '',
        })
      } catch {
        blob = null
      }

      const activeProvider = provider
      try { activeProvider?.endStream?.() } catch { /* ignore */ }
      const settleDeadline = Date.now() + (words.length ? 2200 : 900)
      while (activeProvider && !endOfTranscript && Date.now() < settleDeadline) {
        await new Promise((resolve) => window.setTimeout(resolve, 50))
      }

      const durationMs = startedAt ? Date.now() - startedAt : 0
      revokeUrl()
      objectUrl = blob ? createObjectUrlFromBlob(blob) : ''
      qualityMetrics = bridge?.getQualityMetrics?.() || qualityMetrics
      const committedWords = Array.isArray(recognitionState.committedWords)
        ? recognitionState.committedWords.slice()
        : words.slice()
      const transcript = wordsToTranscript(committedWords)
      const providerCounts = committedWords.reduce((counts, word) => {
        const name = word?.provider || 'web-speech'
        counts[name] = Number(counts[name] || 0) + 1
        return counts
      }, {})
      const providerName = Number(providerCounts.speechmatics || 0) >= Math.max(1, Math.ceil(committedWords.length * 0.7))
        ? 'speechmatics'
        : (Number(providerCounts['web-speech'] || 0) > 0 ? 'web-speech' : 'speechmatics')

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
        words: committedWords,
        rawEvents: Array.isArray(recognitionState.rawEvents) ? recognitionState.rawEvents.slice() : [],
        stabilizedWords: committedWords,
        wordBuffer: committedWords,
        confidenceValues: committedWords.map((word) => word.confidence),
        audioQualityMetrics: qualityMetrics,
        provider: providerName,
      }
    },

    dispose() {
      stopping = false
      recording = false
      stopPump()
      stopElapsed()
      stopBrowserFallback()
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
      recognitionState = createRecognitionState()
      browserFallbackDisabled = false
    },
  }
}
