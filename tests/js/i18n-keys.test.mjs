import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

/**
 * Guard: t() returns the key itself when a translation is missing, so a missing
 * key leaks a raw path like "memorisation.postSession.ayahSingular" into the UI.
 * Every literal key used in code must exist in en.json (the fallback locale).
 */

const root = process.cwd()
const en = JSON.parse(fs.readFileSync(path.join(root, 'resources/js/locales/en.json'), 'utf8'))

function hasKey(key) {
  return key
    .split('.')
    .reduce((node, part) => (node && typeof node === 'object' ? node[part] : undefined), en) !== undefined
}

const files = []
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      if (entry.name !== 'locales') walk(full)
    } else if (/\.(js|vue|mjs)$/.test(entry.name)) {
      files.push(full)
    }
  }
}
walk(path.join(root, 'resources/js'))

const KEY_PATTERN = /\bt\(\s*['"`]([a-zA-Z0-9_.]+)['"`]/g
const missing = new Map()

for (const file of files) {
  const source = fs.readFileSync(file, 'utf8')
  let match
  while ((match = KEY_PATTERN.exec(source))) {
    const key = match[1]
    // Dotless arguments are not translation paths (e.g. t(variable) helpers).
    if (!key.includes('.') || hasKey(key)) continue
    const line = source.slice(0, match.index).split('\n').length
    if (!missing.has(key)) missing.set(key, [])
    missing.get(key).push(`${path.relative(root, file)}:${line}`)
  }
}

assert.equal(
  missing.size,
  0,
  `translation keys missing from en.json (these render as raw text):\n${
    [...missing.entries()].map(([key, locs]) => `  ${key} — ${locs.join(', ')}`).join('\n')
  }`,
)

// The reported regression: single-ayah post-session ranges printed the raw key.
assert.ok(hasKey('memorisation.postSession.ayahSingular'))
assert.match(en.memorisation.postSession.ayahSingular, /\{ayah\}/)

// Wrong-path regression: the action label pointed at memorisation.guided.*
// while the copy lived under memorisation.plannerUi.*.
const js = fs.readFileSync(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
assert.doesNotMatch(js, /memorisation\.guided\.reciteFromMemory/)
for (const key of ['chooseRangeToBegin', 'startToBuildQueue', 'listenCalmly', 'pressPlayThenRecite']) {
  assert.ok(hasKey(`memorisation.plannerUi.${key}`), `plannerUi.${key} present`)
}

console.log('i18n-keys.test.mjs: ok')
