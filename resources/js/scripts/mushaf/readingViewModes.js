export const READING_VIEW_MODES = Object.freeze(['stacked', 'mushaf', 'madani_mushaf'])

export function isReadingViewMode(mode) {
  return READING_VIEW_MODES.includes(mode)
}

export function normalizeReadingViewMode(mode, fallback = 'mushaf') {
  if (mode === 'original') {
    return 'mushaf'
  }
  return isReadingViewMode(mode) ? mode : (isReadingViewMode(fallback) ? fallback : 'mushaf')
}

export function isPageLayoutView(mode) {
  const normalized = normalizeReadingViewMode(mode)
  return normalized === 'mushaf' || normalized === 'madani_mushaf'
}

export function isQpcMadaniMushafView(mode) {
  return normalizeReadingViewMode(mode) === 'madani_mushaf'
}
