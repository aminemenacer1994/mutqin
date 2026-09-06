import test from 'node:test'
import assert from 'node:assert/strict'
import {
  QURAN_FONT_IDS,
  normaliseQuranFontId,
  resolveQuranFontFamily,
  readPersistedQuranFontId,
  applyQuranFontCssVariable,
  bootPersistedQuranFont,
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

test('readPersistedQuranFontId prefers owner-scoped uiState over default', () => {
  const map = new Map([
    ['mutqin.uiState.42', JSON.stringify({ quranFont: 'naskh' })],
    ['mutqin.uiState', JSON.stringify({ quranFont: 'amiri' })],
  ])
  const storage = {
    getItem(key) { return map.has(key) ? map.get(key) : null },
  }
  assert.equal(readPersistedQuranFontId({ userId: 42, storage }), 'naskh')
  assert.equal(readPersistedQuranFontId({ userId: null, storage }), 'amiri')
  assert.equal(readPersistedQuranFontId({ storage: { getItem() { return null } } }), 'uthmanic')
})

test('bootPersistedQuranFont applies CSS vars without swapping to another Mutqin font', () => {
  const props = new Map()
  const attrs = new Map()
  const root = {
    style: {
      setProperty(key, value) { props.set(key, value) },
    },
    setAttribute(key, value) { attrs.set(key, value) },
    removeAttribute(key) { attrs.delete(key) },
  }
  const storage = {
    getItem(key) {
      if (key === 'mutqin.uiState.guest') return JSON.stringify({ quranFont: 'lateef' })
      return null
    },
  }
  const id = bootPersistedQuranFont({ userId: 'guest', storage, root })
  assert.equal(id, 'lateef')
  assert.match(props.get('--quran-font'), /Lateef/)
  assert.equal(attrs.get('data-quran-font'), 'lateef')
  assert.equal(attrs.has('data-quran-font-ready'), false)
  applyQuranFontCssVariable('lateef', root)
  assert.match(props.get('--font-ar'), /Lateef/)
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
