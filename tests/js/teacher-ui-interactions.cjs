const { chromium } = require('playwright')

const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'

async function main() {
  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 360, height: 780 } })
  await page.goto(`${base}/login`, { waitUntil: 'domcontentloaded' })
  await page.locator('input[type=email]').fill('org.demo.halaqa.teacher@example.com')
  await page.locator('input[type=password]').fill('OrganisationDemo1!')
  await page.getByRole('button', { name: /login/i }).click()
  await page.waitForURL('**/teacher')
  await page.locator('.teacher-dashboard').waitFor()

  const nav = page.locator('.teacher-nav-shell--mobile')
  await nav.getByRole('button', { name: 'Students', exact: true }).click()
  await page.locator('.teacher-loading-inline').waitFor({ state: 'hidden' })
  const studentCard = page.locator('.teacher-student-card__main').first()
  const studentRow = page.locator('.teacher-table__row').first()
  await (await studentCard.isVisible() ? studentCard : studentRow).click()
  await page.locator('.teacher-profile-hero').waitFor()
  await page.locator('.teacher-profile-hero__report-button').click()
  await page.locator('.teacher-report__paper').waitFor()
  if (await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth)) throw new Error('Report caused horizontal page overflow')
  await page.locator('.teacher-report__toolbar .btn-outline-secondary').click()
  const tabs = page.locator('[role=tablist] [role=tab]')
  const tabResults = []
  for (let index = 0; index < await tabs.count(); index++) {
    await tabs.nth(index).click()
    await page.waitForTimeout(180)
    tabResults.push({
      name: (await tabs.nth(index).innerText()).trim(),
      selected: await tabs.nth(index).getAttribute('aria-selected'),
      overflow: await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth),
      panel: await page.locator('[role=tabpanel]').count(),
      overlapsNext: await tabs.nth(index).evaluate((tab) => {
        const next = tab.nextElementSibling
        return next ? tab.getBoundingClientRect().right > next.getBoundingClientRect().left + 1 : false
      }),
    })
    if (['Practice', 'Recite'].includes(tabResults[tabResults.length - 1].name)) {
      await page.screenshot({ path: `/private/tmp/mutqin-profile-${tabResults[tabResults.length - 1].name.toLowerCase()}-360-sepia.png`, fullPage: false })
      if (tabResults[tabResults.length - 1].name === 'Recite') {
        if (await page.locator('.teacher-history-group').first().getAttribute('open') === null) {
          throw new Error('The newest Recite group should be open by default')
        }
        const before = await page.locator('.teacher-records__item').count()
        await page.locator('.teacher-more').click()
        const after = await page.locator('.teacher-records__item').count()
        if (before !== 5 || after !== 6) throw new Error(`Recite load more failed: ${before} → ${after}`)
      }
    }
  }
  await page.reload({ waitUntil: 'domcontentloaded' })
  await page.locator('[role=tab][aria-selected=true]').filter({ hasText: 'Messages' }).waitFor()
  await page.goBack({ waitUntil: 'domcontentloaded' })
  await page.locator('[role=tab][aria-selected=true]').filter({ hasText: 'Tasks' }).waitFor()
  await page.goForward({ waitUntil: 'domcontentloaded' })
  await page.locator('[role=tab][aria-selected=true]').filter({ hasText: 'Messages' }).waitFor()
  await page.screenshot({ path: '/private/tmp/mutqin-profile-360-sepia.png', fullPage: false })

  const profileMatrix = []
  for (const width of [360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'sepia', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      for (let index = 0; index < await tabs.count(); index++) {
        await tabs.nth(index).click()
        await page.locator('[role=tabpanel]').waitFor()
        await page.waitForTimeout(60)
        const layout = await page.evaluate(() => ({
          overflow: document.documentElement.scrollWidth - window.innerWidth,
          active: document.querySelectorAll('[role=tab][aria-selected=true]').length,
          tabOutside: [...document.querySelectorAll('[role=tab]')].some((tab) => {
            const box = tab.getBoundingClientRect()
            const strip = tab.closest('[role=tablist]').getBoundingClientRect()
            return box.top < strip.top - 1 || box.bottom > strip.bottom + 1
          }),
          activeClipped: (() => {
            const tab = document.querySelector('[role=tab][aria-selected=true]')
            const strip = tab?.closest('[role=tablist]')
            if (!tab || !strip) return true
            const target = tab.getBoundingClientRect()
            const bounds = strip.getBoundingClientRect()
            return target.left < bounds.left - 1 || target.right > bounds.right + 1
          })(),
          activeBounds: (() => {
            const tab = document.querySelector('[role=tab][aria-selected=true]')
            const strip = tab?.closest('[role=tablist]')
            return tab && strip ? { tabLeft: tab.getBoundingClientRect().left, tabRight: tab.getBoundingClientRect().right, stripLeft: strip.getBoundingClientRect().left, stripRight: strip.getBoundingClientRect().right, scrollLeft: strip.scrollLeft } : null
          })(),
        }))
        if (layout.overflow > 0 || layout.active !== 1 || layout.tabOutside || layout.activeClipped) {
          throw new Error(`Profile ${width}px ${theme} tab ${index}: ${JSON.stringify(layout)}`)
        }
      }
      profileMatrix.push({ width, theme, tabs: await tabs.count() })
      if ([390, 1440].includes(width)) await page.screenshot({ path: `/private/tmp/mutqin-profile-${width}-${theme}.png`, fullPage: false })
    }
  }
  await page.setViewportSize({ width: 360, height: 780 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'sepia' })

  await page.goto(`${base}/teacher`, { waitUntil: 'domcontentloaded' })
  await page.locator('.teacher-dashboard').waitFor()
  await page.locator('.teacher-nav-shell--mobile').getByRole('button', { name: 'Tasks', exact: true }).click()
  await page.locator('.teacher-toolbar--tasks').waitFor({ state: 'visible' })
  await page.waitForTimeout(500)
  const taskRowOverlap = await page.locator('.teacher-task-row').first().evaluate((row) => {
    const copy = row.querySelector('.teacher-task-row__copy')?.getBoundingClientRect()
    const aside = row.querySelector('.teacher-task-row__aside')?.getBoundingClientRect()
    return copy && aside ? copy.bottom > aside.top + 1 : false
  })
  const trigger = page.locator('.teacher-task-add')
  await trigger.click()
  await page.locator('.teacher-task-modal').waitFor()
  const studentPicker = page.locator('.teacher-task-modal__student-picker input')
  const studentOptionsInitiallyClosed = await studentPicker.getAttribute('aria-expanded') === 'false'
  await studentPicker.fill('Fatima')
  await page.getByRole('option', { name: 'Fatima Noor' }).click()
  const searchableStudentSelected = await studentPicker.inputValue() === 'Fatima Noor'
  const unwantedModalDetailsAbsent = await page.locator('.teacher-task-modal__ayah-count, .teacher-task-modal__surah-arabic').count() === 0
  const modal = await page.evaluate(() => {
    const dialog = document.querySelector('.teacher-task-modal__content')?.getBoundingClientRect()
    const content = document.querySelector('.teacher-task-modal__content')
    const root = document.querySelector('.teacher-task-modal')
    const header = document.querySelector('.teacher-task-modal__header')
    const intro = document.querySelector('.teacher-task-modal__intro')
    const close = document.querySelector('.teacher-task-modal__close')
    const backdrop = document.querySelector('.teacher-task-backdrop')
    const footer = document.querySelector('.teacher-task-modal__footer')?.getBoundingClientRect()
    const due = document.querySelector('.teacher-task-modal input[type=date]')?.getBoundingClientRect()
    return {
      dialog: dialog && { left: dialog.left, right: dialog.right, top: dialog.top, bottom: dialog.bottom },
      footer: footer && { top: footer.top, bottom: footer.bottom },
      due: due && { left: due.left, right: due.right },
      focused: document.activeElement?.id,
      overflow: document.documentElement.scrollWidth - window.innerWidth,
      styles: {
        contentBackground: content && getComputedStyle(content).backgroundColor,
        contentOpacity: content && getComputedStyle(content).opacity,
        rootOpacity: root && getComputedStyle(root).opacity,
        rootZ: root && getComputedStyle(root).zIndex,
        headerBackground: header && getComputedStyle(header).backgroundColor,
        backdropZ: backdrop && getComputedStyle(backdrop).zIndex,
        backdropOpacity: backdrop && getComputedStyle(backdrop).opacity,
        headerDisplay: header && getComputedStyle(header).display,
        headerDirection: header && getComputedStyle(header).flexDirection,
        headerWrap: header && getComputedStyle(header).flexWrap,
        headerRect: header && { width: header.getBoundingClientRect().width, height: header.getBoundingClientRect().height },
        introRect: intro && { width: intro.getBoundingClientRect().width, height: intro.getBoundingClientRect().height },
        closeRect: close && { x: close.getBoundingClientRect().x, y: close.getBoundingClientRect().y },
      },
    }
  })
  await page.screenshot({ path: '/private/tmp/mutqin-task-modal-360-sepia.png', fullPage: false })
  for (const theme of ['light', 'dark']) {
    await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
    await page.waitForTimeout(400)
    await page.screenshot({ path: `/private/tmp/mutqin-task-modal-360-${theme}.png`, fullPage: false })
  }
  const darkModalColors = await page.evaluate(() => ({
    content: getComputedStyle(document.querySelector('.teacher-task-modal__content')).backgroundColor,
    body: getComputedStyle(document.querySelector('.teacher-task-modal__body')).backgroundColor,
    root: getComputedStyle(document.querySelector('.teacher-task-modal')).getPropertyValue('--dash-card-bg'),
  }))
  const modalMatrix = []
  for (const width of [360, 375, 390, 430, 768, 1024, 1440]) {
    await page.setViewportSize({ width, height: 900 })
    for (const theme of ['light', 'sepia', 'dark']) {
      await page.evaluate((value) => { document.documentElement.dataset.theme = value }, theme)
      await page.waitForTimeout(60)
      const bounds = await page.evaluate(() => {
        const content = document.querySelector('.teacher-task-modal__content').getBoundingClientRect()
        const footer = document.querySelector('.teacher-task-modal__footer').getBoundingClientRect()
        return { left: content.left, right: content.right, top: content.top, bottom: content.bottom, footerBottom: footer.bottom, overflow: document.documentElement.scrollWidth - innerWidth }
      })
      if (bounds.left < 0 || bounds.right > width + 1 || bounds.top < 0 || bounds.bottom > 901 || bounds.footerBottom > 901 || bounds.overflow > 0) {
        throw new Error(`Modal ${width}px ${theme}: ${JSON.stringify(bounds)}`)
      }
      modalMatrix.push({ width, theme })
      if ([390, 1440].includes(width)) await page.screenshot({ path: `/private/tmp/mutqin-task-modal-${width}-${theme}.png`, fullPage: false })
    }
  }
  await page.setViewportSize({ width: 360, height: 780 })
  await page.evaluate(() => { document.documentElement.dataset.theme = 'dark' })
  await page.keyboard.press('Escape')
  const escaped = await page.locator('.teacher-task-modal').count() === 0
  await trigger.focus()
  await page.keyboard.press('Enter')
  await page.locator('.teacher-task-modal').waitFor()
  await page.keyboard.press('Shift+Tab')
  const focusTrapped = await page.evaluate(() => document.querySelector('.teacher-task-modal')?.contains(document.activeElement) === true)
  await page.keyboard.press('Escape')
  const density = page.locator('.teacher-assignments .teacher-density-toggle')
  const densityBefore = await density.innerText()
  await density.click()
  const densityAfter = await density.innerText()
  const densityChangesLabel = densityBefore !== densityAfter
  await page.locator('.teacher-task-row__message').first().click()
  await page.locator('.teacher-message-modal').waitFor()
  await page.screenshot({ path: '/private/tmp/mutqin-conversation-360-dark.png', fullPage: false })
  const conversation = await page.evaluate(() => {
    const box = document.querySelector('.teacher-message-modal__content').getBoundingClientRect()
    return { width: box.width, height: box.height, viewportWidth: innerWidth, viewportHeight: innerHeight, overflow: document.documentElement.scrollWidth - innerWidth }
  })
  await page.setViewportSize({ width: 1440, height: 900 })
  await page.screenshot({ path: '/private/tmp/mutqin-conversation-1440-dark.png', fullPage: false })
  const desktopConversationHeight = await page.locator('.teacher-message-modal__content').evaluate((element) => element.getBoundingClientRect().height)
  await page.keyboard.press('Escape')
  console.log(JSON.stringify({ tabResults, profileMatrix, modalMatrix, modal, darkModalColors, taskRowOverlap, studentOptionsInitiallyClosed, searchableStudentSelected, unwantedModalDetailsAbsent, densityChangesLabel, conversation, desktopConversationHeight, escaped, keyboardOpen: true, focusTrapped }, null, 2))
  if (!escaped || taskRowOverlap || !studentOptionsInitiallyClosed || !searchableStudentSelected || !unwantedModalDetailsAbsent || !densityChangesLabel || conversation.width > conversation.viewportWidth || conversation.height > conversation.viewportHeight * .9 || conversation.overflow > 0 || desktopConversationHeight > 680 || modal.overflow > 0 || modal.dialog.left < 0 || modal.dialog.right > 360 || modal.footer.bottom > 780
    || modal.styles.contentOpacity !== '1' || modal.styles.headerBackground === 'rgba(0, 0, 0, 0)'
    || darkModalColors.body !== darkModalColors.content || !darkModalColors.body.startsWith('rgb(')
    || !focusTrapped || tabResults.some((result) => result.selected !== 'true' || result.overflow > 0 || result.panel !== 1 || result.overlapsNext)) process.exitCode = 1
  await browser.close()
}

main().catch((error) => { console.error(error); process.exit(1) })
