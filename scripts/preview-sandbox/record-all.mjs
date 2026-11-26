#!/usr/bin/env node
/**
 * Record sandbox marketing demos (Group J4).
 *
 *   node scripts/preview-sandbox/record-all.mjs --rehearse
 *   node scripts/preview-sandbox/record-all.mjs --record
 *
 * Env: MUTQIN_BASE_URL, MUTQIN_PREVIEW_EMAIL, MUTQIN_PREVIEW_PASSWORD
 */
import { execFileSync } from 'node:child_process'
import { readdir, rename } from 'node:fs/promises'
import { join } from 'node:path'
import {
  BASE_URL,
  dismissSandboxTourCard,
  enterSandboxExperience,
  launchWithVideo,
  loginPreviewOwner,
  outputDir,
} from './lib/demo-session.mjs'

const RECORD = process.argv.includes('--record')
const DEMS = [
  { slug: 'teacher', experience: 'teacher', dwellMs: 12_000 },
  { slug: 'student', experience: 'student', dwellMs: 10_000 },
  { slug: 'parent', experience: 'parent', dwellMs: 10_000 },
  { slug: 'personal', experience: 'personal', dwellMs: 14_000 },
  { slug: 'connected', experience: 'connected', dwellMs: 18_000 },
]

const email = process.env.MUTQIN_PREVIEW_EMAIL || process.env.MUTQIN_TEST_EMAIL
const password = process.env.MUTQIN_PREVIEW_PASSWORD || process.env.MUTQIN_TEST_PASSWORD

async function finalizeWebm(slug) {
  const dir = outputDir(slug)
  const files = (await readdir(dir)).filter((f) => f.endsWith('.webm'))
  if (!files.length) return null
  const src = join(dir, files[files.length - 1])
  const dest = join(dir, `${slug}.webm`)
  await rename(src, dest)
  if (!RECORD) return dest
  try {
    const mp4 = join(dir, `${slug}.mp4`)
    execFileSync(
      'ffmpeg',
      ['-y', '-i', dest, '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', mp4],
      { stdio: 'ignore' },
    )
    return mp4
  } catch {
    return dest
  }
}

async function recordOne({ slug, experience, dwellMs }) {
  const { browser, context, page } = await launchWithVideo(slug, { headless: !RECORD })
  try {
    if (email && password) {
      await loginPreviewOwner(page, { email, password })
    }
    await enterSandboxExperience(page, experience, { guided: true })
    await dismissSandboxTourCard(page)
    await page.waitForTimeout(dwellMs)
    await page.screenshot({ path: join(outputDir(slug), `${slug}-end.png`), fullPage: false })
  } finally {
    await context.close()
    await browser.close()
  }
  return finalizeWebm(slug)
}

async function main() {
  console.log(`Preview sandbox recordings @ ${BASE_URL} (${RECORD ? 'record' : 'rehearse'})`)
  for (const demo of DEMS) {
    const out = await recordOne(demo)
    console.log(`  ${demo.slug}: ${out || 'no video'}`)
  }
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})