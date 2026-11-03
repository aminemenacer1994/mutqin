import assert from 'node:assert/strict'
import { reactive } from 'vue'
import { assessRecitationInWorker } from '../../resources/js/scripts/engine/recitationAssessmentWorker.js'
import { buildDeterministicRecitationResult } from '../../resources/js/scripts/engine/recitation_analysis.js'

let terminated = false
globalThis.Worker = class {
  postMessage(input) {
    // Structured cloning fails on Vue proxies; this must be a plain snapshot.
    structuredClone(input)
    queueMicrotask(() => this.onmessage({ data: { result: buildDeterministicRecitationResult(input.targetText, input.words, input.options) } }))
  }
  terminate() { terminated = true }
}
const words = reactive([{ word: 'قل', confidence: 0.95 }, { word: 'هي', confidence: 0.95 }])
const result = await assessRecitationInWorker('قل هو', words, { strictProgression: false })
assert.equal(result.wordStatuses[0].status, 'correct')
assert.equal(result.wordStatuses[1].status, 'incorrect')
assert.equal(terminated, true)
delete globalThis.Worker
assert.equal(await assessRecitationInWorker('قل', words, {}), null)
console.log('recitation-assessment-worker: passed')
