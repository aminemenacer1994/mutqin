const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

async function clickTabWithoutAutoScroll(page, label, scrollY = null) {
  if (Number.isFinite(scrollY)) {
    await page.evaluate(top => window.scrollTo({ top, left: 0, behavior: 'instant' }), scrollY)
    await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  }
  await page.evaluate((label) => {
    const button = [...document.querySelectorAll('.dash-jump__link')]
      .find(node => node.textContent.trim().toLowerCase() === label.toLowerCase())
    if (!button) throw new Error(`Missing dashboard tab: ${label}`)
    button.click()
  }, label)
  await page.waitForFunction(expected => {
    const active = document.querySelector('.dash-jump__link.is-active')
    return active?.textContent.trim().toLowerCase() === expected.toLowerCase()
  }, label)
  await page.waitForTimeout(100)
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
  const runtimeErrors = []
  page.on('pageerror', error => runtimeErrors.push(error.message))

  try {
    await page.goto(`${base}/login`)
    await page.locator('input[type=email]').fill(process.env.MUTQIN_QA_STUDENT_EMAIL || 'org.demo.halaqa.student1@example.com')
    await page.locator('input[type=password]').fill(process.env.MUTQIN_QA_PASSWORD || 'OrganisationDemo1!')
    await page.getByRole('button', { name: /login/i }).click()
    await page.waitForURL(url => url.pathname !== '/login')
    // Read-only fixture: distinguish AI wording evidence from practice and teacher feedback.
    await page.route('**/api/dashboard/activity?*', route => route.fulfill({ json: { activity: [
      { id: 'ai-1', type: 'ai_check', authority: 'ai_word_match', practice_kind: 'recitation', surah_number: 1, surah_name: 'Al-Fatihah', ayah_start: 1, ayah_end: 7, outcome_key: 'ai_result', outcome_params: { accuracy: 97 }, occurred_at: '2026-11-20T12:00:00Z' },
      { id: 'session-1', type: 'session', practice_kind: 'memorisation', surah_number: 112, surah_name: 'Al-Ikhlas', ayah_start: 1, ayah_end: 4, outcome_key: 'session_ended_early', occurred_at: '2026-11-20T11:00:00Z' },
      { id: 'teacher-1', type: 'teacher_feedback', authority: 'teacher', practice_kind: 'unspecified', surah_number: 1, surah_name: 'Al-Fatihah', ayah_start: 1, ayah_end: 7, outcome_params: { body: 'Practise the first word slowly.' }, occurred_at: '2026-11-20T10:00:00Z' },
    ] } }))
    await page.goto(`${base}/progress?source=navigation-test`)
    await page.locator('.dash-jump').waitFor()

    assert.equal(await page.locator('.dash-jump__link').count(), 4, 'The student shell always exposes four stable tabs')
    const desktopWorkspace = await page.evaluate(() => {
      const nav = document.querySelector('.dash-jump').getBoundingClientRect()
      const pane = document.querySelector('.dash-home-pane').getBoundingClientRect()
      return { navRight: nav.right, paneLeft: pane.left, font: getComputedStyle(document.querySelector('.learner-workspace')).fontFamily }
    })
    assert.ok(desktopWorkspace.navRight < desktopWorkspace.paneLeft, 'Desktop navigation uses the teacher workspace sidebar layout')
    assert.match(desktopWorkspace.font, /Plus Jakarta Sans/, 'Student and teacher workspaces use the same UI font stack')
    assert.equal(new URL(page.url()).searchParams.get('source'), 'navigation-test')
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'home')

    // Give each pane deterministic overflow so per-pane scroll restoration can
    // be exercised independently of the demo account's current amount of data.
    await page.evaluate(() => {
      document.querySelectorAll('.dash-pane').forEach((pane) => {
        const spacer = document.createElement('div')
        spacer.dataset.navigationTestSpacer = 'true'
        spacer.style.height = '1400px'
        spacer.style.pointerEvents = 'none'
        spacer.setAttribute('aria-hidden', 'true')
        pane.appendChild(spacer)
      })
    })

    const labels = ['Home', 'My learning', 'Progress', 'Activity']
    const slugs = ['home', 'learning', 'progress', 'activity']
    for (let index = 0; index < labels.length; index += 1) {
      await clickTabWithoutAutoScroll(page, labels[index])
      const url = new URL(page.url())
      assert.equal(url.searchParams.get('tab'), slugs[index], `${labels[index]} has a stable URL state`)
      assert.equal(url.searchParams.get('source'), 'navigation-test', `${labels[index]} preserves existing parameters`)
      assert.equal(await page.locator('.dash-jump__link.is-active').getAttribute('aria-current'), 'page')
    }
    const history = page.locator('#dash-activity')
    await history.getByText('AI wording check', { exact: true }).waitFor()
    assert.ok(await history.getByText('97% words matched', { exact: true }).isVisible(), 'AI history describes wording only')
    assert.ok(await history.getByText('Memorisation practice', { exact: true }).isVisible(), 'Practice is not presented as validated memorisation')
    assert.ok(await history.getByText('Teacher feedback', { exact: true }).isVisible())
    assert.ok(await history.getByText('Practise the first word slowly.', { exact: true }).isVisible())

    await clickTabWithoutAutoScroll(page, 'Home', 420)
    await clickTabWithoutAutoScroll(page, 'Progress', 420)
    await page.evaluate(() => window.scrollTo(0, 640))
    await clickTabWithoutAutoScroll(page, 'Home', 640)
    const restoredHomeScroll = await page.evaluate(() => window.scrollY)
    assert.ok(Math.abs(restoredHomeScroll - 420) < 12, `Home restores its previous scroll position (${restoredHomeScroll})`)

    await clickTabWithoutAutoScroll(page, 'My learning')
    await clickTabWithoutAutoScroll(page, 'Progress')
    await page.evaluate(() => window.history.back())
    await page.waitForFunction(() => new URL(location.href).searchParams.get('tab') === 'learning')
    assert.match((await page.locator('.dash-jump__link.is-active').innerText()).toLowerCase(), /my learning/)
    await page.evaluate(() => window.history.forward())
    await page.waitForFunction(() => new URL(location.href).searchParams.get('tab') === 'progress')
    assert.match((await page.locator('.dash-jump__link.is-active').innerText()).toLowerCase(), /progress/)

    await page.reload()
    await page.locator('.dash-jump').waitFor()
    assert.equal(new URL(page.url()).searchParams.get('tab'), 'progress', 'Reload preserves the selected tab')
    assert.match((await page.locator('.dash-jump__link.is-active').innerText()).toLowerCase(), /progress/)

    const review = page.getByRole('link', { name: /review ayah/i }).first()
    if (await review.count()) {
      const href = new URL(await review.getAttribute('href'), base)
      assert.ok(Number(href.searchParams.get('surah')) > 0)
      assert.ok(Number(href.searchParams.get('from')) > 0)
      assert.equal(href.searchParams.get('return_tab'), 'progress')
    }

    await clickTabWithoutAutoScroll(page, 'Home')
    await page.locator('.learner-home__skeleton').waitFor({ state: 'hidden' })
    const continueAction = page.locator('[data-testid="dashboard-primary-continue"]')
    if (await continueAction.count()) {
      const href = new URL(await continueAction.getAttribute('href'), base)
      assert.ok(href.pathname.length > 1, 'Continue exposes a concrete destination')
      assert.ok(href.searchParams.has('surah') || href.searchParams.has('session') || href.searchParams.has('panel'))
    }

    const feedbackAction = page.locator('.learner-home__feedback').getByRole('button', { name: /read feedback/i })
    let feedbackOpened = false
    if (await feedbackAction.count()) {
      await feedbackAction.click()
      await page.waitForFunction(() => new URL(location.href).searchParams.get('tab') === 'learning')
      const dialog = page.locator('.learner-task-thread-modal, .dash-student-dialog--thread').first()
      await dialog.waitFor()
      const conversationHeadingSize = await dialog.locator('h2').first().evaluate(element => Number.parseFloat(getComputedStyle(element).fontSize))
      assert.ok(conversationHeadingSize <= 22, 'Conversation heading uses a standard size')
      assert.equal(await page.locator('.dash-jump__link.is-active').innerText(), 'My learning')
      const back = dialog.getByRole('button', { name: /^back$/i })
      assert.equal(await back.count(), 1, 'Feedback conversation exposes a contextual Back action')
      await back.click()
      await dialog.waitFor({ state: 'hidden' })
      feedbackOpened = true
    }

    await clickTabWithoutAutoScroll(page, 'My learning')
    const feedbackTrigger = page.locator('.learner-teacher__feedback-tab-btn')
    let feedbackModalCases = 0
    if (await feedbackTrigger.isVisible()) {
      for (const width of [390, 1440]) {
        await page.setViewportSize({ width, height: 900 })
        for (const theme of ['light', 'dark']) {
          await page.evaluate(value => { document.documentElement.dataset.theme = value }, theme)
          await feedbackTrigger.click()
          const modal = page.getByTestId('learner-feedback-modal')
          await modal.waitFor()
          const layout = await modal.evaluate(element => {
            const panel = element.querySelector('.dash-modal')
            const box = panel.getBoundingClientRect()
            const title = panel.querySelector('h2')
            return {
              left: box.left, right: box.right, top: box.top, bottom: box.bottom,
              overflow: panel.scrollWidth - panel.clientWidth,
              titleSize: Number.parseFloat(getComputedStyle(title).fontSize),
              dialog: element.getAttribute('role'),
              modal: element.getAttribute('aria-modal'),
            }
          })
          assert.equal(layout.dialog, 'dialog')
          assert.equal(layout.modal, 'true')
          assert.ok(layout.left >= 0 && layout.right <= width + 1 && layout.top >= 0 && layout.bottom <= 901, `Feedback modal fits ${width}px ${theme}`)
          assert.ok(Math.abs(layout.left - (width - layout.right)) <= 2, 'Feedback modal is centered')
          assert.ok(layout.overflow <= 1, 'Feedback modal does not overflow horizontally')
          assert.ok(layout.titleSize <= 22, 'Feedback modal heading uses a standard size')
          await page.screenshot({ path: `/private/tmp/mutqin-feedback-modal-${width}-${theme}.png` })
          feedbackModalCases += 1
          await modal.getByRole('button', { name: /close/i }).first().focus()
          await page.keyboard.press('Shift+Tab')
          assert.equal(await modal.locator('.dash-modal').evaluate(element => element.contains(document.activeElement)), true, 'Keyboard focus stays inside feedback modal')
          await page.keyboard.press('Escape')
          await modal.waitFor({ state: 'hidden' })
          assert.equal(await feedbackTrigger.evaluate(element => document.activeElement === element), true, 'Closing feedback restores focus to its trigger')
        }
      }
      await page.setViewportSize({ width: 1440, height: 900 })
      await page.evaluate(() => { document.documentElement.dataset.theme = 'light' })
      await feedbackTrigger.click()
      const feedbackModal = page.getByTestId('learner-feedback-modal')
      await feedbackModal.waitFor()
      const conversationLink = feedbackModal.locator('.learner-teacher__feedback-main-hit').first()
      if (await conversationLink.count()) {
        await conversationLink.click()
        await feedbackModal.waitFor({ state: 'hidden' })
        const conversation = page.locator('.learner-task-thread-modal, .dash-student-dialog--thread').first()
        await conversation.waitFor()
        await page.waitForTimeout(100)
        assert.equal(await conversation.evaluate(element => element.contains(document.activeElement)), true, 'Opening a feedback conversation keeps keyboard focus in the new dialog')
        await conversation.getByRole('button', { name: /^back$/i }).first().click()
        await conversation.waitFor({ state: 'hidden' })
      } else {
        await page.keyboard.press('Escape')
      }
    }
    const assignmentAction = page.locator('.learner-teacher__icon-hit--primary').first()
    if (await assignmentAction.count()) {
      const hrefValue = await assignmentAction.getAttribute('href')
      if (hrefValue) {
        const href = new URL(hrefValue, base)
        assert.ok(Number(href.searchParams.get('surah')) > 0)
        assert.ok(Number(href.searchParams.get('from')) > 0)
        assert.ok(Number(href.searchParams.get('assignment_recipient')) > 0)
        assert.equal(href.searchParams.get('return_tab'), 'learning')
      }
    }

    assert.deepEqual(runtimeErrors, [], 'Navigation interactions produce no runtime errors')
    console.log(JSON.stringify({
      tabs: 4,
      parametersPreserved: true,
      scrollRestored: true,
      backForward: true,
      reloadPreserved: true,
      feedbackOpened,
      feedbackModalCases,
      runtimeErrors: runtimeErrors.length,
    }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
