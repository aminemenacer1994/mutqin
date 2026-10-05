/**
 * Safe inline SEO prose links: [anchor text](/path)
 */
function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

function isSafeHref(href) {
  if (!href || typeof href !== 'string' || !href.startsWith('/') || href.startsWith('//')) {
    return false
  }
  if (href.includes(':') || href.includes('\\')) {
    return false
  }
  return /^\/[A-Za-z0-9/_\-.?=&%#]*$/.test(href)
}

export function seoProseHtml(text) {
  const escaped = escapeHtml(text)
  return escaped.replace(/\[([^\]]+)\]\((\/[^)\s]+|[^)\s]+)\)/g, (full, label, href) => {
    if (!label) return full
    if (!isSafeHref(href)) return label
    return `<a href="${escapeHtml(href)}">${label}</a>`
  })
}
