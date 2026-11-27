/* Isolated demo QA. Normal login; no learning writes. Assessment is a component fixture, not submission E2E. */
const { chromium } = require('playwright')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8001'
const out = path.join(__dirname, 'screenshots/student-overhaul/interactions')
async function main() {
  fs.mkdirSync(out, { recursive: true })
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, reducedMotion: 'reduce' })
  const report = { checks: [], exceptions: [], unexpectedHttpErrors: [] }
  page.on('pageerror', e => report.exceptions.push(e.message))
  let expectedFailure = false
  page.on('response', r => { if (r.url().startsWith(base + '/api/') && r.status() >= 400 && !expectedFailure) report.unexpectedHttpErrors.push({ url: r.url(), status: r.status() }) })
  const check = label => { report.checks.push(label); console.log(label) }
  const navigate = async pane => {
    await page.locator('.teacher-nav-shell:visible button').filter({ hasText: pane }).first().click()
  }
  try {
    await page.goto(base + '/login')
    await page.locator('input[type=email]').fill('platform.demo.student.01@mutqin.test')
    await page.locator('input[type=password]').fill('StudentQa2026!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL(u => u.pathname !== '/login')
    await page.goto(base + '/dashboard?tab=learning')
    await page.locator('.learner-teacher__task-row:visible').first().waitFor()
    assert.ok(await page.evaluate(() => {
      const task = document.querySelector('.learner-teacher__task-row')
      const plan = document.querySelector('.learner-teacher__plan-slot')
      return !plan || Boolean(task && (task.compareDocumentPosition(plan) & Node.DOCUMENT_POSITION_FOLLOWING))
    }), 'Assignments appear before the optional learning plan')
    for (const width of [390, 1440]) {
      await page.setViewportSize({ width, height: 844 })
      for (const theme of ['light', 'dark']) {
        await page.evaluate(t => { document.documentElement.dataset.theme = t }, theme)
        if (width === 390) {
          await page.locator('.student-assignment-filters').getByRole('button', { name: /filter/i }).click()
          const dialog = page.locator('.teacher-dialog[role=dialog]:visible')
          await dialog.waitFor()
          assert.equal(await dialog.locator('select').count(), 4)
          await page.screenshot({ path: path.join(out, `filters-${width}-${theme}.png`) })
          await page.keyboard.press('Escape')
          await dialog.waitFor({ state: 'hidden' })
          assert.match(await page.locator(':focus').innerText(), /filter/i)
        }
        const details = page.locator('.learner-teacher__task-row:visible').first().getByRole('button', { name: 'Details', exact: true })
        await details.click()
        const dialog = page.locator('[data-testid=learner-assignment-detail-modal]:visible')
        await dialog.waitFor()
        const detailBody = (await dialog.locator('.modal-body').innerText()).trim()
        if (detailBody.length <= 20) {
          console.error('Empty assignment dialog', await dialog.locator('.modal-body').innerHTML(), await page.evaluate(() => {
            const vm = document.querySelector('.dash-section--learner-teacher')?.__vueParentComponent?.proxy
            return { hasDetailItem: Boolean(vm?.detailItem), detailTitle: vm?.detailItem?.assignment?.title, errors: vm?.assignmentListError }
          }))
          await page.screenshot({ path: path.join(out, 'assignment-empty-diagnostic.png') })
        }
        assert.ok(detailBody.length > 20, 'Assignment details must render inside the shared dialog')
        assert.ok(!detailBody.includes('common.progress'), 'Assignment details must use a translated label')
        assert.equal(await page.locator('.modal-backdrop:visible').count(), 1)
        assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)))
        await page.keyboard.press('Shift+Tab')
        assert.ok(await dialog.evaluate(el => el.contains(document.activeElement)), 'Focus stays in shared dialog')
        await page.screenshot({ path: path.join(out, `assignment-${width}-${theme}.png`), fullPage: true })
        const bounds = await dialog.locator('.modal-content').boundingBox()
        assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= width + 1)
        await page.keyboard.press('Escape')
        await dialog.waitFor({ state: 'hidden' })
        assert.equal(await details.evaluate(el => el === document.activeElement), true)
        check(`Assignment dialog and filter layout ${width}/${theme}`)
      }
    }
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.learner-teacher__task-row:visible').first().getByRole('button', { name: 'Details', exact: true }).click()
    await page.locator('[data-testid=learner-assignment-detail-modal]:visible').getByRole('button', { name: /conversation/i }).click()
    const taskConversation = page.locator('.learner-task-thread-modal[role=dialog]:visible')
    await taskConversation.waitFor()
    assert.equal(await page.locator('.modal-backdrop:visible').count(), 1)
    assert.ok((await taskConversation.locator('.modal-body').innerText()).trim().length > 10)
    await page.screenshot({ path: path.join(out, 'task-conversation-390-dark.png') })
    await page.keyboard.press('Escape')
    await taskConversation.waitFor({ state: 'hidden' })
    check('Assignment conversation opens as one shared dialog')
    for (const status of ['progress', 'review', 'revision', 'completed', 'todo']) {
      const statusResponse = page.waitForResponse(r => r.url().includes('/api/me/assignments?') && new URL(r.url()).searchParams.get('status') === status)
      await page.locator(`#learner-filter-${status}`).click()
      await statusResponse
      assert.equal(await page.locator(`#learner-filter-${status}`).getAttribute('aria-selected'), 'true')
    }
    const search = page.locator('.student-assignment-search input')
    const noMatchResponse = page.waitForResponse(r => r.url().includes('/api/me/assignments?') && new URL(r.url()).searchParams.get('search') === 'no matching assignment')
    await search.fill('no matching assignment')
    await noMatchResponse
    await page.locator('.learner-teacher__task-row:visible').first().waitFor({ state: 'hidden' })
    assert.equal(await page.locator('.learner-teacher__task-row:visible').count(), 0)
    expectedFailure = true
    await page.route('**/api/me/assignments?**', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Temporary QA failure"}' }))
    await search.fill('Al-Fatihah')
    await page.locator('#dash-my-learning .alert-danger:visible').waitFor()
    await page.unroute('**/api/me/assignments?**')
    await page.locator('#dash-my-learning .alert-danger:visible').getByRole('button', { name: /retry|try again/i }).click()
    await page.locator('.learner-teacher__task-row:visible').first().waitFor()
    expectedFailure = false
    check('Five status tabs, search, failed request and retry')
    await navigate('Progress')
    await page.locator('#tab-progress-memorisation').click()
    await page.locator('#progress-memorisation:visible').waitFor()
    assert.ok(page.url().includes('progress_section=progress-memorisation'))
    await page.keyboard.press('ArrowRight')
    await page.locator('#progress-recitation:visible').waitFor()
    await page.goBack()
    await page.locator('#progress-memorisation:visible').waitFor()
    await page.locator('#tab-achievements').click()
    assert.equal(await page.locator('#dash-progress').isVisible(), false)
    await page.screenshot({ path: path.join(out, 'achievements.png'), fullPage: true })
    check('Progress keyboard tabs and browser history')
    await navigate('Settings')
    for (const name of [/Teachers.*classes/i, /parent|guardian/i, 'Preferences', 'Security', 'Profile']) {
      const button = page.locator('.learner-settings nav').getByRole('button', { name, exact: true })
      await button.click()
      assert.equal(await button.getAttribute('aria-pressed'), 'true')
    }
    check('Settings five sections')
    await page.setViewportSize({ width: 390, height: 844 })
    await navigate(/Messages/)
    await page.locator('.learner-messages__list button').first().click()
    await page.locator('.learner-messages-back:visible').waitFor()
    await page.locator('.learner-messages-back').click()
    assert.equal(await page.locator('.learner-messages__list').isVisible(), true)
    check('Mobile conversation and back navigation')
    // Exercise the actual optional assessment dialog using a seeded assignment without submitting learning evidence.
    await page.evaluate(() => {
      const vm = document.querySelector('user-dashboard')?._vnode?.component?.subTree?.component?.proxy
      if (!vm?.support?.assignments?.[0]) throw new Error('Seeded student assignment is unavailable')
      vm.promptSupportAssignmentCompletion(vm.support.assignments[0])
    })
    const assessment = page.locator('.learner-self-assessment[role=dialog]:visible')
    await assessment.waitFor()
    await assessment.locator('input[type=radio]').first().check({ force: true })
    await assessment.locator('textarea').fill('QA unsaved comment')
    await page.keyboard.press('Escape')
    await assessment.locator('.teacher-dialog__discard').waitFor()
    await page.screenshot({ path: path.join(out, 'assessment-draft-mobile-dark.png') })
    await assessment.getByRole('button', { name: /keep editing/i }).click()
    assert.equal(await assessment.locator('textarea').inputValue(), 'QA unsaved comment')
    await page.keyboard.press('Escape')
    await assessment.getByRole('button', { name: /discard/i }).click()
    await assessment.waitFor({ state: 'hidden' })
    check('Assessment component: native radio, draft protection, keep/discard')
    assert.deepEqual(report.exceptions, [])
    assert.deepEqual(report.unexpectedHttpErrors, [])
  } finally {
    fs.writeFileSync(path.join(out, 'report.json'), JSON.stringify(report, null, 2))
    await browser.close()
  }
}
main().catch(e => { console.error(e); process.exitCode = 1 })
