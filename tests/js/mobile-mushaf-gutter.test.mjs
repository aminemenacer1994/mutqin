import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const mobileGridCss = readFileSync(
  new URL('../../resources/js/views/Memorisation.mobile-grid.css', import.meta.url),
  'utf8',
)
const memorisationJs = readFileSync(
  new URL('../../resources/js/views/Memorisation.js', import.meta.url),
  'utf8',
)

assert.match(
  mobileGridCss,
  /--mq-mushaf-inline-start:\s*max\(0\.72rem, calc\(var\(--mq-safe-left\) \+ 0\.42rem\)\)/,
  'phones must define mushaf inline inset from safe-area tokens',
)

assert.match(
  mobileGridCss,
  /main\.mushaf-mode-active \.madani-page-sheet[\s\S]*?padding-inline:\s*var\(--mq-mushaf-inline-start\) var\(--mq-mushaf-inline-end\)/,
  'unicode mushaf sheets must use mushaf inset tokens',
)

assert.match(
  mobileGridCss,
  /QPC mushaf: full width shell, inset sheet[\s\S]*?qpc-madani-page__sheet[\s\S]*?--mq-mushaf-inline-(?:start|end)/,
  'QPC mushaf sheets must use mushaf inset tokens',
)

assert.doesNotMatch(
  mobileGridCss,
  /\.main\.mushaf-mode-active \.mushaf-workspace[\s\S]{0,220}overflow-x:\s*hidden\s*!important/,
  'mushaf workspace must not hide horizontal overflow (glyph clipping)',
)

assert.doesNotMatch(
  mobileGridCss,
  /\.main\.mushaf-mode-active \.madani-page-sheet[\s\S]{0,120}overflow-x:\s*hidden\s*!important/,
  'madani page sheets must not hide horizontal overflow',
)

assert.match(
  memorisationJs,
  /fitMadaniPageToViewport\(\)[\s\S]*?sheet\.style\.setProperty\('overflow-x', 'visible', 'important'\)/,
  'mobile mushaf fit must keep sheets horizontally visible',
)

assert.match(
  memorisationJs,
  /fitMadaniPageToViewport\(\)[\s\S]*?--mq-mushaf-inline-start/,
  'mobile mushaf fit must apply CSS mushaf inset tokens',
)

console.log('mobile-mushaf-gutter.test.mjs: all assertions passed')
