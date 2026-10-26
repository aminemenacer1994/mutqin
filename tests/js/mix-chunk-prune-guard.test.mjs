import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
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
  /Never preserve watch-mode aliases in a production build/,
  'production builds must make stale watch runtimes fail fast and reload',
)
assert.doesNotMatch(
  mixSource,
  /const alias = `\$\{family\}\.js`/,
  'production prune must not synthesize stable aliases from hashed chunks',
)
assert.match(
  mixSource,
  /if \(!mix\.inProduction\(\)\) \{[\s\S]{0,500}?return;/,
  'production-only cleanup must not delete development lazy chunks',
)
assert.match(
  mixSource,
  /patchManifestHash\(\);[\s\S]*compiler\.hooks\.watchRun/,
  'the manifest hash ENOENT guard must be installed before watchRun',
)
assert.match(
  mixSource,
  /catch \(error\)[\s\S]*error\.code === 'ENOENT'/,
  'the manifest hash guard must tolerate deletion between the existence check and hashing',
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
const manifest = JSON.parse(readFileSync(join(root, 'public/mix-manifest.json'), 'utf8'))

// Development runtimes intentionally request stable names. Their complete
// chunk set must survive the post-build production cleanup hook.
if (existsSync(join(root, 'public/js/memorisation.js'))) {
  for (const family of ['ayah-notes-modal', 'ai-audio-consent', 'mic-permission-help', 'madani-page']) {
    assert.equal(
      existsSync(join(root, 'public/js', `${family}.js`)),
      true,
      `development runtime chunk ${family}.js must exist on disk`,
    )
  }
  assert.match(manifest['/js/app.js'], /^\/js\/app\.js\?id=/)
  console.log('mix-chunk-prune-guard: ok (development)')
  process.exit(0)
}

assert.ok(
  [...keep].some((name) => /^homepage\.[a-f0-9]{8}\.js$/i.test(name)),
  'app.js must keep the current hashed homepage chunk',
)
assert.ok(
  [...keep].some((name) => /^memorisation\.[a-f0-9]{8}\.js$/i.test(name)),
  'app.js must keep the current hashed memorisation chunk',
)

for (const family of ['homepage', 'memorisation', 'admin-dashboard', 'admin-feedback']) {
  assert.equal(
    manifest[`/js/${family}.js`],
    undefined,
    `production manifest must not advertise stale-prone /js/${family}.js`,
  )
  assert.equal(
    existsSync(join(root, 'public/js', `${family}.js`)),
    false,
    `production build must remove stale-prone /js/${family}.js`,
  )
}

for (const name of keep) {
  if (!/\.[a-f0-9]{8}\.js$/i.test(name)) continue
  assert.equal(
    existsSync(join(root, 'public/js', name)),
    true,
    `current runtime chunk ${name} must exist on disk`,
  )
}

console.log('mix-chunk-prune-guard: ok')
