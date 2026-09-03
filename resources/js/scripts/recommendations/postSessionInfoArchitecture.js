/**
 * Structured information architecture for the post-session recommendation modal.
 * Separates Main focus / Weak areas / Revision options / What to practise next
 * so the UI does not infer section meaning from free-form copy.
 */

import { formatContinueToAyahLabel } from '../formatting/ayahLabels.js'

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

  if (weakCount > 1) {
    return translate(
      t,
      'mainFocusExplanationWeakAreas',
      'Strengthen the weak ayahs identified in this set.',
      { count: weakCount },
    )
  }
  if (primary > 0) {
    return translate(
      t,
      'mainFocusExplanationAyah',
      `Strengthen Ayah ${primary} in this set.`,
      { ayah: primary },
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
 * Technique-led next steps after a successful / mostly-secure check.
 * Replaces the stale "Practise weak ayahs + Revise the full set" picker.
 *
 * @param {{
 *   t?: Function|null,
 *   ctaState?: string|null,
 *   primaryWeakAyah?: number|null,
 *   nextRange?: { from?: number, to?: number }|null,
 *   methodTitle?: string|null,
 *   complementaryTitle?: string|null,
 * }} input
 */
export function buildSuccessRecommendationFlow(input = {}) {
  const t = input.t || null
  const state = String(input.ctaState || '').toLowerCase().trim()
  const weakAyah = Number(input.primaryWeakAyah || 0)
  const nextRange = input.nextRange && typeof input.nextRange === 'object' ? input.nextRange : null
  const from = Number(nextRange?.from || 0)
  const to = Number(nextRange?.to || from)
  const methodTitle = String(input.methodTitle || '').trim()
  const complementaryTitle = String(input.complementaryTitle || '').trim()

  const continueFromActions = (() => {
    if (typeof t === 'function') {
      if (from > 0) {
        const single = from === to
        const value = t(
          single
            ? 'memorisation.postSession.actions.continueToAyah'
            : 'memorisation.postSession.actions.continueToAyahs',
          single ? { ayah: from } : { start: from, end: to },
        )
        if (value && !String(value).includes('continueToAyah')) return value
      }
      const value = t('memorisation.postSession.actions.continueToNextRange')
      if (value && !String(value).includes('continueToNextRange')) return value
    }
    if (from > 0) {
      return formatContinueToAyahLabel(from, to, t)
        || (from === to ? `Next ayah ${from}` : `Next ayahs ${from}–${to}`)
    }
    return 'Continue'
  })()

  if (state === 'mostly_secure' && weakAyah > 0) {
    const reinforceTitle = translate(
      t,
      'successFlow.reinforceTitle',
      `Repeat weak ayah ${weakAyah}`,
      { ayah: weakAyah },
    )
    const reinforceDetail = methodTitle
      ? translate(
        t,
        'successFlow.reinforceWithTechnique',
        `Use ${methodTitle} on Ayah ${weakAyah}, then move on.`,
        { technique: methodTitle, ayah: weakAyah },
      )
      : translate(
        t,
        'successFlow.reinforceDetail',
        `Spend one focused pass on Ayah ${weakAyah}. Repeating a weak spot right away helps move it from short-term recall into firm memory.`,
        { ayah: weakAyah },
      )
    const continueDetail = complementaryTitle || methodTitle
      ? translate(
        t,
        'successFlow.continueWithTechnique',
        `Then continue with ${complementaryTitle || methodTitle}.`,
        { technique: complementaryTitle || methodTitle },
      )
      : translate(
        t,
        'successFlow.continueAfterReinforce',
        'Once the weak ayah feels steady, continue to the next set while the rest is still fresh.',
      )
    return {
      visible: true,
      title: translate(t, 'successFlow.title', 'Recommended next steps'),
      lead: translate(
        t,
        'successFlow.mostlySecureLead',
        'You did well overall, with one ayah that needs a little extra care. Follow these two steps before moving on.',
      ),
      steps: [
        {
          key: 'reinforce',
          tone: 'reinforce',
          step: 1,
          title: reinforceTitle,
          detail: reinforceDetail,
          technique: methodTitle,
        },
        {
          key: 'continue',
          tone: 'continue',
          step: 2,
          title: continueFromActions,
          detail: continueDetail,
          technique: complementaryTitle || methodTitle,
        },
      ],
    }
  }

  if (state === 'strong' || state === 'mostly_secure') {
    const continueDetail = methodTitle
      ? translate(
        t,
        'successFlow.strongWithTechnique',
        `Continue with ${methodTitle} on the next set.`,
        { technique: methodTitle },
      )
      : translate(
        t,
        'successFlow.strongDetail',
        'Your recall on this set is strong. Continuing now, while the ayahs are still fresh, is the best time to learn the next passage.',
      )
    return {
      visible: true,
      title: translate(t, 'successFlow.title', 'Recommended next steps'),
      lead: translate(
        t,
        'successFlow.strongLead',
        'Your recitation matched well. Here is a simple path forward — each step explains what to do and why it helps your memorisation stick.',
      ),
      steps: [
        {
          key: 'continue',
          tone: 'continue',
          step: 1,
          title: continueFromActions,
          detail: continueDetail,
          technique: methodTitle,
        },
      ],
    }
  }

  return {
    visible: false,
    title: '',
    lead: '',
    steps: [],
  }
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
 *   surahArabicName?: string|null,
 *   nextRange?: { from?: number, to?: number }|null,
 *   nextHeadline?: string|null,
 *   methodTitle?: string|null,
 *   complementaryTitle?: string|null,
 *   timeLabel?: string|null,
 *   planWhy?: string|null,
 *   revisionOptions?: Array<object>,
 *   showRevisionOptions?: boolean,
 *   successFlow?: object|null,
 *   ctaState?: string|null,
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
  const setLabel = (() => {
    if (Array.isArray(input.weakAyahNumbers) && input.weakAyahNumbers.length > 1) {
      const nums = input.weakAyahNumbers.map(Number).filter((n) => n > 0)
      if (nums.length > 1) {
        const sorted = [...new Set(nums)].sort((a, b) => a - b)
        const contiguous = sorted.every((n, i) => i === 0 || n === sorted[i - 1] + 1)
        if (contiguous) return formatRecommendationSetLabel({ from: sorted[0], to: sorted[sorted.length - 1] }, t)
        return translate(
          t,
          'weakAyahsList',
          `Ayahs ${sorted.join(', ')}`,
          { list: sorted.join(', ') },
        ) || `Ayahs ${sorted.join(', ')}`
      }
    }
    return nextRange ? formatRecommendationSetLabel(nextRange, t) : ''
  })()
  const surahName = String(input.surahName || '').trim()
  const surahArabicName = String(input.surahArabicName || '').trim()
  const surahSetDisplay = formatRecommendationSurahSet(surahName, nextRange || {}, t)
  const methodTitle = String(input.methodTitle || '').trim()
  const timeLabel = String(input.timeLabel || '').trim()
  const pills = [
    setLabel ? { key: 'set', label: setLabel } : null,
    methodTitle ? { key: 'method', label: methodTitle } : null,
    timeLabel ? { key: 'time', label: timeLabel } : null,
  ].filter(Boolean)
  const metaRows = [
    setLabel
      ? {
        key: 'set',
        label: translate(t, 'nextMetaRange', 'Focus'),
        value: setLabel,
      }
      : null,
    methodTitle
      ? {
        key: 'method',
        label: translate(t, 'nextMetaMethod', 'Technique'),
        value: methodTitle,
      }
      : null,
    timeLabel
      ? {
        key: 'time',
        label: translate(t, 'nextMetaTime', 'Time'),
        value: timeLabel,
      }
      : null,
  ].filter(Boolean)

  const successFlow = input.successFlow && typeof input.successFlow === 'object'
    ? input.successFlow
    : buildSuccessRecommendationFlow({
      t,
      ctaState: input.ctaState,
      primaryWeakAyah,
      nextRange,
      methodTitle,
      complementaryTitle: input.complementaryTitle,
    })

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
    successFlow,
    whatToPractiseNext: {
      title: translate(t, 'whatNext', 'What to practise next'),
      targetLabel: String(input.nextHeadline || '').trim(),
      surahName,
      surahArabicName,
      setLabel,
      surahSetDisplay,
      methodTitle,
      timeLabel,
      pills,
      metaRows,
      why: String(input.planWhy || '').trim(),
      lead: translate(
        t,
        'whatNextLead',
        'Based on this session, practise this next set with the technique below.',
      ),
    },
  }
}

export default {
  formatRecommendationAyahLabel,
  formatRecommendationSetLabel,
  formatRecommendationSurahSet,
  buildMainFocusExplanation,
  buildSuccessRecommendationFlow,
  buildPostSessionInfoArchitecture,
}
