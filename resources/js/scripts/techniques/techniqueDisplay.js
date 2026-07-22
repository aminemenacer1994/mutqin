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
    descriptionKey: 'memorisation.techniqueDisplay.talqin.description',
    fallbackLabel: 'Listen and repeat (Talqin)',
    fallbackShort: 'Listen and repeat (Talqin)',
    fallbackDescription: 'Listen to each section, then repeat it',
  },
  focus: {
    labelKey: 'memorisation.techniqueDisplay.focus.label',
    shortKey: 'memorisation.techniqueDisplay.focus.short',
    descriptionKey: 'memorisation.techniqueDisplay.focus.description',
    fallbackLabel: 'One ayah at a time (Focus)',
    fallbackShort: 'One ayah at a time (Focus)',
    fallbackDescription: 'Concentrate on one ayah before moving forward',
  },
  blur: {
    labelKey: 'memorisation.techniqueDisplay.blur.label',
    shortKey: 'memorisation.techniqueDisplay.blur.short',
    descriptionKey: 'memorisation.techniqueDisplay.blur.description',
    fallbackLabel: 'Gradually hide the text (Blur)',
    fallbackShort: 'Gradually hide the text (Blur)',
    fallbackDescription: 'Hide more of the text gradually to strengthen recall',
  },
  chaining: {
    labelKey: 'memorisation.techniqueDisplay.chaining.label',
    shortKey: 'memorisation.techniqueDisplay.chaining.short',
    descriptionKey: 'memorisation.techniqueDisplay.chaining.description',
    fallbackLabel: 'Join ayahs together (Chaining)',
    fallbackShort: 'Join ayahs together (Chaining)',
    fallbackDescription: 'Link each ayah to the next and practise the range as one continuous sequence.',
  },
  anchor: {
    labelKey: 'memorisation.techniqueDisplay.anchor.label',
    shortKey: 'memorisation.techniqueDisplay.anchor.short',
    descriptionKey: 'memorisation.techniqueDisplay.anchor.description',
    fallbackLabel: 'Highlight memory words (Anchor)',
    fallbackShort: 'Highlight memory words (Anchor)',
    fallbackDescription: 'Use key words as hooks to recall each ayah',
  },
  linking: {
    labelKey: 'memorisation.techniqueDisplay.linking.label',
    shortKey: 'memorisation.techniqueDisplay.linking.short',
    descriptionKey: 'memorisation.techniqueDisplay.linking.description',
    fallbackLabel: 'Practice ayah pairs (Linking)',
    fallbackShort: 'Practice ayah pairs (Linking)',
    fallbackDescription: 'Practise each ayah, then join it with the next',
  },
  cumulative: {
    labelKey: 'memorisation.techniqueDisplay.cumulative.label',
    shortKey: 'memorisation.techniqueDisplay.cumulative.short',
    descriptionKey: 'memorisation.techniqueDisplay.cumulative.description',
    fallbackLabel: 'Grow the passage step by step (Cumulative)',
    fallbackShort: 'Grow the passage step by step (Cumulative)',
    fallbackDescription: 'Add one ayah at a time to build a longer run',
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
 * @returns {{ id: string, label: string, shortLabel: string, description: string }}
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
      description: '',
    }
  }

  const preferShort = !!options.short
  const label = translateOrFallback(t, meta.labelKey, meta.fallbackLabel)
  const shortLabel = translateOrFallback(t, meta.shortKey, meta.fallbackShort)
  const description = translateOrFallback(t, meta.descriptionKey, meta.fallbackDescription)

  return {
    id,
    label: preferShort ? shortLabel : label,
    shortLabel,
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

export function listTechniqueDisplays(t, ids = CORE_TECHNIQUE_IDS) {
  return (ids || []).map(id => resolveTechniqueDisplay(id, t))
}
