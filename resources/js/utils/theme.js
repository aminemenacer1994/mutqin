const THEME_STORAGE_KEY = 'mutqin-theme';
const THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
const THEME_COOKIE_KEY = 'mutqin_theme';
const THEME_CHOSEN_COOKIE_KEY = 'mutqin_theme_set';
export const DEFAULT_THEME = 'light';

/** Legacy unscoped keys — cleared on logout; never authoritative for signed-in users. */
export const SHARED_THEME_STORAGE_KEYS = Object.freeze([
  THEME_STORAGE_KEY,
  THEME_PREFERENCE_KEY,
]);

/**
 * Canonical app colour modes. Keep in sync with App\Support\Theme.
 * Do not add ids that are not already html[data-theme] tokens.
 */
export const THEME_MODES = Object.freeze([
  {
    id: 'light',
    preference: 'light-mode',
    icon: 'bi-sun',
    labelKey: 'theme_light',
    themeColor: '#8b5e3c',
    backgroundColor: '#f6f3ee',
    colorScheme: 'light',
  },
  {
    id: 'sepia',
    preference: 'sepia-mode',
    icon: 'bi-book',
    labelKey: 'theme_sepia',
    themeColor: '#8b5e3c',
    backgroundColor: '#f1e7d8',
    colorScheme: 'light',
  },
  {
    id: 'dark',
    preference: 'dark-mode',
    icon: 'bi-moon-stars',
    labelKey: 'theme_dark',
    themeColor: '#14110f',
    backgroundColor: '#14110f',
    colorScheme: 'dark',
  },
]);

export const THEME_MODE_IDS = Object.freeze(THEME_MODES.map((mode) => mode.id));

/** PWA / browser chrome. Manifest splash stays light — OS cannot switch it with data-theme. */
export const THEME_CHROME = Object.freeze(
  Object.fromEntries(THEME_MODES.map((mode) => [mode.id, {
    themeColor: mode.themeColor,
    backgroundColor: mode.backgroundColor,
    colorScheme: mode.colorScheme,
  }])),
);

export function getThemeMode(theme = DEFAULT_THEME) {
  const id = normalizeThemeToken(theme);
  return THEME_MODES.find((mode) => mode.id === id)
    || THEME_MODES.find((mode) => mode.id === DEFAULT_THEME)
    || THEME_MODES[0];
}

export function getThemeChrome(theme = DEFAULT_THEME) {
  return THEME_CHROME[normalizeThemeToken(theme)] || THEME_CHROME[DEFAULT_THEME];
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
  const match = THEME_MODES.find((mode) => mode.id === theme || mode.preference === theme);
  return match ? match.id : DEFAULT_THEME;
}

export function toThemePreference(value = DEFAULT_THEME) {
  return getThemeMode(value).preference;
}

function safeRemove(key) {
  try {
    localStorage.removeItem(key);
  } catch {}
}

function readCookieTheme() {
  if (typeof document === 'undefined') return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${THEME_COOKIE_KEY}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : null;
}

function isAuthenticated() {
  return typeof window !== 'undefined' && !!window.mutqinAuthCheck;
}

/**
 * Stable owner id for device cache. Guests share one bucket; accounts never share.
 * @returns {string}
 */
export function getThemeOwnerId() {
  if (typeof window === 'undefined') return 'guest';
  if (!window.mutqinAuthCheck) return 'guest';
  const id = window.mutqinUserId;
  if (id != null && String(id).trim() !== '') return String(id);
  return 'guest';
}

export function themeStorageKeyForOwner(ownerId = getThemeOwnerId()) {
  const id = ownerId != null && String(ownerId).trim() !== '' ? String(ownerId) : 'guest';
  return `${THEME_STORAGE_KEY}.${id}`;
}

export function themePreferenceStorageKeyForOwner(ownerId = getThemeOwnerId()) {
  const id = ownerId != null && String(ownerId).trim() !== '' ? String(ownerId) : 'guest';
  return `${THEME_PREFERENCE_KEY}.${id}`;
}

/** True when a storage event key belongs to the current owner's theme cache. */
export function isCurrentOwnerThemeStorageKey(key) {
  if (!key) return false;
  const ownerId = getThemeOwnerId();
  return key === themeStorageKeyForOwner(ownerId)
    || key === themePreferenceStorageKeyForOwner(ownerId);
}

function getServerInitialTheme() {
  if (typeof window === 'undefined') return null;
  if (window.mutqinInitialTheme) return normalizeThemeToken(window.mutqinInitialTheme);
  if (window.mutqinInitialThemePreference) {
    return normalizeThemeToken(window.mutqinInitialThemePreference);
  }
  return null;
}

function rememberLiveAccountTheme(normalizedTheme, themePreference) {
  if (typeof window === 'undefined') return;
  window.mutqinInitialTheme = normalizedTheme;
  window.mutqinInitialThemePreference = themePreference;
}

function themeCsrfHeaders() {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  };
  if (typeof document === 'undefined') return headers;

  const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content');
  if (csrf) headers['X-CSRF-TOKEN'] = csrf;

  const match = document.cookie.match(/(?:^|; )XSRF-TOKEN=([^;]*)/);
  if (match?.[1]) {
    try {
      headers['X-XSRF-TOKEN'] = decodeURIComponent(match[1]);
    } catch {
      headers['X-XSRF-TOKEN'] = match[1];
    }
  }
  return headers;
}

/** Drop leftover theme keys so one account cannot inherit another device cache. */
export function clearThemeDeviceCache() {
  safeRemove(THEME_STORAGE_KEY);
  safeRemove(THEME_PREFERENCE_KEY);
  if (typeof localStorage === 'undefined') return;
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(`${THEME_STORAGE_KEY}.`) || key.startsWith(`${THEME_PREFERENCE_KEY}.`)) {
        stale.push(key);
      }
    }
    stale.forEach(safeRemove);
  } catch {}
}

export function getSavedTheme() {
  // Live DOM is authoritative after the user toggles on this page (avoids stale
  // cycle jumps when account snapshot hasn't refreshed yet).
  if (typeof document !== 'undefined') {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme) return normalizeThemeToken(htmlTheme);
  }

  // Signed-in: users.theme from SSR — never localStorage or another person's cookie.
  if (isAuthenticated()) {
    return getServerInitialTheme() || DEFAULT_THEME;
  }

  const cookieTheme = readCookieTheme();
  if (cookieTheme) return normalizeThemeToken(cookieTheme);

  const serverTheme = getServerInitialTheme();
  if (serverTheme) return serverTheme;

  return DEFAULT_THEME;
}

async function persistThemeToServer(themePreference) {
  if (typeof window === 'undefined' || !window.mutqinAuthCheck) return;
  const send = () => fetch('/api/profile/theme', {
    method: 'PATCH',
    headers: themeCsrfHeaders(),
    credentials: 'same-origin',
    body: JSON.stringify({ theme: themePreference }),
  });

  try {
    let response = await send();
    if (response.status === 419) {
      await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      response = await send();
    }
    if (!response.ok) return;
    const payload = await response.json().catch(() => null);
    if (payload?.theme) {
      rememberLiveAccountTheme(normalizeThemeToken(payload.theme), String(payload.theme));
    }
  } catch {
    // Same-page UI already applied; the next successful PATCH or SSR reload heals.
  }
}

export function setGlobalTheme(theme, options = {}) {
  const { dispatchEvent = true, persist = true } = options;
  const normalizedTheme = normalizeThemeToken(theme);
  const themePreference = toThemePreference(normalizedTheme);
  const ownerId = getThemeOwnerId();

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    document.cookie = `${THEME_COOKIE_KEY}=${themePreference};path=/;max-age=31536000;samesite=lax`;
    if (persist) {
      document.cookie = `${THEME_CHOSEN_COOKIE_KEY}=1;path=/;max-age=31536000;samesite=lax`;
    }
    applyThemeChrome(normalizedTheme);
  }

  // Theme is account-owned (users.theme) or a guest cookie — never localStorage.
  clearThemeDeviceCache();

  if (isAuthenticated()) {
    rememberLiveAccountTheme(normalizedTheme, themePreference);
  }

  if (persist) {
    persistThemeToServer(themePreference);
  }

  if (dispatchEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mutqin:theme-change', {
      detail: { theme: normalizedTheme, ownerId },
    }));
  }

  return normalizedTheme;
}

export function cycleGlobalTheme(themes = THEME_MODE_IDS) {
  // Always advance from the live attribute — never from a stale account snapshot.
  const current = typeof document !== 'undefined'
    ? normalizeThemeToken(document.documentElement.getAttribute('data-theme') || getSavedTheme())
    : getSavedTheme();
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  return setGlobalTheme(next);
}
