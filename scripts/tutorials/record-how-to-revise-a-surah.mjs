#!/usr/bin/env node
/**
 * Rehearse or record the product tutorial: "How to revise a surah".
 *
 * Usage:
 *   node scripts/tutorials/record-how-to-revise-a-surah.mjs --rehearse
 *   node scripts/tutorials/record-how-to-revise-a-surah.mjs --record
 *
 * Env: MUTQIN_BASE_URL, MUTQIN_TEST_EMAIL, MUTQIN_TEST_PASSWORD
 */
import { execFileSync } from 'node:child_process'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DEFAULT_BASE_URL,
  VIEWPORT,
  dismissOverlays,
  endLiveSession,
  focusAndClick,
  injectTutorialChrome,
  launchBrowser,
  prepareReviserAccount,
  showTutorialCaption,
  startFreshWorkspaceSession,
  waitForAppSettled,
} from './lib/session.mjs'
import { postprocessTutorialVideo, projectTutorialPaths } from './lib/postprocess.mjs'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const SLUG = 'how-to-revise-a-surah'
const paths = projectTutorialPaths(root, SLUG)

function probeVideoSeconds(file) {
  try {
    const raw = execFileSync(
      'ffprobe',
      ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=noprint_wrappers=1:nokey=1', file],
      { encoding: 'utf8' },
    ).trim()
    const duration = Number(raw)
    return Number.isFinite(duration) ? duration : 60
  } catch {
    return 60
  }
}

const RECORD = process.argv.includes('--record')
const REHEARSE = process.argv.includes('--rehearse') || !RECORD

async function caption(page, text, holdMs = 2_600) {
  if (!RECORD) return
  await showTutorialCaption(page, text, holdMs)
}

async function openSessionSetup(page, baseUrl) {
  await page.goto(`${baseUrl}/memorisation?setup=1&goal=revise`, { waitUntil: 'domcontentloaded' })
  await waitForAppSettled(page, 2_500)
  await dismissOverlays(page)
  await startFreshWorkspaceSession(page)
  await endLiveSession(page)
  await dismissOverlays(page)

  const resumeHeader = page.locator('.session-primary-action').filter({ hasText: /^Resume$/ })
  const changeSet = page.locator('button').filter({ hasText: /^Change set$/i })
  const toolsOpen = await page.locator('#memorisationToolsPanel.open').count()
  if (await resumeHeader.count()) {
    if (await changeSet.count()) {
      await focusAndClick(page, changeSet.first())
    } else {
      const startNew = page.getByRole('button', { name: /start new session/i })
      if (await startNew.count()) await startNew.click()
    }
    await waitForAppSettled(page, 900)
  }

  if (!(await page.locator('.session-goal__option').count()) && !toolsOpen) {
    await focusAndClick(page, page.locator('.top-card-controls-trigger'))
    await waitForAppSettled(page, 900)
  }

  await page.locator('.session-goal__option').filter({ hasText: 'Revise' }).waitFor({ timeout: 15_000 })
}

async function configureRevisionRange(page) {
  const reviseGoal = page.locator('.session-goal__option').filter({ hasText: 'Revise' })
  await focusAndClick(page, reviseGoal)

  const surahSelect = page.locator('[data-tour="setup-surah"] select')
  await surahSelect.waitFor({ state: 'visible', timeout: 10_000 })
  await focusAndClick(page, surahSelect, { pauseMs: 280 })
  await surahSelect.selectOption({ value: '112' })
  await surahSelect.evaluate((el) => {
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
  })
  await page.waitForFunction(() => {
    const select = document.querySelector('[data-tour="setup-surah"] select')
    return select && String(select.value) === '112'
  })
  await page.getByText('Al-Ikhlas', { exact: false }).first().waitFor({ timeout: 12_000 })
  await waitForAppSettled(page, 900)

  await page.locator('.session-range-preset__option').filter({ hasText: 'Choose ayahs' }).click()
  const fullSurah = page.locator('.session-full-surah')
  await focusAndClick(page, fullSurah)
  await page.getByText(/Ayahs?\s*1.*4|Ayah range:.*1.*4/i).first().waitFor({ timeout: 8_000 }).catch(() => {})
  await waitForAppSettled(page, 500)
}

async function startRevisionSession(page) {
  const startBtn = page.locator('[data-tour="start-session"]')
  await startBtn.waitFor({ state: 'visible', timeout: 10_000 })
  const selectedSurah = await page.locator('[data-tour="setup-surah"] select').inputValue()
  if (selectedSurah !== '112') {
    throw new Error(`Expected surah 112 before start, got ${selectedSurah}`)
  }
  await focusAndClick(page, startBtn, { pauseMs: 650 })
  await page.getByText('Al-Ikhlas', { exact: false }).first().waitFor({ timeout: 25_000 })
  await page.locator('#memorisationToolsPanel.open').waitFor({ state: 'hidden', timeout: 20_000 }).catch(() => {})
  await page.locator('.workspace-shell, [data-testid="workspace-bottom-stop"]').first().waitFor({
    timeout: 25_000,
  })
  await waitForAppSettled(page, 2_800)
}

async function runJourney(page, baseUrl) {
  await page.goto(`${baseUrl}/dashboard`, { waitUntil: 'domcontentloaded' })
  await waitForAppSettled(page, 1_800)
  await dismissOverlays(page)

  const murajaah = page.locator('.dash-murajaah, [class*="murajaah"]').first()
  if (await murajaah.count()) {
    await murajaah.scrollIntoViewIfNeeded()
  }
  await caption(page, 'Your dashboard shows what needs muraja\'ah')

  await caption(page, 'Open Memorise to revise a full surah', 2_200)
  await focusAndClick(page, page.getByRole('link', { name: /^memorise$/i }))
  await waitForAppSettled(page, 1_600)
  await dismissOverlays(page)
  await startFreshWorkspaceSession(page)
  await endLiveSession(page)
  await dismissOverlays(page)

  await caption(page, 'Open session setup', 2_000)
  await openSessionSetup(page, baseUrl)

  await caption(page, 'Choose Revise — for ayahs you already know', 2_200)
  await configureRevisionRange(page)

  await caption(page, 'Pick the surah and full range', 1_800)
  await caption(page, 'Tap Revise to start', 1_600)
  await startRevisionSession(page)

  await caption(page, 'Listen and recite from memory in the mushaf', 2_800)
  await page.waitForTimeout(2_200)
}

async function main() {
  await mkdir(paths.videosDir, { recursive: true })

  const browser = await launchBrowser({ headless: true, slowMo: RECORD ? 80 : 0 })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 1,
    recordVideo: RECORD
      ? { dir: paths.videosDir, size: VIEWPORT }
      : undefined,
  })
  const page = await context.newPage()
  await injectTutorialChrome(page)

  const baseUrl = DEFAULT_BASE_URL
  await prepareReviserAccount(page, baseUrl)

  await runJourney(page, baseUrl)

  if (REHEARSE) {
    const body = (await page.locator('body').innerText()).replace(/\s+/g, ' ').slice(0, 380)
    console.log('Rehearsal snippet:', body)
    await context.close()
    await browser.close()
    console.log('Rehearse OK — journey verified.')
    return
  }

  const video = page.video()
  await context.close()
  await browser.close()

  const rawPath = video ? await video.path() : null
  if (!rawPath) {
    throw new Error('Recording failed: no Playwright video artifact')
  }

  // Target ~52s silent cut for product tutorials; gentle ramp if capture runs long.
  const probeSeconds = await probeVideoSeconds(rawPath)
  const targetSeconds = 58
  const trimmedProbe = Math.max(0, probeSeconds - 0.6)
  const speed = trimmedProbe > targetSeconds ? trimmedProbe / targetSeconds : 1

  await postprocessTutorialVideo({
    inputWebm: rawPath,
    outputMp4: paths.outputMp4,
    speed: Math.min(speed, 1.55),
    trimStartSeconds: 0.6,
  })

  console.log(`Tutorial saved: ${paths.outputMp4}`)
  console.log(`Raw capture: ${rawPath}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
