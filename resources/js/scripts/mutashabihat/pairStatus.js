import { readLocalJson, userScopedMutqinKey, writeLocalJson } from '../../utils/mutqinStorageKeys.js'

export const MUTASHABIHAT_STATUSES = Object.freeze(['new', 'needs_practice', 'improving', 'strong'])

export const LOCAL_PROGRESS_SUFFIX = 'mutashabihat.progress.v1'

export function localProgressStorageKey(userId = 'guest') {
  return userScopedMutqinKey(LOCAL_PROGRESS_SUFFIX, userId || 'guest')
}

/**
 * Status from completed practice/confusion only. Opening a pair never marks Strong.
 *
 * @param {{ practice_attempts?: number, successful_attempts?: number, confusion_count?: number, status?: string } | null} row
 */
export function deriveMutashabihatStatus(row = null) {
  if (!row) return 'new'
  const attempts = Math.max(0, Number(row.practice_attempts || 0))
  const successes = Math.max(0, Number(row.successful_attempts || 0))
  const confusions = Math.max(0, Number(row.confusion_count || 0))
  if (attempts <= 0 && confusions <= 0) return 'new'

  const rate = successes / Math.max(1, attempts)
  if (attempts > 0 && rate >= 0.75 && successes >= 3) return 'strong'
  if (attempts > 0 && (rate >= 0.4 || successes >= 1)) return 'improving'
  return 'needs_practice'
}

export function normalizeMutashabihatStatus(status) {
  const key = String(status || '').trim()
  if (MUTASHABIHAT_STATUSES.includes(key)) return key
  return 'new'
}

export function loadLocalMutashabihatProgress(userId = 'guest') {
  const stored = readLocalJson(localProgressStorageKey(userId), [])
  return Array.isArray(stored) ? stored : []
}

export function writeLocalMutashabihatProgress(rows, userId = 'guest') {
  writeLocalJson(localProgressStorageKey(userId), Array.isArray(rows) ? rows : [])
}

/**
 * @param {{ pair: object, success: boolean, userId?: string|number }} input
 */
export function recordLocalMutashabihatPractice(input = {}) {
  const pair = input.pair
  if (!pair?.id && !pair?.pair_key) return null
  const userId = input.userId || 'guest'
  const rows = loadLocalMutashabihatProgress(userId)
  const pairId = Number(pair.id || 0)
  const pairKey = String(pair.pair_key || [pair.verse_key_1, pair.verse_key_2].filter(Boolean).sort().join('|'))
  let row = rows.find((item) => (
    (pairId && Number(item.pair_id) === pairId)
    || (pairKey && item.pair_key === pairKey)
  ))
  if (!row) {
    row = {
      id: `local-${pairKey || pairId}`,
      pair_id: pairId || null,
      pair_key: pairKey,
      expected_verse_key: pair.verse_key_1,
      confused_verse_key: pair.verse_key_2,
      confusion_count: 0,
      practice_attempts: 0,
      successful_attempts: 0,
      status: 'new',
      pair,
    }
    rows.push(row)
  }
  row.practice_attempts = Number(row.practice_attempts || 0) + 1
  if (input.success) row.successful_attempts = Number(row.successful_attempts || 0) + 1
  row.last_practised_at = new Date().toISOString()
  row.status = deriveMutashabihatStatus(row)
  row.pair = pair
  writeLocalMutashabihatProgress(rows, userId)
  return row
}

export function pairTouchesScope(pair, scope = {}) {
  const chapterId = Number(scope.chapterId || scope.surah || 0)
  if (!pair || !chapterId) return false
  const from = Math.max(1, Number(scope.rangeStart || 1))
  const to = Math.max(from, Number(scope.rangeEnd || from))
  const bounded = Number(scope.rangeStart) > 0 || Number(scope.rangeEnd) > 0
  const hit = (surah, ayah) => {
    if (Number(surah) !== chapterId) return false
    if (!bounded) return true
    const n = Number(ayah)
    return n >= from && n <= to
  }
  return hit(pair.surah_number_1, pair.ayah_number_1)
    || hit(pair.surah_number_2, pair.ayah_number_2)
}

export function mergeCatalogWithProgress(catalog = [], progressRows = []) {
  const byId = new Map()
  const byKey = new Map()
  for (const row of progressRows || []) {
    if (row?.pair_id) byId.set(Number(row.pair_id), row)
    const key = String(row?.pair_key || row?.pair?.pair_key || [
      row?.pair?.verse_key_1 || row?.expected_verse_key,
      row?.pair?.verse_key_2 || row?.confused_verse_key,
    ].filter(Boolean).sort().join('|'))
    if (key) byKey.set(key, row)
  }

  return (catalog || []).map((pair) => {
    const progress = byId.get(Number(pair.id)) || byKey.get(pair.pair_key) || null
    const status = normalizeMutashabihatStatus(progress ? deriveMutashabihatStatus(progress) : 'new')
    return { pair, progress, status }
  })
}

function statusRank(status) {
  if (status === 'needs_practice') return 0
  if (status === 'new') return 1
  if (status === 'improving') return 2
  return 3
}

/**
 * @param {Array<{ pair: object, progress?: object, status: string }>} rows
 * @param {{ chapterId?: number, rangeStart?: number, rangeEnd?: number }} scope
 */
export function prioritiseMutashabihatRows(rows, scope = {}) {
  return [...(rows || [])].sort((a, b) => {
    const aScope = pairTouchesScope(a.pair, scope) ? 0 : 1
    const bScope = pairTouchesScope(b.pair, scope) ? 0 : 1
    if (aScope !== bScope) return aScope - bScope
    const aRank = statusRank(a.status)
    const bRank = statusRank(b.status)
    if (aRank !== bRank) return aRank - bRank
    const aConfusion = Number(a.progress?.confusion_count || 0)
    const bConfusion = Number(b.progress?.confusion_count || 0)
    if (aConfusion !== bConfusion) return bConfusion - aConfusion
    return Number(a.pair?.id || 0) - Number(b.pair?.id || 0)
  })
}

export function filterMutashabihatRows(rows, { status = 'all', query = '' } = {}) {
  const wanted = String(status || 'all').trim()
  const needle = String(query || '').trim().toLowerCase().replace(/\s+/g, ' ')
  return (rows || []).filter((row) => {
    if (wanted !== 'all' && row.status !== wanted) return false
    if (!needle) return true
    const pair = row.pair || {}
    const hay = [
      row.pairLabel,
      row.leftLabel,
      row.rightLabel,
      row.leftName,
      row.rightName,
      pair.verse_key_1,
      pair.verse_key_2,
      `${pair.surah_number_1} ${pair.ayah_number_1}`,
      `${pair.surah_number_2} ${pair.ayah_number_2}`,
    ].join(' ').toLowerCase()
    return hay.includes(needle)
  })
}
