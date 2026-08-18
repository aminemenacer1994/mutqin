import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const mobileCss = readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

function extractBlock(source, selector) {
  const start = source.indexOf(selector)
  if (start < 0) return ''
  const brace = source.indexOf('{', start)
  if (brace < 0) return ''
  let depth = 0
  for (let i = brace; i < source.length; i += 1) {
    if (source[i] === '{') depth += 1
    if (source[i] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(start, i + 1)
    }
  }
  return ''
}

const idleCss = [
  extractBlock(css, '.workspace-shell-idle-inner'),
  extractBlock(css, '.workspace-shell-copy'),
  extractBlock(css, '.workspace-shell-lead'),
  extractBlock(css, '.workspace-shell-idle-actions'),
  extractBlock(css, '.workspace-shell-idle-actions__start'),
  extractBlock(css, '.workspace-shell-idle-links'),
  extractBlock(css, '.workspace-shell-text-link'),
  extractBlock(css, '.workspace-shell-kicker'),
  extractBlock(css, '.workspace-shell-main-title'),
].join('\n')

const forbiddenIdleColours = /\b(blue|purple|violet|indigo|cyan|magenta|neon|#00f|#0ff|#f0f)\b/i

// Current idle card structure.
assert.match(vue, /workspace-shell-idle-inner/)
assert.match(vue, /workspace-shell-lead/)
assert.match(vue, /workspace-shell-idle-actions__start/)
assert.match(vue, /workspace-shell-text-link/)

// Card shell: no drop shadow, bounded width, existing Mutqin surface.
assert.match(css, /\.workspace-shell\s*\{[\s\S]*?box-shadow:\s*none/)
assert.match(css, /\.workspace-shell\s*\{[\s\S]*?overflow:\s*hidden/)
assert.match(css, /\.workspace-shell\s*\{[\s\S]*?background:\s*var\(--workspace-card-surface\)/)

// Responsive breakpoints.
assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?\.workspace-shell-idle-actions/)
assert.match(css, /@media \(max-width:\s*374px\)[\s\S]*?\.workspace-shell-idle-inner/)

// Text wraps on long surah names.
assert.match(css, /\.workspace-shell-main-title[\s\S]*?overflow-wrap:\s*anywhere/)
assert.match(css, /\.workspace-shell-lead[\s\S]*?overflow-wrap:\s*anywhere/)

// Mobile grid owns sub-768 idle layout.
assert.match(mobileCss, /\.workspace-shell-idle-actions[\s\S]*?flex-direction:\s*column/)
assert.match(mobileCss, /\.workspace-shell-idle \.workspace-shell-main-title[\s\S]*?white-space:\s*normal/)

// Mutqin design language — beige/brown light, gold accents dark; no off-brand colours.
assert.doesNotMatch(idleCss, forbiddenIdleColours)
assert.match(idleCss, /var\(--accent/)
assert.match(idleCss, /var\(--text-muted\)/)
assert.match(css, /\[data-theme="dark"\] \.workspace-shell-kicker[\s\S]*?var\(--accent-light\)/)
assert.match(css, /\[data-theme="dark"\] \.workspace-shell-text-link[\s\S]*?var\(--accent-strong\)/)
assert.doesNotMatch(
  extractBlock(css, '.workspace-shell-mini-link:hover'),
  /box-shadow:/,
  'mini-link hover stays flat',
)
assert.doesNotMatch(
  extractBlock(css, '.workspace-shell-mini-link__icon--sepia'),
  /linear-gradient/,
  'mini-link icons avoid heavy gradients',
)

console.log('workspace-shell-responsive.test.mjs: ok')
