#!/usr/bin/env node
/**
 * Verifies built CSS does not ship forked legacy palettes (runtime deploy gate).
 */
import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = [
  'public/css/app.css',
  'public/css/vue-styles.css',
  'public/css/teacher-dashboard.css',
]

const banned = [
  /--accent:\s*#a0784c/,
  /var\(--accent,\s*#a0784c\)/,
  /var\(--accent,\s*#9a6738\)/,
  /--teacher-accent:#725233/,
  /--teacher-bg:#f4f5f3/,
  /Theme Variables - NO SHADOWS/,
  /#8d6a35/,
]

const required = [
  {
    file: 'public/css/vue-styles.css',
    pattern: /html\[data-theme=light\] body\.memorisation-page\{[^}]*--zone-chrome-cream:var\(--bg\)/,
    label: 'light memorisation zone-chrome-cream aliases --bg',
  },
]

for (const rel of files) {
  const abs = join(root, rel)
  assert.ok(existsSync(abs), `missing built asset: ${rel}`)
  const css = readFileSync(abs, 'utf8')
  for (const pattern of banned) {
    assert.doesNotMatch(css, pattern, `${rel} contains legacy palette fork ${pattern}`)
  }
}

for (const { file, pattern, label } of required) {
  const abs = join(root, file)
  assert.ok(existsSync(abs), `missing built asset: ${file}`)
  const css = readFileSync(abs, 'utf8')
  assert.match(css, pattern, `${file} missing ${label}`)
}

console.log('theme-built-css-gate: ok')
