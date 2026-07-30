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
    fallbackLabel: 'Listen and repeat',
    fallbackShort: 'Listen and repeat',
    fallbackDescription: 'Listen, follow and repeat at a comfortable pace.',
  },
  focus: {
    labelKey: 'memorisation.techniqueDisplay.focus.label',
    shortKey: 'memorisation.techniqueDisplay.focus.short',
    descriptionKey: 'memorisation.techniqueDisplay.focus.description',
    fallbackLabel: 'One ayah at a time',
    fallbackShort: 'One ayah at a time',
    fallbackDescription: 'Focus on one ayah before moving on.',
  },
  blur: {
    labelKey: 'memorisation.techniqueDisplay.blur.label',
    shortKey: 'memorisation.techniqueDisplay.blur.short',
    descriptionKey: 'memorisation.techniqueDisplay.blur.description',
    fallbackLabel: 'Gradually hide the text',
    fallbackShort: 'Gradually hide the text',
    fallbackDescription: 'Hide more of the text gradually to strengthen recall.',
  },
  chaining: {
    labelKey: 'memorisation.techniqueDisplay.chaining.label',
    shortKey: 'memorisation.techniqueDisplay.chaining.short',
    descriptionKey: 'memorisation.techniqueDisplay.chaining.description',
    fallbackLabel: 'Join ayahs together',
    fallbackShort: 'Join ayahs together',
    fallbackDescription: 'Link neighbouring ayahs so the passage flows more smoothly.',
  },
  anchor: {
    labelKey: 'memorisation.techniqueDisplay.anchor.label',
    shortKey: 'memorisation.techniqueDisplay.anchor.short',
    descriptionKey: 'memorisation.techniqueDisplay.anchor.description',
    fallbackLabel: 'Word focus',
    fallbackShort: 'Word focus',
    fallbackDescription: 'See which words may need a little more attention.',
  },
  linking: {
    labelKey: 'memorisation.techniqueDisplay.linking.label',
    shortKey: 'memorisation.techniqueDisplay.linking.short',
    descriptionKey: 'memorisation.techniqueDisplay.linking.description',
    fallbackLabel: 'Practice ayah pairs',
    fallbackShort: 'Practice ayah pairs',
    fallbackDescription: 'Practise each ayah, then join it with the next.',
  },
  cumulative: {
    labelKey: 'memorisation.techniqueDisplay.cumulative.label',
    shortKey: 'memorisation.techniqueDisplay.cumulative.short',
    descriptionKey: 'memorisation.techniqueDisplay.cumulative.description',
    fallbackLabel: 'Grow the passage step by step',
    fallbackShort: 'Grow the passage step by step',
    fallbackDescription: 'Add one ayah at a time while keeping earlier ones warm.',
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
