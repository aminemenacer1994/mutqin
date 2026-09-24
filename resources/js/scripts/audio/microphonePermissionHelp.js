/**
 * Shared microphone permission / access help for Recite and related flows.
 * Request getUserMedia first; only use this copy after access fails.
 */

import { getBrowserInfo } from '../browser/getBrowserInfo.js'

export const MICROPHONE_ACCESS_KIND = Object.freeze({
  NOT_ALLOWED: 'not_allowed',
  NOT_FOUND: 'not_found',
  NOT_READABLE: 'not_readable',
  SECURITY: 'security',
  ABORTED: 'aborted',
  UNSUPPORTED: 'unsupported',
  UNKNOWN: 'unknown',
})

/**
 * @param {unknown} error
 * @param {{ unsupported?: boolean }} [options]
 * @returns {string}
 */
export function classifyMicrophoneAccessError(error, options = {}) {
  if (options.unsupported === true) return MICROPHONE_ACCESS_KIND.UNSUPPORTED

  const name = String(error?.name || error?.cause?.name || '').trim()
  const code = String(error?.code || error?.cause?.code || '').trim()
  const message = String(error?.message || error?.cause?.message || '').trim()
  const combined = `${name} ${code} ${message}`.toLowerCase()

  if (
    name === 'NotSupportedError'
    || code === 'unsupported'
    || code === 'no_get_user_media'
    || code === 'no_media_recorder'
    || /unsupported|no_get_user_media|no_media_recorder/.test(combined)
  ) {
    return MICROPHONE_ACCESS_KIND.UNSUPPORTED
  }

  if (name === 'NotAllowedError' || code === 'permission_denied' || /notallowed|permission_denied|permission denied|micblocked|\bdenied\b/.test(combined)) {
    return MICROPHONE_ACCESS_KIND.NOT_ALLOWED
  }

  if (name === 'NotFoundError' || /notfound/.test(combined)) {
    return MICROPHONE_ACCESS_KIND.NOT_FOUND
  }

  if (name === 'NotReadableError' || /notreadable/.test(combined)) {
    return MICROPHONE_ACCESS_KIND.NOT_READABLE
  }

  if (name === 'SecurityError' || /securityerror/.test(combined)) {
    return MICROPHONE_ACCESS_KIND.SECURITY
  }

  if (name === 'AbortError' || /aborterror/.test(combined)) {
    return MICROPHONE_ACCESS_KIND.ABORTED
  }

  return MICROPHONE_ACCESS_KIND.UNKNOWN
}

/**
 * @param {(key: string, fallback?: string) => string} [t]
 * @param {string} key
 * @param {string} fallback
 * @returns {string}
 */
function translate(t, key, fallback) {
  if (typeof t !== 'function') return fallback
  const value = String(t(key) || '').trim()
  return value && value !== key ? value : fallback
}

/**
 * Structured microphone help for the shared permission / error modal.
 *
 * @param {(key: string, fallback?: string) => string} [t]
 * @param {{
 *   error?: unknown,
 *   kind?: string,
 *   unsupported?: boolean,
 *   userAgent?: string,
 *   platform?: string,
 *   maxTouchPoints?: number,
 * }} [options]
 * @returns {{
 *   kind: string,
 *   heading: string,
 *   explanation: string,
 *   steps: string[],
 *   showPermissionInstructions: boolean,
 *   browser: 'safari' | 'chrome' | 'edge' | 'firefox' | 'unknown',
 *   isIOS: boolean,
 * }}
 */
export function resolveMicrophoneHelp(t, options = {}) {
  const browserInfo = getBrowserInfo({
    userAgent: options.userAgent,
    platform: options.platform,
    maxTouchPoints: options.maxTouchPoints,
  })
  const kind = options.kind || classifyMicrophoneAccessError(options.error, {
    unsupported: options.unsupported === true,
  })

  if (kind === MICROPHONE_ACCESS_KIND.NOT_FOUND) {
    return {
      kind,
      heading: translate(t, 'memorisation.aiCheck.micNotFoundTitle', 'No microphone found'),
      explanation: translate(
        t,
        'memorisation.aiCheck.micNotFoundLead',
        'This device does not appear to have a microphone Mutqin can use.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  if (kind === MICROPHONE_ACCESS_KIND.NOT_READABLE) {
    return {
      kind,
      heading: translate(t, 'memorisation.aiCheck.micUnavailableTitle', 'Microphone unavailable'),
      explanation: translate(
        t,
        'memorisation.aiCheck.micUnavailableLead',
        'Another app or system process may currently be using it.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  if (kind === MICROPHONE_ACCESS_KIND.SECURITY) {
    return {
      kind,
      heading: translate(t, 'memorisation.aiCheck.micSecurityTitle', 'Microphone access unavailable'),
      explanation: translate(
        t,
        'memorisation.aiCheck.micSecurityLead',
        'Ensure Mutqin is being used over HTTPS and microphone access is allowed.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  if (kind === MICROPHONE_ACCESS_KIND.UNSUPPORTED) {
    return {
      kind,
      heading: translate(
        t,
        'memorisation.aiCheck.micUnsupportedTitle',
        'Microphone not supported in this browser',
      ),
      explanation: translate(
        t,
        'memorisation.aiCheck.micUnsupportedLead',
        'This browser cannot access the microphone.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  if (kind === MICROPHONE_ACCESS_KIND.ABORTED) {
    return {
      kind,
      heading: translate(t, 'memorisation.aiCheck.micGenericTitle', 'Couldn’t access the microphone'),
      explanation: translate(
        t,
        'memorisation.aiCheck.micAbortedLead',
        'The microphone request was interrupted. Try again.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  if (kind !== MICROPHONE_ACCESS_KIND.NOT_ALLOWED) {
    return {
      kind,
      heading: translate(t, 'memorisation.aiCheck.micGenericTitle', 'Couldn’t access the microphone'),
      explanation: translate(
        t,
        'memorisation.aiCheck.micGenericLead',
        'Something went wrong while opening the microphone. Try again.',
      ),
      steps: [],
      showPermissionInstructions: false,
      ...browserInfo,
    }
  }

  return {
    kind,
    heading: translate(t, 'memorisation.aiCheck.micPermissionTitle', 'Allow microphone access'),
    explanation: resolvePermissionExplanation(t, browserInfo),
    steps: resolvePermissionSteps(t, browserInfo),
    showPermissionInstructions: true,
    ...browserInfo,
  }
}

/**
 * Single-string copy for existing error surfaces. Never assumes iOS = Safari.
 *
 * @param {(key: string, fallback?: string) => string} [t]
 * @param {{ userAgent?: string, platform?: string, maxTouchPoints?: number, error?: unknown, kind?: string, unsupported?: boolean }} [options]
 * @returns {string}
 */
export function resolveMicDeniedGuidance(t, options = {}) {
  const help = resolveMicrophoneHelp(t, {
    ...options,
    kind: options.kind
      || (options.error
        ? classifyMicrophoneAccessError(options.error, options)
        : MICROPHONE_ACCESS_KIND.NOT_ALLOWED),
  })
  const parts = [help.explanation, ...help.steps].map((part) => String(part || '').trim()).filter(Boolean)
  return parts.join(' ')
}

function resolvePermissionExplanation(t, browserInfo) {
  if (browserInfo.isIOS && browserInfo.browser === 'unknown') {
    return translate(
      t,
      'memorisation.aiCheck.micHelpIosUnknown',
      'Microphone access is currently blocked. Open your iPhone settings, find the browser you are using, enable microphone access, then return to Mutqin and try again.',
    )
  }
  if (browserInfo.isIOS) {
    return translate(
      t,
      'memorisation.aiCheck.micPermissionLead',
      'Microphone access is currently blocked.',
    )
  }
  if (browserInfo.browser === 'chrome') {
    return translate(
      t,
      'memorisation.aiCheck.micDeniedGuidanceChrome',
      'In Chrome: site settings → Microphone → Allow, then reload and try again. Other memorisation tools still work without the microphone.',
    )
  }
  return translate(
    t,
    'memorisation.aiCheck.micDeniedGuidance',
    'Allow microphone access for this site in your browser settings, then return here and try again. Other memorisation tools still work without the microphone.',
  )
}

function resolvePermissionSteps(t, browserInfo) {
  if (!browserInfo.isIOS) return []

  if (browserInfo.browser === 'safari') {
    return [
      translate(t, 'memorisation.aiCheck.micHelpSafari1', 'Open Settings'),
      translate(t, 'memorisation.aiCheck.micHelpSafari2', 'Go to Apps → Safari'),
      translate(t, 'memorisation.aiCheck.micHelpSafari3', 'Tap Microphone'),
      translate(t, 'memorisation.aiCheck.micHelpSafari4', 'Select Allow or Ask'),
      translate(t, 'memorisation.aiCheck.micHelpSafari5', 'Return to Mutqin and try again'),
    ]
  }

  if (browserInfo.browser === 'chrome') {
    return [
      translate(t, 'memorisation.aiCheck.micHelpChrome1', 'Open iPhone Settings'),
      translate(t, 'memorisation.aiCheck.micHelpChrome2', 'Open Chrome'),
      translate(t, 'memorisation.aiCheck.micHelpChrome3', 'Enable Microphone'),
      translate(t, 'memorisation.aiCheck.micHelpChrome4', 'Return to Chrome'),
      translate(t, 'memorisation.aiCheck.micHelpChrome5', 'Allow microphone access for Mutqin if prompted'),
      translate(t, 'memorisation.aiCheck.micHelpChrome6', 'Try again'),
    ]
  }

  if (browserInfo.browser === 'edge') {
    return [
      translate(t, 'memorisation.aiCheck.micHelpEdge1', 'Open iPhone Settings'),
      translate(t, 'memorisation.aiCheck.micHelpEdge2', 'Open Edge'),
      translate(t, 'memorisation.aiCheck.micHelpEdge3', 'Enable Microphone'),
      translate(t, 'memorisation.aiCheck.micHelpEdge4', 'Return to Edge and Mutqin'),
      translate(t, 'memorisation.aiCheck.micHelpEdge5', 'Try again'),
    ]
  }

  if (browserInfo.browser === 'firefox') {
    return [
      translate(t, 'memorisation.aiCheck.micHelpFirefox1', 'Open iPhone Settings'),
      translate(t, 'memorisation.aiCheck.micHelpFirefox2', 'Open Firefox'),
      translate(t, 'memorisation.aiCheck.micHelpFirefox3', 'Enable Microphone'),
      translate(t, 'memorisation.aiCheck.micHelpFirefox4', 'Return to Firefox and Mutqin'),
      translate(t, 'memorisation.aiCheck.micHelpFirefox5', 'Try again'),
    ]
  }

  return []
}
