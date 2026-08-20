/**
 * Structured information architecture for the post-session recommendation modal.
 * Separates Main focus / Weak areas / Revision options / What to practise next
 * so the UI does not infer section meaning from free-form copy.
 */

/**
 * @param {(key: string, params?: object) => string} [t]
 * @param {string} key
 * @param {string} fallback
 * @param {object} [params]
 */
function translate(t, key, fallback, params) {
  if (typeof t !== 'function') return fallback
  const value = t(`memorisation.postSession.recommendation.${key}`, params)
  if (!value || String(value).includes(`recommendation.${key}`)) return fallback
  return value
}

/**
 * Canonical ayah label — never "verse" in user-facing recommendation IA.
 * @param {number} ayah
 * @param {(key: string, params?: object) => string} [t]
 */
export function formatRecommendationAyahLabel(ayah, t = null) {
  const n = Number(ayah)
  if (!Number.isFinite(n) || n <= 0) return ''
  return translate(t, 'singleAyah', `Ayah ${n}`, { ayah: n })
    || translate(t, 'planDetail.singleAyah', `Ayah ${n}`, { ayah: n })
    || `Ayah ${n}`
}

/**
 * Canonical set (passage) label for a from–to window.
 * @param {{ from?: number, to?: number, start?: number, end?: number }} range
 * @param {(key: string, params?: object) => string} [t]
 */
export function formatRecommendationSetLabel(range = {}, t = null) {
  const from = Number(range.from || range.start || 0)
  const to = Number(range.to || range.end || from)
  if (!(from > 0)) return ''
  if (to <= from) return formatRecommendationAyahLabel(from, t)
  return translate(t, 'ayahRange', `Ayahs ${from}–${to}`, { start: from, end: to })
    || translate(t, 'planDetail.ayahRange', `Ayahs ${from}–${to}`, { start: from, end: to })
    || `Ayahs ${from}–${to}`
}

/**
 * Surah + set display: "Al-Ikhlas · Ayahs 1–4"
 * @param {string|null} surahName
 * @param {{ from?: number, to?: number }} range
 * @param {(key: string, params?: object) => string} [t]
 */
export function formatRecommendationSurahSet(surahName, range = {}, t = null) {
  const name = String(surahName || '').trim()
  const setLabel = formatRecommendationSetLabel(range, t)
  if (name && setLabel) return `${name} · ${setLabel}`
  return name || setLabel || ''
}

/**
 * One concise Main focus explanation from structured assessment fields.
 * Does not invent weak ayahs.
 *
 * @param {{
 *   outcome?: string|null,
 *   outcomeLabel?: string|null,
 *   primaryWeakAyah?: number|null,
 *   weakAyahCount?: number,
 *   understandingText?: string|null,
 *   isRevision?: boolean,
 *   t?: Function|null,
 * }} input
 */
export function buildMainFocusExplanation(input = {}) {
  const t = input.t || null
  const primary = Number(input.primaryWeakAyah || 0)
  const weakCount = Number(input.weakAyahCount || 0)
  const outcome = String(input.outcome || '').toLowerCase().trim()

  if (primary > 0) {
    return translate(
      t,
      'mainFocusExplanationAyah',
      `Strengthen Ayah ${primary} in this set.`,
      { ayah: primary },
    )
  }
  if (weakCount > 1) {
    return translate(
      t,
      'mainFocusExplanationWeakAreas',
      'Strengthen the weak ayahs identified in this set.',
      { count: weakCount },
    )
  }
  if (outcome === 'strong') {
    return translate(
      t,
      'mainFocusExplanationStrong',
      'This set is secure — continue to the next recommended set.',
    )
  }
  if (input.isRevision) {
    return translate(
      t,
      'mainFocusExplanationRevision',
      'Revise this set before moving on.',
    )
  }
  const understanding = String(input.understandingText || '').trim()
  if (understanding) {
    const first = understanding.split(/(?<=[.!?])\s+/)[0] || understanding
    return first.length > 140 ? `${first.slice(0, 137).trim()}…` : first
  }
  const outcomeLabel = String(input.outcomeLabel || '').trim()
  return outcomeLabel || ''
}

/**
 * Build the full IA payload for the recommendation modal body.
 *
 * @param {{
 *   t?: Function|null,
 *   outcome?: string|null,
 *   outcomeLabel?: string|null,
 *   understandingText?: string|null,
 *   primaryWeakAyah?: number|null,
 *   weakAyahRows?: Array<{ ayah: number, ayahLabel?: string, wordsLabel?: string, words?: string[] }>,
 *   focusPhraseParts?: Array<object>,
 *   focusAyahLabel?: string|null,
 *   surahName?: string|null,
 *   nextRange?: { from?: number, to?: number }|null,
 *   nextHeadline?: string|null,
 *   methodTitle?: string|null,
 *   timeLabel?: string|null,
 *   planWhy?: string|null,
 *   revisionOptions?: Array<object>,
 *   showRevisionOptions?: boolean,
 *   isRevision?: boolean,
 * }} input
 */
export function buildPostSessionInfoArchitecture(input = {}) {
  const t = input.t || null
  const weakRows = Array.isArray(input.weakAyahRows) ? input.weakAyahRows : []
  const primaryWeakAyah = Number(input.primaryWeakAyah || 0) || null
  const explanation = buildMainFocusExplanation({
    outcome: input.outcome,
    outcomeLabel: input.outcomeLabel,
    primaryWeakAyah,
    weakAyahCount: weakRows.length,
    understandingText: input.understandingText,
    isRevision: !!input.isRevision,
    t,
  })

  const nextRange = input.nextRange && typeof input.nextRange === 'object'
    ? input.nextRange
    : null
  const setLabel = nextRange ? formatRecommendationSetLabel(nextRange, t) : ''
  const surahName = String(input.surahName || '').trim()
  const surahSetDisplay = formatRecommendationSurahSet(surahName, nextRange || {}, t)

  return {
    mainFocus: {
      title: translate(t, 'mainFocus', 'Main focus'),
      explanation,
      ayahNumber: primaryWeakAyah,
      ayahLabel: primaryWeakAyah ? formatRecommendationAyahLabel(primaryWeakAyah, t) : (input.focusAyahLabel || ''),
      hasPhrase: Array.isArray(input.focusPhraseParts) && input.focusPhraseParts.length > 0,
    },
    weakAreas: {
      title: translate(t, 'weakSpotsTitle', 'Weak areas'),
      lead: weakRows.length
        ? translate(
          t,
          'weakSpotsLead',
          'These ayahs need more practice based on this session.',
        )
        : '',
      items: weakRows.map((row) => ({
        ayah: Number(row.ayah),
        ayahLabel: row.ayahLabel || formatRecommendationAyahLabel(row.ayah, t),
        wordsLabel: row.wordsLabel || '',
        wordCount: Array.isArray(row.words) ? row.words.length : 0,
      })),
    },
    revisionOptions: {
      title: translate(t, 'revisionOptions', 'Revision options'),
      lead: translate(t, 'scopePickerLabel', 'Choose how to revise this set'),
      visible: input.showRevisionOptions !== false && Array.isArray(input.revisionOptions) && input.revisionOptions.length > 0,
      options: Array.isArray(input.revisionOptions) ? input.revisionOptions : [],
    },
    whatToPractiseNext: {
      title: translate(t, 'whatNext', 'What to practise next'),
      targetLabel: String(input.nextHeadline || '').trim(),
      surahName,
      setLabel,
      surahSetDisplay,
      methodTitle: String(input.methodTitle || '').trim(),
      timeLabel: String(input.timeLabel || '').trim(),
      why: String(input.planWhy || '').trim(),
    },
  }
}

export default {
  formatRecommendationAyahLabel,
  formatRecommendationSetLabel,
  formatRecommendationSurahSet,
  buildMainFocusExplanation,
  buildPostSessionInfoArchitecture,
}
