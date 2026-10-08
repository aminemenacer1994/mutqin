/**
 * PWA bootstrap.
 *
 * Phone viewports + Apple devices (iPhone / iPad / Mac): register the service
 * worker so install works across browsers. Non-Apple desktop stays SW-free.
 *
 * Chromium (Android + Mac): native beforeinstallprompt banner when available.
 * Auth pages: Apple install guide with Safari / Chrome / Edge / Firefox steps
 * (iOS never fires beforeinstallprompt for third-party browsers either).
 *
 * Auth pages live inside Vue's `#app` mount. Listeners must use event delegation
 * because Vue re-renders the login/register DOM after async i18n bootstrap.
 */

import { getBrowserInfo } from './scripts/browser/getBrowserInfo';

const MOBILE_MQ = '(max-width: 767.98px)';
const INSTALL_DISMISS_KEY = 'mutqin.pwa.install.dismissed';
const IOS_INSTALL_DISMISS_KEY = 'mutqin.pwa.ios-install.dismissed';
const APPLE_INSTALL_BROWSERS = ['safari', 'chrome', 'edge', 'firefox'];

function uiLabel(key) {
    const locale = window.mutqinInitialLocale
        || document.documentElement.getAttribute('lang')
        || 'en';
    const pack = window.mutqinUiLabels?.[locale] || window.mutqinUiLabels?.en || {};
    return pack[key] || window.mutqinUiLabels?.en?.[key] || key;
}

function isMobileViewport() {
    return window.matchMedia(MOBILE_MQ).matches;
}

function isStandaloneDisplay() {
    return (
        window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
    );
}

function isIosDevice() {
    return getBrowserInfo().isIOS;
}

function isAndroidDevice() {
    return /Android/i.test(window.navigator.userAgent || '');
}

function isAppleMacDesktop() {
    if (isIosDevice()) return false;
    const ua = window.navigator.userAgent || '';
    return /Macintosh|Mac OS X/i.test(ua);
}

function isAppleDevice() {
    return isIosDevice() || isAppleMacDesktop();
}

function appleInstallPlatform() {
    return isAppleMacDesktop() ? 'mac' : 'touch';
}

function detectAppleInstallBrowser() {
    const { browser } = getBrowserInfo();
    if (APPLE_INSTALL_BROWSERS.includes(browser)) return browser;
    return 'safari';
}

function shouldRegisterServiceWorker() {
    // Phones + any Apple device (incl. iPad landscape / Mac) so Chrome/Edge
    // can install. Non-Apple desktop stays free of SW shells.
    return isMobileViewport() || isAppleDevice();
}

function isAuthInstallPage() {
    const path = (window.location.pathname || '/').replace(/\/+$/, '') || '/';
    return path === '/login' || path === '/register';
}

function wantsIosInstallPreview() {
    try {
        return new URLSearchParams(window.location.search).get('ios_install') === '1';
    } catch (_) {
        return false;
    }
}

async function unregisterServiceWorkers() {
    if (!('serviceWorker' in navigator)) return;
    const registrations = await navigator.serviceWorker.getRegistrations();
    await Promise.all(registrations.map((registration) => registration.unregister()));
    if ('caches' in window) {
        const keys = await caches.keys();
        await Promise.all(
            keys
                .filter((key) => key.startsWith('mutqin-'))
                .map((key) => caches.delete(key))
        );
    }
}

function registerServiceWorker() {
    if (!('serviceWorker' in navigator) || window.location.protocol !== 'https:') {
        return;
    }

    const serviceWorkerUrl = new URL('/sw.js', window.location.origin).href;
    navigator.serviceWorker
        .register(serviceWorkerUrl)
        .then((registration) => {
            registration.update().catch(() => {});
            // Ask waiting workers to activate immediately after deploy.
            if (registration.waiting) {
                registration.waiting.postMessage({ type: 'SKIP_WAITING' });
            }
            registration.addEventListener('updatefound', () => {
                const worker = registration.installing;
                if (!worker) return;
                worker.addEventListener('statechange', () => {
                    if (worker.state === 'installed' && navigator.serviceWorker.controller) {
                        worker.postMessage({ type: 'SKIP_WAITING' });
                    }
                });
            });
        })
        .catch((error) => {
            console.warn('Failed to register service worker:', error);
        });
}

function shouldShowInstallBanner() {
    if (isStandaloneDisplay()) return false;
    // iOS WebKit browsers never fire a useful beforeinstallprompt — guide covers them.
    if (isIosDevice()) return false;
    // Phone Chromium + Mac Chrome/Edge can use the native install UI.
    if (!isMobileViewport() && !isAppleMacDesktop()) return false;
    try {
        if (sessionStorage.getItem(INSTALL_DISMISS_KEY) === '1') return false;
    } catch (_) {
        /* ignore */
    }
    return true;
}

function createInstallBanner(deferredPrompt) {
    if (document.getElementById('mutqin-pwa-install')) return null;

    const banner = document.createElement('div');
    banner.id = 'mutqin-pwa-install';
    banner.className = 'mutqin-pwa-install';
    banner.setAttribute('role', 'dialog');
    banner.setAttribute('aria-label', uiLabel('pwa_chromium_install_aria'));
    banner.innerHTML = `
        <div class="mutqin-pwa-install__copy">
            <strong>${uiLabel('pwa_chromium_install_title')}</strong>
            <span>${uiLabel('pwa_chromium_install_body')}</span>
        </div>
        <div class="mutqin-pwa-install__actions">
            <button type="button" class="mutqin-pwa-install__btn mutqin-pwa-install__btn--primary" data-pwa-install>${uiLabel('pwa_chromium_install_cta')}</button>
            <button type="button" class="mutqin-pwa-install__btn mutqin-pwa-install__btn--ghost" data-pwa-dismiss aria-label="${uiLabel('pwa_chromium_dismiss_aria')}">${uiLabel('pwa_chromium_install_dismiss')}</button>
        </div>
    `;

    const dismiss = () => {
        try {
            sessionStorage.setItem(INSTALL_DISMISS_KEY, '1');
        } catch (_) {
            /* ignore */
        }
        banner.remove();
    };

    banner.querySelector('[data-pwa-dismiss]')?.addEventListener('click', dismiss);
    banner.querySelector('[data-pwa-install]')?.addEventListener('click', async () => {
        if (!deferredPrompt) return;
        deferredPrompt.prompt();
        try {
            await deferredPrompt.userChoice;
        } catch (_) {
            /* ignore */
        }
        dismiss();
    });

    document.body.appendChild(banner);
    return banner;
}

function setupInstallPrompt() {
    let deferredPrompt = null;

    window.addEventListener('beforeinstallprompt', (event) => {
        if (!shouldShowInstallBanner()) return;
        event.preventDefault();
        deferredPrompt = event;
        createInstallBanner(deferredPrompt);
    });

    window.addEventListener('appinstalled', () => {
        document.getElementById('mutqin-pwa-install')?.remove();
        deferredPrompt = null;
        hideIosInstallGuide();
    });
}

function wasIosInstallDismissed() {
    try {
        return localStorage.getItem(IOS_INSTALL_DISMISS_KEY) === '1';
    } catch (_) {
        return false;
    }
}

function persistIosInstallDismissed() {
    try {
        localStorage.setItem(IOS_INSTALL_DISMISS_KEY, '1');
    } catch (_) {
        /* ignore */
    }
}

function clearIosInstallDismissed() {
    try {
        localStorage.removeItem(IOS_INSTALL_DISMISS_KEY);
    } catch (_) {
        /* ignore */
    }
}

function shouldShowIosInstallGuide() {
    if (!isAuthInstallPage() || isStandaloneDisplay()) return false;

    // Force-show for local QA: /login?ios_install=1
    if (wantsIosInstallPreview()) {
        clearIosInstallDismissed();
        return true;
    }

    if (wasIosInstallDismissed()) return false;

    // Android uses the native beforeinstallprompt banner — don't show Apple steps.
    if (isAndroidDevice()) return false;

    // iPhone / iPad / Mac only (use ?ios_install=1 to preview elsewhere).
    return isAppleDevice();
}

function getIosModal() {
    return document.getElementById('mutqin-ios-pwa-modal')
        || document.querySelector('[data-ios-pwa-modal]');
}

function getIosRoot() {
    return document.getElementById('mutqin-ios-pwa')
        || document.querySelector('[data-ios-pwa-root]');
}

function ensureIosModalOnBody() {
    const modal = getIosModal();
    if (modal && modal.parentElement !== document.body) {
        document.body.appendChild(modal);
    }
    return modal;
}

function setIosModalOpen(modal, open) {
    if (!modal) return;
    modal.hidden = !open;
    modal.classList.toggle('is-open', open);
    modal.setAttribute('aria-hidden', open ? 'false' : 'true');
    document.documentElement.classList.toggle('mutqin-ios-pwa-open', open);
}

function syncAppleInstallPlatform(modal = getIosModal()) {
    if (!modal) return;
    const platform = appleInstallPlatform();
    modal.setAttribute('data-ios-pwa-platform', platform);
    modal.querySelectorAll('[data-ios-pwa-steps]').forEach((list) => {
        const match = list.getAttribute('data-ios-pwa-steps') === platform;
        list.hidden = !match;
    });
}

function selectAppleInstallBrowser(browserId, { focusTab = false } = {}) {
    const modal = getIosModal();
    if (!modal) return;
    const next = APPLE_INSTALL_BROWSERS.includes(browserId) ? browserId : 'safari';

    modal.querySelectorAll('[data-ios-pwa-browser]').forEach((tab) => {
        const active = tab.getAttribute('data-ios-pwa-browser') === next;
        tab.classList.toggle('is-active', active);
        tab.setAttribute('aria-selected', active ? 'true' : 'false');
        tab.tabIndex = active ? 0 : -1;
        if (active && focusTab) tab.focus();
    });

    modal.querySelectorAll('[data-ios-pwa-panel]').forEach((panel) => {
        const active = panel.getAttribute('data-ios-pwa-panel') === next;
        panel.classList.toggle('is-active', active);
        panel.hidden = !active;
    });
}

function applyAppleInstallGuideContext() {
    const modal = ensureIosModalOnBody();
    if (!modal) return;
    syncAppleInstallPlatform(modal);
    selectAppleInstallBrowser(detectAppleInstallBrowser());
}

function hideIosInstallGuide() {
    const root = getIosRoot();
    if (root) root.hidden = true;
    const modal = getIosModal();
    if (modal) setIosModalOpen(modal, false);
}

function revealIosInstallTrigger() {
    const root = getIosRoot();
    if (!root) return null;
    root.hidden = false;
    root.removeAttribute('hidden');
    return root;
}

function openIosInstallModal() {
    if (!shouldShowIosInstallGuide()) return;
    const modal = ensureIosModalOnBody();
    if (!modal) return;
    applyAppleInstallGuideContext();
    setIosModalOpen(modal, true);
}

function closeIosInstallModal() {
    const modal = getIosModal();
    if (modal) setIosModalOpen(modal, false);
}

function dismissIosInstallGuide() {
    persistIosInstallDismissed();
    closeIosInstallModal();
    const root = getIosRoot();
    if (root) root.hidden = true;
}

let iosInstallGuideBound = false;

function bindIosInstallGuideEvents() {
    if (iosInstallGuideBound) return;
    iosInstallGuideBound = true;

    // Delegate from document so Vue remounting #app cannot drop handlers.
    document.addEventListener('click', (event) => {
        const target = event.target;
        if (!(target instanceof Element)) return;

        const browserTab = target.closest('[data-ios-pwa-browser]');
        if (browserTab) {
            event.preventDefault();
            selectAppleInstallBrowser(browserTab.getAttribute('data-ios-pwa-browser') || 'safari', {
                focusTab: true,
            });
            return;
        }

        if (target.closest('[data-ios-pwa-open]')) {
            event.preventDefault();
            openIosInstallModal();
            return;
        }

        if (target.closest('[data-ios-pwa-dismiss]')) {
            event.preventDefault();
            dismissIosInstallGuide();
            return;
        }

        if (target.closest('[data-ios-pwa-close]')) {
            event.preventDefault();
            closeIosInstallModal();
            return;
        }

        const modal = getIosModal();
        if (modal && !modal.hidden && target === modal) {
            closeIosInstallModal();
        }
    });

    document.addEventListener('keydown', (event) => {
        if (event.key !== 'Escape') return;
        const modal = getIosModal();
        if (modal && !modal.hidden) {
            closeIosInstallModal();
        }
    });
}

function setupIosInstallGuide() {
    bindIosInstallGuideEvents();

    if (!shouldShowIosInstallGuide()) {
        hideIosInstallGuide();
        return;
    }

    // Move the overlay outside Vue's #app before/after mount so it is not destroyed.
    applyAppleInstallGuideContext();
    revealIosInstallTrigger();
}

function syncDisplayModeClass() {
    document.documentElement.classList.toggle('mutqin-pwa-standalone', isStandaloneDisplay());
    document.documentElement.classList.toggle('mutqin-pwa-mobile', isMobileViewport());
}

export function initPwa() {
    if (typeof window !== 'undefined' && window.mutqinMinimalPublicPage) {
        unregisterServiceWorkers().catch(() => {});
        return;
    }

    syncDisplayModeClass();

    if (shouldRegisterServiceWorker()) {
        registerServiceWorker();
    } else {
        unregisterServiceWorkers().catch(() => {});
    }

    // Listen for Chromium install immediately — do not wait for window.load
    // (deferred bundles can miss that event).
    setupInstallPrompt();

    setupIosInstallGuide();
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', setupIosInstallGuide, { once: true });
    }

    // Vue mounts #app after async i18n; re-apply visibility once that finishes.
    window.addEventListener('mutqin:i18n-ready', () => {
        queueMicrotask(() => setupIosInstallGuide());
        window.setTimeout(setupIosInstallGuide, 0);
    });

    const media = window.matchMedia(MOBILE_MQ);
    const onViewportChange = () => {
        syncDisplayModeClass();
        if (shouldRegisterServiceWorker()) {
            registerServiceWorker();
        } else {
            unregisterServiceWorkers().catch(() => {});
            if (!isAppleMacDesktop()) {
                document.getElementById('mutqin-pwa-install')?.remove();
            }
        }

        if (shouldShowIosInstallGuide()) {
            setupIosInstallGuide();
        } else {
            hideIosInstallGuide();
        }
    };

    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onViewportChange);
    } else if (typeof media.addListener === 'function') {
        media.addListener(onViewportChange);
    }

    // Standalone can change if the user installs mid-session (rare) — re-check on focus.
    window.addEventListener('pageshow', () => {
        syncDisplayModeClass();
        if (isStandaloneDisplay()) {
            document.getElementById('mutqin-pwa-install')?.remove();
            hideIosInstallGuide();
            return;
        }
        setupIosInstallGuide();
    });
}
