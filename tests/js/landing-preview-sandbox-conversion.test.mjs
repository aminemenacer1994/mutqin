import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const toolbar = readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxToolbar.vue'), 'utf8')
const conversion = readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxConversionSheet.vue'), 'utf8')
const exitMenu = readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxExitMenu.vue'), 'utf8')
const walkthrough = readFileSync(join(root, 'resources/js/composables/useSandboxWalkthrough.js'), 'utf8')
const steps = readFileSync(join(root, 'resources/js/composables/sandboxWalkthroughSteps.js'), 'utf8')
const banner = readFileSync(join(root, 'resources/views/partials/preview-demo-banner.blade.php'), 'utf8')
const controller = readFileSync(join(root, 'app/Http/Controllers/LandingPreviewDemoController.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(toolbar, /PreviewSandboxConversionSheet/)
assert.match(toolbar, /PreviewSandboxExitMenu/)
assert.match(toolbar, /openExitMenu/)
assert.match(toolbar, /getStartedLabel/)
assert.match(toolbar, /useSandboxMediaPause/)
assert.match(conversion, /mutqin-sandbox-tour-complete/)
assert.match(exitMenu, /destination" value="landing"/)
assert.match(exitMenu, /sandbox-exit/)
assert.match(walkthrough, /mutqin-sandbox-tour-complete/)
assert.match(steps, /complete: true/)
assert.match(banner, /conversionExperience/)
assert.match(banner, /pricingUrl/)
assert.match(controller, /in:hub,landing,pricing/)
assert.ok(en.previewDemo?.conversion?.cta?.teacher)
assert.ok(en.previewDemo?.exit?.returnLanding)

console.log('landing-preview-sandbox-conversion.test.mjs: ok')