import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const routes = readFileSync(join(root, 'routes/web/app.php'), 'utf8')
const demoPage = readFileSync(join(root, 'resources/js/views/PreviewDemoPage.vue'), 'utf8')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const catalog = readFileSync(join(root, 'app/Support/LandingPreviewDemo.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(routes, /preview\.demo/)
assert.match(routes, /LandingPreviewDemoController/)
assert.match(routes, /demo\.memorisation/)
assert.match(routes, /demo\.capabilities/)
assert.match(routes, /demo\.entitlement/)
assert.ok(readFileSync(join(root, 'app/Support/PreviewSandboxCapabilities.php'), 'utf8').includes('PreviewSandboxCapabilities'))
assert.ok(readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxWalkthrough.vue'), 'utf8').includes('useSandboxWalkthrough'))
assert.match(demoPage, /PreviewDemoPage/)
assert.match(demoPage, /preview-demo-entry/)
assert.match(demoPage, /preview-demo-entry__launch/)
assert.ok(readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxToolbar.vue'), 'utf8').includes('mutqin-preview-toolbar'))
assert.ok(readFileSync(join(root, 'resources/views/preview/demo.blade.php'), 'utf8').includes('preview-demo-page'))
assert.match(homepage, /\/preview\/demo/)
assert.match(catalog, /OrganisationNetworkCatalog/)
assert.match(catalog, /memorisation_guest/)
assert.match(catalog, /platform_classroom_parent/)
assert.match(readFileSync(join(root, 'app/Support/PreviewSandbox.php'), 'utf8'), /class PreviewSandbox/)
assert.doesNotMatch(catalog, /menacer72/)

assert.equal(en.previewDemo?.hero?.title, 'Try Mutqin for yourself')
assert.ok(en.previewDemo?.experiences?.teacher?.previewAsset)
assert.ok(en.previewDemo?.toolbar?.exit)
assert.ok(en.homepage?.preview?.demo?.cta)
assert.ok(en.previewDemo?.personas?.items?.org_halaqa_teacher?.email)

console.log('landing-preview-demo.test.mjs: ok')