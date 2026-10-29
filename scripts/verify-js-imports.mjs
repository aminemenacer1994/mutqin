#!/usr/bin/env node
/**
 * ESLint import/no-unresolved equivalent — fail on broken relative / @ imports in Vue/JS.
 */
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { dirname, extname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const jsRoot = join(root, 'resources/js')

const IMPORT_RE = /\bfrom\s+['"]([^'"]+)['"]/g
const DYNAMIC_IMPORT_RE = /import\s*\(\s*['"]([^'"]+)['"]/g

function walk(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const abs = join(dir, name)
    const st = statSync(abs)
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'locales') continue
      walk(abs, out)
      continue
    }
    if (/\.(vue|js|mjs|cjs)$/.test(name)) out.push(abs)
  }
  return out
}

function resolveImport(specifier, fromFile) {
  if (!specifier.startsWith('.') && !specifier.startsWith('@/')) return null
  const base = specifier.startsWith('@/')
    ? join(jsRoot, specifier.slice(2))
    : resolve(dirname(fromFile), specifier)
  const exts = ['', '.js', '.vue', '.mjs', '.json']
  for (const ext of exts) {
    const candidate = base + ext
    try {
      if (statSync(candidate).isFile()) return candidate
    } catch {
      /* continue */
    }
  }
  if (statSync(base, { throwIfNoEntry: false })?.isDirectory()) {
    for (const index of ['index.js', 'index.vue']) {
      const candidate = join(base, index)
      try {
        if (statSync(candidate).isFile()) return candidate
      } catch {
        /* continue */
      }
    }
  }
  return null
}

function collectImports(source) {
  const specs = []
  for (const re of [IMPORT_RE, DYNAMIC_IMPORT_RE]) {
    re.lastIndex = 0
    let match
    while ((match = re.exec(source))) specs.push(match[1])
  }
  return specs
}

const files = walk(jsRoot)
const errors = []

for (const file of files) {
  const source = readFileSync(file, 'utf8')
  const relFile = file.replace(root + '/', '')
  if (/^resources\/js\/components\/(teacher|shared)\//.test(relFile)) {
    if (/\bfrom\s+['"]\.\.\/scripts\//.test(source) || /import\s*\(\s*['"]\.\.\/scripts\//.test(source)) {
      errors.push(
        `${relFile}: use @/scripts/… instead of ../scripts/… (resolves under components/, not resources/js/)`,
      )
    }
  }
  for (const spec of collectImports(source)) {
    if (!spec.startsWith('.') && !spec.startsWith('@/')) continue
    if (!resolveImport(spec, file)) {
      errors.push(`${file.replace(root + '/', '')}: cannot resolve "${spec}"`)
    }
  }
}

if (errors.length) {
  console.error('Unresolved imports:\n' + errors.join('\n'))
  process.exit(1)
}

console.log(`verify-js-imports: ok (${files.length} files)`)
