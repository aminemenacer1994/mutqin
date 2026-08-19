/**
 * Broad scan for likely hardcoded user-facing strings across Mutqin.
 * Usage: node scripts/i18n-scan-hardcoded-all.mjs
 *        node scripts/i18n-scan-hardcoded-all.mjs --json
 */
import fs from 'node:fs'
import path from 'node:path'

const JSON_OUT = process.argv.includes('--json')
const ROOT = process.cwd()

const SKIP_DIRS = new Set(['node_modules', 'vendor', 'public', 'storage', 'tests', 'scripts/.i18n'])
const ALLOW_BRAND = new Set(['Mutqin', 'Bismillah', 'Al-Fatihah', 'DemoPass1!'])

/** @type {Array<{file: string, line: number, text: string, kind: string}>} */
const findings = []

function rel(file) {
  return path.relative(ROOT, file).replace(/\\/g, '/')
}

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP_DIRS.has(entry.name)) continue
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) walk(full, out)
    else out.push(full)
  }
  return out
}

function looksLikeEnglishUi(text) {
  const t = text.trim()
  if (t.length < 4 || t.length > 140) return false
  if (!/[A-Za-z]{4,}/.test(t)) return false
  if (ALLOW_BRAND.has(t)) return false
  if (/^https?:|^\/\/|^data-|^bi |^bi-|^col-|^btn-|^mutqin|^--/.test(t)) return false
  if (/^[0-9$£%#]/.test(t)) return false
  if (/^\{|\}$/.test(t)) return false
  if (/^[a-z]+(?:_[a-z]+)+$/.test(t)) return false
  return true
}

function add(file, line, text, kind) {
  if (!looksLikeEnglishUi(text)) return
  findings.push({ file: rel(file), line, text: text.trim(), kind })
}

function scanBlade(file, content) {
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    if (/\{\{\s*__\(/.test(line) || /@json\(__\(/.test(line)) return
    for (const m of line.matchAll(/(?:aria-label|title|placeholder)="([^"]{4,120})"/g)) {
      add(file, index + 1, m[1], 'blade-attr')
    }
    for (const m of line.matchAll(/>([^<{][^<]{4,100})</g)) {
      const text = m[1].trim()
      if (text.includes('{{') || text.includes('@')) continue
      add(file, index + 1, text, 'blade-text')
    }
  })
}

function scanPhp(file, content) {
  if (file.includes('/lang/')) return
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    if (/__\(|trans\(/.test(line)) return
    for (const m of line.matchAll(/(?:message|label|title)\s*=>\s*'([^'\\]{8,120})'/g)) {
      add(file, index + 1, m[1], 'php-array')
    }
    for (const m of line.matchAll(/abort\(\d+,\s*'([^'\\]{8,120})'/g)) {
      add(file, index + 1, m[1], 'php-abort')
    }
  })
}

function scanJs(file, content) {
  if (/locales\/.*\.json$/.test(file)) return
  const lines = content.split('\n')
  lines.forEach((line, index) => {
    if (/^\s*\/\//.test(line) || /^\s*\*/.test(line)) return
    if (/\bt\(|translateOrFallback|uiLabel\(|__\(/.test(line)) return
    if (/console\.(log|warn|error)/.test(line)) return
    for (const m of line.matchAll(/(?:showBanner|window\.confirm|alert)\(\s*['"]([^'"]{8,120})['"]/g)) {
      add(file, index + 1, m[1], 'js-toast')
    }
    for (const m of line.matchAll(/(?:return|innerHTML\s*=\s*)\s*[`'"]\s*([A-Z][^`'"]{8,120})/g)) {
      if (line.includes('this.t(')) continue
      add(file, index + 1, m[1], 'js-return')
    }
    for (const m of line.matchAll(/(?:aria-label|title|placeholder):\s*['"]([^'"]{4,120})['"]/g)) {
      add(file, index + 1, m[1], 'js-attr')
    }
  })
}

function scanVueTemplate(file, content) {
  const template = content.match(/<template>([\s\S]*?)<\/template>/)?.[1] || ''
  const lines = template.split('\n')
  lines.forEach((line, index) => {
    if (/\{\{|\bt\(/.test(line)) return
    for (const m of line.matchAll(/(?:aria-label|title|placeholder)="([^"]{4,120})"/g)) {
      add(file, index + 1, m[1], 'vue-attr')
    }
    for (const m of line.matchAll(/>([^<{][^<]{4,100})</g)) {
      add(file, index + 1, m[1].trim(), 'vue-text')
    }
  })
}

const targets = walk(ROOT).filter((file) => {
  return /\.(blade\.php|php|vue|js|mjs)$/.test(file)
    && !file.includes('/tests/')
    && !file.includes('i18n-scan-hardcoded')
    && !file.includes('i18n-check-hardcoded')
})

for (const file of targets) {
  const content = fs.readFileSync(file, 'utf8')
  if (file.endsWith('.blade.php')) scanBlade(file, content)
  else if (file.endsWith('.php')) scanPhp(file, content)
  else if (file.endsWith('.vue')) {
    scanVueTemplate(file, content)
    scanJs(file, content)
  } else if (/\.(js|mjs)$/.test(file)) scanJs(file, content)
}

const deduped = []
const seen = new Set()
for (const row of findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)) {
  const key = `${row.file}:${row.line}:${row.text}`
  if (seen.has(key)) continue
  seen.add(key)
  deduped.push(row)
}

if (JSON_OUT) {
  console.log(JSON.stringify({ count: deduped.length, findings: deduped }, null, 2))
} else {
  console.log(`Potential hardcoded UI strings: ${deduped.length}`)
  deduped.slice(0, 80).forEach(({ file, line, text, kind }) => {
    console.log(`  ${file}:${line} [${kind}] "${text}"`)
  })
  if (deduped.length > 80) console.log(`  … and ${deduped.length - 80} more`)
}

process.exit(deduped.length ? 1 : 0)
