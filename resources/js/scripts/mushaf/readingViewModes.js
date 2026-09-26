export const READING_VIEW_MODES = Object.freeze(['stacked', 'mushaf', 'madani_mushaf'])

export function isReadingViewMode(mode) {
  return READING_VIEW_MODES.includes(mode)
}

export function normalizeReadingViewMode(mode, fallback = 'madani_mushaf') {
  if (mode === 'original' || mode === 'mushaf') {
    return 'madani_mushaf'
  }
  return isReadingViewMode(mode) ? mode : (isReadingViewMode(fallback) ? fallback : 'madani_mushaf')
}

export function isPageLayoutView(mode) {
  const normalized = normalizeReadingViewMode(mode)
  return normalized === 'mushaf' || normalized === 'madani_mushaf'
}

export function isQpcMadaniMushafView(mode) {
  return normalizeReadingViewMode(mode) === 'madani_mushaf'
}
