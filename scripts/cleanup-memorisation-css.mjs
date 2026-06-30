/**
 * Aggressive Memorisation.css cleanup:
 * 1. Remove !important from non-Bootstrap-conflict contexts
 * 2. Drop redundant [data-theme="light"] overrides that restate base rules
 * 3. Remove stale vendor prefixes and empty rules
 *
 * Usage: node scripts/cleanup-memorisation-css.mjs [--dry-run]
 */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.resolve('resources/js/views/Memorisation.css')
const dryRun = process.argv.includes('--dry-run')
let css = fs.readFileSync(cssPath, 'utf8')
const originalLines = css.split('\n').length
const originalImportant = (css.match(/!important/g) || []).length

/** Selectors that legitimately fight Bootstrap component styles */
const BOOTSTRAP_FIGHT_RE = /\.(modal|offcanvas|dropdown|btn|form-control|form-select|form-check|nav-|navbar|collapse|accordion|tooltip|popover|toast|alert|badge|card-body|list-group|input-group|table)/

/** Never strip !important from these functional selector fragments */
const PRESERVE_IMPORTANT_RE = /workspace-shell-actions|workspace-header-view-controls|tools-tabs|verse-menu-font-row|verse-arabic-wrap|session-evaluation-ayah|tajweed-mark|self-check-recorder-card\.recording|recitation-live-word-stream|unicode-bidi/

/** Props safe to de-important outside Bootstrap fights */
const SAFE_DEIMPORTANT = new Set([
  'color', 'background', 'background-color', 'box-shadow', 'filter', 'opacity',
  'animation', 'transition', 'font-family', 'letter-spacing', 'text-shadow',
  'outline', 'outline-offset', 'backdrop-filter', 'content', 'flex-shrink',
  'flex-grow', 'aspect-ratio', 'object-fit', 'clip-path', 'mask', 'fill', 'stroke',
  'grid-template-columns', 'grid-template-rows', 'grid-column', 'grid-row',
  'column-gap', 'row-gap', 'inset', 'inset-block', 'inset-inline',
  'border-color', 'border-top-color', 'border-bottom-color',
  'padding', 'padding-top', 'padding-right', 'padding-bottom', 'padding-left',
  'padding-inline', 'padding-block', 'margin', 'margin-top', 'margin-right',
  'margin-bottom', 'margin-left', 'gap', 'font-size', 'line-height', 'font-weight',
  'width', 'height', 'min-width', 'min-height', 'max-width', 'max-height',
  'flex', 'flex-direction', 'flex-wrap', 'align-items', 'justify-content',
  'display', 'overflow', 'overflow-x', 'overflow-y', 'white-space', 'word-break',
  'overflow-wrap', 'text-align', 'direction', 'unicode-bidi', 'transform',
  'border-radius', 'border', 'border-top', 'border-bottom', 'position', 'top',
  'right', 'bottom', 'left', 'z-index', 'cursor', 'pointer-events', 'visibility',
  'box-sizing',
])

function validateCss(text) {
  let depth = 0
  let inComment = false
  for (let i = 0; i < text.length; i++) {
    if (!inComment && text[i] === '/' && text[i + 1] === '*') { inComment = true; i++; continue }
    if (inComment && text[i] === '*' && text[i + 1] === '/') { inComment = false; i++; continue }
    if (inComment) continue
    if (text[i] === '{') depth++
    if (text[i] === '}') depth--
  }
  return { valid: depth === 0 && !inComment, depth, inComment }
}

function parseDeclarations(body) {
  /** @type {Map<string,string>} */
  const decls = new Map()
  for (const part of splitDeclarations(body)) {
    const colon = part.indexOf(':')
    if (colon === -1) continue
    const prop = part.slice(0, colon).trim()
    const val = part.slice(colon + 1).trim()
    if (prop) decls.set(prop, val)
  }
  return decls
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

function serializeDeclarations(decls) {
  return [...decls.entries()].map(([p, v]) => `  ${p}: ${v};`).join('\n')
}

function normalizeVal(v) {
  return v.replace(/\s+/g, ' ').replace(/\s*!important\s*$/i, '').trim()
}

// --- Phase 1: strip !important ---
let importantRemoved = 0
css = css.replace(/([^{}@]+)\{([^{}]*)\}/g, (match, selector, body) => {
  if (selector.trim().startsWith('@')) return match
  const fightsBootstrap = BOOTSTRAP_FIGHT_RE.test(selector)
  const preserveAll = PRESERVE_IMPORTANT_RE.test(selector)
  const newBody = body.replace(/([\w-]+)\s*:\s*([^;]+?)\s*!important\s*;/g, (m, prop, val) => {
    if (preserveAll) return m
    const p = prop.trim().toLowerCase()
    if (fightsBootstrap) return m
    if (SAFE_DEIMPORTANT.has(p)) {
      importantRemoved++
      return `${prop}: ${val.trim()};`
    }
    return m
  })
  return `${selector}{${newBody}}`
})

// --- Phase 2: remove redundant [data-theme] overrides ---
/** @type {Map<string, Map<string,string>>} */
const baseRules = new Map()
for (const m of css.matchAll(/^([^{}\n][^{]*)\{([^}]*)\}/gm)) {
  const sel = m[1].trim()
  if (sel.includes('[data-theme') || sel.startsWith('@')) continue
  baseRules.set(sel, parseDeclarations(m[2]))
}

const REDUNDANT_THEME_VALS = new Set([
  'var(--text)', 'var(--text-muted)', 'var(--surface)', 'var(--surface-strong)',
  'var(--border)', 'var(--accent)', 'var(--accent-strong)', 'var(--bg)',
  'transparent', 'inherit', 'none',
])

let lightRemoved = 0
let darkRemoved = 0

css = css.replace(/(\[data-theme="light"\][^{]+)\{([^}]*)\}/g, (match, selector, body) => {
  const baseSel = selector.replace(/\[data-theme="light"\]\s*/, '').trim()
  const base = baseRules.get(baseSel)
  if (!base) return match
  const lightDecls = parseDeclarations(body)
  let allRedundant = true
  for (const [prop, val] of lightDecls) {
    const baseVal = base.get(prop)
    if (!baseVal || normalizeVal(baseVal) !== normalizeVal(val)) {
      allRedundant = false
      break
    }
  }
  if (allRedundant && lightDecls.size > 0) {
    lightRemoved++
    return ''
  }
  return match
})

css = css.replace(/(\[data-theme="dark"\][^{]+)\{([^}]*)\}/g, (match, selector, body) => {
  const decls = parseDeclarations(body)
  if (decls.size === 0) { darkRemoved++; return '' }

  // Drop dark blocks that only restate inherited theme tokens
  const allTokenOnly = [...decls.values()].every(v => {
    const n = normalizeVal(v)
    return REDUNDANT_THEME_VALS.has(n) || n.startsWith('var(--')
  })
  if (allTokenOnly) {
    const baseSel = selector.replace(/\[data-theme="dark"\]\s*/, '').trim()
    const base = baseRules.get(baseSel)
    if (base) {
      let redundant = true
      for (const [prop, val] of decls) {
        const baseVal = base.get(prop)
        const n = normalizeVal(val)
        if (!baseVal || normalizeVal(baseVal) !== n) {
          // base doesn't set it — still needed if not a generic token
          if (!REDUNDANT_THEME_VALS.has(n)) { redundant = false; break }
        }
      }
      if (redundant) { darkRemoved++; return '' }
    }
  }

  // Drop single-property transparent/none dark overrides
  if (decls.size === 1) {
    const val = normalizeVal([...decls.values()][0])
    if (val === 'transparent' || val === 'none') {
      darkRemoved++
      return ''
    }
  }

  return match
})

// Merge identical [data-theme="dark"] rule bodies into grouped selectors
/** @type {Map<string, string[]>} */
const darkByBody = new Map()
for (const m of css.matchAll(/(\[data-theme="dark"\][^{]+)\{([^}]+)\}/g)) {
  const sel = m[1].trim()
  const body = m[2].trim().replace(/\s+/g, ' ')
  if (!darkByBody.has(body)) darkByBody.set(body, [])
  darkByBody.get(body).push(sel)
}

let mergedDark = 0
for (const [body, selectors] of darkByBody) {
  if (selectors.length < 2) continue
  const combined = selectors.join(', ')
  const individualRe = selectors.map(s => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')
  const blockRe = new RegExp(`(?:${selectors.map(s => `${s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\{[^}]+\\}`).join('\\s*')})`, 'g')
  if (blockRe.test(css)) {
    css = css.replace(blockRe, `${combined} {\n${body.split(';').filter(Boolean).map(d => `  ${d.trim()};`).join('\n')}\n}`)
    mergedDark += selectors.length - 1
  }
}

// --- Phase 3: remove stale vendor prefixes ---
const vendorPrefixRe = /^\s*-(webkit|moz|ms|o)-[\w-]+\s*:[^;]+;\s*\n/gm
const vendorRemoved = (css.match(vendorPrefixRe) || []).length
css = css.replace(vendorPrefixRe, '')

// --- Phase 4: collapse blank lines ---
css = css.replace(/\n{3,}/g, '\n\n').trim() + '\n'

const validation = validateCss(css)
if (!validation.valid) {
  console.error('Abort: invalid CSS after cleanup', validation)
  process.exit(1)
}

const newLines = css.split('\n').length
const newImportant = (css.match(/!important/g) || []).length

console.log(`Lines: ${originalLines} -> ${newLines} (${originalLines - newLines} removed)`)
console.log(`!important: ${originalImportant} -> ${newImportant} (removed ${importantRemoved})`)
console.log(`Redundant [data-theme="light"] blocks removed: ${lightRemoved}`)
console.log(`Redundant [data-theme="dark"] blocks removed: ${darkRemoved}`)
console.log(`Dark theme selectors merged: ${mergedDark}`)
console.log(`Vendor prefix lines removed: ${vendorRemoved}`)

if (!dryRun) {
  fs.writeFileSync(cssPath, css, 'utf8')
  console.log(`Wrote ${cssPath}`)
} else {
  console.log('Dry run — no file written')
}
