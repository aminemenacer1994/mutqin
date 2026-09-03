#!/usr/bin/env node
/**
 * Node-based HTTP load smoke (no k6 required).
 *
 * Usage:
 *   node scripts/perf/autocannon-smoke.mjs
 *   PERF_BASE_URL=http://127.0.0.1:8000 PERF_CONNECTIONS=50 node scripts/perf/autocannon-smoke.mjs
 */

import { spawnSync } from 'child_process'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const baseUrl = process.env.PERF_BASE_URL || 'http://127.0.0.1:8000'
const connections = Number(process.env.PERF_CONNECTIONS || 50)
const duration = Number(process.env.PERF_DURATION_SEC || 10)

const paths = [
  '/up',
  '/memorisation/quran-proxy/qurancom/verses/by_page/1?page=1&per_page=5',
]

function runAutocannon(url) {
  const npx = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(
    npx,
    [
      '--yes',
      'autocannon@7',
      '-c', String(connections),
      '-d', String(duration),
      '-j',
      url,
    ],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  )
  if (result.status !== 0) {
    console.error(result.stderr || result.stdout)
    return null
  }
  try {
    return JSON.parse(result.stdout)
  } catch {
    return { raw: result.stdout }
  }
}

console.log(`Autocannon smoke @ ${baseUrl} (${connections} connections, ${duration}s)`)

/** @type {Record<string, unknown>} */
const summary = { base_url: baseUrl, connections, duration_sec: duration, endpoints: {} }

for (const p of paths) {
  const url = `${baseUrl.replace(/\/$/, '')}${p}`
  console.log(`\n→ ${p}`)
  const data = runAutocannon(url)
  if (data?.latency) {
    summary.endpoints[p] = {
      p50: data.latency.p50,
      p95: data.latency.p97_5 ?? data.latency.p99,
      p99: data.latency.p99,
      throughput: data.throughput,
      errors: data.errors,
    }
    console.log(`  p50=${data.latency.p50}ms p99=${data.latency.p99}ms req/s=${data.throughput?.average ?? 'n/a'}`)
  }
}

const outDir = path.join(__dirname, 'results')
fs.mkdirSync(outDir, { recursive: true })
fs.writeFileSync(path.join(outDir, 'autocannon-summary.json'), JSON.stringify(summary, null, 2))
console.log('\nWrote scripts/perf/results/autocannon-summary.json')
