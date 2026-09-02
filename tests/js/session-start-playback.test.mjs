/**
 * Start/resume must always run countdown then a single playback finalize path.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const source = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(source, /countdownGeneration:\s*0/)
assert.match(source, /countdownGeneration = \(Number\(this\.countdownGeneration\) \|\| 0\) \+ 1/)
assert.match(source, /async finalizeCountdownPlayback\(options = \{\}\)/)
assert.match(source, /async startSession\(options = \{\}\)/)
assert.match(source, /deferPlayback/)
assert.match(source, /await this\.startSession\(\{ deferPlayback: true \}\)/)
assert.match(source, /await this\.finalizeCountdownPlayback\(\)/)
assert.doesNotMatch(source, /skipImmediatePlay:\s*true/)
assert.match(source, /async attemptMutedAutoplayRecovery\(\)/)
assert.match(
  source,
  /continueLastSession\(\{ prepareOnly \}\)/,
)
assert.doesNotMatch(
  source,
  /continueLastSession\(\{ skipCountdown: true/,
)
assert.match(
  source,
  /playerBarVisible\(\) \{[\s\S]*isSessionLive && this\.playbackAwaitingGesture/,
)

console.log('session-start-playback.test.mjs: ok')
