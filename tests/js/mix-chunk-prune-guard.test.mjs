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
assert.match(
  mixSource,
  /Compatibility for tabs still running a dev\/watch runtime/,
  'production builds must create stable aliases for stale dev runtimes',
)
assert.match(
  mixSource,
  /fs\.copyFileSync\(path\.join\(jsDir,\s*newest\),\s*path\.join\(jsDir,\s*alias\)\)/,
  'named hashed chunks are copied to stable aliases like homepage.js',
)

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

  for (const anchor of ['js/"+({', 'js/"+{']) {
    const start = source.indexOf(anchor)
    if (start === -1) continue
    const namesOpen = source.indexOf('{', start)
    const namesClose = source.indexOf('}[e]', namesOpen)
    const hashesOpenMarker = source.indexOf('+{', namesClose)
    const hashesOpen = source.indexOf('{', hashesOpenMarker)
    const hashesClose = source.indexOf('}[e]+".js"', hashesOpen)
    if (namesOpen === -1 || namesClose === -1 || hashesOpen === -1 || hashesClose === -1) continue

    const parseMap = (body) => {
      const map = {}
      for (const part of body.split(',')) {
        const entry = part.match(/(\d+):"([^"]+)"/)
        if (entry) map[entry[1]] = entry[2]
      }
      return map
    }
    const names = parseMap(source.slice(namesOpen + 1, namesClose))
    const hashes = parseMap(source.slice(hashesOpen + 1, hashesClose))
    for (const [id, hash] of Object.entries(hashes)) {
      keep.add(`${names[id] || id}.${hash}.js`)
    }
  }
  return keep
}

const keep = collectReferencedChunkFiles(appJs)
assert.ok(
  [...keep].some((name) => /^homepage\.[a-f0-9]{8}\.js$/i.test(name)),
  'app.js must keep the current hashed homepage chunk',
)
for (const name of ['homepage.js', 'dashboard.js', 'admin-dashboard.js', 'admin-feedback.js']) {
  assert.ok(
    readFileSync(join(root, 'public/js', name)).length > 1000,
    `${name} must exist on disk after Mix emit`,
  )
}

console.log('mix-chunk-prune-guard: ok')
