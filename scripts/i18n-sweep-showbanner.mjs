/**
 * Extract showBanner() string literals into toasts.* i18n keys and replace calls.
 * Usage: node scripts/i18n-sweep-showbanner.mjs [--write]
 */
import fs from 'node:fs'
import path from 'node:path'

const write = process.argv.includes('--write')
const jsFile = path.resolve('resources/js/views/Memorisation.js')
const structuredFile = path.resolve('scripts/i18n-structured-keys.json')
const src = fs.readFileSync(jsFile, 'utf8')

function slugify(text) {
  return text
    .replace(/\$\{[^}]+\}/g, '')
    .replace(/[^\w\s]/g, ' ')
    .trim()
    .split(/\s+/)
    .slice(0, 6)
    .map((w, i) => (i === 0 ? w.toLowerCase() : w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()))
    .join('')
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 48) || 'message'
}

/** @type {Map<string, { key: string, en: string, params: string[] }>} */
const entries = new Map()

function parseTemplateLiteral(raw) {
  const params = []
  let en = raw
  let idx = 0
  en = en.replace(/\$\{([^}]+)\}/g, (_, expr) => {
    const name = expr.includes('.') ? expr.split('.').pop().replace(/[^a-zA-Z0-9]/g, '') : `p${idx++}`
    params.push(name)
    return `{${name}}`
  })
  return { en, params }
}

const callRe = /showBanner\(\s*(['`])([\s\S]*?)\1(\s*,|\s*\))/g
let match
while ((match = callRe.exec(src)) !== null) {
  const quote = match[1]
  const raw = match[2]
  if (raw.includes('this.t(') || raw.includes('t(')) continue

  let baseSlug = slugify(raw)
  let key = baseSlug
  let n = 2
  const parsed = quote === '`' && raw.includes('${') ? parseTemplateLiteral(raw) : { en: raw, params: [] }

  while ([...entries.values()].some(e => e.key === key && e.en !== parsed.en)) {
    key = `${baseSlug}${n++}`
  }

  if (!entries.has(raw)) {
    entries.set(raw, { key, en: parsed.en, params: parsed.params })
  }
}

const structured = JSON.parse(fs.readFileSync(structuredFile, 'utf8'))
if (!structured.toasts) structured.toasts = {}

for (const { key, en } of entries.values()) {
  if (!structured.toasts[key]) structured.toasts[key] = en
}

let nextSrc = src
for (const [raw, { key, params }] of entries.entries()) {
  const escaped = raw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const quote = raw.includes('`') || raw.includes("'") ? (raw.includes('`') ? '`' : "'") : "'"
  const pattern = new RegExp(`showBanner\\(\\s*${quote}${escaped.replace(/\$\{/g, '\\$\\{')}${quote}`, 'g')

  const replacement = params.length
    ? `showBanner(this.t('toasts.${key}', { ${params.map((p, i) => {
        const exprMatch = raw.match(/\$\{([^}]+)\}/g)
        const expr = exprMatch?.[i]?.slice(2, -1) || p
        return `${p}: ${expr}`
      }).join(', ')} })`
    : `showBanner(this.t('toasts.${key}')`

  nextSrc = nextSrc.replace(pattern, replacement)
}

console.log(`Found ${entries.size} unique showBanner messages`)
console.log(`New toast keys: ${Object.keys(structured.toasts).length}`)

if (write) {
  fs.writeFileSync(structuredFile, `${JSON.stringify(structured, null, 2)}\n`)
  fs.writeFileSync(jsFile, nextSrc)
  console.log('Updated Memorisation.js and i18n-structured-keys.json')
} else {
  console.log('Dry run — pass --write to apply')
  console.log('Sample keys:', [...entries.values()].slice(0, 5).map(e => `toasts.${e.key}`).join(', '))
}
