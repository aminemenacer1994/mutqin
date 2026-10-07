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
  /--mq-mushaf-inline-start:\s*max\(2px, var\(--mq-safe-left\)\)/,
  'phones must define a hairline mushaf inset from safe-area tokens',
)

assert.match(
  mobileGridCss,
  /main\.mushaf-mode-active \.madani-page-sheet[\s\S]*?padding-inline:\s*var\(--mq-mushaf-inline-start\) var\(--mq-mushaf-inline-end\)/,
  'unicode mushaf sheets must use mushaf inset tokens',
)

assert.match(
  mobileGridCss,
  /QPC \+ classic mushaf:[\s\S]*?qpc-madani-page__sheet[\s\S]*?padding-inline:[\s\S]*?--mq-mushaf-inline-start/,
  'QPC mushaf sheets use a hairline gutter, not extra page padding',
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

const blade = readFileSync(
  new URL('../../resources/views/layouts/app.blade.php', import.meta.url),
  'utf8',
)
const sessionScroll = readFileSync(
  new URL('../../resources/js/components/madani/MadaniSessionScroll.vue', import.meta.url),
  'utf8',
)

assert.match(
  blade,
  /mutqin-memorisation-hotfix-v202[\s\S]*player-dock:not\(\.tools-open\)[\s\S]*z-index:\s*14050/,
  'audio player must stack above the Recite button',
)
assert.match(
  sessionScroll,
  /animation:\s*none/,
  'mushaf pages must not fade while the reader scrolls',
)
assert.match(
  sessionScroll,
  /scrollToFocusPage\(\{ smooth: true \}\)/,
  'focus page changes still use programmatic smooth scrolling',
)

console.log('mobile-mushaf-gutter.test.mjs: all assertions passed')
