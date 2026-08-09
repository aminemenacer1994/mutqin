import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import test from 'node:test'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

function read(rel) {
  return readFileSync(join(root, rel), 'utf8')
}

test('shared AppStatus component exists with required variants', () => {
  const vue = read('resources/js/components/AppStatus.vue')
  const css = read('resources/js/styles/app-status.css')
  assert.match(vue, /name:\s*'AppStatus'/)
  assert.match(vue, /loading/)
  assert.match(vue, /no-results/)
  assert.match(vue, /auth/)
  assert.match(vue, /unavailable/)
  assert.match(vue, /offline/)
  assert.match(css, /\.app-status--error/)
  assert.match(css, /\.app-status--offline/)
  assert.match(css, /\[data-theme="dark"\] \.app-status/)
})

test('memorisation wires intentional empty and error states', () => {
  const js = read('resources/js/views/Memorisation.js')
  const vue = read('resources/js/views/Memorisation.vue')
  assert.match(js, /shouldShowWorkspaceEmptyState\(\)\s*\{[\s\S]*!this\.hasVerses/)
  assert.match(js, /madaniPagesError/)
  assert.match(js, /userFacingErrorText/)
  assert.match(js, /analyticsModalError/)
  assert.match(vue, /madaniPagesError/)
  assert.match(vue, /memorisation\.mushafLoad\.errorTitle/)
  assert.match(vue, /common\.status\.authTitle/)
  assert.match(vue, /verse-arabic-missing/)
  assert.match(vue, /analyticsModalError/)
})

test('ayah notes modal shows loading error and empty outside notes.length', () => {
  const vue = read('resources/js/components/AyahNotesModal.vue')
  assert.match(vue, /AppStatus/)
  assert.match(vue, /loadError/)
  assert.match(vue, /memorisation\.ayahNotes\.emptyTitle/)
  assert.doesNotMatch(
    vue,
    /v-if="notes\.length"[\s\S]*ayah-notes-empty--loading/
  )
})
