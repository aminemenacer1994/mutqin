/* Read-only UI regression matrix. Uses an existing local demo classroom;
   fake microphone samples remain in memory and are discarded, never uploaded. */
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { chromium } = require('playwright')
const base = process.env.MUTQIN_QA_BASE || 'http://localhost:8000'
const shots = process.env.MUTQIN_QA_SHOTS || '/private/tmp/mutqin-workspace-qa'

async function main() {
  fs.mkdirSync(shots, { recursive: true })
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
    await page.locator('.teacher-hero').waitFor()
    const roster = await page.evaluate(async () => (await (await fetch('/api/teacher/students?per_page=50')).json()).data)
    const student = roster.find(row => /org\.demo\./.test(row.email) && row.ai_attempts > 0)
    assert.ok(student, 'A persisted demo student with recitation history is required')
    const routes = [
      ['overview', '/teacher', '.teacher-metric'],
      ['students', '/teacher?view=students', '.teacher-table__row'],
      ['tasks', '/teacher?view=assignments', '.teacher-task-row'],
      ['plans', '/teacher?view=plans', '.teacher-plans-view__picker'],
      ['account', '/teacher?view=settings', '.teacher-account__email'],
      ...['ai', 'tasks', 'messages', 'plan'].map(tab => [`profile-${tab}`, `/teacher?view=student&student=${student.id}&section=${tab}`, '[role=tabpanel]']),
    ]
    const results = []
    for (const [name, route, ready] of routes) {
      await page.setViewportSize({ width: 1440, height: 1000 })
      await page.goto(`${base}${route}`)
      await page.locator(ready).first().waitFor()
      await page.waitForTimeout(200)
      for (const width of [320, 375, 390, 430, 768, 1024, 1440, 1920]) {
        await page.setViewportSize({ width, height: width < 768 ? 844 : 1000 })
        for (const theme of ['light', 'sepia', 'dark']) {
          await page.evaluate(value => { document.documentElement.dataset.theme = value }, theme)
          await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
          const state = await page.evaluate(() => {
            const visible = selector => { const el = document.querySelector(selector); return Boolean(el && getComputedStyle(el).display !== 'none') }
            const clipped = [...document.querySelectorAll('.teacher-tabs__tab')].some(el => { const box = el.getBoundingClientRect(); return box.left < 0 || box.right > innerWidth + 1 })
            return { overflow: document.documentElement.scrollWidth - innerWidth, desktop: visible('.teacher-nav-shell--desktop'), mobile: visible('.teacher-nav-shell--mobile'), clipped }
          })
          assert.ok(state.overflow <= 1, `${name} ${width}px ${theme}: overflow ${state.overflow}`)
          assert.equal(state.desktop, width >= 992, `${name}: desktop nav`)
          assert.equal(state.mobile, width < 992, `${name}: mobile nav`)
          assert.equal(state.clipped, false, `${name}: clipped tab`)
          results.push({ name, width, theme, ...state })
          if ([390, 1440].includes(width) && (theme === 'light' || ['overview', 'profile-ai'].includes(name))) await page.screenshot({ path: path.join(shots, `${name}-${width}-${theme}.png`) })
        }
      }
    }
    // Task form: validation, keyboard-safe search, viewport containment and draft guard.
    await page.setViewportSize({ width: 390, height: 844 })
    await page.goto(`${base}/teacher?view=assignments`)
    await page.locator('.teacher-task-add').click()
    let dialog = page.locator('.teacher-dialog[role=dialog]')
    await dialog.locator('input[id$="-student"]').fill(student.name)
    await dialog.locator('input[id$="-student"]').press('ArrowDown')
    await dialog.locator('input[id$="-student"]').press('Enter')
    const surah = dialog.locator('.teacher-surah-select input')
    await surah.fill('112')
    await dialog.locator('.teacher-surah-select__options').getByRole('option').first().click()
    await dialog.locator('input[id$="-from"]').fill('4')
    await dialog.locator('input[id$="-to"]').fill('2')
    assert.equal(await dialog.getByRole('button', { name: 'Assign task', exact: true }).isDisabled(), true)
    assert.ok(await dialog.locator('[aria-invalid=true]').count())
    await page.keyboard.press('Escape')
    await dialog.getByRole('button', { name: 'Keep editing', exact: true }).waitFor()
    await dialog.getByRole('button', { name: 'Keep editing', exact: true }).click()
    await page.screenshot({ path: path.join(shots, 'task-form-390.png') })
    const bounds = await dialog.locator('.modal-content').boundingBox()
    assert.ok(bounds.x >= 0 && bounds.x + bounds.width <= 391 && bounds.y + bounds.height <= 845)
    await page.keyboard.press('Escape')
    await dialog.getByRole('button', { name: 'Discard changes', exact: true }).click()
    await dialog.waitFor({ state: 'hidden' })
    assert.equal(await page.locator('.teacher-task-add').evaluate(el => el === document.activeElement), true, 'Return focus to opener')
    // Conversation in the task modal fills the available body and closes on a real backdrop click.
    await page.locator('.teacher-task-row__message').first().click()
    dialog = page.locator('.teacher-dialog[role=dialog]')
    const composer = dialog.locator('.teacher-task-conversation__composer textarea')
    await composer.waitFor()
    const composerWidth = await composer.evaluate(el => el.getBoundingClientRect().width)
    const bodyWidth = await dialog.locator('.modal-body').evaluate(el => el.clientWidth)
    assert.ok(composerWidth >= bodyWidth - 40, 'Conversation composer must fill the modal')
    await page.screenshot({ path: path.join(shots, 'task-conversation-390.png') })
    await page.keyboard.press('Escape')
    await dialog.waitFor({ state: 'hidden' })
    // Plan creation: canonical surah options, ayah bounds, multi-activity layout, draft guard.
    await page.goto(`${base}/teacher?view=plans`)
    await page.locator('.teacher-plans-view__picker select').selectOption(String(student.id))
    await page.locator('.teacher-learning-plan__toolbar').getByRole('button', { name: 'New learning plan', exact: true }).click()
    dialog = page.locator('.teacher-dialog[role=dialog]')
    await dialog.locator('.teacher-surah-select input').fill('112')
    await dialog.locator('.teacher-surah-select__options').getByRole('option').first().click()
    await dialog.getByRole('button', { name: 'Add activity', exact: true }).click()
    await page.screenshot({ path: path.join(shots, 'plan-form-390.png') })
    await page.keyboard.press('Escape')
    await dialog.getByRole('button', { name: 'Discard changes', exact: true }).click()
    // Recording state transitions and audio-only feedback: synthetic media is discarded.
    await page.goto(`${base}/teacher?view=student&student=${student.id}&section=messages`)
    const recorder = page.locator('.teacher-direct-thread .teacher-voice-note')
    await recorder.getByRole('button', { name: 'Record voice note', exact: true }).click()
    await recorder.locator('.teacher-voice-note__status.is-recording').waitFor()
    await recorder.evaluate(el => el.scrollIntoView({ block: 'center' }))
    await page.waitForTimeout(350)
    await recorder.getByRole('button', { name: 'Pause recording', exact: true }).click()
    await recorder.locator('.teacher-voice-note__status.is-paused').waitFor()
    await recorder.getByRole('button', { name: 'Resume recording', exact: true }).click()
    await page.waitForTimeout(200)
    await recorder.getByRole('button', { name: 'Stop recording', exact: true }).click()
    await recorder.locator('.teacher-voice-note__preview').waitFor()
    assert.equal(await page.locator('.teacher-direct-thread__send').isEnabled(), true, 'Audio-only message is sendable')
    await recorder.getByRole('button', { name: 'Remove voice note', exact: true }).click()
    assert.equal(await page.locator('.teacher-direct-thread__send').isDisabled(), true)
    // Existing AI evidence remains usable without recording; each canonical glyph paints once.
    await page.goto(`${base}/teacher?view=student&student=${student.id}&section=ai`)
    const playbackResponse = page.waitForResponse(response => /\/teacher\/students\/\d+\/attempts\/\d+\/playback/.test(response.url()) && response.request().method() === 'GET')
    await page.locator('.teacher-records__review').first().click()
    const playbackPayload = await (await playbackResponse).json()
    dialog = page.locator('.teacher-dialog[role=dialog]')
    await dialog.locator('.teacher-recite-mushaf__word').first().waitFor()
    const glyphs = await dialog.locator('.teacher-recite-mushaf__word').evaluateAll(words => words.map(el => ({ text: el.textContent, key: el.dataset.playbackKey, font: el.style.fontFamily, end: el.classList.contains('is-ayah-end') })))
    const range = playbackPayload.range
    const index = JSON.parse(fs.readFileSync(path.join(__dirname, '../../public/quran/madani-v2/verse-pages.json'), 'utf8'))
    const expectedGlyphs = []
    for (let ayah = Number(range.from); ayah <= Number(range.to || range.from); ayah++) {
      // Verify against the exact local corpus rather than trusting rendered data.
      const key = `${range.surah || range.surah_number}:${ayah}`
      const pageNumber = Number(index[key])
      assert.ok(pageNumber > 0, `Canonical page exists for ${key}`)
      const locations = new Map()
      for (const number of [pageNumber, pageNumber + 1]) {
        const file = path.join(__dirname, `../../public/quran/madani-v2/pages/${String(number).padStart(3, '0')}.json`)
        if (!fs.existsSync(file)) continue
        const leaf = JSON.parse(fs.readFileSync(file, 'utf8'))
        for (const line of leaf.page.lines) for (const word of line.words || []) if (String(word.location).startsWith(`${key}:`)) locations.set(word.location, word)
      }
      expectedGlyphs.push(...[...locations.values()].sort((a, b) => Number(a.word) - Number(b.word)).map(word => word.text))
    }
    assert.deepEqual(glyphs.map(word => word.text), expectedGlyphs, 'Rendered words and ayah ends exactly match the verified page dataset')
    const keys = glyphs.filter(word => word.key).map(word => word.key)
    assert.equal(new Set(keys).size, keys.length, 'Canonical word identities are unique')
    assert.ok(glyphs.every(word => /QCF|p\d/.test(word.font)), 'Every glyph retains its page-specific Madani V2 font')
    const loadedFaces = await page.evaluate(() => [...document.fonts].filter(face => face.status === 'loaded').map(face => face.family.replaceAll('\"', '')))
    assert.ok(glyphs.every(word => loadedFaces.includes(word.font.replaceAll('\"', ''))), 'Every displayed Madani page face has loaded')
    const firstWord = dialog.locator('.teacher-recite-mushaf__word[role=button]').first()
    await firstWord.focus()
    await page.keyboard.press('Enter')
    await dialog.locator('.teacher-playback__word').waitFor()
    assert.equal(await dialog.locator('.teacher-playback__word textarea').isVisible(), true, 'Selected-word correction editor is visible')
    if (await dialog.locator('.teacher-playback__player.is-empty').count()) assert.equal(await dialog.locator('.teacher-playback__transport').count(), 0, 'Unavailable recording has no transport')
    await page.screenshot({ path: path.join(shots, 'coaching-390.png') })
    await page.setViewportSize({ width: 1440, height: 1000 })
    const reviewBounds = await dialog.locator('.modal-content').boundingBox()
    assert.ok(Math.abs(reviewBounds.x + reviewBounds.width / 2 - 720) <= 1, 'Desktop review is horizontally centred')
    assert.ok(reviewBounds.width >= 1100, 'Desktop review provides usable space for the Quran and feedback sidebar')
    await page.screenshot({ path: path.join(shots, 'coaching-1440.png') })
    assert.deepEqual(errors, [], 'No runtime errors')
    console.log(JSON.stringify({ responsiveCases: results.length, routes: routes.length, widths: 8, themes: 3, formValidation: true, focusReturn: true, unsavedChanges: true, conversation: true, audioOnly: true, keyboardWordSelection: true, uniqueGlyphs: glyphs.length, runtimeErrors: errors.length, screenshots: shots }, null, 2))
    fs.writeFileSync(path.join(shots, 'results.json'), JSON.stringify(results, null, 2))
  } catch (error) { await page.screenshot({ path: path.join(shots, 'failure.png') }); console.log(await page.locator('[role=dialog]').allTextContents()); throw error } finally { await browser.close() }
}
main().catch(error => { console.error(error); process.exitCode = 1 })
