import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(js, /lockMutashabihatCompareReciter\(\)/)
assert.match(js, /ensureMutashabihatComparePlayer\(\)/)
assert.match(js, /mutashabihatCompareAudioUrls\(verseKey\)/)
assert.match(js, /mutashabihatCompareReciterId/)
assert.match(js, /orderAyahAudioCandidateUrls\(\{/)
assert.match(js, /delete clean\.globalNumber/)
assert.doesNotMatch(js, /sessionReciterOnly: true/)

console.log('mutashabihat-compare-audio.test.mjs passed')
