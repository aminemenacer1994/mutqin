/**
 * Detect CSS class selectors in Memorisation.css not referenced in Vue/JS sources.
 * Usage: node scripts/detect-dead-memorisation-css.mjs [--remove]
 */
import fs from 'node:fs'
import path from 'node:path'

const cssPath = path.resolve('resources/js/views/Memorisation.css')
const sourceFiles = [
  path.resolve('resources/js/views/Memorisation.vue'),
  path.resolve('resources/js/views/Memorisation.js'),
  path.resolve('resources/js/scripts/memorisationRuntime.js'),
]
const sources = sourceFiles.map(p => fs.readFileSync(p, 'utf8')).join('\n')

const css = fs.readFileSync(cssPath, 'utf8')
const remove = process.argv.includes('--remove')

function extractReferencedClasses(text) {
  const referenced = new Set()
  // class="foo bar" and class='foo'
  for (const m of text.matchAll(/\bclass="([^"]+)"/g)) {
    m[1].split(/\s+/).forEach(t => referenced.add(t))
  }
  for (const m of text.matchAll(/\bclass='([^']+)'/g)) {
    m[1].split(/\s+/).forEach(t => referenced.add(t))
  }
  // :class="{ foo: cond, 'bar-baz': cond }"
  for (const m of text.matchAll(/:class="([^"]+)"/g)) {
    const block = m[1]
    for (const k of block.matchAll(/['"]?([a-zA-Z][\w-]*)['"]?\s*:/g)) referenced.add(k[1])
    for (const k of block.matchAll(/['"]([a-zA-Z][\w-]*)['"]/g)) referenced.add(k[1])
  }
  // classList operations
  for (const m of text.matchAll(/classList\.(?:add|remove|toggle)\(\s*['"]([a-zA-Z][\w-]*)['"]/g)) {
    referenced.add(m[1])
  }
  // String literals that look like BEM class names (contains hyphen, starts with letter)
  for (const m of text.matchAll(/['"`]([a-z][a-z0-9]*(?:-[a-z0-9]+)+)['"`]/g)) {
    referenced.add(m[1])
  }
  return referenced
}

const referenced = extractReferencedClasses(sources)

/** Extract rule blocks for single-class selectors only (safe to remove) */
const ruleRe = /(?:^|\n)(\.([a-zA-Z][\w-]*(?:\.[a-zA-Z][\w-]*)*))\s*\{[^}]*\}/g
/** @type {{ selector: string, class: string, block: string }[]} */
const rules = []
let rm
while ((rm = ruleRe.exec(css)) !== null) {
  const selector = rm[1]
  const cls = rm[2]
  // Only simple single-class selectors (no spaces, no pseudo)
  if (selector.includes(' ') || selector.includes(':') || selector.includes('[')) continue
  rules.push({ selector, class: cls.split('.').filter(Boolean).pop() || cls, block: rm[0] })
}

const dead = rules.filter(r => {
  if (referenced.has(r.class)) return false
  if (sources.includes(r.class)) return false
  // Keep if any referenced class contains this as a distinct segment
  for (const ref of referenced) {
    if (ref.includes(r.class) && ref !== r.class) return false
  }
  return true
})
console.log(`Referenced classes: ${referenced.size}`)
console.log(`Simple single-class rules: ${rules.length}`)
console.log(`Potentially dead (simple only): ${dead.length}`)

if (remove && dead.length > 0) {
  let next = css
  // Remove from end to start to preserve indices
  const sorted = [...dead].sort((a, b) => css.indexOf(b.block) - css.indexOf(a.block))
  for (const d of sorted) {
    next = next.replace(d.block, '')
  }
  next = next.replace(/\n{3,}/g, '\n\n')

  // Validate: no broken comments or unbalanced braces
  let depth = 0
  let inComment = false
  for (let i = 0; i < next.length; i++) {
    if (!inComment && next[i] === '/' && next[i + 1] === '*') { inComment = true; i++; continue }
    if (inComment && next[i] === '*' && next[i + 1] === '/') { inComment = false; i++; continue }
    if (inComment) continue
    if (next[i] === '{') depth++
    if (next[i] === '}') depth--
  }
  if (inComment || depth !== 0) {
    console.error('Aborting remove: would produce invalid CSS (unclosed comment or brace mismatch)')
    process.exit(1)
  }

  fs.writeFileSync(cssPath, next, 'utf8')
  console.log(`Removed ${dead.length} dead rule blocks`)
} else if (dead.length) {
  console.log('Sample dead classes:', dead.slice(0, 20).map(d => d.class).join(', '))
}
