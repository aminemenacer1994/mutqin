import {
  COLOUR_BEGINNER_LABELS,
  HOLD_TOLERANCE,
  TAJWEED_PRACTICE_VERSION,
} from './catalog.js'
import { holdStatusLabel } from './timing.js'

/**
 * @param {{ hold: string, sound: string, wordMatchOk: boolean }} layers
 * @returns {'strong'|'practice'|'review'|'unable_to_assess'}
 */
export function classifySegmentOutcome({ hold, sound, wordMatchOk = true } = {}) {
  if (!wordMatchOk) return 'review'

  const holdBad = hold === 'short' || hold === 'long'
  const soundBad = sound === 'different'
  // Only escalate when both layers disagree — keep single-layer notes gentle.
  if (holdBad && soundBad) return 'review'
  if (holdBad || soundBad) return 'practice'

  const holdUnknown = hold === 'unable_to_assess'
  const soundUnknown = sound === 'unable_to_assess'
  if (holdUnknown && soundUnknown) return 'unable_to_assess'

  return 'strong'
}

/**
 * @param {Array<{ outcome: string }>} segments
 * @returns {'strong'|'average'|'needs_work'|'unable'}
 */
export function aggregatePracticeBand(segments = []) {
  const list = Array.isArray(segments) ? segments : []
  if (!list.length) return 'unable'
  const assessed = list.filter((s) => s.outcome !== 'unable_to_assess')
  if (!assessed.length) return 'unable'
  const review = assessed.filter((s) => s.outcome === 'review').length
  const practice = assessed.filter((s) => s.outcome === 'practice').length
  const strong = assessed.filter((s) => s.outcome === 'strong').length
  const issueRate = (review + practice) / assessed.length
  // Soft bands — beginners should not feel over-flagged.
  if (review >= 3 || (review >= 2 && issueRate >= 0.5)) return 'needs_work'
  if (review >= 1 || practice >= 2 || issueRate >= 0.35) return 'average'
  if (strong / assessed.length >= 0.65) return 'strong'
  return 'average'
}

export function bandToneClass(band) {
  if (band === 'strong') return 'tone-excellent'
  if (band === 'average') return 'tone-fair'
  if (band === 'needs_work') return 'tone-review'
  return 'tone-review'
}

const DEFAULT_HEADLINES = {
  strong: 'Coloured marks look steady — keep practising gently.',
  average: 'A couple of coloured marks need a slower pass.',
  needs_work: 'Go slow on the coloured marks below.',
  unable: 'Timing wasn’t clear enough to check holds this time.',
}

const DEFAULT_DISCLAIMER =
  'Practice aid only — not a teacher’s ruling. Holds are shown as ranges, not exact targets.'

const SHORT_COLOUR = {
  gray: 'Gray',
  green: 'Green — soft nasal hold',
  purple: 'Purple — hidden sound',
  orange: 'Orange — light bounce',
  red: 'Red — stretch (madd)',
  blue: 'Blue — merge',
}

function soundStatusLabel(sound = '', reciterName = '', t = null) {
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }
  if (sound === 'similar') {
    return translate(
      'memorisation.tajweedPracticeCheck.sound.similar',
      reciterName ? `Similar to ${reciterName}` : 'Similar to the reciter',
    )
  }
  if (sound === 'different') {
    return translate(
      'memorisation.tajweedPracticeCheck.sound.different',
      'Needs another listen',
    )
  }
  return translate(
    'memorisation.tajweedPracticeCheck.sound.unable',
    'Could not assess clearly',
  )
}

function nextActionForSegment(seg = {}, t = null) {
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }
  if (seg.outcome === 'strong' || (seg.hold === 'ok' && seg.sound !== 'different')) {
    return translate('memorisation.tajweedPracticeCheck.next.continue', 'Continue')
  }
  if (seg.hold === 'short') {
    return translate(
      'memorisation.tajweedPracticeCheck.next.holdLonger',
      'Listen once, then hold a little longer',
    )
  }
  if (seg.hold === 'long') {
    return translate(
      'memorisation.tajweedPracticeCheck.next.holdShorter',
      'Listen once, then hold a little shorter',
    )
  }
  if (seg.sound === 'different') {
    return translate(
      'memorisation.tajweedPracticeCheck.next.listenRepeat',
      'Listen once, then repeat the phrase',
    )
  }
  return translate(
    'memorisation.tajweedPracticeCheck.next.slowPass',
    'Try one slower pass',
  )
}

function formatRangeSec(minSec, maxSec) {
  const a = Number(minSec)
  const b = Number(maxSec)
  if (!Number.isFinite(a) || !Number.isFinite(b) || a < 0 || b < 0) return null
  const fmt = (n) => n.toFixed(1)
  return `~${fmt(a)}–${fmt(b)}s`
}

function resolveRangeLabel(seg) {
  if (seg?.holdRangeLabel) return seg.holdRangeLabel
  if (seg?.holdRangeMinSec != null && seg?.holdRangeMaxSec != null) {
    return formatRangeSec(seg.holdRangeMinSec, seg.holdRangeMaxSec)
  }
  return null
}

/**
 * One compact beginner result row + collapsed technical details.
 */
export function buildSegmentCrossRef(seg = {}, { reciterName = '', t = null } = {}) {
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }

  const colourId = seg.colour || seg.colourLabel || 'gray'
  const colourName = translate(
    `memorisation.tajweedPracticeCheck.colourNames.${colourId}`,
    colourId.charAt(0).toUpperCase() + colourId.slice(1),
  )
  const ruleLabel = seg.label || seg.ruleKey || 'Tajweed mark'
  const holdLabel = holdStatusLabel(seg.hold, t)
  const soundLabel = soundStatusLabel(seg.sound, reciterName || seg.reciterName || '', t)
  const nextAction = nextActionForSegment(seg, t)
  const rangeLabel = resolveRangeLabel(seg)
  const message = seg.beginnerHint
    ? String(seg.beginnerHint).trim()
    : nextAction

  // Beginner line — no milliseconds / percentages.
  const tip = nextAction
  const line = `${ruleLabel}: ${holdLabel}`

  return {
    colour: colourId,
    colourHex: seg.colourHex || null,
    ruleLabel,
    colourName,
    hold: seg.hold || 'unable_to_assess',
    holdLabel,
    holdRangeLabel: rangeLabel,
    measuredHoldSec: seg.measuredHoldSec ?? null,
    expectedHoldSec: seg.expectedHoldSec ?? null,
    durationLabel: rangeLabel ? `Aim ${rangeLabel}` : '',
    sound: seg.sound || 'unable_to_assess',
    soundLabel,
    nextAction,
    reciterName: reciterName || seg.reciterName || '',
    message,
    tip,
    count: Number(seg.count) || 1,
    line,
    /** Compact beginner fields for the default card. */
    beginner: {
      rule: ruleLabel,
      hold: holdLabel,
      sound: soundLabel,
      next: nextAction,
    },
    /** Technical payload for collapsed “View details”. */
    details: {
      ruleKey: seg.ruleKey || '',
      colour: colourId,
      colourHex: seg.colourHex || null,
      verseKey: seg.verseKey || '',
      word: seg.word || '',
      holdRangeLabel: rangeLabel,
      measuredHoldSec: seg.measuredHoldSec ?? null,
      expectedHoldSec: seg.expectedHoldSec ?? null,
      expectedHoldBeats: seg.expectedHoldBeats ?? null,
      soundSimilarity: seg.soundSimilarity ?? null,
      outcome: seg.outcome || '',
      beginnerHint: seg.beginnerHint || '',
      holdHint: seg.holdHint || '',
    },
  }
}

/**
 * Collapse duplicate rule/colour tips so the card stays short.
 */
function pickIssueSegments(segments = []) {
  const issues = segments.filter((s) => s.outcome === 'practice' || s.outcome === 'review')
  const byKey = new Map()
  for (const seg of issues) {
    const key = `${seg.ruleKey || seg.label || ''}::${seg.colour || ''}::${seg.hold || ''}`
    const prev = byKey.get(key)
    if (!prev) {
      byKey.set(key, { ...seg, count: 1 })
      continue
    }
    prev.count = (prev.count || 1) + 1
    if ((seg.measuredHoldSec || 0) > 0 && !(prev.measuredHoldSec > 0)) {
      prev.measuredHoldSec = seg.measuredHoldSec
    }
  }
  return [...byKey.values()]
    .sort((a, b) => {
      const rank = { review: 0, practice: 1 }
      return (rank[a.outcome] ?? 2) - (rank[b.outcome] ?? 2) || (b.count || 0) - (a.count || 0)
    })
    .slice(0, 3)
}

/**
 * Build beginner-friendly result messages.
 */
export function buildPracticeMessages({
  band = 'unable',
  segments = [],
  t = null,
  reciterName = '',
} = {}) {
  const translate = (key, fallback) => {
    if (typeof t === 'function') {
      const value = t(key)
      if (value && value !== key) return value
    }
    return fallback
  }

  const headline = translate(
    `memorisation.tajweedPracticeCheck.bands.${band}.headline`,
    DEFAULT_HEADLINES[band] || DEFAULT_HEADLINES.unable,
  )

  const issueSegments = pickIssueSegments(segments)

  const colourTips = []
  const seenColours = new Set()
  for (const seg of (issueSegments.length ? issueSegments : segments.slice(0, 2))) {
    if (!seg?.colour || seenColours.has(seg.colour)) continue
    seenColours.add(seg.colour)
    colourTips.push(
      translate(
        `memorisation.tajweedPracticeCheck.colours.${seg.colour}`,
        SHORT_COLOUR[seg.colour] || COLOUR_BEGINNER_LABELS[seg.colour] || seg.colour,
      ),
    )
  }

  // Beginner cards only for real practice/review items — never fill with “Continue” noise.
  const crossRefs = issueSegments
    .map((seg) => buildSegmentCrossRef(seg, { reciterName, t }))
    .filter((row) => {
      const next = String(row?.beginner?.next || row?.nextAction || '')
      const hold = String(row?.hold || '')
      const sound = String(row?.sound || '')
      if (hold === 'ok' && (sound === 'similar' || sound === 'unable_to_assess' || sound === 'not_applicable')) {
        return false
      }
      if (/^continue$/i.test(next.trim()) && hold === 'ok') return false
      return true
    })

  const segmentTips = crossRefs.map((row) => {
    const times = row.count > 1 ? ` ×${row.count}` : ''
    return `${row.ruleLabel} — ${row.holdLabel}. ${row.nextAction}${times}`
  })

  let summary = ''
  if (band === 'unable') {
    summary = translate(
      'memorisation.tajweedPracticeCheck.summaryUnable',
      'Use the colours while you practise. We’ll check holds when timing is clearer.',
    )
  } else if (!issueSegments.length || !crossRefs.length) {
    summary = translate(
      'memorisation.tajweedPracticeCheck.summaryStrong',
      'Keep colours on: green/purple = soft nasal hold, red = stretch, orange = light bounce.',
    )
  } else {
    summary = translate(
      'memorisation.tajweedPracticeCheck.summaryIssues',
      'Focus on one coloured mark at a time — hold gently, then listen once if needed.',
    )
  }

  return {
    band,
    tone: bandToneClass(band),
    headline,
    summary,
    colourTips,
    segmentTips,
    crossRefs,
    reciterName: reciterName || '',
    disclaimer: translate('memorisation.tajweedPracticeCheck.disclaimer', DEFAULT_DISCLAIMER),
    viewDetailsLabel: translate(
      'memorisation.tajweedPracticeCheck.viewDetails',
      'View details',
    ),
  }
}

export function buildPracticeCheckPayload({
  assessed = false,
  band = 'unable',
  segments = [],
  messages = null,
  timingReliable = false,
  acousticAttempted = false,
  reciterName = '',
} = {}) {
  const msg = messages || buildPracticeMessages({ band, segments, reciterName })
  return {
    version: TAJWEED_PRACTICE_VERSION,
    assessed: !!assessed,
    band: msg.band,
    tone: msg.tone,
    headline: msg.headline,
    summary: msg.summary,
    colourTips: msg.colourTips,
    segmentTips: msg.segmentTips,
    crossRefs: msg.crossRefs || [],
    reciterName: msg.reciterName || reciterName || '',
    disclaimer: msg.disclaimer,
    viewDetailsLabel: msg.viewDetailsLabel,
    timingReliable: !!timingReliable,
    acousticAttempted: !!acousticAttempted,
    segments,
    weaknessRepeatThreshold: HOLD_TOLERANCE.weaknessRepeatThreshold,
  }
}
