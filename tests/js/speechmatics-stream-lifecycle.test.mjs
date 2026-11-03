import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import { buildSpeechmaticsRecognitionUpdate } from '../../resources/js/scripts/memorisationDetection/speechmaticsDelays.js'
import { buildSpeechmaticsRecitationConfig } from '../../resources/js/scripts/speechmatics/quranVocabulary.js'

class Socket {
  static OPEN = 1
  static instances = []
  constructor() { this.readyState = 0; this.sent = []; this.bufferedAmount = 0; this.listeners = new Set(); Socket.instances.push(this) }
  send(data) { this.sent.push(typeof data === 'string' ? JSON.parse(data) : data) }
  open() { this.readyState = 1; this.onopen?.() }
  message(data) { this.onmessage?.({ data: JSON.stringify(data) }) }
  addEventListener(type, fn) { this.listeners.add(fn) }
  removeEventListener(type, fn) { this.listeners.delete(fn) }
  close() { this.readyState = 3; this.onclose?.({ code: 1000 }); for (const fn of this.listeners) fn() }
}
let processor
class AudioContext {
  state = 'running'; sampleRate = 48000; destination = {}
  createMediaStreamSource() { return { connect() {}, disconnect() {} } }
  createGain() { return { gain: {}, connect() {}, disconnect() {} } }
  createScriptProcessor() { processor = { connect() {}, disconnect() {} }; return processor }
  close() { this.state = 'closed'; return Promise.resolve() }
}
const context = vm.createContext({
  console, ArrayBuffer, Uint8Array, Float32Array, Int16Array, URL, Date,
  window: { setTimeout, clearTimeout, AudioContext }, WebSocket: Socket,
  SPEECHMATICS_PARTIAL_CONFIDENCE: 0.4, SPEECHMATICS_AUDIO_BUFFER_SIZE: 1024,
  SPEECHMATICS_MAX_PENDING_AUDIO_SECONDS: 15, SPEECHMATICS_MAX_DRAIN_BUFFERS: 8,
  SPEECHMATICS_SOCKET_BACKPRESSURE_BYTES: 256 * 1024,
  buildSpeechmaticsRecognitionUpdate, buildSpeechmaticsRecitationConfig,
})
const source = readFileSync('resources/js/scripts/memorisationRuntime.js', 'utf8')
const mod = new vm.SourceTextModule(source.slice(source.indexOf('export function mergeArrayBuffers')), { context })
await mod.link(() => { throw new Error('Unexpected dependency') })
await mod.evaluate()
const { createSpeechmaticsRealtimeProvider, createTranscriptionAudioBridge, extractSpeechmaticsTranscriptWords } = mod.namespace
const make = () => createSpeechmaticsRealtimeProvider({ getAccessToken: async () => ({ accessToken: 'test', websocketHost: 'test.invalid' }), getSampleRate: () => 48000 })
async function connect(provider) {
  const ready = provider.connect()
  await new Promise(resolve => setImmediate(resolve))
  const socket = Socket.instances.at(-1)
  socket.open()
  assert.equal(provider.streamAudioChunk(new ArrayBuffer(2)), false, 'no audio before RecognitionStarted')
  socket.message({ message: 'RecognitionStarted', id: 'test-session' })
  await ready
  return socket
}
{
  const events = [], errors = []
  const provider = make().onTranscript(e => events.push(e)).onError(e => errors.push(e))
  const socket = await connect(provider)
  assert.equal(socket.sent[0].audio_format.sample_rate, 48000)
  assert.equal(socket.sent[0].audio_format.encoding, 'pcm_s16le')
  assert.equal(provider.streamAudioChunk(new ArrayBuffer(4)), true)
  const done = provider.finishStream(new ArrayBuffer(6), { timeoutMs: 100 })
  assert.equal(socket.sent.at(-1).message, 'EndOfStream')
  assert.equal(socket.sent.at(-1).last_seq_no, 2)
  let resolved = false
  done.then(() => { resolved = true })
  socket.message({ message: 'AddTranscript', metadata: { start_time: 0, end_time: 1 }, results: [{ type: 'word', alternatives: [{ content: 'أحد', confidence: 0.95 }] }] })
  await Promise.resolve()
  assert.equal(resolved, false, 'a final segment is not the completed stream')
  socket.message({ message: 'EndOfTranscript' })
  await done
  socket.close()
  assert.equal(events[0].words[0].word, 'أحد', 'tail is delivered before completion')
  assert.equal(errors.length, 0, 'normal provider close after completion is not a failure')
}
{
  const provider = make(); const socket = await connect(provider)
  socket.bufferedAmount = 300000
  const done = provider.finishStream(new ArrayBuffer(8), { timeoutMs: 200 })
  assert.equal(socket.sent.length, 1, 'must not send EndOfStream ahead of backpressured audio')
  socket.bufferedAmount = 0
  await new Promise(resolve => setTimeout(resolve, 25))
  assert.equal(socket.sent.at(-1).last_seq_no, 1)
  socket.message({ message: 'EndOfTranscript' }); await done; await provider.disconnect()
}
{
  const provider = make(); const socket = await connect(provider)
  const done = provider.finishStream(null, { timeoutMs: 10 })
  await assert.rejects(done, /did not finish/)
  await provider.disconnect()
}
{
  const provider = make(); const socket = await connect(provider)
  const done = provider.finishStream(null, { timeoutMs: 100 })
  socket.close()
  await assert.rejects(done, /disconnected/)
}
{
  let tokenReady
  const provider = createSpeechmaticsRealtimeProvider({ getAccessToken: () => new Promise(resolve => { tokenReady = resolve }), getSampleRate: () => 48000 })
  const count = Socket.instances.length
  const ready = provider.connect()
  await provider.disconnect()
  tokenReady({ accessToken: 'test', websocketHost: 'test.invalid' })
  await assert.rejects(ready, /cancelled/)
  assert.equal(Socket.instances.length, count, 'cancelling during token mint must not open an orphan socket')
}
{
  const provider = make(); const socket = await connect(provider)
  socket.onmessage({ data: '{invalid' })
  await assert.rejects(provider.finishStream(), /invalid response/)
}
{
  const provider = make(); const socket = await connect(provider)
  socket.message({ message: 'Warning', type: 'duration_limit_exceeded' })
  await assert.rejects(provider.finishStream(), /duration limit/)
}
assert.equal(extractSpeechmaticsTranscriptWords({ results: [{ type: 'word', alternatives: [{ content: 'الله' }] }] })[0].confidence, 0.4, 'missing confidence must not become certainty')
{
  const bridge = createTranscriptionAudioBridge({})
  assert.equal(await bridge.ensureRunning(), true)
  for (let i = 0; i < 100; i++) processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(1024).fill(0.1) } })
  assert.equal(bridge.pendingBufferCount(), 100, 'more than one second of startup audio is retained')
  assert.equal(bridge.getQualityMetrics().complete, true)
  const capture = await bridge.finishCapture()
  assert.equal(capture.buffer.byteLength, 100 * 1024 * 2)
  assert.equal(capture.metrics.complete, true)
}
{
  const bridge = createTranscriptionAudioBridge({}); await bridge.ensureRunning()
  for (let i = 0; i < 800; i++) processor.onaudioprocess({ inputBuffer: { getChannelData: () => new Float32Array(1024) } })
  assert.equal(bridge.getQualityMetrics().broken, true, 'overflow cannot silently yield scored omissions')
  assert.ok(bridge.pendingBufferCount() < 800)
  bridge.stop()
}
{
  let Worklet
  const messages = []
  class Processor { port = { postMessage: data => messages.push(data) } }
  vm.runInNewContext(readFileSync('resources/js/scripts/audio/pcmCapture.worklet.js', 'utf8'), { AudioWorkletProcessor: Processor, registerProcessor: (_, ctor) => { Worklet = ctor }, Float32Array, Int16Array })
  const worklet = new Worklet()
  for (let i = 0; i < 9; i++) worklet.process([[new Float32Array(128).fill(0.5)]])
  worklet.port.onmessage({ data: 'stop' })
  assert.deepEqual(messages.filter(m => m.buffer).map(m => m.buffer.byteLength), [2048, 256], 'stop flushes the final sub-frame')
  assert.equal(messages.at(-1).stopped, true)
}
console.log('speechmatics-stream-lifecycle: 10 cases passed (fake transport, no provider accuracy claim)')
