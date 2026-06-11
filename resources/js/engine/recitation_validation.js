import {
  DEFAULT_ANALYSIS_TIMESTAMP,
  replayRecognitionSession,
  wordsToTranscript
} from './recitation_analysis'

export const DEFAULT_REPLAY_VALIDATION_COUNT = 10

export function comparableRecitationResult(result = {}) {
  return {
    transcript: String(result?.transcript || ''),
    alignmentOutput: Array.isArray(result?.wordStatuses)
      ? result.wordStatuses.map(word => ({
        text: word?.text || '',
        status: word?.status || 'pending',
        actual: word?.actual || '',
        outOfOrder: !!word?.outOfOrder
      }))
      : [],
    mistakeCounts: {
      missing: Number(result?.mistakes?.missing?.length || 0),
      extra: Number(result?.mistakes?.extra?.length || 0),
      partial: Number(result?.mistakes?.partial?.length || 0),
      incorrect: Number(result?.mistakes?.incorrect?.length || 0)
    },
    scores: {
      accuracyScore: Number(result?.accuracyScore || 0),
      completionPercentage: Number(result?.completionPercentage || result?.completion || 0)
    },
    progressStates: result?.alignmentState || null,
    reviewRecommendations: result?.reviewRecommendations || [],
    retentionSignals: result?.retentionSignals || null
  }
}

export function buildRecognitionValidationReport(input = {}) {
  const rawEvents = Array.isArray(input.rawEvents) ? input.rawEvents.filter(Boolean) : []
  const targetText = String(input.targetText || '')
  const stabilizedWords = Array.isArray(input.stabilizedWords) ? input.stabilizedWords : []
  const metadata = input.metadata || {}
  const replayCount = Math.max(1, Number(input.replays || DEFAULT_REPLAY_VALIDATION_COUNT))
  const timestamp = input.timestamp || metadata.timestamp || DEFAULT_ANALYSIS_TIMESTAMP

  const baselineResult = input.analysisResult || replayRecognitionSession(rawEvents, targetText, {
    timestamp,
    metadata
  })
  const baselineSnapshot = comparableRecitationResult(baselineResult)
  const baselineHash = hashString(stableStringify(baselineSnapshot))
  const replays = []
  let firstReplayFailure = null

  for (let attempt = 0; attempt < replayCount; attempt += 1) {
    const result = replayRecognitionSession(rawEvents, targetText, {
      timestamp,
      metadata
    })
    const snapshot = comparableRecitationResult(result)
    const matches = stableStringify(snapshot) === stableStringify(baselineSnapshot)
    if (!matches && !firstReplayFailure) {
      firstReplayFailure = {
        attempt: attempt + 1,
        hash: hashString(stableStringify(snapshot))
      }
    }
    replays.push({
      attempt: attempt + 1,
      passed: matches,
      hash: hashString(stableStringify(snapshot))
    })
  }

  const variants = buildValidationVariants(rawEvents)
    .map(variant => {
      const result = replayRecognitionSession(variant.events, targetText, {
        timestamp,
        metadata
      })
      const snapshot = comparableRecitationResult(result)
      const matches = stableStringify(snapshot) === stableStringify(baselineSnapshot)
      return {
        id: variant.id,
        label: variant.label,
        passed: matches,
        eventCount: variant.events.length,
        hash: hashString(stableStringify(snapshot))
      }
    })

  const committedTranscript = wordsToTranscript(stabilizedWords)
  const committedTranscriptMatches = committedTranscript
    ? committedTranscript === baselineSnapshot.transcript
    : true
  const warnings = []
  if (!rawEvents.length) warnings.push('No raw transcript events were available for replay validation.')
  if (!committedTranscriptMatches) warnings.push('Committed words do not match the replayed transcript.')
  if (firstReplayFailure) warnings.push(`Replay mismatch detected on attempt ${firstReplayFailure.attempt}.`)
  if (variants.some(variant => !variant.passed)) warnings.push('One or more stream variants did not reproduce the baseline analysis.')

  const passed = !firstReplayFailure && variants.every(variant => variant.passed) && committedTranscriptMatches
  return {
    version: 1,
    passed,
    status: passed ? 'passed' : 'failed',
    replayCount,
    replayPassCount: replays.filter(item => item.passed).length,
    variantPassCount: variants.filter(item => item.passed).length,
    baselineHash,
    baselineSnapshot,
    committedTranscript,
    committedTranscriptMatches,
    replays,
    variants,
    warnings,
    summary: {
      accuracyScore: baselineSnapshot.scores.accuracyScore,
      completionPercentage: baselineSnapshot.scores.completionPercentage,
      missingCount: baselineSnapshot.mistakeCounts.missing,
      extraCount: baselineSnapshot.mistakeCounts.extra,
      partialCount: baselineSnapshot.mistakeCounts.partial,
      incorrectCount: baselineSnapshot.mistakeCounts.incorrect
    },
    metadata: {
      sessionId: metadata.sessionId || '',
      audioHash: metadata.audioHash || '',
      provider: metadata.provider || '',
      kind: metadata.kind || '',
      generatedAt: timestamp
    }
  }
}

export function buildValidationAggregate(reports = []) {
  const validReports = (Array.isArray(reports) ? reports : []).filter(report => report && typeof report === 'object')
  if (!validReports.length) {
    return {
      total: 0,
      passed: 0,
      failed: 0,
      replayCoverage: 0,
      label: 'No validation report',
      summary: 'No deterministic replay audit has been stored for this set yet.',
      tone: 'tone-neutral'
    }
  }

  const passed = validReports.filter(report => report.passed).length
  const failed = validReports.length - passed
  const replayCoverage = validReports.reduce((sum, report) => sum + Number(report.replayPassCount || 0), 0)
  return {
    total: validReports.length,
    passed,
    failed,
    replayCoverage,
    label: failed ? `${failed} audit ${failed === 1 ? 'failure' : 'failures'}` : 'Replay stable',
    summary: failed
      ? `${passed}/${validReports.length} stored checks reproduced their baseline output across replay variants.`
      : `${passed}/${validReports.length} stored checks reproduced identical output across replay variants.`,
    tone: failed ? 'tone-review' : 'tone-excellent'
  }
}

function buildValidationVariants(rawEvents = []) {
  const variants = []
  if (rawEvents.length) {
    variants.push({
      id: 'full-stream',
      label: 'Full stream',
      events: rawEvents
    })
  }

  const finalsOnly = rawEvents.filter(event => event?.isFinal)
  if (finalsOnly.length) {
    variants.push({
      id: 'finals-only',
      label: 'Final segments only',
      events: finalsOnly
    })
    if (finalsOnly.length > 1) {
      variants.push({
        id: 'reversed-finals',
        label: 'Reversed final segments',
        events: [...finalsOnly].reverse()
      })
    }
  }

  const dedupedFinals = dedupeFinalSegments(finalsOnly)
  if (dedupedFinals.length && dedupedFinals.length !== finalsOnly.length) {
    variants.push({
      id: 'deduped-finals',
      label: 'Deduped final segments',
      events: dedupedFinals
    })
  }

  return variants
}

function dedupeFinalSegments(events = []) {
  const map = new Map()
  for (const event of events) {
    const key = event?.segmentId || `${event?.provider || 'unknown'}:${event?.start ?? 'na'}:${event?.duration ?? 'na'}`
    map.set(key, event)
  }
  return [...map.values()]
}

function stableStringify(value) {
  return JSON.stringify(sortKeys(value))
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(item => sortKeys(item))
  if (!value || typeof value !== 'object') return value
  return Object.keys(value).sort().reduce((carry, key) => {
    carry[key] = sortKeys(value[key])
    return carry
  }, {})
}

function hashString(value = '') {
  let hash = 2166136261
  for (const char of String(value)) {
    hash ^= char.codePointAt(0)
    hash = Math.imul(hash, 16777619)
  }
  return (hash >>> 0).toString(16).padStart(8, '0')
}
