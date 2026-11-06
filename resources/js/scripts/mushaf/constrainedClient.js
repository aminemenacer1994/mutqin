/**
 * Phones, save-data, slow networks, low-memory devices, and in-app browsers
 * should not prefetch a whole mushaf sitting.
 * Desktop with enough memory keeps the existing full-session paint.
 */
export function isConstrainedMushafClient(probe) {
  const nav = probe?.navigator || (typeof navigator !== 'undefined' ? navigator : null)
  const win = probe?.window || (typeof window !== 'undefined' ? window : null)
  if (!nav && !win) return false

  const connection = nav?.connection || nav?.mozConnection || nav?.webkitConnection
  if (connection?.saveData) return true
  const effectiveType = String(connection?.effectiveType || '')
  if (effectiveType === 'slow-2g' || effectiveType === '2g') return true

  const memory = Number(nav?.deviceMemory)
  if (Number.isFinite(memory) && memory > 0 && memory <= 4) return true

  const ua = String(nav?.userAgent || '')
  if (/Instagram|FBAN|FBAV/i.test(ua)) return true

  const width = Number(win?.innerWidth || 0)
  if (width > 0 && width < 768) return true

  return false
}
