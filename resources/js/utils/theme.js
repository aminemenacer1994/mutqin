const THEME_STORAGE_KEY = 'mutqin-theme';
const THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
const THEME_COOKIE_KEY = 'mutqin_theme';

/** PWA / browser chrome. Manifest splash stays light — OS cannot switch it with data-theme. */
export const THEME_CHROME = {
  light: { themeColor: '#0F7A5C', backgroundColor: '#F3F5F7', colorScheme: 'light' },
  sepia: { themeColor: '#0F7A5C', backgroundColor: '#f1e7d8', colorScheme: 'light' },
  dark: { themeColor: '#12324A', backgroundColor: '#12324A', colorScheme: 'dark' },
};

export function getThemeChrome(theme = 'light') {
  return THEME_CHROME[normalizeThemeToken(theme)] || THEME_CHROME.light;
}

export function applyThemeChrome(theme = 'light') {
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

export function normalizeThemeToken(value = 'light') {
  const theme = String(value || 'light').toLowerCase();
  if (theme === 'dark' || theme === 'dark-mode') return 'dark';
  if (theme === 'sepia' || theme === 'sepia-mode') return 'sepia';
  return 'light';
}

export function toThemePreference(value = 'light') {
  const theme = normalizeThemeToken(value);
  if (theme === 'dark') return 'dark-mode';
  if (theme === 'sepia') return 'sepia-mode';
  return 'light-mode';
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

export function getSavedTheme() {
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

  if (typeof window !== 'undefined' && window.mutqinInitialTheme) {
    return normalizeThemeToken(window.mutqinInitialTheme);
  }

  return 'light';
}

export function setGlobalTheme(theme, options = {}) {
  const { dispatchEvent = true } = options;
  const normalizedTheme = normalizeThemeToken(theme);
  const themePreference = toThemePreference(normalizedTheme);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.cookie = `${THEME_COOKIE_KEY}=${themePreference};path=/;max-age=31536000;samesite=lax`;
    applyThemeChrome(normalizedTheme);
  }

  safeSet(THEME_STORAGE_KEY, normalizedTheme);
  safeSet(THEME_PREFERENCE_KEY, themePreference);

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
