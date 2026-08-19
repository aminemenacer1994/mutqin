import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const amdCss = readFileSync(join(root, 'resources/js/views/Memorisation.amd.css'), 'utf8')
const memorisationCss = readFileSync(join(root, 'resources/js/views/Memorisation.css'), 'utf8')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')

// AMD mushaf shell must wrap RTL text instead of clipping it horizontally.
{
  assert.match(
    amdCss,
    /\.amd-mushaf-shell--primary[\s\S]*?overflow-x:\s*clip/,
    'primary mushaf shell uses clip (not hidden) on horizontal overflow',
  )
  assert.match(
    amdCss,
    /\.amd-mushaf-stream[\s\S]*?overflow-wrap:\s*anywhere/,
    'mushaf stream wraps long Arabic lines',
  )
  assert.match(
    amdCss,
    /\.amd-mushaf-ayah--premium[\s\S]*?min-width:\s*0/,
    'ayah surface participates in flex shrink/wrap',
  )
  assert.match(
    amdCss,
    /\.amd-mushaf-ayah--premium[\s\S]*?max-width:\s*100%/,
    'ayah surface cannot exceed shell width',
  )
}

// Mobile mushaf font scales down on narrow viewports.
{
  assert.match(
    amdCss,
    /@media \(max-width:\s*720px\)[\s\S]*?\.amd-mushaf-ayah--premium[\s\S]*?clamp\(1\.35rem/,
    'mobile font clamp prevents horizontal overflow on small screens',
  )
}

// Spacious modal variant keeps a single scroll owner without nested horizontal clip fights.
{
  assert.match(
    amdCss,
    /\.amd-modal--spacious \.amd-mushaf-shell--primary[\s\S]*?overflow-x:\s*clip\s*!important/,
    'spacious modal mushaf shell uses clip overflow',
  )
  assert.match(
    amdCss,
    /\.amd-modal--spacious \.amd-mushaf-ayah--premium[\s\S]*?overflow-wrap:\s*anywhere/,
    'spacious modal ayah wraps text',
  )
}

// Self-check recitation box uses the same containment strategy.
{
  assert.match(
    memorisationCss,
    /\.self-check-modal-ayah-shell[\s\S]*?overflow-x:\s*clip/,
    'self-check ayah shell clips horizontally without hiding vertically',
  )
  assert.match(
    memorisationCss,
    /\.self-check-modal-ayah[\s\S]*?overflow-wrap:\s*anywhere/,
    'self-check ayah text wraps',
  )
}

// Mushaf HTML builder keeps continuous inline ayah runs (wrap-friendly layout).
{
  const fn = memorisationJs.match(/buildAmdMushafHtml\(\{ live = true, result = null \} = \{\}\) \{[\s\S]*?\n    \},/)?.[0] || ''
  assert.match(fn, /amd-mushaf-page--flow/, 'flow layout class is emitted')
  assert.match(fn, /amd-ayah-run__text/, 'inline ayah runs remain wrap-friendly')
}

console.log('amd-mushaf-overflow.test.mjs: ok')
