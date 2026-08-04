/**
 * Local acoustic practice helpers — RMS energy envelopes only (no external AI).
 */

function rmsFrame(samples, offset, size) {
  let sum = 0
  const end = Math.min(samples.length, offset + size)
  const count = Math.max(1, end - offset)
  for (let i = offset; i < end; i += 1) {
    const v = samples[i] || 0
    sum += v * v
  }
  return Math.sqrt(sum / count)
}

/**
 * @param {Float32Array|number[]} samples
 * @param {{ frameSize?: number, hop?: number }} [opts]
 * @returns {number[]}
 */
export function buildRmsEnvelope(samples, opts = {}) {
  const data = samples || []
  const frameSize = Math.max(64, Number(opts.frameSize) || 1024)
  const hop = Math.max(32, Number(opts.hop) || Math.floor(frameSize / 2))
  const envelope = []
  for (let i = 0; i + frameSize <= data.length; i += hop) {
    envelope.push(rmsFrame(data, i, frameSize))
  }
  if (!envelope.length && data.length) {
    envelope.push(rmsFrame(data, 0, data.length))
  }
  return envelope
}

export function normalizeEnvelope(envelope = []) {
  const max = Math.max(...envelope.map((v) => Math.abs(v)), 1e-9)
  return envelope.map((v) => v / max)
}

export function cosineSimilarity(a = [], b = []) {
  const n = Math.min(a.length, b.length)
  if (n < 2) return null
  let dot = 0
  let na = 0
  let nb = 0
  for (let i = 0; i < n; i += 1) {
    const x = a[i] || 0
    const y = b[i] || 0
    dot += x * y
    na += x * x
    nb += y * y
  }
  if (na <= 0 || nb <= 0) return null
  return dot / (Math.sqrt(na) * Math.sqrt(nb))
}

export function sliceSamples(samples, sampleRate, startSec, endSec) {
  if (!samples?.length || !sampleRate) return new Float32Array(0)
  const start = Math.max(0, Math.floor(Number(startSec || 0) * sampleRate))
  const end = Math.min(samples.length, Math.ceil(Number(endSec || 0) * sampleRate))
  if (end <= start) return new Float32Array(0)
  return samples.slice(start, end)
}

/**
 * @returns {'similar'|'different'|'unable_to_assess'}
 */
export function classifyEnvelopeSimilarity(
  learnerEnv,
  referenceEnv,
  threshold = 0.5,
) {
  const a = normalizeEnvelope(learnerEnv)
  const b = normalizeEnvelope(referenceEnv)
  const score = cosineSimilarity(a, b)
  if (score == null) return 'unable_to_assess'
  return score >= threshold ? 'similar' : 'different'
}

/**
 * Decode an audio Blob/ArrayBuffer to mono Float32Array via Web Audio.
 * Returns null outside browser or on failure.
 */
export async function decodeAudioToMono(blobOrBuffer, audioContextFactory = null) {
  if (typeof window === 'undefined' && !audioContextFactory) return null
  try {
    const Ctx = audioContextFactory
      || window.AudioContext
      || window.webkitAudioContext
    if (!Ctx) return null
    const ctx = new Ctx()
    const buffer = blobOrBuffer instanceof ArrayBuffer
      ? blobOrBuffer
      : await blobOrBuffer.arrayBuffer()
    const audioBuffer = await ctx.decodeAudioData(buffer.slice(0))
    const channel = audioBuffer.getChannelData(0)
    const mono = new Float32Array(channel.length)
    mono.set(channel)
    if (audioBuffer.numberOfChannels > 1) {
      for (let c = 1; c < audioBuffer.numberOfChannels; c += 1) {
        const data = audioBuffer.getChannelData(c)
        for (let i = 0; i < mono.length; i += 1) mono[i] = (mono[i] + data[i]) * 0.5
      }
    }
    const sampleRate = audioBuffer.sampleRate
    try { await ctx.close?.() } catch (_) { /* ignore */ }
    return { samples: mono, sampleRate, duration: audioBuffer.duration }
  } catch (_) {
    return null
  }
}

export async function fetchAndDecodeAudio(url, fetchImpl = fetch, audioContextFactory = null) {
  if (!url) return null
  try {
    const response = await fetchImpl(url)
    if (!response?.ok) return null
    const buffer = await response.arrayBuffer()
    return decodeAudioToMono(buffer, audioContextFactory)
  } catch (_) {
    return null
  }
}

/**
 * Compare learner word window vs reference word window.
 */
export function compareWordWindows({
  learnerSamples,
  learnerRate,
  learnerStart,
  learnerEnd,
  referenceSamples,
  referenceRate,
  referenceStart,
  referenceEnd,
} = {}) {
  if (
    !learnerSamples?.length
    || !referenceSamples?.length
    || learnerStart == null
    || learnerEnd == null
    || referenceStart == null
    || referenceEnd == null
  ) {
    return { status: 'unable_to_assess', similarity: null }
  }
  const learnerSlice = sliceSamples(learnerSamples, learnerRate, learnerStart, learnerEnd)
  const refSlice = sliceSamples(referenceSamples, referenceRate, referenceStart, referenceEnd)
  if (learnerSlice.length < 64 || refSlice.length < 64) {
    return { status: 'unable_to_assess', similarity: null }
  }
  const learnerEnv = buildRmsEnvelope(learnerSlice)
  const refEnv = buildRmsEnvelope(refSlice)
  const similarity = cosineSimilarity(normalizeEnvelope(learnerEnv), normalizeEnvelope(refEnv))
  return {
    status: classifyEnvelopeSimilarity(
      learnerEnv,
      refEnv,
      0.5, // keep aligned with HOLD_TOLERANCE.acousticSimilarityThreshold
    ),
    similarity,
  }
}
