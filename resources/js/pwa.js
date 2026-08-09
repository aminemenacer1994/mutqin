/**
 * Mobile-only PWA bootstrap.
 * Desktop / tablet viewports (≥768px) skip registration and clear any prior SW.
 *
 * Chromium phones: native beforeinstallprompt banner.
 * Login + register: iPhone Home Screen install guide (Safari has no install prompt API).
 * Android keeps the native banner path and does not see the iPhone instructions.
 *
 * Auth pages live inside Vue's `#app` mount. Listeners must use event delegation
 * because Vue re-renders the login/register DOM after async i18n bootstrap.
 */

const MOBILE_MQ = '(max-width: 767.98px)';
const INSTALL_DISMISS_KEY = 'mutqin.pwa.install.dismissed';
const IOS_INSTALL_DISMISS_KEY = 'mutqin.pwa.ios-install.dismissed';

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
    const ua = window.navigator.userAgent || '';
    if (/iPhone|iPod|iPad/i.test(ua)) return true;
    // iPadOS 13+ may report as Macintosh with touch.
    return window.navigator.platform === 'MacIntel' && (window.navigator.maxTouchPoints || 0) > 1;
}

function isAndroidDevice() {
    return /Android/i.test(window.navigator.userAgent || '');
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
        })
        .catch((error) => {
            console.warn('Failed to register service worker:', error);
        });
}

function shouldShowInstallBanner() {
    if (!isMobileViewport() || isStandaloneDisplay()) return false;
    // iOS never fires beforeinstallprompt; keep Chromium path untouched otherwise.
    if (isIosDevice()) return false;
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
    banner.setAttribute('aria-label', 'Install Mutqin');
    banner.innerHTML = `
        <div class="mutqin-pwa-install__copy">
            <strong>Install Mutqin</strong>
            <span>Add to your home screen for a faster, app-like experience.</span>
        </div>
        <div class="mutqin-pwa-install__actions">
            <button type="button" class="mutqin-pwa-install__btn mutqin-pwa-install__btn--primary" data-pwa-install>Install</button>
            <button type="button" class="mutqin-pwa-install__btn mutqin-pwa-install__btn--ghost" data-pwa-dismiss aria-label="Dismiss">Not now</button>
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

    // Android uses the native beforeinstallprompt banner — don't show iPhone steps.
    if (isAndroidDevice()) return false;

    // iPhone/iPad: primary audience.
    // Desktop (Mac/Windows): also show on auth so the iPhone guide is reachable while testing
    // and for users installing Mutqin on their phone from these pages.
    return true;
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
    ensureIosModalOnBody();
    revealIosInstallTrigger();
}

function syncDisplayModeClass() {
    document.documentElement.classList.toggle('mutqin-pwa-standalone', isStandaloneDisplay());
    document.documentElement.classList.toggle('mutqin-pwa-mobile', isMobileViewport());
}

export function initPwa() {
    syncDisplayModeClass();

    // Always clear stale Mutqin caches on boot so local UI updates are not stuck.
    unregisterServiceWorkers().catch(() => {});

    // Listen for Chromium install immediately — do not wait for window.load
    // (deferred bundles can miss that event).
    setupInstallPrompt();

    if (isMobileViewport()) {
        registerServiceWorker();
    } else {
        unregisterServiceWorkers().catch(() => {});
    }

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
        if (isMobileViewport()) {
            registerServiceWorker();
        } else {
            unregisterServiceWorkers().catch(() => {});
            document.getElementById('mutqin-pwa-install')?.remove();
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
