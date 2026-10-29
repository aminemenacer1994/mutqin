import { referenceUrlForAyah } from './learnerCompletionMistakes.js'

export function markerAnchorMs(mistake = {}) {
  const start = Number(mistake.start_ms ?? mistake.startMs)
  const end = Number(mistake.end_ms ?? mistake.endMs)
  if (Number.isFinite(start) && Number.isFinite(end) && end > start) {
    return Math.round((start + end) / 2)
  }
  if (Number.isFinite(start) && start >= 0) return start
  return null
}

/**
 * @param {number} ms
 * @param {number} durationMs
 */
export function markerPercentFromMs(ms, durationMs) {
  const duration = Number(durationMs)
  const time = Number(ms)
  if (!Number.isFinite(duration) || duration <= 0 || !Number.isFinite(time)) return 0
  const ratio = Math.max(0, Math.min(1, time / duration))
  return Math.round(ratio * 1000) / 10
}

/**
 * @param {object[]} mistakes
 * @param {number} durationMs
 */
export function buildTimelineMarkers(mistakes = [], durationMs = 0) {
  return (Array.isArray(mistakes) ? mistakes : []).map((mistake, index) => {
    const anchorMs = markerAnchorMs(mistake)
    return {
      index,
      mistake,
      anchorMs,
      percent: anchorMs === null ? null : markerPercentFromMs(anchorMs, durationMs),
    }
  }).filter((item) => item.percent !== null)
}

/**
 * @param {object[]} mistakes
 */
export function sortedMistakeTimeline(mistakes = []) {
  return buildTimelineMarkers(mistakes, Number.MAX_SAFE_INTEGER)
    .map((item) => ({
      index: item.index,
      anchorMs: item.anchorMs,
      ayah: Number(item.mistake?.ayah),
    }))
    .sort((a, b) => a.anchorMs - b.anchorMs)
}

/**
 * @param {object[]} sortedTimeline from sortedMistakeTimeline with full mistakes duration
 * @param {number|null} currentIndex mistake array index
 */
export function nextMistakeIndex(mistakes, currentIndex = null) {
  const timeline = buildTimelineMarkers(mistakes, Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.anchorMs - b.anchorMs)
  if (!timeline.length) return null
  if (currentIndex === null || currentIndex === undefined) return timeline[0].index
  const pos = timeline.findIndex((item) => item.index === currentIndex)
  if (pos < 0) return timeline[0].index
  return timeline[(pos + 1) % timeline.length].index
}

export function previousMistakeIndex(mistakes, currentIndex = null) {
  const timeline = buildTimelineMarkers(mistakes, Number.MAX_SAFE_INTEGER)
    .sort((a, b) => a.anchorMs - b.anchorMs)
  if (!timeline.length) return null
  if (currentIndex === null || currentIndex === undefined) return timeline[timeline.length - 1].index
  const pos = timeline.findIndex((item) => item.index === currentIndex)
  if (pos < 0) return timeline[timeline.length - 1].index
  return timeline[(pos - 1 + timeline.length) % timeline.length].index
}

/**
 * @param {object[]} mistakes
 * @param {number} ayah
 * @param {number} durationMs
 */
export function loopBoundsForAyah(mistakes, ayah, durationMs) {
  const target = Number(ayah)
  const duration = Number(durationMs)
  const segments = (Array.isArray(mistakes) ? mistakes : []).filter((m) => Number(m.ayah) === target)
  const starts = segments
    .map((m) => Number(m.start_ms ?? m.startMs))
    .filter((n) => Number.isFinite(n) && n >= 0)
  const ends = segments
    .map((m) => Number(m.end_ms ?? m.endMs))
    .filter((n) => Number.isFinite(n) && n > 0)
  if (!starts.length && !ends.length) {
    return {
      startMs: 0,
      endMs: Number.isFinite(duration) && duration > 0 ? duration : null,
    }
  }
  const startMs = starts.length ? Math.min(...starts) : 0
  let endMs = ends.length ? Math.max(...ends) : null
  if (endMs === null && Number.isFinite(duration) && duration > 0) endMs = duration
  if (endMs !== null && endMs <= startMs) endMs = startMs + 400

  return { startMs, endMs }
}

function normalizeReferenceByAyah(raw, surah, assignment = {}) {
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const map = {}
    for (const [key, value] of Object.entries(raw)) {
      const ayah = Number(key)
      if (!Number.isFinite(ayah)) continue
      map[ayah] = {
        reference_url: value?.reference_url || value?.referenceUrl || referenceUrlForAyah(surah, ayah),
        start_ms: value?.start_ms ?? value?.startMs ?? 0,
        end_ms: value?.end_ms ?? value?.endMs ?? null,
      }
    }
    return map
  }
  return {}
}

/**
 * @param {object|null|undefined} row
 */
export function resolvePlaybackAttempt(row) {
  const attempt = row?.completion_result?.attempt || {}
  const assignment = row?.assignment || {}
  const range = row?.evidence?.range || assignment
  const surah = Number(range.surah ?? range.surah_number ?? assignment.surah_number) || null
  const from = Number(assignment.ayah_start ?? range.from ?? 1)
  const to = Number(assignment.ayah_end ?? range.to ?? from)

  const referenceByAyah = normalizeReferenceByAyah(attempt.reference_by_ayah, surah, assignment)
  for (let ayah = from; ayah <= to; ayah += 1) {
    if (!referenceByAyah[ayah]) {
      referenceByAyah[ayah] = {
        reference_url: referenceUrlForAyah(surah, ayah),
        start_ms: 0,
        end_ms: null,
      }
    }
  }

  const taskReferenceUrl = row?.task?.reference_url
    || row?.task?.referenceUrl
    || assignment.reference_url
    || assignment.referenceUrl
    || null

  return {
    id: attempt.id ?? row?.evidence?.attempt_id ?? null,
    recordingUrl: attempt.recording_url || attempt.recordingUrl || null,
    recordingAvailable: Boolean(attempt.recording_available ?? attempt.recordingUrl ?? attempt.recording_url),
    durationMs: Number(attempt.duration_ms ?? attempt.durationMs ?? row?.evidence?.audio?.duration_ms) || null,
    mistakes: Array.isArray(attempt.mistakes) ? attempt.mistakes : [],
    referenceByAyah,
    taskReferenceUrl,
    surah,
    dataGaps: Array.isArray(attempt.data_gaps) ? attempt.data_gaps : [],
  }
}

export function referenceUrlForSelectedAyah(playback, ayah) {
  const n = Number(ayah)
  const fromMap = playback?.referenceByAyah?.[n]?.reference_url
  if (fromMap) return fromMap
  return referenceUrlForAyah(playback?.surah, n)
}

export { formatClock } from '../audio/recordingPlayback.js'
