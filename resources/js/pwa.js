/**
 * Mobile-only PWA bootstrap.
 * Desktop / tablet viewports (≥768px) skip registration and clear any prior SW.
 */

const MOBILE_MQ = '(max-width: 767.98px)';
const INSTALL_DISMISS_KEY = 'mutqin.pwa.install.dismissed';

function isMobileViewport() {
    return window.matchMedia(MOBILE_MQ).matches;
}

function isStandaloneDisplay() {
    return (
        window.matchMedia('(display-mode: standalone)').matches
        || window.navigator.standalone === true
    );
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
    });
}

function syncDisplayModeClass() {
    document.documentElement.classList.toggle('mutqin-pwa-standalone', isStandaloneDisplay());
    document.documentElement.classList.toggle('mutqin-pwa-mobile', isMobileViewport());
}

export function initPwa() {
    syncDisplayModeClass();

    const media = window.matchMedia(MOBILE_MQ);
    const onViewportChange = () => {
        syncDisplayModeClass();
        if (isMobileViewport()) {
            registerServiceWorker();
        } else {
            unregisterServiceWorkers().catch(() => {});
            document.getElementById('mutqin-pwa-install')?.remove();
        }
    };

    if (typeof media.addEventListener === 'function') {
        media.addEventListener('change', onViewportChange);
    } else if (typeof media.addListener === 'function') {
        media.addListener(onViewportChange);
    }

    window.addEventListener('load', () => {
        if (isMobileViewport()) {
            registerServiceWorker();
            setupInstallPrompt();
        } else {
            unregisterServiceWorkers().catch(() => {});
        }
    });
}
