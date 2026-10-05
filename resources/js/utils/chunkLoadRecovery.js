/**
 * Recover from stale Mix/webpack chunks after a deploy.
 *
 * Typical failure: an open tab (or cached HTML) still references deleted
 * contenthashed chunks → ChunkLoadError / failed dynamic import.
 *
 * Policy: clear deployment caches, persist in-session work via an event,
 * perform at most one controlled reload per tab session, then surface a
 * recoverable error (no reload loops). Offline / ordinary network failures
 * never auto-reload.
 */

export const CHUNK_RELOAD_SESSION_KEY = 'mutqin.chunkReload';
export const CHUNK_RELOAD_TTL_MS = 10 * 60 * 1000;
export const CHUNK_RELOAD_NOTICE_ID = 'mutqin-chunk-reload-notice';
export const BEFORE_CHUNK_RELOAD_EVENT = 'mutqin:before-chunk-reload';
export const CHUNK_RELOAD_QUERY_PARAM = 'mutqin_chunk_reload';

/**
 * Mix production lazy assets: /js/<name>.<8-hex>.js (and watch aliases /js/<name>.js).
 *
 * @param {unknown} url
 * @returns {boolean}
 */
export function isStaleMixAssetUrl(url) {
    const raw = String(url || '').trim();
    if (!raw) return false;
    try {
        const path = new URL(raw, 'http://localhost').pathname;
        if (/^\/js\/(?:[a-z][a-z0-9_-]*|\d+)(?:\.[a-f0-9]{8})?\.js$/i.test(path)) return true;
        if (/^\/css\/app(?:\.[a-f0-9]{8})?\.css$/i.test(path)) return true;
        return false;
    } catch (_) {
        return /\/js\/[a-z][a-z0-9_-]*\.[a-f0-9]{8}\.js(?:$|\?)/i.test(raw);
    }
}

/**
 * Webpack 5 Mix JSONP failure kind: missing | error | timeout.
 *
 * @param {unknown} error
 * @returns {string}
 */
export function chunkFailureType(error) {
    if (!error || typeof error !== 'object') return '';
    const typed = String(error.type || '').toLowerCase();
    if (typed) return typed;
    const message = String(error.message || error.reason || '');
    const match = message.match(/Loading (?:CSS )?chunk [\w.-]+ failed\s*\((\w+):/i);
    return match ? match[1].toLowerCase() : '';
}

/**
 * @param {unknown} error
 * @returns {boolean}
 */
export function isChunkLoadError(error) {
    if (!error) return false;
    const name = String(error.name || '');
    const message = String(error.message || error.reason || '');
    const request = String(error.request || error.src || '');
    if (name === 'ChunkLoadError') return true;
    if (
        /Loading chunk [\w.-]+ failed/i.test(message)
        || /Failed to fetch dynamically imported module/i.test(message)
        || /error loading dynamically imported module/i.test(message)
        || /Importing a module script failed/i.test(message)
        || /Loading CSS chunk [\w.-]+ failed/i.test(message)
    ) {
        return true;
    }
    if (request && isStaleMixAssetUrl(request) && /failed|404|not found/i.test(message)) {
        return true;
    }
    return false;
}

/**
 * True only for a likely post-deploy missing chunk — not offline, not a
 * webpack timeout, not Speechmatics/API/generic JS failures.
 *
 * @param {unknown} error
 * @param {{ offline?: boolean }} [options]
 * @returns {boolean}
 */
export function isLikelyStaleDeploymentError(error, options = {}) {
    const offline = options.offline !== undefined ? !!options.offline : defaultOffline();
    if (offline) return false;
    if (chunkFailureType(error) === 'timeout') return false;
    if (isChunkLoadError(error)) return true;
    return isStaleAssetResourceError(error);
}

/**
 * Script/link element load failure for a Mix hashed (or named) asset.
 *
 * @param {unknown} errorOrEvent
 * @returns {boolean}
 */
export function isStaleAssetResourceError(errorOrEvent) {
    if (!errorOrEvent || typeof errorOrEvent !== 'object') return false;
    const target = errorOrEvent.target;
    if (target && target !== (typeof window !== 'undefined' ? window : null)) {
        const tag = String(target.tagName || '').toUpperCase();
        if (tag === 'SCRIPT' || tag === 'LINK') {
            return isStaleMixAssetUrl(target.src || target.href);
        }
    }
    return isStaleMixAssetUrl(errorOrEvent.request || errorOrEvent.src || errorOrEvent.href);
}

/**
 * @param {Storage | null | undefined} store
 * @returns {boolean}
 */
export function hasAttemptedChunkReload(store = defaultSessionStore()) {
    if (!store) return false;
    try {
        const raw = store.getItem(CHUNK_RELOAD_SESSION_KEY);
        if (!raw) return false;
        if (raw === '1') return true;

        const payload = JSON.parse(raw);
        const attemptedAt = Number(payload?.attemptedAt || 0);
        if (!Number.isFinite(attemptedAt) || attemptedAt <= 0) return true;
        if (Date.now() - attemptedAt <= CHUNK_RELOAD_TTL_MS) return true;
        store.removeItem(CHUNK_RELOAD_SESSION_KEY);
        return false;
    } catch (_) {
        return true;
    }
}

/**
 * @param {Storage | null | undefined} store
 */
export function markChunkReloadAttempted(store = defaultSessionStore()) {
    if (!store) return;
    try {
        store.setItem(CHUNK_RELOAD_SESSION_KEY, JSON.stringify({ attemptedAt: Date.now() }));
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
 * new HTML shell + Mix manifest URLs. Does not touch session/localStorage
 * (memorisation progress lives there).
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
 * Let the memorisation workspace flush persisted progress before navigation.
 * Synchronous listeners only — do not await network autosave.
 *
 * @param {unknown} [error]
 */
export function notifyBeforeChunkReload(error) {
    if (typeof window === 'undefined') return;
    try {
        window.dispatchEvent(new CustomEvent(BEFORE_CHUNK_RELOAD_EVENT, {
            detail: { error },
        }));
    } catch (_) { /* ignore */ }
}

/**
 * @typedef {{
 *   store?: Storage | null,
 *   reload?: (url: string) => void,
 *   clearCaches?: () => Promise<void>,
 *   showNotice?: (message?: string) => void,
 *   noticeMessage?: string,
 *   locationHref?: string,
 *   offline?: boolean,
 *   persist?: (error?: unknown) => void,
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
    if (!isChunkLoadError(error) && !isStaleAssetResourceError(error)) {
        return 'not_chunk_error';
    }
    if (!isLikelyStaleDeploymentError(error, { offline: options.offline })) {
        return 'give_up';
    }

    const store = options.store === undefined ? defaultSessionStore() : options.store;
    if (hasAttemptedChunkReload(store)) {
        return 'give_up';
    }

    markChunkReloadAttempted(store);

    try {
        const persist = options.persist || notifyBeforeChunkReload;
        persist(error);
    } catch (_) { /* never block recovery */ }

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
        url.searchParams.set(CHUNK_RELOAD_QUERY_PARAM, '1');
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
 *   noticeMessage?: string,
 *   offline?: boolean,
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

            const offline = options.offline !== undefined ? !!options.offline : defaultOffline();
            if (offline) {
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
                offline,
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

/**
 * Catch Mix script/CSS JSONP failures that never pass through wrapChunkImport.
 *
 * @param {{ noticeMessage?: string }} [options]
 */
export function installChunkLoadRecovery(options = {}) {
    if (typeof window === 'undefined' || window.__mutqinChunkRecoveryInstalled) return;
    window.__mutqinChunkRecoveryInstalled = true;

    const recover = (error) => recoverFromStaleChunk(error, {
        noticeMessage: options.noticeMessage,
    });

    window.addEventListener('unhandledrejection', (event) => {
        const outcome = recover(event?.reason);
        if (outcome === 'reloading' && typeof event.preventDefault === 'function') {
            event.preventDefault();
        }
    });

    // Script/link 404s also reject the matching import(). Wait so wrapChunkImport
    // can retry Mix watch races before this safety net reloads.
    let resourceTimer = 0;
    window.addEventListener('error', (event) => {
        if (!isStaleAssetResourceError(event)) return;
        if (typeof window.clearTimeout === 'function' && resourceTimer) {
            window.clearTimeout(resourceTimer);
        }
        const schedule = typeof window.setTimeout === 'function' ? window.setTimeout.bind(window) : setTimeout;
        resourceTimer = schedule(() => recover(event), 1500);
    }, true);
}

export function resetChunkLoadRecoveryForTests() {
    if (typeof window !== 'undefined') {
        window.__mutqinChunkRecoveryInstalled = false;
    }
}

function defaultOffline() {
    try {
        return typeof navigator !== 'undefined' && navigator.onLine === false;
    } catch (_) {
        return false;
    }
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
