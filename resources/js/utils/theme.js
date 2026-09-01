const THEME_STORAGE_KEY = 'mutqin-theme';
const THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
const THEME_COOKIE_KEY = 'mutqin_theme';
export const DEFAULT_THEME = 'sepia';

/** PWA / browser chrome. Manifest splash stays light — OS cannot switch it with data-theme. */
export const THEME_CHROME = {
  light: { themeColor: '#8b5e3c', backgroundColor: '#f6f3ee', colorScheme: 'light' },
  sepia: { themeColor: '#8b5e3c', backgroundColor: '#f1e7d8', colorScheme: 'light' },
  dark: { themeColor: '#14110f', backgroundColor: '#14110f', colorScheme: 'dark' },
};

export function getThemeChrome(theme = DEFAULT_THEME) {
  return THEME_CHROME[normalizeThemeToken(theme)] || THEME_CHROME.sepia;
}

export function applyThemeChrome(theme = DEFAULT_THEME) {
  const chrome = getThemeChrome(theme);
  if (typeof document === 'undefined') return chrome;

  const root = document.documentElement;
  root.style.colorScheme = chrome.colorScheme;

  const metas = document.querySelectorAll('meta[name="theme-color"]');
  let meta = metas[0];
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', chrome.themeColor);
  meta.removeAttribute('media');
  for (let i = 1; i < metas.length; i += 1) metas[i].remove();

  const colorSchemeMeta = document.querySelector('meta[name="color-scheme"]');
  if (colorSchemeMeta) colorSchemeMeta.setAttribute('content', chrome.colorScheme);

  return chrome;
}

export function normalizeThemeToken(value = DEFAULT_THEME) {
  const theme = String(value || DEFAULT_THEME).toLowerCase();
  if (theme === 'dark' || theme === 'dark-mode') return 'dark';
  if (theme === 'light' || theme === 'light-mode') return 'light';
  if (theme === 'sepia' || theme === 'sepia-mode') return 'sepia';
  return DEFAULT_THEME;
}

export function toThemePreference(value = DEFAULT_THEME) {
  const theme = normalizeThemeToken(value);
  if (theme === 'dark') return 'dark-mode';
  if (theme === 'light') return 'light-mode';
  return 'sepia-mode';
}

function safeGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function safeSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {}
}

function readCookieTheme() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function getServerInitialTheme() {
  if (typeof window === 'undefined') return null;
  if (window.mutqinInitialTheme) return normalizeThemeToken(window.mutqinInitialTheme);
  if (window.mutqinInitialThemePreference) {
    return normalizeThemeToken(window.mutqinInitialThemePreference);
  }
  return null;
}

export function getSavedTheme() {
  // Authenticated users: account theme from the server wins over shared-device localStorage.
  if (typeof window !== 'undefined' && window.mutqinAuthCheck) {
    const serverTheme = getServerInitialTheme();
    if (serverTheme) return serverTheme;
  }

  const savedTheme = safeGet(THEME_STORAGE_KEY);
  if (savedTheme) return normalizeThemeToken(savedTheme);

  const savedPreference = safeGet(THEME_PREFERENCE_KEY);
  if (savedPreference) return normalizeThemeToken(savedPreference);

  if (typeof document !== 'undefined') {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme) return normalizeThemeToken(htmlTheme);
  }

  const cookieTheme = readCookieTheme();
  if (cookieTheme) return normalizeThemeToken(cookieTheme);

  const serverTheme = getServerInitialTheme();
  if (serverTheme) return serverTheme;

  return DEFAULT_THEME;
}

async function persistThemeToServer(themePreference) {
  if (typeof window === 'undefined' || !window.mutqinAuthCheck) return;
  try {
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
    await fetch('/api/profile/theme', {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        ...(csrf ? { 'X-CSRF-TOKEN': csrf } : {}),
      },
      credentials: 'same-origin',
      body: JSON.stringify({ theme: themePreference }),
    });
  } catch {
    // non-blocking: cookie/localStorage still persist preference
  }
}

export function setGlobalTheme(theme, options = {}) {
  const { dispatchEvent = true, persist = true } = options;
  const normalizedTheme = normalizeThemeToken(theme);
  const themePreference = toThemePreference(normalizedTheme);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.cookie = `${THEME_COOKIE_KEY}=${themePreference};path=/;max-age=31536000;samesite=lax`;
    applyThemeChrome(normalizedTheme);
  }

  safeSet(THEME_STORAGE_KEY, normalizedTheme);
  safeSet(THEME_PREFERENCE_KEY, themePreference);

  if (persist) {
    persistThemeToServer(themePreference);
  }

  if (dispatchEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mutqin:theme-change', {
      detail: { theme: normalizedTheme },
    }));
  }

  return normalizedTheme;
}

export function cycleGlobalTheme(themes = ['light', 'sepia', 'dark']) {
  const current = getSavedTheme();
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  return setGlobalTheme(next);
}
