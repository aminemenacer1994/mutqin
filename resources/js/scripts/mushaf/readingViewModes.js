export const READING_VIEW_MODES = Object.freeze(['stacked', 'mushaf'])

export function isReadingViewMode(mode) {
  return READING_VIEW_MODES.includes(mode)
}

export function normalizeReadingViewMode(mode, fallback = 'mushaf') {
  // Legacy persisted modes collapse to mushaf.
  if (mode === 'madani_mushaf' || mode === 'original') return 'mushaf'
  return isReadingViewMode(mode) ? mode : (isReadingViewMode(fallback) ? fallback : 'mushaf')
}

export function isPageLayoutView(mode) {
  return normalizeReadingViewMode(mode) === 'mushaf'
}
