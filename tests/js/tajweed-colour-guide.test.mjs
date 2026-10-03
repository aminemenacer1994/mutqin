import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { TAJWEED_CLASS_TO_RULE, TAJWEED_COLOUR_HEX } from '../../resources/js/scripts/tajweedPracticeCheck/catalog.js'
import {
  examplePlainText,
  localizeTajweedColourGuideRules,
  TAJWEED_COLOUR_GUIDE_RULES,
} from '../../resources/js/scripts/tajweed/colourGuide.js'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')
const vue = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const modal = fs.readFileSync(path.join(root, 'resources/js/components/TajweedColourGuideModal.vue'), 'utf8')
const modalCss = fs.readFileSync(path.join(root, 'resources/js/components/TajweedColourGuideModal.css'), 'utf8')
const en = JSON.parse(fs.readFileSync(path.join(root, 'resources/js/locales/en.json'), 'utf8'))

assert.ok(TAJWEED_COLOUR_GUIDE_RULES.length >= 6, 'guide must list the supported tajweed colours/rules')

const usedHex = new Set()
for (const rule of TAJWEED_COLOUR_GUIDE_RULES) {
  assert.equal(rule.colourHex, TAJWEED_COLOUR_HEX[rule.colourId], `${rule.id} must reuse TAJWEED_COLOUR_HEX`)
  usedHex.add(rule.colourHex)
  const suffix = String(rule.className).replace(/^tajweed-/, '')
  assert.ok(TAJWEED_CLASS_TO_RULE[suffix], `${rule.id} class ${rule.className} must exist in Mutqin tajweed mapping`)
  assert.ok(rule.example.some((part) => part.className === rule.className), `${rule.id} example must colour the relevant letters`)
  assert.match(examplePlainText(rule), /\S/, `${rule.id} needs a Qur'anic example`)
  assert.ok(en.memorisation.tajweedColourGuide.rules[rule.id]?.name, `missing en name for ${rule.id}`)
  assert.ok(en.memorisation.tajweedColourGuide.rules[rule.id]?.description, `missing en description for ${rule.id}`)
}

assert.deepEqual(
  [...usedHex].sort(),
  Object.values(TAJWEED_COLOUR_HEX).sort(),
  'guide must cover every Mutqin tajweed colour',
)

const localized = localizeTajweedColourGuideRules((key) => key.split('.').pop())
assert.equal(localized[0].name, 'name')
assert.equal(localized[0].colourHex, TAJWEED_COLOUR_HEX.green)

assert.match(vue, /data-testid="tajweed-colour-guide-menu"/)
assert.match(vue, /openTajweedColourGuide/)
assert.match(vue, /TajweedColourGuideModal/)
assert.match(vue, /toggleTajweed/)
assert.match(modal, /role="dialog"/)
assert.match(modal, /aria-modal="true"/)
assert.match(modal, /handleModalKeydown/)
assert.match(modal, /tajweed-enabled/)
assert.match(modalCss, /--tajweed-guide-display/)
assert.match(modalCss, /--tajweed-guide-body/)
assert.match(modalCss, /--tajweed-guide-arabic/)
assert.match(modalCss, /tajweed-guide-rise/)
assert.match(modalCss, /prefers-reduced-motion/)
assert.match(modalCss, /grid-template-columns:\s*repeat\(2/)
assert.match(modalCss, /@media \(max-width: 720px\)/)
assert.match(modalCss, /\[data-theme="sepia"\]/)
assert.match(modalCss, /post-session-simple--calm-v2\[data-theme="dark"\][\s\S]*post-session-simple__dialog/)
assert.match(modalCss, /#2a2420 0%, #1f1a17/)
assert.doesNotMatch(modalCss, /#2e9d62|#9b59b6|#d98824|#d55245|#2b7bbb|#7e8a97/)

console.log('tajweed-colour-guide.test.mjs passed')
