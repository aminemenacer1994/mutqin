import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import { isValidVerseReference } from '../../resources/js/scripts/mutashabihat/pairCatalog.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const pairs = JSON.parse(readFileSync(join(root, 'resources/data/mutashabihat_pairs.json'), 'utf8'))

const forbidden = new Set(['2:163|3:64', '3:64|2:163'])
let invalid = 0
for (const entry of pairs) {
  const [s1, a1] = entry.a
  const [s2, a2] = entry.b
  if (!isValidVerseReference(s1, a1) || !isValidVerseReference(s2, a2)) {
    invalid += 1
  }
  const keys = [`${s1}:${a1}`, `${s2}:${a2}`].sort().join('|')
  assert.ok(!forbidden.has(keys), `removed invalid pair still in catalog: ${keys}`)
}
assert.equal(invalid, 0, 'every pair must reference valid Hafs ayahs')

const forbiddenPairs = [
  ['2:255', '3:18'],
  ['2:61', '7:162'],
]
for (const [left, right] of forbiddenPairs) {
  const keys = [left, right].sort().join('|')
  const found = pairs.some((entry) => {
    const k = [`${entry.a[0]}:${entry.a[1]}`, `${entry.b[0]}:${entry.b[1]}`].sort().join('|')
    return k === keys
  })
  assert.ok(!found, `catalog must not include low-overlap pair ${keys}`)
}

console.log('mutashabihat-catalog.test.mjs passed')
