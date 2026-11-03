import axios from 'axios'
import {
  chooseSupportedRecorderMimeType,
  createObjectUrlFromBlob,
  revokeObjectUrl,
  stopMediaRecorderAndCollectBlob,
} from '../audio/recordingPlayback'
import {
  getRecitationMicrophoneConstraints,
  validateRecordingEnvironment,
} from '../audio/recordingResilience'
import {
  createSpeechmaticsRealtimeProvider,
  createTranscriptionAudioBridge,
} from '../memorisationRuntime'
import {
  createRecognitionState,
  getRecognitionDisplayWords,
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
    timeout: 10000,
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
  let starting = false
  let generation = 0
  let recognitionState = createRecognitionState()
  let objectUrl = ''
  let streamError = null
  let paceObserver = createRecitationPaceObserver()

  const emit = (patch = {}) => onState({
    recording, stopping,
    elapsedMs: startedAt ? Date.now() - startedAt : 0,
    elapsedLabel: formatElapsed(startedAt ? Date.now() - startedAt : 0),
    ...patch,
  })
  const stopTimers = () => {
    window.clearInterval(pumpTimer)
    window.clearInterval(elapsedTimer)
    pumpTimer = elapsedTimer = null
  }
  const release = () => {
    stopTimers()
    void provider?.disconnect?.()
    provider = null
    try { bridge?.stop?.() } catch { /* already stopped */ }
    bridge = null
    try { stream?.getTracks?.().forEach(track => track.stop()) } catch { /* already stopped */ }
    stream = null
    try { if (recorder?.state !== 'inactive') recorder?.stop?.() } catch { /* already stopped */ }
    recorder = null
  }
  const flushBridge = () => {
    if (!provider?.isOpen?.()) return
    const drain = bridge?.drain?.(6)
    if (drain?.buffer?.byteLength && !provider.streamAudioChunk(drain.buffer)) drain.restore()
  }

  return {
    formatElapsed,
    async start() {
      if (recording || stopping || starting) return
      const env = validateRecordingEnvironment()
      if (!env.supported) throw Object.assign(new Error(env.reason || 'unsupported'), { code: env.reason || 'unsupported' })
      const attempt = ++generation
      starting = true
      revokeObjectUrl(objectUrl)
      objectUrl = ''
      recognitionState = createRecognitionState()
      streamError = null
      chunks = []
      paceObserver = createRecitationPaceObserver()
      try {
        let acquired
        try {
          acquired = await navigator.mediaDevices.getUserMedia(getRecitationMicrophoneConstraints())
        } catch (error) {
          if (!['OverconstrainedError', 'ConstraintNotSatisfiedError'].includes(error?.name)) throw error
          acquired = await navigator.mediaDevices.getUserMedia({ audio: true })
        }
        if (attempt !== generation) {
          acquired.getTracks().forEach(track => track.stop())
          throw new Error('Recording cancelled.')
        }
        stream = acquired
        bridge = createTranscriptionAudioBridge(stream)
        if (!bridge || !(await bridge.ensureRunning())) throw new Error('Audio capture could not start.')
        if (attempt !== generation) throw new Error('Recording cancelled.')
        const mimeType = chooseSupportedRecorderMimeType()
        recorder = mimeType ? new MediaRecorder(stream, { mimeType }) : new MediaRecorder(stream)
        recorder.ondataavailable = event => {
          if (attempt === generation && event.data?.size) chunks.push(event.data)
        }
        recorder.onerror = () => {
          if (attempt !== generation) return
          streamError = new Error('Audio recording was interrupted. Please retry.')
          emit({ error: streamError })
        }
        recorder.start(250)
        startedAt = Date.now()
        const delays = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: 1 })
        provider = createSpeechmaticsRealtimeProvider({
          getAccessToken: fetchTranscriptionAccessToken,
          getSampleRate: () => Number(bridge?.sampleRate || 0),
          amdLive: true,
          handshakeTimeoutMs: 4500,
          ...delays,
        }).onTranscript(payload => {
          if (attempt !== generation || payload.type === 'end-of-transcript') return
          recognitionState = stabilizeRecognitionEvent(recognitionState, payload, { confidenceThreshold: payload.isFinal ? 0 : 0.35 })
          const words = recognitionState.committedWords
          if (payload.isFinal && words.length >= 2) {
            const pace = buildRecitationAdaptivePaceContext({ observer: paceObserver, recognitionWords: words })
            paceObserver = pace.observer
            provider?.updateRecognitionDelays(resolveAdaptiveSpeechmaticsDelays({ live: true, ...pace }))
          }
          emit({ transcript: wordsToTranscript(getRecognitionDisplayWords(recognitionState)) })
        }).onError(error => {
          if (attempt !== generation) return
          streamError = error
          emit({ error })
        })
        await provider.connect()
        if (attempt !== generation) throw new Error('Recording cancelled.')
        recording = true
        flushBridge()
        pumpTimer = window.setInterval(flushBridge, 40)
        elapsedTimer = window.setInterval(() => emit(), 250)
        emit()
      } catch (error) {
        if (attempt === generation) { release(); recording = false; startedAt = 0 }
        throw error
      } finally {
        if (attempt === generation) starting = false
      }
    },
    async stop() {
      if (!recording || stopping) return null
      const attempt = generation
      const durationMs = Date.now() - startedAt
      stopping = true
      recording = false
      stopTimers()
      emit()
      try {
        if (streamError) throw streamError
        const capture = await bridge?.finishCapture?.()
        const audioQualityMetrics = capture?.metrics
        const trailingAudio = capture?.buffer
        bridge = null
        if (!audioQualityMetrics?.complete || audioQualityMetrics.broken) throw new Error('Audio capture was incomplete. Please retry.')
        // Collect the recording while the provider acknowledges all remaining PCM.
        const [blob] = await Promise.all([
          stopMediaRecorderAndCollectBlob(recorder, chunks.slice(), { mimeType: recorder?.mimeType || '' }),
          provider.finishStream(trailingAudio),
        ])
        if (attempt !== generation) throw new Error('Recording cancelled.')
        if (streamError) throw streamError
        const words = recognitionState.committedWords.slice()
        if (!words.length) throw new Error('No speech was recognised. Please retry.')
        objectUrl = blob ? createObjectUrlFromBlob(blob) : ''
        return {
          blob, objectUrl, durationMs, words,
          transcript: wordsToTranscript(words),
          rawEvents: recognitionState.rawEvents.slice(),
          audioQualityMetrics,
          provider: 'speechmatics',
        }
      } finally {
        if (attempt === generation) {
          release()
          chunks = []
          stopping = false
          startedAt = 0
          emit({ elapsedMs: durationMs, elapsedLabel: formatElapsed(durationMs) })
        }
      }
    },
    dispose() {
      generation += 1
      release()
      revokeObjectUrl(objectUrl)
      objectUrl = ''
      starting = stopping = recording = false
      startedAt = 0
      chunks = []
      recognitionState = createRecognitionState()
    },
  }
}
