import { tokenizeForMatch } from '../memorisationDetection/speechMatch.js'

function normalizeWord(word) {
  return tokenizeForMatch(word)[0] || String(word || '').trim()
}

function wordsEqual(a, b) {
  const left = normalizeWord(a)
  const right = normalizeWord(b)
  return !!left && left === right
}

export function extractHeardWords(payload = {}) {
  const fromWords = (Array.isArray(payload?.words) ? payload.words : [])
    .map((item) => String(item?.word || item?.text || item?.content || '').trim())
    .filter(Boolean)
  if (fromWords.length) return fromWords
  const transcript = String(payload?.transcript || '').trim()
  return transcript ? transcript.split(/\s+/).filter(Boolean) : []
}

export function isFinalHeardPayload(payload = {}) {
  return payload?.type === 'final'
    || payload?.type === 'end-of-transcript'
    || payload?.isFinal
    || payload?.speechFinal
}

export function createHeardStream(initial = {}) {
  return {
    committed: Array.isArray(initial.committed) ? initial.committed.slice() : [],
    interim: Array.isArray(initial.interim) ? initial.interim.slice() : [],
  }
}

/** Append only words that are new after the current committed tail. */
function mergeWords(base, incoming) {
  const committed = Array.isArray(base) ? base.slice() : []
  const next = Array.isArray(incoming) ? incoming.filter(Boolean) : []
  if (!next.length) return committed
  if (!committed.length) return next.slice()

  // Growing full hypothesis that already includes committed words.
  let prefix = 0
  const limit = Math.min(committed.length, next.length)
  while (prefix < limit && wordsEqual(committed[prefix], next[prefix])) prefix += 1
  if (prefix === committed.length) {
    return committed.concat(next.slice(prefix))
  }

  // Overlap against the committed tail (Speechmatics often repeats the last final).
  let overlap = 0
  const max = Math.min(committed.length, next.length)
  for (let size = max; size >= 1; size -= 1) {
    let ok = true
    for (let i = 0; i < size; i += 1) {
      if (!wordsEqual(committed[committed.length - size + i], next[i])) {
        ok = false
        break
      }
    }
    if (ok) {
      overlap = size
      break
    }
  }
  return committed.concat(next.slice(overlap))
}

/**
 * Speechmatics sends:
 * - partials: growing unstable hypothesis for the current unfinished phrase
 * - finals: one (or a few) newly confirmed words
 * Keep committed forever; keep the latest non-overlapping interim for display.
 */
export function appendHeardPayload(stream, payload = {}) {
  const prev = stream && typeof stream === 'object' ? stream : createHeardStream()
  const incoming = extractHeardWords(payload)
  if (!incoming.length) {
    return {
      committed: Array.isArray(prev.committed) ? prev.committed.slice() : [],
      interim: Array.isArray(prev.interim) ? prev.interim.slice() : [],
    }
  }

  if (isFinalHeardPayload(payload)) {
    return {
      committed: mergeWords(prev.committed, incoming),
      interim: [],
    }
  }

  // Prefer a partial that continues from committed; otherwise treat as fresh interim.
  const merged = mergeWords(prev.committed, incoming)
  const interim = merged.slice((prev.committed || []).length)
  return {
    committed: Array.isArray(prev.committed) ? prev.committed.slice() : [],
    interim: interim.length ? interim : incoming.slice(),
  }
}

export function heardStreamText(stream) {
  const committed = Array.isArray(stream?.committed) ? stream.committed : []
  const interim = Array.isArray(stream?.interim) ? stream.interim : []
  return [...committed, ...interim].filter(Boolean).join(' ').trim()
}

export function heardWordCount(stream) {
  return heardStreamText(stream).split(/\s+/).filter(Boolean).length
}
