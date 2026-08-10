/**
 * Regression: AI memorisation "Words shown" hide mask must never flash full text
 * across idle → start → listening → stop → processing → result handoff.
 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  DIFFICULTY_PERCENTS,
  DEFAULT_DIFFICULTY_PERCENT,
  selectHiddenWordIndexes,
  buildHiddenWordSeed,
  normaliseDifficultyPercent,
} from '../../resources/js/scripts/memorisationDetection/hiddenWords.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '../..')
const memorisationJs = readFileSync(join(root, 'resources/js/views/Memorisation.js'), 'utf8')
const modalVue = readFileSync(join(root, 'resources/js/components/AiMemorisationDetectionModal.vue'), 'utf8')

function extractMethod(source, name) {
  const re = new RegExp(`${name}\\([^)]*\\)\\s*\\{[\\s\\S]*?\\n    \\},`)
  return source.match(re)?.[0] || ''
}

// Hide-percent options include every product choice (incl. 100% hide / 0% shown).
{
  assert.deepEqual([...DIFFICULTY_PERCENTS], [10, 25, 50, 75, 100])
  assert.equal(DEFAULT_DIFFICULTY_PERCENT, 100)
  for (const pct of DIFFICULTY_PERCENTS) {
    assert.equal(normaliseDifficultyPercent(pct), pct)
  }
}

// Mask selection stays stable for each percentage across identical seeds.
{
  const wordCount = 40
  for (const difficulty of DIFFICULTY_PERCENTS) {
    const seed = buildHiddenWordSeed({
      sessionId: 'test',
      surahNumber: 1,
      startAyah: 1,
      endAyah: 7,
      difficulty,
      attempt: 0,
    })
    const a = selectHiddenWordIndexes(wordCount, difficulty, seed)
    const b = selectHiddenWordIndexes(wordCount, difficulty, seed)
    assert.deepEqual(a, b, `mask must be deterministic for hide ${difficulty}%`)
    if (difficulty === 100) {
      assert.equal(a.length, wordCount, '100% hide must mask every word')
    } else {
      assert.ok(a.length > 0, `hide ${difficulty}% must hide at least one word`)
      assert.ok(a.length < wordCount || difficulty >= 100)
    }
  }
}

// Builder must not gate masking on the live/recording flag.
{
  const fn = extractMethod(memorisationJs, 'buildAmdMushafHtml')
  assert.match(fn, /const maskOn = !this\.amdPeekActive\b/, 'maskOn must ignore live stage')
  assert.doesNotMatch(
    fn,
    /maskOn = !this\.amdPeekActive && live/,
    'mask must not drop when live=false (stop/processing flash)',
  )
  assert.match(
    fn,
    /resolveAmdWordVisual\(statusEntry, true\)/,
    'mask attempt check must use live semantics so pending→omitted cannot unmask',
  )
}

// Surface sync must keep live mask semantics through endingSoon/processing.
{
  const fn = extractMethod(memorisationJs, 'syncAmdMushafSurface')
  assert.match(fn, /const live = this\.amdStage !== AMD_STAGES\.COMPLETE/)
  assert.doesNotMatch(
    fn,
    /amdEndingSoon/,
    'endingSoon must not force an unmasked result rebuild while the modal is open',
  )
}

// Modal must not force-replace mushaf HTML on every stage change.
{
  assert.doesNotMatch(
    modalVue,
    /stage\(\)\s*\{[\s\S]*?scheduleMushafHtml\(this\.ayahHtml,\s*true\)/,
    'stage watcher must not force a mushaf DOM replace (flash on start/stop)',
  )
  assert.match(
    modalVue,
    /ayahHtml\(html\)\s*\{[\s\S]*?scheduleMushafHtml\(html,\s*true\)/,
    'ayahHtml updates must apply masked HTML immediately',
  )
  assert.match(
    modalVue,
    /keepVisibilityMask/,
    'shell must keep gap/blur mask chrome through processing',
  )
  assert.match(
    modalVue,
    /if \(immediate\)\s*\{\s*apply\(\)/,
    'forced mushaf HTML must apply synchronously (no setTimeout flash frame)',
  )
}

console.log('amd-visibility-mask-persistence.test.mjs: ok')
