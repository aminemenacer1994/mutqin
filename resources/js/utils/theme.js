const THEME_STORAGE_PREFIX = 'mutqin:theme';
const LEGACY_THEME_STORAGE_KEY = 'mutqin-theme';
const LEGACY_THEME_PREFERENCE_KEY = 'mutqin-theme-preference';
const THEME_COOKIE_KEY = 'mutqin_theme';
const THEME_CHOSEN_COOKIE_KEY = 'mutqin_theme_set';

export const DEFAULT_THEME = 'light';

/** Legacy unscoped keys cleared on account switch / migration. */
export const SHARED_THEME_STORAGE_KEYS = Object.freeze([
  LEGACY_THEME_STORAGE_KEY,
  LEGACY_THEME_PREFERENCE_KEY,
]);

/**
 * Canonical app colour modes. Keep in sync with App\Support\Theme.
 */
export const THEME_MODES = Object.freeze([
  {
    id: 'light',
    preference: 'light',
    icon: 'bi-sun',
    labelKey: 'theme_light',
    themeColor: '#8b5e3c',
    backgroundColor: '#f6f3ee',
    colorScheme: 'light',
  },
  {
    id: 'sepia',
    preference: 'sepia',
    icon: 'bi-sunset',
    labelKey: 'theme_sepia',
    themeColor: '#8b5e3c',
    backgroundColor: '#f4ecd8',
    colorScheme: 'light',
  },
  {
    id: 'dark',
    preference: 'dark',
    icon: 'bi-moon-stars',
    labelKey: 'theme_dark',
    themeColor: '#14110f',
    backgroundColor: '#14110f',
    colorScheme: 'dark',
  },
]);

export const THEME_MODE_IDS = Object.freeze(THEME_MODES.map((mode) => mode.id));

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
  if (theme === 'dark' || theme === 'dark-mode') return 'dark';
  if (theme === 'sepia' || theme === 'sepia-mode') return 'sepia';
  if (theme === 'light' || theme === 'light-mode') return 'light';
  const match = THEME_MODES.find((mode) => mode.id === theme || mode.preference === theme);
  return match ? match.id : DEFAULT_THEME;
}

export function toThemePreference(value = DEFAULT_THEME) {
  return getThemeMode(value).preference;
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
    return true;
  } catch {
    return false;
  }
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
  return `${THEME_STORAGE_PREFIX}:${id}`;
}

/** @deprecated Per-owner preference uses the same key as themeStorageKeyForOwner. */
export function themePreferenceStorageKeyForOwner(ownerId = getThemeOwnerId()) {
  return themeStorageKeyForOwner(ownerId);
}

export function isCurrentOwnerThemeStorageKey(key) {
  if (!key) return false;
  return key === themeStorageKeyForOwner(getThemeOwnerId());
}

function readLocalTheme(key) {
  const raw = safeGet(key);
  if (!raw) return null;
  return normalizeThemeToken(raw);
}

function readLegacyLocalTheme(ownerId) {
  const legacyScoped = safeGet(`${LEGACY_THEME_STORAGE_KEY}.${ownerId}`);
  if (legacyScoped) return normalizeThemeToken(legacyScoped);
  const legacyShared = safeGet(LEGACY_THEME_STORAGE_KEY);
  if (legacyShared) return normalizeThemeToken(legacyShared);
  return null;
}

function getAccountThemeFromServer() {
  if (typeof window === 'undefined') return null;
  if (window.mutqinAccountTheme) {
    return normalizeThemeToken(window.mutqinAccountTheme);
  }
  if (window.mutqinInitialTheme) {
    return normalizeThemeToken(window.mutqinInitialTheme);
  }
  if (window.mutqinInitialThemePreference) {
    return normalizeThemeToken(window.mutqinInitialThemePreference);
  }
  return null;
}

/**
 * Resolution order: account server theme → per-user localStorage → guest key → light.
 * @param {{ userId?: string|null, accountTheme?: string|null }} [options]
 */
export function resolveThemeForLoad(options = {}) {
  const userId = options.userId != null ? String(options.userId) : getThemeOwnerId();
  const guestKey = themeStorageKeyForOwner('guest');

  if (userId !== 'guest' && isAuthenticated()) {
    const accountTheme = options.accountTheme != null
      ? normalizeThemeToken(options.accountTheme)
      : getAccountThemeFromServer();
    if (accountTheme) return accountTheme;

    return readLocalTheme(themeStorageKeyForOwner(userId))
      || readLegacyLocalTheme(userId)
      || readLocalTheme(guestKey)
      || readLegacyLocalTheme('guest')
      || DEFAULT_THEME;
  }

  return readLocalTheme(guestKey)
    || readLegacyLocalTheme('guest')
    || normalizeThemeToken(readCookieTheme())
    || normalizeThemeToken(options.accountTheme)
    || DEFAULT_THEME;
}

function rememberLiveAccountTheme(normalizedTheme, themePreference) {
  if (typeof window === 'undefined') return;
  window.mutqinInitialTheme = normalizedTheme;
  window.mutqinInitialThemePreference = themePreference;
  window.mutqinAccountTheme = normalizedTheme;
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

/** Drop legacy theme keys; never remove the active owner's mutqin:theme key. */
export function clearThemeDeviceCache() {
  safeRemove(LEGACY_THEME_STORAGE_KEY);
  safeRemove(LEGACY_THEME_PREFERENCE_KEY);
  if (typeof localStorage === 'undefined') return;
  try {
    const stale = [];
    for (let i = 0; i < localStorage.length; i += 1) {
      const key = localStorage.key(i);
      if (!key) continue;
      if (key.startsWith(`${LEGACY_THEME_STORAGE_KEY}.`) || key.startsWith(`${LEGACY_THEME_PREFERENCE_KEY}.`)) {
        stale.push(key);
      }
    }
    stale.forEach(safeRemove);
  } catch {}
}

export function getSavedTheme() {
  if (typeof document !== 'undefined') {
    const htmlTheme = document.documentElement.getAttribute('data-theme');
    if (htmlTheme) return normalizeThemeToken(htmlTheme);
  }

  return resolveThemeForLoad();
}

let themeSyncTimer = null;
let themeSyncRetryTimer = null;

async function persistThemeToServer(themePreference) {
  if (typeof window === 'undefined' || !window.mutqinAuthCheck) return;
  const send = () => fetch('/api/profile/theme', {
    method: 'PATCH',
    headers: themeCsrfHeaders(),
    credentials: 'same-origin',
    keepalive: true,
    body: JSON.stringify({ theme: themePreference }),
  });

  try {
    let response = await send();
    if (response.status === 419) {
      await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin', headers: { Accept: 'application/json' } });
      response = await send();
    }
    if (!response.ok) {
      themeSyncRetryTimer = window.setTimeout(() => {
        persistThemeToServer(themePreference);
      }, 5000);
      return;
    }
    const payload = await response.json().catch(() => null);
    if (payload?.theme) {
      const normalized = normalizeThemeToken(payload.theme);
      rememberLiveAccountTheme(normalized, toThemePreference(normalized));
    }
  } catch {
    themeSyncRetryTimer = window.setTimeout(() => {
      persistThemeToServer(themePreference);
    }, 5000);
  }
}

function schedulePersistThemeToServer(themePreference) {
  if (typeof window === 'undefined') return;
  if (themeSyncTimer) window.clearTimeout(themeSyncTimer);
  themeSyncTimer = window.setTimeout(() => {
    themeSyncTimer = null;
    persistThemeToServer(themePreference);
  }, 300);
}

function syncLegacyDarkModeClass(normalizedTheme) {
  if (typeof document === 'undefined') return;
  const isDark = normalizeThemeToken(normalizedTheme) === 'dark';
  document.documentElement.classList.toggle('dark-mode', isDark);
  if (document.body) document.body.classList.toggle('dark-mode', isDark);
}

export function setGlobalTheme(theme, options = {}) {
  const { dispatchEvent = true, persist = true } = options;
  const normalizedTheme = normalizeThemeToken(theme);
  const themePreference = toThemePreference(normalizedTheme);
  const ownerId = getThemeOwnerId();
  const storageKey = themeStorageKeyForOwner(ownerId);

  if (typeof document !== 'undefined') {
    document.documentElement.setAttribute('data-theme', normalizedTheme);
    syncLegacyDarkModeClass(normalizedTheme);
    document.cookie = `${THEME_COOKIE_KEY}=${themePreference};path=/;max-age=31536000;samesite=lax`;
    if (persist) {
      document.cookie = `${THEME_CHOSEN_COOKIE_KEY}=1;path=/;max-age=31536000;samesite=lax`;
    }
    applyThemeChrome(normalizedTheme);
  }

  if (persist) {
    safeSet(storageKey, normalizedTheme);
  }
  clearThemeDeviceCache();

  if (isAuthenticated()) {
    rememberLiveAccountTheme(normalizedTheme, themePreference);
  }

  if (persist) {
    schedulePersistThemeToServer(themePreference);
  }

  if (dispatchEvent && typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('mutqin:theme-change', {
      detail: { theme: normalizedTheme, ownerId },
    }));
  }

  return normalizedTheme;
}

export function cycleGlobalTheme(themes = THEME_MODE_IDS) {
  const current = typeof document !== 'undefined'
    ? normalizeThemeToken(document.documentElement.getAttribute('data-theme') || getSavedTheme())
    : getSavedTheme();
  const idx = themes.indexOf(current);
  const next = themes[(idx + 1) % themes.length];
  return setGlobalTheme(next);
}

/** Cross-tab sync when another tab writes mutqin:theme:{owner}. */
export function initThemeStorageSync() {
  if (typeof window === 'undefined') return;
  window.addEventListener('storage', (event) => {
    if (!isCurrentOwnerThemeStorageKey(event.key)) return;
    if (event.newValue == null) return;
    setGlobalTheme(event.newValue, { persist: false, dispatchEvent: true });
  });
}

/**
 * Apply persisted theme after the shell globals are available (non-FOUC pass).
 */
export function bootstrapThemeFromStore() {
  const resolved = resolveThemeForLoad();
  setGlobalTheme(resolved, { persist: false, dispatchEvent: false });
  return resolved;
}
