import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const root = process.cwd()
const css = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const mobileCss = readFileSync(join(root, 'resources/js/views/Memorisation.mobile-grid.css'), 'utf8')
const vue = readFileSync(join(root, 'resources/js/views/Memorisation.vue'), 'utf8')

// Premium idle card structure — copy, stats, CTA, secondary links.
assert.match(vue, /workspace-shell-idle-main/)
assert.match(vue, /workspace-shell-lead/)
assert.match(vue, /workspace-shell-stats/)
assert.match(vue, /workspace-shell-idle-cta/)
assert.match(vue, /workspace-shell-idle-secondary/)

// No horizontal overflow from fixed widths on the card shell.
assert.match(css, /\.workspace-shell\s*\{[\s\S]*?overflow:\s*hidden/)
assert.match(css, /\.workspace-shell\s*\{[\s\S]*?min-width:\s*0/)
assert.match(css, /\.workspace-shell-idle-main[\s\S]*?min-width:\s*0/)

// Breakpoints: tablet / mobile / small mobile.
assert.match(css, /@media \(max-width:\s*1024px\)[\s\S]*?\.workspace-shell-idle-main/)
assert.match(css, /@media \(max-width:\s*640px\)[\s\S]*?\.workspace-shell-idle-main/)
assert.match(css, /@media \(max-width:\s*374px\)[\s\S]*?\.workspace-shell-idle-inner/)

// Touch-friendly controls (>= 44px) on primary actions.
assert.match(css, /\.workspace-shell-idle-cta \.session-idle-action[\s\S]*?min-height:\s*2\.75rem/)
assert.match(css, /\.workspace-shell-mini-link[\s\S]*?min-height:\s*2\.75rem/)

// Text must wrap — never clip long surah names on idle card.
assert.match(css, /\.workspace-shell-main-title[\s\S]*?overflow-wrap:\s*anywhere/)
assert.match(css, /\.workspace-shell-lead[\s\S]*?overflow-wrap:\s*anywhere/)
assert.match(css, /\.workspace-shell-guidance[\s\S]*?overflow-wrap:\s*anywhere/)

// Mobile grid owns sub-768 layouts for idle card.
assert.match(mobileCss, /\.workspace-shell-idle-main[\s\S]*?grid-template-columns:\s*minmax\(0,\s*1fr\)/)
assert.match(mobileCss, /\.workspace-shell-idle-cta \.session-idle-action[\s\S]*?min-block-size:\s*var\(--mq-control-size\)/)
assert.match(mobileCss, /\.workspace-shell-idle \.workspace-shell-main-title[\s\S]*?white-space:\s*normal/)
assert.match(mobileCss, /@media \(max-width:\s*349\.98px\)[\s\S]*?\.workspace-shell-idle-inner/)

console.log('workspace-shell-responsive.test.mjs: ok')
