/**
 * Word-audio highlighting must stay clearly visible when tajweed is on.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const js = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

assert.match(
  css,
  /\.verse-arabic\.tajweed-enabled\.word-highlight-enabled \.wbw-word\.highlighted[\s\S]*?background:\s*color-mix\(in srgb, var\(--accent\) 32%/,
  'tajweed stacked words need a clear accent plate while highlighted',
)

assert.match(
  css,
  /html body \.verse-arabic\.tajweed-enabled\.word-highlight-enabled \.wbw-word\.highlighted[\s\S]*?background:\s*color-mix\(in srgb, var\(--accent\) 32%/,
  'high-specificity override must keep the tajweed audio plate',
)

assert.doesNotMatch(
  css,
  /html body \.verse-arabic\.tajweed-enabled[^{]*\.wbw-word\.highlighted [^{]*\{[^}]*\bcolor:\s*#b45309/,
  'highlighted tajweed letters must not be flattened to amber ink',
)

assert.match(
  css,
  /\.madani-page-sheet--tajweed \.madani-word\.highlighted\.madani-word--glyph[\s\S]*?outline:\s*2px solid/,
  'tajweed mushaf glyphs need a clear outline plate for the audio cursor',
)

assert.doesNotMatch(
  css,
  /html body \.main\.mushaf-mode-active \.madani-page-sheet--tajweed \.madani-word\.highlighted\.madani-word--glyph[\s\S]{0,280}?filter:\s*sepia/,
  'tajweed mushaf audio cursor must not use the weak sepia filter',
)

assert.match(
  js,
  /\$watch\('tajweedEnabled'[\s\S]*?ensureWordHighlightTrack\(verse,\s*\{\s*force:\s*true\s*\}\)/,
  'toggling tajweed must re-arm word-audio highlighting',
)

console.log('tajweed-word-highlight.test.mjs: ok')
