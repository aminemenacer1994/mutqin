/**
 * Shared MediaRecorder MIME selection, blob finalisation, and object-URL lifecycle
 * for AI Recite / self-check review playback.
 */

export const REVIEW_AUDIO_STATES = Object.freeze({
  IDLE: 'idle',
  REQUESTING_PERMISSION: 'requesting_permission',
  RECORDING: 'recording',
  STOPPING: 'stopping',
  RECORDED: 'recorded',
  UPLOADING: 'uploading',
  READY: 'ready',
  LOADING_AUDIO: 'loading_audio',
  PLAYING: 'playing',
  PAUSED: 'paused',
  ENDED: 'ended',
  ERROR: 'error',
})

const RECORDER_MIME_CANDIDATES = Object.freeze([
  'audio/mp4',
  'audio/webm;codecs=opus',
  'audio/webm',
  'audio/ogg;codecs=opus',
  'audio/ogg',
  'audio/wav',
])

export function chooseSupportedRecorderMimeType() {
  if (typeof MediaRecorder === 'undefined') return ''
  if (typeof MediaRecorder.isTypeSupported !== 'function') return ''
  return RECORDER_MIME_CANDIDATES.find(type => {
    try {
      return MediaRecorder.isTypeSupported(type)
    } catch {
      return false
    }
  }) || ''
}

export function extensionForMimeType(mimeType = '') {
  const type = String(mimeType || '').toLowerCase()
  if (type.includes('mp4') || type.includes('aac') || type.includes('m4a')) return 'm4a'
  if (type.includes('ogg')) return 'ogg'
  if (type.includes('wav')) return 'wav'
  if (type.includes('mpeg') || type.includes('mp3')) return 'mp3'
  return 'webm'
}

const MAX_MEDIA_DURATION_SECONDS = 86400

export function sanitizeAudioDuration(duration) {
  const value = Number(duration)
  if (!Number.isFinite(value) || value <= 0 || value > MAX_MEDIA_DURATION_SECONDS) return 0
  return value
}

/** Finite media duration from an HTMLAudioElement, or 0 when unknown. */
export function readMediaDuration(audio) {
  return sanitizeAudioDuration(audio?.duration)
}

/**
 * Resolve duration for WebM / Safari blobs where metadata reports NaN or Infinity.
 * Seeks to the end and reads currentTime after seeked; restores the prior time when idle.
 */
export function probeIndeterminateMediaDuration(audio, { timeoutMs = 4000 } = {}) {
  if (!audio) return Promise.resolve(0)
  const immediate = readMediaDuration(audio)
  if (immediate > 0) return Promise.resolve(immediate)

  return new Promise((resolve) => {
    let settled = false
    const previousTime = Number(audio.currentTime) || 0
    const wasPaused = !!audio.paused

    const finish = (value) => {
      if (settled) return
      settled = true
      cleanup()
      const resolved = sanitizeAudioDuration(value)
      if (wasPaused) {
        try { audio.currentTime = previousTime } catch { /* ignore */ }
      }
      resolve(resolved)
    }

    const cleanup = () => {
      clearTimeout(timeoutId)
      audio.removeEventListener('seeked', onSeeked)
      audio.removeEventListener('durationchange', onDurationChange)
      audio.removeEventListener('loadedmetadata', onDurationChange)
    }

    const onDurationChange = () => {
      const next = readMediaDuration(audio)
      if (next > 0) finish(next)
    }

    const onSeeked = () => {
      finish(Math.max(readMediaDuration(audio), sanitizeAudioDuration(audio.currentTime)))
    }

    const timeoutId = setTimeout(() => {
      finish(Math.max(readMediaDuration(audio), sanitizeAudioDuration(audio.currentTime)))
    }, timeoutMs)

    audio.addEventListener('seeked', onSeeked)
    audio.addEventListener('durationchange', onDurationChange)
    audio.addEventListener('loadedmetadata', onDurationChange)

    if (Number(audio.readyState || 0) < 1) {
      finish(0)
      return
    }

    try {
      audio.currentTime = 1e10
    } catch {
      finish(0)
    }
  })
}

export function createObjectUrlFromBlob(blob) {
  if (!blob || typeof URL === 'undefined' || typeof URL.createObjectURL !== 'function') return ''
  try {
    return URL.createObjectURL(blob)
  } catch {
    return ''
  }
}

export function revokeObjectUrl(url) {
  if (!url || typeof URL === 'undefined' || typeof URL.revokeObjectURL !== 'function') return
  if (!String(url).startsWith('blob:')) return
  try {
    URL.revokeObjectURL(url)
  } catch {
    // ignore
  }
}

/**
 * Wait until MediaRecorder has emitted its final dataavailable + stop events,
 * then return a non-empty Blob.
 */
export function stopMediaRecorderAndCollectBlob(recorder, chunksRef, options = {}) {
  const mimeType = options.mimeType || recorder?.mimeType || ''
  const timeoutMs = Number(options.timeoutMs || 8000)

  return new Promise((resolve, reject) => {
    if (!recorder) {
      reject(new Error('Recorder is unavailable'))
      return
    }

    const chunks = Array.isArray(chunksRef) ? chunksRef : []
    let settled = false
    let timeoutId = null

    const finish = () => {
      if (settled) return
      settled = true
      if (timeoutId) clearTimeout(timeoutId)
      const type = mimeType || recorder.mimeType || 'audio/webm'
      const blob = new Blob(chunks.slice(), { type })
      if (!blob.size) {
        reject(new Error('No audio captured'))
        return
      }
      resolve(blob)
    }

    const onData = (event) => {
      if (event?.data?.size) chunks.push(event.data)
    }

    const onStop = () => {
      recorder.removeEventListener?.('dataavailable', onData)
      recorder.removeEventListener?.('stop', onStop)
      // Allow any final synchronous dataavailable to flush first.
      queueMicrotask(finish)
    }

    timeoutId = setTimeout(() => {
      recorder.removeEventListener?.('dataavailable', onData)
      recorder.removeEventListener?.('stop', onStop)
      if (settled) return
      settled = true
      const type = mimeType || recorder.mimeType || 'audio/webm'
      const blob = new Blob(chunks.slice(), { type })
      if (!blob.size) {
        reject(new Error('Recording timed out before audio was ready'))
        return
      }
      resolve(blob)
    }, timeoutMs)

    recorder.addEventListener?.('dataavailable', onData)
    recorder.addEventListener?.('stop', onStop)

    try {
      if (recorder.state === 'inactive') {
        onStop()
        return
      }
      recorder.requestData?.()
      recorder.stop()
    } catch (error) {
      recorder.removeEventListener?.('dataavailable', onData)
      recorder.removeEventListener?.('stop', onStop)
      if (timeoutId) clearTimeout(timeoutId)
      settled = true
      reject(error)
    }
  })
}

/**
 * Bind a stable review audio source onto an HTMLAudioElement.
 * Returns a promise that resolves when metadata is usable or rejects on error.
 */
export function bindAudioSource(audio, source, options = {}) {
  if (!audio || !source) {
    return Promise.reject(new Error('Audio source is unavailable'))
  }

  const previousSrc = audio.getAttribute('src') || audio.src || ''
  if (previousSrc === source && Number.isFinite(audio.duration) && audio.duration > 0) {
    return Promise.resolve({
      duration: sanitizeAudioDuration(audio.duration),
      reused: true,
    })
  }

  return new Promise((resolve, reject) => {
    let settled = false
    const timeoutMs = Number(options.timeoutMs || 10000)
    let timeoutId = null

    const cleanup = () => {
      audio.removeEventListener('loadedmetadata', onMeta)
      audio.removeEventListener('canplay', onCanPlay)
      audio.removeEventListener('error', onError)
      if (timeoutId) clearTimeout(timeoutId)
    }

    const done = (ok, payload) => {
      if (settled) return
      settled = true
      cleanup()
      if (ok) resolve(payload)
      else reject(payload)
    }

    const onMeta = () => {
      const duration = sanitizeAudioDuration(audio.duration)
      // Infinity/NaN (common with some WebM containers) — still allow playback.
      done(true, { duration, reused: false })
    }

    const onCanPlay = () => {
      const duration = sanitizeAudioDuration(audio.duration)
      done(true, { duration, reused: false })
    }

    const onError = () => {
      done(false, new Error('Unable to load recording'))
    }

    timeoutId = setTimeout(() => {
      // Soft-resolve so the user can still try play(); duration may arrive later.
      done(true, { duration: sanitizeAudioDuration(audio.duration), reused: false, timedOut: true })
    }, timeoutMs)

    audio.addEventListener('loadedmetadata', onMeta)
    audio.addEventListener('canplay', onCanPlay)
    audio.addEventListener('error', onError)
    audio.src = source
    try {
      audio.load()
    } catch (error) {
      done(false, error)
    }
  })
}

export async function playAudioElement(audio) {
  if (!audio) throw new Error('Audio player is unavailable')
  const result = audio.play()
  if (result && typeof result.then === 'function') {
    await result
  }
  return true
}

/** @param {number} seconds */
export function formatClock(seconds) {
  const total = Math.max(0, Math.floor(Number(seconds) || 0))
  const minutes = Math.floor(total / 60)
  const rest = String(total % 60).padStart(2, '0')
  return `${minutes}:${rest}`
}
