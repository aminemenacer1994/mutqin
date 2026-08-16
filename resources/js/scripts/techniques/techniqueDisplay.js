/**
 * Shared user-facing memorisation technique labels.
 * Internal IDs (talqin/focus/blur/…) stay stable for APIs and session config.
 */

export const TECHNIQUE_IDS = Object.freeze({
  TALQIN: 'talqin',
  FOCUS: 'focus',
  BLUR: 'blur',
  CHAINING: 'chaining',
  ANCHOR: 'anchor',
  LINKING: 'linking',
  CUMULATIVE: 'cumulative',
})

export const CORE_TECHNIQUE_IDS = Object.freeze([
  TECHNIQUE_IDS.TALQIN,
  TECHNIQUE_IDS.FOCUS,
  TECHNIQUE_IDS.BLUR,
])

const TECHNIQUE_I18N = Object.freeze({
  talqin: {
    labelKey: 'memorisation.techniqueDisplay.talqin.label',
    shortKey: 'memorisation.techniqueDisplay.talqin.short',
    summaryKey: 'memorisation.techniqueDisplay.talqin.summary',
    descriptionKey: 'memorisation.techniqueDisplay.talqin.description',
    fallbackLabel: 'Listen and repeat',
    fallbackShort: 'Listen and repeat',
    fallbackSummary: 'Hear it first, then recite it back',
    fallbackDescription: 'Mutqin plays each section for you. Listen closely, then pause and repeat from memory before moving on.',
  },
  focus: {
    labelKey: 'memorisation.techniqueDisplay.focus.label',
    shortKey: 'memorisation.techniqueDisplay.focus.short',
    summaryKey: 'memorisation.techniqueDisplay.focus.summary',
    descriptionKey: 'memorisation.techniqueDisplay.focus.description',
    fallbackLabel: 'One ayah at a time',
    fallbackShort: 'One ayah at a time',
    fallbackSummary: 'Lock in one ayah before the next appears',
    fallbackDescription: 'Everything else dims while you work on the active ayah. The next ayah stays hidden until you finish this one.',
  },
  blur: {
    labelKey: 'memorisation.techniqueDisplay.blur.label',
    shortKey: 'memorisation.techniqueDisplay.blur.short',
    summaryKey: 'memorisation.techniqueDisplay.blur.summary',
    descriptionKey: 'memorisation.techniqueDisplay.blur.description',
    fallbackLabel: 'Gradually hide the text',
    fallbackShort: 'Gradually hide the text',
    fallbackSummary: 'Words fade away as your recall improves',
    fallbackDescription: 'More text hides after each successful repeat. Hold Space or long-press to peek when you need a hint.',
  },
  chaining: {
    labelKey: 'memorisation.techniqueDisplay.chaining.label',
    shortKey: 'memorisation.techniqueDisplay.chaining.short',
    summaryKey: 'memorisation.techniqueDisplay.chaining.summary',
    descriptionKey: 'memorisation.techniqueDisplay.chaining.description',
    fallbackLabel: 'Join ayahs together',
    fallbackShort: 'Join ayahs together',
    fallbackSummary: 'Practise smooth transitions between ayahs',
    fallbackDescription: 'Neighbouring ayahs are linked into one flowing sequence. Choose linking (pairs) or cumulative (growing passage) below.',
  },
  anchor: {
    labelKey: 'memorisation.techniqueDisplay.anchor.label',
    shortKey: 'memorisation.techniqueDisplay.anchor.short',
    summaryKey: 'memorisation.techniqueDisplay.anchor.summary',
    descriptionKey: 'memorisation.techniqueDisplay.anchor.description',
    fallbackLabel: 'Word focus',
    fallbackShort: 'Word focus',
    fallbackSummary: 'Key words stay visible as recall hooks',
    fallbackDescription: 'Mutqin marks important words in each ayah. Use them as anchors to pull the rest of the verse back from memory.',
  },
  linking: {
    labelKey: 'memorisation.techniqueDisplay.linking.label',
    shortKey: 'memorisation.techniqueDisplay.linking.short',
    summaryKey: 'memorisation.techniqueDisplay.linking.summary',
    descriptionKey: 'memorisation.techniqueDisplay.linking.description',
    fallbackLabel: 'Practice ayah pairs',
    fallbackShort: 'Practice ayah pairs',
    fallbackSummary: 'Repeat each ayah, then join it with the next',
    fallbackDescription: 'Practise ayahs one at a time, then in pairs, so transitions between them feel natural.',
  },
  cumulative: {
    labelKey: 'memorisation.techniqueDisplay.cumulative.label',
    shortKey: 'memorisation.techniqueDisplay.cumulative.short',
    summaryKey: 'memorisation.techniqueDisplay.cumulative.summary',
    descriptionKey: 'memorisation.techniqueDisplay.cumulative.description',
    fallbackLabel: 'Grow the passage step by step',
    fallbackShort: 'Grow the passage step by step',
    fallbackSummary: 'Add one ayah at a time to a growing run',
    fallbackDescription: 'Start with the first ayah, then add the next while keeping earlier ones warm in the same sequence.',
  },
})

function translateOrFallback(t, key, fallback, params = {}) {
  if (typeof t !== 'function') return fallback
  const value = t(key, params)
  if (!value || value === key || String(value).includes(key)) return fallback
  return String(value)
}

export function normaliseTechniqueId(value) {
  const id = String(value || '').trim().toLowerCase()
  if (!id) return ''
  if (id === 'anchor_mode' || id === 'anchor-mode') return TECHNIQUE_IDS.ANCHOR
  if (id === 'focus_mode' || id === 'focus-mode') return TECHNIQUE_IDS.FOCUS
  if (id === 'blur_mode' || id === 'blur-mode') return TECHNIQUE_IDS.BLUR
  if (id === 'talqin_mode' || id === 'talqin-mode') return TECHNIQUE_IDS.TALQIN
  return id
}

export function isKnownTechniqueId(value) {
  return Object.prototype.hasOwnProperty.call(TECHNIQUE_I18N, normaliseTechniqueId(value))
}

/**
 * Resolve a single technique for user-facing UI.
 * @returns {{ id: string, label: string, shortLabel: string, summary: string, description: string }}
 */
export function resolveTechniqueDisplay(techniqueId, t, options = {}) {
  const id = normaliseTechniqueId(techniqueId)
  const meta = TECHNIQUE_I18N[id]
  if (!meta) {
    const raw = String(techniqueId || '').trim()
    return {
      id: raw || '',
      label: raw,
      shortLabel: raw,
      summary: '',
      description: '',
    }
  }

  const preferShort = !!options.short
  const label = translateOrFallback(t, meta.labelKey, meta.fallbackLabel)
  const shortLabel = translateOrFallback(t, meta.shortKey, meta.fallbackShort)
  const summary = translateOrFallback(t, meta.summaryKey, meta.fallbackSummary)
  const description = translateOrFallback(t, meta.descriptionKey, meta.fallbackDescription)

  return {
    id,
    label: preferShort ? shortLabel : label,
    shortLabel,
    summary,
    description,
  }
}

export function getTechniqueLabel(techniqueId, t, options = {}) {
  return resolveTechniqueDisplay(techniqueId, t, options).label
}

export function getTechniqueShortLabel(techniqueId, t) {
  return resolveTechniqueDisplay(techniqueId, t, { short: true }).shortLabel
}

export function getTechniqueDescription(techniqueId, t) {
  return resolveTechniqueDisplay(techniqueId, t).description
}

export function getTechniqueSummary(techniqueId, t) {
  return resolveTechniqueDisplay(techniqueId, t).summary
}

export function listTechniqueDisplays(t, ids = CORE_TECHNIQUE_IDS) {
  return (ids || []).map(id => resolveTechniqueDisplay(id, t))
}
