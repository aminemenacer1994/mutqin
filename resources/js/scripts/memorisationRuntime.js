// Framework-agnostic runtime helpers for the Memorisation workspace.
// Extracted verbatim from Memorisation.vue's module scope (no `this`, no Vue
// reactivity beyond the pure `toRaw` unwrap) to keep the component file lean.

import { toRaw } from 'vue'
import { DEFAULT_RECITATION_CONFIDENCE_THRESHOLD } from './engine/recitation_analysis'

export const MODE_STORAGE_KEYS = {
  beginner: 'telawa.mode.beginner',
  advanced: 'telawa.mode.advanced',
  planner: 'mutqin.mode.planner'
}

export const SESSION_STORAGE_KEYS = {
  beginner: 'telawa.sessionState.beginner',
  advanced: 'telawa.sessionState.advanced',
  planner: 'mutqin.sessionState.planner'
}

export const CENTRAL_SESSION_STORAGE_KEY = 'mutqin.sessionState'

export const DEFAULT_ALQURAN_RECITER = 'ar.alafasy'
export const RECITATION_IDB_NAME = 'mutqin-recitation-sessions'
export const RECITATION_IDB_VERSION = 2
export const RECITATION_IDB_STORE = 'sessions'
export const RECITATION_HISTORY_IDB_STORE = 'sessionHistory'
export const RECITATION_ANALYSIS_VERSION = '2026-06-27-live-rtl-v2'
export const RECITATION_CONFIDENCE_THRESHOLD = Math.min(DEFAULT_RECITATION_CONFIDENCE_THRESHOLD, 0.45)
export const RECITATION_SILENCE_THROTTLE_MS = 1400
export const RECITATION_CHUNK_TIMESLICE_MS = 40
export const RECITATION_TRANSCRIPTION_SETTLE_TIMEOUT_MS = 4000
export const RECITATION_TRANSCRIPTION_SETTLE_QUIET_MS = 1200
export const SPEECHMATICS_PARTIAL_CONFIDENCE = 0.82
export const SPEECHMATICS_AUDIO_BUFFER_SIZE = 2048
export const SPEECHMATICS_MAX_DELAY_SECONDS = 0.02
export const SPEECHMATICS_END_OF_UTTERANCE_SECONDS = 0.12
export const RECITATION_LIVE_INTERIM_CONFIDENCE_THRESHOLD = 0
export const RECITATION_WORD_STATUS_CLASSES = [
  'recitation-word-pending',
  'recitation-word-correct',
  'recitation-word-partial',
  'recitation-word-incorrect',
  'recitation-word-skipped',
  'recitation-word-notAttempted',
  'recitation-word-extra'
]

export function tokenizeArabicText(text) {
  const raw = String(text || '').trim()
  if (!raw) return []
  // Prefer whitespace tokenization, but keep Arabic + diacritics together.
  const tokens = raw.split(/\s+/).filter(Boolean)
  return tokens
}

export function splitArabicGraphemes(text) {
  const raw = String(text || '')
  if (!raw) return []
  if (typeof Intl !== 'undefined' && typeof Intl.Segmenter === 'function') {
    try {
      return Array.from(new Intl.Segmenter('ar', { granularity: 'grapheme' }).segment(raw), segment => segment.segment)
    } catch {
      // Fall through to the regex fallback below.
    }
  }
  return raw.match(/\P{M}\p{M}*/gu) || Array.from(raw)
}

export function escapeHtml(value) {
  return String(value || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function deepClone(value) {
  const rawValue = toRaw(value)

  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(rawValue)
    } catch (error) {
      console.warn('structuredClone fallback triggered', error)
    }
  }

  return JSON.parse(JSON.stringify(rawValue))
}

export function sanitizeForIndexedDb(value, seen = new WeakMap()) {
  if (value === null || value === undefined) return value
  if (typeof value === 'function' || typeof value === 'symbol') return undefined
  if (typeof value !== 'object') return value

  const rawValue = toRaw(value)
  if (rawValue instanceof Date) return new Date(rawValue.getTime())
  if (rawValue instanceof Blob) return rawValue
  if (rawValue instanceof ArrayBuffer) return rawValue.slice(0)
  if (ArrayBuffer.isView(rawValue)) return new rawValue.constructor(rawValue)

  if (seen.has(rawValue)) return seen.get(rawValue)

  if (Array.isArray(rawValue)) {
    const clone = []
    seen.set(rawValue, clone)
    rawValue.forEach(item => {
      const sanitized = sanitizeForIndexedDb(item, seen)
      clone.push(sanitized === undefined ? null : sanitized)
    })
    return clone
  }

  const clone = {}
  seen.set(rawValue, clone)
  Object.keys(rawValue).forEach(key => {
    const sanitized = sanitizeForIndexedDb(rawValue[key], seen)
    if (sanitized !== undefined) clone[key] = sanitized
  })
  return clone
}

export function normalizeForIndexedDbJson(value) {
  if (value === null || value === undefined) return value
  const rawValue = toRaw(value)
  if (rawValue instanceof Blob) return rawValue
  if (rawValue instanceof Date) return rawValue.toISOString()
  if (rawValue instanceof ArrayBuffer) return Array.from(new Uint8Array(rawValue))
  if (ArrayBuffer.isView(rawValue)) return Array.from(rawValue)
  try {
    return JSON.parse(JSON.stringify(rawValue))
  } catch {
    return null
  }
}

export function stripNonCloneablePersistenceFields(value) {
  if (Array.isArray(value)) {
    return value.map(item => stripNonCloneablePersistenceFields(item))
  }
  if (!value || typeof value !== 'object') return value
  const next = {}
  Object.keys(value).forEach(key => {
    if (key === 'raw') {
      next[key] = null
      return
    }
    next[key] = stripNonCloneablePersistenceFields(value[key])
  })
  return next
}

export function prepareIndexedDbPayload(value) {
  const primary = sanitizeForIndexedDb(value)
  if (isStructuredCloneSafe(primary)) return primary

  const downgraded = stripNonCloneablePersistenceFields(normalizeForIndexedDbJson(value))
  if (isStructuredCloneSafe(downgraded)) return downgraded

  throw new Error('Unable to prepare a structured-clone-safe IndexedDB payload.')
}

export function isStructuredCloneSafe(value) {
  if (typeof structuredClone !== 'function') return true
  try {
    structuredClone(value)
    return true
  } catch {
    return false
  }
}

export function slugifySessionFilePart(value) {
  return String(value || 'session')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'session'
}

export function parseRecordingDurationSeconds(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.max(0, value)
  if (typeof value !== 'string') return 0

  const raw = value.trim()
  if (!raw) return 0

  if (/^\d+(\.\d+)?$/.test(raw)) {
    return Math.max(0, Number(raw))
  }

  const parts = raw.split(':').map(part => Number(part))
  if (parts.some(part => !Number.isFinite(part))) return 0

  if (parts.length === 2) return Math.max(0, (parts[0] * 60) + parts[1])
  if (parts.length === 3) return Math.max(0, (parts[0] * 3600) + (parts[1] * 60) + parts[2])
  return 0
}

export function normalizeRecordingResult(value) {
  const raw = String(value || '').trim().toLowerCase()
  if (!raw) return 'Needs Review'
  if (raw.includes('excellent')) return 'Excellent'
  if (raw.includes('good')) return 'Good'
  if (raw.includes('pass')) return 'Good'
  return 'Needs Review'
}

export function parseRecordingDate(value) {
  if (!value && value !== 0) return new Date().toISOString()
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return new Date().toISOString()
  return date.toISOString()
}

export function looksLikeRecordingEntry(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  return Boolean(
    value.audioSrc ||
    value.audioUrl ||
    value.url ||
    value.src ||
    value.blobUrl ||
    value.dataUrl ||
    value.recordedAt ||
    value.timestamp ||
    value.createdAt
  )
}

export function collectRecordingEntries(payload, context = {}) {
  if (!payload) return []

  if (Array.isArray(payload)) {
    return payload.flatMap(item => collectRecordingEntries(item, context))
  }

  if (looksLikeRecordingEntry(payload)) {
    return [{ ...context, ...payload }]
  }

  if (typeof payload !== 'object') return []

  if (Array.isArray(payload.recordings)) {
    const nextContext = {
      ...context,
      chapterId: payload.chapterId || payload.surahId || context.chapterId || null,
      chapterName: payload.chapterName || payload.surahName || context.chapterName || '',
      ayahKey: payload.ayahKey || payload.verseKey || context.ayahKey || '',
      ayahNumber: payload.ayahNumber || payload.verseNumber || context.ayahNumber || null
    }
    return collectRecordingEntries(payload.recordings, nextContext)
  }

  return Object.entries(payload).flatMap(([key, value]) => {
    let nextContext = { ...context }
    const ayahMatch = key.match(/^(\d+):(\d+)$/)
    const surahMatch = key.match(/^surah[-_: ]?(\d+)$/i)
    const plainAyahMatch = key.match(/^ayah[-_: ]?(\d+)$/i)

    if (ayahMatch) {
      nextContext = {
        ...nextContext,
        chapterId: Number(ayahMatch[1]),
        ayahNumber: Number(ayahMatch[2]),
        ayahKey: key
      }
    } else if (surahMatch) {
      nextContext = {
        ...nextContext,
        chapterId: Number(surahMatch[1])
      }
    } else if (plainAyahMatch && nextContext.chapterId) {
      const ayahNumber = Number(plainAyahMatch[1])
      nextContext = {
        ...nextContext,
        ayahNumber,
        ayahKey: `${nextContext.chapterId}:${ayahNumber}`
      }
    }

    return collectRecordingEntries(value, nextContext)
  })
}

export function createCentralSessionState() {
  return {
    showSaveNameModal: false,
    saveSessionName: '',
    activeTab: 'tools',
    sessionStatus: 'idle',
    sessionCompletedAt: null,
    repetitionTimes: 0,
    tajweedEnabled: false,
    focusModeEnabled: false,
    blurModeEnabled: false,
    blurIntensity: 10,
    anchorModeEnabled: false,
    anchorCount: 2,
    chaining: {
      enabled: true,
      method: 'linking',
      repetitions: 1,
      index: 0,
      segmentIndex: 0,
      consecutiveFailures: 0,
      chain: [],
      lastSuccessfulAyahKey: null
    },
    audio: {
      speed: 1,
      currentTime: 0
    }
  }
}

export function createBeginnerState() {
  return {
    chapterId: 0,
    rangeStart: 1,
    rangeEnd: 7,
    reciterId: DEFAULT_ALQURAN_RECITER,
    speed: 1,
    delay: 2,
    playMode: 'auto',
    order: 'seq',
    loadedConfig: null,
    verses: [],
    activeKey: null,
    queue: [],
    queueIndex: 0,
    sessionActive: false
  }
}

export function createAdvancedState() {
  return {
    chapterId: 0,
    rangeStart: 1,
    rangeEnd: 7,
    reciterId: DEFAULT_ALQURAN_RECITER,
    speed: 1,
    delay: 2,
    playMode: 'auto',
    order: 'seq',
    loadedConfig: null,
    verses: [],
    activeKey: null,
    queue: [],
    queueIndex: 0,
    sessionActive: false
  }
}

export function createPlannerState() {
  return {
    chapterId: 0,
    rangeStart: 1,
    rangeEnd: 1,
    reciterId: DEFAULT_ALQURAN_RECITER,
    speed: 1,
    delay: 2,
    playMode: 'auto',
    order: 'seq',
    loadedConfig: null,
    verses: [],
    activeKey: null,
    queue: [],
    queueIndex: 0,
    sessionActive: false
  }
}

export function mergeArrayBuffers(buffers = []) {
  const validBuffers = (Array.isArray(buffers) ? buffers : []).filter(buffer => buffer && Number(buffer.byteLength || 0) > 0)
  if (!validBuffers.length) return null
  const totalBytes = validBuffers.reduce((sum, buffer) => sum + Number(buffer.byteLength || 0), 0)
  const merged = new Uint8Array(totalBytes)
  let offset = 0
  validBuffers.forEach(buffer => {
    const view = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)
    merged.set(view, offset)
    offset += view.byteLength
  })
  return merged.buffer
}

export function float32ToPcm16Buffer(samples = []) {
  const input = Array.isArray(samples) ? Float32Array.from(samples) : samples
  const pcm = new Int16Array(input.length)
  for (let index = 0; index < input.length; index += 1) {
    const sample = Math.max(-1, Math.min(1, Number(input[index] || 0)))
    pcm[index] = sample < 0 ? sample * 0x8000 : sample * 0x7fff
  }
  return pcm.buffer
}

export function extractSpeechmaticsTranscriptWords(message = {}, { isPartial = false } = {}) {
  return (Array.isArray(message?.results) ? message.results : [])
    .filter(item => item?.type === 'word')
    .map(item => {
      const alternative = Array.isArray(item?.alternatives) ? item.alternatives[0] : null
      const word = String(alternative?.content || '').trim()
      const confidence = Number(alternative?.confidence)
      return {
        word,
        confidence: Number.isFinite(confidence) ? confidence : (isPartial ? SPEECHMATICS_PARTIAL_CONFIDENCE : 1),
        start: Number.isFinite(Number(item?.start_time)) ? Number(item.start_time) : null,
        end: Number.isFinite(Number(item?.end_time)) ? Number(item.end_time) : null
      }
    })
    .filter(item => item.word)
}

export function createRealtimeTranscriptionMeta() {
  return {
    lastMessageAt: 0,
    lastFinalAt: 0,
    endOfTranscriptAt: 0,
    messageCount: 0
  }
}

export function createTranscriptionAudioBridge(stream = null) {
  const AudioContextCtor = typeof window !== 'undefined'
    ? (window.AudioContext || window.webkitAudioContext)
    : null
  if (!stream || !AudioContextCtor) return null

  const audioContext = new AudioContextCtor()
  const createProcessor = typeof audioContext.createScriptProcessor === 'function'
    ? audioContext.createScriptProcessor.bind(audioContext)
    : null
  if (!createProcessor) {
    try { audioContext.close() } catch { }
    return null
  }

  const source = audioContext.createMediaStreamSource(stream)
  const processor = createProcessor(SPEECHMATICS_AUDIO_BUFFER_SIZE, 1, 1)
  const sink = audioContext.createGain()
  sink.gain.value = 0
  const pendingBuffers = []

  processor.onaudioprocess = event => {
    const samples = event?.inputBuffer?.getChannelData?.(0)
    if (!samples?.length) return
    pendingBuffers.push(float32ToPcm16Buffer(samples))
  }

  source.connect(processor)
  processor.connect(sink)
  sink.connect(audioContext.destination)
  audioContext.resume?.().catch(() => {})

  return {
    sampleRate: Number(audioContext.sampleRate || 48000),
    flush() {
      const merged = mergeArrayBuffers(pendingBuffers)
      pendingBuffers.length = 0
      return merged
    },
    stop() {
      const remaining = this.flush()
      try { processor.onaudioprocess = null } catch { }
      try { source.disconnect() } catch { }
      try { processor.disconnect() } catch { }
      try { sink.disconnect() } catch { }
      try { audioContext.close() } catch { }
      return remaining
    }
  }
}

export function createSpeechmaticsRealtimeProvider(options = {}) {
  const noop = () => { }
  let socket = null
  let transcriptHandler = noop
  let errorHandler = noop
  let disconnectHandler = noop
  let readyResolve = null
  let readyReject = null
  let readySettled = false
  let handshakeTimer = null
  let intentionallyClosing = false
  let endOfStreamSent = false
  let sentSeqNo = 0
  let acknowledgedSeqNo = 0
  let recognitionId = ''

  const clearHandshakeTimer = () => {
    if (handshakeTimer) window.clearTimeout(handshakeTimer)
    handshakeTimer = null
  }

  const createProviderError = (message, details = {}) => {
    const error = new Error(message)
    Object.assign(error, details)
    return error
  }

  const settleReady = (resolver, payload) => {
    if (readySettled || typeof resolver !== 'function') return
    readySettled = true
    clearHandshakeTimer()
    resolver(payload)
  }

  const normalizeProviderError = (payload = {}, fallbackMessage = 'Unable to start live streaming right now.', fallbackCategory = 'connection') => {
    const type = String(payload?.type || '').trim().toLowerCase()
    let message = fallbackMessage
    let category = fallbackCategory

    if (type === 'not_authorised') {
      message = 'Live transcription authorisation failed.'
      category = 'auth'
    } else if (['invalid_audio_type', 'invalid_config', 'invalid_message', 'protocol_error'].includes(type)) {
      message = 'Live transcription could not process the audio stream.'
      category = 'stream'
    } else if (['quota_exceeded', 'timelimit_exceeded', 'job_error'].includes(type)) {
      message = 'Live transcription is temporarily unavailable.'
      category = 'connection'
    } else if (type === 'invalid_language' || type === 'invalid_model') {
      message = 'Live transcription configuration is invalid.'
      category = 'connection'
    }

    return createProviderError(message, {
      category,
      providerType: type,
      providerCode: Number.isFinite(Number(payload?.code)) ? Number(payload.code) : null,
      providerReason: String(payload?.reason || '').trim(),
      raw: payload
    })
  }

  const emitError = error => {
    try { errorHandler(error) } catch { }
  }

  const handleTranscriptMessage = message => {
    const isFinal = message?.message === 'AddTranscript'
    const start = Number.isFinite(Number(message?.metadata?.start_time)) ? Number(message.metadata.start_time) : null
    const end = Number.isFinite(Number(message?.metadata?.end_time)) ? Number(message.metadata.end_time) : null
    const words = extractSpeechmaticsTranscriptWords(message, { isPartial: !isFinal })
    const transcript = String(message?.metadata?.transcript || '').trim() || words.map(item => item.word).join(' ')
    transcriptHandler({
      type: isFinal ? 'final' : 'partial',
      provider: 'speechmatics',
      isFinal,
      speechFinal: isFinal,
      transcript,
      confidence: null,
      start,
      duration: start !== null && end !== null ? Math.max(0, end - start) : null,
      segmentId: recognitionId && start !== null && end !== null
        ? `speechmatics:${recognitionId}:${start}:${end}`
        : '',
      words,
      raw: message
    })
  }

  return {
    onTranscript(callback) {
      transcriptHandler = typeof callback === 'function' ? callback : noop
      return this
    },
    onError(callback) {
      errorHandler = typeof callback === 'function' ? callback : noop
      return this
    },
    onDisconnect(callback) {
      disconnectHandler = typeof callback === 'function' ? callback : noop
      return this
    },
    async connect() {
      const auth = await options.getAccessToken?.()
      const accessToken = String(auth?.accessToken || auth?.access_token || '').trim()
      const websocketHost = String(auth?.websocketHost || auth?.websocket_host || '').trim()
      const sampleRate = Number(options.getSampleRate?.() || 0)

      if (!accessToken || !websocketHost || !sampleRate) {
        throw createProviderError('Unable to start live streaming right now.', { category: 'connection' })
      }

      readySettled = false
      intentionallyClosing = false
      endOfStreamSent = false
      sentSeqNo = 0
      acknowledgedSeqNo = 0
      recognitionId = ''

      return await new Promise((resolve, reject) => {
        readyResolve = resolve
        readyReject = reject
        socket = new WebSocket(`wss://${websocketHost}/v2?jwt=${encodeURIComponent(accessToken)}`)
        socket.binaryType = 'arraybuffer'

        handshakeTimer = window.setTimeout(() => {
          const error = createProviderError('Unable to start live streaming right now.', { category: 'connection' })
          settleReady(readyReject, error)
          try { socket?.close() } catch { }
        }, Number(options.handshakeTimeoutMs || 3500))

        socket.onopen = () => {
          try {
            socket.send(JSON.stringify({
              message: 'StartRecognition',
              audio_format: {
                type: 'raw',
                encoding: 'pcm_s16le',
                sample_rate: sampleRate
              },
              transcription_config: {
                language: 'ar',
                enable_partials: true,
                max_delay: SPEECHMATICS_MAX_DELAY_SECONDS,
                max_delay_mode: 'fixed',
                conversation_config: {
                  end_of_utterance_silence_trigger: SPEECHMATICS_END_OF_UTTERANCE_SECONDS
                }
              }
            }))
          } catch (error) {
            const wrapped = createProviderError('Unable to start live streaming right now.', {
              category: 'connection',
              raw: error
            })
            settleReady(readyReject, wrapped)
            emitError(wrapped)
            try { socket?.close() } catch { }
          }
        }

        socket.onmessage = event => {
          let message = null
          try {
            message = JSON.parse(String(event?.data || '{}'))
          } catch {
            return
          }

          if (message?.message === 'RecognitionStarted') {
            recognitionId = String(message?.id || '').trim()
            settleReady(readyResolve, true)
            return
          }

          if (message?.message === 'AudioAdded') {
            const seqNo = Number(message?.seq_no)
            if (Number.isFinite(seqNo)) acknowledgedSeqNo = seqNo
            return
          }

          if (message?.message === 'AddPartialTranscript' || message?.message === 'AddTranscript') {
            handleTranscriptMessage(message)
            return
          }

          if (message?.message === 'EndOfTranscript') {
            transcriptHandler({
              type: 'end-of-transcript',
              provider: 'speechmatics',
              raw: message
            })
            return
          }

          if (message?.message === 'Error') {
            const error = normalizeProviderError(message, 'Live transcription disconnected unexpectedly.', readySettled ? 'stream' : 'connection')
            settleReady(readyReject, error)
            emitError(error)
          }
        }

        socket.onerror = () => {
          if (!readySettled) {
            settleReady(readyReject, createProviderError('Unable to start live streaming right now.', { category: 'connection' }))
          }
        }

        socket.onclose = event => {
          clearHandshakeTimer()
          const wasIntentional = intentionallyClosing
          const closeCode = Number(event?.code || 0)
          const category = closeCode === 4001 ? 'auth' : (readySettled ? 'stream' : 'connection')
          const message = category === 'auth'
            ? 'Live transcription authorisation failed.'
            : (readySettled ? 'Live transcription disconnected unexpectedly.' : 'Unable to start live streaming right now.')

          if (!wasIntentional) {
            const error = createProviderError(message, {
              category,
              closeCode,
              closeReason: String(event?.reason || '').trim(),
              raw: event
            })
            settleReady(readyReject, error)
            if (readySettled) emitError(error)
          }

          socket = null
          intentionallyClosing = false
          try { disconnectHandler({ event, intentional: wasIntentional }) } catch { }
        }
      })
    },
    streamAudioChunk(chunk) {
      if (!socket || socket.readyState !== WebSocket.OPEN || endOfStreamSent) return false
      const buffer = chunk instanceof ArrayBuffer ? chunk : mergeArrayBuffers([chunk])
      if (!buffer?.byteLength) return false
      try {
        socket.send(buffer)
        sentSeqNo += 1
        return true
      } catch (error) {
        emitError(createProviderError('Live transcription could not process the audio stream.', {
          category: 'stream',
          raw: error
        }))
        return false
      }
    },
    endStream() {
      if (!socket || socket.readyState !== WebSocket.OPEN || endOfStreamSent) return false
      try {
        socket.send(JSON.stringify({
          message: 'EndOfStream',
          last_seq_no: Math.max(acknowledgedSeqNo, sentSeqNo)
        }))
        endOfStreamSent = true
        return true
      } catch {
        return false
      }
    },
    disconnect() {
      intentionallyClosing = true
      clearHandshakeTimer()
      if (!socket) return
      try {
        socket.close()
      } catch { }
    },
    isOpen() {
      return !!socket && socket.readyState === WebSocket.OPEN
    }
  }
}

