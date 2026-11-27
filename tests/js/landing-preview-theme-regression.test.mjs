import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const baseline = JSON.parse(
  readFileSync(join(root, 'docs/mutqin-2.0/preview-theme-locked-tokens.json'), 'utf8'),
)
const tokenCss = readFileSync(join(root, 'resources/js/styles/preview-editorial-tokens.css'), 'utf8')
const homepage = readFileSync(join(root, 'resources/js/views/Homepage.vue'), 'utf8')

const normalizeHex = (value) => value.trim().toLowerCase()

const expectToken = (css, selectorFragment, prop, expected) => {
  const selectorIdx = css.indexOf(selectorFragment)
  assert.ok(selectorIdx >= 0, `Missing selector fragment: ${selectorFragment}`)
  const block = css.slice(selectorIdx, selectorIdx + 900)
  const match = block.match(new RegExp(`${prop}:\\s*(#[0-9a-fA-F]{3,8})`))
  assert.ok(match, `Expected ${prop} near ${selectorFragment}`)
  assert.equal(normalizeHex(match[1]), normalizeHex(expected))
}

expectToken(
  tokenCss,
  '.homepage--preview[data-theme="light"]',
  '--bg',
  baseline.light.pageBackground,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="light"]',
  '--surface',
  baseline.light.surface,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="light"]',
  '--text',
  baseline.light.primaryText,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="light"]',
  '--accent',
  baseline.light.accent,
)

expectToken(
  tokenCss,
  '.homepage--preview[data-theme="dark"]',
  '--bg',
  baseline.dark.pageBackground,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="dark"]',
  '--surface',
  baseline.dark.surface,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="dark"]',
  '--text',
  baseline.dark.primaryText,
)
expectToken(
  tokenCss,
  '.homepage--preview[data-theme="dark"]',
  '--accent',
  baseline.dark.accent,
)

assert.match(homepage, /preview-editorial-tokens\.css/)
assert.match(tokenCss, /Newsreader/)
assert.doesNotMatch(tokenCss, /#000000|#0a0a0a|navy|purple/i)

console.log('landing-preview-theme-regression.test.mjs: ok')