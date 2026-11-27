import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  PREVIEW_TEACHER_SHOT_BASENAMES,
  previewTeacherAssetUrl,
} from '../../resources/js/config/previewTeacherShots.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const php = readFileSync(join(root, 'app/Support/LandingPreviewAssets.php'), 'utf8')

PREVIEW_TEACHER_SHOT_BASENAMES.forEach((basename) => {
  assert.match(php, new RegExp(`'${basename}'`), `LandingPreviewAssets missing ${basename}`)
  assert.equal(previewTeacherAssetUrl(basename), `/preview/assets/${basename}.png`)
})

const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
assert.match(homepage, /previewTeacherShots/)
assert.match(homepage, /autoplay-ms/)

console.log('preview-teacher-shots.test.mjs: ok')