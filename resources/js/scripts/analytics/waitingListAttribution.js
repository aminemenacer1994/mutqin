const STORAGE_KEY = 'mutqin_waiting_attribution_v1';
const LEGACY_ATTRIBUTION_KEYS = ['mutqin_seo_attr', 'mutqin_seo_tool', 'mutqin_seo_guide'];
const KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'fbclid'];
let attribution = null;
let initialised = false;
let lastPath = '';

export function hasMarketingConsent() {
  return typeof window !== 'undefined' && window.mutqinMarketingConsent === true
    && !(typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true);
}

function capture(includeReferrer = false) {
  const url = new URL(window.location.href);
  const touch = {};
  for (const key of KEYS) {
    if (key === 'fbclid' && !hasMarketingConsent()) continue;
    const value = url.searchParams.get(key);
    if (value && value.length <= (key === 'fbclid' ? 255 : 100)
      && /^[\p{L}\p{N} _.,~+\-]+$/u.test(value)) touch[key] = value.trim();
  }
  let internal = false;
  try {
    if (includeReferrer && document.referrer) {
      const referrer = new URL(document.referrer);
      const own = (host) => host === 'mutqin.ai' || host.endsWith('.mutqin.ai');
      internal = referrer.hostname === url.hostname || (own(referrer.hostname) && own(url.hostname));
      if (!internal && /^https?:$/.test(referrer.protocol)) touch.referrer_host = referrer.hostname;
    }
  } catch { /* A malformed referrer provides no attribution. */ }

  // Internal page navigation should not replace a campaign with "direct".
  if ((!includeReferrer || internal) && !Object.keys(touch).length) return null;
  return touch;
}

function readStored() {
  if (!hasMarketingConsent()) return null;
  try {
    const data = JSON.parse(window.sessionStorage.getItem(STORAGE_KEY) || 'null');
    return data && typeof data === 'object' && data.first && data.last ? data : null;
  } catch { return null; }
}

function save() {
  if (!hasMarketingConsent() || !attribution) return;
  try { window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(attribution)); } catch { /* Storage is optional. */ }
}

function update(includeReferrer = false) {
  const touch = capture(includeReferrer);
  if (!attribution) attribution = readStored();
  if (touch) {
    if (!attribution) attribution = { first: touch, last: touch };
    else if (Object.keys(touch).length) attribution.last = touch;
  }
  save();
}

export function getWaitingListAttribution() {
  if (typeof window === 'undefined') return null;
  update();
  return attribution;
}

export function initWaitingListAttribution() {
  if (initialised || typeof window === 'undefined') return;
  initialised = true;
  if (window.mutqinMarketingConsent === false || (typeof navigator !== 'undefined' && navigator.globalPrivacyControl === true)) clearStoredAttribution();
  lastPath = window.location.pathname;
  update(true);
  const onNavigation = () => {
    update();
    const path = window.location.pathname;
    if (path !== lastPath) {
      lastPath = path;
      if (hasMarketingConsent() && typeof window.fbq === 'function') window.fbq('track', 'PageView');
    }
  };
  for (const method of ['pushState', 'replaceState']) {
    const original = window.history?.[method];
    if (typeof original !== 'function') continue;
    window.history[method] = function (...args) {
      const result = original.apply(this, args);
      try { onNavigation(); } catch { /* Never interrupt navigation. */ }
      return result;
    };
  }
  window.addEventListener('popstate', onNavigation);
  window.addEventListener('mutqin:marketing-consent', () => {
    if (!hasMarketingConsent()) {
      clearStoredAttribution();
      // Do not retain a click identifier after consent is withdrawn.
      attribution = null;
    } else {
      const stored = readStored();
      if (stored) {
        attribution = {
          first: stored.first,
          last: attribution && Object.keys(attribution.last).length ? attribution.last : stored.last,
        };
      }
      update();
    }
  });
}

function clearStoredAttribution() {
  try {
    for (const key of [STORAGE_KEY, ...LEGACY_ATTRIBUTION_KEYS]) window.sessionStorage.removeItem(key);
  } catch { /* Optional storage. */ }
}
