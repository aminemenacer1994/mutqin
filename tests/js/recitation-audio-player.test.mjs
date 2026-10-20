import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const component = readFileSync(join(root, 'resources/js/components/RecitationAudioPlayer.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/components/SessionAnalysisOverview.css'), 'utf8')

assert.match(component, /:style="seekStyle"/)
assert.match(component, /@input="previewSeek"/)
assert.match(component, /@change="commitSeek"/)
assert.match(component, /@durationchange="syncClock"/)
assert.match(component, /@seeked="syncClock"/)
assert.match(component, /:disabled="!seekReady"/)
assert.match(component, /bindAudioSource/)
assert.match(component, /probeIndeterminateMediaDuration/)
assert.match(component, /attachSource\(next\)/)
assert.match(component, /setCurrentTime\(nextTime\)/)
assert.match(component, /readMediaDuration/)
assert.match(component, /timelineDuration/)
assert.match(component, /'is-loading': loading/)
assert.match(css, /--player-seek-progress/)
assert.match(css, /::-webkit-slider-runnable-track/)
assert.match(css, /html\[data-theme="light"\][\s\S]*--player-seek-fill/)
assert.match(css, /html\[data-theme="sepia"\][\s\S]*--player-seek-fill/)
assert.match(css, /html\[data-theme="dark"\][\s\S]*--player-seek-fill/)

console.log('recitation-audio-player.test.mjs: ok')
