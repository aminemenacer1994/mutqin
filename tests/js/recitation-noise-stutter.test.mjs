import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import path from 'node:path'
import vm from 'node:vm'

const root = process.cwd()
const context = vm.createContext({ console, Date, Math, JSON, Array, Object, Number, String, Boolean })
const moduleCache = new Map()

async function loadModule(specifier, referrer = path.join(root, 'tests/js/recitation-noise-stutter.test.mjs')) {
  const resolved = specifier.startsWith('.')
    ? path.resolve(path.dirname(referrer), `${specifier}${specifier.endsWith('.js') || specifier.endsWith('.mjs') ? '' : '.js'}`)
    : path.resolve(root, specifier)

  if (moduleCache.has(resolved)) return moduleCache.get(resolved)
  const source = await fs.readFile(resolved, 'utf8')
  const mod = new vm.SourceTextModule(source, { context, identifier: resolved })
  moduleCache.set(resolved, mod)
  await mod.link((child) => loadModule(child, resolved))
  await mod.evaluate()
  return mod
}

const analysis = await loadModule('resources/js/scripts/engine/recitation_analysis.js')
const delays = await loadModule('resources/js/scripts/memorisationDetection/speechmaticsDelays.js')

const {
  isLikelyTransientNoiseWord,
  isLikelyOffTargetTransientNoise,
  shouldSkipLearnerStutterRepeat,
  buildRealtimePreviewAlignment,
} = analysis.namespace

const { resolveAdaptiveSpeechmaticsDelays } = delays.namespace

// Transient noise — duration and short-token heuristics.
{
  assert.equal(isLikelyTransientNoiseWord({ word: '', confidence: 0.9 }), true)
  assert.equal(isLikelyTransientNoiseWord({ word: 'ا', confidence: 0.4 }), true)
  assert.equal(
    isLikelyTransientNoiseWord({ word: 'هم', confidence: 0.2, start: 1.0, end: 1.05 }),
    true,
    'very short low-confidence burst',
  )
  assert.equal(
    isLikelyTransientNoiseWord({ word: 'الله', confidence: 0.82, start: 0.0, end: 0.55 }),
    false,
    'real words with decent confidence pass through',
  )
}

// Off-target noise — unrelated low-confidence tokens near the cursor.
{
  const targets = ['بسم', 'الله', 'الرحمن', 'الرحيم']
  assert.equal(
    isLikelyOffTargetTransientNoise({ word: 'zzz', confidence: 0.25 }, targets, 1),
    true,
    'garbage token with no similarity is skipped',
  )
  assert.equal(
    isLikelyOffTargetTransientNoise({ word: 'الرحمن', confidence: 0.31 }, targets, 2),
    false,
    'near-target word is kept even with low confidence',
  )
  assert.equal(
    isLikelyOffTargetTransientNoise({ word: 'الله', confidence: 0.62 }, targets, 1),
    false,
    'medium confidence always passes',
  )
}

// Stutter repeats — previous target word or quick duplicate emit.
{
  const targets = ['بسم', 'الله', 'الرحمن']
  assert.equal(
    shouldSkipLearnerStutterRepeat(
      [
        { word: 'بسم', start: 0.0, end: 0.4 },
        { word: 'الله', start: 0.5, end: 0.9 },
        { word: 'الله', start: 0.95, end: 1.2 },
      ],
      2,
      targets,
      2,
    ),
    true,
    're-saying previous target while advanced',
  )
  assert.equal(
    shouldSkipLearnerStutterRepeat(
      [{ word: 'الله', start: 0.0, end: 0.3 }, { word: 'الله', start: 0.32, end: 0.5 }],
      1,
      targets,
      1,
    ),
    true,
    'duplicate within 650ms gap',
  )
  assert.equal(
    shouldSkipLearnerStutterRepeat([{ word: 'بسم' }, { word: 'الله' }], 1, targets, 1),
    false,
    'genuine next word is not a stutter',
  )
}

// Adaptive Speechmatics tiers.
{
  const general = resolveAdaptiveSpeechmaticsDelays({ amdLive: false })
  assert.equal(general.tier, 'general')
  assert.equal(general.maxDelaySeconds, 0.7)

  const fast = resolveAdaptiveSpeechmaticsDelays({ amdLive: true, paceFactor: 0.7 })
  assert.equal(fast.tier, 'fast')
  assert.equal(fast.maxDelaySeconds, 0.7)

  const balanced = resolveAdaptiveSpeechmaticsDelays({ amdLive: true, paceFactor: 1 })
  assert.equal(balanced.tier, 'balanced')
  assert.equal(balanced.maxDelaySeconds, 0.7)

  const slow = resolveAdaptiveSpeechmaticsDelays({ amdLive: true, paceFactor: 1.4, tajweedHeavy: true })
  assert.equal(slow.tier, 'slow')
  assert.equal(slow.maxDelaySeconds, 0.9)

  const postSessionSlow = resolveAdaptiveSpeechmaticsDelays({ live: true, paceFactor: 1.4, tajweedHeavy: true })
  assert.equal(postSessionSlow.tier, 'slow')
  assert.equal(postSessionSlow.maxDelaySeconds, 0.9)
}

// Wiring: Memorisation uses pace-aware Speechmatics config for AMD.
{
  const js = await fs.readFile(path.join(root, 'resources/js/views/Memorisation.js'), 'utf8')
  assert.match(js, /resolveAmdSpeechmaticsDelays\(/)
  assert.match(js, /resolveAdaptiveSpeechmaticsDelays\(/)
  assert.match(
    analysis.namespace.buildRealtimePreviewAlignment.toString(),
    /isLikelyOffTargetTransientNoise/,
    'alignment loop filters off-target noise before matching',
  )
}

console.log('recitation-noise-stutter.test.mjs: ok')
