import { buildDeterministicRecitationResult } from './recitation_analysis.js'

self.onmessage = ({ data }) => {
  try {
    self.postMessage({ result: buildDeterministicRecitationResult(data.targetText, data.words, data.options) })
  } catch (error) {
    self.postMessage({ error: String(error?.message || error) })
  }
}
