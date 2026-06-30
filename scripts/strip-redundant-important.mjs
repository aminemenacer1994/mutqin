/**
 * Phase 2: Remove !important from rules where no Bootstrap/global conflict exists.
 * Conservative: keep !important on properties that Bootstrap commonly sets.
 */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.resolve('resources/js/views/Memorisation.css')
const dryRun = process.argv.includes('--dry-run')
let css = fs.readFileSync(cssPath, 'utf8')

const BOOTSTRAP_PROPS = new Set([
  'display', 'position', 'flex', 'flex-direction', 'flex-wrap', 'align-items',
  'justify-content', 'gap', 'width', 'height', 'max-width', 'min-width',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block', 'margin', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'overflow', 'overflow-x', 'overflow-y',
  'border', 'border-radius', 'background', 'background-color', 'color',
  'font-size', 'font-weight', 'line-height', 'text-align', 'opacity',
  'visibility', 'z-index', 'top', 'right', 'bottom', 'left', 'transform',
  'box-shadow', 'filter', 'pointer-events', 'cursor', 'white-space',
  'word-break', 'overflow-wrap', 'direction', 'unicode-bidi', 'box-sizing',
])

const before = (css.match(/!important/g) || []).length

// Remove !important from non-Bootstrap-conflict properties inside memorisation-scoped selectors
css = css.replace(/([^{}]+)\{([^{}]*)\}/g, (match, selector, body) => {
  if (selector.includes('@')) return match
  const newBody = body.replace(/([\w-]+)\s*:\s*([^;]+?)\s*!important\s*;/g, (m, prop, val) => {
    const p = prop.trim().toLowerCase()
    if (BOOTSTRAP_PROPS.has(p)) return m
    return `${prop}: ${val.trim()};`
  })
  return `${selector}{${newBody}}`
})

const after = (css.match(/!important/g) || []).length
console.log(`!important: ${before} -> ${after} (removed ${before - after})`)

if (!dryRun) {
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log(`Updated ${cssPath}`)
}
