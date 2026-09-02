/**
 * Recover from stale Mix/webpack chunks after a deploy.
 *
 * Typical failure: an open tab (or cached HTML) still references deleted
 * contenthashed chunks → ChunkLoadError / failed dynamic import.
 *
 * Policy: clear deployment caches, perform at most one controlled reload per
 * tab session, then surface a recoverable error (no reload loops).
 */

export const CHUNK_RELOAD_SESSION_KEY = 'mutqin.chunkReload';
export const CHUNK_RELOAD_NOTICE_ID = 'mutqin-chunk-reload-notice';

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
    if (!error) return false;
    const name = String(error.name || '');
    const message = String(error.message || error.reason || '');
    return (
        name === 'ChunkLoadError'
        || /Loading chunk [\w.-]+ failed/i.test(message)
        || /Failed to fetch dynamically imported module/i.test(message)
        || /error loading dynamically imported module/i.test(message)
        || /Importing a module script failed/i.test(message)
        || /Loading CSS chunk [\w.-]+ failed/i.test(message)
    );
}

/**
 * @param {Storage | null | undefined} store
 * @returns {boolean}
 */
export function hasAttemptedChunkReload(store = defaultSessionStore()) {
    if (!store) return false;
    try {
        return store.getItem(CHUNK_RELOAD_SESSION_KEY) === '1';
    } catch (_) {
        return false;
    }
}

/**
 * @param {Storage | null | undefined} store
 */
export function markChunkReloadAttempted(store = defaultSessionStore()) {
    if (!store) return;
    try {
        store.setItem(CHUNK_RELOAD_SESSION_KEY, '1');
    } catch (_) { /* ignore quota / private mode */ }
}

/**
 * Clear the one-shot reload flag after a successful boot so a later deploy
 * can recover again in the same tab.
 *
 * @param {Storage | null | undefined} store
 */
export function clearChunkReloadFlag(store = defaultSessionStore()) {
    if (!store) return;
    try {
        store.removeItem(CHUNK_RELOAD_SESSION_KEY);
    } catch (_) { /* ignore */ }
}

/**
 * Drop service workers and Cache Storage entries so a reload can pick up the
 * new HTML shell + Mix manifest URLs.
 *
 * @returns {Promise<void>}
 */
export async function clearDeploymentCaches() {
    const tasks = [];

    if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
        tasks.push(
            navigator.serviceWorker.getRegistrations().then((regs) =>
                Promise.all(regs.map((r) => r.unregister()))
            ).catch(() => {})
        );
    }

    if (typeof caches !== 'undefined') {
        tasks.push(
            caches.keys().then((keys) =>
                Promise.all(
                    keys
                        .filter((key) => key.startsWith('mutqin-') || key.includes('workbox'))
                        .map((key) => caches.delete(key))
                )
            ).catch(() => {})
        );
    }

    await Promise.all(tasks);
}

/**
 * @param {string} [message]
 */
export function showChunkReloadNotice(message = 'Updating Mutqin…') {
    if (typeof document === 'undefined') return;
    if (document.getElementById(CHUNK_RELOAD_NOTICE_ID)) return;
    try {
        const notice = document.createElement('div');
        notice.id = CHUNK_RELOAD_NOTICE_ID;
        notice.setAttribute('role', 'status');
        notice.style.cssText = [
            'position:fixed',
            'inset:0',
            'z-index:99999',
            'display:flex',
            'align-items:center',
            'justify-content:center',
            'padding:24px',
            'background:rgba(0,0,0,.45)',
            'color:#fff',
            'font:500 1rem/1.4 system-ui,sans-serif',
            'text-align:center',
        ].join(';');
        notice.textContent = message;
        document.body?.appendChild(notice);
    } catch (_) { /* best-effort */ }
}

/**
 * @typedef {{
 *   store?: Storage | null,
 *   reload?: (url: string) => void,
 *   clearCaches?: () => Promise<void>,
 *   showNotice?: (message?: string) => void,
 *   noticeMessage?: string,
 *   locationHref?: string,
 * }} RecoverOptions
 */

/**
 * Attempt a single controlled reload for a stale-chunk failure.
 *
 * @param {unknown} error
 * @param {RecoverOptions} [options]
 * @returns {'reloading' | 'give_up' | 'not_chunk_error'}
 */
export function recoverFromStaleChunk(error, options = {}) {
    if (!isChunkLoadError(error)) return 'not_chunk_error';

    const store = options.store === undefined ? defaultSessionStore() : options.store;
    if (hasAttemptedChunkReload(store)) {
        return 'give_up';
    }

    markChunkReloadAttempted(store);

    const showNotice = options.showNotice || showChunkReloadNotice;
    showNotice(options.noticeMessage);

    const href = options.locationHref
        || (typeof window !== 'undefined' ? window.location.href : '');
    const nextUrl = buildFreshReloadUrl(href);

    const clearCaches = options.clearCaches || clearDeploymentCaches;
    const reload = options.reload || defaultReload;

    Promise.resolve()
        .then(() => clearCaches())
        .catch(() => {})
        .finally(() => {
            reload(nextUrl);
        });

    return 'reloading';
}

/**
 * Strip prior force/cache-bust params and add a single controlled marker.
 *
 * @param {string} href
 * @returns {string}
 */
export function buildFreshReloadUrl(href) {
    try {
        const url = new URL(href, 'http://localhost');
        url.searchParams.delete('mutqin_force');
        url.searchParams.delete('_');
        url.searchParams.set('mutqin_chunk_reload', '1');
        if (/^https?:/i.test(href)) {
            return url.toString();
        }
        return `${url.pathname}${url.search}${url.hash}`;
    } catch (_) {
        return href || '/';
    }
}

/**
 * Retry a dynamic import a few times (covers Mix watch races), then one
 * deploy-safe reload, then rethrow for the async error UI.
 *
 * @param {() => Promise<any>} importer
 * @param {{
 *   feature?: string,
 *   maxRetries?: number,
 *   retryDelayMs?: number,
 *   recover?: typeof recoverFromStaleChunk,
 *   onGiveUp?: (error: unknown) => void,
 * }} [options]
 * @returns {Promise<any>}
 */
export function wrapChunkImport(importer, options = {}) {
    const maxRetries = options.maxRetries ?? 2;
    const retryDelayMs = options.retryDelayMs ?? 400;
    const recover = options.recover || recoverFromStaleChunk;

    const attempt = (n) => Promise.resolve()
        .then(() => importer())
        .catch((error) => {
            if (!isChunkLoadError(error)) {
                throw error;
            }

            if (n < maxRetries) {
                const delay = retryDelayMs * (n + 1);
                return new Promise((resolve, reject) => {
                    const schedule = typeof window !== 'undefined' && window.setTimeout
                        ? window.setTimeout.bind(window)
                        : setTimeout;
                    schedule(() => {
                        attempt(n + 1).then(resolve, reject);
                    }, delay);
                });
            }

            const outcome = recover(error, {
                noticeMessage: options.noticeMessage,
            });

            if (outcome === 'reloading') {
                // Hang the promise while navigation starts — avoids flashing error UI.
                return new Promise(() => {});
            }

            if (typeof options.onGiveUp === 'function') {
                options.onGiveUp(error);
            }
            throw error;
        });

    return attempt(0);
}

function defaultSessionStore() {
    try {
        if (typeof sessionStorage !== 'undefined') return sessionStorage;
    } catch (_) { /* ignore */ }
    return null;
}

function defaultReload(url) {
    if (typeof window === 'undefined') return;
    try {
        window.location.replace(url);
    } catch (_) {
        window.location.href = url;
    }
}
