import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-validation.test.mjs')) {
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

const validation = await loadModule('resources/js/engine/recitation_validation.js')
const fixturesMod = await loadModule('tests/js/fixtures/recitation-live-validation-fixtures.mjs')

const { buildRecognitionValidationReport } = validation.namespace
const { recitationLiveValidationFixtures } = fixturesMod.namespace

for (const fixture of recitationLiveValidationFixtures) {
  const report = buildRecognitionValidationReport({
    rawEvents: fixture.events,
    targetText: fixture.targetText,
    stabilizedWords: [],
    replays: 10,
    metadata: {
      sessionId: `fixture-${fixture.id}`,
      audioHash: `audio-${fixture.id}`,
      provider: 'speechmatics',
      kind: 'recitation',
      timestamp: '2026-06-11T00:00:00.000Z'
    }
  })

  assert.equal(report.passed, true, `${fixture.id} should pass deterministic validation`)
  assert.equal(report.replayPassCount, 10, `${fixture.id} should pass all replay attempts`)
  assert.equal(report.variantPassCount, report.variants.length, `${fixture.id} should pass all stream variants`)
  assert.equal(report.summary.accuracyScore, fixture.expected.accuracyScore, `${fixture.id} accuracy score mismatch`)
  assert.equal(report.summary.completionPercentage, fixture.expected.completionPercentage, `${fixture.id} completion mismatch`)
  assert.equal(report.summary.missingCount, fixture.expected.missing, `${fixture.id} missing count mismatch`)
  assert.equal(report.summary.extraCount, fixture.expected.extra, `${fixture.id} extra count mismatch`)
  assert.equal(report.summary.partialCount, fixture.expected.partial, `${fixture.id} partial count mismatch`)
  assert.equal(report.summary.incorrectCount, fixture.expected.incorrect, `${fixture.id} incorrect count mismatch`)
}

console.log('Recitation validation audit fixtures passed')
