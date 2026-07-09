const THEME_STORAGE_KEY = 'mutqin-theme';
const THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
const THEME_COOKIE_KEY = 'mutqin_theme';

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

export function cycleGlobalTheme(themes = ['light', 'dark']) {
  const current = getSavedTheme();
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  return setGlobalTheme(next);
}
