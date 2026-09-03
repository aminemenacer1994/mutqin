#!/usr/bin/env node
/**
 * Report production bundle/chunk sizes from mix-manifest (avoids stale watch artifacts).
 *
 * Usage:
 *   npm run build && node scripts/perf/analyze-bundles.mjs
 *   node scripts/perf/analyze-bundles.mjs --json
 */

import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const publicDir = path.join(__dirname, '../../public')
const manifestPath = path.join(publicDir, 'mix-manifest.json')
const jsonOut = process.argv.includes('--json')

/** Max bytes for manifest-referenced entry chunks (post-build baseline + headroom). */
const THRESHOLDS_BYTES = {
  '/js/app.js': 2_150_000,
  '/js/memorisation': 3_900_000,
  '/js/dashboard': 330_000,
  '/js/homepage': 65_000,
  '/js/admin-dashboard': 250_000,
}

function loadManifestFiles() {
  if (!fs.existsSync(manifestPath)) {
    console.error('Missing public/mix-manifest.json — run npm run build first')
    process.exit(1)
  }
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  /** @type {Map<string, number>} */
  const byRoute = new Map()

  for (const key of Object.keys(manifest)) {
    if (!key.endsWith('.js')) continue
    const rel = key.split('?')[0]
    const abs = path.join(publicDir, rel.replace(/^\//, ''))
    if (!fs.existsSync(abs)) continue
    const bytes = fs.statSync(abs).size
    const routeKey = rel.replace(/\.[a-f0-9]{8}\.js$/, '').replace(/\.js$/, '')
    const existing = byRoute.get(routeKey)
    if (!existing || bytes > existing.bytes) {
      byRoute.set(routeKey, { rel, bytes })
    }
  }

  return [...byRoute.entries()]
    .map(([route, info]) => ({ route, ...info }))
    .sort((a, b) => b.bytes - a.bytes)
}

function matchThreshold(route) {
  for (const [prefix, max] of Object.entries(THRESHOLDS_BYTES)) {
    if (route.startsWith(prefix) || route === prefix) return max
  }
  return null
}

function formatBytes(bytes) {
  if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(2)} MiB`
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KiB`
  return `${bytes} B`
}

const files = loadManifestFiles()
const violations = []

for (const file of files) {
  const max = matchThreshold(file.route)
  if (max && file.bytes > max) {
    violations.push({ ...file, threshold: max })
  }
}

const report = {
  generated_at: new Date().toISOString(),
  manifest: manifestPath,
  chunks: files.map((f) => ({ ...f, human: formatBytes(f.bytes) })),
  initial_load: files.find((f) => f.route === '/js/app.js') ?? null,
  violations,
}

if (jsonOut) {
  console.log(JSON.stringify(report, null, 2))
} else {
  console.log('Mutqin bundle analysis (mix-manifest)')
  console.log('==================================')
  for (const f of files.slice(0, 15)) {
    console.log(`  ${f.rel.padEnd(44)} ${formatBytes(f.bytes)}`)
  }
  if (violations.length) {
    console.log('\n⚠ Threshold violations:')
    for (const v of violations) {
      console.log(`  ${v.rel}: ${formatBytes(v.bytes)} > ${formatBytes(v.threshold)}`)
    }
    process.exitCode = 1
  } else {
    console.log('\n✓ All tracked manifest chunks within thresholds')
  }
}

process.exit(process.exitCode ?? 0)
