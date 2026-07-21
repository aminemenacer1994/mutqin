import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-last-word.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') || specifier.endsWith('.mjs') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link(child => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const analysis = await loadModule('resources/js/scripts/engine/recitation_analysis.js')
const {
  stripArabicDefiniteArticle,
  getRecitationWordSimilarity,
  buildRealtimePreviewAlignment,
  createWordsFromTranscript,
} = analysis.namespace

assert.equal(stripArabicDefiniteArticle('العالمين'), 'عالمين')
assert.equal(getRecitationWordSimilarity('العالمين', 'عالمين'), 1)

const fatihaRange = 'بسم الله الرحمن الرحيم الحمد لله رب العالمين الرحمن الرحيم'
const heardThroughAyah2 = createWordsFromTranscript(
  'بسم الله الرحمن الرحيم الحمد لله رب عالمين'
)
const preview = buildRealtimePreviewAlignment(fatihaRange, heardThroughAyah2, {
  strictProgression: true,
})
const alamin = preview.statuses.find(word => word.targetWord === 'العالمين')
assert.ok(alamin, 'expected العالمين target in statuses')
assert.equal(alamin.status, 'correct', 'article-stripped last word should count as correct')
assert.ok(
  preview.progression.currentIndex > alamin.targetIndex,
  'strict progression should advance past a correct ayah-final word'
)

const nearMiss = buildRealtimePreviewAlignment(
  'اهدنا الصراط المستقيم',
  createWordsFromTranscript('اهدنا السراط'),
  { strictProgression: true }
)
assert.equal(
  nearMiss.statuses.find(word => word.targetWord === 'الصراط')?.status,
  'partial',
  'common ص/س substitution should remain partial'
)

const partialAdvance = buildRealtimePreviewAlignment(
  'الحمد لله رب العالمين الرحمن',
  createWordsFromTranscript('الحمد لله رب العالمي الرحمن'),
  { strictProgression: true }
)
const lastHeard = partialAdvance.statuses.find(word => word.targetWord === 'العالمين')
assert.ok(['correct', 'partial'].includes(lastHeard?.status))
assert.notEqual(
  partialAdvance.statuses.find(word => word.targetWord === 'الرحمن')?.status,
  'pending',
  'partial/near-miss on a last word must not lock the next ayah'
)

console.log('Recitation last-word matching checks passed')
