import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'

/**
 * Regression: dark-mode ayah end markers must fully undo the light-theme hide
 * rule (visibility/opacity/size), not only flip `display`. The AMD recitation
 * modal is teleported outside `.app`, so shared CSS + amd-overlay rules must
 * cover the theme PNG swap.
 */
const root = process.cwd()
const cssPath = path.join(root, 'resources/js/views/Memorisation.css')
const amdCssPath = path.join(root, 'resources/js/views/Memorisation.amd.css')
const jsPath = path.join(root, 'resources/js/views/Memorisation.js')
const bladePath = path.join(root, 'resources/views/layouts/app.blade.php')

const [css, amdCss, js, blade] = await Promise.all([
  fs.readFile(cssPath, 'utf8'),
  fs.readFile(amdCssPath, 'utf8'),
  fs.readFile(jsPath, 'utf8'),
  fs.readFile(bladePath, 'utf8'),
])

// Dual light/dark Mushaf PNG markers (do not replace with a different component).
assert.match(js, /buildStackedAyahEndMarkerHtml/)
assert.match(js, /verse-ayah-end-number__img--light/)
assert.match(js, /verse-ayah-end-number__img--dark/)
assert.match(js, /\/images\/ayah-markers\/\$\{safe\}\.png/)
assert.match(js, /\/images\/ayah-markers\/dark\/\$\{safe\}\.png/)

function extractRule(source, selectorNeedle) {
  const idx = source.indexOf(selectorNeedle)
  assert.ok(idx >= 0, `missing selector near: ${selectorNeedle}`)
  const open = source.indexOf('{', idx)
  const close = source.indexOf('}', open)
  assert.ok(open > idx && close > open, `unclosed rule for: ${selectorNeedle}`)
  return source.slice(open + 1, close)
}

const darkShowCss = extractRule(
  css,
  '[data-theme="dark"] .amd-mushaf-stream .verse-ayah-end-number__img--dark'
)
for (const prop of [
  'display: block !important',
  'visibility: visible !important',
  'opacity: 1 !important',
  'width: 100% !important',
  'height: 100% !important',
  'position: absolute !important',
]) {
  assert.match(darkShowCss, new RegExp(prop.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))
}

const darkHideLightCss = extractRule(
  css,
  '[data-theme="dark"] .amd-mushaf-stream .verse-ayah-end-number__img--light'
)
assert.match(darkHideLightCss, /display:\s*none\s*!important/)
assert.match(darkHideLightCss, /visibility:\s*hidden\s*!important/)
assert.match(darkHideLightCss, /opacity:\s*0\s*!important/)

// Modal-local swap (teleport target is body, not .app).
assert.match(amdCss, /\.amd-overlay\[data-theme="dark"\]\s+\.verse-ayah-end-number__img--dark/)
const amdDarkShow = extractRule(
  amdCss,
  '.amd-overlay[data-theme="dark"] .verse-ayah-end-number__img--dark'
)
assert.match(amdDarkShow, /visibility:\s*visible\s*!important/)
assert.match(amdDarkShow, /opacity:\s*1\s*!important/)
assert.match(amdDarkShow, /width:\s*100%\s*!important/)
assert.match(amdDarkShow, /height:\s*100%\s*!important/)

// Markers stay above word / tajweed backgrounds; RTL spacing uses logical margins.
assert.match(css, /\.amd-mushaf-stream\s+\.verse-ayah-end-number[\s\S]*?z-index:\s*3/)
assert.match(css, /margin-inline:\s*0\.14em\s+0\.08em\s*!important/)
assert.match(amdCss, /\.amd-mushaf-stream\s+\.verse-ayah-end-number[\s\S]*?z-index:\s*3/)
assert.match(amdCss, /isolation:\s*isolate/)

// Blade high-specificity override must also reach the teleported modal.
assert.match(blade, /html body \.amd-overlay \.verse-ayah-end-number__img--dark/)
assert.match(blade, /html body \.amd-overlay\[data-theme="dark"\] \.verse-ayah-end-number__img--dark/)

console.log('Ayah end-number dark-mode visibility tests passed')
