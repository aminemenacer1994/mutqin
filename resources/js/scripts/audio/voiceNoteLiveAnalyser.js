export const VOICE_NOTE_WAVEFORM_BAR_COUNT = 28

/**
 * Downsample frequency bins into 0–1 bar levels for waveform UI.
 * @param {Uint8Array|number[]} bins
 * @param {number} barCount
 */
export function sampleWaveformBarLevels(bins, barCount = VOICE_NOTE_WAVEFORM_BAR_COUNT) {
  const count = Math.max(1, Math.floor(Number(barCount) || VOICE_NOTE_WAVEFORM_BAR_COUNT))
  if (!bins?.length) return Array.from({ length: count }, () => 0.08)

  const step = bins.length / count
  const levels = []
  for (let index = 0; index < count; index += 1) {
    const start = Math.floor(index * step)
    const end = Math.max(start + 1, Math.floor((index + 1) * step))
    let peak = 0
    for (let cursor = start; cursor < end && cursor < bins.length; cursor += 1) {
      peak = Math.max(peak, bins[cursor])
    }
    const normalized = peak / 255
    levels.push(Math.max(0.08, Math.min(1, normalized * 1.35)))
  }
  return levels
}

export function idleWaveformBarLevels(barCount = VOICE_NOTE_WAVEFORM_BAR_COUNT) {
  return Array.from({ length: Math.max(1, barCount) }, (_, index) => (
    0.08 + ((index % 5) * 0.015)
  ))
}

/**
 * @param {MediaStream} stream
 * @returns {{ sampleBarLevels: (barCount?: number) => number[], stop: () => void } | null}
 */
export function attachVoiceNoteAnalyser(stream) {
  if (typeof window === 'undefined') return null
  const AudioContextCtor = window.AudioContext || window.webkitAudioContext
  if (!stream || !AudioContextCtor) return null

  let audioContext
  let analyser
  let source
  let frequencyData

  try {
    audioContext = new AudioContextCtor()
    analyser = audioContext.createAnalyser()
    analyser.fftSize = 256
    analyser.smoothingTimeConstant = 0.82
    source = audioContext.createMediaStreamSource(stream)
    source.connect(analyser)
    frequencyData = new Uint8Array(analyser.frequencyBinCount)
  } catch {
    return null
  }

  const resumeContext = () => {
    if (!audioContext || audioContext.state === 'closed') return
    if (audioContext.state === 'suspended') {
      try { void audioContext.resume() } catch { /* ignore */ }
    }
  }

  return {
    sampleBarLevels(barCount = VOICE_NOTE_WAVEFORM_BAR_COUNT) {
      if (!analyser || !frequencyData) return idleWaveformBarLevels(barCount)
      resumeContext()
      analyser.getByteFrequencyData(frequencyData)
      return sampleWaveformBarLevels(frequencyData, barCount)
    },
    stop() {
      try { source?.disconnect?.() } catch { /* ignore */ }
      try { analyser?.disconnect?.() } catch { /* ignore */ }
      source = null
      analyser = null
      frequencyData = null
      if (audioContext && audioContext.state !== 'closed') {
        try { void audioContext.close() } catch { /* ignore */ }
      }
      audioContext = null
    },
  }
}
