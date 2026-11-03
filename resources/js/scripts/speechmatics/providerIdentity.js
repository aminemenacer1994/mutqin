import { markRaw } from 'vue'

// Socket callbacks use object identity to ignore messages from an older take.
export function stableTranscriptionProvider(provider) {
  return provider ? markRaw(provider) : null
}
