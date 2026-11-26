import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const appJs = readFileSync(join(root, 'resources/js/app.js'), 'utf8')
const walkthrough = readFileSync(join(root, 'resources/js/components/preview/PreviewSandboxWalkthrough.vue'), 'utf8')
const steps = readFileSync(join(root, 'resources/js/composables/sandboxWalkthroughSteps.js'), 'utf8')
const motion = readFileSync(join(root, 'resources/js/styles/sandbox-motion.css'), 'utf8')
const tourCss = readFileSync(join(root, 'resources/js/styles/sandbox-walkthrough.css'), 'utf8')
const catalog = readFileSync(join(root, 'app/Support/LandingPreviewDemo.php'), 'utf8')
const controller = readFileSync(join(root, 'app/Http/Controllers/LandingPreviewDemoController.php'), 'utf8')
const banner = readFileSync(join(root, 'resources/views/partials/preview-demo-banner.blade.php'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.doesNotMatch(appJs, /PreviewSandboxWalkthroughCoach/)
assert.match(appJs, /PreviewSandboxWalkthrough\.vue/)
assert.match(walkthrough, /useSandboxWalkthrough/)
assert.match(steps, /connectedSteps/)
assert.match(steps, /advance: 'click'/)
assert.match(steps, /advance: 'select'/)
assert.match(motion, /prefers-reduced-motion/)
assert.match(tourCss, /sandbox-walkthrough__spotlight/)
assert.match(catalog, /resolveWalkthroughId/)
assert.match(catalog, /'experience' => 'connected'/)
assert.match(controller, /WALKTHROUGH_ID_SESSION_KEY/)
assert.match(banner, /walkthroughId/)
assert.match(banner, /preview-sandbox-walkthrough/)
assert.ok(en.previewDemo?.walkthrough?.connected?.teacherIntro?.title)
assert.ok(en.previewDemo?.experiences?.connected?.label)

console.log('landing-preview-sandbox-walkthrough.test.mjs: ok')