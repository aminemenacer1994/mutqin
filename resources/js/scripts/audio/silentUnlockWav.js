/** Minimal silent WAV used to unlock HTMLMediaElement playback on user gesture (iOS/Safari). */
const SILENT_WAV_BASE64 =
  'UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA'

const LEGACY_DATA_PREFIX = `data:audio/wav;base64,${SILENT_WAV_BASE64}`

let cachedBlobUrl = null

/**
 * Blob URL satisfies CSP `media-src blob:`; avoids `data:` URIs on the main ayah player.
 * @returns {string}
 */
export function getSilentUnlockWavUrl() {
  if (cachedBlobUrl) return cachedBlobUrl
  if (typeof URL !== 'undefined' && typeof atob === 'function') {
    try {
      const binary = atob(SILENT_WAV_BASE64)
      const bytes = new Uint8Array(binary.length)
      for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i)
      }
      cachedBlobUrl = URL.createObjectURL(new Blob([bytes], { type: 'audio/wav' }))
      return cachedBlobUrl
    } catch {
      // Fall through to legacy data URI (requires CSP media-src data:).
    }
  }
  return LEGACY_DATA_PREFIX
}

/**
 * @param {unknown} src
 * @returns {boolean}
 */
export function isSilentUnlockWavSrc(src) {
  const value = String(src || '')
  if (!value) return false
  if (value === LEGACY_DATA_PREFIX || value.startsWith('data:audio/wav;base64,UklGRig')) {
    return true
  }
  return cachedBlobUrl != null && value === cachedBlobUrl
}
