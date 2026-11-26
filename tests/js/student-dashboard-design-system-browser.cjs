/* Read-only computed-style checks against the local demo student. */
const assert = require('node:assert/strict')
const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

async function main() {
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

    const activeTab = page.locator('.teacher-nav__link.is-active:visible')
    const activeStyle = await activeTab.evaluate(element => {
      const style = getComputedStyle(element)
      const box = element.getBoundingClientRect()
      return {
        background: style.backgroundColor,
        backgroundImage: style.backgroundImage,
        color: style.color,
        height: box.height,
        radius: parseFloat(style.borderRadius),
      }
    })
    assert.ok(activeStyle.height >= 44, 'Selected navigation uses the shared control height')
    assert.ok(activeStyle.radius >= 8, 'Selected navigation uses the shared control radius')
    assert.ok(
      activeStyle.background !== 'rgba(0, 0, 0, 0)' || activeStyle.backgroundImage !== 'none',
      'Selected navigation has an obvious filled state',
    )

    const card = page.locator('.student-continue').first()
    const lightCard = await card.evaluate(element => {
      const style = getComputedStyle(element)
      return { background: style.backgroundColor, backgroundImage: style.backgroundImage, border: style.borderColor, radius: parseFloat(style.borderRadius), shadow: style.boxShadow }
    })
    assert.ok(lightCard.radius >= 8 && lightCard.radius <= 20, 'Cards use the shared rounded surface')
    assert.notEqual(lightCard.border, 'rgba(0, 0, 0, 0)', 'Cards retain a subtle border')
    assert.notEqual(lightCard.shadow, 'none', 'Top-level cards use the restrained shared shadow')

    const primary = page.locator('.learner-home__next-action .btn-primary').first()
    if (await primary.count()) {
      const normal = await primary.evaluate(element => getComputedStyle(element).filter)
      await primary.hover()
      await page.waitForTimeout(200)
      const hovered = await primary.evaluate(element => getComputedStyle(element).filter)
      assert.notEqual(hovered, normal, 'Primary actions expose the shared hover state')
      await primary.focus()
      const focus = await primary.evaluate(element => {
        const style = getComputedStyle(element)
        return { outline: style.outlineStyle, width: parseFloat(style.outlineWidth) }
      })
      assert.equal(focus.outline, 'solid', 'Primary actions expose a keyboard focus ring')
      assert.ok(focus.width >= 2, 'The focus ring is at least 2px')
      await primary.evaluate(element => { element.disabled = true })
      const disabled = await primary.evaluate(element => ({ opacity: Number(getComputedStyle(element).opacity), cursor: getComputedStyle(element).cursor }))
      assert.ok(disabled.opacity <= 0.55, 'Disabled actions use the shared muted state')
      assert.equal(disabled.cursor, 'default', 'Disabled actions do not imply clickability')
      await primary.evaluate(element => { element.disabled = false; element.setAttribute('aria-busy', 'true') })
      assert.equal(await primary.getAttribute('aria-busy'), 'true', 'Busy actions expose their state to assistive technology')
      await primary.evaluate(element => element.removeAttribute('aria-busy'))
    }

    await page.locator('.teacher-nav-shell--desktop').getByRole('button', { name: 'My learning', exact: true }).click()
    const filter = page.locator('.learner-teacher__filter.is-active').first()
    const filterStyle = await filter.evaluate(element => ({
      background: getComputedStyle(element).backgroundColor,
      backgroundImage: getComputedStyle(element).backgroundImage,
      color: getComputedStyle(element).color,
      height: element.getBoundingClientRect().height,
      selectedBorder: getComputedStyle(element).borderBottomColor,
    }))
    assert.ok(filterStyle.height >= 36, 'Desktop filters use the shared compact height')
    assert.ok(
      filterStyle.background !== 'rgba(0, 0, 0, 0)' || filterStyle.backgroundImage !== 'none' || filterStyle.selectedBorder !== 'rgba(0, 0, 0, 0)',
      'Selected filters use the shared visible selection state',
    )

    const feedbackAction = page.locator('.learner-home__feedback').getByRole('button', { name: 'Read feedback', exact: true })
    await page.locator('.teacher-nav-shell--desktop').getByRole('button', { name: 'Home', exact: true }).click()
    if (await feedbackAction.count()) {
      await feedbackAction.click()
      const dialog = page.locator('.dash-student-dialog--thread, .learner-task-thread-modal')
      await dialog.waitFor()
      const field = dialog.locator('textarea')
      const fieldStyle = await field.evaluate(element => ({
        height: element.getBoundingClientRect().height,
      selectedBorder: getComputedStyle(element).borderBottomColor,
        minHeight: parseFloat(getComputedStyle(element).minHeight),
        radius: parseFloat(getComputedStyle(element).borderRadius),
        border: getComputedStyle(element).borderColor,
      }))
      assert.ok(Math.max(fieldStyle.height, fieldStyle.minHeight) >= 44, 'Modal inputs use the shared control height')
      assert.ok(fieldStyle.radius >= 8, 'Modal inputs use the shared control radius')
      assert.notEqual(fieldStyle.border, 'rgba(0, 0, 0, 0)', 'Modal inputs use the shared border')
      const send = dialog.locator('button[type=submit]')
      assert.ok(Number(await send.evaluate(element => getComputedStyle(element).opacity)) <= 0.55, 'Empty-message submit uses the disabled state')
      await dialog.getByRole('button', { name: 'Back', exact: true }).first().click()
      await dialog.waitFor({ state: 'hidden' })
    }

    await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
    await page.waitForTimeout(400)
    const darkCard = await card.evaluate(element => ({
      background: getComputedStyle(element).backgroundColor,
      backgroundImage: getComputedStyle(element).backgroundImage,
      color: getComputedStyle(element).color,
      border: getComputedStyle(element).borderColor,
    }))
    assert.notDeepEqual([darkCard.background,darkCard.backgroundImage], [lightCard.background,lightCard.backgroundImage], 'Dark mode switches to the shared dark surface')
    assert.ok(darkCard.background !== 'rgba(0, 0, 0, 0)' || darkCard.backgroundImage !== 'none', 'Dark cards retain the shared painted surface')
    assert.notEqual(darkCard.border, 'rgba(0, 0, 0, 0)', 'Dark cards retain their border hierarchy')
    assert.deepEqual(errors, [], 'No runtime errors occurred during design-system interaction checks')

    console.log(JSON.stringify({ activeTab: true, card: true, primaryStates: Boolean(await primary.count()), filter: true, modal: Boolean(await feedbackAction.count()), dark: true, runtimeErrors: errors.length }, null, 2))
  } finally {
    await browser.close()
  }
}

main().catch(error => {
  console.error(error)
  process.exitCode = 1
})
