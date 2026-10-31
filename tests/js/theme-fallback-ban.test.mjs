import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const jsRoot = join(root, 'resources/js')

/** @param {string} dir @returns {string[]} */
function walk(dir) {
  const out = []
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    if (statSync(abs).isDirectory()) walk(abs).forEach((f) => out.push(f))
    else if (/\.(css|vue)$/.test(name)) out.push(abs)
  }
  return out
}

const banned = [
  /--teacher-accent:\s*#725233/,
  /--teacher-bg:\s*#f4f5f3/,
  /var\(--accent,\s*#a0784c\)/,
  /var\(--accent,\s*#9a6738\)/,
  /var\(--text,\s*#1a2e24\)/,
  /var\(--accent-strong,\s*#8b653b\)/,
  /var\(--accent,\s*#8d6a35\)/,
  /sessions:\s*'#a0784c'/,
  /ink:\s*'#1a2e24'/,
]

for (const file of walk(jsRoot)) {
  const rel = file.slice(root.length + 1)
  const text = readFileSync(file, 'utf8')
  for (const pattern of banned) {
    assert.doesNotMatch(text, pattern, `${rel} must not use legacy accent/chart fork ${pattern}`)
  }
}
