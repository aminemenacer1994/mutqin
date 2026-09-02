import assert from 'node:assert/strict'
import { chromium } from 'playwright'

const base = process.env.MUTQIN_BASE_URL || 'http://127.0.0.1:8000'

async function reachable() {
  try {
    const response = await fetch(base, { redirect: 'manual' })
    return response.status > 0
  } catch {
    return false
  }
}

if (!(await reachable())) {
  console.log(`i18n-screens.test.mjs: skipped (${base} not reachable)`)
  process.exit(0)
}

const EXPECT = {
  en: { home: 'Home', memorise: 'Memorise', cta: 'Begin your session' },
  fr: { home: 'Accueil', memorise: 'Mémorisation', cta: 'Commencer votre session' },
  es: { home: 'Inicio', memorise: 'Memorización', cta: 'Empieza tu sesión' },
}

const browser = await chromium.launch({ headless: true })

try {
  for (const locale of ['en', 'fr', 'es']) {
    const page = await browser.newPage()
    await page.goto(`${base}/?lang=${locale}`, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1500)
    const body = await page.evaluate(() => document.body.innerText)
    const htmlLang = await page.evaluate(() => document.documentElement.lang)
    assert.equal(htmlLang, locale, `${locale}: html lang`)
    assert.doesNotMatch(body, /memorisation\.[a-zA-Z]/, `${locale}: raw memorisation key leaked`)
    assert.match(body, new RegExp(EXPECT[locale].home), `${locale}: nav home`)
    assert.match(body, new RegExp(EXPECT[locale].memorise), `${locale}: nav memorise`)
    assert.match(body, new RegExp(EXPECT[locale].cta), `${locale}: homepage CTA`)
    await page.close()
  }

  const login = await browser.newPage()
  await login.goto(`${base}/login?lang=fr`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await login.waitForTimeout(800)
  const loginText = await login.evaluate(() => document.body.innerText)
  assert.match(loginText, /Connexion|Se connecter|Assalamu alaikum/, 'fr login copy')
  await login.close()

  const loginEs = await browser.newPage()
  await loginEs.goto(`${base}/login?lang=es`, { waitUntil: 'domcontentloaded', timeout: 45000 })
  await loginEs.waitForTimeout(800)
  const loginEsText = await loginEs.evaluate(() => document.body.innerText)
  assert.match(loginEsText, /Iniciar sesión|Assalamu alaikum/, 'es login copy')
  await loginEs.close()
} finally {
  await browser.close()
}

console.log('i18n-screens.test.mjs: ok')
