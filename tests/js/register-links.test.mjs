import assert from 'node:assert/strict'

function installBrowser({
  path = '/',
  search = '',
  consent = true,
  userAgent = 'Mozilla/5.0',
} = {}) {
  const values = new Map()
  const location = new URL(`https://mutqin.ai${path}${search}`)
  Object.defineProperty(globalThis, 'navigator', {
    value: { userAgent, globalPrivacyControl: false },
    configurable: true,
  })
  globalThis.document = {
    referrer: '',
    documentElement: { dataset: {} },
    querySelectorAll(selector) {
      if (selector !== 'a[href]') return []
      return this.anchors || []
    },
    anchors: [],
  }
  globalThis.window = {
    mutqinMarketingConsent: consent,
    location,
    gtag() {},
    sessionStorage: {
      getItem: (key) => (values.has(key) ? values.get(key) : null),
      setItem: (key, value) => { values.set(key, String(value)) },
      removeItem: (key) => { values.delete(key) },
    },
    history: {
      state: null,
      replaceState(_state, _title, url) {
        replaced.push(url)
        window.location = new URL(url, 'https://mutqin.ai')
      },
    },
    addEventListener() {},
  }
  return { values, location }
}

installBrowser({
  search: '?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch&fbclid=abc.123',
})

const { captureAcquisitionAttribution } = await import('../../resources/js/scripts/analytics/productEvents.js?register-links')
const {
  concealTrackingQuery,
  decoratePublicRegisterLinks,
  getRegistrationUtms,
  isInAppBrowser,
  publicRegisterHref,
  registerPathFromHref,
  withRegistrationQuery,
} = await import('../../resources/js/scripts/analytics/registerLinks.js?register-links')

captureAcquisitionAttribution()

const utms = getRegistrationUtms()
assert.equal(utms.utm_source, 'instagram')
assert.equal(utms.utm_medium, 'paid_social')
assert.equal(utms.utm_campaign, 'launch')
assert.equal('fbclid' in utms, false)

assert.equal(
  withRegistrationQuery('/register'),
  '/register?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch',
)
assert.doesNotMatch(withRegistrationQuery('/register'), /fbclid/)
assert.match(withRegistrationQuery('/register?plan=pro_monthly'), /plan=pro_monthly/)
assert.match(withRegistrationQuery('/register?plan=pro_monthly'), /utm_source=instagram/)
assert.match(publicRegisterHref({ plan: 'pro_yearly' }), /plan=pro_yearly/)
assert.match(withRegistrationQuery('/register?utm_source=seo_tool'), /utm_source=seo_tool/)
assert.doesNotMatch(withRegistrationQuery('/register?utm_source=seo_tool'), /utm_source=instagram/)

assert.equal(registerPathFromHref('https://mutqin.ai/register'), '/register')
assert.equal(
  withRegistrationQuery('https://mutqin.ai/register?plan=pro_monthly'),
  '/register?plan=pro_monthly&utm_source=instagram&utm_medium=paid_social&utm_campaign=launch',
)

const nav = { href: '/register', dataset: {}, getAttribute(name) { return name === 'href' ? this.href : null }, setAttribute(name, value) { if (name === 'href') this.href = value } }
const absolute = { href: 'https://mutqin.ai/register', dataset: {}, getAttribute(name) { return name === 'href' ? this.href : null }, setAttribute(name, value) { if (name === 'href') this.href = value } }
const login = { href: '/login', dataset: {}, getAttribute(name) { return name === 'href' ? this.href : null }, setAttribute(name, value) { if (name === 'href') this.href = value } }
const skip = { href: '/register', dataset: { skipUtm: '1' }, getAttribute(name) { return name === 'href' ? this.href : null }, setAttribute(name, value) { if (name === 'href') this.href = value } }
document.querySelectorAll = (selector) => (selector === 'a[href]' ? [nav, absolute, login, skip] : [])
assert.equal(decoratePublicRegisterLinks(document), 2)
assert.equal(nav.href, '/register?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch')
assert.equal(absolute.href, '/register?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch')
assert.equal(login.href, '/login')
assert.equal(skip.href, '/register')

window.location = new URL('https://mutqin.ai/register?utm_source=instagram&utm_medium=paid_social&utm_campaign=launch&plan=pro_monthly&fbclid=abc.123')
const replaced = []
assert.equal(concealTrackingQuery({
  path: '/register',
  historyApi: {
    state: null,
    replaceState(_state, _title, url) { replaced.push(url) },
  },
}), true)
assert.deepEqual(replaced, ['/register?plan=pro_monthly'])

assert.equal(isInAppBrowser('Mozilla/5.0 Instagram 192.168.2.2.117 Android'), true)
assert.equal(isInAppBrowser('Mozilla/5.0 (iPhone) musical_ly_123 TikTok'), true)
assert.equal(isInAppBrowser('Mozilla/5.0 (Macintosh) AppleWebKit/605.1.15'), false)

console.log('register-links.test.mjs: ok')
