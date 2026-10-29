import assert from 'node:assert/strict'
import { classifyAsyncLoadError } from '../../resources/js/utils/asyncLoadError.js'
import { isChunkLoadError } from '../../resources/js/utils/chunkLoadRecovery.js'

assert.equal(classifyAsyncLoadError({ name: 'ChunkLoadError', message: 'Loading chunk x failed' }), 'chunk')
assert.equal(
  classifyAsyncLoadError({ message: 'Failed to fetch dynamically imported module: https://x/y.js' }),
  'chunk',
)
assert.equal(
  classifyAsyncLoadError({ message: "Cannot find module '../scripts/audio/recordingPlayback.js'" }),
  'generic',
)
assert.equal(isChunkLoadError({ message: "Cannot find module '../scripts/audio/recordingPlayback.js'" }), false)

console.log('async-load-error.test.mjs: ok')
