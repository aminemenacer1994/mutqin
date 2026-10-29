import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const feedback = readFileSync(join(root, 'resources/js/components/FeedbackModal.vue'), 'utf8')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const memorisationVue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')
const privacy = readFileSync(join(root, 'resources/js/views/PrivacyPolicy.vue'), 'utf8')
const en = readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8')

const headerBlock = feedback.slice(
  feedback.indexOf('<header class="feedback-modal__header">'),
  feedback.indexOf('</header>'),
)
assert.doesNotMatch(headerBlock, /feedback-modal__lead/, 'lead text must not sit in the modal header')
assert.match(feedback, /feedback-modal__body">[\s\S]*?feedback-modal__lead/)

assert.match(homepage, /\/memorisation\?journey=ten_minute/)

assert.match(memorisationJs, /buildTenMinuteHeroSessionConfig/)
assert.match(memorisationJs, /journey === 'ten_minute'/)
assert.match(memorisationJs, /applyTenMinuteHeroSessionPreset/)

assert.match(memorisationVue, /session-range-preset/)
assert.match(memorisationVue, /session-range-preset__option/)
assert.match(memorisationVue, /sessionSetup\.playModeAuto/)
assert.match(memorisationVue, /sessionSetup\.playModeAdvanced/)

assert.match(privacy, /privacy-document/)
assert.doesNotMatch(privacy, /info-section-head/)

assert.match(en, /"rangePresetFullSurah": "Full surah"/)
assert.match(en, /3 saved sessions, and basic insights/)

console.log('p2-combined-fixes.test.mjs: ok')
