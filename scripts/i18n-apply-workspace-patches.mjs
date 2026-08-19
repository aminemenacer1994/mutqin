/**
 * Apply WORKSPACE_PATCHES then REMAINING_PATCHES to locale JSON files.
 * Urdu (ur) uses Arabic (ar) patches for both stages.
 *
 * Usage: node scripts/i18n-apply-workspace-patches.mjs
 */
import fs from 'node:fs'
import path from 'node:path'
import { WORKSPACE_PATCHES } from './i18n-workspace-patches.mjs'
import { REMAINING_PATCHES } from './i18n-workspace-remaining-patches.mjs'

const LOCALES_DIR = path.resolve('resources/js/locales')
const TARGET_LOCALES = ['ar', 'es', 'id', 'tr', 'ur']

function setAt(obj, keyPath, value) {
  const parts = keyPath.split('.')
  let cursor = obj
  for (let i = 0; i < parts.length - 1; i += 1) {
    const part = parts[i]
    if (!cursor[part] || typeof cursor[part] !== 'object' || Array.isArray(cursor[part])) cursor[part] = {}
    cursor = cursor[part]
  }
  cursor[parts[parts.length - 1]] = value
}

/** @type {Record<string, number>} */
const counts = {}

for (const locale of TARGET_LOCALES) {
  const file = path.join(LOCALES_DIR, `${locale}.json`)
  const tree = JSON.parse(fs.readFileSync(file, 'utf8'))
  const patch = locale === 'ur' ? WORKSPACE_PATCHES.ar : WORKSPACE_PATCHES[locale]

  if (!patch) {
    console.warn(`No patch for locale: ${locale}`)
    counts[locale] = 0
    continue
  }

  let applied = 0
  for (const [key, value] of Object.entries(patch)) {
    setAt(tree, key, value)
    applied += 1
  }

  const remaining = locale === 'ur' ? REMAINING_PATCHES.ar : REMAINING_PATCHES[locale]
  if (remaining) {
    for (const [key, value] of Object.entries(remaining)) {
      setAt(tree, key, value)
      applied += 1
    }
  }

  fs.writeFileSync(file, `${JSON.stringify(tree, null, 2)}\n`)
  counts[locale] = applied
  console.log(`${locale}: patched ${applied} keys${locale === 'ur' ? ' (from ar)' : ''}`)
}

console.log('Patch counts:', counts)
