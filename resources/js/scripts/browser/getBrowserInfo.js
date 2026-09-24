/**
 * Isolated browser detection for permission / capability help.
 * Never treat iPhone or iPad as Safari on their own.
 *
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number }} [options]
 * @returns {{ isIOS: boolean, browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'unknown' }}
 */
export function getBrowserInfo(options = {}) {
  const nav = typeof navigator !== 'undefined' ? navigator : null
  const ua = String(options.userAgent ?? nav?.userAgent ?? '')
  const platform = String(options.platform ?? nav?.platform ?? '')
  const maxTouchPoints = Number(options.maxTouchPoints ?? nav?.maxTouchPoints ?? 0)

  const isIOS = /iPad|iPhone|iPod/.test(ua)
    || (platform === 'MacIntel' && maxTouchPoints > 1)
    || (/Macintosh/.test(ua) && maxTouchPoints > 1)

  return {
    isIOS,
    browser: detectBrowserName(ua),
  }
}

/**
 * @param {string} ua
 * @returns {'safari' | 'chrome' | 'edge' | 'firefox' | 'unknown'}
 */
function detectBrowserName(ua) {
  if (/EdgiOS|Edg\//.test(ua)) return 'edge'
  if (/FxiOS|Firefox\//.test(ua)) return 'firefox'
  if (/CriOS/.test(ua) || (/Chrome\//.test(ua) && !/OPR\//.test(ua))) return 'chrome'
  if (/Safari\//.test(ua) && !/Chrome|CriOS|FxiOS|Edg|OPR\//.test(ua)) return 'safari'
  return 'unknown'
}
