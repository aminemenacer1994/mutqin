import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { chromium } from 'playwright'
const source = readFileSync(new URL('../../resources/js/utils/modalFocus.js', import.meta.url), 'utf8').replace(/^export /gm, '')
const browser = await chromium.launch()
try {
  const page = await browser.newPage()
  await page.setContent('<button id="outside">Outside</button><div id="dialog" role="dialog" tabindex="-1"><button id="first">First</button><div hidden><button id="hidden">Hidden</button></div><button id="last">Last</button></div>')
  await page.addScriptTag({ content: source + '\ndocument.querySelector("#dialog").addEventListener("keydown", e => handleModalKeydown(e, { container: document.querySelector("#dialog") }));' })
  await page.locator('#dialog').focus()
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'last', 'Reverse tab from initial dialog root stays inside')
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'first', 'Last wraps to first')
  await page.keyboard.press('Shift+Tab')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'last', 'First wraps to last')
  await page.locator('#dialog').focus()
  await page.keyboard.press('Tab')
  assert.equal(await page.locator(':focus').getAttribute('id'), 'first', 'Forward tab from root enters first control')
  assert.equal(await page.evaluate(() => getFocusableElements(document.querySelector('#dialog')).length), 2, 'Hidden ancestor excludes controls')
  console.log('Shared modal focus boundaries and hidden controls: passed')
} finally { await browser.close() }
