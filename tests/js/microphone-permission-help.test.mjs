import assert from 'node:assert/strict'
import { getBrowserInfo } from '../../resources/js/scripts/browser/getBrowserInfo.js'
import {
  MICROPHONE_ACCESS_KIND,
  classifyMicrophoneAccessError,
  resolveMicDeniedGuidance,
  resolveMicrophoneHelp,
} from '../../resources/js/scripts/audio/microphonePermissionHelp.js'

const IOS_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'
const IOS_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/120.0.6099.119 Mobile/15E148 Safari/604.1'
const IOS_EDGE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 EdgiOS/120.0.2210.86 Mobile/15E148 Safari/604.1'
const IOS_FIREFOX = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) FxiOS/120.0 Mobile/15E148 Safari/604.1'
const IOS_UNKNOWN = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15'
const DESKTOP_CHROME = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
const DESKTOP_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15'

{
  assert.deepEqual(getBrowserInfo({ userAgent: IOS_SAFARI }), { isIOS: true, browser: 'safari' })
  assert.deepEqual(getBrowserInfo({ userAgent: IOS_CHROME }), { isIOS: true, browser: 'chrome' })
  assert.deepEqual(getBrowserInfo({ userAgent: IOS_EDGE }), { isIOS: true, browser: 'edge' })
  assert.deepEqual(getBrowserInfo({ userAgent: IOS_FIREFOX }), { isIOS: true, browser: 'firefox' })
  assert.deepEqual(getBrowserInfo({ userAgent: IOS_UNKNOWN }), { isIOS: true, browser: 'unknown' })
  assert.deepEqual(getBrowserInfo({ userAgent: DESKTOP_CHROME }), { isIOS: false, browser: 'chrome' })
  assert.deepEqual(getBrowserInfo({ userAgent: DESKTOP_SAFARI }), { isIOS: false, browser: 'safari' })
  assert.equal(getBrowserInfo({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15',
    platform: 'MacIntel',
    maxTouchPoints: 5,
  }).isIOS, true)
}

{
  assert.equal(classifyMicrophoneAccessError({ name: 'NotAllowedError' }), MICROPHONE_ACCESS_KIND.NOT_ALLOWED)
  assert.equal(classifyMicrophoneAccessError({ name: 'NotFoundError' }), MICROPHONE_ACCESS_KIND.NOT_FOUND)
  assert.equal(classifyMicrophoneAccessError({ name: 'NotReadableError' }), MICROPHONE_ACCESS_KIND.NOT_READABLE)
  assert.equal(classifyMicrophoneAccessError({ name: 'SecurityError' }), MICROPHONE_ACCESS_KIND.SECURITY)
  assert.equal(classifyMicrophoneAccessError({ name: 'AbortError' }), MICROPHONE_ACCESS_KIND.ABORTED)
  assert.equal(classifyMicrophoneAccessError(null, { unsupported: true }), MICROPHONE_ACCESS_KIND.UNSUPPORTED)
  assert.equal(classifyMicrophoneAccessError({ name: 'TypeError', message: 'boom' }), MICROPHONE_ACCESS_KIND.UNKNOWN)
}

{
  const safari = resolveMicrophoneHelp((key) => key, {
    error: { name: 'NotAllowedError' },
    userAgent: IOS_SAFARI,
  })
  assert.equal(safari.browser, 'safari')
  assert.equal(safari.showPermissionInstructions, true)
  assert.match(safari.steps.join(' '), /Safari/)
  assert.doesNotMatch(safari.steps.join(' '), /Chrome|Edge|Firefox/)

  const chrome = resolveMicrophoneHelp((key) => key, {
    error: { name: 'NotAllowedError' },
    userAgent: IOS_CHROME,
  })
  assert.equal(chrome.browser, 'chrome')
  assert.match(chrome.steps.join(' '), /Chrome/)
  assert.doesNotMatch(chrome.heading + chrome.explanation + chrome.steps.join(' '), /Safari/)

  const edge = resolveMicrophoneHelp((key) => key, {
    error: { name: 'NotAllowedError' },
    userAgent: IOS_EDGE,
  })
  assert.equal(edge.browser, 'edge')
  assert.match(edge.steps.join(' '), /Edge/)
  assert.doesNotMatch(edge.heading + edge.explanation + edge.steps.join(' '), /Safari/)

  const firefox = resolveMicrophoneHelp((key) => key, {
    error: { name: 'NotAllowedError' },
    userAgent: IOS_FIREFOX,
  })
  assert.equal(firefox.browser, 'firefox')
  assert.match(firefox.steps.join(' '), /Firefox/)
  assert.doesNotMatch(firefox.heading + firefox.explanation + firefox.steps.join(' '), /Safari/)

  const unknownIos = resolveMicrophoneHelp((key) => key, {
    error: { name: 'NotAllowedError' },
    userAgent: IOS_UNKNOWN,
  })
  assert.equal(unknownIos.browser, 'unknown')
  assert.equal(unknownIos.steps.length, 0)
  assert.match(unknownIos.explanation, /iPhone settings/i)
  assert.doesNotMatch(unknownIos.heading + unknownIos.explanation, /Safari/)
}

{
  const missing = resolveMicrophoneHelp((key) => key, { error: { name: 'NotFoundError' }, userAgent: IOS_CHROME })
  assert.equal(missing.kind, MICROPHONE_ACCESS_KIND.NOT_FOUND)
  assert.equal(missing.showPermissionInstructions, false)
  assert.equal(missing.steps.length, 0)
  assert.match(missing.heading, /No microphone found/)
  assert.doesNotMatch(missing.heading + missing.explanation, /Safari/)

  const busy = resolveMicrophoneHelp((key) => key, { error: { name: 'NotReadableError' }, userAgent: IOS_SAFARI })
  assert.equal(busy.kind, MICROPHONE_ACCESS_KIND.NOT_READABLE)
  assert.match(busy.explanation, /Another app or system process/)
  assert.equal(busy.showPermissionInstructions, false)

  const security = resolveMicrophoneHelp((key) => key, { error: { name: 'SecurityError' }, userAgent: IOS_CHROME })
  assert.equal(security.kind, MICROPHONE_ACCESS_KIND.SECURITY)
  assert.match(security.explanation, /HTTPS/)
  assert.doesNotMatch(security.explanation, /Safari/)

  const unsupported = resolveMicrophoneHelp((key) => key, { unsupported: true, userAgent: IOS_SAFARI })
  assert.equal(unsupported.kind, MICROPHONE_ACCESS_KIND.UNSUPPORTED)
  assert.match(unsupported.heading, /not supported/i)
  assert.doesNotMatch(unsupported.heading + unsupported.explanation, /Safari/)

  const unknown = resolveMicrophoneHelp((key) => key, { error: { name: 'TypeError' }, userAgent: IOS_SAFARI })
  assert.equal(unknown.kind, MICROPHONE_ACCESS_KIND.UNKNOWN)
  assert.equal(unknown.showPermissionInstructions, false)
  assert.doesNotMatch(unknown.heading + unknown.explanation, /Safari/)
}

{
  const chromeGuidance = resolveMicDeniedGuidance((key) => key, { userAgent: IOS_CHROME })
  assert.match(chromeGuidance, /Chrome/)
  assert.doesNotMatch(chromeGuidance, /Safari/)

  const safariGuidance = resolveMicDeniedGuidance((key) => key, { userAgent: IOS_SAFARI })
  assert.match(safariGuidance, /Safari/)

  const unknownGuidance = resolveMicDeniedGuidance((key) => key, { userAgent: IOS_UNKNOWN })
  assert.doesNotMatch(unknownGuidance, /Safari/)
  assert.match(unknownGuidance, /iPhone settings/i)

  const desktopChrome = resolveMicDeniedGuidance((key) => key, { userAgent: DESKTOP_CHROME })
  assert.doesNotMatch(desktopChrome, /iPhone Settings/)
  assert.match(desktopChrome, /Chrome|Microphone/i)
}

console.log('microphone-permission-help.test.mjs: ok')
