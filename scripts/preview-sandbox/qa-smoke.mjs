#!/usr/bin/env node
/**
 * Group J5 — Playwright smoke for preview sandbox entry + toolbar (needs local server + allowlist login).
 *
 *   MUTQIN_BASE_URL=http://127.0.0.1:8000 \
 *   MUTQIN_PREVIEW_EMAIL=... MUTQIN_PREVIEW_PASSWORD=... \
 *   node scripts/preview-sandbox/qa-smoke.mjs
 */
import assert from 'node:assert/strict'
import { chromium } from 'playwright'
import { BASE_URL, enterSandboxExperience, loginPreviewOwner } from './lib/demo-session.mjs'

const email = process.env.MUTQIN_PREVIEW_EMAIL || process.env.MUTQIN_TEST_EMAIL
const password = process.env.MUTQIN_PREVIEW_PASSWORD || process.env.MUTQIN_TEST_PASSWORD

async function main() {
  if (!email || !password) {
    console.log('preview-sandbox qa-smoke: skipped (set MUTQIN_PREVIEW_EMAIL and MUTQIN_PREVIEW_PASSWORD)')
    process.exit(0)
  }

  const browser = await chromium.launch({ headless: true })
  const page = await browser.newPage({ viewport: { width: 390, height: 844 } })

  try {
    await loginPreviewOwner(page, { email, password })
    await page.goto(`${BASE_URL}/preview`, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    assert.ok(page.url().includes('/preview'), 'preview landing should load for allowlisted user')

    await enterSandboxExperience(page, 'teacher', { guided: false })
    const toolbar = page.locator('.mutqin-preview-toolbar')
    await toolbar.waitFor({ timeout: 45_000 })
    await page.getByRole('button', { name: /exit demo|leave demo/i }).click()
    const dialog = page.locator('dialog.sandbox-exit')
    await dialog.waitFor({ state: 'visible', timeout: 5000 })
    await page.getByRole('button', { name: /continue exploring/i }).click()
    await dialog.waitFor({ state: 'hidden', timeout: 5000 })

    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 2)
    assert.equal(overflow, false, 'sandbox should not horizontal-overflow at 390px')
    console.log('preview-sandbox qa-smoke: ok')
  } finally {
    await browser.close()
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})