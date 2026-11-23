const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

;(async () => {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.route('**/missing-test-audio.mp3', async route => {
      await new Promise(resolve => setTimeout(resolve, 350))
      await route.fulfill({ status: 404 })
    })
    await page.route('**/audio/ayah/**', route => route.fulfill({ status: 404 }))
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL(url => url.pathname !== '/login')
    await page.goto(`${base}/progress`)
    await page.locator('.dash-jump').getByRole('button', { name: 'My learning', exact: true }).click()
    await page.locator('#learner-filter-all').waitFor()
    const result = await page.evaluate(() => {
      const seen = new Set()
      const names = []
      for (const el of document.querySelectorAll('*')) {
        let component = el.__vueParentComponent
        while (component && !seen.has(component)) {
          seen.add(component)
          names.push(component.type?.name || '(unnamed)')
          if (component.type?.name === 'LearnerTeacherSection') {
            window.__playbackTestComponent = component.proxy
            component.proxy.playbackRow = {
              assignment: { surah_name: 'Al-Ikhlas', surah_number: 112, ayah_start: 1, ayah_end: 4 },
              completion_result: { attempt: { recording_url: '/missing-test-audio.mp3', duration_ms: 11000, mistakes: [] } },
            }
            return { found: true, names: names.slice(-10) }
          }
          component = component.parent
        }
      }
      return { found: false, names: names.slice(0, 100) }
    })
    assert.equal(result.found, true, JSON.stringify(result))
    const modal = page.locator('.learner-playback-shell__panel')
    await modal.waitFor()
    for (const width of [390, 1440]) {
      for (const theme of ['light', 'dark']) {
        await page.setViewportSize({ width, height: 850 })
        await page.evaluate(theme => { document.documentElement.dataset.theme = theme }, theme)
        const box = await modal.boundingBox()
        assert.ok(box.x >= 0 && box.x + box.width <= width + 1 && box.y >= 0 && box.y + box.height <= 851, `${width}/${theme}: contained`)
        assert.equal(await modal.evaluate(el => el.scrollWidth <= el.clientWidth + 1), true, `${width}/${theme}: no overflow`)
      }
    }
    assert.equal(await modal.getByRole('button', { name: /Previous marker/ }).isDisabled(), true)
    assert.equal(await modal.getByRole('button', { name: /Next marker/ }).isDisabled(), true)
    const speed = modal.getByRole('button', { name: /Playback speed/ })
    const before = await speed.innerText()
    await speed.click()
    assert.notEqual(await speed.innerText(), before, 'Speed shows the current value')
    await modal.locator('.learner-playback-track').nth(1).getByRole('button', { name: 'Play', exact: true }).click()
    await modal.getByText('Loading audio', { exact: true }).waitFor()
    await modal.getByText('Could not load your recording').waitFor()
    assert.equal(await modal.getByRole('button', { name: 'Try again' }).count(), 1)
    const compare = modal.getByRole('button', { name: 'Compare', exact: true })
    await compare.click()
    await modal.getByText('Could not load reference audio').waitFor()
    await page.waitForFunction(() => document.querySelector('.learner-playback-shell__controls button[aria-pressed]')?.getAttribute('aria-pressed') === 'false')
    await page.evaluate(() => {
      window.__playbackTestComponent.playbackRow = { assignment: { ayah_start: 1, ayah_end: 1 }, completion_result: { attempt: {} } }
    })
    await modal.getByText('Reference audio is unavailable for this passage.').waitFor()
    await modal.getByText('Recording unavailable', { exact: true }).waitFor()
    assert.equal(await compare.isDisabled(), true, 'Compare is unavailable when either track is missing')
    assert.deepEqual(errors, [])
    console.log('Playback modal: 4 responsive/theme cases, speed, disabled markers, loading, missing tracks, failed audio/retry, failed comparison reset; no runtime errors')
  } finally { await browser.close() }
})().catch(error => { console.error(error); process.exitCode = 1 })
