/* A delayed permission response must not leave a microphone running after close.
   The synthetic stream is discarded; no audio is sent or persisted. */
const assert = require('node:assert/strict')
const { chromium } = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

async function main() {
  const browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream'] })
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, permissions: ['microphone'] })
  const page = await context.newPage()
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_EMAIL || 'org.demo.halaqa.teacher@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL('**/teacher')
    await page.goto(`${base}/teacher?view=assignments`)
    await page.locator('.teacher-task-row__message').first().click()
    const dialog = page.locator('.teacher-dialog[role=dialog]')
    await page.evaluate(() => {
      const original = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices)
      navigator.mediaDevices.getUserMedia = async constraints => {
        const stream = await original(constraints)
        window.__qaPendingMicrophone = stream
        await new Promise(resolve => { window.__qaReleaseMicrophone = resolve })
        return stream
      }
    })
    await dialog.getByRole('button', { name: 'Record voice note', exact: true }).click()
    await page.waitForFunction(() => typeof window.__qaReleaseMicrophone === 'function')
    await dialog.locator('.modal-header .btn-close').click()
    await dialog.getByRole('button', { name: 'Discard changes', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    await page.evaluate(() => window.__qaReleaseMicrophone())
    await page.waitForFunction(() => window.__qaPendingMicrophone.getTracks().every(track => track.readyState === 'ended'))
    assert.deepEqual(errors, [])
    console.log(JSON.stringify({ delayedPermissionAfterClose: true, allTracksStopped: true, runtimeErrors: 0 }))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
