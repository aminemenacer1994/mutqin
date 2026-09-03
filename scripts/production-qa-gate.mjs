#!/usr/bin/env node
/**
 * Production QA gate — runs the automated slice of docs/production-qa.md.
 * Device/browser cells that need a physical phone stay Manual in the matrix.
 */
import { spawnSync } from 'node:child_process'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const checks = [
  {
    id: 'php-health',
    label: 'Health endpoints (/health, /internal/health, /internal/alert-test)',
    cmd: ['php', 'artisan', 'test', '--filter=HealthMonitoringTest'],
  },
  {
    id: 'php-auth-email',
    label: 'Register → verify email',
    cmd: ['php', 'artisan', 'test', '--filter=EmailVerificationTest'],
  },
  {
    id: 'php-google',
    label: 'Google sign-in / account collision',
    cmd: ['php', 'artisan', 'test', '--filter=GoogleAuthControllerTest'],
  },
  {
    id: 'php-password',
    label: 'Forgot / reset password',
    cmd: ['php', 'artisan', 'test', '--filter=PasswordResetFlowTest'],
  },
  {
    id: 'php-auth-pages',
    label: 'Auth / legal / pricing page render',
    cmd: ['php', 'artisan', 'test', '--filter=AuthPageRenderTest'],
  },
  {
    id: 'php-profile',
    label: 'Profile / account deletion',
    cmd: ['php', 'artisan', 'test', '--filter=ProfileControllerTest'],
  },
  {
    id: 'php-session',
    label: 'Session lifecycle (start/pause/resume/complete)',
    cmd: ['php', 'artisan', 'test', '--filter=SessionLifecycleTest'],
  },
  {
    id: 'php-persistence',
    label: 'Saved sessions / learning persistence',
    cmd: ['php', 'artisan', 'test', '--filter=LearningPersistenceTest'],
  },
  {
    id: 'php-isolation',
    label: 'Cross-user API isolation',
    cmd: ['php', 'artisan', 'test', '--filter=LearnerResourceAuthorizationTest'],
  },
  {
    id: 'php-ai-guard',
    label: 'Invalid AI attempt does not affect progress',
    cmd: ['php', 'artisan', 'test', '--filter=RecitationAttemptGuardTest'],
  },
  {
    id: 'php-speechmatics',
    label: 'Speechmatics rate limit / usage cap',
    cmd: ['php', 'artisan', 'test', '--filter=Speechmatics'],
  },
  {
    id: 'js-owner',
    label: 'Client owner isolation',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/mutqin-owner-isolation.test.mjs'],
  },
  {
    id: 'js-onboarding',
    label: 'Onboarding journey',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/onboarding-journey.test.mjs'],
  },
  {
    id: 'js-session',
    label: 'Session lifecycle + autosave + saved sessions',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/session-lifecycle.test.mjs'],
  },
  {
    id: 'js-autosave',
    label: 'Session autosave / background resume contracts',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/session-autosave.test.mjs'],
  },
  {
    id: 'js-saved',
    label: 'Practice saved-sessions flow',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/practice-saved-sessions-flow.test.mjs'],
  },
  {
    id: 'js-ai-guard',
    label: 'AI attempt guard + silent evaluation',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/recitation-attempt-guard.test.mjs'],
  },
  {
    id: 'js-silent',
    label: 'Silent AI evaluation does not update SR on invalid attempts',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/silent-ai-evaluation-guard.test.mjs'],
  },
  {
    id: 'js-mic',
    label: 'Recording resilience (mic / timeout / rate limit / cap)',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/recording-resilience.test.mjs'],
  },
  {
    id: 'js-network',
    label: 'Offline / network fallback',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/network-status-fallback.test.mjs'],
  },
  {
    id: 'js-chunk',
    label: 'Chunk / deploy update recovery',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/chunk-load-recovery.test.mjs'],
  },
  {
    id: 'js-empty',
    label: 'Empty / error / loading states',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/app-status-empty-states.test.mjs'],
  },
  {
    id: 'js-audio',
    label: 'Audio playback guards',
    cmd: ['node', '--experimental-vm-modules', 'tests/js/audio-playback-guards.test.mjs'],
  },
  {
    id: 'js-mushaf',
    label: 'Mushaf session-only layout',
    cmd: ['node', 'tests/js/mushaf-session-only.test.mjs'],
  },
]

function run(check) {
  const result = spawnSync(check.cmd[0], check.cmd.slice(1), {
    cwd: root,
    encoding: 'utf8',
    env: process.env,
  })
  const ok = result.status === 0
  const tail = `${result.stdout || ''}\n${result.stderr || ''}`.trim().split('\n').slice(-8).join('\n')
  return { ...check, ok, status: result.status, tail }
}

const rows = []
let failed = 0
for (const check of checks) {
  process.stdout.write(`▸ ${check.label} … `)
  const row = run(check)
  rows.push(row)
  if (row.ok) {
    console.log('Pass')
  } else {
    failed += 1
    console.log('Fail')
    console.log(row.tail)
  }
}

console.log('\n--- Production QA automated gate ---')
for (const row of rows) {
  console.log(`${row.ok ? 'Pass' : 'Fail'}\t${row.id}\t${row.label}`)
}

if (failed) {
  console.error(`\n${failed} automated check(s) failed. See docs/production-qa.md.`)
  process.exit(1)
}

console.log('\nAutomated production QA gate passed.')
