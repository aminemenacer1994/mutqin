/**
 * Staged concurrency profiles for k6.
 *
 *   PERF_VUS=50  k6 run scripts/perf/k6/staged.js
 *   PERF_VUS=100 k6 run scripts/perf/k6/staged.js
 *   PERF_VUS=500 k6 run scripts/perf/k6/staged.js
 */

import http from 'k6/http'
import { check, sleep } from 'k6'

const BASE_URL = __ENV.PERF_BASE_URL || 'http://127.0.0.1:8000'
const TARGET = Number(__ENV.PERF_VUS || 50)

export const options = {
  scenarios: {
    staged: {
      executor: 'ramping-arrival-rate',
      startRate: 5,
      timeUnit: '1s',
      preAllocatedVUs: Math.min(TARGET, 100),
      maxVUs: TARGET,
      stages: [
        { duration: '1m', target: Math.floor(TARGET * 0.2) },
        { duration: '2m', target: TARGET },
        { duration: '1m', target: Math.floor(TARGET * 0.5) },
        { duration: '30s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_duration: [`p(95)<${TARGET >= 500 ? 2000 : 1200}`],
    http_req_failed: ['rate<0.08'],
  },
}

const paths = [
  '/api/dashboard?days=7',
  '/api/state',
  '/api/session/current',
  '/api/progress?limit=50',
  '/api/ai-recite-attempts',
  '/memorisation/quran-proxy/qurancom/verses/by_page/2?page=1&per_page=10',
]

export default function () {
  const path = paths[Math.floor(Math.random() * paths.length)]
  const res = http.get(`${BASE_URL}${path}`, {
    headers: { Accept: 'application/json' },
  })
  check(res, { ok: (r) => r.status < 500 })
  sleep(0.5 + Math.random())
}
