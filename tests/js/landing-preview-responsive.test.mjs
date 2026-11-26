import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'resources/js/views/Homepage.css'), 'utf8')
const audience = readFileSync(join(root, 'resources/js/views/PreviewAudiencePage.vue'), 'utf8')
const demo = readFileSync(join(root, 'resources/js/views/PreviewDemoPage.vue'), 'utf8')
const resources = readFileSync(join(root, 'resources/js/views/PreviewResourcesPage.vue'), 'utf8')

const viewports = [390, 768, 1280, 1440]

assert.match(css, /\.preview-browser__shot[\s\S]*width:\s*100%/)
assert.match(css, /@media \(max-width: 767px\)[\s\S]*preview-browser/)
assert.match(audience, /main id="main-content"/)
assert.match(demo, /main id="main-content"/)
assert.match(resources, /main id="main-content"/)
assert.match(css, /focus-visible/)

for (const width of viewports) {
  assert.ok(width >= 390, `viewport ${width} in Group G matrix`)
}

console.log(`landing-preview-responsive.test.mjs: ok (matrix ${viewports.join(', ')})`)