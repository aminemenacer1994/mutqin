/* Read-only checks against the persisted local demo classroom. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const { chromium } = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const shots = process.env.MUTQIN_QA_SHOTS || '/private/tmp/mutqin-workspace-qa'

async function main() {
  fs.mkdirSync(shots, { recursive: true })
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } })
  const errors = []
  page.on('pageerror', error => errors.push(error.message))
  try {
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL(url => url.pathname !== '/login')
    await page.goto(`${base}/progress`)
    await page.locator('.learner-home__header').waitFor()
    assert.doesNotMatch(await page.locator('.dash-home-pane').innerText(), /dashboard\.home_/, 'Home labels resolve to translated copy')
    const support = await page.evaluate(async () => (await fetch('/api/me/support', { headers: { Accept: 'application/json' } })).json())
    const { nextLearnerHomeTask } = await import('../../resources/js/scripts/teacher/learnerHome.js')
    const expectedTask = nextLearnerHomeTask(support.assignments)
    if (expectedTask) {
      await page.locator(`.learner-home__task-head[data-assignment-id="${expectedTask.id}"]`).waitFor()
      assert.ok((await page.locator('.learner-home__task-head h3').innerText()).includes(expectedTask.assignment.surah_name), 'Home preserves the actual assigned surah')
      assert.ok(await page.locator('.learner-home__task-footer').getByRole('button').isEnabled(), 'Home offers an actionable next task')
    }
    const directModalCases = []
    const feedbackAction = page.locator('.learner-home__feedback').getByRole('button', { name: 'Read feedback', exact: true })
    if (await feedbackAction.count()) {
      const savedFeedback = (await page.locator('.learner-home__feedback-preview').innerText()).trim()
      await feedbackAction.click()
      const feedbackDialog = page.locator('.dash-student-dialog--thread, .learner-task-thread-modal')
      await feedbackDialog.waitFor()
      const feedbackClose = feedbackDialog.getByRole('button', { name: 'Back', exact: true }).first()
      await feedbackClose.focus()
      await feedbackClose.press('Shift+Tab')
      assert.equal(await feedbackDialog.evaluate(el => el.contains(document.activeElement)), true, 'Feedback dialog traps reverse keyboard navigation')
      assert.ok((await feedbackDialog.innerText()).replace(/\s+/g, ' ').includes(savedFeedback.replace(/\s+/g, ' ').slice(0, 30)), 'Opening feedback displays the actual saved feedback instead of an empty unrelated conversation')
      const isDirect = await page.locator('.dash-student-dialog--thread').count()
      if (isDirect) {
        assert.equal(await feedbackDialog.getByRole('button', { name: 'Record voice note', exact: true }).count(), 0, 'Text-only direct endpoint does not offer unsupported voice recording')
        for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
          await page.setViewportSize({ width, height: 900 })
          for (const theme of ['light', 'sepia', 'dark']) {
            await page.evaluate(value => { document.documentElement.dataset.theme = value }, theme)
            const geometry = await feedbackDialog.evaluate(element => {
              const box = element.getBoundingClientRect()
              const body = element.querySelector('.dash-student-dialog__body')
              return { left: box.left, right: box.right, top: box.top, bottom: box.bottom, overflow: body.scrollWidth - body.clientWidth }
            })
            assert.ok(geometry.left >= 0 && geometry.right <= width + 1 && geometry.top >= 0 && geometry.bottom <= 901, `Direct conversation ${width}px ${theme}: viewport containment`)
            assert.ok(geometry.overflow <= 1, `Direct conversation ${width}px ${theme}: composer does not overflow`)
            if (!await feedbackDialog.locator('.message-bubble').count()) assert.ok(geometry.bottom - geometry.top <= 520, 'An empty direct conversation is content-sized')
            const send = feedbackDialog.locator('button[type=submit]')
            assert.ok((await send.innerText()).includes('Send message'), 'Sending has a visible text label')
            const actionRow = await feedbackDialog.locator('.teacher-task-conversation__composer-foot--learner').evaluate(element => [...element.querySelectorAll('button')].filter(button => button.getClientRects().length).map(button => { const box = button.getBoundingClientRect(); return { height: box.height, centre: box.top + box.height / 2 } }))
            assert.ok(actionRow.every(button => button.height >= 44), 'Conversation actions have touch-sized controls')
            assert.ok(Math.max(...actionRow.map(button => button.centre)) - Math.min(...actionRow.map(button => button.centre)) <= 1, 'Conversation controls share one evenly aligned row')
            directModalCases.push({ width, theme, ...geometry })
            if ([390, 1440].includes(width) && theme === 'light') await page.screenshot({ path: `${shots}/learner-direct-conversation-${width}.png` })
          }
        }
        await page.setViewportSize({ width: 1440, height: 1000 })
        await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
        const composer = feedbackDialog.locator('textarea')
        await composer.fill('A draft kept for review, never sent')
        await feedbackClose.click()
        await feedbackDialog.getByRole('button', { name: 'Keep editing', exact: true }).click()
        assert.equal(await composer.inputValue(), 'A draft kept for review, never sent', 'Canceling close preserves the draft')
        assert.equal(await composer.evaluate(element => element === document.activeElement), true, 'Keep editing returns focus to the composer')
        await feedbackClose.click()
        await feedbackDialog.getByRole('button', { name: 'Discard changes', exact: true }).click()
      } else await feedbackClose.click()
      await feedbackDialog.waitFor({ state: 'hidden' })
      assert.equal(await page.locator('#dash-welcome-heading').evaluate(el => document.activeElement === el), true, 'Closing Home feedback returns focus to the visible learning heading')
    }
    const results = []
    for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
      await page.setViewportSize({ width, height: 900 })
      for (const theme of ['light', 'sepia', 'dark']) {
        await page.evaluate(value => { document.documentElement.dataset.theme = value }, theme)
        await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
        for (const name of ['Home', 'My learning', 'Progress', 'Activity']) {
          await page.locator('.dash-jump').getByRole('button', { name, exact: true }).click()
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          // Tab navigation restores the previous reading position. Inspect the
          // header geometry at the top separately from that behaviour.
          await page.evaluate(() => window.scrollTo({ top: 0, left: 0, behavior: 'instant' }))
          const overflow = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth)
          assert.ok(overflow <= 1, `Learner ${name} ${width}px ${theme}: overflow ${overflow}`)
          const layout = await page.evaluate(() => {
            const visible = el => el.getClientRects().length && getComputedStyle(el).display !== 'none'
            const nav = [...document.querySelectorAll('.dash-jump')].find((el) => el.getClientRects().length).getBoundingClientRect()
            const header = document.querySelector('.app-navbar')?.getBoundingClientRect()
            const progress = document.querySelector('#dash-progress')
            const history = document.querySelector('#dash-activity')
            const achievements = document.querySelector('#achievements')
            return {
              navTop: nav.top, headerBottom: header?.bottom || 0,
              faded: [...document.querySelectorAll('.learner-workspace .dash-reveal')].filter(visible).some(el => Number(getComputedStyle(el).opacity) < 1),
              metricColumns: getComputedStyle(document.querySelector('.dash-learning__metrics')).gridTemplateColumns.split(' ').length,
              progressWidth: progress.getBoundingClientRect().width,
              progressPaneWidth: progress.parentElement.getBoundingClientRect().width,
              historyTop: history.getBoundingClientRect().top,
              achievementsVisible: achievements ? visible(achievements) : false,
              achievementsTop: achievements?.getBoundingClientRect().top ?? null,
            }
          })
          assert.ok(layout.navTop >= layout.headerBottom - 1, `Learner ${name} ${width}px: navigation stays below the app header`)
          assert.equal(layout.faded, false, `Learner ${name}: content is immediately readable`)
          if (name === 'Progress') {
            assert.equal(layout.metricColumns, width < 768 ? 2 : 4, 'Progress metrics use the appropriate responsive grid')
            assert.ok(Math.abs(layout.progressWidth - layout.progressPaneWidth) <= 1, 'Progress summary uses its available width')
          }
          if (name === 'Activity' && layout.achievementsVisible) assert.ok(layout.historyTop < layout.achievementsTop, 'Learning history precedes achievements')
          results.push({ pane: name, width, theme, overflow })
          if ([390, 1440].includes(width) && theme === 'light') await page.screenshot({ path: `${shots}/learner-${name.toLowerCase().replaceAll(' ', '-')}-${width}.png` })
        }
      }
    }
    assert.equal(await page.getByText('This week: 0 of 0 done', { exact: true }).isVisible().catch(() => false), false, 'Empty weekly progress is hidden')
    await page.setViewportSize({ width: 390, height: 844 })
    await page.locator('.dash-jump').getByRole('button', { name: 'My learning', exact: true }).click()
    const allTab = page.locator('#learner-filter-all')
    await allTab.click()
    await allTab.press('End')
    assert.equal(await page.locator('#learner-filter-done').getAttribute('aria-selected'), 'true', 'End selects completed tasks')
    await page.locator('#learner-filter-done').press('Home')
    assert.equal(await allTab.getAttribute('aria-selected'), 'true', 'Home selects all tasks')
    assert.equal(await allTab.evaluate(el => el === document.activeElement), true, 'Keyboard filtering retains focus')
    await page.locator('#learner-filter-todo').click()
    const primary = page.locator('.learner-teacher__icon-hit--primary').first()
    assert.ok((await primary.innerText()).trim().length > 0, 'Task actions have visible labels')
    assert.ok((await primary.boundingBox()).height >= 44, 'Mobile task action has a 44px touch target')
    await page.locator('.learner-teacher__icon-hit--message').first().click()
    const thread = page.locator('.learner-task-thread-modal')
    await thread.waitFor()
    await page.waitForTimeout(300)
    const threadBox = await thread.locator('.learner-task-thread-modal__panel').boundingBox()
    const threadRoot = await thread.boundingBox()
    assert.ok(Math.abs(threadBox.x - (390 - threadBox.x - threadBox.width)) <= 2, 'Mobile conversation modal is horizontally centered')
    assert.ok(Math.abs((threadBox.y + threadBox.height / 2) - (threadRoot.y + threadRoot.height / 2)) <= 16, `Mobile conversation modal is vertically centered: ${JSON.stringify({ threadBox, threadRoot })}`)
    const input = thread.locator('textarea')
    assert.ok((await input.boundingBox()).width >= 270, 'Learner conversation has a usable composer')
    await page.screenshot({ path: `${shots}/learner-conversation-390.png` })
    await thread.locator('.learner-task-thread-modal__head').getByRole('button', { name: 'Back', exact: true }).click()
    await thread.waitFor({ state: 'hidden' })
    assert.deepEqual(errors, [], 'No learner runtime errors')
    fs.writeFileSync(`${shots}/learner-results.json`, JSON.stringify(results, null, 2))
    fs.writeFileSync(`${shots}/learner-direct-modal-results.json`, JSON.stringify(directModalCases, null, 2))
    console.log(JSON.stringify({ responsiveCases: results.length, directModalCases: directModalCases.length, homeAssignment: expectedTask?.id || null, keyboardFilters: true, conversation: true, emptyProgressHidden: true, runtimeErrors: errors.length }, null, 2))
  } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
