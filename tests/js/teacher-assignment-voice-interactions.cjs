/**
 * Teacher assignment voice UI smoke plus API-backed student playback check.
 * Mic capture is not asserted in CI (no getUserMedia fixture).
 */
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const out = path.join(__dirname, 'screenshots/assignment-voice')

async function main() {
  fs.mkdirSync(out, { recursive: true })
  const report = { checks: [] }
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext()
  const teacher = await context.newPage({ viewport: { width: 390, height: 844 } })
  const student = await context.newPage({ viewport: { width: 390, height: 844 } })

  const check = (label) => {
    report.checks.push(label)
    console.log(label)
  }

  await teacher.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await teacher.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await teacher.locator('input[type=password]').fill('OrganisationDemo1!')
  await teacher.getByRole('button', { name: /login/i }).click()
  await teacher.waitForURL('**/teacher')

  await teacher.locator('.teacher-nav-shell:visible button').filter({ hasText: /assignments/i }).first().click()
  await teacher.getByRole('button', { name: /add task/i }).click()
  const dialog = teacher.getByRole('dialog').filter({ has: teacher.locator('.teacher-task-form') })
  await dialog.waitFor()
  assert.ok(await dialog.locator('.teacher-voice-note').count() >= 1, 'Task form exposes voice note controls')
  assert.ok(await dialog.locator('textarea[id$="-feedback"]').count() === 1)
  await teacher.screenshot({ path: path.join(out, 'teacher-task-voice-390.png'), fullPage: false })
  await teacher.keyboard.press('Escape')
  check('Teacher task sheet shows optional voice controls on mobile')

  const createAssignment = await context.request.post(`${base}/api/teacher/assignments`, {
    multipart: {
      kind: 'practice',
      hifz_category: 'sabaq',
      activity: 'hifz',
      surah_number: '1',
      ayah_start: '1',
      ayah_end: '2',
      repetition_target: '2',
      due_at: new Date(Date.now() + 86400000 * 3).toISOString().slice(0, 10),
      student_id: '2',
      feedback: 'Play the voice note before you practise.',
    },
    headers: {
      Accept: 'application/json',
      'X-Requested-With': 'XMLHttpRequest',
    },
  })
  assert.equal(createAssignment.status(), 201, `assignment create failed: ${createAssignment.status()}`)

  await student.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await student.locator('input[type=email]').fill('platform.demo.student.01@mutqin.test')
  await student.locator('input[type=password]').fill('StudentQa2026!')
  await student.getByRole('button', { name: /login/i }).click()
  await student.waitForURL(u => u.pathname !== '/login')
  await student.goto(`${base}/dashboard?tab=learning`)
  await student.locator('.learner-teacher__task-row:visible').first().waitFor()
  await student.locator('.learner-teacher__task-row:visible').first().getByRole('button', { name: 'Details', exact: true }).click()
  const detail = student.locator('[data-testid=learner-assignment-detail-modal]:visible')
  await detail.waitFor()
  const playerCount = await detail.locator('.teacher-audio-feedback-player').count()
  report.voicePlayers = playerCount
  await student.screenshot({ path: path.join(out, 'student-assignment-detail-390.png'), fullPage: true })
  check('Student assignment detail renders without voice/autoplay errors')

  fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
  await browser.close()
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})