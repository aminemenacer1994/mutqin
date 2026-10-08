#!/usr/bin/env node
/**
 * Remove hashed public/js chunks that are neither in mix-manifest.json nor
 * among the newest KEEP generations per family. Safe to run after `npm run build`.
 *
 *   node scripts/perf/prune-stale-public-js.mjs
 *   node scripts/perf/prune-stale-public-js.mjs --dry-run
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '../..')
const jsDir = path.join(root, 'public/js')
const manifestPath = path.join(root, 'public/mix-manifest.json')
const KEEP_GENERATIONS = 2
const dryRun = process.argv.includes('--dry-run')

if (!fs.existsSync(jsDir) || !fs.existsSync(manifestPath)) {
  console.error('prune-stale-public-js: missing public/js or mix-manifest.json')
  process.exit(1)
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
const keep = new Set(['app.js', 'app.css'])

for (const key of Object.keys(manifest)) {
  const base = path.basename(String(key).split('?')[0])
  if (base) keep.add(base)
}

/** @type {Map<string, Array<{ name: string, mtime: number }>>} */
const byFamily = new Map()
for (const entry of fs.readdirSync(jsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.js$/i.test(entry.name)) continue
  const hashed = entry.name.match(/^(.+)\.([a-f0-9]{8})\.js$/i)
  if (!hashed) {
    // Stable aliases (memorisation.js) stay if referenced by manifest/runtime.
    continue
  }
  const family = hashed[1]
  const list = byFamily.get(family) || []
  let mtime = 0
  try {
    mtime = fs.statSync(path.join(jsDir, entry.name)).mtimeMs
  } catch {
    continue
  }
  list.push({ name: entry.name, mtime })
  byFamily.set(family, list)
}

for (const list of byFamily.values()) {
  list.sort((a, b) => b.mtime - a.mtime)
  for (const entry of list.slice(0, KEEP_GENERATIONS)) {
    keep.add(entry.name)
  }
}

let removed = 0
let bytes = 0
for (const entry of fs.readdirSync(jsDir, { withFileTypes: true })) {
  if (!entry.isFile() || !/\.js$/i.test(entry.name)) continue
  if (keep.has(entry.name)) continue
  if (!/\.[a-f0-9]{8}\.js$/i.test(entry.name)) continue

  const abs = path.join(jsDir, entry.name)
  let size = 0
  try {
    size = fs.statSync(abs).size
  } catch {
    continue
  }
  if (dryRun) {
    console.log(`[dry-run] would remove ${entry.name} (${size} bytes)`)
  } else {
    try {
      fs.unlinkSync(abs)
    } catch (error) {
      console.warn(`failed to remove ${entry.name}:`, error.message)
      continue
    }
  }
  removed += 1
  bytes += size
}

console.log(
  `prune-stale-public-js: ${dryRun ? 'would remove' : 'removed'} ${removed} file(s), `
  + `${(bytes / (1024 * 1024)).toFixed(2)} MiB`
)
