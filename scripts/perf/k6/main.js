/**
 * k6 load test — Mutqin staging scenarios
 *
 * Prerequisites:
 *   brew install k6   # or https://grafana.com/docs/k6/latest/set-up/install-k6/
 *   PERF_BASE_URL=https://staging.example.com k6 run scripts/perf/k6/main.js
 *
 * Never point at production without explicit approval.
 */

import http from 'k6/http'
import { check, sleep } from 'k6'
import { Trend, Rate } from 'k6/metrics'

const BASE_URL = __ENV.PERF_BASE_URL || 'http://127.0.0.1:8000'
const VUS = Number(__ENV.PERF_VUS || 50)
const DURATION = __ENV.PERF_DURATION || '2m'
const EMAIL = __ENV.PERF_EMAIL || 'perf-user-1@mutqin-load.test'
const PASSWORD = __ENV.PERF_PASSWORD || 'password'

const apiLatency = new Trend('mutqin_api_latency', true)
const apiErrors = new Rate('mutqin_api_errors')

export const options = {
  scenarios: {
    learner_browse: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: Math.floor(VUS * 0.4) },
        { duration: DURATION, target: VUS },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '20s',
    },
  },
  thresholds: {
    mutqin_api_latency: ['p(95)<800', 'p(99)<1500'],
    mutqin_api_errors: ['rate<0.05'],
    http_req_failed: ['rate<0.05'],
  },
}

function jar() {
  return http.cookieJar()
}

function login(jar) {
  http.get(`${BASE_URL}/sanctum/csrf-cookie`, { jar })
  const res = http.post(
    `${BASE_URL}/login`,
    { email: EMAIL, password: PASSWORD },
    {
      jar,
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      redirects: 0,
    }
  )
  check(res, { 'login ok': (r) => r.status === 302 || r.status === 200 })
}

function apiGet(jar, path, name) {
  const res = http.get(`${BASE_URL}${path}`, {
    jar,
    headers: { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' },
    tags: { name },
  })
  apiLatency.add(res.timings.duration, { endpoint: name })
  apiErrors.add(res.status >= 400)
  check(res, { [`${name} 2xx`]: (r) => r.status >= 200 && r.status < 400 })
  return res
}

export function setup() {
  const j = jar()
  login(j)
  return { jar: j }
}

export default function (data) {
  const j = data.jar || jar()
  if (!data.jar) login(j)

  // Realistic learner session: dashboard → state → session → progress
  apiGet(j, '/api/dashboard?days=30', 'dashboard')
  sleep(0.3 + Math.random() * 0.5)
  apiGet(j, '/api/state', 'state')
  sleep(0.2 + Math.random() * 0.4)
  apiGet(j, '/api/session/current', 'session_current')
  apiGet(j, '/api/progress?limit=100', 'progress')
  apiGet(j, '/api/recommendations/next', 'recommendations')
  sleep(0.5 + Math.random())

  // Mushaf proxy (public, cached upstream)
  http.get(`${BASE_URL}/memorisation/quran-proxy/qurancom/verses/by_page/1?page=1&per_page=10`, {
    tags: { name: 'quran_page' },
  })
  http.get(`${BASE_URL}/memorisation/quran-proxy/alquran/surah/1/en.asad`, {
    tags: { name: 'translation' },
  })

  sleep(1 + Math.random() * 2)
}

export function handleSummary(data) {
  const out = {
    generated_at: new Date().toISOString(),
    base_url: BASE_URL,
    vus: VUS,
    metrics: {
      p95_ms: data.metrics.mutqin_api_latency?.values?.['p(95)'],
      p99_ms: data.metrics.mutqin_api_latency?.values?.['p(99)'],
      error_rate: data.metrics.mutqin_api_errors?.values?.rate,
    },
  }
  return {
    stdout: JSON.stringify(out, null, 2) + '\n',
    'scripts/perf/results/k6-summary.json': JSON.stringify(out, null, 2),
  }
}
