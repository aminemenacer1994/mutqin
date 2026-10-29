import { isChunkLoadError } from './chunkLoadRecovery.js'

/** @returns {'chunk' | 'generic'} */
export function classifyAsyncLoadError(error) {
  if (isChunkLoadError(error)) return 'chunk'
  return 'generic'
}

export function logAsyncLoadError(error, feature = 'page') {
  const name = String(feature || 'page')
  console.error(`[Mutqin async load:${name}]`, error)
}
