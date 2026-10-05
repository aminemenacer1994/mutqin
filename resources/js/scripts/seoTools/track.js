/**
 * Anonymous GA4 events. Never send transcripts, emails, or ayah text.
 */
export function trackSeoTool(eventName, params = {}) {
  if (typeof window === 'undefined' || typeof window.gtag !== 'function') return
  const safe = {}
  Object.entries(params).forEach(([key, value]) => {
    if (value == null) return
    const type = typeof value
    if (type === 'number' || type === 'boolean') safe[key] = value
    else if (type === 'string' && value.length <= 40 && !/[\u0600-\u06FF]/.test(value)) {
      safe[key] = value
    }
  })
  window.gtag('event', eventName, {
    event_category: 'seo_tool',
    ...safe,
  })
}
