import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const routes = readFileSync(join(root, 'routes/web/app.php'), 'utf8')
const page = readFileSync(join(root, 'resources/js/views/PreviewResourcesPage.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Homepage.css'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(routes, /preview\.resources/)
assert.match(routes, /LandingPreviewReferenceController/)
assert.match(page, /PreviewResourcesPage/)
assert.match(page, /main id="main-content"/)
assert.match(css, /homepage--preview/)
assert.match(css, /overflow-x:\s*clip/)
assert.ok(en.previewResources?.hero?.title)
assert.ok(en.homepage?.preview?.resources?.cta)

console.log('landing-preview-resources.test.mjs: ok')