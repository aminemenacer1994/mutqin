/**
 * Theme-aware live word status presentation.
 * Colour is never the only cue: underlines (verse) and borders (chips)
 * use distinct styles per status for WCAG 1.4.1.
 */

export const LIVE_WORD_STATUSES = Object.freeze([
  'correct',
  'partial',
  'incorrect',
  'omitted',
  'pending',
  'skipped',
  'notAttempted',
])

/** Non-colour underline / border patterns by status. */
export const LIVE_WORD_STATUS_MARK = Object.freeze({
  correct: { underlineStyle: 'solid', borderStyle: 'solid', thickness: '0.12em' },
  partial: { underlineStyle: 'dashed', borderStyle: 'dashed', thickness: '0.12em' },
  incorrect: { underlineStyle: 'double', borderStyle: 'double', thickness: '0.16em' },
  omitted: { underlineStyle: 'dotted', borderStyle: 'dotted', thickness: '0.14em' },
  pending: { underlineStyle: 'dotted', borderStyle: 'dashed', thickness: '0.1em' },
  skipped: { underlineStyle: 'dotted', borderStyle: 'dashed', thickness: '0.1em' },
  notAttempted: { underlineStyle: 'none', borderStyle: 'solid', thickness: '0' },
})

const LIGHT_PALETTE = Object.freeze({
  correct: { color: '#0c634b', underline: 'rgba(12, 99, 75, 0.95)', chipBg: 'rgba(15, 122, 92, 0.14)', border: 'rgba(15, 122, 92, 0.5)' },
  partial: { color: '#8f7219', underline: 'rgba(143, 114, 25, 0.95)', chipBg: 'rgba(168, 135, 31, 0.14)', border: 'rgba(168, 135, 31, 0.52)' },
  incorrect: { color: '#9b2e27', underline: 'rgba(155, 46, 39, 0.95)', chipBg: 'rgba(155, 46, 39, 0.14)', border: 'rgba(155, 46, 39, 0.52)' },
  omitted: { color: '#12324a', underline: 'rgba(18, 50, 74, 0.92)', chipBg: 'rgba(18, 50, 74, 0.1)', border: 'rgba(18, 50, 74, 0.45)' },
  pending: { color: 'inherit', underline: 'rgba(92, 107, 120, 0.62)', chipBg: 'rgba(92, 107, 120, 0.1)', border: 'rgba(92, 107, 120, 0.4)' },
  skipped: { color: 'inherit', underline: 'rgba(92, 107, 120, 0.52)', chipBg: 'rgba(92, 107, 120, 0.1)', border: 'rgba(92, 107, 120, 0.36)' },
  notAttempted: { color: 'inherit', underline: 'transparent', chipBg: 'transparent', border: 'transparent' },
})

const DARK_PALETTE = Object.freeze({
  correct: { color: '#6ad4a8', underline: 'rgba(106, 212, 168, 0.95)', chipBg: 'rgba(78, 199, 152, 0.16)', border: 'rgba(78, 199, 152, 0.55)' },
  partial: { color: '#e0c06a', underline: 'rgba(224, 192, 106, 0.95)', chipBg: 'rgba(224, 192, 106, 0.16)', border: 'rgba(224, 192, 106, 0.55)' },
  incorrect: { color: '#f0a090', underline: 'rgba(240, 160, 144, 0.95)', chipBg: 'rgba(240, 160, 144, 0.16)', border: 'rgba(240, 160, 144, 0.55)' },
  omitted: { color: '#f5f7f9', underline: 'rgba(245, 247, 249, 0.9)', chipBg: 'rgba(245, 247, 249, 0.1)', border: 'rgba(245, 247, 249, 0.45)' },
  pending: { color: 'inherit', underline: 'rgba(184, 196, 206, 0.62)', chipBg: 'rgba(184, 196, 206, 0.12)', border: 'rgba(184, 196, 206, 0.42)' },
  skipped: { color: 'inherit', underline: 'rgba(184, 196, 206, 0.52)', chipBg: 'rgba(184, 196, 206, 0.12)', border: 'rgba(184, 196, 206, 0.38)' },
  notAttempted: { color: 'inherit', underline: 'transparent', chipBg: 'transparent', border: 'transparent' },
})

export function normalizeLiveWordTheme(theme = 'light') {
  const value = String(theme || 'light').toLowerCase()
  if (value === 'dark') return 'dark'
  if (value === 'sepia') return 'sepia'
  return 'light'
}

function paletteForTheme(theme = 'light') {
  return normalizeLiveWordTheme(theme) === 'dark' ? DARK_PALETTE : LIGHT_PALETTE
}

export function getLiveWordStatusMark(status = 'notAttempted') {
  return LIVE_WORD_STATUS_MARK[status] || LIVE_WORD_STATUS_MARK.notAttempted
}

/**
 * @param {string} [status]
 * @param {'verse'|'chip'} [mode]
 * @param {string} [theme]
 */
export function getLiveWordPresentation(status = 'notAttempted', mode = 'verse', theme = 'light') {
  const palette = paletteForTheme(theme)
  const resolved = palette[status] || palette.notAttempted
  const mark = getLiveWordStatusMark(status)

  if (mode === 'chip') {
    return {
      color: resolved.color,
      background: resolved.chipBg,
      borderColor: resolved.border,
      borderStyle: mark.borderStyle,
      underlineStyle: mark.underlineStyle,
      underlineColor: resolved.underline,
      mark,
    }
  }

  return {
    color: resolved.color,
    underline: resolved.underline,
    underlineStyle: mark.underlineStyle,
    underlineThickness: mark.thickness,
    mark,
  }
}

/** Apply presentation styles without layout reflow (paint-only properties). */
export function applyLiveWordPresentationStyles(node, presentation = {}, mode = 'verse') {
  if (!node?.style?.setProperty) return

  if (mode === 'chip') {
    node.style.setProperty('color', presentation.color || 'inherit', 'important')
    node.style.setProperty('background', presentation.background || 'transparent', 'important')
    node.style.setProperty('border-color', presentation.borderColor || 'transparent', 'important')
    node.style.setProperty('border-style', presentation.borderStyle || 'solid', 'important')
    node.style.setProperty('border-width', presentation.borderColor === 'transparent' ? '1px' : '1.5px', 'important')
    node.style.setProperty('text-decoration-line', presentation.underlineStyle === 'none' ? 'none' : 'underline', 'important')
    node.style.setProperty('text-decoration-style', presentation.underlineStyle || 'solid', 'important')
    node.style.setProperty('text-decoration-color', presentation.underlineColor || 'transparent', 'important')
    node.style.setProperty('text-decoration-thickness', '0.08em', 'important')
    node.style.setProperty('text-underline-offset', '0.12em', 'important')
    node.style.setProperty('transition', 'background-color 90ms ease, color 90ms ease, border-color 90ms ease', 'important')
    return
  }

  const hasUnderline = presentation.underline
    && presentation.underline !== 'transparent'
    && presentation.underlineStyle
    && presentation.underlineStyle !== 'none'

  node.style.setProperty('color', presentation.color || 'inherit', 'important')
  node.style.setProperty('background', 'transparent', 'important')
  node.style.setProperty('border-color', 'transparent', 'important')
  node.style.setProperty('box-shadow', 'none', 'important')
  node.style.setProperty('text-decoration-line', hasUnderline ? 'underline' : 'none', 'important')
  node.style.setProperty('text-decoration-style', hasUnderline ? (presentation.underlineStyle || 'solid') : 'solid', 'important')
  node.style.setProperty('text-decoration-color', hasUnderline ? presentation.underline : 'transparent', 'important')
  node.style.setProperty('text-decoration-thickness', presentation.underlineThickness || '0.12em', 'important')
  node.style.setProperty('text-underline-offset', '0.14em', 'important')
  node.style.setProperty('transition', 'color 90ms linear, text-decoration-color 90ms linear', 'important')
}

export function clearLiveWordPresentationStyles(node) {
  if (!node?.style?.removeProperty) return
  ;[
    'color',
    'box-shadow',
    'background',
    'border-color',
    'border-style',
    'border-width',
    'text-decoration-line',
    'text-decoration-style',
    'text-decoration-color',
    'text-decoration-thickness',
    'text-underline-offset',
    '-webkit-text-fill-color',
    'transition',
  ].forEach((prop) => node.style.removeProperty(prop))
}
