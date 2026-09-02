/**
 * Delete-session confirm copy stays readable: structured label, no jargon,
 * and the context kicker uses the shared middle-dot format.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const en = JSON.parse(readFileSync(join(root, 'resources/js/locales/en.json'), 'utf8'))
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

const copy = en.memorisation.confirmModals

assert.equal(copy.deleteSession.title, 'Delete this session?')
assert.match(copy.deleteSession.message, /permanently remove this session from this device/)
assert.match(copy.deleteSession.message, /cannot be undone/)
assert.doesNotMatch(copy.deleteSession.message, /saved export|\{label\}/)
assert.equal(copy.deleteSession.progress, 'Ayah {ayah} of {total}')
assert.equal(copy.contextBadge, 'Memorising · {surah} · Ayah {ayah} of {total}')
assert.doesNotMatch(copy.contextBadge, / - /)

assert.match(js, /sessionContextBadge\(\) \{[\s\S]*memorisation\.confirmModals\.contextBadge/)
assert.doesNotMatch(js, /Memorising - \$\{chapterName\}/)
assert.match(js, /getSavedSessionConfirmSubject\s*\(/)
assert.match(js, /getSavedSessionConfirmDetail\s*\(/)
assert.match(js, /subject:\s*session \? this\.getSavedSessionConfirmSubject\(session\)/)
assert.match(js, /detail:\s*session \? this\.getSavedSessionConfirmDetail\(session\)/)

assert.match(vue, /confirm-subject-title/)
assert.match(vue, /confirmModal\.subject/)
assert.match(vue, /id="confirmModalMessage"/)

for (const locale of ['ar', 'es', 'fr', 'id', 'tr', 'ur']) {
  const data = JSON.parse(readFileSync(join(root, `resources/js/locales/${locale}.json`), 'utf8'))
  const modal = data.memorisation.confirmModals
  assert.ok(modal.contextBadge.includes('{surah}'), `${locale} context badge interpolates surah`)
  assert.ok(modal.deleteSession.progress.includes('{ayah}'), `${locale} progress interpolates ayah`)
  assert.doesNotMatch(modal.deleteSession.message, /saved export|\{label\}/)
}

console.log('delete-session-confirm.test.mjs: ok')
