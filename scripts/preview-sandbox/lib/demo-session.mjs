import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../../..')

export const BASE_URL = (process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8000').replace(/\/$/, '')
export const VIEWPORT = { width: 1440, height: 900 }

export function outputDir(slug) {
  return join(root, 'public', 'preview-sandbox-recordings', slug)
}

export async function launchWithVideo(slug, { headless = true } = {}) {
  const dir = outputDir(slug)
  await mkdir(dir, { recursive: true })
  const browser = await chromium.launch({ headless })
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir, size: VIEWPORT },
  })
  const page = await context.newPage()
  return { browser, context, page, videoDir: dir }
}

export async function loginPreviewOwner(page, { email, password }) {
  await page.goto(`${BASE_URL}/login`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (!page.url().includes('/login')) return
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.getByRole('button', { name: /^login$/i }).click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 30_000 })
}

export async function enterSandboxExperience(page, experience, { guided = true } = {}) {
  await page.goto(`${BASE_URL}/preview/demo`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
  if (page.url().includes('/login')) {
    throw new Error('Preview demo hub requires an allowlisted login (set MUTQIN_PREVIEW_EMAIL / MUTQIN_PREVIEW_PASSWORD).')
  }
  await page.locator('.preview-demo-entry__launch button[type="submit"]').waitFor({ timeout: 30_000 })
  const label = {
    teacher: /teacher/i,
    student: /student/i,
    parent: /parent/i,
    personal: /personal/i,
    connected: /classroom loop|connected/i,
  }[experience] || new RegExp(experience, 'i')
  const option = page.locator('.preview-demo-entry__option').filter({ hasText: label })
  if (await option.count()) {
    await option.first().click()
  }
  if (guided) {
    const guidedRadio = page.locator('input[name="demo-launch-mode"][value="guided"]')
    if (await guidedRadio.count()) await guidedRadio.check()
  }
  await page.locator('.preview-demo-entry__launch button[type="submit"]').click()
  await page.waitForLoadState('networkidle', { timeout: 60_000 }).catch(() => {})
}

export async function dismissSandboxTourCard(page) {
  const skip = page.getByRole('button', { name: /skip tour/i })
  if (await skip.count()) {
    await skip.first().click({ timeout: 1500 }).catch(() => {})
  }
}