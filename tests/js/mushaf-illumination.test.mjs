import assert from 'node:assert/strict'
import test from 'node:test'
import {
  normalizeMushafIllumTheme,
  defaultIllumThemeForAppTheme,
  mushafJuzTitle,
  mushafThemeMeta,
  toArabicIndicNumber,
  MUSHAF_ILLUM_THEME_VALUES
} from '../../resources/js/scripts/mushaf/mushafIllumination.js'

test('theme dropdown exposes classic plus five illuminated palettes', () => {
  assert.deepEqual(MUSHAF_ILLUM_THEME_VALUES, [
    'classic',
    'azure',
    'gold',
    'emerald',
    'jewel',
    'night'
  ])
})

test('legacy mushaf backgrounds migrate to illuminated themes', () => {
  assert.equal(normalizeMushafIllumTheme('warm'), 'gold')
  assert.equal(normalizeMushafIllumTheme('paper'), 'gold')
  assert.equal(normalizeMushafIllumTheme('contrast'), 'classic')
  assert.equal(normalizeMushafIllumTheme('mist'), 'emerald')
  assert.equal(normalizeMushafIllumTheme('rose'), 'jewel')
  assert.equal(normalizeMushafIllumTheme('classic'), 'classic')
  assert.equal(normalizeMushafIllumTheme('azure'), 'azure')
})

test('app theme maps to illuminated defaults', () => {
  assert.equal(defaultIllumThemeForAppTheme('dark'), 'night')
  assert.equal(defaultIllumThemeForAppTheme('sepia'), 'gold')
  assert.equal(defaultIllumThemeForAppTheme('light'), 'classic')
})

test('theme meta resolves dropdown labels', () => {
  assert.equal(mushafThemeMeta('classic').label, 'Standard white')
  assert.equal(mushafThemeMeta('jewel').description, 'Illuminated green opening page')
})

test('Arabic page and juz labels', () => {
  assert.equal(toArabicIndicNumber(3), '٣')
  assert.equal(toArabicIndicNumber(604), '٦٠٤')
  assert.match(mushafJuzTitle(1), /الأَوَّلُ/)
})
