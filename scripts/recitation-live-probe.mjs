// Opt-in live provider check. Reads credentials locally; never prints tokens.
// Usage: node --experimental-vm-modules scripts/recitation-live-probe.mjs audio.pcm target.txt report.json
// Audio must be mono signed 16-bit little-endian PCM at 16 kHz.
import { readFileSync, writeFileSync } from 'node:fs'
import vm from 'node:vm'
import { performance } from 'node:perf_hooks'
import { buildSpeechmaticsRecognitionUpdate } from '../resources/js/scripts/memorisationDetection/speechmaticsDelays.js'
import { buildSpeechmaticsRecitationConfig } from '../resources/js/scripts/speechmatics/quranVocabulary.js'
import { createRecognitionState, stabilizeRecognitionEvent, buildQuranAlignment } from '../resources/js/scripts/engine/recitation_analysis.js'
const [audioFile, targetFile, reportFile] = process.argv.slice(2)
if (!audioFile || !targetFile || !reportFile) throw new Error('Supply PCM, expected-text and report paths.')
const env = Object.fromEntries(readFileSync('.env', 'utf8').split('\n').filter(l => /^[A-Z_]+=/.test(l)).map(l => { const i = l.indexOf('='); return [l.slice(0, i), l.slice(i + 1).trim().replace(/^['"]|['"]$/g, '')] }))
const key = process.env.SPEECHMATICS_API_KEY || env.SPEECHMATICS_API_KEY
if (!key) throw new Error('Speechmatics credentials are not configured.')
const region = process.env.SPEECHMATICS_REGION || env.SPEECHMATICS_REGION
if (!['eu', 'us'].includes(region)) throw new Error('Configure the same Speechmatics region as the application.')
const context = vm.createContext({
  console, ArrayBuffer, Uint8Array, Float32Array, Int16Array, URL, Date,
  window: { setTimeout, clearTimeout }, WebSocket,
  SPEECHMATICS_PARTIAL_CONFIDENCE: 0.4, SPEECHMATICS_SOCKET_BACKPRESSURE_BYTES: 262144,
  buildSpeechmaticsRecognitionUpdate, buildSpeechmaticsRecitationConfig,
})
const source = readFileSync('resources/js/scripts/memorisationRuntime.js', 'utf8')
const mod = new vm.SourceTextModule(source.slice(source.indexOf('export function mergeArrayBuffers')), { context })
await mod.link(() => { throw new Error('Unexpected import') }); await mod.evaluate()
const started = performance.now()
let state = createRecognitionState(), firstPartialMs = null, firstFinalMs = null, partials = 0, finals = 0
const provider = mod.namespace.createSpeechmaticsRealtimeProvider({
  getAccessToken: async () => {
    const response = await fetch('https://mp.speechmatics.com/v1/api_keys?type=rt', {
      method: 'POST', headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ttl: 60 }), signal: AbortSignal.timeout(15000),
    })
    if (!response.ok) throw new Error(`Token mint HTTP ${response.status}`)
    const data = await response.json()
    return { accessToken: data.key_value, websocketHost: `${region}.rt.speechmatics.com` }
  },
  getSampleRate: () => 16000, amdLive: true, handshakeTimeoutMs: 10000,
  maxDelaySeconds: 0.7, endOfUtteranceSeconds: 0.7,
}).onTranscript(event => {
  if (event.type === 'end-of-transcript') return
  if (event.isFinal) { finals++; firstFinalMs ??= performance.now() - started }
  else { partials++; firstPartialMs ??= performance.now() - started }
  state = stabilizeRecognitionEvent(state, event, { confidenceThreshold: 0.35 })
})
const report = { audioFile, sampleRate: 16000, region, testType: 'live-provider-file-stream' }
try {
  await provider.connect()
  report.connectMs = performance.now() - started
  const audio = readFileSync(audioFile)
  report.audioSeconds = audio.length / 32000
  const audioStarted = performance.now()
  for (let offset = 0; offset < audio.length; offset += 3200) {
    const chunk = audio.subarray(offset, offset + 3200)
    if (!provider.streamAudioChunk(chunk.buffer.slice(chunk.byteOffset, chunk.byteOffset + chunk.byteLength))) throw new Error('Audio could not be transmitted.')
    const delay = audioStarted + (offset + chunk.length) / 32 - performance.now()
    if (delay > 0) await new Promise(resolve => setTimeout(resolve, delay))
  }
  const stopAt = performance.now()
  await provider.finishStream(null, { timeoutMs: 10000 })
  report.finalProcessingMs = performance.now() - stopAt
  Object.assign(report, { firstPartialMs, firstFinalMs, partials, finals, words: state.committedWords, expected: readFileSync(targetFile, 'utf8').trim() })
  const aligned = buildQuranAlignment(report.expected, state.committedWords)
  report.assessment = { words: aligned.wordStatuses, extras: aligned.extraWords, scenarios: aligned.scenarioCounts }
  report.completed = true
} catch (error) {
  report.completed = false
  report.error = String(error.message).replace(/jwt=[^\s]+/g, 'jwt=[redacted]')
} finally { await provider.disconnect() }
writeFileSync(reportFile, JSON.stringify(report, null, 2))
console.log(JSON.stringify({ completed: report.completed, error: report.error, connectMs: report.connectMs, firstPartialMs, firstFinalMs, finalProcessingMs: report.finalProcessingMs, transcript: state.committedWords.map(w => w.word).join(' '), reportFile }))
if (!report.completed) process.exitCode = 1
