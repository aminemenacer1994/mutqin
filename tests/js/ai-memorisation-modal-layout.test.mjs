import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const vue = readFileSync(join(root, 'resources/js/components/AiMemorisationDetectionModal.vue'), 'utf8')
const css = readFileSync(join(root, 'resources/js/views/Memorisation.amd.css'), 'utf8')

function assertMatch(label, source, pattern) {
  assert.match(source, pattern, label)
}

// Desktop sizing: ~85–92vw with max around 1400–1600px, height within viewport
assertMatch(
  'desktop modal width uses vw sizing in the 85–92 range',
  css,
  /--amd-modal-width:\s*min\((8[5-9]|9[0-2])vw,\s*(1[4-6]\d{2})px\)/
)
assertMatch(
  'desktop modal max height stays within the viewport',
  css,
  /--amd-modal-max-height:\s*min\((9[0-6])dvh,\s*100vh\)/
)
assertMatch(
  'dialog width overrides mutqin full width for the AMD shell',
  css,
  /\.amd-overlay \.amd-dialog\.mutqin-modal-dialog--full[\s\S]*?width:\s*var\(--amd-modal-width\)\s*!important/
)
assertMatch(
  'premium spacious modal fills the widened dialog',
  css,
  /\.amd-modal--spacious[\s\S]*?width:\s*100%\s*!important/
)

// Sticky header / scrollable body / sticky footer structure
assertMatch('vue sticky header class', vue, /amd-header--sticky/)
assertMatch('vue scrollable body class', vue, /amd-body--scroll/)
assertMatch('vue sticky footer markup', vue, /amd-footer amd-footer--sticky/)
assertMatch('vue footer hosts primary start action', vue, /amd-start-wrap--footer/)
assertMatch('vue footer hosts complete actions', vue, /amd-complete__actions--footer/)
assertMatch('vue footer hosts stop action', vue, /amd-footer-stop-btn|amd-footer__stop/)
assertMatch('css sticky header', css, /\.amd-header--sticky[\s\S]*?position:\s*sticky/)
assertMatch('css scrollable body', css, /\.amd-body--scroll[\s\S]*?overflow-y:\s*auto/)
assertMatch('css sticky footer', css, /\.amd-footer--sticky[\s\S]*?position:\s*sticky/)
assertMatch('css footer reserves stable action height', css, /\.amd-footer[\s\S]*?min-height:\s*4\.25rem/)
assertMatch('css Quran area gets primary vertical space', css, /\.amd-mushaf-shell--primary[\s\S]*?flex:\s*1 1 auto/)

// Prevent clipping / nested horizontal scroll / narrow column
assertMatch('css blocks nested horizontal overflow', css, /\.amd-body--scroll[\s\S]*?overflow-x:\s*hidden/)
assertMatch('css ayah uses a wide reading measure', css, /max-width:\s*min\(72rem,\s*100%\)|max-width:\s*min\(68rem,\s*100%\)/)
assert.doesNotMatch(
  css,
  /\.amd-modal--premium\s*\{[^}]*max-width:\s*min\(44rem/,
  'premium modal must not remain capped at the old 44rem width'
)

// Tablet near-full width
assertMatch(
  'tablet near-full width with safe margins',
  css,
  /@media \(max-width:\s*1024px\) and \(min-width:\s*721px\)[\s\S]*?--amd-modal-width:\s*min\(96vw,\s*calc\(100vw - 1\.5rem\)\)/
)

// Mobile full-screen
assertMatch(
  'mobile full-screen dialog width/height',
  css,
  /@media \(max-width:\s*720px\)[\s\S]*?width:\s*100vw\s*!important[\s\S]*?height:\s*100dvh\s*!important/
)
assertMatch(
  'mobile overlay clears padding for full-bleed shell',
  css,
  /@media \(max-width:\s*720px\)[\s\S]*?\.amd-overlay\s*\{[\s\S]*?padding:\s*0/
)

// Close behaviour: Escape, cancel emit, focus restore + trap
assertMatch('escape closes via overlay keydown handler', vue, /onOverlayKeydown/)
assertMatch('escape key triggers cancel', vue, /event\.key === 'Escape'[\s\S]*?onCancel\(/)
assertMatch('cancel emits cancel', vue, /onCancel\(\)\s*\{[\s\S]*?\$emit\('cancel'\)/)
assertMatch('focus trap on Tab', vue, /trapFocus\(/)
assertMatch('captures return focus before open', vue, /captureReturnFocus\(/)
assertMatch('restores return focus on close', vue, /restoreReturnFocus\(/)
assertMatch('focusable selector used for trap', vue, /AMD_FOCUSABLE_SELECTOR/)

// Dark mode sticky surfaces
assertMatch(
  'dark mode sticky header surface',
  css,
  /\[data-theme="dark"\] \.amd-header--sticky/
)
assertMatch(
  'dark mode sticky footer surface',
  css,
  /\[data-theme="dark"\] \.amd-footer--sticky|\[data-theme="dark"\] \.amd-footer,/
)

console.log('ai-memorisation-modal-layout.test.mjs: ok')
