import { TAJWEED_CLASS_TO_RULE, TAJWEED_COLOUR_HEX } from '../tajweedPracticeCheck/catalog.js'

/**
 * Tajweed Colour Guide — one entry per coloured rule Mutqin already paints.
 * Colours come from TAJWEED_COLOUR_HEX; class names match existing mushaf CSS.
 *
 * @typedef {{ text: string, className?: string }} TajweedGuideExamplePart
 * @typedef {{
 *   id: string,
 *   colourId: keyof typeof TAJWEED_COLOUR_HEX,
 *   colourHex: string,
 *   className: string,
 *   example: TajweedGuideExamplePart[],
 * }} TajweedColourGuideRule
 */

/** @type {readonly TajweedColourGuideRule[]} */
export const TAJWEED_COLOUR_GUIDE_RULES = Object.freeze([
  {
    id: 'ghunnah',
    colourId: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    className: 'tajweed-ghn',
    example: Object.freeze([
      { text: 'إِ' },
      { text: 'نَّ', className: 'tajweed-ghn' },
    ]),
  },
  {
    id: 'idghamGhunnah',
    colourId: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    className: 'tajweed-idgh_ghn',
    example: Object.freeze([
      { text: 'مَ' },
      { text: 'ن يَ', className: 'tajweed-idgh_ghn' },
      { text: 'عْمَلْ' },
    ]),
  },
  {
    id: 'iqlab',
    colourId: 'green',
    colourHex: TAJWEED_COLOUR_HEX.green,
    className: 'tajweed-iqlb',
    example: Object.freeze([
      { text: 'مِ' },
      { text: 'نۢ بَ', className: 'tajweed-iqlb' },
      { text: 'عْدِ' },
    ]),
  },
  {
    id: 'ikhfa',
    colourId: 'purple',
    colourHex: TAJWEED_COLOUR_HEX.purple,
    className: 'tajweed-ikhf',
    example: Object.freeze([
      { text: 'مِ' },
      { text: 'ن قَ', className: 'tajweed-ikhf' },
      { text: 'بْلُ' },
    ]),
  },
  {
    id: 'idghamNoGhunnah',
    colourId: 'purple',
    colourHex: TAJWEED_COLOUR_HEX.purple,
    className: 'tajweed-idgh_w_ghn',
    example: Object.freeze([
      { text: 'مِ' },
      { text: 'ن لَّ', className: 'tajweed-idgh_w_ghn' },
      { text: 'دُنْهُ' },
    ]),
  },
  {
    id: 'ikhfaShafawi',
    colourId: 'purple',
    colourHex: TAJWEED_COLOUR_HEX.purple,
    className: 'tajweed-ikhf_shfw',
    example: Object.freeze([
      { text: 'تَرْمِيهِ' },
      { text: 'م بِ', className: 'tajweed-ikhf_shfw' },
      { text: 'حِجَارَةٍ' },
    ]),
  },
  {
    id: 'qalqalah',
    colourId: 'orange',
    colourHex: TAJWEED_COLOUR_HEX.orange,
    className: 'tajweed-qlq',
    example: Object.freeze([
      { text: 'قَ' },
      { text: 'دْ', className: 'tajweed-qlq' },
    ]),
  },
  {
    id: 'maddNormal',
    colourId: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    className: 'tajweed-madda_normal',
    example: Object.freeze([
      { text: 'قَ' },
      { text: 'ا', className: 'tajweed-madda_normal' },
      { text: 'لَ' },
    ]),
  },
  {
    id: 'maddPermissible',
    colourId: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    className: 'tajweed-madda_permissible',
    example: Object.freeze([
      { text: 'إِنَّ' },
      { text: 'آ', className: 'tajweed-madda_permissible' },
      { text: ' أَعْطَيْنَـٰكَ' },
    ]),
  },
  {
    id: 'maddObligatory',
    colourId: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    className: 'tajweed-madda_obligatory',
    example: Object.freeze([
      { text: 'جَ' },
      { text: 'آ', className: 'tajweed-madda_obligatory' },
      { text: 'ءَ' },
    ]),
  },
  {
    id: 'maddNecessary',
    colourId: 'red',
    colourHex: TAJWEED_COLOUR_HEX.red,
    className: 'tajweed-madda_necessary',
    example: Object.freeze([
      { text: 'ٱلضَّ' },
      { text: 'آ', className: 'tajweed-madda_necessary' },
      { text: 'لِّينَ' },
    ]),
  },
  {
    id: 'idghamShafawi',
    colourId: 'blue',
    colourHex: TAJWEED_COLOUR_HEX.blue,
    className: 'tajweed-idghm_shfw',
    example: Object.freeze([
      { text: 'لَهُ' },
      { text: 'م مَّ', className: 'tajweed-idghm_shfw' },
      { text: 'ا' },
    ]),
  },
  {
    id: 'idghamSimilar',
    colourId: 'blue',
    colourHex: TAJWEED_COLOUR_HEX.blue,
    className: 'tajweed-idgh_mus',
    example: Object.freeze([
      { text: 'قَ' },
      { text: 'د تَّ', className: 'tajweed-idgh_mus' },
      { text: 'بَيَّنَ' },
    ]),
  },
  {
    id: 'hamzatWasl',
    colourId: 'gray',
    colourHex: TAJWEED_COLOUR_HEX.gray,
    className: 'tajweed-ham_wasl',
    example: Object.freeze([
      { text: 'ٱ', className: 'tajweed-ham_wasl' },
      { text: 'لْحَمْدُ' },
    ]),
  },
  {
    id: 'silent',
    colourId: 'gray',
    colourHex: TAJWEED_COLOUR_HEX.gray,
    className: 'tajweed-slnt',
    example: Object.freeze([
      { text: 'أُ' },
      { text: 'و۟', className: 'tajweed-slnt' },
      { text: 'لَـٰٓئِكَ' },
    ]),
  },
])

export const TAJWEED_COLOUR_GUIDE_I18N_PREFIX = 'memorisation.tajweedColourGuide'

export function getTajweedColourHex(colourId) {
  return TAJWEED_COLOUR_HEX[colourId] || TAJWEED_COLOUR_HEX.gray
}

export function localizeTajweedColourGuideRules(translate) {
  const t = typeof translate === 'function' ? translate : (key) => key
  return TAJWEED_COLOUR_GUIDE_RULES.map((rule) => ({
    ...rule,
    name: t(`${TAJWEED_COLOUR_GUIDE_I18N_PREFIX}.rules.${rule.id}.name`),
    description: t(`${TAJWEED_COLOUR_GUIDE_I18N_PREFIX}.rules.${rule.id}.description`),
  }))
}

export function examplePlainText(rule) {
  return (rule?.example || []).map((part) => part.text).join('')
}

/** Supported mushaf class suffixes that already have a colour in Mutqin. */
export const TAJWEED_COLOUR_GUIDE_CLASS_SUFFIXES = Object.freeze(
  TAJWEED_COLOUR_GUIDE_RULES.map((rule) => String(rule.className).replace(/^tajweed-/, '')),
)

export function tajweedGuideClassIsSupported(className) {
  const suffix = String(className || '').replace(/^tajweed-/, '')
  return Boolean(TAJWEED_CLASS_TO_RULE[suffix])
}
