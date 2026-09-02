require('./bootstrap.js');

import { createApp, defineAsyncComponent } from 'vue';
import NetworkStatusBanner from './components/NetworkStatusBanner.vue';
import './styles/info-pages.css';
import './styles/about-page.css';
import './styles/pricing-page.css';
import { setupI18n, setLocale } from './i18n';
import { i18nMixin } from './mixins/i18nMixin';
import { initPwa } from './pwa';
import { clearSharedMutqinBrowserResidue } from './utils/mutqinStorageKeys';
import { isBrowserOffline } from './utils/networkStatus';
import { installErrorTracking, reportError } from './scripts/observability/errorTracking';
import enLocale from './locales/en.json';

function resolveEn(key) {
    return key.split('.').reduce((node, part) => (node && node[part] !== undefined ? node[part] : undefined), enLocale) ?? key;
}

function bindLogoutStorageCleanup() {
    if (typeof document === 'undefined') return;
    const clearResidue = () => {
        try {
            clearSharedMutqinBrowserResidue();
        } catch (_) { /* ignore */ }
    };
    document.addEventListener('submit', (event) => {
        const form = event.target;
        if (!(form instanceof HTMLFormElement)) return;
        const action = String(form.getAttribute('action') || '');
        if (!action.includes('/logout')) return;
        clearResidue();
    }, true);
}

bindLogoutStorageCleanup();
if (typeof window !== 'undefined') {
    window.mutqinClearSharedBrowserResidue = clearSharedMutqinBrowserResidue;
}

// Watch/dev Mix emits stable chunk names (memorisation.js). Patch webpack's
// chunk URL helper so the browser cannot keep a stale mushaf paint forever.
(function patchMemorisationChunkBust() {
    try {
        if (typeof __webpack_require__ === 'undefined' || typeof __webpack_require__.u !== 'function') return;
        const bust = (typeof document !== 'undefined' && (
            document.documentElement?.dataset?.mutqinAssetBuild
            || document.querySelector('meta[name="mutqin-asset-build"]')?.content
        )) || 'v165';
        const original = __webpack_require__.u.bind(__webpack_require__);
        __webpack_require__.u = (chunkId) => {
            const url = String(original(chunkId) || '');
            if (!/memorisation/i.test(url)) return url;
            const sep = url.includes('?') ? '&' : '?';
            return `${url}${sep}id=${encodeURIComponent(bust)}`;
        };
    } catch (_) { /* best-effort */ }
})();

const Homepage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "homepage" */ './views/Homepage.vue')
);
const About = defineAsyncComponent(() =>
  import(/* webpackChunkName: "about" */ './views/About.vue')
);
const AboutUsPage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "about-us" */ './views/AboutUs.vue')
);
const PricingPage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "pricing" */ './views/PricingPage.vue')
);
const OurMissionPage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "our-mission" */ './views/OurMission.vue')
);
const DonationPage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "donation" */ './views/DonationPage.vue')
);
const WaitingListPage = defineAsyncComponent(() =>
  import(/* webpackChunkName: "waiting-list" */ './views/WaitingList.vue')
);

const UserDashboard = defineAsyncComponent(() =>
  import(/* webpackChunkName: "dashboard" */ './views/Dashboard.vue')
);

const AdminDashboard = defineAsyncComponent(() =>
  import(/* webpackChunkName: "admin-dashboard" */ './views/AdminDashboard.vue')
);

// The memorisation workspace is by far the heaviest component. It is only used
// on the memorisation page, so load it as a separate async chunk to keep the
// main bundle (and every other page) lean.
const MemorisationBootFallback = {
    computed: {
        loadingTitle() {
            return this.t('memorisation.a11y.workspaceLoading');
        },
        loadingDesc() {
            return this.t('memorisation.a11y.workspacePreparing');
        },
    },
    template: `
        <div class="memorisation-boot-fallback" role="status" aria-live="polite">
            <div class="memorisation-boot-card">
                <div class="memorisation-boot-card__icon" aria-hidden="true">
                    <i class="bi bi-hourglass-split"></i>
                </div>
                <div class="memorisation-boot-card__copy">
                    <strong>{{ loadingTitle }}</strong>
                    <p>{{ loadingDesc }}</p>
                </div>
            </div>
        </div>
    `,
};

const MemorisationLoadError = {
    props: { error: { type: Object, default: null } },
    data() {
        return {
            offline: isBrowserOffline(),
            onlineHandler: null,
        };
    },
    computed: {
        title() {
            return this.offline
                ? this.t('common.status.offlineTitle')
                : this.t('common.status.errorTitle');
        },
        description() {
            return this.offline
                ? this.t('common.status.offlineDesc')
                : this.t('common.status.errorDesc');
        },
        retryLabel() {
            return this.t('common.status.retry');
        },
        returnHomeLabel() {
            return this.t('common.status.returnHome');
        },
    },
    mounted() {
        this.onlineHandler = () => {
            const wasOffline = this.offline;
            this.offline = isBrowserOffline();
            if (wasOffline && !this.offline) this.reload();
        };
        window.addEventListener('online', this.onlineHandler);
        window.addEventListener('offline', this.onlineHandler);
    },
    beforeUnmount() {
        if (this.onlineHandler) {
            window.removeEventListener('online', this.onlineHandler);
            window.removeEventListener('offline', this.onlineHandler);
        }
    },
    template: `
        <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
            <div class="memorisation-boot-card">
                <div class="memorisation-boot-card__icon" aria-hidden="true">
                    <i class="bi" :class="offline ? 'bi-wifi-off' : 'bi-exclamation-triangle'"></i>
                </div>
                <div class="memorisation-boot-card__copy">
                    <strong>{{ title }}</strong>
                    <p>{{ description }}</p>
                </div>
                <div class="memorisation-boot-actions">
                    <button type="button" class="memorisation-boot-btn memorisation-boot-btn--primary" @click="reload">{{ retryLabel }}</button>
                    <a class="memorisation-boot-btn memorisation-boot-btn--secondary" href="/">{{ returnHomeLabel }}</a>
                </div>
            </div>
        </div>
    `,
    methods: {
        reload() {
            window.location.reload();
        },
    },
};

/**
 * Mix watch rewrites public/js/memorisation.js while the browser may still be
 * requesting it — that surfaces as ChunkLoadError. Retry a few times before failing.
 * Chunk name is stable (see webpack.mix.cjs); cache busting comes from mix.version()
 * on app.js, which embeds the chunk mapping.
 */
function loadMemorisationChunk(attempt = 0) {
    return import(/* webpackChunkName: "memorisation" */ './views/Memorisation.vue').then((mod) => {
        if (typeof window !== 'undefined') {
            window.__MUTQIN_PRACTICE_COACH__ = 'v24';
            window.__MUTQIN_AI_RECITE_UI__ = 'v75';
            document.documentElement.dataset.practiceCoach = 'v2';
            document.documentElement.dataset.aiReciteUi = 'v75';
            document.documentElement.dataset.stackedAyahEnd = 'v8-removed';
            document.documentElement.dataset.mutqinUi = 'v124';
            document.documentElement.dataset.sessionOnlyMushaf = 'v4';
            document.documentElement.dataset.amdTestGate = 'test-with-ai-only';
            document.documentElement.dataset.postSessionChoice = 'v15';
        }
        return mod;
    }).catch((error) => {
        console.error('Memorisation chunk failed to load', error);
        const name = String(error?.name || '');
        const message = String(error?.message || '');
        const isChunkError = name === 'ChunkLoadError'
            || /Loading chunk \d+ failed/i.test(message)
            || /memorisation/i.test(message);
        if (isChunkError && attempt < 3) {
            const delayMs = 400 * (attempt + 1);
            return new Promise((resolve, reject) => {
                window.setTimeout(() => {
                    loadMemorisationChunk(attempt + 1).then(resolve, reject);
                }, delayMs);
            });
        }
        if (isChunkError && typeof window !== 'undefined') {
            const url = new URL(window.location.href);
            if (!url.searchParams.has('mutqin_force')) {
                try {
                    const notice = document.createElement('div')
                    notice.setAttribute('role', 'status')
                    notice.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(0,0,0,.45);color:#fff;font:500 1rem/1.4 system-ui,sans-serif;text-align:center'
                    notice.textContent = resolveEn('common.status.chunkUpdating')
                    document.body?.appendChild(notice)
                } catch (_) { /* best-effort */ }
                url.searchParams.set('mutqin_force', String(Date.now()));
                window.location.replace(url.toString());
                return new Promise(() => {});
            }
        }
        reportError(error, { kind: 'chunk_load', feature: 'memorisation' });
        throw error;
    });
}

const Memorisation = defineAsyncComponent({
    loader: () => loadMemorisationChunk(),
    loadingComponent: MemorisationBootFallback,
    errorComponent: MemorisationLoadError,
    delay: 0,
    timeout: 120000,
});

async function bootstrapApp() {
    const app = createApp({});

    const i18n = await setupI18n();

    app.use(i18n);
    app.mixin(i18nMixin);
    app.config.globalProperties.$setLocale = (locale) => setLocale(i18n, locale);
    installErrorTracking(app);
    window.mutqinSetLocale = (locale) => setLocale(i18n, locale);
    window.mutqinGetLocale = () => i18n.global.locale.value;
    window.dispatchEvent(new CustomEvent('mutqin:i18n-ready', { detail: { locale: i18n.global.locale.value } }));

    app.component('network-status-banner', NetworkStatusBanner);
    app.component('homepage', Homepage);
    app.component('memorisation', Memorisation);
    app.component('user-dashboard', UserDashboard);
    app.component('admin-dashboard', AdminDashboard);
    app.component('about', About);
    app.component('about-us-page', AboutUsPage);
    app.component('pricing-page', PricingPage);
    app.component('our-mission-page', OurMissionPage);
    app.component('donation-page', DonationPage);
    app.component('waiting-list-page', WaitingListPage);
    app.component('privacy-policy-page', defineAsyncComponent(() =>
        import(/* webpackChunkName: "privacy" */ './views/PrivacyPolicy.vue')
    ));
    app.mount('#app');
}

function showBootstrapFailure(error) {
    reportError(error, { kind: 'bootstrap', feature: 'shell' });
    const mountTarget = document.getElementById('app');
    if (!mountTarget) return;
    const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
    const title = offline ? resolveEn('common.status.offlineTitle') : resolveEn('common.status.bootErrorTitle');
    const description = offline
        ? resolveEn('common.status.offlineDesc')
        : resolveEn('common.status.bootErrorDesc');
    const retryLabel = resolveEn('common.status.retry');
    const returnHomeLabel = resolveEn('common.status.returnHome');
    mountTarget.innerHTML = `
        <main id="mainContent" tabindex="-1">
            <div class="memorisation-boot-fallback memorisation-boot-fallback-error" role="alert">
                <div class="memorisation-boot-card">
                    <div class="memorisation-boot-card__icon" aria-hidden="true">
                        <i class="bi ${offline ? 'bi-wifi-off' : 'bi-exclamation-triangle'}"></i>
                    </div>
                    <div class="memorisation-boot-card__copy">
                        <strong>${title}</strong>
                        <p>${description}</p>
                    </div>
                    <div class="memorisation-boot-actions">
                        <button type="button" class="memorisation-boot-btn memorisation-boot-btn--primary" onclick="window.location.reload()">${retryLabel}</button>
                        <a class="memorisation-boot-btn memorisation-boot-btn--secondary" href="/">${returnHomeLabel}</a>
                    </div>
                </div>
            </div>
        </main>
    `;
    if (offline) {
        window.addEventListener('online', () => window.location.reload(), { once: true });
    }
}

bootstrapApp().catch(showBootstrapFailure);

initPwa();
