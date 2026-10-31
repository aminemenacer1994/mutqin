import assert from 'node:assert/strict'
import {
  getSilentUnlockWavUrl,
  isSilentUnlockWavSrc,
} from '../../resources/js/scripts/audio/silentUnlockWav.js'

const url = getSilentUnlockWavUrl()
assert.ok(url)
assert.ok(isSilentUnlockWavSrc(url))
assert.equal(isSilentUnlockWavSrc('https://example.com/a.wav'), false)

console.log('silent-unlock-wav.test.mjs: ok')
