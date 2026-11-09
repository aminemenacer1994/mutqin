import { appendHeardPayload, createHeardStream, heardStreamText } from '../askMutqin/heardStream.js'
import { createAskMutqinVoiceSession } from '../askMutqin/voiceSession.js'
import { classifyMicrophoneAccessError, MICROPHONE_ACCESS_KIND } from '../audio/microphonePermissionHelp.js'
import { idleWaveformBarLevels, sampleWaveformBarLevels } from '../audio/voiceNoteLiveAnalyser.js'
import {
  createSilenceTracker,
  SESSION_VOICE_MAX_LISTEN_MS,
  SESSION_VOICE_SILENCE_MS,
} from './silence.js'

const BAR_COUNT = 12
const POLL_MS = 100
const SPEECH_WINDOW_MS = 350

function permissionError(error) {
  const kind = classifyMicrophoneAccessError(error)
  if (kind === MICROPHONE_ACCESS_KIND.UNKNOWN && !/permission|notallowed|denied/i.test(String(error?.code || error?.name || ''))) {
    return null
  }
  if (kind === MICROPHONE_ACCESS_KIND.UNKNOWN && error?.code === 'transcription_unavailable') return null
  if (kind === MICROPHONE_ACCESS_KIND.UNKNOWN && error?.code === 'network') return null
  return kind
}

function createLevelMeter(stream) {
  if (typeof window === 'undefined' || !stream) return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!AudioContextCtor) return null
  let context
  let analyser
  let source
  let samples
  try {
    context = new AudioContextCtor()
    analyser = context.createAnalyser()
    analyser.fftSize = 512
    analyser.smoothingTimeConstant = 0.72
    source = context.createMediaStreamSource(stream)
    source.connect(analyser)
    samples = new Uint8Array(analyser.fftSize)
  } catch {
    return null
  }
  return {
    isSpeaking(threshold = 0.02) {
      if (!analyser || !samples) return false
      if (context.state === 'suspended') {
        try { void context.resume() } catch { /* ignore */ }
      }
      analyser.getByteTimeDomainData(samples)
      let sum = 0
      for (let index = 0; index < samples.length; index += 1) {
        const centered = (samples[index] - 128) / 128
        sum += centered * centered
      }
      const rms = Math.sqrt(sum / samples.length)
      return rms >= threshold
    },
    bars() {
      if (!analyser) return idleWaveformBarLevels(BAR_COUNT)
      const bins = new Uint8Array(analyser.frequencyBinCount)
      analyser.getByteFrequencyData(bins)
      return sampleWaveformBarLevels(bins, BAR_COUNT)
    },
    stop() {
      try { source?.disconnect() } catch { /* ignore */ }
      try { analyser?.disconnect() } catch { /* ignore */ }
      if (context && context.state !== 'closed') {
        try { void context.close() } catch { /* ignore */ }
      }
      source = null
      analyser = null
      context = null
    },
  }
}

/**
 * Records one spoken session request.
 * End-of-speech is a local silence timer, not a recognition "end" event.
 */
export function createSessionVoiceListener(options = {}) {
  const silenceMs = Number(options.silenceMs) || SESSION_VOICE_SILENCE_MS
  const maxListenMs = Number(options.maxListenMs) || SESSION_VOICE_MAX_LISTEN_MS
  const onUpdate = typeof options.onUpdate === 'function' ? options.onUpdate : () => {}
  const onFinish = typeof options.onFinish === 'function' ? options.onFinish : () => {}

  let language = String(options.language || 'en')
  let session = null
  let recognition = null
  let meter = null
  let pollTimer = 0
  let heard = createHeardStream()
  let browserTranscript = ''
  let transcriptSeed = ''
  let lastTranscriptAt = 0
  let startedAt = 0
  let settled = false
  let cancelled = false
  let recoveries = 0
  const tracker = createSilenceTracker({ silenceMs })

  const transcript = () => {
    const providerText = browserTranscript || heardStreamText(heard)
    return [transcriptSeed, providerText].filter(Boolean).join(' ').replace(/\s+/g, ' ').trim()
  }

  const publish = (extra = {}) => {
    onUpdate({
      transcript: transcript(),
      speechSeen: tracker.speechSeen(),
      bars: meter?.bars?.() || idleWaveformBarLevels(BAR_COUNT),
      ...extra,
    })
  }

  const cleanup = () => {
    if (pollTimer) window.clearInterval(pollTimer)
    pollTimer = 0
    try { recognition?.stop?.() } catch { /* ignore */ }
    recognition = null
    try { meter?.stop?.() } catch { /* ignore */ }
    meter = null
    try { session?.stop?.() } catch { /* ignore */ }
    session = null
  }

  const finish = (reason) => {
    if (settled || cancelled) return
    settled = true
    const text = transcript()
    const limitReached = reason === 'limit'
    cleanup()
    onFinish({
      transcript: text,
      reason,
      limitReached,
    })
  }

  const noteTranscript = () => {
    lastTranscriptAt = Date.now()
  }

  const speakingNow = () => {
    const vad = session?.hasRecentSpeech?.(SPEECH_WINDOW_MS, 0.018) || meter?.isSpeaking?.(0.018) || false
    const heardRecently = lastTranscriptAt > 0 && (Date.now() - lastTranscriptAt) < SPEECH_WINDOW_MS
    return !!(vad || heardRecently)
  }

  const tick = () => {
    if (settled || cancelled) return
    const now = Date.now()
    if (startedAt && now - startedAt >= maxListenMs) {
      publish({ phase: 'listening', limitReached: true })
      finish('limit')
      return
    }
    const decision = tracker.push(speakingNow(), now)
    publish({ phase: decision.phase, silenceFor: decision.silenceFor })
    if (decision.phase === 'finished') finish('silence')
  }

  const startBrowserRecognition = (stream) => {
    const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!Recognition) return false
    meter = createLevelMeter(stream)
    recognition = new Recognition()
    recognition.continuous = true
    recognition.interimResults = true
    recognition.lang = language === 'ar' ? 'ar-SA' : 'en-US'
    recognition.onresult = (event) => {
      const parts = []
      for (let index = 0; index < event.results.length; index += 1) {
        parts.push(event.results[index][0]?.transcript || '')
      }
      browserTranscript = parts.join(' ').replace(/\s+/g, ' ').trim()
      noteTranscript()
      publish({ phase: tracker.speechSeen() ? 'speaking' : 'waiting' })
    }
    recognition.onerror = (event) => {
      const code = String(event?.error || '')
      if (code === 'not-allowed' || code === 'service-not-allowed') {
        if (!settled && !cancelled) {
          settled = true
          cleanup()
          onFinish({
            transcript: '',
            reason: 'error',
            errorKind: MICROPHONE_ACCESS_KIND.NOT_ALLOWED,
          })
        }
      }
    }
    recognition.onend = () => {
      if (settled || cancelled || recognition == null) return
      try { recognition.start() } catch { /* already running or closed */ }
    }
    try {
      recognition.start()
      return true
    } catch {
      return false
    }
  }

  const startBrowserFallback = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 },
    })
    if (cancelled) {
      stream.getTracks().forEach((track) => track.stop())
      return false
    }
    const started = startBrowserRecognition(stream)
    if (!started) {
      stream.getTracks().forEach((track) => track.stop())
      return false
    }
    const originalStop = recognition.stop.bind(recognition)
    recognition.stop = () => {
      try { originalStop() } catch { /* ignore */ }
      stream.getTracks().forEach((track) => track.stop())
    }
    return true
  }

  return {
    transcript,
    async setLanguage(next) {
      const lang = String(next || 'en')
      if (lang === language) return
      language = lang
      if (session?.isActive?.()) {
        try { await session.setLanguage(lang === 'ar' ? 'ar' : 'en') } catch { /* keep listening */ }
      }
      if (recognition) {
        try { recognition.lang = lang === 'ar' ? 'ar-SA' : 'en-US' } catch { /* ignore */ }
      }
    },
    async start() {
      if (settled) return
      cancelled = false
      startedAt = Date.now()
      session = createAskMutqinVoiceSession({
        phraseHints: options.phraseHints,
        onTranscript: (payload) => {
          heard = appendHeardPayload(heard, payload)
          if (heardStreamText(heard)) noteTranscript()
        },
        onError: () => {
          if (settled || cancelled || recoveries >= 2) return
          recoveries += 1
          const active = session
          window.setTimeout(() => {
            if (settled || cancelled || active !== session) return
            void active.recover?.()
          }, 250)
        },
      })
      try {
        await session.start(language === 'ar' ? 'ar' : 'en')
        if (cancelled) {
          cleanup()
          return
        }
        const stream = session.getMediaStream?.()
        meter = createLevelMeter(stream)
      } catch (error) {
        const kind = permissionError(error)
        if (kind) {
          settled = true
          cleanup()
          onFinish({ transcript: '', reason: 'error', errorKind: kind })
          return
        }
        try { session?.stop?.() } catch { /* ignore */ }
        session = null
        transcriptSeed = transcript()
        heard = createHeardStream()
        let fallback = false
        try {
          fallback = await startBrowserFallback()
        } catch (fallbackError) {
          const fallbackKind = permissionError(fallbackError) || classifyMicrophoneAccessError(fallbackError)
          settled = true
          cleanup()
          onFinish({ transcript: '', reason: 'error', errorKind: fallbackKind })
          return
        }
        if (!fallback) {
          settled = true
          cleanup()
          onFinish({ transcript: '', reason: 'error', errorKind: 'transcription' })
          return
        }
      }
      if (cancelled || settled) return
      publish({ phase: 'waiting', silenceFor: 0 })
      pollTimer = window.setInterval(tick, POLL_MS)
    },
    finishNow() {
      finish(tracker.speechSeen() || transcript() ? 'manual' : 'empty')
    },
    cancel() {
      if (settled) return
      cancelled = true
      settled = true
      cleanup()
    },
  }
}
