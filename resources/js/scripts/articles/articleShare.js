export function articlePath(slug) {
  const token = String(slug || '').replace(/^\/+|\/+$/g, '')
  return token ? `/articles/${token}` : '/articles'
}

export function articleAbsoluteUrl(slug, origin) {
  const base = String(origin || '').replace(/\/+$/, '')
  const path = articlePath(slug)
  if (!base) return path
  return `${base}${path}`
}

export function whatsappShareHref(title, url) {
  const text = [title, url].map((part) => String(part || '').trim()).filter(Boolean).join(' ')
  return `https://wa.me/?text=${encodeURIComponent(text)}`
}

export function canUseNativeShare() {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function'
}

export async function copyToClipboard(value) {
  const copyValue = String(value || '')
  if (!copyValue) return 'unsupported'
  if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(copyValue)
    return 'copied'
  }
  return 'unsupported'
}

export async function shareOrCopy({ title, text, url, clipboardText }) {
  const payload = {
    title: String(title || ''),
    text: String(text || title || ''),
    url: String(url || ''),
  }
  if (canUseNativeShare()) {
    try {
      await navigator.share(payload)
      return 'shared'
    } catch (error) {
      if (error && error.name === 'AbortError') return 'aborted'
    }
  }
  return copyToClipboard(clipboardText || url || '')
}
