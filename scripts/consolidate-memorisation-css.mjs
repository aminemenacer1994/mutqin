/**
 * Consolidate Memorisation.css:
 * 1. Merge exact duplicate selectors (last-wins per property)
 * 2. Strip redundant !important where safe
 * 3. Remove @media (prefers-color-scheme: dark) legacy block
 * 4. Append responsive breakpoint overrides
 *
 * Usage: node scripts/consolidate-memorisation-css.mjs [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.resolve('resources/js/views/Memorisation.css')
const dryRun = process.argv.includes('--dry-run')
const source = fs.readFileSync(cssPath, 'utf8')

/** @typedef {{ type: 'rule'|'at', selector?: string, declarations?: Map<string,string>, raw?: string, media?: string, children?: Chunk[] }} Chunk */

/**
 * Tokenize CSS into chunks preserving @media/@keyframes order.
 * @param {string} css
 * @returns {Chunk[]}
 */
function parseCss(css) {
  /** @type {Chunk[]} */
  const chunks = []
  let i = 0
  const len = css.length

  function skipWhitespace() {
    while (i < len && /\s/.test(css[i])) i++
  }

  function readComment() {
    if (css.slice(i, i + 2) !== '/*') return ''
    const end = css.indexOf('*/', i + 2)
    const comment = css.slice(i, end + 2)
    i = end + 2
    return comment
  }

  function readBlock() {
    let depth = 0
    let start = i
    while (i < len) {
      if (css[i] === '{') depth++
      if (css[i] === '}') {
        depth--
        if (depth === 0) {
          i++
          return css.slice(start, i)
        }
      }
      i++
    }
    return css.slice(start)
  }

  /** @type {string[]} */
  const leadingComments = []

  while (i < len) {
    skipWhitespace()
    if (i >= len) break

    if (css.slice(i, i + 2) === '/*') {
      leadingComments.push(readComment())
      continue
    }

    if (css[i] === '@') {
      const atStart = i
      while (i < len && css[i] !== '{' && css[i] !== ';') i++
      const prelude = css.slice(atStart, i).trim()

      // Skip legacy prefers-color-scheme dark block
      if (/^@media\s*\(\s*prefers-color-scheme\s*:\s*dark\s*\)/i.test(prelude)) {
        if (css[i] === '{') readBlock()
        continue
      }

      if (css[i] === ';') {
        i++
        chunks.push({ type: 'at', raw: prelude + ';' })
        continue
      }

      const block = readBlock()
      const inner = block.slice(block.indexOf('{') + 1, -1)
      chunks.push({
        type: 'at',
        media: prelude,
        children: parseCss(inner),
        raw: prelude + block
      })
      continue
    }

    // Rule
    const selStart = i
    while (i < len && css[i] !== '{') i++
    const selector = css.slice(selStart, i).trim()
    i++ // skip {
    const declStart = i
    let depth = 1
    while (i < len && depth > 0) {
      if (css[i] === '{') depth++
      if (css[i] === '}') depth--
      if (depth > 0) i++
    }
    const declBody = css.slice(declStart, i).trim()
    i++ // skip }

    /** @type {Map<string,string>} */
    const declarations = new Map()
    for (const part of splitDeclarations(declBody)) {
      const colon = part.indexOf(':')
      if (colon === -1) continue
      const prop = part.slice(0, colon).trim()
      const val = part.slice(colon + 1).trim()
      if (prop) declarations.set(prop, val)
    }

    chunks.push({ type: 'rule', selector, declarations })
  }

  return chunks
}

function splitDeclarations(body) {
  /** @type {string[]} */
  const parts = []
  let cur = ''
  let paren = 0
  for (let j = 0; j < body.length; j++) {
    const ch = body[j]
    if (ch === '(') paren++
    if (ch === ')') paren--
    if (ch === ';' && paren === 0) {
      if (cur.trim()) parts.push(cur.trim())
      cur = ''
    } else {
      cur += ch
    }
  }
  if (cur.trim()) parts.push(cur.trim())
  return parts
}

/**
 * Merge duplicate selectors within a flat list of rule chunks.
 * @param {Chunk[]} chunks
 * @returns {Chunk[]}
 */
function mergeRules(chunks) {
  /** @type {Map<string, Map<string,string>>} */
  const merged = new Map()
  /** @type {string[]} */
  const order = []

  /** @type {Chunk[]} */
  const result = []

  for (const chunk of chunks) {
    if (chunk.type === 'at') {
      // Flush pending rules before at-rule
      flushMerged()
      result.push({
        ...chunk,
        children: chunk.children ? mergeRules(chunk.children) : []
      })
      continue
    }

    const sel = normalizeSelector(chunk.selector || '')
    if (!merged.has(sel)) {
      merged.set(sel, new Map())
      order.push(sel)
    }
    const decls = merged.get(sel)
    for (const [prop, val] of chunk.declarations || []) {
      decls.set(prop, val)
    }
  }

  flushMerged()

  function flushMerged() {
    for (const sel of order) {
      result.push({ type: 'rule', selector: sel, declarations: merged.get(sel) })
    }
    merged.clear()
    order.length = 0
  }

  return result
}

function normalizeSelector(sel) {
  return sel.replace(/\s+/g, ' ').trim()
}

/**
 * Strip !important only when the same selector had duplicate declarations
 * and the final merged value does NOT need it to win intra-file conflicts.
 * Conservative: keep !important whenever the last-wins value had it.
 * @param {Chunk[]} chunks
 */
function stripRedundantImportant(chunks) {
  for (const chunk of chunks) {
    if (chunk.type === 'at') {
      if (chunk.children) stripRedundantImportant(chunk.children)
      continue
    }
    // After merge each selector appears once — preserve !important from last-wins.
    // Only normalize duplicate property keys (with/without !important suffix).
    /** @type {Map<string,string>} */
    const next = new Map()
    for (const [prop, val] of chunk.declarations || []) {
      const baseProp = prop.replace(/\s*!important\s*$/i, '').trim()
      next.set(baseProp, val)
    }
    chunk.declarations = next
  }
}

/**
 * Serialize chunks back to CSS string.
 * @param {Chunk[]} chunks
 * @param {number} indent
 */
function serialize(chunks, indent = 0) {
  const pad = '  '.repeat(indent)
  let out = ''
  for (const chunk of chunks) {
    if (chunk.type === 'at') {
      if (chunk.raw && !chunk.children) {
        out += `${pad}${chunk.raw}\n`
        continue
      }
      out += `${pad}${chunk.media} {\n`
      out += serialize(chunk.children || [], indent + 1)
      out += `${pad}}\n\n`
      continue
    }
    const decls = [...(chunk.declarations || [])]
      .map(([p, v]) => `${pad}  ${p}: ${v};`)
      .join('\n')
    if (!decls) continue
    out += `${pad}${chunk.selector} {\n${decls}\n${pad}}\n\n`
  }
  return out
}

/** Responsive overrides appended at end */
const RESPONSIVE_CSS = `
/* ========================================
   Responsive breakpoints (mobile-first overrides)
   sm: max 480px | md: max 768px | lg: max 1024px
   ======================================== */

@media (max-width: 1024px) {
  .workspace-shell {
    grid-template-columns: 1fr;
    gap: 1rem;
  }

  .tools-panel {
    position: static;
    max-height: none;
    width: 100%;
  }

  .reading-toolbar,
  .workspace-quick-controls {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .session-overview-card,
  .completion-header {
    flex-direction: column;
    align-items: stretch;
  }

  .session-overview-actions,
  .completion-actions,
  .action-buttons-row {
    flex-wrap: wrap;
    width: 100%;
  }

  .action-btn,
  .quick-ai-action,
  .mushaf-pill {
    min-width: 0;
    flex: 1 1 auto;
  }
}

@media (max-width: 768px) {
  .main {
    padding-inline: 0.75rem;
  }

  .verse-card {
    min-height: auto;
    padding: 1rem;
  }

  .reading-toolbar-controls,
  .toolbar-dropdown-row,
  .font-theme-border-row {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }

  .offcanvas.tools-offcanvas,
  .offcanvas-end {
    width: min(100vw, 420px);
  }

  .completion-stats {
    flex-direction: column;
    gap: 0.75rem;
  }

  .completion-stats-grid,
  .summary-cards-row {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }

  .saved-sessions-container {
    padding: 1rem;
  }

  .memorisation-checker-modal .modal-dialog,
  .self-check-modal .modal-dialog {
    margin: 0.5rem;
    max-width: calc(100vw - 1rem);
  }

  .session-overview-top {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.75rem;
  }

  .session-overview-controls {
    width: 100%;
    flex-wrap: wrap;
    justify-content: flex-start;
  }
}

@media (max-width: 480px) {
  .header-actions,
  .workspace-header-row {
    flex-wrap: wrap;
    gap: 0.5rem;
  }

  .action-btn span,
  .quick-ai-action span {
    font-size: 0.8125rem;
  }

  .verse-arabic,
  .mushaf-ayah-text,
  .self-check-modal-ayah,
  .memorisation-checker-ayah {
    font-size: clamp(1.25rem, 6vw, 1.75rem);
    line-height: 1.85;
  }

  .completion-actions .action-btn,
  .session-end-actions .action-btn {
    flex: 1 1 100%;
    width: 100%;
    justify-content: center;
  }

  .summary-cards-row {
    display: flex;
    flex-direction: column;
  }

  .tools-offcanvas .offcanvas-body {
    padding: 0.75rem;
  }

  .memorisation-checker-modal,
  .self-check-modal {
    padding: 0;
  }

  .memorisation-checker-modal .modal-content,
  .self-check-modal .modal-content {
    border-radius: 12px;
    min-height: auto;
  }
}
`

// --- Run pipeline ---
const originalLines = source.split('\n').length
const parsed = parseCss(source)
const merged = mergeRules(parsed)
stripRedundantImportant(merged)

const header = `/* Memorisation view styles — consolidated ${new Date().toISOString().slice(0, 10)} */
/* Breakpoints: sm ≤480px | md ≤768px | lg ≤1024px */

`
let output = header + serialize(merged) + RESPONSIVE_CSS

// Collapse excessive blank lines
output = output.replace(/\n{3,}/g, '\n\n').trim() + '\n'

const newLines = output.split('\n').length
const importantCount = (output.match(/!important/g) || []).length
const mediaCount = (output.match(/@media/g) || []).length

console.log(`Original: ${originalLines} lines, ${(source.match(/!important/g) || []).length} !important, ${(source.match(/@media/g) || []).length} @media`)
console.log(`Output:   ${newLines} lines, ${importantCount} !important, ${mediaCount} @media`)
console.log(`Reduction: ${originalLines - newLines} lines (${((1 - newLines / originalLines) * 100).toFixed(1)}%)`)

if (!dryRun) {
  fs.writeFileSync(cssPath, output, 'utf8')
  console.log(`Wrote ${cssPath}`)
} else {
  console.log('Dry run — no file written')
}
