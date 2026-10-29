import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const track = readFileSync(
  join(root, 'resources/js/components/shared/LearnerAttemptPlaybackTrack.vue'),
  'utf8',
)
assert.match(track, /@\/scripts\/audio\/recordingPlayback\.js/, 'track must use @ alias for recordingPlayback')

const section = readFileSync(
  join(root, 'resources/js/components/teacher/LearnerTeacherSection.vue'),
  'utf8',
)
assert.doesNotMatch(section, /components\/teacher\/LearnerAttemptPlayback/, 'section must not import playback from teacher/')
assert.match(section, /@\/components\/shared\/LearnerAttemptPlaybackModal/, 'section imports shared modal')

const pageError = readFileSync(join(root, 'resources/js/components/PageLoadError.js'), 'utf8')
assert.match(pageError, /bootErrorTitle/, 'generic load errors use bootErrorTitle')

console.log('learner-dashboard-playback-smoke.test.mjs: ok')
