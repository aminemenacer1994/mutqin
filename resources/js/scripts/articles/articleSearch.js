export const SEARCH_MIN_CHARS = 3
export const PAGE_SIZE = 6

function haystack(article) {
  return [
    article?.title,
    article?.excerpt,
    article?.lede,
    article?.category,
  ]
    .map((value) => String(value || '').toLowerCase())
    .join(' ')
}

export function normalisedQuery(query) {
  return String(query || '').trim()
}

export function isSearchActive(query) {
  return normalisedQuery(query).length >= SEARCH_MIN_CHARS
}

export function uniqueCategories(articles) {
  const list = Array.isArray(articles) ? articles : []
  return [...new Set(list.map((item) => String(item?.category || '').trim()).filter(Boolean))]
}

/**
 * Categories sorted by article count (desc), then label.
 * @returns {list<{ id: string, label: string, count: number }>}
 */
export function categoryOptions(articles) {
  const list = Array.isArray(articles) ? articles : []
  const counts = new Map()
  for (const article of list) {
    const label = String(article?.category || '').trim()
    if (!label) continue
    counts.set(label, (counts.get(label) || 0) + 1)
  }
  return [...counts.entries()]
    .map(([label, count]) => ({ id: label, label, count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function filterArticles(articles, query, category = '') {
  const list = Array.isArray(articles) ? articles : []
  const selected = String(category || '').trim().toLowerCase()
  const byCategory = selected
    ? list.filter((article) => String(article?.category || '').trim().toLowerCase() === selected)
    : list
  const needle = normalisedQuery(query).toLowerCase()
  if (needle.length < SEARCH_MIN_CHARS) return byCategory
  const tokens = needle.split(/\s+/).filter(Boolean)
  return byCategory.filter((article) => {
    const text = haystack(article)
    if (text.includes(needle)) return true
    return tokens.every((token) => text.includes(token))
  })
}

export function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

/**
 * Highlight matching letters/words in plain text as the user types.
 * Highlights from the first character; filtering still uses SEARCH_MIN_CHARS.
 */
export function highlightMatches(text, query) {
  const source = String(text ?? '')
  const escaped = escapeHtml(source)
  const needle = normalisedQuery(query)
  if (!needle || !source) return escaped

  const tokens = [...new Set([
    needle,
    ...needle.split(/\s+/).filter((token) => token.length > 0),
  ])].sort((a, b) => b.length - a.length)

  const pattern = tokens
    .map((token) => token.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
    .join('|')
  if (!pattern) return escaped

  try {
    return escaped.replace(new RegExp(`(${pattern})`, 'gi'), '<mark class="article-highlight">$1</mark>')
  } catch {
    return escaped
  }
}

export function visibleArticles(articles, visibleCount) {
  const list = Array.isArray(articles) ? articles : []
  const count = Math.max(0, Number(visibleCount) || 0)
  return list.slice(0, count)
}

export function initialVisibleCount(total, pageSize = PAGE_SIZE) {
  const size = Math.max(1, Number(pageSize) || PAGE_SIZE)
  return Math.min(size, Math.max(0, Number(total) || 0))
}

export function nextVisibleCount(current, total, pageSize = PAGE_SIZE) {
  const size = Math.max(1, Number(pageSize) || PAGE_SIZE)
  const next = Math.max(0, Number(current) || 0) + size
  return Math.min(Math.max(0, Number(total) || 0), next)
}

export function canLoadMore(visibleCount, total) {
  return (Number(visibleCount) || 0) < (Number(total) || 0)
}

export function listingArticles(articles) {
  return (Array.isArray(articles) ? articles : []).map((article) => ({
    ...article,
    href: `/articles/${article.slug || article.id}`,
  }))
}
