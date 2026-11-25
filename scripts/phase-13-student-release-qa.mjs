#!/usr/bin/env node
/**
 * Phase 13 — Student ecosystem release gate (static + PHP feature subset).
 * Playwright / device mic gates are documented in docs/phase-13-student-ecosystem-release-qa.md.
 */
import { spawnSync } from 'node:child_process'
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

const jsGates = [
  'tests/js/student-dashboard-design-system.test.mjs',
  'tests/js/student-dashboard-navigation.test.mjs',
  'tests/js/student-practice.test.mjs',
  'tests/js/student-notifications-inbox.test.mjs',
  'tests/js/student-home.test.mjs',
  'tests/js/phase1-student-platform-verify.mjs',
  'tests/js/phase2-student-app-shell-navigation.test.mjs',
  'tests/js/phase2-student-my-learning.test.mjs',
  'tests/js/phase5-student-my-learning.test.mjs',
  'tests/js/phase6-student-progress.test.mjs',
  'tests/js/phase7-student-activity.test.mjs',
  'tests/js/phase-6-student-polish-verify.mjs',
  'tests/js/phase-10-student-modals-verify.mjs',
  'tests/js/phase11-student-responsiveness-verify.mjs',
  'tests/js/learner-student-messages.test.mjs',
  'tests/js/learner-support-refresh.test.mjs',
  'tests/js/student-progress-view.test.mjs',
  'tests/js/student-ai-feedback.test.mjs',
  'tests/js/student-activity.test.mjs',
  'tests/js/student-activity-filters.test.mjs',
]

function runNode(relPath) {
  const abs = join(root, relPath)
  if (!existsSync(abs)) {
    console.error(`missing: ${relPath}`)
    return false
  }
  const result = spawnSync(process.execPath, [abs], { cwd: root, stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    console.error(`FAIL: ${relPath}`)
    return false
  }
  console.log(`ok: ${relPath}`)
  return true
}

function runPhpFilter(filter) {
  const result = spawnSync('php', ['artisan', 'test', `--filter=${filter}`], { cwd: root, stdio: 'inherit', env: process.env })
  if (result.status !== 0) {
    console.error(`FAIL: php artisan test --filter=${filter}`)
    return false
  }
  console.log(`ok: php --filter=${filter}`)
  return true
}

function runNpmScript(name) {
  const result = spawnSync('npm', ['run', name], { cwd: root, stdio: 'inherit', env: process.env, shell: process.platform === 'win32' })
  if (result.status !== 0) {
    console.error(`FAIL: npm run ${name}`)
    return false
  }
  console.log(`ok: npm run ${name}`)
  return true
}

let ok = true
console.log('--- Phase 13 student JS static gates ---')
for (const file of jsGates) {
  ok = runNode(file) && ok
}

console.log('--- Phase 13 student PHP integration gates ---')
ok = runPhpFilter('StudentTeacherParent|StudentActivity|StudentAiFeedback|StudentProgressSnapshot|LearnerCircle|SavedSessionSync|StudentNotifications') && ok
ok = runPhpFilter('LearnerResourceAuthorization') && ok

console.log('--- Phase 13 toolchain gates ---')
ok = runNpmScript('lint:imports') && ok
ok = runNpmScript('test:theme') && ok
ok = runNpmScript('build') && ok

if (!ok) {
  console.error('\nPhase 13 student release QA: NO-GO (see failures above)')
  process.exit(1)
}

console.log('\nPhase 13 student release QA: static + PHP gates PASS')
console.log('Manual / Playwright: see docs/phase-13-student-ecosystem-release-qa.md')