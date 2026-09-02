import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const mixSource = readFileSync(join(root, 'webpack.mix.cjs'), 'utf8')
const appJs = readFileSync(join(root, 'public/js/app.js'), 'utf8')

assert.match(
  mixSource,
  /Watch\/dev runtime: __webpack_require__\.e/,
  'mix prune must collect watch-mode stable chunk names',
)
assert.match(mixSource, /keep\.add\(`\$\{match\[1\]\}\.js`\)/)

// Mirror the Mix helper: stable + hashed references must both be collected.
function collectReferencedChunkFiles(source) {
  const keep = new Set()
  for (const match of source.matchAll(/([a-z][a-z0-9_-]*)\.([a-f0-9]{8})\.js/gi)) {
    keep.add(`${match[1]}.${match[2]}.js`)
  }
  for (const match of source.matchAll(
    /__webpack_require__\.e\(\s*(?:\/\*[\s\S]*?\*\/\s*)?["']([a-z][a-z0-9_-]*)["']/gi,
  )) {
    keep.add(`${match[1]}.js`)
  }
  return keep
}

const keep = collectReferencedChunkFiles(appJs)
assert.ok(keep.has('dashboard.js'), 'app.js must keep dashboard.js in watch/dev')
assert.ok(keep.has('admin-dashboard.js'), 'app.js must keep admin-dashboard.js in watch/dev')
assert.ok(keep.has('admin-feedback.js'), 'app.js must keep admin-feedback.js in watch/dev')

for (const name of ['dashboard.js', 'admin-dashboard.js', 'admin-feedback.js']) {
  assert.ok(
    readFileSync(join(root, 'public/js', name)).length > 1000,
    `${name} must exist on disk after Mix emit`,
  )
}

console.log('mix-chunk-prune-guard: ok')
