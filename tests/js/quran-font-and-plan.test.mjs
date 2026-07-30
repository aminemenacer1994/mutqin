import test from 'node:test'
import assert from 'node:assert/strict'
import {
  QURAN_FONT_IDS,
  normaliseQuranFontId,
  resolveQuranFontFamily,
} from '../../resources/js/scripts/quran/quranFonts.js'
import {
  PLAN_STATUS,
  buildMemorisationPlan,
  memorisationPlanToSettings,
  memorisationPlansEqual,
  withPlanStatus,
} from '../../resources/js/scripts/recommendations/memorisationPlan.js'

test('normaliseQuranFontId maps uthmani typo and unknowns', () => {
  assert.equal(normaliseQuranFontId('uthmani'), 'uthmanic')
  assert.equal(normaliseQuranFontId('AMIRI'), 'amiri')
  assert.equal(normaliseQuranFontId('nope'), 'uthmanic')
  assert.deepEqual([...QURAN_FONT_IDS], ['uthmanic', 'amiri', 'naskh', 'scheherazade', 'lateef'])
})

test('resolveQuranFontFamily returns distinct stacks per font', () => {
  const amiri = resolveQuranFontFamily('amiri')
  const naskh = resolveQuranFontFamily('naskh')
  const uthmanic = resolveQuranFontFamily('uthmanic')
  assert.match(amiri, /Amiri Quran/)
  assert.match(naskh, /Noto Naskh Arabic/)
  assert.match(uthmanic, /UthmanicHafs|KFGQPC/)
  assert.notEqual(amiri, naskh)
})

test('buildMemorisationPlan consolidates recommendation settings', () => {
  const plan = buildMemorisationPlan({
    settings: {
      technique: 'talqin',
      complementary_technique: 'chaining',
      playback_speed: 0.75,
      repetitions: 5,
      focus_enabled: false,
      talqin_enabled: true,
      chaining_enabled: true,
      chaining_method: 'linking',
    },
    ayahRange: { from: 1, to: 3, surah_id: 1, focus_ayahs: [2] },
  })

  assert.equal(plan.playbackSpeed, 0.75)
  assert.equal(plan.repetitions, 5)
  assert.deepEqual(plan.techniqueIds, ['talqin', 'chaining'])
  assert.equal(plan.guidanceMode, 'talqin')
  assert.equal(plan.rangeStart, 1)
  assert.equal(plan.rangeEnd, 3)
  assert.deepEqual(plan.focusAyahs, [2])
  assert.equal(plan.status, PLAN_STATUS.RECOMMENDED)

  const settings = memorisationPlanToSettings(plan)
  assert.equal(settings.technique, 'talqin')
  assert.equal(settings.complementary_technique, 'chaining')
  assert.equal(settings.playback_speed, 0.75)
  assert.equal(settings.repetitions, 5)
  assert.equal(settings.talqin_enabled, true)
  assert.equal(settings.chaining_enabled, true)

  const applied = withPlanStatus(plan, PLAN_STATUS.APPLIED)
  assert.equal(applied.status, PLAN_STATUS.APPLIED)
  assert.ok(memorisationPlansEqual(plan, applied))
})
