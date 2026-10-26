/**
 * Join-ayahs-together (chaining) visual state — which ayahs form the active
 * joined block, in canonical session order, without mutating verse text.
 */

export function orderAyahKeysByVerseList(keys = [], verses = []) {
  const order = new Map()
  ;(Array.isArray(verses) ? verses : []).forEach((verse, index) => {
    const key = String(verse?.key || '').trim()
    if (key) order.set(key, index)
  })
  return [...(Array.isArray(keys) ? keys : [])]
    .map((key) => String(key || '').trim())
    .filter(Boolean)
    .sort((left, right) => {
      const a = order.has(left) ? order.get(left) : Number.MAX_SAFE_INTEGER
      const b = order.has(right) ? order.get(right) : Number.MAX_SAFE_INTEGER
      if (a !== b) return a - b
      return left.localeCompare(right, undefined, { numeric: true })
    })
}

function scopeAyahKeys(keys, isInSession) {
  const list = (Array.isArray(keys) ? keys : []).map((key) => String(key || '').trim()).filter(Boolean)
  if (typeof isInSession !== 'function') return list
  return list.filter((key) => isInSession(key))
}

/**
 * @param {object} options
 * @param {boolean} options.chainingEnabled
 * @param {'linking'|'cumulative'|string} options.chainingMethod
 * @param {object|null} options.entry Active queue entry
 * @param {object[]} options.queue
 * @param {object[]} options.verses Session verses (canonical order)
 * @param {(key: string) => boolean} [options.isInSession]
 */
export function resolveChainingVisualAyahKeys({
  chainingEnabled = false,
  chainingMethod = 'linking',
  entry = null,
  queue = [],
  verses = [],
  isInSession = null,
} = {}) {
  if (!chainingEnabled) return []

  const scope = (keys) => scopeAyahKeys(keys, isInSession)
  const verseList = Array.isArray(verses) ? verses : []
  const q = Array.isArray(queue) ? queue : []

  if (!entry) {
    if (chainingMethod === 'cumulative') {
      return orderAyahKeysByVerseList(
        scope(verseList.slice(0, 1).map((verse) => String(verse?.key || '')).filter(Boolean)),
        verseList,
      )
    }
    return orderAyahKeysByVerseList(
      scope(
        verseList
          .slice(0, Math.min(2, verseList.length))
          .map((verse) => String(verse?.key || ''))
          .filter(Boolean),
      ),
      verseList,
    )
  }

  const chainKey = entry.chainKey
  const currentKey = String(entry.verse?.key || entry.key || '').trim()
  if (!chainKey) {
    return orderAyahKeysByVerseList(scope(currentKey ? [currentKey] : []), verseList)
  }

  const repeat = Number(entry.repeatCount || 1)
  const keys = []
  const seen = new Set()
  for (const item of q) {
    if (item?.chainKey !== chainKey) continue
    if (Number(item.repeatCount || 1) !== repeat) continue
    const key = String(item.verse?.key || item.key || '').trim()
    if (!key || seen.has(key)) continue
    seen.add(key)
    keys.push(key)
  }

  const resolved = keys.length ? keys : (currentKey ? [currentKey] : [])
  return orderAyahKeysByVerseList(scope(resolved), verseList)
}

export function shouldRenderChainingJoinedFlow(keys = []) {
  return Array.isArray(keys) && keys.length > 1
}

function escapeAttr(value = '') {
  return String(value).replace(/[&<>"']/g, (ch) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }[ch]))
}

/**
 * Build RTL ayah runs HTML from pre-rendered per-ayah markup (caller supplies canonical text).
 * @param {string[]} orderedKeys
 * @param {(key: string) => string} renderAyahHtml
 * @param {(key: string) => boolean} [isActiveAyah]
 */
export function buildChainingJoinedFlowHtml(
  orderedKeys = [],
  renderAyahHtml,
  isActiveAyah = () => false,
) {
  if (!shouldRenderChainingJoinedFlow(orderedKeys) || typeof renderAyahHtml !== 'function') {
    return ''
  }
  const runs = []
  for (const key of orderedKeys) {
    const inner = String(renderAyahHtml(key) || '').trim()
    if (!inner) continue
    const active = !!isActiveAyah(key)
    runs.push(
      `<span class="chaining-ayah-run${active ? ' is-active' : ''}" data-ayah-key="${escapeAttr(key)}">`
      + `<span class="chaining-ayah-run__text">${inner}</span>`
      + `</span>`,
    )
  }
  return runs.join(' ')
}
