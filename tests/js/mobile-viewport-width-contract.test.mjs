/**
 * Mobile modals must not use raw calc(100vw - …) widths — scrollbar-gutter and
 * nested padding make that wider than the layout viewport at 360–430px.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')

const files = [
  'resources/js/components/SessionAnalysisOverview.css',
  'resources/js/components/TajweedColourGuideModal.css',
]

const riskyWidth = /^\s*width:\s*calc\(100vw\s-/m

for (const rel of files) {
  const source = readFileSync(join(root, rel), 'utf8')
  assert.doesNotMatch(
    source,
    riskyWidth,
    `${rel} must use min(100%, calc(100vw - …)) for modal width`,
  )
}

const memorisation = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
assert.match(
  memorisation,
  /\.player-dock\.tools-open[\s\S]*?width:\s*min\(100%, calc\(100vw - 16px\)\)/,
  'player dock uses min(100%, 100vw) width on phones',
)
assert.match(
  memorisation,
  /post-session-simple__dialog[\s\S]*?width:\s*min\(100%, calc\(100vw - 0\.65rem\)\)/,
  'post-session dialog uses min(100%, 100vw) width',
)

console.log('mobile-viewport-width-contract.test.mjs: ok')
