import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const motionCss = readFileSync(join(root, 'resources/js/styles/preview-motion.css'), 'utf8')
const composable = readFileSync(join(root, 'resources/js/composables/usePreviewMotion.js'), 'utf8')
const hero = readFileSync(join(root, 'resources/js/components/preview/PreviewHeroShowcase.vue'), 'utf8')
const workflow = readFileSync(join(root, 'resources/js/components/preview/PreviewWorkflowDemo.vue'), 'utf8')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.match(homepage, /preview-hero-showcase/)
assert.match(homepage, /preview-workflow-demo/)
assert.match(homepage, /usePreviewMotion/)
assert.match(homepage, /data-hero-enter/)
assert.match(homepage, /heroShowcaseRoles/)
assert.match(homepage, /workflowSteps/)

assert.match(motionCss, /--motion-hero/)
assert.match(motionCss, /--motion-product/)
assert.match(motionCss, /prefers-reduced-motion/)
assert.match(motionCss, /\.homepage--preview \.hero__glow/)

assert.match(composable, /bindRevealObserver/)
assert.match(composable, /mountHeroEntrance/)
assert.match(composable, /mountPreviewPageEnter/)

assert.match(hero, /role="tablist"/)
assert.match(hero, /preview-shot/)
assert.match(workflow, /preview-workflow__step/)
assert.match(workflow, /togglePlayback/)

assert.ok(en.homepage?.preview?.heroShowcase?.roles?.teacher?.label)
assert.ok(en.homepage?.preview?.workflow?.steps?.assign?.title)

console.log('landing-preview-motion.test.mjs: ok')